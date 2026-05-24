import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';
import type { InboxTask, NoteData } from '../hooks/useGroupedTasks';

interface WorkspaceScreenProps {
  navigation: any;
  route: { params: { groupId: string; groupTitle: string } };
}

interface WorkspaceItem {
  id: string;
  type: 'task' | 'note' | 'group_created';
  display_text: string;
  event_date: string;
  group_id: string;
  status?: string;
  due_date?: string | null;
}

export default function WorkspaceScreen({ navigation, route }: WorkspaceScreenProps) {
  const { groupId, groupTitle } = route.params;
  const { db } = useDatabase();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [calculatedStatus, setCalculatedStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const handleView = (item: WorkspaceItem) => {
    if (item.type === 'task') {
      navigation.navigate('TaskDetail', { taskId: item.id });
    } else if (item.type === 'note') {
      navigation.navigate('NoteDetail', { noteId: item.id });
    }
  };

  const handleEdit = async (item: WorkspaceItem) => {
    if (!db) return;
    if (item.type === 'task') {
      const task = await db.getFirstAsync<InboxTask>(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE id = ? AND is_deleted = 0',
        item.id
      );
      if (task) {
        navigation.navigate('TaskForm', { editTask: task, defaultGroupId: groupId });
      }
    } else if (item.type === 'note') {
      const note = await db.getFirstAsync<NoteData>(
        'SELECT id, content, grouped_task_id, created_at FROM notes WHERE id = ? AND is_deleted = 0',
        item.id
      );
      if (note) { navigation.navigate('NoteForm', { editNote: note, defaultGroupId: groupId }); }
    }
  };

  const handleDeleteItem = async (item: WorkspaceItem) => {
    if (!db) return;
    Alert.alert('Delete', `Delete "${item.display_text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const now = new Date().toISOString();
          if (item.type === 'task') {
            await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?', now, item.id);
          } else if (item.type === 'note') {
            await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, item.id);
          }
          fetchWorkspace();
        },
      },
    ]);
  };

  const fetchWorkspace = useCallback(async () => {
    if (!db) return;
    const [statusResult, tasks, notes, groups] = await Promise.all([
      db.getFirstAsync<{ calculated_status: string; progress_percentage: number }>(
        `SELECT 
          CASE 
            WHEN COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) = 0 THEN 'No Deadlines Scheduled'
            WHEN COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) = 0 THEN 'Pending'
            WHEN COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) = COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) THEN 'Done'
            ELSE 'Ongoing'
          END AS calculated_status,
          CASE 
            WHEN COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) = 0 THEN 0
            ELSE (COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) * 100 / COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END))
          END AS progress_percentage
        FROM grouped_tasks gt
        LEFT JOIN tasks t ON gt.id = t.grouped_task_id AND t.is_deleted = 0
        WHERE gt.is_deleted = 0 AND gt.id = ?`,
        groupId
      ),
      db.getAllAsync<{ id: string; title: string; status: string; due_date: string | null; created_at: string }>(
        'SELECT id, title, status, due_date, created_at FROM tasks WHERE grouped_task_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
        groupId
      ),
      db.getAllAsync<{ id: string; content: string; created_at: string }>(
        'SELECT id, content, created_at FROM notes WHERE grouped_task_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
        groupId
      ),
      db.getAllAsync<{ id: string; title: string; created_at: string }>(
        "SELECT id, title, created_at FROM grouped_tasks WHERE id = ? AND is_deleted = 0",
        groupId
      ),
    ]);
    if (statusResult) {
      setCalculatedStatus(statusResult.calculated_status);
      setProgress(statusResult.progress_percentage);
    }
    const feed: WorkspaceItem[] = [];
    for (const t of tasks) {
      feed.push({ id: t.id, type: 'task', display_text: t.title, event_date: t.created_at, group_id: groupId, status: t.status, due_date: t.due_date });
    }
    for (const n of notes) {
      feed.push({ id: n.id, type: 'note', display_text: n.content, event_date: n.created_at, group_id: groupId });
    }
    for (const g of groups) {
      feed.push({ id: g.id, type: 'group_created', display_text: g.title, event_date: g.created_at, group_id: groupId });
    }
    feed.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    setItems(feed);
  }, [db, groupId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const progressDisplay = calculatedStatus === 'No Deadlines Scheduled'
    ? 'No Deadlines Scheduled'
    : `${calculatedStatus}${calculatedStatus === 'Ongoing' ? ` (${progress}%)` : ''}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{groupTitle}</Text>
        <Text style={styles.statusText}>{progressDisplay}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.id}-${item.type}-${index}`}
        renderItem={({ item }) => (
          <TimelineCard
            event={{
              item_id: item.id,
              group_id: item.group_id,
              display_text: item.display_text,
              event_type: item.type === 'task' ? 'task_created' : item.type === 'note' ? 'note_created' : 'group_created',
              event_date: item.event_date,
            }}
            status={item.status}
            dueDate={item.due_date}
            onView={() => handleView(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDeleteItem(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomDock}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('TaskForm', { defaultGroupId: groupId })}>
          <Text style={styles.actionButtonText}>+ Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.noteButton]} onPress={() => navigation.navigate('NoteForm', { defaultGroupId: groupId })}>
          <Text style={styles.actionButtonText}>+ Add Note</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e5ea',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 },
  statusText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  listContent: { paddingVertical: 12, paddingBottom: 100 },
  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5ea', gap: 12,
  },
  actionButton: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  noteButton: { backgroundColor: '#34C759' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
