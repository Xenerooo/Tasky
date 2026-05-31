import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, useDatabase } from './src/hooks/useDatabase';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, StyleSheet, Text, Platform, Linking } from 'react-native';
import { initializeNotifications, updateNotificationChannel } from './src/services/notifications';
import { SettingsProvider, useSettings } from './src/hooks/useSettings';
import { ThemeProvider } from './src/theme/ThemeContext';
import * as Notifications from 'expo-notifications';
import { useFonts, loadAsync } from 'expo-font';
import { updateAllWidgets } from './src/widgets/WidgetUpdater';

function AppContent() {
  const { loading } = useDatabase();
  const { settings, loaded: settingsLoaded } = useSettings();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    loadAsync({
      Amarillo: require('./assets/fonts/Amarillo.otf'),
      SourceSerif4: require('./assets/fonts/SourceSerif4.ttf'),
    }).then(() => setFontsLoaded(true)).catch(e => {
      console.warn('Font load failed', e);
      setFontsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (settingsLoaded) {
      updateNotificationChannel(settings);
    }
  }, [settings, settingsLoaded]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const taskId = response.notification.request.content.data?.taskId;
      if (typeof taskId === 'string' && navigationRef.current) {
        navigationRef.current.navigate('TaskDetail', { taskId });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!loading) {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response?.notification.request.content.data?.taskId) {
          const taskId = response.notification.request.content.data.taskId as string;
          setTimeout(() => {
            if (navigationRef.current) {
              navigationRef.current.navigate('TaskDetail', { taskId });
            }
          }, 500);
        }
      });
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && settingsLoaded) {
      const { getDatabase } = require('./src/database/database');
      getDatabase().then(async (db: any) => {
        await updateAllWidgets(db, settings.widgetGroupId);
      });
    }
  }, [loading, settingsLoaded, settings.widgetGroupId]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        const { registerWidgetTaskHandler } = require('react-native-android-widget');
        const { buildTaskOverviewWidget } = require('./src/widgets/android/TaskOverviewWidget');
        const { buildInboxTrayWidget } = require('./src/widgets/android/InboxTrayWidget');
        const { buildCalendarSnapshotWidget } = require('./src/widgets/android/CalendarSnapshotWidget');
        const { buildQuickCaptureWidget } = require('./src/widgets/android/QuickCaptureWidget');
        const { buildGroupProgressWidget } = require('./src/widgets/android/GroupProgressWidget');

        registerWidgetTaskHandler(async (props: any) => {
          const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

          if (widgetAction === 'WIDGET_CLICK') {
            if (clickAction === 'OPEN_URI' && clickActionData?.uri) {
              const url = clickActionData.uri as string;
              handleWidgetUrl(url);
            }
            return;
          }

          const { getDatabase } = require('./src/database/database');
          const db = await getDatabase();
          const { fetchTaskOverviewData, fetchInboxTrayData, fetchCalendarSnapshotData, fetchGroupProgressData } = require('./src/widgets/widgetData');

          switch (widgetInfo.widgetName) {
            case 'TaskOverview': {
              const data = await fetchTaskOverviewData(db);
              renderWidget(buildTaskOverviewWidget(data));
              break;
            }
            case 'InboxTray': {
              const data = await fetchInboxTrayData(db);
              renderWidget(buildInboxTrayWidget(data));
              break;
            }
            case 'CalendarSnapshot': {
              const data = await fetchCalendarSnapshotData(db);
              renderWidget(buildCalendarSnapshotWidget(data));
              break;
            }
            case 'QuickCapture': {
              renderWidget(buildQuickCaptureWidget());
              break;
            }
            case 'GroupProgress': {
              const stored = require('@react-native-async-storage/async-storage').default;
              const raw = await stored.getItem('tasky_settings');
              let groupId: string | null = null;
              if (raw) {
                const parsed = JSON.parse(raw);
                groupId = parsed.widgetGroupId ?? null;
              }
              const data = await fetchGroupProgressData(db, groupId);
              renderWidget(buildGroupProgressWidget(data ?? { groupId: '', groupTitle: 'No group', calculatedStatus: '', progressPercentage: 0 }));
              break;
            }
          }
        });
      } catch { }
    }
  }, []);

  function handleWidgetUrl(url: string) {
    const nav = navigationRef.current;
    if (!nav) return;

    const parsed = url.replace('tasky://widget/', '').split('/');
    const widgetName = parsed[0];
    const action = parsed[1];

    if (widgetName === 'quick-capture') {
      if (action === 'task') {
        nav.navigate('TaskForm', {});
      } else if (action === 'note') {
        nav.navigate('NoteForm', {});
      }
    }
  }

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <SettingsProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
});
