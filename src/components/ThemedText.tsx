import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function ThemedText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} style={[colors.bodyFont ? { fontFamily: colors.bodyFont } : null, style as StyleProp<TextStyle>]} />;
}