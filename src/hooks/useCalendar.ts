import { useCallback, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDatabase } from './useDatabase';
import type { TimelineEvent } from './useTimeline';

export interface CalendarDayStats {
  tasksCreated: number;
  tasksDue: number;
  notesCreated: number;
}

export function useCalendar() {
  const { db } = useDatabase();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [daysMap, setDaysMap] = useState<Map<string, { stats: CalendarDayStats; items: TimelineEvent[] }>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const goNextMonth = useCallback(() => {
    setMonth(m => {
      if (m === 11) { setYear(y => y + 1); return 0; }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  const goPrevMonth = useCallback(() => {
    setMonth(m => {
      if (m === 0) { setYear(y => y - 1); return 11; }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const fetchMonthData = useCallback(async (database: SQLiteDatabase, y: number, m: number) => {
    const startStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const nextMonth = m === 11 ? 0 : m + 1;
    const nextYear = m === 11 ? y + 1 : y;
    const endStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;

    const rows = await database.getAllAsync<TimelineEvent>(
      `SELECT * FROM global_timeline WHERE event_date >= ? AND event_date < ? ORDER BY event_date DESC`,
      [startStr, endStr]
    );

    const map = new Map<string, { stats: CalendarDayStats; items: TimelineEvent[] }>();
    for (const row of rows) {
      const dateKey = row.event_date.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, { stats: { tasksCreated: 0, tasksDue: 0, notesCreated: 0 }, items: [] });
      }
      const entry = map.get(dateKey)!;
      if (row.event_type === 'task_created') entry.stats.tasksCreated++;
      else if (row.event_type === 'task_due') entry.stats.tasksDue++;
      else if (row.event_type === 'note_created') entry.stats.notesCreated++;
      entry.items.push(row);
    }
    setDaysMap(map);
  }, []);

  useEffect(() => {
    if (!db) return;
    fetchMonthData(db, year, month);
  }, [db, year, month, fetchMonthData]);

  const selectedDateItems = selectedDate ? (daysMap.get(selectedDate)?.items ?? []) : [];

  const goToToday = useCallback(() => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDate(null);
  }, []);

  const refresh = useCallback(() => {
    if (!db) return;
    fetchMonthData(db, year, month);
  }, [db, year, month, fetchMonthData]);

  return { year, month, daysMap, selectedDate, setSelectedDate, selectedDateItems, goNextMonth, goPrevMonth, goToToday, refresh };
}
