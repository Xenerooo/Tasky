import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ThemedText } from '../components/ThemedText';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import DatePickerModal from './DatePickerModal';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import type { GroupedTask, InboxTask } from '../hooks/useGroupedTasks';
import { scheduleForTask, cancelForTask } from '../services/notifications';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultGroupId?: string | null;
  editTask?: InboxTask | null;
  viewOnly?: boolean;
}

export default function TaskModal({ visible, onClose, onSaved, defaultGroupId, editTask, viewOnly }: TaskModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const { db } = useDatabase();
  const { settings } = useSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(defaultGroupId ?? null);
  const [status, setStatus] = useState('ongoing');
  const [groups, setGroups] = useState<GroupedTask[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setShowDateModal(false);
      setShowGroupPicker(false);
      if (editTask) {
        setTitle(editTask.title);
        setDescription(editTask.description || '');
        setDueDate(editTask.due_date ? editTask.due_date.split('T')[0] : '');
        setSelectedGroupId(defaultGroupId ?? null);
        setStatus(editTask.status);
      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
        setSelectedGroupId(defaultGroupId ?? null);
        setStatus('ongoing');
        setTimeout(() => titleRef.current?.focus(), 300);
      }
    }
  }, [visible, defaultGroupId, editTask]);

  useEffect(() => {
    if (!db || !visible) return;
    (async () => {
      const result = await db.getAllAsync<GroupedTask>(
        "SELECT id, title FROM grouped_tasks WHERE is_deleted = 0 ORDER BY title ASC"
      );
      setGroups(result);
    })();
  }, [db, visible]);

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
    onSaved();
    onClose();
  };

  const toggleStatus = () => {
    setStatus(prev => (prev === 'ongoing' ? 'done' : 'ongoing'));
  };

  const handleDateConfirm = (dateStr: string) => {
    setDueDate(dateStr);
    setShowDateModal(false);
  };

  const clearDueDate = () => setDueDate('');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <ThemedText style={s.heading}>{viewOnly ? 'Task Details' : editTask ? 'Edit Task' : 'New Task'}</ThemedText>

            <TextInput
              ref={titleRef}
              style={[s.input, viewOnly && s.inputReadOnly]}
              placeholder="Task title (required)"
              value={title}
              onChangeText={setTitle}
              editable={!viewOnly}
            />

            <TextInput
              style={[s.input, s.textArea, viewOnly && s.inputReadOnly]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!viewOnly}
            />

            {viewOnly ? (
              <View style={s.viewField}>
                <ThemedText style={s.viewLabel}>Group</ThemedText>
                <ThemedText style={s.viewValue}>
                  {selectedGroupId
                    ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                    : 'None (Inbox)'}
                </ThemedText>
              </View>
            ) : (
              <>
                <TouchableOpacity style={s.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
                  <ThemedText style={s.pickerButtonText}>
                    {selectedGroupId
                      ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                      : 'None (Inbox)'}
                  </ThemedText>
                  <ThemedText style={s.pickerArrow}>{showGroupPicker ? '▲' : '▼'}</ThemedText>
                </TouchableOpacity>
                {showGroupPicker && (
                  <View style={s.pickerDropdown}>
                    <TouchableOpacity
                      style={s.pickerOption}
                      onPress={() => { setSelectedGroupId(null); setShowGroupPicker(false); }}
                    >
                      <ThemedText style={selectedGroupId === null ? s.pickerOptionActive : s.pickerOptionText}>
                        None (Inbox)
                      </ThemedText>
                    </TouchableOpacity>
                    {groups.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={s.pickerOption}
                        onPress={() => { setSelectedGroupId(g.id); setShowGroupPicker(false); }}
                      >
                        <ThemedText style={selectedGroupId === g.id ? s.pickerOptionActive : s.pickerOptionText}>
                          {g.title}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {viewOnly ? (
              <View style={s.viewField}>
                <ThemedText style={s.viewLabel}>Due Date</ThemedText>
                <ThemedText style={s.viewValue}>{dueDate || 'None'}</ThemedText>
              </View>
            ) : (
              <View>
                <TouchableOpacity style={s.pickerButton} onPress={() => setShowDateModal(true)}>
                  <ThemedText style={[s.pickerButtonText, !dueDate && s.placeholderText]}>
                    {dueDate || 'Set due date (optional)'}
                  </ThemedText>
                  <View style={s.dateBtnRow}>
                    {dueDate ? (
                      <TouchableOpacity onPress={clearDueDate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <ThemedText style={s.clearDateText}>✕</ThemedText>
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
              </View>
            )}

            <View style={s.statusRow}>
              <ThemedText style={s.statusLabel}>Status</ThemedText>
              {viewOnly ? (
                <View style={[s.statusBadge, status === 'done' ? s.statusDone : s.statusOngoing]}>
                  <ThemedText style={s.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</ThemedText>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.statusBadge, status === 'done' ? s.statusDone : s.statusOngoing]}
                  onPress={toggleStatus}
                >
                  <ThemedText style={s.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {viewOnly ? (
              <TouchableOpacity style={s.saveButton} onPress={onClose}>
                <ThemedText style={s.saveButtonText}>Close</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={s.saveButton} onPress={handleSave}>
                  <ThemedText style={s.saveButtonText}>{editTask ? 'Update Task' : 'Save Task'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelButton} onPress={onClose}>
                  <ThemedText style={s.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.overlay,
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: c.handle,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: c.textSecondary,
    flex: 1,
  },
  placeholderText: {
    color: c.textPlaceholder,
  },
  dateBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearDateText: {
    color: c.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  pickerArrow: {
    fontSize: 12,
    color: c.textHint,
  },
  pickerDropdown: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.borderDivider,
  },
  pickerOptionText: {
    fontSize: 16,
    color: c.textSecondary,
  },
  pickerOptionActive: {
    fontSize: 16,
    color: c.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: c.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: c.textOnColor,
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    color: c.textHint,
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDone: {
    backgroundColor: c.success,
  },
  statusOngoing: {
    backgroundColor: c.warning,
  },
  statusBadgeText: {
    color: c.textOnColor,
    fontSize: 14,
    fontWeight: '600',
  },
  inputReadOnly: {
    backgroundColor: c.surfaceSecondary,
    color: c.textDisabled,
  },
  viewField: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: c.surfaceSecondary,
  },
  viewLabel: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  viewValue: {
    fontSize: 16,
    color: c.textSecondary,
  },
});
