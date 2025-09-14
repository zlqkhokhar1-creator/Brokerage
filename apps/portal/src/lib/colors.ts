/**
 * Neo-Fintech Pro Color Palette
 * Modern, professional fintech design with deep navy primary and electric accents
 */

export const neoFintechPalette = {
  // Primary Colors
  primary: {
    deepNavy: '#0B0F1A',      // Main background, nav for dark mode
    neutralDark: '#1A1F2B',    // Secondary backgrounds, cards in dark
  },
  
  // Accent Colors
  accent: {
    electricTeal: '#00E6B8',   // Primary actions, CTAs, positive indicators
    neonAmber: '#FFB300',      // Warnings, highlights, secondary actions
  },
  
  // Neutral Colors
  neutral: {
    light: '#F5F7FA',          // Light mode backgrounds
    dark: '#1A1F2B',           // Dark mode secondary
  },
  
  // Semantic Colors
  semantic: {
    success: '#10B981',        // Green for positive trades/gains
    warning: '#F59E0B',        // Amber for alerts
    error: '#EF4444',          // Red for errors/losses
    info: '#3B82F6',           // Blue for info
  },
  
  // Chart & Data Viz Colors
  chart: {
    teal: '#00E6B8',
    amber: '#FFB300',
    navy: '#0B0F1A',
    gray: '#6B7280',
    green: '#10B981',
    red: '#EF4444',
  },
  
  // Trading Specific
  trading: {
    bullish: '#10B981',
    bearish: '#EF4444',
    neutral: '#6B7280',
    social: '#00E6B8',
  }
} as const;

/**
 * Light Mode Scheme
 */
export const lightScheme = {
  background: neoFintechPalette.neutral.light,
  'background-alt': '#FFFFFF',
  foreground: '#111827',
  'card': '#FFFFFF',
  'card-foreground': '#111827',
  border: '#E5E7EB',
  input: '#F9FAFB',
  ring: neoFintechPalette.accent.electricTeal,
  primary: neoFintechPalette.primary.deepNavy,
  'primary-foreground': '#FFFFFF',
  secondary: '#F3F4F6',
  'secondary-foreground': '#374151',
  muted: '#F9FAFB',
  'muted-foreground': '#6B7280',
  accent: neoFintechPalette.accent.electricTeal,
  'accent-foreground': '#0B0F1A',
  destructive: neoFintechPalette.semantic.error,
  'destructive-foreground': '#FFFFFF',
  success: neoFintechPalette.semantic.success,
  warning: neoFintechPalette.semantic.warning,
  sidebar: neoFintechPalette.primary.deepNavy,
  'sidebar-foreground': '#FFFFFF',
} as const;

/**
 * Dark Mode Scheme (Default for Dashboards)
 */
export const darkScheme = {
  background: neoFintechPalette.primary.deepNavy,
  'background-alt': neoFintechPalette.primary.neutralDark,
  foreground: '#F9FAFB',
  'card': neoFintechPalette.primary.neutralDark,
  'card-foreground': '#F9FAFB',
  border: '#374151',
  input: '#1F2937',
  ring: neoFintechPalette.accent.electricTeal,
  primary: neoFintechPalette.accent.electricTeal,
  'primary-foreground': '#0B0F1A',
  secondary: '#1F2937',
  'secondary-foreground': '#F9FAFB',
  muted: '#1F2937',
  'muted-foreground': '#9CA3AF',
  accent: neoFintechPalette.accent.neonAmber,
  'accent-foreground': '#0B0F1A',
  destructive: neoFintechPalette.semantic.error,
  'destructive-foreground': '#FFFFFF',
  success: neoFintechPalette.semantic.success,
  warning: neoFintechPalette.semantic.warning,
  sidebar: neoFintechPalette.primary.neutralDark,
  'sidebar-foreground': '#F9FAFB',
} as const;

/**
 * CSS Custom Properties for Tailwind
 */
export const cssVariables = {
  // Light Mode Defaults (overridden in dark)
  ...Object.fromEntries(
    Object.entries(lightScheme).map(([key, value]) => [`--${key}`, value])
  ),
  
  // Neo-Fintech Specific
  '--neo-navy': neoFintechPalette.primary.deepNavy,
  '--neo-teal': neoFintechPalette.accent.electricTeal,
  '--neo-amber': neoFintechPalette.accent.neonAmber,
  '--neo-light': neoFintechPalette.neutral.light,
  '--neo-dark': neoFintechPalette.neutral.dark,
  '--success': neoFintechPalette.semantic.success,
  '--warning': neoFintechPalette.semantic.warning,
  '--error': neoFintechPalette.semantic.error,
  '--info': neoFintechPalette.semantic.info,
  
  // Radius & Spacing (4px scale)
  '--radius': '0.5rem',
  '--spacing-unit': '4px',
  
  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '--shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

/**
 * Get CSS Variable
 */
export const getCSSVar = (name: string): string => `var(${name})`;

/**
 * Trading Status Colors
 */
export const getTradingStatusColor = (status: 'bullish' | 'bearish' | 'neutral' | 'success' | 'warning' | 'error' | 'social') => {
  const map = {
    bullish: neoFintechPalette.trading.bullish,
    bearish: neoFintechPalette.trading.bearish,
    neutral: neoFintechPalette.trading.neutral,
    success: neoFintechPalette.semantic.success,
    warning: neoFintechPalette.semantic.warning,
    error: neoFintechPalette.semantic.error,
    social: neoFintechPalette.trading.social,
  };
  return map[status] || neoFintechPalette.trading.neutral;
};

/**
 * Gradients
 */
export const gradients = {
  primary: `linear-gradient(135deg, ${neoFintechPalette.primary.deepNavy} 0%, ${neoFintechPalette.accent.electricTeal} 100%)`,
  accent: `linear-gradient(135deg, ${neoFintechPalette.accent.electricTeal} 0%, ${neoFintechPalette.accent.neonAmber} 100%)`,
  dashboardDark: `linear-gradient(145deg, ${neoFintechPalette.primary.deepNavy} 0%, ${neoFintechPalette.primary.neutralDark} 100%)`,
  cardLight: `linear-gradient(145deg, ${neoFintechPalette.neutral.light} 0%, #FFFFFF 100%)`,
  aiInsight: `linear-gradient(135deg, ${neoFintechPalette.accent.electricTeal} 0%, ${neoFintechPalette.semantic.success} 100%)`,
} as const;

/**
 * Opacity Utility
 */
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 2), 16);
  const b = parseInt(hex.substring(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Color Schemes for Contexts
 */
export const colorSchemes = {
  dashboard: {
    ...darkScheme,  // Default dark
    accent: neoFintechPalette.accent.electricTeal,
  },
  navigation: {
    background: neoFintechPalette.primary.deepNavy,
    foreground: '#F9FAFB',
    accent: neoFintechPalette.accent.electricTeal,
    hover: withOpacity(neoFintechPalette.accent.electricTeal, 0.1),
  },
  trading: {
    positive: neoFintechPalette.semantic.success,
    negative: neoFintechPalette.semantic.error,
    neutral: '#6B7280',
    alert: neoFintechPalette.semantic.warning,
    social: neoFintechPalette.accent.electricTeal,
  },
  ai: {
    background: withOpacity(neoFintechPalette.accent.electricTeal, 0.05),
    border: neoFintechPalette.accent.electricTeal,
    text: neoFintechPalette.primary.deepNavy,
  }
} as const;
