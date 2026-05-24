import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Platform, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useGroupedTasks, type GroupedTask, type InboxTask } from '../hooks/useGroupedTasks';
import GroupCard from '../components/GroupCard';
import TaskModal from '../components/TaskModal';

interface DashboardScreenProps {
  navigation: any;
}

const ACTION_BUTTONS = [
  { key: 'task', icon: 'checkbox-outline' as const, label: 'Task', color: '#007AFF' },
  { key: 'note', icon: 'document-text-outline' as const, label: 'Note', color: '#34C759' },
  { key: 'group', icon: 'folder-outline' as const, label: 'Group', color: '#FF9500' },
];

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { groups, inboxItems, search, setSearch, reassignTaskToGroup, createGroup, deleteTask, deleteNote, renameGroup, deleteGroup, refresh } = useGroupedTasks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [editingGroup, setEditingGroup] = useState<GroupedTask | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<InboxTask | null>(null);
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

  const handleGroupPress = (group: GroupedTask) => {
    navigation.navigate('Workspace', { groupId: group.id, groupTitle: group.title });
  };

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) return;
    await createGroup(newGroupTitle.trim());
    setNewGroupTitle('');
    setShowCreateModal(false);
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editGroupTitle.trim()) return;
    await renameGroup(editingGroup.id, editGroupTitle.trim());
    setEditingGroup(null);
    setEditGroupTitle('');
  };

  const handleDeleteGroup = (group: GroupedTask) => {
    Alert.alert('Delete Group', `Delete "${group.title}" and all its tasks?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(group.id) },
    ]);
  };

  const handleReassign = async (taskId: string, groupId: string) => {
    await reassignTaskToGroup(taskId, groupId);
    setAssigningTaskId(null);
  };

  const handleFabAction = (key: string) => {
    setShowFabMenu(false);
    switch (key) {
      case 'task': navigation.navigate('TaskForm', {}); break;
      case 'note': navigation.navigate('NoteForm', {}); break;
      case 'group': setShowCreateModal(true); break;
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const renderHeader = () => (
    <View>
      <View style={styles.inboxSection}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => navigation.navigate('Inbox')}>
          <Text style={styles.sectionTitle}>Tasks/Notes</Text>
          <Text style={styles.seeAllText}>See all ›</Text>
        </TouchableOpacity>
        {inboxItems.length === 0 ? (
          <Text style={styles.emptyText}>No floating items</Text>
        ) : (
          inboxItems.map(item => (
            <TouchableOpacity
              key={`${item.id}-${item.type}`}
              style={styles.inboxCard}
              onPress={() => {
                if (item.type === 'task') {
                  navigation.navigate('TaskDetail', { taskId: item.id });
                } else {
                  navigation.navigate('NoteDetail', { noteId: item.id });
                }
              }}
            >
              <View style={styles.inboxLeft}>
                {item.type === 'task' ? (
                  <>
                    <View style={styles.inboxTitleRow}>
                      <View style={[styles.typeDot, { backgroundColor: '#007AFF' }]} />
                      <Text style={styles.inboxTitle} numberOfLines={1}>{item.display_text}</Text>
                    </View>
                    {item.due_date && (
                      <Text style={styles.inboxDue}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.inboxTitleRow}>
                      <View style={[styles.typeDot, { backgroundColor: '#34C759' }]} />
                      <Text style={styles.noteLabel}>Note</Text>
                    </View>
                    <Text style={styles.notePreview} numberOfLines={2}>{item.display_text}</Text>
                  </>
                )}
              </View>
              <Text style={styles.assignHint}>{item.type === 'task' ? 'Tap to assign' : 'Tap to view'}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.groupsSection}>
        <Text style={styles.sectionTitle}>Groups</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search groups..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={handleGroupPress}
            onEdit={() => {
              setEditingGroup(item);
              setEditGroupTitle(item.title);
            }}
            onDelete={() => handleDeleteGroup(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={false}
      />

      {showFabMenu && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={toggleFabMenu}
        />
      )}

      <View style={styles.fabContainer}>
        {showFabMenu && (
          <Animated.View
            style={[
              styles.fabMenu,
              {
                opacity: fabAnim,
                transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
          >
            {ACTION_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.key}
                style={[styles.fabMenuItem, { backgroundColor: btn.color }]}
                onPress={() => handleFabAction(btn.key)}
              >
                <Ionicons name={btn.icon} size={20} color="#fff" />
                <Text style={styles.fabMenuLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={toggleFabMenu}
        >
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <TaskModal
        visible={!!editTask}
        onClose={() => setEditTask(null)}
        onSaved={refresh}
        editTask={editTask}
      />

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group title"
              value={newGroupTitle}
              onChangeText={setNewGroupTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleCreateGroup}>
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingGroup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group title"
              value={editGroupTitle}
              onChangeText={setEditGroupTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setEditingGroup(null); setEditGroupTitle(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleEditGroup}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassign Modal */}
      {assigningTaskId && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Move to Group</Text>
              <TouchableOpacity
                style={styles.reassignOption}
                onPress={() => handleReassign(assigningTaskId, null as any)}
              >
                <Text style={styles.reassignOptionText}>None (stay in Inbox)</Text>
              </TouchableOpacity>
              {groups.map(group => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.reassignOption}
                  onPress={() => handleReassign(assigningTaskId, group.id)}
                >
                  <Text style={styles.reassignOptionText}>{group.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.modalCancel, { marginTop: 12 }]}
                onPress={() => setAssigningTaskId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  listContent: {
    paddingBottom: 100,
  },
  inboxSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
    fontStyle: 'italic',
  },
  inboxCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: 8,
  },
  inboxLeft: {
    flex: 1,
  },
  inboxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inboxTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
    flex: 1,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notePreview: {
    fontSize: 15,
    color: '#3a3a3c',
    marginTop: 4,
    lineHeight: 20,
  },
  inboxDue: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 2,
  },
  assignHint: {
    fontSize: 12,
    color: '#007AFF',
  },
  groupsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 28,
    right: 16,
    alignItems: 'flex-end',
    zIndex: 9,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabMenu: {
    marginBottom: 12,
    gap: 10,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  fabMenuLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    color: '#1c1c1e',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    padding: 10,
  },
  modalCancelText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  modalSave: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reassignOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reassignOptionText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
});
