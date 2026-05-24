import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, Platform, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useGroupedTasks, type GroupedTask, type InboxTask } from '../hooks/useGroupedTasks';
import GroupCard from '../components/GroupCard';
import TaskModal from '../components/TaskModal';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const ACTION_BUTTONS = [
    { key: 'task' as const, icon: 'checkbox-outline' as const, label: 'Task', color: colors.primary },
    { key: 'note' as const, icon: 'document-text-outline' as const, label: 'Note', color: colors.success },
    { key: 'group' as const, icon: 'folder-outline' as const, label: 'Group', color: colors.warning },
  ];
  const { groups, inboxItems, search, setSearch, reassignTaskToGroup, createGroup, deleteTask, deleteNote, renameGroup, deleteGroup, refresh } = useGroupedTasks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [editingGroup, setEditingGroup] = useState<GroupedTask | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<InboxTask | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<GroupedTask | null>(null);
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
    setConfirmDeleteGroup(group);
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
      <View style={s.inboxSection}>
        <TouchableOpacity style={s.sectionHeader} onPress={() => navigation.navigate('Inbox')}>
          <Text style={s.sectionTitle}>Tasks/Notes</Text>
          <Text style={s.seeAllText}>See all ›</Text>
        </TouchableOpacity>
        {inboxItems.length === 0 ? (
          <Text style={s.emptyText}>No floating items</Text>
        ) : (
          inboxItems.map(item => (
            <TouchableOpacity
              key={`${item.id}-${item.type}`}
              style={s.inboxCard}
              onPress={() => {
                if (item.type === 'task') {
                  navigation.navigate('TaskDetail', { taskId: item.id });
                } else {
                  navigation.navigate('NoteDetail', { noteId: item.id });
                }
              }}
            >
              <View style={s.inboxLeft}>
                {item.type === 'task' ? (
                  <>
                    <View style={s.inboxTitleRow}>
                      <View style={[s.typeDot, { backgroundColor: colors.primary }]} />
                      <Text style={s.inboxTitle} numberOfLines={1}>{item.display_text}</Text>
                    </View>
                    {item.due_date && (
                      <Text style={s.inboxDue}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <View style={s.inboxTitleRow}>
                      <View style={[s.typeDot, { backgroundColor: colors.success }]} />
                      <Text style={s.noteLabel}>Note</Text>
                    </View>
                    <Text style={s.notePreview} numberOfLines={2}>{item.display_text}</Text>
                  </>
                )}
              </View>
              <Text style={s.assignHint}>{item.type === 'task' ? 'Tap to assign' : 'Tap to view'}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={s.groupsSection}>
        <Text style={s.sectionTitle}>Groups</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.headerTitle}>Tasky</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={s.searchInput}
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
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={false}
      />

      {showFabMenu && (
        <TouchableOpacity
          style={s.fabOverlay}
          activeOpacity={1}
          onPress={toggleFabMenu}
        />
      )}

      <View style={s.fabContainer}>
        {showFabMenu && (
          <Animated.View
            style={[
              s.fabMenu,
              {
                opacity: fabAnim,
                transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
          >
            {ACTION_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.key}
                style={[s.fabMenuItem, { backgroundColor: btn.color }]}
                onPress={() => handleFabAction(btn.key)}
              >
                <Ionicons name={btn.icon} size={20} color={colors.badgeText} />
                <Text style={s.fabMenuLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
        <TouchableOpacity
          style={s.fab}
          onPress={toggleFabMenu}
        >
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color={colors.badgeText} />
        </TouchableOpacity>
      </View>

      <TaskModal
        visible={!!editTask}
        onClose={() => setEditTask(null)}
        onSaved={refresh}
        editTask={editTask}
      />

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>New Group</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Group title"
              value={newGroupTitle}
              onChangeText={setNewGroupTitle}
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={handleCreateGroup}>
                <Text style={s.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingGroup} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Rename Group</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Group title"
              value={editGroupTitle}
              onChangeText={setEditGroupTitle}
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => { setEditingGroup(null); setEditGroupTitle(''); }}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={handleEditGroup}>
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassign Modal */}
      {assigningTaskId && (
        <Modal visible transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Move to Group</Text>
              <TouchableOpacity
                style={s.reassignOption}
                onPress={() => handleReassign(assigningTaskId, null as any)}
              >
                <Text style={s.reassignOptionText}>None (stay in Inbox)</Text>
              </TouchableOpacity>
              {groups.map(group => (
                <TouchableOpacity
                  key={group.id}
                  style={s.reassignOption}
                  onPress={() => handleReassign(assigningTaskId, group.id)}
                >
                  <Text style={s.reassignOptionText}>{group.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.modalCancel, { marginTop: 12 }]}
                onPress={() => setAssigningTaskId(null)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <ConfirmModal
        visible={!!confirmDeleteGroup}
        title="Delete Group"
        message={confirmDeleteGroup ? `Delete "${confirmDeleteGroup.title}" and all its tasks?` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDeleteGroup) deleteGroup(confirmDeleteGroup.id);
          setConfirmDeleteGroup(null);
        }}
        onCancel={() => setConfirmDeleteGroup(null)}
      />
    </SafeAreaView>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.screenBackground,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: c.surface,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: c.borderSeparator,
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
    color: c.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: c.primary,
    fontWeight: '500',
  },
  emptyText: {
    color: c.textTertiary,
    fontSize: 15,
    fontStyle: 'italic',
  },
  inboxCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: c.shadow,
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
    color: c.textPrimary,
    flex: 1,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notePreview: {
    fontSize: 15,
    color: c.textBody,
    marginTop: 4,
    lineHeight: 20,
  },
  inboxDue: {
    fontSize: 12,
    color: c.danger,
    marginTop: 2,
  },
  assignHint: {
    fontSize: 12,
    color: c.primary,
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
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
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
    color: c.badgeText,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    color: c.textPrimary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textTertiary,
    fontSize: 16,
  },
  modalSave: {
    backgroundColor: c.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveText: {
    color: c.badgeText,
    fontSize: 16,
    fontWeight: '600',
  },
  reassignOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.borderDivider,
  },
  reassignOptionText: {
    fontSize: 16,
    color: c.textPrimary,
  },
});
