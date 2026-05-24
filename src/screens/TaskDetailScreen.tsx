import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import type { InboxTask } from '../hooks/useGroupedTasks';

interface TaskDetailScreenProps {
  route: { params: { taskId: string } };
}

export default function TaskDetailScreen({ route }: TaskDetailScreenProps) {
  const { taskId } = route.params;
  const { db } = useDatabase();
  const [task, setTask] = useState<InboxTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupTitle, setGroupTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const result = await db.getFirstAsync<InboxTask>(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE id = ? AND is_deleted = 0',
        taskId
      );
      if (result) {
        setTask(result);
        const g = await db.getFirstAsync<{ title: string }>(
          `SELECT gt.title FROM grouped_tasks gt JOIN tasks t ON t.grouped_task_id = gt.id WHERE t.id = ?`,
          taskId
        );
        setGroupTitle(g?.title ?? null);
      }
      setLoading(false);
    })();
  }, [db, taskId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
      </SafeAreaView>
    );
  }

  const isDone = task.status === 'done';
  const dueDateStr = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const createdDateStr = new Date(task.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, isDone ? styles.statusDone : styles.statusOngoing]}>
            <Ionicons name={isDone ? 'checkmark-circle' : 'time-outline'} size={16} color="#fff" />
            <Text style={styles.statusText}>{isDone ? 'Done' : 'Ongoing'}</Text>
          </View>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        {task.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        ) : null}

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={18} color="#8E8E93" />
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{dueDateStr || 'None'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={18} color="#8E8E93" />
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Group</Text>
              <Text style={styles.metaValue}>{groupTitle || 'Inbox'}</Text>
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
  statusBar: { flexDirection: 'row', marginBottom: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusDone: { backgroundColor: '#34C759' },
  statusOngoing: { backgroundColor: '#FF9500' },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#1c1c1e', marginBottom: 20, lineHeight: 30 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  description: { fontSize: 16, color: '#1c1c1e', lineHeight: 22 },
  metaGrid: { gap: 1, borderRadius: 14, overflow: 'hidden' },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 16,
  },
  metaText: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 15, color: '#1c1c1e' },
});
