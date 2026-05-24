import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
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
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.heading}>{viewOnly ? 'Note Details' : editNote ? 'Edit Note' : 'New Note'}</Text>

            <TextInput
              ref={contentRef}
              style={[s.input, s.textArea, viewOnly && s.inputReadOnly]}
              placeholder="Type your note here..."
              value={content}
              onChangeText={setContent}
              multiline
              editable={!viewOnly}
            />

            {viewOnly ? (
              <View style={s.viewField}>
                <Text style={s.viewLabel}>Group</Text>
                <Text style={s.viewValue}>
                  {selectedGroupId
                    ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                    : 'None (Unassigned)'}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={s.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
                  <Text style={s.pickerButtonText}>
                    {selectedGroupId
                      ? groups.find(g => g.id === selectedGroupId)?.title || 'Selected Group'
                      : 'None (Unassigned)'}
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
                        None (Unassigned)
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
              </>
            )}

            {viewOnly ? (
              <TouchableOpacity style={s.saveButton} onPress={onClose}>
                <Text style={s.saveButtonText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={s.saveButton} onPress={handleSave}>
                  <Text style={s.saveButtonText}>Save Note</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelButton} onPress={onClose}>
                  <Text style={s.cancelButtonText}>Cancel</Text>
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
