import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { useDatabase } from '../hooks/useDatabase';
import type { GroupedTask, NoteData } from '../hooks/useGroupedTasks';

interface NoteFormScreenProps {
  navigation: any;
  route: {
    params?: {
      editNote?: NoteData | null;
      defaultGroupId?: string | null;
    };
  };
}

export default function NoteFormScreen({ navigation, route }: NoteFormScreenProps) {
  const editNote = route.params?.editNote ?? null;
  const defaultGroupId = route.params?.defaultGroupId ?? null;
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const { db } = useDatabase();
  const [content, setContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(defaultGroupId);
  const [groups, setGroups] = useState<GroupedTask[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const contentRef = useRef<TextInput>(null);
  const isEditing = !!editNote;

  useEffect(() => {
    if (editNote) {
      setContent(editNote.content);
      setSelectedGroupId(editNote.grouped_task_id ?? defaultGroupId ?? null);
    } else {
      setTimeout(() => contentRef.current?.focus(), 300);
    }
  }, [editNote, defaultGroupId]);

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
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TextInput
          ref={contentRef}
          style={[s.input, s.textArea]}
          placeholder="Type your note here..."
          value={content}
          onChangeText={setContent}
          multiline
        />

        <TouchableOpacity style={s.pickerButton} onPress={() => setShowGroupPicker(!showGroupPicker)}>
          <Text style={[s.pickerButtonText, !selectedGroupId && s.placeholderText]}>
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

        <TouchableOpacity style={s.saveButton} onPress={handleSave}>
          <Text style={s.saveButtonText}>{isEditing ? 'Update Note' : 'Save Note'}</Text>
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
  textArea: { minHeight: 250, maxHeight: 500, textAlignVertical: 'top' },
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
  saveButton: { backgroundColor: c.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: c.textOnColor, fontSize: 17, fontWeight: '600' },
});
