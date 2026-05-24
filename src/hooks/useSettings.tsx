import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'tasky_settings';

const DEFAULT_SETTINGS: AppSettings = {
  reminderDays: 3,
  notificationsEnabled: true,
  vibrate: true,
  highPriority: true,
  theme: 'light',
};

export interface AppSettings {
  reminderDays: number;
  notificationsEnabled: boolean;
  vibrate: boolean;
  highPriority: boolean;
  theme: 'light' | 'dark' | 'nika';
}

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
  resetSettings: () => Promise<AppSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
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
    const next = { ...settings, ...partial };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
