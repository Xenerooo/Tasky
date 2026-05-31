import React, { useEffect, useState, useMemo } from 'react';
import { ThemedText } from '../components/ThemedText';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useDatabase } from '../hooks/useDatabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import type { NoteData } from '../hooks/useGroupedTasks';

interface NoteDetailScreenProps {
  route: { params: { noteId: string } };
}

export default function NoteDetailScreen({ route }: NoteDetailScreenProps) {
  const { noteId } = route.params;
  const { db } = useDatabase();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupTitle, setGroupTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const result = await db.getFirstAsync<NoteData>(
        'SELECT id, content, grouped_task_id, created_at FROM notes WHERE id = ? AND is_deleted = 0',
        noteId
      );
      if (result) {
        setNote(result);
        if (result.grouped_task_id) {
          const g = await db.getFirstAsync<{ title: string }>(
            'SELECT title FROM grouped_tasks WHERE id = ?',
            result.grouped_task_id
          );
          setGroupTitle(g?.title ?? null);
        }
      }
      setLoading(false);
    })();
  }, [db, noteId]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={s.container}>
        <ThemedText style={s.errorText}>Note not found</ThemedText>
      </SafeAreaView>
    );
  }

  const createdDateStr = new Date(note.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.badgeRow}>
          <View style={s.badge}>
            <Ionicons name="document-text-outline" size={14} color={colors.success} />
            <ThemedText style={s.badgeText}>Note</ThemedText>
          </View>
        </View>

        <View style={s.contentCard}>
          <ThemedText style={s.contentText}>{note.content}</ThemedText>
        </View>

        <View style={s.metaGrid}>
          <View style={s.metaItem}>
            <Ionicons name="folder-outline" size={18} color={colors.textTertiary} />
            <View style={s.metaText}>
              <ThemedText style={s.metaLabel}>Group</ThemedText>
              <ThemedText style={s.metaValue}>{groupTitle || 'Unassigned'}</ThemedText>
            </View>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <View style={s.metaText}>
              <ThemedText style={s.metaLabel}>Created</ThemedText>
              <ThemedText style={s.metaValue}>{createdDateStr}</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.screenBackground },
  content: { padding: 20 },
  errorText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: c.textTertiary },
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: c.noteBadgeBg,
  },
  badgeText: { color: c.success, fontSize: 13, fontWeight: '600' },
  contentCard: {
    backgroundColor: c.surface, borderRadius: 14, padding: 20, marginBottom: 16,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  contentText: { fontSize: 16, color: c.textPrimary, lineHeight: 24 },
  metaGrid: { gap: 1, borderRadius: 14, overflow: 'hidden' },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, padding: 16,
  },
  metaText: { flex: 1 },
  metaLabel: { fontSize: 11, color: c.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 15, color: c.textPrimary },
});
