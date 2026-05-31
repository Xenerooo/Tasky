import { useCallback, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDatabase } from './useDatabase';
import { useSettings } from './useSettings';
import { cancelForTask } from '../services/notifications';
import { updateAllWidgets } from '../widgets/WidgetUpdater';

export interface GroupedTask {
  id: string;
  title: string;
  calculated_status: string;
  progress_percentage: number;
  created_at: string;
}

export interface NoteData {
  id: string;
  content: string;
  grouped_task_id: string | null;
  created_at: string;
}

export interface InboxTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

export interface InboxItem {
  id: string;
  type: 'task' | 'note';
  display_text: string;
  event_date: string;
  status?: string;
  due_date?: string | null;
}

export function useGroupedTasks() {
  const { db } = useDatabase();
  const { settings } = useSettings();
  const [groups, setGroups] = useState<GroupedTask[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [search, setSearch] = useState('');

  const fetchGroups = useCallback(async (database: SQLiteDatabase, query: string) => {
    const sql = `
      SELECT 
        gt.id, gt.title, gt.created_at,
        CASE 
          WHEN COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) = 0 
            THEN 'No Deadlines Scheduled'
          WHEN COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) = 0 
            THEN 'Pending'
          WHEN COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) = COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) 
            THEN 'Done'
          ELSE 'Ongoing'
        END AS calculated_status,
        CASE 
          WHEN COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END) = 0 THEN 0
          ELSE (COUNT(CASE WHEN t.due_date IS NOT NULL AND t.status = 'done' THEN 1 END) * 100 / COUNT(CASE WHEN t.due_date IS NOT NULL THEN 1 END))
        END AS progress_percentage
      FROM grouped_tasks gt
      LEFT JOIN tasks t ON gt.id = t.grouped_task_id AND t.is_deleted = 0
      WHERE gt.is_deleted = 0
      GROUP BY gt.id
      HAVING gt.title LIKE ?
      ORDER BY gt.created_at DESC
    `;
    const result = await database.getAllAsync<GroupedTask>(sql, `%${query}%`);
    setGroups(result);
  }, []);

  const fetchInboxItems = useCallback(async (database: SQLiteDatabase) => {
    const [tasks, notes] = await Promise.all([
      database.getAllAsync<{ id: string; title: string; status: string; due_date: string | null; created_at: string }>(
        "SELECT id, title, status, due_date, created_at FROM tasks WHERE grouped_task_id IS NULL AND status = 'ongoing' AND is_deleted = 0 ORDER BY created_at DESC"
      ),
      database.getAllAsync<{ id: string; content: string; created_at: string }>(
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
    setInboxItems(feed);
  }, []);

  useEffect(() => {
    if (!db) return;
    fetchGroups(db, search);
    fetchInboxItems(db);
  }, [db, search, fetchGroups, fetchInboxItems]);

  const refreshWidgets = useCallback(() => {
    if (db) {
      updateAllWidgets(db, settings.widgetGroupId);
    }
  }, [db, settings.widgetGroupId]);

  const reassignTaskToGroup = useCallback(async (taskId: string, groupId: string | null) => {
    if (!db) return;
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE tasks SET grouped_task_id = ?, updated_at = ? WHERE id = ?',
      groupId, now, taskId
    );
    fetchInboxItems(db);
    fetchGroups(db, search);
    refreshWidgets();
  }, [db, search, fetchInboxItems, fetchGroups, refreshWidgets]);

  const createGroup = useCallback(async (title: string) => {
    if (!db) return;
    const { randomUUID } = await import('expo-crypto');
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO grouped_tasks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      id, title, now, now
    );
    fetchGroups(db, search);
    refreshWidgets();
  }, [db, search, fetchGroups, refreshWidgets]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!db) return;
    const now = new Date().toISOString();
    const task = await db.getFirstAsync<{ notification_ids: string | null }>(
      'SELECT notification_ids FROM tasks WHERE id = ?', taskId
    );
    if (task?.notification_ids) {
      await cancelForTask(JSON.parse(task.notification_ids));
    }
    await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ?, notification_ids = ? WHERE id = ?', now, null, taskId);
    fetchInboxItems(db);
    fetchGroups(db, search);
    refreshWidgets();
  }, [db, search, fetchInboxItems, fetchGroups, refreshWidgets]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!db) return;
    const now = new Date().toISOString();
    await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, noteId);
    fetchInboxItems(db);
    refreshWidgets();
  }, [db, fetchInboxItems, refreshWidgets]);

  const renameGroup = useCallback(async (groupId: string, newTitle: string) => {
    if (!db) return;
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE grouped_tasks SET title = ?, updated_at = ? WHERE id = ?',
      newTitle, now, groupId
    );
    fetchGroups(db, search);
    refreshWidgets();
  }, [db, search, fetchGroups, refreshWidgets]);

  const deleteGroup = useCallback(async (groupId: string) => {
    if (!db) return;
    const now = new Date().toISOString();
    const tasks = await db.getAllAsync<{ notification_ids: string | null }>(
      'SELECT notification_ids FROM tasks WHERE grouped_task_id = ? AND is_deleted = 0', groupId
    );
    for (const t of tasks) {
      if (t.notification_ids) await cancelForTask(JSON.parse(t.notification_ids));
    }
    await db.runAsync('UPDATE grouped_tasks SET is_deleted = 1, updated_at = ? WHERE id = ?', now, groupId);
    await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ?, notification_ids = ? WHERE grouped_task_id = ?', now, null, groupId);
    await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE grouped_task_id = ?', now, groupId);
    fetchGroups(db, search);
    fetchInboxItems(db);
    refreshWidgets();
  }, [db, search, fetchGroups, fetchInboxItems, refreshWidgets]);

  const refresh = useCallback(() => {
    if (!db) return;
    fetchGroups(db, search);
    fetchInboxItems(db);
    refreshWidgets();
  }, [db, search, fetchGroups, fetchInboxItems, refreshWidgets]);

  return { groups, inboxItems, search, setSearch, reassignTaskToGroup, createGroup, deleteTask, deleteNote, renameGroup, deleteGroup, refresh };
}
