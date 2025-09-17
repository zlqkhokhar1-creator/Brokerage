/**
 * Security Phase 2 - TypeScript Interface Definitions
 * 
 * These interfaces define the contracts for Phase 2 security components.
 * They are currently unused to avoid impacting existing tests and runtime behavior.
 * 
 * TODO: Implement these interfaces according to docs/security/PHASE2_PLAN.md
 * Feature Flag: PHASE2_* flags in src/config/security.js
 */

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "External KMS Integration Strategy"

/**
 * Key Management Provider abstraction interface
 * Supports multiple KMS providers (AWS KMS, Azure Key Vault, HashiCorp Vault)
 */
export interface KeyManagementProvider {
  /**
   * List available keys with optional filtering
   * @param filters Optional filtering criteria
   * @returns Promise resolving to array of key metadata
   */
  listKeys(filters?: KeyFilter): Promise<Key[]>;
  
  /**
   * Fetch the currently active key for a given key ID
   * @param keyId Unique identifier for the key
   * @returns Promise resolving to key with material
   */
  fetchActiveKey(keyId: string): Promise<Key>;
  
  /**
   * Schedule automatic key rotation according to policy
   * @param keyId Key to rotate
   * @param rotationPolicy Rotation schedule and parameters
   * @returns Promise resolving to rotation job details
   */
  scheduleRotation(keyId: string, rotationPolicy: RotationPolicy): Promise<RotationJob>;
  
  /**
   * Deferred: Cryptographic operations may be added in Phase 2b/3
   * Depends on requirements for server-side signing vs client-side
   */
  // sign?(keyId: string, data: Buffer): Promise<Signature>;
  // encrypt?(keyId: string, plaintext: Buffer): Promise<EncryptedData>;
}

/**
 * Key metadata and material representation
 */
export interface Key {
  readonly id: string;
  readonly version: number;
  readonly status: KeyStatus;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly algorithm: CryptoAlgorithm;
  readonly keyMaterial?: Buffer; // Only present for active keys
  readonly metadata: KeyMetadata;
}

/**
 * Key filtering criteria for listKeys operation
 */
export interface KeyFilter {
  status?: KeyStatus[];
  algorithm?: CryptoAlgorithm[];
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: Record<string, string>;
}

/**
 * Key rotation policy configuration
 */
export interface RotationPolicy {
  schedule: string; // Cron expression
  dualValidationPeriod: string; // Duration (e.g., "7d")
  gracePeriod: string; // Duration (e.g., "48h")
  notificationChannels: string[];
  autoPromote: boolean;
}

/**
 * Key rotation job tracking
 */
export interface RotationJob {
  readonly id: string;
  readonly keyId: string;
  readonly status: RotationStatus;
  readonly scheduledAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly phases: RotationPhase[];
  readonly errors?: string[];
}

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "RBAC Model Proposal"

/**
 * Authorization Policy Evaluator interface
 * Implements the three-tier RBAC model (Roles -> Permissions -> Resources)
 */
export interface AuthorizationPolicyEvaluator {
  /**
   * Evaluate access request against policies
   * @param principal User, role, or service making the request
   * @param action The action being attempted (e.g., "portfolio:read")
   * @param resource The resource being accessed (e.g., "portfolio:123")
   * @param context Additional context (time, IP, MFA status, etc.)
   * @returns Promise resolving to authorization decision
   */
  evaluate(
    principal: Principal, 
    action: string, 
    resource: string, 
    context?: AuthorizationContext
  ): Promise<AuthorizationDecision>;
  
  /**
   * Bulk evaluation for performance optimization
   * @param requests Array of authorization requests
   * @returns Promise resolving to array of decisions (same order)
   */
  evaluateBatch(requests: AuthorizationRequest[]): Promise<AuthorizationDecision[]>;
  
  /**
   * Invalidate cached decisions for a principal
   * @param principal The principal whose cache should be cleared
   */
  invalidateCache(principal: Principal): Promise<void>;
}

/**
 * Principal (user, role, or service) making authorization request
 */
export interface Principal {
  readonly id: string;
  readonly type: PrincipalType;
  readonly roles: string[];
  readonly attributes: Record<string, any>;
}

/**
 * Authorization request structure
 */
export interface AuthorizationRequest {
  readonly principal: Principal;
  readonly action: string;
  readonly resource: string;
  readonly context?: AuthorizationContext;
}

/**
 * Context information for authorization decisions
 */
export interface AuthorizationContext {
  readonly timestamp: Date;
  readonly sourceIp?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly mfaVerified?: boolean;
  readonly riskScore?: number;
  readonly geolocation?: Coordinates;
}

/**
 * Authorization decision result
 */
export interface AuthorizationDecision {
  readonly result: AuthorizationResult;
  readonly reason?: string;
  readonly appliedPolicies: string[];
  readonly evaluationTime: number; // milliseconds
  readonly cached: boolean;
}

// TODO: Reference docs/security/PHASE2_PLAN.md Section: "Token Model Evolution"

/**
 * Refresh Token Store abstraction
 * Manages long-lived refresh tokens with secure storage and revocation
 */
export interface RefreshTokenStore {
  /**
   * Issue a new refresh token for a user session
   * @param userId The user identifier
   * @param sessionId The session identifier
   * @param metadata Additional token metadata
   * @returns Promise resolving to refresh token details
   */
  issue(userId: string, sessionId: string, metadata?: TokenMetadata): Promise<RefreshToken>;
  
  /**
   * Validate and consume a refresh token (one-time use)
   * @param tokenId The refresh token identifier
   * @param rotateToken Whether to issue a new token (default: true)
   * @returns Promise resolving to validation result and new token if rotated
   */
  validate(tokenId: string, rotateToken?: boolean): Promise<RefreshTokenValidation>;
  
  /**
   * Revoke a specific refresh token
   * @param tokenId The token to revoke
   * @param reason Reason for revocation (for audit logging)
   */
  revoke(tokenId: string, reason: RevocationReason): Promise<void>;
  
  /**
   * Revoke all refresh tokens for a user (e.g., password change, logout all)
   * @param userId The user whose tokens should be revoked
   * @param reason Reason for mass revocation
   */
  revokeAllForUser(userId: string, reason: RevocationReason): Promise<number>;
  
  /**
   * Check if a token is revoked (for bloom filter or blacklist lookup)
   * @param tokenId The token to check
   * @returns Promise resolving to revocation status
   */
  isRevoked(tokenId: string): Promise<boolean>;
  
  /**
   * Cleanup expired tokens (maintenance operation)
   * @param beforeDate Remove tokens expired before this date
   * @returns Promise resolving to number of tokens cleaned up
   */
  cleanup(beforeDate?: Date): Promise<number>;
}

/**
 * Refresh token representation
 */
export interface RefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastUsedAt?: Date;
  readonly metadata: TokenMetadata;
}

/**
 * Refresh token validation result
 */
export interface RefreshTokenValidation {
  readonly valid: boolean;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly newToken?: RefreshToken; // Present if token was rotated
  readonly reason?: string; // Present if invalid
}

/**
 * Token metadata for audit and tracking
 */
export interface TokenMetadata {
  readonly userAgent?: string;
  readonly sourceIp?: string;
  readonly geolocation?: Coordinates;
  readonly deviceFingerprint?: string;
  readonly grantedScopes?: string[];
}

// Supporting types and enums

export enum KeyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ROTATING = 'rotating',
  DEPRECATED = 'deprecated',
  REVOKED = 'revoked'
}

export enum CryptoAlgorithm {
  RSA_2048 = 'rsa-2048',
  RSA_4096 = 'rsa-4096',
  ECDSA_P256 = 'ecdsa-p256',
  ECDSA_P384 = 'ecdsa-p384',
  AES_256_GCM = 'aes-256-gcm'
}

export interface KeyMetadata {
  readonly purpose: KeyPurpose;
  readonly environment: string;
  readonly tags: Record<string, string>;
}

export enum KeyPurpose {
  JWT_SIGNING = 'jwt-signing',
  DATA_ENCRYPTION = 'data-encryption',
  TLS_CERTIFICATE = 'tls-certificate'
}

export enum RotationStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface RotationPhase {
  readonly name: string;
  readonly status: PhaseStatus;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly error?: string;
}

export enum PhaseStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum PrincipalType {
  USER = 'user',
  SERVICE = 'service',
  ROLE = 'role'
}

export enum AuthorizationResult {
  ALLOW = 'allow',
  DENY = 'deny',
  ABSTAIN = 'abstain' // No applicable policy
}

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export enum RevocationReason {
  USER_REQUEST = 'user_request',
  SECURITY_INCIDENT = 'security_incident',
  PASSWORD_CHANGE = 'password_change',
  ADMIN_ACTION = 'admin_action',
  TOKEN_COMPROMISE = 'token_compromise',
  EXPIRED_CLEANUP = 'expired_cleanup'
}