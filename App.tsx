import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, useDatabase } from './src/hooks/useDatabase';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { initializeNotifications, updateNotificationChannel } from './src/services/notifications';
import { SettingsProvider, useSettings } from './src/hooks/useSettings';
import { ThemeProvider } from './src/theme/ThemeContext';
import * as Notifications from 'expo-notifications';
import { useFonts, loadAsync } from 'expo-font';

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
