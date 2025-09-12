import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';
import { ColorSchemeName } from 'react-native';
import { Colors } from '@/constants/Colors';

export function getPaperTheme(colorScheme: ColorSchemeName): MD3Theme {
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      surface: colors.card,
      surfaceVariant: colors.surface,
      onSurface: colors.text,
      error: colors.error,
      outline: colors.border,
    },
  } as MD3Theme;
}

