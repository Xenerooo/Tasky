import React, { useEffect, useState, useMemo } from 'react';
import { ThemedText } from '../components/ThemedText';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import type { InboxTask } from '../hooks/useGroupedTasks';

interface TaskDetailScreenProps {
  route: { params: { taskId: string } };
}

export default function TaskDetailScreen({ route }: TaskDetailScreenProps) {
  const { taskId } = route.params;
  const { db } = useDatabase();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
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
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={s.container}>
        <ThemedText style={s.errorText}>Task not found</ThemedText>
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
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statusBar}>
          <View style={[s.statusBadge, isDone ? s.statusDone : s.statusOngoing]}>
            <Ionicons name={isDone ? 'checkmark-circle' : 'time-outline'} size={16} color={colors.textOnColor} />
            <ThemedText style={s.statusText}>{isDone ? 'Done' : 'Ongoing'}</ThemedText>
          </View>
        </View>

        <ThemedText style={s.title}>{task.title}</ThemedText>

        {task.description ? (
          <View style={s.section}>
            <ThemedText style={s.sectionLabel}>Description</ThemedText>
            <ThemedText style={s.description}>{task.description}</ThemedText>
          </View>
        ) : null}

        <View style={s.metaGrid}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <View style={s.metaText}>
              <ThemedText style={s.metaLabel}>Due Date</ThemedText>
              <ThemedText style={s.metaValue}>{dueDateStr || 'None'}</ThemedText>
            </View>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="folder-outline" size={18} color={colors.textTertiary} />
            <View style={s.metaText}>
              <ThemedText style={s.metaLabel}>Group</ThemedText>
              <ThemedText style={s.metaValue}>{groupTitle || 'Inbox'}</ThemedText>
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
  statusBar: { flexDirection: 'row', marginBottom: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusDone: { backgroundColor: c.success },
  statusOngoing: { backgroundColor: c.warning },
  statusText: { color: c.textOnColor, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, marginBottom: 20, lineHeight: 30 },
  section: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, color: c.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  description: { fontSize: 16, color: c.textPrimary, lineHeight: 22 },
  metaGrid: { gap: 1, borderRadius: 14, overflow: 'hidden' },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, padding: 16,
  },
  metaText: { flex: 1 },
  metaLabel: { fontSize: 11, color: c.textTertiary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 15, color: c.textPrimary },
});
