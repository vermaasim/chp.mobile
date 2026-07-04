import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { themeColors } from './colors';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: themeColors.primary,
    secondary: themeColors.secondary,
    background: themeColors.appBackground,
    surface: themeColors.surface,
    surfaceVariant: themeColors.surfaceMuted,
    outline: themeColors.border,
    onPrimary: themeColors.textOnBrand,
    onSurface: themeColors.textPrimary,
    onSurfaceVariant: themeColors.textSecondary,
    error: '#B42318',
  },
};