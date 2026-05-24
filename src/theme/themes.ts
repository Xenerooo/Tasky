export interface ThemeColors {
  screenBackground: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceDanger: string;
  overlay: string;
  handle: string;

  primary: string;
  success: string;
  danger: string;
  warning: string;
  accent: string;
  amarillo: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textBody: string;
  textDisabled: string;
  textHint: string;
  textPlaceholder: string;
  textLowPriority: string;
  textOnColor: string;
  textLink: string;

  border: string;
  borderSeparator: string;
  borderDivider: string;
  borderSelected: string;

  toggleOff: string;
  toggleOn: string;
  toggleKnob: string;

  statusDone: string;
  statusOngoing: string;
  statusPending: string;
  statusDefault: string;

  shadow: string;
  tabActive: string;
  tabInactive: string;
  tabBackground: string;
  tabBorder: string;

  calendarTodayBg: string;
  calendarSelectedBg: string;
  noteBadgeBg: string;
  badgeText: string;

  headingFont: string | undefined;
  bodyFont: string | undefined;
}

export type ThemeName = 'light' | 'dark' | 'nika';

export const light: ThemeColors = {
  screenBackground: '#f2f2f7',
  surface: '#fff',
  surfaceSecondary: '#f8f8f8',
  surfaceTertiary: '#f0f0f0',
  surfaceDanger: '#FFF5F5',
  overlay: 'rgba(0,0,0,0.4)',
  handle: '#ccc',

  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  accent: '#AF52DE',
  amarillo: '#D4AF37',

  textPrimary: '#1c1c1e',
  textSecondary: '#333',
  textTertiary: '#8E8E93',
  textBody: '#3a3a3c',
  textDisabled: '#555',
  textHint: '#999',
  textPlaceholder: '#aaa',
  textLowPriority: '#bbb',
  textOnColor: '#fff',
  textLink: '#007AFF',

  border: '#ddd',
  borderSeparator: '#e5e5ea',
  borderDivider: '#f0f0f0',
  borderSelected: '#007AFF',

  toggleOff: '#e5e5ea',
  toggleOn: '#34C759',
  toggleKnob: '#fff',

  statusDone: '#34C759',
  statusOngoing: '#FF9500',
  statusPending: '#FF3B30',
  statusDefault: '#8E8E93',

  shadow: '#000',
  tabActive: '#007AFF',
  tabInactive: '#8E8E93',
  tabBackground: '#fff',
  tabBorder: '#e5e5ea',

  calendarTodayBg: '#007AFF0D',
  calendarSelectedBg: '#007AFF1A',
  noteBadgeBg: '#34C75920',
  badgeText: '#fff',

  headingFont: undefined,
  bodyFont: undefined,
};

export const dark: ThemeColors = {
  screenBackground: '#1c1c1e',
  surface: '#2c2c2e',
  surfaceSecondary: '#3a3a3c',
  surfaceTertiary: '#48484a',
  surfaceDanger: '#4A2020',
  overlay: 'rgba(0,0,0,0.7)',
  handle: '#636366',

  primary: '#0A84FF',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  accent: '#BF5AF2',
  amarillo: '#D4AF37',

  textPrimary: '#f2f2f7',
  textSecondary: '#e5e5ea',
  textTertiary: '#8E8E93',
  textBody: '#c7c7cc',
  textDisabled: '#636366',
  textHint: '#636366',
  textPlaceholder: '#48484a',
  textLowPriority: '#636366',
  textOnColor: '#fff',
  textLink: '#0A84FF',

  border: '#3a3a3c',
  borderSeparator: '#38383a',
  borderDivider: '#48484a',
  borderSelected: '#0A84FF',

  toggleOff: '#636366',
  toggleOn: '#30D158',
  toggleKnob: '#fff',

  statusDone: '#30D158',
  statusOngoing: '#FF9F0A',
  statusPending: '#FF453A',
  statusDefault: '#636366',

  shadow: '#000',
  tabActive: '#0A84FF',
  tabInactive: '#636366',
  tabBackground: '#2c2c2e',
  tabBorder: '#38383a',

  calendarTodayBg: '#0A84FF1A',
  calendarSelectedBg: '#0A84FF33',
  noteBadgeBg: '#30D15833',
  badgeText: '#fff',

  headingFont: undefined,
  bodyFont: undefined,
};

export const nika: ThemeColors = {
  screenBackground: '#FFF0F5',
  surface: '#FFF8FC',
  surfaceSecondary: '#FFF0F5',
  surfaceTertiary: '#FFE8F0',
  surfaceDanger: '#FFE0E8',
  overlay: 'rgba(74,48,48,0.3)',
  handle: '#E8C4D4',

  primary: '#FFB6C1',
  success: '#8ECBA6',
  danger: '#FF8A8A',
  warning: '#F0C488',
  accent: '#D4A0D4',
  amarillo: '#FFD400',

  textPrimary: '#4A3030',
  textSecondary: '#6B4A4A',
  textTertiary: '#A08080',
  textBody: '#7A5A5A',
  textDisabled: '#B09090',
  textHint: '#C0A0A0',
  textPlaceholder: '#D0B0B0',
  textLowPriority: '#C0A0A0',
  textOnColor: '#fff',
  textLink: '#E88090',

  border: '#FFD8E5',
  borderSeparator: '#FFE0EA',
  borderDivider: '#FFE8F0',
  borderSelected: '#FFB6C1',

  toggleOff: '#FFD8E5',
  toggleOn: '#FFB6C1',
  toggleKnob: '#fff',

  statusDone: '#8ECBA6',
  statusOngoing: '#F0C488',
  statusPending: '#FF8A8A',
  statusDefault: '#D0B0B0',

  shadow: '#4A3030',
  tabActive: '#FFB6C1',
  tabInactive: '#D0B0B0',
  tabBackground: '#FFF8FC',
  tabBorder: '#FFE0EA',

  calendarTodayBg: '#FFB6C140',
  calendarSelectedBg: '#FFB6C166',
  noteBadgeBg: '#A8D8B940',
  badgeText: '#4A3030',

  headingFont: 'Amarillo',
  bodyFont: 'SourceSerif4',
};
