/**
 * Security Configuration for Phase 2 Planning
 * Contains placeholder configurations for KMS, RBAC, and audit logging
 * TODO: Implement according to docs/security/PHASE2_PLAN.md
 */

// Phase 2 Security Configuration Stubs
// TODO: Reference docs/security/PHASE2_PLAN.md Section: "External KMS Integration Strategy"
const kmsConfig = {
  // External KMS integration endpoints (Phase 2 placeholder)
  KMS_ENDPOINT: process.env.KMS_ENDPOINT || null, // TODO: Configure KMS provider endpoint
  KMS_TIMEOUT_MS: parseInt(process.env.KMS_TIMEOUT_MS) || 5000, // TODO: Adjust based on provider SLA
  KMS_PROVIDER: process.env.KMS_PROVIDER || 'local', // Options: aws|azure|vault|local
  KMS_REGION: process.env.KMS_REGION || 'us-east-1',
  
  // Key rotation configuration (Phase 2)
  // TODO: Implement according to "Automated Key Rotation Workflow" section
  KEY_ROTATION_SCHEDULE: process.env.KEY_ROTATION_SCHEDULE || '0 2 * * 0', // Weekly Sunday 2 AM
  DUAL_VALIDATION_PERIOD: process.env.DUAL_VALIDATION_PERIOD || '7d',
  GRACE_PERIOD: process.env.GRACE_PERIOD || '48h',
  
  // Caching and failover (Phase 2)
  KMS_CACHE_TTL: parseInt(process.env.KMS_CACHE_TTL) || 300, // 5 minutes
  KMS_FALLBACK_ENABLED: process.env.KMS_FALLBACK_ENABLED === 'true' || true
};

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "RBAC Model Proposal"
const rbacConfig = {
  // RBAC policy source configuration (Phase 2 placeholder)
  RBAC_POLICY_SOURCE: process.env.RBAC_POLICY_SOURCE || 'database', // Options: database|file|external
  RBAC_CACHE_TTL: parseInt(process.env.RBAC_CACHE_TTL) || 300, // 5 minutes
  RBAC_CACHE_SIZE: parseInt(process.env.RBAC_CACHE_SIZE) || 1000, // LRU cache size
  
  // Policy evaluation settings (Phase 2)
  RBAC_EVALUATION_TIMEOUT: parseInt(process.env.RBAC_EVALUATION_TIMEOUT) || 1000, // 1 second
  RBAC_DEFAULT_DENY: process.env.RBAC_DEFAULT_DENY !== 'false', // Default to deny
  
  // Conditions support (Phase 2)
  RBAC_TIME_CONDITIONS: process.env.RBAC_TIME_CONDITIONS === 'true' || false,
  RBAC_IP_CONDITIONS: process.env.RBAC_IP_CONDITIONS === 'true' || false,
  RBAC_MFA_CONDITIONS: process.env.RBAC_MFA_CONDITIONS === 'true' || false
};

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "Token Model Evolution"
const tokenConfig = {
  // Enhanced token configuration (Phase 2)
  REFRESH_TOKEN_ENABLED: process.env.REFRESH_TOKEN_ENABLED === 'true' || false, // TODO: Enable in Phase 2
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',
  REFRESH_TOKEN_ROTATION: process.env.REFRESH_TOKEN_ROTATION === 'true' || false,
  
  // Token revocation strategy (Phase 2)
  TOKEN_REVOCATION_STRATEGY: process.env.TOKEN_REVOCATION_STRATEGY || 'bloom_filter', // bloom_filter|persistent
  BLOOM_FILTER_SIZE: parseInt(process.env.BLOOM_FILTER_SIZE) || 100000, // Support ~100k revoked tokens
  BLOOM_FILTER_FALSE_POSITIVE_RATE: parseFloat(process.env.BLOOM_FILTER_FALSE_POSITIVE_RATE) || 0.001,
  
  // Token validation settings
  TOKEN_CLOCK_SKEW_TOLERANCE: parseInt(process.env.TOKEN_CLOCK_SKEW_TOLERANCE) || 300 // 5 minutes
};

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "Service-to-Service Authentication"
const serviceAuthConfig = {
  // Service-to-service authentication (Phase 2 placeholder)
  SERVICE_AUTH_METHOD: process.env.SERVICE_AUTH_METHOD || 'shared_secret', // shared_secret|jwt|mtls
  SERVICE_JWT_ISSUER: process.env.SERVICE_JWT_ISSUER || 'https://investpro.internal/auth',
  SERVICE_JWT_TTL: process.env.SERVICE_JWT_TTL || '1h',
  
  // mTLS configuration (Phase 2b)
  MTLS_ENABLED: process.env.MTLS_ENABLED === 'true' || false,
  MTLS_CA_CERT_PATH: process.env.MTLS_CA_CERT_PATH || null,
  MTLS_CLIENT_CERT_PATH: process.env.MTLS_CLIENT_CERT_PATH || null,
  MTLS_CLIENT_KEY_PATH: process.env.MTLS_CLIENT_KEY_PATH || null
};

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "Audit & Security Event Logging"
const auditConfig = {
  // Enhanced audit logging (Phase 2)
  AUDIT_LOG_ENABLED: process.env.AUDIT_LOG_ENABLED !== 'false', // Default enabled
  AUDIT_LOG_LEVEL: process.env.AUDIT_LOG_LEVEL || 'INFO', // DEBUG|INFO|WARN|ERROR|CRITICAL
  AUDIT_RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS) || 2555, // ~7 years for compliance
  
  // Event taxonomy configuration
  AUDIT_PII_MINIMIZATION: process.env.AUDIT_PII_MINIMIZATION === 'true' || true,
  AUDIT_GEOLOCATION_TRACKING: process.env.AUDIT_GEOLOCATION_TRACKING === 'true' || false,
  AUDIT_DEVICE_FINGERPRINTING: process.env.AUDIT_DEVICE_FINGERPRINTING === 'true' || false,
  
  // Storage and performance
  AUDIT_BATCH_SIZE: parseInt(process.env.AUDIT_BATCH_SIZE) || 100,
  AUDIT_FLUSH_INTERVAL_MS: parseInt(process.env.AUDIT_FLUSH_INTERVAL_MS) || 5000 // 5 seconds
};

// Feature flags for Phase 2 components (prevents impact on existing tests)
const featureFlags = {
  // TODO: Enable these flags as Phase 2 components are implemented
  PHASE2_KMS_INTEGRATION: process.env.PHASE2_KMS_INTEGRATION === 'true' || false,
  PHASE2_RBAC_ENGINE: process.env.PHASE2_RBAC_ENGINE === 'true' || false,
  PHASE2_REFRESH_TOKENS: process.env.PHASE2_REFRESH_TOKENS === 'true' || false,
  PHASE2_SERVICE_AUTH: process.env.PHASE2_SERVICE_AUTH === 'true' || false,
  PHASE2_ENHANCED_AUDIT: process.env.PHASE2_ENHANCED_AUDIT === 'true' || false
};

module.exports = {
  kmsConfig,
  rbacConfig,
  tokenConfig,
  serviceAuthConfig,
  auditConfig,
  featureFlags
};