import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';
import ConfirmModal from '../components/ConfirmModal';
import { cancelForTask } from '../services/notifications';

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

const ACTION_BUTTONS = [
  { key: 'task', icon: 'checkbox-outline' as const, label: 'Task', color: '#007AFF' },
  { key: 'note', icon: 'document-text-outline' as const, label: 'Note', color: '#34C759' },
];

export default function InboxScreen({ navigation }: InboxScreenProps) {
  const { db } = useDatabase();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<InboxItem | null>(null);
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
      case 'task': navigation.navigate('TaskForm', {}); break;
      case 'note': navigation.navigate('NoteForm', {}); break;
    }
  };

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

  const handleDelete = (item: InboxItem) => {
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
    } else {
      await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, confirmDeleteItem.id);
    }
    setConfirmDeleteItem(null);
    fetchInbox();
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
  listContent: { paddingVertical: 12, paddingBottom: 100 },
  headerBar: { paddingHorizontal: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: '#8E8E93', fontStyle: 'italic' },
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
