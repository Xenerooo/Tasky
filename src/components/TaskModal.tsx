import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import DatePickerModal from './DatePickerModal';
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>{viewOnly ? 'Task Details' : editTask ? 'Edit Task' : 'New Task'}</Text>

            <TextInput
              ref={titleRef}
              style={[styles.input, viewOnly && styles.inputReadOnly]}
              placeholder="Task title (required)"
              value={title}
              onChangeText={setTitle}
              editable={!viewOnly}
            />

            <TextInput
              style={[styles.input, styles.textArea, viewOnly && styles.inputReadOnly]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!viewOnly}
            />

            {viewOnly ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Group</Text>
                <Text style={styles.viewValue}>
                  {selectedGroupId
                    ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                    : 'None (Inbox)'}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
                  <Text style={styles.pickerButtonText}>
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
              </>
            )}

            {viewOnly ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Due Date</Text>
                <Text style={styles.viewValue}>{dueDate || 'None'}</Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDateModal(true)}>
                  <Text style={[styles.pickerButtonText, !dueDate && styles.placeholderText]}>
                    {dueDate || 'Set due date (optional)'}
                  </Text>
                  <View style={styles.dateBtnRow}>
                    {dueDate ? (
                      <TouchableOpacity onPress={clearDueDate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
              </View>
            )}

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              {viewOnly ? (
                <View style={[styles.statusBadge, status === 'done' ? styles.statusDone : styles.statusOngoing]}>
                  <Text style={styles.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.statusBadge, status === 'done' ? styles.statusDone : styles.statusOngoing]}
                  onPress={toggleStatus}
                >
                  <Text style={styles.statusBadgeText}>{status === 'done' ? '✓ Done' : '○ Ongoing'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {viewOnly ? (
              <TouchableOpacity style={styles.saveButton} onPress={onClose}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>{editTask ? 'Update Task' : 'Save Task'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
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
    borderColor: '#ddd',
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
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#aaa',
  },
  dateBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearDateText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#999',
  },
  pickerDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionActive: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#999',
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
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDone: {
    backgroundColor: '#34C759',
  },
  statusOngoing: {
    backgroundColor: '#FF9500',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputReadOnly: {
    backgroundColor: '#f8f8f8',
    color: '#555',
  },
  viewField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
  },
  viewLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  viewValue: {
    fontSize: 16,
    color: '#333',
  },
});
