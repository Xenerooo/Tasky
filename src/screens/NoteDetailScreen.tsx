import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import type { NoteData } from '../hooks/useGroupedTasks';

interface NoteDetailScreenProps {
  route: { params: { noteId: string } };
}

export default function NoteDetailScreen({ route }: NoteDetailScreenProps) {
  const { noteId } = route.params;
  const { db } = useDatabase();
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Note not found</Text>
      </SafeAreaView>
    );
  }

  const createdDateStr = new Date(note.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="document-text-outline" size={14} color="#34C759" />
            <Text style={styles.badgeText}>Note</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{note.content}</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={18} color="#8E8E93" />
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Group</Text>
              <Text style={styles.metaValue}>{groupTitle || 'Unassigned'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color="#8E8E93" />
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{createdDateStr}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20 },
  errorText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#8E8E93' },
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#34C75920',
  },
  badgeText: { color: '#34C759', fontSize: 13, fontWeight: '600' },
  contentCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  contentText: { fontSize: 16, color: '#1c1c1e', lineHeight: 24 },
  metaGrid: { gap: 1, borderRadius: 14, overflow: 'hidden' },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 16,
  },
  metaText: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 15, color: '#1c1c1e' },
});
