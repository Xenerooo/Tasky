import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';
import ConfirmModal from '../components/ConfirmModal';
import type { InboxTask, NoteData } from '../hooks/useGroupedTasks';
import { cancelForTask } from '../services/notifications';

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

const ACTION_BUTTONS = [
  { key: 'task', icon: 'checkbox-outline' as const, label: 'Task', color: '#007AFF' },
  { key: 'note', icon: 'document-text-outline' as const, label: 'Note', color: '#34C759' },
];

export default function WorkspaceScreen({ navigation, route }: WorkspaceScreenProps) {
  const { groupId, groupTitle } = route.params;
  const { db } = useDatabase();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [calculatedStatus, setCalculatedStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<WorkspaceItem | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFabMenu = () => {
    const toValue = showFabMenu ? 0 : 1;
    if (!showFabMenu) setShowFabMenu(true);
    Animated.timing(fabAnim, {
      toValue,
      duration: 200,
      easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      useNativeDriver: true,
    }).start(() => {
      if (toValue === 0) setShowFabMenu(false);
    });
  };

  const handleFabAction = (key: string) => {
    setShowFabMenu(false);
    switch (key) {
      case 'task': navigation.navigate('TaskForm', { defaultGroupId: groupId }); break;
      case 'note': navigation.navigate('NoteForm', { defaultGroupId: groupId }); break;
    }
  };

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

  const handleDeleteItem = (item: WorkspaceItem) => {
    setConfirmDeleteItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!db || !confirmDeleteItem) return;
    const now = new Date().toISOString();
    if (confirmDeleteItem.type === 'task') {
      const task = await db.getFirstAsync<{ notification_ids: string | null }>(
        'SELECT notification_ids FROM tasks WHERE id = ?', confirmDeleteItem.id
      );
      if (task?.notification_ids) await cancelForTask(JSON.parse(task.notification_ids));
      await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ?, notification_ids = ? WHERE id = ?', now, null, confirmDeleteItem.id);
    } else if (confirmDeleteItem.type === 'note') {
      await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, confirmDeleteItem.id);
    }
    setConfirmDeleteItem(null);
    fetchWorkspace();
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

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchWorkspace);
    return unsub;
  }, [navigation, fetchWorkspace]);

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

      {showFabMenu && (
        <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={toggleFabMenu} />
      )}

      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        {showFabMenu && (
          <Animated.View style={[styles.fabMenu, { opacity: fabAnim, transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            {ACTION_BUTTONS.map((btn) => (
              <TouchableOpacity key={btn.key} style={[styles.fabMenuItem, { backgroundColor: btn.color }]} onPress={() => handleFabAction(btn.key)}>
                <Ionicons name={btn.icon} size={20} color="#fff" />
                <Text style={styles.fabMenuLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
        <TouchableOpacity style={styles.fab} onPress={toggleFabMenu}>
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={!!confirmDeleteItem}
        title="Delete"
        message={confirmDeleteItem ? `Delete "${confirmDeleteItem.display_text}"?` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />
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
  fabOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 8 },
  fabContainer: { position: 'absolute', right: 16, alignItems: 'flex-end', zIndex: 9 },
  fabMenu: { marginBottom: 12, gap: 10 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8 },
  fabMenuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
