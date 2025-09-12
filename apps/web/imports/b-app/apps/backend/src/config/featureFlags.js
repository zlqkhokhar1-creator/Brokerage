/**
 * Feature Flags Configuration
 * Centralized feature flag management with environment variable support
 */

// Helper function to parse boolean environment variables
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

// Feature flags with defaults
const featureFlags = {
  // Dual-write flags for safe migration
  FEATURE_DUAL_WRITE_USERS: parseBoolean(process.env.FEATURE_DUAL_WRITE_USERS, false),
  FEATURE_DUAL_WRITE_PAYMENTS: parseBoolean(process.env.FEATURE_DUAL_WRITE_PAYMENTS, false),
  
  // Core functionality flags
  FEATURE_LEDGER_ENABLED: parseBoolean(process.env.FEATURE_LEDGER_ENABLED, false),
  FEATURE_IDEMPOTENCY_ENABLED: parseBoolean(process.env.FEATURE_IDEMPOTENCY_ENABLED, true),
  
  // Authentication enhancements
  FEATURE_ARGON2_ENABLED: parseBoolean(process.env.FEATURE_ARGON2_ENABLED, true),
  FEATURE_REFRESH_TOKENS_ENABLED: parseBoolean(process.env.FEATURE_REFRESH_TOKENS_ENABLED, true),
  
  // Development and debugging flags
  FEATURE_VERBOSE_LOGGING: parseBoolean(process.env.FEATURE_VERBOSE_LOGGING, process.env.NODE_ENV === 'development'),
  FEATURE_DRIFT_VERIFICATION: parseBoolean(process.env.FEATURE_DRIFT_VERIFICATION, true),
};

// Validation: ensure dependent features are correctly configured
function validateFeatureFlags() {
  const warnings = [];
  
  if (featureFlags.FEATURE_DUAL_WRITE_USERS && !featureFlags.FEATURE_ARGON2_ENABLED) {
    warnings.push('FEATURE_DUAL_WRITE_USERS is enabled but FEATURE_ARGON2_ENABLED is disabled');
  }
  
  if (featureFlags.FEATURE_LEDGER_ENABLED && !featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
    warnings.push('FEATURE_LEDGER_ENABLED is enabled but FEATURE_DUAL_WRITE_PAYMENTS is disabled - ledger entries may be incomplete');
  }
  
  return warnings;
}

// Log feature flag status on startup
function logFeatureFlags(logger) {
  const warnings = validateFeatureFlags();
  
  logger.info('Feature flags configuration:', featureFlags);
  
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn('Feature flag warning:', warning));
  }
}

// Export individual flags and utility functions
module.exports = {
  ...featureFlags,
  validateFeatureFlags,
  logFeatureFlags,
  
  // Utility functions for dynamic checks
  isDualWriteEnabled: (entity) => {
    switch (entity) {
      case 'users': return featureFlags.FEATURE_DUAL_WRITE_USERS;
      case 'payments': return featureFlags.FEATURE_DUAL_WRITE_PAYMENTS;
      default: return false;
    }
  },
  
  isFeatureEnabled: (flagName) => {
    return featureFlags[flagName] || false;
  },
  
  // Get all flags (useful for debugging/status endpoints)
  getAllFlags: () => ({ ...featureFlags })
};