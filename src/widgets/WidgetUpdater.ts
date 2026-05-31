import type { SQLiteDatabase } from 'expo-sqlite';
import {
  fetchTaskOverviewData,
  fetchInboxTrayData,
  fetchCalendarSnapshotData,
  fetchGroupProgressData,
} from './widgetData';
import type { WidgetGroupProgressData, WidgetTaskOverviewData, WidgetInboxTrayData, WidgetCalendarSnapshotData } from './widgetData';

export async function updateAllWidgets(
  db: SQLiteDatabase,
  settingsWidgetGroupId: string | null
): Promise<void> {
  const [taskOverview, inboxTray, calendarSnapshot, groupProgress] =
    await Promise.all([
      fetchTaskOverviewData(db),
      fetchInboxTrayData(db),
      fetchCalendarSnapshotData(db),
      fetchGroupProgressData(db, settingsWidgetGroupId),
    ]);

  await Promise.all([
    updateIOSWidgets(taskOverview, inboxTray, calendarSnapshot, groupProgress),
    updateAndroidWidgets(taskOverview, inboxTray, calendarSnapshot, groupProgress),
  ]);
}

async function updateIOSWidgets(
  taskOverview: WidgetTaskOverviewData,
  inboxTray: WidgetInboxTrayData,
  calendarSnapshot: WidgetCalendarSnapshotData,
  groupProgress: WidgetGroupProgressData | null
): Promise<void> {
  try {
    const TaskOverviewWidget = require('./ios/TaskOverviewWidget').default;
    TaskOverviewWidget.updateSnapshot(taskOverview);
  } catch { }

  try {
    const InboxTrayWidget = require('./ios/InboxTrayWidget').default;
    InboxTrayWidget.updateSnapshot(inboxTray);
  } catch { }

  try {
    const CalendarSnapshotWidget = require('./ios/CalendarSnapshotWidget').default;
    CalendarSnapshotWidget.updateSnapshot(calendarSnapshot);
  } catch { }

  try {
    const GroupProgressWidget = require('./ios/GroupProgressWidget').default;
    GroupProgressWidget.updateSnapshot(
      groupProgress ?? { groupId: '', groupTitle: 'No group', calculatedStatus: '', progressPercentage: 0 }
    );
  } catch { }
}

async function updateAndroidWidgets(
  taskOverview: WidgetTaskOverviewData,
  inboxTray: WidgetInboxTrayData,
  calendarSnapshot: WidgetCalendarSnapshotData,
  groupProgress: WidgetGroupProgressData | null
): Promise<void> {
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { buildTaskOverviewWidget } = require('./android/TaskOverviewWidget');

    await requestWidgetUpdate({
      widgetName: 'TaskOverview',
      renderWidget: () => buildTaskOverviewWidget(taskOverview),
    });
  } catch { }

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { buildInboxTrayWidget } = require('./android/InboxTrayWidget');

    await requestWidgetUpdate({
      widgetName: 'InboxTray',
      renderWidget: () => buildInboxTrayWidget(inboxTray),
    });
  } catch { }

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { buildCalendarSnapshotWidget } = require('./android/CalendarSnapshotWidget');

    await requestWidgetUpdate({
      widgetName: 'CalendarSnapshot',
      renderWidget: () => buildCalendarSnapshotWidget(calendarSnapshot),
    });
  } catch { }

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { buildGroupProgressWidget } = require('./android/GroupProgressWidget');

    await requestWidgetUpdate({
      widgetName: 'GroupProgress',
      renderWidget: () =>
        buildGroupProgressWidget(
          groupProgress ?? {
            groupId: '',
            groupTitle: 'No group',
            calculatedStatus: '',
            progressPercentage: 0,
          }
        ),
    });
  } catch { }
}
