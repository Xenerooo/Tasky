import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';

interface InboxScreenProps {
  navigation: any;
}

interface InboxItem {
  id: string;
  type: 'task' | 'note';
  display_text: string;
  event_date: string;
  status?: string;
  due_date?: string | null;
}

export default function InboxScreen({ navigation }: InboxScreenProps) {
  const { db } = useDatabase();
  const [items, setItems] = useState<InboxItem[]>([]);

  const fetchInbox = useCallback(async () => {
    if (!db) return;
    const [tasks, notes] = await Promise.all([
      db.getAllAsync<{ id: string; title: string; status: string; due_date: string | null; created_at: string }>(
        "SELECT id, title, status, due_date, created_at FROM tasks WHERE grouped_task_id IS NULL AND is_deleted = 0 ORDER BY created_at DESC"
      ),
      db.getAllAsync<{ id: string; content: string; created_at: string }>(
        "SELECT id, content, created_at FROM notes WHERE grouped_task_id IS NULL AND is_deleted = 0 ORDER BY created_at DESC"
      ),
    ]);
    const feed: InboxItem[] = [];
    for (const t of tasks) {
      feed.push({ id: t.id, type: 'task', display_text: t.title, event_date: t.created_at, status: t.status, due_date: t.due_date });
    }
    for (const n of notes) {
      feed.push({ id: n.id, type: 'note', display_text: n.content, event_date: n.created_at });
    }
    feed.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    setItems(feed);
  }, [db]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchInbox);
    return unsub;
  }, [navigation, fetchInbox]);

  const handleView = (item: InboxItem) => {
    if (item.type === 'task') {
      navigation.navigate('TaskDetail', { taskId: item.id });
    } else if (item.type === 'note') {
      navigation.navigate('NoteDetail', { noteId: item.id });
    }
  };

  const handleEdit = async (item: InboxItem) => {
    if (!db) return;
    if (item.type === 'task') {
      const task = await db.getFirstAsync<any>(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE id = ? AND is_deleted = 0',
        item.id
      );
      if (task) navigation.navigate('TaskForm', { editTask: task });
    } else if (item.type === 'note') {
      const note = await db.getFirstAsync<any>(
        'SELECT id, content, grouped_task_id, created_at FROM notes WHERE id = ? AND is_deleted = 0',
        item.id
      );
      if (note) navigation.navigate('NoteForm', { editNote: note });
    }
  };

  const handleDelete = async (item: InboxItem) => {
    if (!db) return;
    Alert.alert('Delete', `Delete "${item.display_text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const now = new Date().toISOString();
          if (item.type === 'task') {
            await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?', now, item.id);
          } else {
            await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, item.id);
          }
          fetchInbox();
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.headerBar}>
      <Text style={styles.sectionTitle}>
        {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''}` : ''}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.id}-${item.type}-${index}`}
        renderItem={({ item }) => (
          <TimelineCard
            event={{
              item_id: item.id,
              group_id: null,
              display_text: item.display_text,
              event_type: item.type === 'task' ? 'task_created' : 'note_created',
              event_date: item.event_date,
            }}
            status={item.type === 'task' ? item.status : undefined}
            dueDate={item.type === 'task' ? item.due_date : undefined}
            onView={() => handleView(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No ungrouped items</Text>}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomDock}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TaskForm', {})}>
          <Text style={styles.actionBtnText}>+ Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.noteBtn]} onPress={() => navigation.navigate('NoteForm', {})}>
          <Text style={styles.actionBtnText}>+ Add Note</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  listContent: { paddingVertical: 12, paddingBottom: 100 },
  headerBar: { paddingHorizontal: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: '#8E8E93', fontStyle: 'italic' },
  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5ea', gap: 12,
  },
  actionBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  noteBtn: { backgroundColor: '#34C759' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
