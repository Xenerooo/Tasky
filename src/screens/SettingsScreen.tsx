import React from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { updateNotificationChannel, cancelForTask, cancelAll, scheduleForTask } from '../services/notifications';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { settings, updateSettings } = useSettings();
  const { db } = useDatabase();

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
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Si Danika',
        body: 'Ang babaeng mahal ko, my one and onlii baby',
        data: { taskId: 'test' },
        ...(Platform.OS === 'ios' && settings.highPriority ? { interruptionLevel: 'timeSensitive' as const } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
    Alert.alert('Test sent', 'A notification will appear in 2 seconds.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color="#007AFF" />
              <Text style={styles.rowLabel}>Enable Notifications</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, settings.notificationsEnabled && styles.toggleOn]}
              onPress={handleToggleNotifications}
            >
              <View style={[styles.toggleKnob, settings.notificationsEnabled && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={22} color="#FF9500" />
              <Text style={styles.rowLabel}>Remind before due</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleReminderDays(-1)}>
                <Ionicons name="remove" size={18} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{settings.reminderDays}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleReminderDays(1)}>
                <Ionicons name="add" size={18} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.stepperUnit}>days</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIORITY</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="alarm-outline" size={22} color="#34C759" />
              <Text style={styles.rowLabel}>Vibrate</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, settings.vibrate && styles.toggleOn]}
              onPress={() => handleToggle('vibrate')}
            >
              <View style={[styles.toggleKnob, settings.vibrate && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="alert-circle-outline" size={22} color="#FF3B30" />
              <Text style={styles.rowLabel}>High Priority</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, settings.highPriority && styles.toggleOn]}
              onPress={() => handleToggle('highPriority')}
            >
              <View style={[styles.toggleKnob, settings.highPriority && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
          <Ionicons name="flash-outline" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 2,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16, color: '#1c1c1e' },
  toggle: {
    width: 50, height: 28, borderRadius: 14, backgroundColor: '#e5e5ea',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#34C759' },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f2f2f7',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontSize: 18, fontWeight: '700', color: '#1c1c1e', minWidth: 24, textAlign: 'center' },
  stepperUnit: { fontSize: 14, color: '#8E8E93', marginLeft: 4 },
  testButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#007AFF', borderRadius: 12, padding: 16, marginTop: 8,
  },
  testButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
