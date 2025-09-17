import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  primary: { [key: number]: string };
  gray: { [key: number]: string };
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface ThemeStore {
  currentTheme: Theme;
  availableThemes: Theme[];
  setTheme: (themeId: string) => void;
  applyTheme: (theme: Theme) => void;
}

// Define all available themes
const availableThemes: Theme[] = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    description: 'Professional blue and gray palette perfect for financial applications',
    preview: { primary: '#3b82f6', secondary: '#64748b', accent: '#10b981' },
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a'
      },
      gray: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a'
      },
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4'
    }
  },
  {
    id: 'navy-teal',
    name: 'Navy & Teal',
    description: 'Sophisticated navy with teal accents for a premium feel',
    preview: { primary: '#627d98', secondary: '#78716c', accent: '#14b8a6' },
    colors: {
      primary: {
        50: '#f0f4f8',
        100: '#d9e2ec',
        200: '#bcccdc',
        300: '#9fb3c8',
        400: '#829ab1',
        500: '#627d98',
        600: '#486581',
        700: '#334e68',
        800: '#2a4155',
        900: '#1f3342'
      },
      gray: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917'
      },
      success: '#14b8a6',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0891b2'
    }
  },
  {
    id: 'purple-slate',
    name: 'Purple & Slate',
    description: 'Elegant purple with slate grays for a modern look',
    preview: { primary: '#a855f7', secondary: '#64748b', accent: '#059669' },
    colors: {
      primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7c3aed',
        800: '#6b21a8',
        900: '#581c87'
      },
      gray: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a'
      },
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0891b2'
    }
  },
  {
    id: 'green-neutral',
    name: 'Green & Neutral',
    description: 'Clean green with neutral grays for a fresh appearance',
    preview: { primary: '#22c55e', secondary: '#71717a', accent: '#06b6d4' },
    colors: {
      primary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d'
      },
      gray: {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b'
      },
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#8b5cf6'
    }
  },
  {
    id: 'indigo-warm',
    name: 'Indigo & Warm',
    description: 'Professional indigo with warm grays for sophistication',
    preview: { primary: '#6366f1', secondary: '#78716c', accent: '#059669' },
    colors: {
      primary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81'
      },
      gray: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917'
      },
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0891b2'
    }
  }
];

// Apply theme to CSS variables
const applyThemeToCSS = (theme: Theme) => {
  const root = document.documentElement;

  // Apply primary color (use primary-500 as main primary)
  root.style.setProperty('--primary', theme.colors.primary[500]);
  root.style.setProperty('--primary-foreground', '#ffffff');

  // Apply background and foreground
  root.style.setProperty('--background', theme.colors.gray[50]);
  root.style.setProperty('--foreground', theme.colors.gray[900]);

  // Apply card colors
  root.style.setProperty('--card', theme.colors.gray[50]);
  root.style.setProperty('--card-foreground', theme.colors.gray[900]);

  // Apply secondary colors
  root.style.setProperty('--secondary', theme.colors.gray[100]);
  root.style.setProperty('--secondary-foreground', theme.colors.gray[900]);

  // Apply muted colors
  root.style.setProperty('--muted', theme.colors.gray[100]);
  root.style.setProperty('--muted-foreground', theme.colors.gray[600]);

  // Apply accent colors
  root.style.setProperty('--accent', theme.colors.gray[200]);
  root.style.setProperty('--accent-foreground', theme.colors.gray[900]);

  // Apply border and input colors
  root.style.setProperty('--border', theme.colors.gray[200]);
  root.style.setProperty('--input', theme.colors.gray[200]);
  root.style.setProperty('--ring', theme.colors.primary[500]);

  // Apply semantic colors
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--error', theme.colors.error);
  root.style.setProperty('--info', theme.colors.info);

  // Apply popover colors (same as card)
  root.style.setProperty('--popover', theme.colors.gray[50]);
  root.style.setProperty('--popover-foreground', theme.colors.gray[900]);

  // Apply destructive colors
  root.style.setProperty('--destructive', theme.colors.error);
  root.style.setProperty('--destructive-foreground', '#ffffff');

  // Apply to document for immediate effect
  root.setAttribute('data-theme', theme.id);
};

// Create the store with persistence
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: availableThemes[0], // Default to Modern Blue
      availableThemes,

      setTheme: (themeId: string) => {
        const theme = get().availableThemes.find(t => t.id === themeId);
        if (theme) {
          set({ currentTheme: theme });
          applyThemeToCSS(theme);
        }
      },

      applyTheme: (theme: Theme) => {
        applyThemeToCSS(theme);
      }
    }),
    {
      name: 'invest-pro-theme',
      partialize: (state) => ({ currentTheme: state.currentTheme })
    }
  )
);

// Initialize theme on app start
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyThemeToCSS(store.currentTheme);
}