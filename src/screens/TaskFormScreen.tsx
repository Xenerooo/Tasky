import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import DatePickerModal from '../components/DatePickerModal';
import type { GroupedTask, InboxTask } from '../hooks/useGroupedTasks';
import { scheduleForTask, cancelForTask } from '../services/notifications';

interface TaskFormScreenProps {
  navigation: any;
  route: {
    params?: {
      editTask?: InboxTask | null;
      defaultGroupId?: string | null;
      onGoBack?: () => void;
    };
  };
}

export default function TaskFormScreen({ navigation, route }: TaskFormScreenProps) {
  const editTask = route.params?.editTask ?? null;
  const defaultGroupId = route.params?.defaultGroupId ?? null;
  const { db } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(defaultGroupId);
  const [status, setStatus] = useState('ongoing');
  const [groups, setGroups] = useState<GroupedTask[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const titleRef = useRef<TextInput>(null);
  const isEditing = !!editTask;

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setDueDate(editTask.due_date ? editTask.due_date.split('T')[0] : '');
      setStatus(editTask.status);
    } else {
      setTimeout(() => titleRef.current?.focus(), 300);
    }
  }, [editTask]);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const result = await db.getAllAsync<GroupedTask>(
        "SELECT id, title FROM grouped_tasks WHERE is_deleted = 0 ORDER BY title ASC"
      );
      setGroups(result);
    })();
  }, [db]);

  const handleSave = async () => {
    if (!db || !title.trim()) return;
    const now = new Date().toISOString();
    const due = dueDate.trim() ? new Date(dueDate.trim()).toISOString() : null;
    if (editTask) {
      const existing = await db.getFirstAsync<{ notification_ids: string | null }>(
        'SELECT notification_ids FROM tasks WHERE id = ?', editTask.id
      );
      if (existing?.notification_ids) {
        await cancelForTask(JSON.parse(existing.notification_ids));
      }
      await db.runAsync(
        'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ?, updated_at = ?, notification_ids = ? WHERE id = ?',
        title.trim(), description.trim() || null, due, status, now, null, editTask.id
      );
      if (due && status === 'ongoing' && settings.notificationsEnabled) {
        const ids = await scheduleForTask(editTask.id, title.trim(), dueDate.trim(), settings.reminderDays, settings.highPriority);
        await db.runAsync('UPDATE tasks SET notification_ids = ? WHERE id = ?', JSON.stringify(ids), editTask.id);
      }
    } else {
      const { randomUUID } = await import('expo-crypto');
      const id = randomUUID();
      await db.runAsync(
        'INSERT INTO tasks (id, grouped_task_id, title, description, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        id, selectedGroupId, title.trim(), description.trim() || null, due, status, now, now
      );
      if (due && settings.notificationsEnabled) {
        const ids = await scheduleForTask(id, title.trim(), dueDate.trim(), settings.reminderDays, settings.highPriority);
        await db.runAsync('UPDATE tasks SET notification_ids = ? WHERE id = ?', JSON.stringify(ids), id);
      }
    }
    navigation.goBack();
  };

  const handleDateConfirm = (dateStr: string) => {
    setDueDate(dateStr);
    setShowDateModal(false);
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TextInput
          ref={titleRef}
          style={s.input}
          placeholder="Task title (required)"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={s.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
          <Text style={[s.pickerButtonText, !selectedGroupId && s.placeholderText]}>
            {selectedGroupId
              ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
              : 'None (Inbox)'}
          </Text>
          <Text style={s.pickerArrow}>{showGroupPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showGroupPicker && (
          <View style={s.pickerDropdown}>
            <TouchableOpacity
              style={s.pickerOption}
              onPress={() => { setSelectedGroupId(null); setShowGroupPicker(false); }}
            >
              <Text style={selectedGroupId === null ? s.pickerOptionActive : s.pickerOptionText}>
                None (Inbox)
              </Text>
            </TouchableOpacity>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={s.pickerOption}
                onPress={() => { setSelectedGroupId(g.id); setShowGroupPicker(false); }}
              >
                <Text style={selectedGroupId === g.id ? s.pickerOptionActive : s.pickerOptionText}>
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.pickerButton} onPress={() => setShowDateModal(true)}>
          <Text style={[s.pickerButtonText, !dueDate && s.placeholderText]}>
            {dueDate || 'Set due date (optional)'}
          </Text>
          <View style={s.dateBtnRow}>
            {dueDate ? (
              <TouchableOpacity onPress={() => setDueDate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearDateText}>✕</Text>
              </TouchableOpacity>
            ) : null}
            <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} style={{ marginLeft: dueDate ? 8 : 0 }} />
          </View>
        </TouchableOpacity>
        <DatePickerModal
          visible={showDateModal}
          value={dueDate}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDateModal(false)}
        />

        <View style={s.statusRow}>
          <Text style={s.statusLabel}>Status</Text>
          <TouchableOpacity
            style={[s.statusBadge, status === 'done' ? s.statusDone : s.statusOngoing]}
            onPress={() => setStatus(prev => (prev === 'ongoing' ? 'done' : 'ongoing'))}
          >
            <Text style={s.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.saveButton} onPress={handleSave}>
          <Text style={s.saveButtonText}>{isEditing ? 'Update Task' : 'Save Task'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.screenBackground },
  content: { padding: 20, paddingBottom: 40 },
  input: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, fontSize: 16,
    backgroundColor: c.surface, marginBottom: 12,
  },
  textArea: { minHeight: 150, maxHeight: 300, textAlignVertical: 'top' },
  pickerButton: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, marginBottom: 12,
    backgroundColor: c.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerButtonText: { fontSize: 16, color: c.textSecondary, flex: 1 },
  placeholderText: { color: c.textPlaceholder },
  pickerArrow: { fontSize: 12, color: c.textHint },
  pickerDropdown: { borderWidth: 1, borderColor: c.border, borderRadius: 10, marginBottom: 12, overflow: 'hidden', backgroundColor: c.surface },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: c.borderDivider },
  pickerOptionText: { fontSize: 16, color: c.textSecondary },
  pickerOptionActive: { fontSize: 16, color: c.primary, fontWeight: '600' },
  dateBtnRow: { flexDirection: 'row', alignItems: 'center' },
  clearDateText: { color: c.danger, fontSize: 16, fontWeight: '700' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingVertical: 4,
  },
  statusLabel: { fontSize: 16, color: c.textSecondary, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusDone: { backgroundColor: c.success },
  statusOngoing: { backgroundColor: c.warning },
  statusBadgeText: { color: c.textOnColor, fontSize: 14, fontWeight: '600' },
  saveButton: { backgroundColor: c.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: c.textOnColor, fontSize: 17, fontWeight: '600' },
});
