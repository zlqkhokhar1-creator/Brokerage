'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';

export function ThemeInitializer() {
  const { currentTheme, applyTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Multiple attempts to apply theme to handle timing issues
    const applyThemeWithRetry = () => {
      if (mounted) {
        applyTheme(currentTheme);

        // Retry after a short delay to ensure it sticks
        setTimeout(() => {
          if (mounted) {
            applyTheme(currentTheme);
          }
        }, 50);
      }
    };

    // Initial application
    applyThemeWithRetry();

    // Additional applications at different intervals
    const timer1 = setTimeout(applyThemeWithRetry, 100);
    const timer2 = setTimeout(applyThemeWithRetry, 250);
    const timer3 = setTimeout(applyThemeWithRetry, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [currentTheme, applyTheme, mounted]);

  // Prevent hydration mismatch by not rendering anything on server
  if (!mounted) {
    return null;
  }

  return null;
}
