import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppSettings } from '../hooks/useSettings';

const CHANNEL_ID = 'task-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: '#007AFF',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function updateNotificationChannel(settings: AppSettings) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Task Reminders',
      importance: settings.highPriority
        ? Notifications.AndroidImportance.HIGH
        : Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: settings.vibrate ? [0, 250, 250, 250] : [],
      enableVibrate: settings.vibrate,
      lightColor: '#007AFF',
    });
  }
}

function notificationBody(title: string, notificationDate: Date, dueDate: Date): string {
  const dueStart = new Date(dueDate);
  dueStart.setHours(0, 0, 0, 0);
  const notifStart = new Date(notificationDate);
  notifStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueStart.getTime() - notifStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return `"${title}" is due in ${diffDays} days`;
  if (diffDays === 1) return `"${title}" is due tomorrow`;
  if (diffDays === 0) return `"${title}" is due today!`;
  return `"${title}" is overdue by ${Math.abs(diffDays)} days`;
}

export async function scheduleForTask(
  taskId: string,
  title: string,
  dueDateStr: string,
  reminderDays: number,
  highPriority: boolean = true
): Promise<string[]> {
  const dueDate = new Date(dueDateStr + 'T00:00:00');
  const reminderStart = new Date(dueDate);
  reminderStart.setDate(reminderStart.getDate() - reminderDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = reminderStart < today ? today : reminderStart;

  const ids: string[] = [];

  for (let d = new Date(startDate); d <= dueDate; d.setDate(d.getDate() + 1)) {
    const am = new Date(d);
    am.setHours(9, 0, 0, 0);
    if (am > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: notificationBody(title, am, dueDate),
          data: { taskId },
          ...(Platform.OS === 'ios' && highPriority ? { interruptionLevel: 'timeSensitive' as const } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: am },
      });
      ids.push(id);
    }

    const pm = new Date(d);
    pm.setHours(20, 0, 0, 0);
    if (pm > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: notificationBody(title, pm, dueDate),
          data: { taskId },
          ...(Platform.OS === 'ios' && highPriority ? { interruptionLevel: 'timeSensitive' as const } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: pm },
      });
      ids.push(id);
    }
  }

  return ids;
}

export async function cancelForTask(notificationIds: string[]) {
  for (const id of notificationIds) {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
