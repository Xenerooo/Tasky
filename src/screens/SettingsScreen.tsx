import React, { useMemo, useState, useEffect } from 'react';
import { ThemedText } from '../components/ThemedText';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Notifications from 'expo-notifications';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { useTheme } from '../theme/ThemeContext';
import { updateNotificationChannel, cancelForTask, cancelAll, scheduleForTask } from '../services/notifications';
import { updateAllWidgets } from '../widgets/WidgetUpdater';

const THEMES = [
  { key: 'light' as const, icon: 'sunny-outline' as const, label: 'Light' },
  { key: 'dark' as const, icon: 'moon-outline' as const, label: 'Dark' },
  { key: 'nika' as const, icon: 'heart-outline' as const, label: 'Nika' },
];

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { settings, updateSettings } = useSettings();
  const { db } = useDatabase();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [groups, setGroups] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (!db) return;
    db.getAllAsync<{ id: string; title: string }>(
      "SELECT id, title FROM grouped_tasks WHERE is_deleted = 0 ORDER BY created_at DESC"
    ).then(setGroups);
  }, [db]);

  const rescheduleAll = async (newSettings: typeof settings) => {
    if (!db || !newSettings.notificationsEnabled) return;
    const tasks = await db.getAllAsync<{ id: string; title: string; due_date: string; notification_ids: string | null }>(
      "SELECT id, title, due_date, notification_ids FROM tasks WHERE due_date IS NOT NULL AND status = 'ongoing' AND is_deleted = 0"
    );
    for (const task of tasks) {
      if (task.notification_ids) {
        await cancelForTask(JSON.parse(task.notification_ids));
      }
    }
    await db.runAsync("UPDATE tasks SET notification_ids = NULL WHERE due_date IS NOT NULL AND status = 'ongoing' AND is_deleted = 0");
    for (const task of tasks) {
      const ids = await scheduleForTask(task.id, task.title, task.due_date.split('T')[0], newSettings.reminderDays, newSettings.highPriority);
      if (ids.length > 0) {
        await db.runAsync('UPDATE tasks SET notification_ids = ? WHERE id = ?', JSON.stringify(ids), task.id);
      }
    }
  };

  const handleToggleNotifications = async () => {
    const nowEnabled = !settings.notificationsEnabled;
    const updated = await updateSettings({ notificationsEnabled: nowEnabled });
    await updateNotificationChannel(updated);
    if (!db) return;
    if (!nowEnabled) {
      const tasks = await db.getAllAsync<{ notification_ids: string | null }>(
        "SELECT notification_ids FROM tasks WHERE due_date IS NOT NULL AND status = 'ongoing' AND is_deleted = 0 AND notification_ids IS NOT NULL"
      );
      for (const t of tasks) {
        if (t.notification_ids) await cancelForTask(JSON.parse(t.notification_ids));
      }
      await db.runAsync("UPDATE tasks SET notification_ids = NULL WHERE due_date IS NOT NULL AND status = 'ongoing' AND is_deleted = 0");
      await cancelAll();
    } else {
      await rescheduleAll(updated);
    }
  };

  const handleToggle = async (key: 'vibrate' | 'highPriority') => {
    const updated = await updateSettings({ [key]: !settings[key] });
    await updateNotificationChannel(updated);
  };

  const handleReminderDays = async (delta: number) => {
    const next = Math.min(14, Math.max(1, settings.reminderDays + delta));
    if (next !== settings.reminderDays) {
      const updated = await updateSettings({ reminderDays: next });
      await rescheduleAll(updated);
    }
  };

  const handleTestNotification = async () => {
    const granted = await Notifications.requestPermissionsAsync();
    if (!granted.granted) {
      Alert.alert('Permission required', 'Enable notifications in Settings to test.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Kung nakikita mo ito',
        body: 'It means gumagana yung notification, kung ikaw yung baby ko, i love you!',
        data: { taskId: 'test' },
        ...(Platform.OS === 'ios' && settings.highPriority ? { interruptionLevel: 'timeSensitive' as const } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
    Alert.alert('Test sent', 'A notification will appear in 2 seconds.');
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'nika') => {
    await updateSettings({ theme });
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <ThemedText style={s.sectionTitle}>THEME</ThemedText>
          <View style={s.themeRow}>
            {THEMES.map(t => {
              const isActive = settings.theme === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.themeBtn, isActive && s.themeBtnActive]}
                  onPress={() => handleThemeChange(t.key)}
                >
                  <Ionicons name={t.icon} size={22} color={isActive ? colors.textOnColor : colors.textTertiary} />
                  <ThemedText style={[s.themeBtnLabel, isActive && s.themeBtnLabelActive]}>{t.label}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <ThemedText style={s.sectionTitle}>WIDGET</ThemedText>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="layers-outline" size={22} color={colors.accent} />
              <ThemedText style={s.rowLabel}>Widget Group</ThemedText>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.groupPickerScroll}>
            <TouchableOpacity
              style={[s.groupChip, !settings.widgetGroupId && s.groupChipActive]}
              onPress={() => {
                updateSettings({ widgetGroupId: null });
                if (db) updateAllWidgets(db, null);
              }}
            >
              <ThemedText style={[s.groupChipLabel, !settings.widgetGroupId && s.groupChipLabelActive]}>
                None
              </ThemedText>
            </TouchableOpacity>
            {groups.map(g => {
              const isActive = settings.widgetGroupId === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[s.groupChip, isActive && s.groupChipActive]}
                  onPress={() => {
                    updateSettings({ widgetGroupId: g.id });
                    if (db) updateAllWidgets(db, g.id);
                  }}
                >
                  <ThemedText style={[s.groupChipLabel, isActive && s.groupChipLabelActive]}>
                    {g.title}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={s.section}>
          <ThemedText style={s.sectionTitle}>NOTIFICATIONS</ThemedText>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <ThemedText style={s.rowLabel}>Enable Notifications</ThemedText>
            </View>
            <TouchableOpacity
              style={[s.toggle, settings.notificationsEnabled && s.toggleOn]}
              onPress={handleToggleNotifications}
            >
              <View style={[s.toggleKnob, settings.notificationsEnabled && s.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="calendar-outline" size={22} color={colors.warning} />
              <ThemedText style={s.rowLabel}>Remind before due</ThemedText>
            </View>
            <View style={s.stepper}>
              <TouchableOpacity style={s.stepperBtn} onPress={() => handleReminderDays(-1)}>
                <Ionicons name="remove" size={18} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText style={s.stepperValue}>{settings.reminderDays}</ThemedText>
              <TouchableOpacity style={s.stepperBtn} onPress={() => handleReminderDays(1)}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText style={s.stepperUnit}>days</ThemedText>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <ThemedText style={s.sectionTitle}>PRIORITY</ThemedText>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="alarm-outline" size={22} color={colors.success} />
              <ThemedText style={s.rowLabel}>Vibrate</ThemedText>
            </View>
            <TouchableOpacity
              style={[s.toggle, settings.vibrate && s.toggleOn]}
              onPress={() => handleToggle('vibrate')}
            >
              <View style={[s.toggleKnob, settings.vibrate && s.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
              <ThemedText style={s.rowLabel}>High Priority</ThemedText>
            </View>
            <TouchableOpacity
              style={[s.toggle, settings.highPriority && s.toggleOn]}
              onPress={() => handleToggle('highPriority')}
            >
              <View style={[s.toggleKnob, settings.highPriority && s.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.testButton} onPress={handleTestNotification}>
          <Ionicons name="flash-outline" size={20} color={colors.textOnColor} />
          <ThemedText style={s.testButtonText}>Send Test Notification</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.screenBackground },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: c.textTertiary, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 2,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16, color: c.textPrimary },
  toggle: {
    width: 50, height: 28, borderRadius: 14, backgroundColor: c.toggleOff,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: c.toggleOn },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: c.toggleKnob,
    shadowColor: c.shadow, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: c.screenBackground,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontSize: 18, fontWeight: '700', color: c.textPrimary, minWidth: 24, textAlign: 'center' },
  stepperUnit: { fontSize: 14, color: c.textTertiary, marginLeft: 4 },
  testButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.primary, borderRadius: 12, padding: 16, marginTop: 8,
  },
  testButtonText: { color: c.textOnColor, fontSize: 16, fontWeight: '600' },
  themeRow: {
    flexDirection: 'row', gap: 8,
  },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: c.surface, borderRadius: 12, padding: 12,
  },
  themeBtnActive: { backgroundColor: c.primary },
  themeBtnLabel: { fontSize: 15, fontWeight: '600', color: c.textTertiary },
  themeBtnLabelActive: { color: c.textOnColor },
  groupPickerScroll: { marginTop: 4 },
  groupChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: c.surface, marginRight: 8, borderWidth: 1, borderColor: c.border,
  },
  groupChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  groupChipLabel: { fontSize: 14, color: c.textPrimary },
  groupChipLabelActive: { color: c.textOnColor },
});
