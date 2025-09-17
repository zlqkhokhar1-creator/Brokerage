/**
 * Professional Trading Color Palette
 * Inspired by earthy, trustworthy tones with financial market accents
 */

export const tradingPalette = {
  // Primary Palette - Core brand colors
  primary: {
    mochaMousse: '#A47864',    // Primary background for dashboards (earthy, stable)
    deepOceanBlue: '#1B263B',  // Navigation bars, headers (trustworthy)
    softCream: '#F5F5F5',      // Content backgrounds for readability
  },
  
  // Accent Colors - Action and status indicators
  accent: {
    verdantGreen: '#4CAF50',   // CTAs for trades or portfolio actions (growth-oriented)
    neonYellow: '#FFFF00',     // Alerts or highlights (attention-grabbing)
    coral: '#FF7F50',          // Social trading highlights (warm, engaging)
    garnet: '#800020',         // Urgent notifications (bold, exclusive)
  },
  
  // Chart & Analytics Colors
  chart: {
    galaxyLavender: '#7A95AB', // Gradient average from Galaxy Blue to Digital Lavender
    digitalLavender: '#E6E6FA',
    galaxyBlue: '#1B263B',
  },
  
  // Semantic Colors for Trading
  trading: {
    bullish: '#4CAF50',        // Verdant Green for positive movements
    bearish: '#800020',        // Garnet for negative movements
    neutral: '#7A95AB',        // Galaxy-Lavender for neutral/stable
    warning: '#FFFF00',        // Neon Yellow for alerts
    social: '#FF7F50',         // Coral for social features
  }
} as const;

/**
 * CSS Custom Property Mappings
 */
export const cssVariables = {
  // Primary
  '--mocha-mousse': tradingPalette.primary.mochaMousse,
  '--deep-ocean-blue': tradingPalette.primary.deepOceanBlue,
  '--soft-cream': tradingPalette.primary.softCream,
  
  // Accent
  '--verdant-green': tradingPalette.accent.verdantGreen,
  '--neon-yellow': tradingPalette.accent.neonYellow,
  '--coral': tradingPalette.accent.coral,
  '--garnet': tradingPalette.accent.garnet,
  
  // Chart
  '--galaxy-lavender': tradingPalette.chart.galaxyLavender,
} as const;

/**
 * Utility function to get CSS variable
 */
export const getCSSVar = (colorName: keyof typeof cssVariables): string => {
  return `var(${colorName})`;
};

/**
 * Trading Status Color Mappings
 */
export const getTradingStatusColor = (status: 'up' | 'down' | 'neutral' | 'alert' | 'social') => {
  const colorMap = {
    up: tradingPalette.trading.bullish,
    down: tradingPalette.trading.bearish,
    neutral: tradingPalette.trading.neutral,
    alert: tradingPalette.trading.warning,
    social: tradingPalette.trading.social,
  };
  
  return colorMap[status];
};

/**
 * Gradient Definitions
 */
export const gradients = {
  primary: `linear-gradient(135deg, ${tradingPalette.primary.mochaMousse} 0%, ${tradingPalette.primary.deepOceanBlue} 50%, ${tradingPalette.chart.galaxyLavender} 100%)`,
  trading: `linear-gradient(135deg, ${tradingPalette.accent.verdantGreen} 0%, ${tradingPalette.primary.mochaMousse} 100%)`,
  dashboard: `linear-gradient(145deg, ${tradingPalette.primary.softCream} 0%, rgba(164, 120, 100, 0.1) 100%)`,
  chartAnalytics: `linear-gradient(180deg, ${tradingPalette.chart.galaxyBlue} 0%, ${tradingPalette.chart.digitalLavender} 100%)`,
} as const;

/**
 * Color with opacity utility
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Professional color schemes for different contexts
 */
export const colorSchemes = {
  dashboard: {
    background: tradingPalette.primary.softCream,
    card: '#ffffff',
    text: tradingPalette.primary.deepOceanBlue,
    accent: tradingPalette.primary.mochaMousse,
  },
  navigation: {
    background: tradingPalette.primary.deepOceanBlue,
    text: tradingPalette.primary.softCream,
    accent: tradingPalette.primary.mochaMousse,
    hover: withOpacity('#ffffff', 0.1),
  },
  trading: {
    positive: tradingPalette.accent.verdantGreen,
    negative: tradingPalette.accent.garnet,
    neutral: tradingPalette.chart.galaxyLavender,
    alert: tradingPalette.accent.neonYellow,
    social: tradingPalette.accent.coral,
  }
} as const;
