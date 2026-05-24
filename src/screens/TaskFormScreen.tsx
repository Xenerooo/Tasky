import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          ref={titleRef}
          style={styles.input}
          placeholder="Task title (required)"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
          <Text style={[styles.pickerButtonText, !selectedGroupId && styles.placeholderText]}>
            {selectedGroupId
              ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
              : 'None (Inbox)'}
          </Text>
          <Text style={styles.pickerArrow}>{showGroupPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showGroupPicker && (
          <View style={styles.pickerDropdown}>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => { setSelectedGroupId(null); setShowGroupPicker(false); }}
            >
              <Text style={selectedGroupId === null ? styles.pickerOptionActive : styles.pickerOptionText}>
                None (Inbox)
              </Text>
            </TouchableOpacity>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={styles.pickerOption}
                onPress={() => { setSelectedGroupId(g.id); setShowGroupPicker(false); }}
              >
                <Text style={selectedGroupId === g.id ? styles.pickerOptionActive : styles.pickerOptionText}>
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDateModal(true)}>
          <Text style={[styles.pickerButtonText, !dueDate && styles.placeholderText]}>
            {dueDate || 'Set due date (optional)'}
          </Text>
          <View style={styles.dateBtnRow}>
            {dueDate ? (
              <TouchableOpacity onPress={() => setDueDate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearDateText}>✕</Text>
              </TouchableOpacity>
            ) : null}
            <Ionicons name="calendar-outline" size={20} color="#8E8E93" style={{ marginLeft: dueDate ? 8 : 0 }} />
          </View>
        </TouchableOpacity>
        <DatePickerModal
          visible={showDateModal}
          value={dueDate}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDateModal(false)}
        />

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <TouchableOpacity
            style={[styles.statusBadge, status === 'done' ? styles.statusDone : styles.statusOngoing]}
            onPress={() => setStatus(prev => (prev === 'ongoing' ? 'done' : 'ongoing'))}
          >
            <Text style={styles.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{isEditing ? 'Update Task' : 'Save Task'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, paddingBottom: 40 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16,
    backgroundColor: '#fff', marginBottom: 12,
  },
  textArea: { minHeight: 150, maxHeight: 300, textAlignVertical: 'top' },
  pickerButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12,
    backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerButtonText: { fontSize: 16, color: '#333', flex: 1 },
  placeholderText: { color: '#aaa' },
  pickerArrow: { fontSize: 12, color: '#999' },
  pickerDropdown: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 12, overflow: 'hidden', backgroundColor: '#fff' },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 16, color: '#333' },
  pickerOptionActive: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  dateBtnRow: { flexDirection: 'row', alignItems: 'center' },
  clearDateText: { color: '#FF3B30', fontSize: 16, fontWeight: '700' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingVertical: 4,
  },
  statusLabel: { fontSize: 16, color: '#333', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusDone: { backgroundColor: '#34C759' },
  statusOngoing: { backgroundColor: '#FF9500' },
  statusBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveButton: { backgroundColor: '#007AFF', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
