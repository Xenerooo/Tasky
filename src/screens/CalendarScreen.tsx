import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCalendar } from '../hooks/useCalendar';
import { useDatabase } from '../hooks/useDatabase';
import TimelineCard from '../components/TimelineCard';
import ConfirmModal from '../components/ConfirmModal';

interface CalendarScreenProps {
  navigation: any;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
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
      await db.runAsync('UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?', now, confirmDelete.item_id);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goPrevMonth} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity onPress={goNextMonth} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={d} style={styles.weekCell}>
              <Text style={[styles.weekLabel, (i === 0 || i === 6) && styles.weekendLabel]}>{d}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) => {
              const stats = cell.dateKey ? daysMap.get(cell.dateKey)?.stats : null;
              const isToday = cell.dateKey === todayStr;
              const isSelected = cell.dateKey === selectedDate;

              if (!cell.day) {
                return <View key={ci} style={styles.dayCell} />;
              }

              return (
                <TouchableOpacity
                  key={ci}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => handleDateTap(cell.dateKey!)}
                >
                  <Text style={[
                    styles.dayNum,
                    isToday && styles.todayNum,
                  ]}>
                    {cell.day}
                  </Text>
                  {stats && (stats.tasksCreated > 0 || stats.tasksDue > 0 || stats.notesCreated > 0) && (
                    <View style={styles.badgesRow}>
                      {stats.tasksCreated > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
                          <Text style={styles.badgeText}>{stats.tasksCreated}</Text>
                        </View>
                      )}
                      {stats.tasksDue > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                          <Text style={styles.badgeText}>{stats.tasksDue}</Text>
                        </View>
                      )}
                      {stats.notesCreated > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#AF52DE' }]}>
                          <Text style={styles.badgeText}>{stats.notesCreated}</Text>
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
          <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}

        {selectedDate && (
          <View style={styles.itemsSection}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsDate}>{selectedDateDisplay}</Text>
              <Text style={styles.itemsCount}>
                {selectedDateItems.length > 0
                  ? `${selectedDateItems.length} item${selectedDateItems.length > 1 ? 's' : ''}`
                  : 'No events'}
              </Text>
            </View>
            {selectedDateItems.length > 0 && (
              <View style={styles.itemsList}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
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
    color: '#1c1c1e',
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
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekendLabel: {
    color: '#bbb',
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
    backgroundColor: '#007AFF0D',
  },
  selectedCell: {
    backgroundColor: '#007AFF1A',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dayNum: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '400',
  },
  todayNum: {
    color: '#007AFF',
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
    color: '#fff',
    fontWeight: '700',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  todayBtnText: {
    color: '#fff',
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
    color: '#1c1c1e',
  },
  itemsCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  itemsList: {
    gap: 2,
  },
});
