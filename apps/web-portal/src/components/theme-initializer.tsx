'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';

export function ThemeInitializer() {
  const { currentTheme, applyTheme } = useThemeStore();

  useEffect(() => {
    // Apply the current theme on mount
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  return null;
}
