import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'tasky_settings';

const DEFAULT_SETTINGS: AppSettings = {
  reminderDays: 3,
  notificationsEnabled: true,
  vibrate: true,
  highPriority: true,
};

export interface AppSettings {
  reminderDays: number;
  notificationsEnabled: boolean;
  vibrate: boolean;
  highPriority: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch {
        // use defaults
      }
      setLoaded(true);
    })();
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const next = { ...DEFAULT_SETTINGS, ...(await (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    })()), ...partial };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }, []);

  return { settings, loaded, updateSettings, resetSettings };
}
