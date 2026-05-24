import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDatabase } from './useDatabase';

export interface TimelineEvent {
  item_id: string;
  group_id: string | null;
  display_text: string;
  event_type: 'task_created' | 'task_due' | 'note_created' | 'group_created';
  event_date: string;
}

export interface TimelineSection {
  title: string;
  data: TimelineEvent[];
}

function getSectionTitle(date: Date, today: Date, yesterday: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const y = new Date(yesterday);
  y.setHours(0, 0, 0, 0);

  if (d.getTime() === t.getTime()) return 'Today';
  if (d.getTime() === y.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupIntoSections(events: TimelineEvent[]): TimelineSection[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const title = getSectionTitle(new Date(event.event_date), today, yesterday);
    const list = grouped.get(title);
    if (list) {
      list.push(event);
    } else {
      grouped.set(title, [event]);
    }
  }

  const dateOrder: Record<string, number> = {};
  grouped.forEach((_, key) => {
    if (key === 'Today') dateOrder[key] = 0;
    else if (key === 'Yesterday') dateOrder[key] = 1;
    else dateOrder[key] = 2;
  });

  return Array.from(grouped.entries())
    .sort((a, b) => dateOrder[a[0]] - dateOrder[b[0]])
    .map(([title, data]) => ({ title, data }));
}

export function useTimeline() {
  const { db } = useDatabase();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'deadlines' | 'notes'>('all');

  const sections = useMemo(() => groupIntoSections(events), [events]);

  const fetchTimeline = useCallback(async (database: SQLiteDatabase, query: string, eventFilter: string) => {
    const groupIds: string[] = [];
    if (query) {
      const matchedGroups = await database.getAllAsync<{ id: string }>(
        "SELECT id FROM grouped_tasks WHERE is_deleted = 0 AND title LIKE ?",
        `%${query}%`
      );
      for (const g of matchedGroups) {
        groupIds.push(g.id);
      }
    }

    let whereClause = '';
    const params: any[] = [];

    if (eventFilter === 'deadlines') {
      whereClause = "WHERE event_type = 'task_due'";
    } else if (eventFilter === 'notes') {
      whereClause = "WHERE event_type = 'note_created'";
    } else {
      whereClause = 'WHERE 1=1';
    }

    if (query) {
      whereClause += ' AND (display_text LIKE ?';
      params.push(`%${query}%`);
      if (groupIds.length > 0) {
        whereClause += ` OR group_id IN (${groupIds.map(() => '?').join(',')})`;
        params.push(...groupIds);
      }
      whereClause += ')';
    }

    const sql = `SELECT * FROM global_timeline ${whereClause} ORDER BY event_date DESC`;
    const result = await database.getAllAsync<TimelineEvent>(sql, ...params);
    setEvents(result);
  }, []);

  useEffect(() => {
    if (!db) return;
    fetchTimeline(db, search, filter);
  }, [db, search, filter, fetchTimeline]);

  const refresh = useCallback(() => {
    if (!db) return;
    fetchTimeline(db, search, filter);
  }, [db, search, filter, fetchTimeline]);

  return { events, sections, search, setSearch, filter, setFilter, refresh };
}
