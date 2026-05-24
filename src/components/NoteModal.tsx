import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import type { GroupedTask, NoteData } from '../hooks/useGroupedTasks';

interface NoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultGroupId?: string | null;
  editNote?: NoteData | null;
  viewOnly?: boolean;
}

export default function NoteModal({ visible, onClose, onSaved, defaultGroupId, editNote, viewOnly }: NoteModalProps) {
  const { db } = useDatabase();
  const [content, setContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(defaultGroupId ?? null);
  const [groups, setGroups] = useState<GroupedTask[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const contentRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editNote) {
        setContent(editNote.content);
        setSelectedGroupId(editNote.grouped_task_id ?? defaultGroupId ?? null);
      } else {
        setContent('');
        setSelectedGroupId(defaultGroupId ?? null);
        setTimeout(() => contentRef.current?.focus(), 300);
      }
    }
  }, [visible, defaultGroupId, editNote]);

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
    if (!db || !content.trim()) return;
    const now = new Date().toISOString();
    if (editNote) {
      await db.runAsync(
        'UPDATE notes SET content = ?, grouped_task_id = ?, updated_at = ? WHERE id = ?',
        content.trim(), selectedGroupId, now, editNote.id
      );
    } else {
      const { randomUUID } = await import('expo-crypto');
      const id = randomUUID();
      await db.runAsync(
        'INSERT INTO notes (id, grouped_task_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        id, selectedGroupId, content.trim(), now, now
      );
    }
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>{viewOnly ? 'Note Details' : editNote ? 'Edit Note' : 'New Note'}</Text>

            <TextInput
              ref={contentRef}
              style={[styles.input, styles.textArea, viewOnly && styles.inputReadOnly]}
              placeholder="Type your note here..."
              value={content}
              onChangeText={setContent}
              multiline
              editable={!viewOnly}
            />

            {viewOnly ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Group</Text>
                <Text style={styles.viewValue}>
                  {selectedGroupId
                    ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                    : 'None (Unassigned)'}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
                  <Text style={styles.pickerButtonText}>
                    {selectedGroupId
                      ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                      : 'None (Unassigned)'}
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
                        None (Unassigned)
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
              <TouchableOpacity style={styles.saveButton} onPress={onClose}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Note</Text>
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
