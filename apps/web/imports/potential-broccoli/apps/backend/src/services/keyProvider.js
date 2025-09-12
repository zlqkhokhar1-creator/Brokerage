/**
 * KeyProvider Interface and Implementation
 * Provides key material management and rotation abstraction
 * Phase 1b of Epic #34 - Security & Identity Foundation
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { logger, logSecurityEvent } = require('../utils/logger');

/**
 * Base KeyProvider interface
 */
class KeyProvider {
  /**
   * Get the active signing key for JWT tokens
   * @returns {Promise<{keyId: string, key: string, algorithm: string}>}
   */
  async getActiveSigningKey() {
    throw new Error('Method not implemented');
  }

  /**
   * Get a specific key by ID for verification
   * @param {string} keyId - The key identifier
   * @returns {Promise<{keyId: string, key: string, algorithm: string}|null>}
   */
  async getKeyById(keyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Rotate keys - generate new active key and mark current as backup
   * @returns {Promise<{newKeyId: string, previousKeyId: string}>}
   */
  async rotateKeys() {
    throw new Error('Method not implemented');
  }

  /**
   * Get all valid keys (active + backup keys for verification)
   * @returns {Promise<Array<{keyId: string, key: string, algorithm: string, status: string}>>}
   */
  async getAllValidKeys() {
    throw new Error('Method not implemented');
  }

  /**
   * Generate a new key pair
   * @returns {Promise<{keyId: string, key: string, algorithm: string}>}
   */
  async generateKey() {
    throw new Error('Method not implemented');
  }
}

/**
 * Environment-based KeyProvider Implementation
 * Supports both static keys (backward compatibility) and managed keys
 */
class EnvironmentKeyProvider extends KeyProvider {
  constructor() {
    super();
    this.keys = new Map();
    this.activeKeyId = null;
    this.keyRotationInterval = parseInt(process.env.KEY_ROTATION_INTERVAL_HOURS) || 24; // 24 hours default
    this.initialized = false;
    this.rotationInProgress = false; // Mutex for rotation operations
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check if we have managed keys enabled
      if (process.env.USE_MANAGED_KEYS === 'true') {
        await this.initializeManagedKeys();
      } else {
        // Backward compatibility - use static JWT_SECRET
        await this.initializeStaticKey();
      }

      this.initialized = true;
      logger.info('KeyProvider initialized successfully', {
        mode: process.env.USE_MANAGED_KEYS === 'true' ? 'managed' : 'static',
        activeKeyId: this.activeKeyId
      });
    } catch (error) {
      logger.error('Failed to initialize KeyProvider', { error: error.message });
      throw error;
    }
  }

  async initializeStaticKey() {
    const staticSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    const keyId = 'static-key-' + crypto.createHash('sha256').update(staticSecret).digest('hex').substring(0, 8);
    
    this.keys.set(keyId, {
      keyId,
      key: staticSecret,
      algorithm: 'HS256',
      status: 'active',
      createdAt: new Date(),
      rotatedAt: null
    });
    
    this.activeKeyId = keyId;
    
    logSecurityEvent('KEY_PROVIDER_STATIC_INITIALIZED', { keyId });
  }

  async initializeManagedKeys() {
    // Try to load existing keys from storage
    const keysLoaded = await this.loadKeysFromStorage();
    
    if (!keysLoaded || this.keys.size === 0) {
      // Generate initial key pair
      const newKey = await this.generateKey();
      this.activeKeyId = newKey.keyId;
      await this.saveKeysToStorage();
      
      logSecurityEvent('KEY_PROVIDER_MANAGED_INITIALIZED', { 
        keyId: newKey.keyId,
        generated: true 
      });
    } else {
      // Find active key
      for (const [keyId, keyData] of this.keys.entries()) {
        if (keyData.status === 'active') {
          this.activeKeyId = keyId;
          break;
        }
      }
      
      logSecurityEvent('KEY_PROVIDER_MANAGED_LOADED', { 
        keyCount: this.keys.size,
        activeKeyId: this.activeKeyId 
      });
    }

    // Check if key rotation is needed
    if (this.shouldRotateKey()) {
      await this.rotateKeys();
    }
  }

  async getActiveSigningKey() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.activeKeyId || !this.keys.has(this.activeKeyId)) {
      throw new Error('No active signing key available');
    }

    const keyData = this.keys.get(this.activeKeyId);
    return {
      keyId: keyData.keyId,
      key: keyData.key,
      algorithm: keyData.algorithm
    };
  }

  async getKeyById(keyId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.keys.has(keyId)) {
      return null;
    }

    const keyData = this.keys.get(keyId);
    return {
      keyId: keyData.keyId,
      key: keyData.key,
      algorithm: keyData.algorithm
    };
  }

  async getAllValidKeys() {
    if (!this.initialized) {
      await this.initialize();
    }

    const validKeys = [];
    for (const keyData of this.keys.values()) {
      if (keyData.status === 'active' || keyData.status === 'backup') {
        validKeys.push({
          keyId: keyData.keyId,
          key: keyData.key,
          algorithm: keyData.algorithm,
          status: keyData.status
        });
      }
    }

    return validKeys;
  }

  async generateKey() {
    const keyId = 'key-' + crypto.randomUUID();
    const key = crypto.randomBytes(64).toString('base64'); // 512-bit key
    
    const keyData = {
      keyId,
      key,
      algorithm: 'HS256',
      status: 'generated', // Will be promoted when needed
      createdAt: new Date(),
      rotatedAt: null
    };

    this.keys.set(keyId, keyData);
    
    logSecurityEvent('KEY_GENERATED', { keyId });
    
    return {
      keyId,
      key,
      algorithm: 'HS256'
    };
  }

  async rotateKeys() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Prevent concurrent rotation
    if (this.rotationInProgress) {
      throw new Error('Key rotation already in progress');
    }

    this.rotationInProgress = true;

    try {
      const previousKeyId = this.activeKeyId;
      
      // Generate new active key
      const newKey = await this.generateKey();
      
      // Mark previous key as backup (if exists)
      if (previousKeyId && this.keys.has(previousKeyId)) {
        const previousKeyData = this.keys.get(previousKeyId);
        previousKeyData.status = 'backup';
        previousKeyData.rotatedAt = new Date();
      }
      
      // Set new key as active
      const newKeyData = this.keys.get(newKey.keyId);
      newKeyData.status = 'active';
      this.activeKeyId = newKey.keyId;
      
      // Clean up old backup keys (keep only last 3 backup keys)
      await this.cleanupOldKeys();
      
      // Save to storage if managed keys are enabled
      if (process.env.USE_MANAGED_KEYS === 'true') {
        await this.saveKeysToStorage();
      }
      
      logSecurityEvent('KEYS_ROTATED', { 
        newKeyId: newKey.keyId, 
        previousKeyId: previousKeyId || 'none',
        totalKeys: this.keys.size
      });

      return {
        newKeyId: newKey.keyId,
        previousKeyId: previousKeyId || null
      };
    } finally {
      this.rotationInProgress = false;
    }
  }

  shouldRotateKey() {
    if (!this.activeKeyId || !this.keys.has(this.activeKeyId)) {
      return true;
    }

    const keyData = this.keys.get(this.activeKeyId);
    const keyAge = Date.now() - keyData.createdAt.getTime();
    const maxAge = this.keyRotationInterval * 60 * 60 * 1000; // Convert hours to milliseconds
    
    return keyAge > maxAge;
  }

  async cleanupOldKeys() {
    const backupKeys = Array.from(this.keys.entries())
      .filter(([_, keyData]) => keyData.status === 'backup')
      .sort(([_, a], [__, b]) => b.rotatedAt - a.rotatedAt);
    
    // Keep only the 3 most recent backup keys
    const keysToRemove = backupKeys.slice(3);
    
    for (const [keyId] of keysToRemove) {
      this.keys.delete(keyId);
      logSecurityEvent('OLD_KEY_REMOVED', { keyId });
    }
  }

  async saveKeysToStorage() {
    try {
      const keyStoragePath = path.join(__dirname, '../..', '.keys');
      await fs.mkdir(path.dirname(keyStoragePath), { recursive: true });
      
      const keysData = {
        activeKeyId: this.activeKeyId,
        keys: Object.fromEntries(
          Array.from(this.keys.entries()).map(([keyId, keyData]) => [
            keyId,
            {
              ...keyData,
              createdAt: keyData.createdAt.toISOString(),
              rotatedAt: keyData.rotatedAt ? keyData.rotatedAt.toISOString() : null
            }
          ])
        ),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(keyStoragePath, JSON.stringify(keysData, null, 2));
      
    } catch (error) {
      logger.error('Failed to save keys to storage', { error: error.message });
      // Don't throw - this is not critical for operation
    }
  }

  async loadKeysFromStorage() {
    try {
      const keyStoragePath = path.join(__dirname, '../..', '.keys');
      const data = await fs.readFile(keyStoragePath, 'utf8');
      const keysData = JSON.parse(data);
      
      this.activeKeyId = keysData.activeKeyId;
      this.keys.clear();
      
      for (const [keyId, keyData] of Object.entries(keysData.keys)) {
        this.keys.set(keyId, {
          ...keyData,
          createdAt: new Date(keyData.createdAt),
          rotatedAt: keyData.rotatedAt ? new Date(keyData.rotatedAt) : null
        });
      }
      
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load keys from storage', { error: error.message });
      }
      return false;
    }
  }
}

/**
 * Local Development KeyProvider
 * Generates ephemeral keys for development use
 */
class LocalDevelopmentKeyProvider extends EnvironmentKeyProvider {
  constructor() {
    super();
    this.keyRotationInterval = 1; // 1 hour for development
  }

  async initialize() {
    // Always generate fresh keys for development
    const newKey = await this.generateKey();
    const keyData = this.keys.get(newKey.keyId);
    keyData.status = 'active';
    this.activeKeyId = newKey.keyId;
    this.initialized = true;
    
    logger.info('Local Development KeyProvider initialized with ephemeral key', {
      keyId: newKey.keyId
    });
  }
}

// Factory function to create the appropriate KeyProvider
function createKeyProvider() {
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'development' && process.env.USE_LOCAL_DEV_KEYS === 'true') {
    return new LocalDevelopmentKeyProvider();
  }
  
  return new EnvironmentKeyProvider();
}

// Singleton instance
let keyProviderInstance = null;

function getKeyProvider() {
  if (!keyProviderInstance) {
    keyProviderInstance = createKeyProvider();
  }
  return keyProviderInstance;
}

module.exports = {
  KeyProvider,
  EnvironmentKeyProvider,
  LocalDevelopmentKeyProvider,
  getKeyProvider,
  createKeyProvider
};