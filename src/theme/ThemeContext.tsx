import React, { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { light, dark, nika, type ThemeColors, type ThemeName } from './themes';

interface ThemeContextValue {
  colors: ThemeColors;
  themeName: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ colors: light, themeName: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const value = useMemo(() => {
    const themeName: ThemeName = settings.theme === 'dark' ? 'dark'
      : settings.theme === 'nika' ? 'nika' : 'light';
    const colors = themeName === 'dark' ? dark : themeName === 'nika' ? nika : light;
    return { colors, themeName };
  }, [settings]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export type { ThemeColors } from './themes';
