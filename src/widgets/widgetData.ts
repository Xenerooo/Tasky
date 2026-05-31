import type { SQLiteDatabase } from 'expo-sqlite';

export interface WidgetTaskOverviewData {
  dueToday: number;
  overdue: number;
  upcoming: number;
  totalOngoing: number;
}

export interface InboxTrayItemData {
  id: string;
  type: 'task' | 'note';
  text: string;
}

export interface WidgetInboxTrayData {
  items: InboxTrayItemData[];
  total: number;
}

export interface CalendarEventItem {
  id: string;
  type: string;
  text: string;
}

export interface WidgetCalendarSnapshotData {
  tasksDue: number;
  notesCreated: number;
  items: CalendarEventItem[];
}

export interface WidgetGroupProgressData {
  groupId: string;
  groupTitle: string;
  calculatedStatus: string;
  progressPercentage: number;
}

export async function fetchTaskOverviewData(
  db: SQLiteDatabase
): Promise<WidgetTaskOverviewData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString();

  const [dueToday, overdue, upcoming, totalOngoing] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE due_date >= ? AND due_date < ? AND status = 'ongoing' AND is_deleted = 0",
      todayStr,
      tomorrowStr
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE due_date < ? AND status = 'ongoing' AND is_deleted = 0",
      todayStr
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE due_date >= ? AND due_date < ? AND status = 'ongoing' AND is_deleted = 0",
      tomorrowStr,
      nextWeekStr
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE status = 'ongoing' AND is_deleted = 0"
    ),
  ]);

  return {
    dueToday: dueToday?.count ?? 0,
    overdue: overdue?.count ?? 0,
    upcoming: upcoming?.count ?? 0,
    totalOngoing: totalOngoing?.count ?? 0,
  };
}

export async function fetchInboxTrayData(
  db: SQLiteDatabase
): Promise<WidgetInboxTrayData> {
  const [tasks, notes, total] = await Promise.all([
    db.getAllAsync<{ id: string; title: string }>(
      "SELECT id, title FROM tasks WHERE grouped_task_id IS NULL AND status = 'ongoing' AND is_deleted = 0 ORDER BY created_at DESC LIMIT 3"
    ),
    db.getAllAsync<{ id: string; content: string }>(
      "SELECT id, content FROM notes WHERE grouped_task_id IS NULL AND is_deleted = 0 ORDER BY created_at DESC LIMIT 3"
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE grouped_task_id IS NULL AND status = 'ongoing' AND is_deleted = 0"
    ),
  ]);

  const items: InboxTrayItemData[] = [
    ...tasks.map((t) => ({
      id: t.id,
      type: 'task' as const,
      text: t.title,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: 'note' as const,
      text: n.content.substring(0, 60),
    })),
  ].slice(0, 3);

  return { items, total: total?.count ?? 0 };
}

export async function fetchCalendarSnapshotData(
  db: SQLiteDatabase
): Promise<WidgetCalendarSnapshotData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString();

  const rows = await db.getAllAsync<CalendarEventItem>(
    `SELECT item_id AS id, event_type AS type, display_text AS text FROM global_timeline WHERE event_date >= ? AND event_date < ?`,
    todayStr,
    tomorrowStr
  );

  const tasksDue = rows.filter((r) => r.type === 'task_due').length;
  const notesCreated = rows.filter((r) => r.type === 'note_created').length;

  return { tasksDue, notesCreated, items: rows.slice(0, 5) };
}

export async function fetchGroupProgressData(
  db: SQLiteDatabase,
  groupId: string | null
): Promise<WidgetGroupProgressData | null> {
  if (!groupId) return null;

  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    calculated_status: string;
    progress_percentage: number;
  }>(
    `SELECT gt.id, gt.title,
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
    WHERE gt.id = ? AND gt.is_deleted = 0
    GROUP BY gt.id`,
    groupId
  );

  if (!row) return null;

  return {
    groupId: row.id,
    groupTitle: row.title,
    calculatedStatus: row.calculated_status,
    progressPercentage: row.progress_percentage,
  };
}
