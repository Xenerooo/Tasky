import React, { useMemo, useState } from 'react';
import { ThemedText } from '../components/ThemedText';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from '@react-navigation/native';
import { useCalendar } from '../hooks/useCalendar';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';
import ConfirmModal from '../components/ConfirmModal';
import { cancelForTask } from '../services/notifications';

interface CalendarScreenProps {
  navigation: any;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const { db } = useDatabase();
  const { year, month, daysMap, selectedDate, setSelectedDate, selectedDateItems, goNextMonth, goPrevMonth, goToToday, refresh } = useCalendar();
  const [confirmDelete, setConfirmDelete] = useState<{ item_id: string; event_type: string; display_text: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; dateKey: string | null }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateKey: null });
    }
    const weeksArr: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksArr.push(cells.slice(i, i + 7));
    }
    return weeksArr;
  }, [year, month]);

  const handleDateTap = (dateKey: string) => {
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
  };

  const handleItemPress = (item: { item_id: string; event_type: string }) => {
    if (item.event_type === 'note_created') {
      navigation.navigate('NoteDetail', { noteId: item.item_id });
    } else {
      navigation.navigate('TaskDetail', { taskId: item.item_id });
    }
  };

  const handleItemEdit = async (item: { item_id: string; event_type: string }) => {
    if (!db) return;
    if (item.event_type === 'note_created') {
      const note = await db.getFirstAsync<any>(
        'SELECT id, content, grouped_task_id, created_at FROM notes WHERE id = ? AND is_deleted = 0',
        item.item_id
      );
      if (note) navigation.navigate('NoteForm', { editNote: note });
    } else {
      const task = await db.getFirstAsync<any>(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE id = ? AND is_deleted = 0',
        item.item_id
      );
      if (task) navigation.navigate('TaskForm', { editTask: task });
    }
  };

  const handleItemDelete = (item: { item_id: string; event_type: string; display_text: string }) => {
    setConfirmDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!db || !confirmDelete) return;
    const now = new Date().toISOString();
    if (confirmDelete.event_type === 'note_created') {
      await db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', now, confirmDelete.item_id);
    } else {
      const task = await db.getFirstAsync<{ notification_ids: string | null }>(
        'SELECT notification_ids FROM tasks WHERE id = ?', confirmDelete.item_id
      );
      if (task?.notification_ids) await cancelForTask(JSON.parse(task.notification_ids));
      await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ?, notification_ids = ? WHERE id = ?', now, null, confirmDelete.item_id);
    }
    setConfirmDelete(null);
    refresh();
  };

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  let selectedDateDisplay = '';
  if (selectedDate) {
    const d = new Date(selectedDate + 'T00:00:00');
    selectedDateDisplay = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={goPrevMonth} style={s.navArrow}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <ThemedText style={s.monthTitle}>{MONTH_NAMES[month]} {year}</ThemedText>
          <TouchableOpacity onPress={goNextMonth} style={s.navArrow}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={d} style={s.weekCell}>
              <ThemedText style={[s.weekLabel, (i === 0 || i === 6) && s.weekendLabel]}>{d}</ThemedText>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={s.weekRow}>
            {week.map((cell, ci) => {
              const stats = cell.dateKey ? daysMap.get(cell.dateKey)?.stats : null;
              const isToday = cell.dateKey === todayStr;
              const isSelected = cell.dateKey === selectedDate;

              if (!cell.day) {
                return <View key={ci} style={s.dayCell} />;
              }

              return (
                <TouchableOpacity
                  key={ci}
                  style={[
                    s.dayCell,
                    isToday && s.todayCell,
                    isSelected && s.selectedCell,
                  ]}
                  onPress={() => handleDateTap(cell.dateKey!)}
                >
                  <ThemedText style={[
                    s.dayNum,
                    isToday && s.todayNum,
                  ]}>
                    {cell.day}
                  </ThemedText>
                  {stats && (stats.tasksCreated > 0 || stats.tasksDue > 0 || stats.notesCreated > 0) && (
                    <View style={s.badgesRow}>
                      {stats.tasksCreated > 0 && (
                        <View style={[s.badge, { backgroundColor: colors.success }]}>
                          <ThemedText style={s.badgeText}>{stats.tasksCreated}</ThemedText>
                        </View>
                      )}
                      {stats.tasksDue > 0 && (
                        <View style={[s.badge, { backgroundColor: colors.danger }]}>
                          <ThemedText style={s.badgeText}>{stats.tasksDue}</ThemedText>
                        </View>
                      )}
                      {stats.notesCreated > 0 && (
                        <View style={[s.badge, { backgroundColor: colors.accent }]}>
                          <ThemedText style={s.badgeText}>{stats.notesCreated}</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {!isCurrentMonth && (
          <TouchableOpacity style={s.todayBtn} onPress={goToToday}>
            <Ionicons name="calendar" size={16} color={colors.badgeText} />
            <ThemedText style={s.todayBtnText}>Today</ThemedText>
          </TouchableOpacity>
        )}

        {selectedDate && (
          <View style={s.itemsSection}>
            <View style={s.itemsHeader}>
              <ThemedText style={s.itemsDate}>{selectedDateDisplay}</ThemedText>
              <ThemedText style={s.itemsCount}>
                {selectedDateItems.length > 0
                  ? `${selectedDateItems.length} item${selectedDateItems.length > 1 ? 's' : ''}`
                  : 'No events'}
              </ThemedText>
            </View>
            {selectedDateItems.length > 0 && (
              <View style={s.itemsList}>
                {selectedDateItems.map((item, idx) => (
                  <TimelineCard
                    key={`${item.item_id}-${item.event_type}-${idx}`}
                    event={item}
                    onView={() => handleItemPress(item)}
                    onEdit={() => handleItemEdit(item)}
                    onDelete={() => handleItemDelete(item)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Delete"
        message={confirmDelete ? `Delete "${confirmDelete.display_text}"?` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </SafeAreaView>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.screenBackground,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navArrow: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekendLabel: {
    color: c.textLowPriority,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  todayCell: {
    backgroundColor: c.calendarTodayBg,
  },
  selectedCell: {
    backgroundColor: c.calendarSelectedBg,
    borderWidth: 1,
    borderColor: c.primary,
  },
  dayNum: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '400',
  },
  todayNum: {
    color: c.primary,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  badge: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    color: c.badgeText,
    fontWeight: '700',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  todayBtnText: {
    color: c.badgeText,
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    marginTop: 16,
    paddingBottom: 32,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  itemsDate: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  itemsCount: {
    fontSize: 13,
    color: c.textTertiary,
    fontWeight: '500',
  },
  itemsList: {
    gap: 2,
  },
});
