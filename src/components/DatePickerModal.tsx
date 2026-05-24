import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  value: string;
  onConfirm: (dateStr: string) => void;
  onCancel: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function DatePickerModal({ visible, value, onConfirm, onCancel }: DatePickerModalProps) {
  const initDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initDate.getDate());

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  }, [visible, value]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const goNextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const goPrevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const goToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDay(t.getDate());
  };

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

  const handleDone = () => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(selectedDay).padStart(2, '0');
    onConfirm(`${year}-${m}-${d}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Select Due Date</Text>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={20} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
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
                if (!cell.day) return <View key={ci} style={styles.dayCell} />;

                const cellDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                const isToday = cellDateKey === todayStr;
                const isSelected = cell.day === selectedDay;

                return (
                  <TouchableOpacity
                    key={ci}
                    style={[styles.dayCell, isSelected && styles.selectedCell]}
                    onPress={() => setSelectedDay(cell.day!)}
                  >
                    <Text style={[styles.dayNum, isToday && styles.todayNum, isSelected && styles.selectedNum]}>
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
            <Ionicons name="calendar" size={14} color="#007AFF" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '88%', maxWidth: 360,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: '#1c1c1e',
    textAlign: 'center', marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, marginBottom: 8,
  },
  navArrow: { padding: 6 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
  weekendLabel: { color: '#bbb' },
  dayCell: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, margin: 1,
  },
  selectedCell: { backgroundColor: '#007AFF' },
  dayNum: { fontSize: 14, color: '#1c1c1e', fontWeight: '400' },
  todayNum: { color: '#007AFF', fontWeight: '700' },
  selectedNum: { color: '#fff', fontWeight: '700' },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, marginTop: 4,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  buttons: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#f2f2f7', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  doneBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#007AFF', alignItems: 'center',
  },
  doneText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
