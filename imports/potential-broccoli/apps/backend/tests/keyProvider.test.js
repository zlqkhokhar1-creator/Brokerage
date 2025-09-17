/**
 * KeyProvider Tests - Including Negative Path Tests
 * Phase 1b of Epic #34 - Security & Identity Foundation
 */

const {
  KeyProvider,
  EnvironmentKeyProvider,
  LocalDevelopmentKeyProvider,
  createKeyProvider,
  getKeyProvider
} = require('../src/services/keyProvider');

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Mock logger to avoid console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  logSecurityEvent: jest.fn()
}));

describe('KeyProvider Interface', () => {
  describe('Base KeyProvider class', () => {
    it('should throw error for unimplemented methods', async () => {
      const provider = new KeyProvider();
      
      await expect(provider.getActiveSigningKey()).rejects.toThrow('Method not implemented');
      await expect(provider.getKeyById('test')).rejects.toThrow('Method not implemented');
      await expect(provider.rotateKeys()).rejects.toThrow('Method not implemented');
      await expect(provider.getAllValidKeys()).rejects.toThrow('Method not implemented');
      await expect(provider.generateKey()).rejects.toThrow('Method not implemented');
    });
  });
});

describe('EnvironmentKeyProvider', () => {
  let provider;
  
  beforeEach(() => {
    // Reset environment variables
    delete process.env.USE_MANAGED_KEYS;
    delete process.env.JWT_SECRET;
    delete process.env.KEY_ROTATION_INTERVAL_HOURS;
    
    // Create fresh provider for each test
    provider = new EnvironmentKeyProvider();
  });

  afterEach(async () => {
    // Clean up any key files created during tests
    try {
      await fs.unlink(path.join(__dirname, '../../.keys'));
    } catch (error) {
      // File might not exist, that's okay
    }
  });

  describe('Static Key Mode (Backward Compatibility)', () => {
    it('should initialize with static JWT_SECRET', async () => {
      process.env.JWT_SECRET = 'test-secret-123';
      
      await provider.initialize();
      
      const activeKey = await provider.getActiveSigningKey();
      expect(activeKey).toBeDefined();
      expect(activeKey.algorithm).toBe('HS256');
      expect(activeKey.keyId).toMatch(/^static-key-/);
      expect(activeKey.key).toBe('test-secret-123');
    });

    it('should use default JWT_SECRET when not provided', async () => {
      await provider.initialize();
      
      const activeKey = await provider.getActiveSigningKey();
      expect(activeKey.key).toBe('your-super-secret-jwt-key-change-in-production');
    });

    it('should handle multiple calls to initialize gracefully', async () => {
      await provider.initialize();
      const firstKey = await provider.getActiveSigningKey();
      
      await provider.initialize(); // Second call should be ignored
      const secondKey = await provider.getActiveSigningKey();
      
      expect(firstKey.keyId).toBe(secondKey.keyId);
    });
  });

  describe('Managed Keys Mode', () => {
    beforeEach(() => {
      process.env.USE_MANAGED_KEYS = 'true';
      process.env.KEY_ROTATION_INTERVAL_HOURS = '1';
    });

    it('should generate new keys when no existing keys found', async () => {
      await provider.initialize();
      
      const activeKey = await provider.getActiveSigningKey();
      expect(activeKey).toBeDefined();
      expect(activeKey.keyId).toMatch(/^key-/);
      expect(activeKey.algorithm).toBe('HS256');
      expect(activeKey.key).toBeDefined();
      expect(activeKey.key.length).toBeGreaterThan(0);
    });

    it('should rotate keys successfully', async () => {
      await provider.initialize();
      const originalKey = await provider.getActiveSigningKey();
      
      const rotationResult = await provider.rotateKeys();
      
      expect(rotationResult.newKeyId).toBeDefined();
      expect(rotationResult.previousKeyId).toBe(originalKey.keyId);
      
      const newActiveKey = await provider.getActiveSigningKey();
      expect(newActiveKey.keyId).toBe(rotationResult.newKeyId);
      expect(newActiveKey.keyId).not.toBe(originalKey.keyId);
    });

    it('should maintain backup keys after rotation', async () => {
      // Clean up any existing keys first
      try {
        await fs.unlink(path.join(__dirname, '../../.keys'));
      } catch (error) {
        // File might not exist
      }
      
      // Ensure clean state for managed keys mode
      process.env.USE_MANAGED_KEYS = 'true';
      const freshProvider = new EnvironmentKeyProvider();
      
      await freshProvider.initialize();
      const originalKey = await freshProvider.getActiveSigningKey();
      
      await freshProvider.rotateKeys();
      
      const allKeys = await freshProvider.getAllValidKeys();
      
      // Should have one active key and the original key as backup
      const activeKeys = allKeys.filter(key => key.status === 'active');
      const backupKeys = allKeys.filter(key => key.status === 'backup');
      
      expect(activeKeys.length).toBe(1);
      expect(backupKeys.length).toBeGreaterThanOrEqual(1);
      
      // The original key should be among the backup keys
      const originalKeyAsBackup = backupKeys.find(key => key.keyId === originalKey.keyId);
      expect(originalKeyAsBackup).toBeDefined();
      expect(originalKeyAsBackup.keyId).toBe(originalKey.keyId);
    });

    it('should retrieve specific key by ID', async () => {
      await provider.initialize();
      const activeKey = await provider.getActiveSigningKey();
      
      const retrievedKey = await provider.getKeyById(activeKey.keyId);
      expect(retrievedKey).toBeDefined();
      expect(retrievedKey.keyId).toBe(activeKey.keyId);
      expect(retrievedKey.key).toBe(activeKey.key);
    });

    it('should return null for non-existent key ID', async () => {
      await provider.initialize();
      
      const retrievedKey = await provider.getKeyById('non-existent-key');
      expect(retrievedKey).toBeNull();
    });

    it('should clean up old backup keys', async () => {
      await provider.initialize();
      
      // Perform multiple rotations to generate many backup keys
      for (let i = 0; i < 5; i++) {
        await provider.rotateKeys();
      }
      
      const allKeys = await provider.getAllValidKeys();
      const backupKeys = allKeys.filter(key => key.status === 'backup');
      
      // Should keep only 3 most recent backup keys
      expect(backupKeys.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Negative Path Tests', () => {
    describe('File System Failures', () => {
      beforeEach(() => {
        process.env.USE_MANAGED_KEYS = 'true';
      });

      it('should handle file system write failures gracefully', async () => {
        // Mock fs.writeFile to fail
        const originalWriteFile = fs.writeFile;
        fs.writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));
        
        try {
          await provider.initialize();
          // Should still work even if saving to storage fails
          const activeKey = await provider.getActiveSigningKey();
          expect(activeKey).toBeDefined();
        } finally {
          fs.writeFile = originalWriteFile;
        }
      });

      it('should handle corrupted key storage file', async () => {
        // Create corrupted key file
        const keyPath = path.join(__dirname, '../../.keys');
        await fs.writeFile(keyPath, 'invalid-json-content');
        
        // Should initialize with new keys instead of crashing
        await expect(provider.initialize()).resolves.not.toThrow();
        
        const activeKey = await provider.getActiveSigningKey();
        expect(activeKey).toBeDefined();
      });

      it('should handle missing directory for key storage', async () => {
        // Mock fs.mkdir to fail
        const originalMkdir = fs.mkdir;
        fs.mkdir = jest.fn().mockRejectedValue(new Error('Cannot create directory'));
        
        try {
          await provider.initialize();
          // Should still work even if directory creation fails
          const activeKey = await provider.getActiveSigningKey();
          expect(activeKey).toBeDefined();
        } finally {
          fs.mkdir = originalMkdir;
        }
      });
    });

    describe('Key Access Failures', () => {
      it('should throw error when accessing keys before initialization', async () => {
        // Create a fresh provider that shouldn't auto-initialize
        const freshProvider = new EnvironmentKeyProvider();
        freshProvider.initialize = jest.fn(); // Mock to prevent auto-initialization
        
        await expect(freshProvider.getActiveSigningKey()).rejects.toThrow();
      });

      it('should handle missing active key gracefully', async () => {
        await provider.initialize();
        
        // Manually corrupt the provider state
        provider.activeKeyId = 'non-existent-key';
        
        await expect(provider.getActiveSigningKey()).rejects.toThrow('No active signing key available');
      });

      it('should handle null/undefined key ID requests', async () => {
        await provider.initialize();
        
        const result1 = await provider.getKeyById(null);
        const result2 = await provider.getKeyById(undefined);
        const result3 = await provider.getKeyById('');
        
        expect(result1).toBeNull();
        expect(result2).toBeNull();
        expect(result3).toBeNull();
      });
    });

    describe('Environment Variable Corruption', () => {
      it('should handle invalid rotation interval', async () => {
        process.env.USE_MANAGED_KEYS = 'true';
        process.env.KEY_ROTATION_INTERVAL_HOURS = 'invalid-number';
        
        await provider.initialize();
        
        // Should use default interval (24 hours)
        expect(provider.keyRotationInterval).toBe(24);
      });

      it('should handle negative rotation interval', async () => {
        process.env.USE_MANAGED_KEYS = 'true';
        process.env.KEY_ROTATION_INTERVAL_HOURS = '-5';
        
        await provider.initialize();
        
        // Should use default interval since -5 is invalid
        expect(provider.keyRotationInterval).toBe(24);
      });
    });

    describe('Concurrent Access', () => {
      it('should handle concurrent initialization calls', async () => {
        const promises = [
          provider.initialize(),
          provider.initialize(),
          provider.initialize()
        ];
        
        await Promise.all(promises);
        
        const activeKey = await provider.getActiveSigningKey();
        expect(activeKey).toBeDefined();
      });

      it('should handle concurrent key rotation', async () => {
        process.env.USE_MANAGED_KEYS = 'true';
        await provider.initialize();
        
        const promises = [
          provider.rotateKeys(),
          provider.rotateKeys()
        ];
        
        // One should succeed, one should fail due to mutex
        const results = await Promise.allSettled(promises);
        
        const succeeded = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        
        // Expect one success and one failure (due to rotation mutex)
        expect(succeeded).toBe(1);
        expect(failed).toBe(1);
        
        // The failed one should have the right error message
        const failedResult = results.find(result => result.status === 'rejected');
        expect(failedResult.reason.message).toBe('Key rotation already in progress');
        
        const activeKey = await provider.getActiveSigningKey();
        expect(activeKey).toBeDefined();
      });
    });
  });
});

describe('LocalDevelopmentKeyProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new LocalDevelopmentKeyProvider();
  });

  describe('Development Key Generation', () => {
    it('should generate ephemeral keys for development', async () => {
      await provider.initialize();
      
      const activeKey = await provider.getActiveSigningKey();
      expect(activeKey).toBeDefined();
      expect(activeKey.keyId).toMatch(/^key-/);
      expect(activeKey.algorithm).toBe('HS256');
      expect(provider.keyRotationInterval).toBe(1); // 1 hour for dev
    });

    it('should always generate fresh keys on initialization', async () => {
      await provider.initialize();
      const firstKey = await provider.getActiveSigningKey();
      
      // Create new instance and initialize again
      const newProvider = new LocalDevelopmentKeyProvider();
      await newProvider.initialize();
      const secondKey = await newProvider.getActiveSigningKey();
      
      expect(firstKey.keyId).not.toBe(secondKey.keyId);
    });
  });

  describe('Negative Scenarios', () => {
    it('should handle crypto.randomUUID failures', async () => {
      const originalRandomUUID = crypto.randomUUID;
      crypto.randomUUID = jest.fn().mockImplementation(() => {
        throw new Error('Crypto failure');
      });
      
      try {
        await expect(provider.initialize()).rejects.toThrow();
      } finally {
        crypto.randomUUID = originalRandomUUID;
      }
    });

    it('should handle crypto.randomBytes failures', async () => {
      const originalRandomBytes = crypto.randomBytes;
      crypto.randomBytes = jest.fn().mockImplementation(() => {
        throw new Error('Random bytes failure');
      });
      
      try {
        await expect(provider.initialize()).rejects.toThrow();
      } finally {
        crypto.randomBytes = originalRandomBytes;
      }
    });
  });
});

describe('Factory Functions', () => {
  beforeEach(() => {
    // Reset any cached instance
    jest.resetModules();
  });

  describe('createKeyProvider', () => {
    it('should create LocalDevelopmentKeyProvider in development with flag', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCAL_DEV_KEYS = 'true';
      
      const provider = createKeyProvider();
      expect(provider).toBeInstanceOf(LocalDevelopmentKeyProvider);
    });

    it('should create EnvironmentKeyProvider by default', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.USE_LOCAL_DEV_KEYS;
      
      const provider = createKeyProvider();
      expect(provider).toBeInstanceOf(EnvironmentKeyProvider);
    });

    it('should create EnvironmentKeyProvider in development without flag', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.USE_LOCAL_DEV_KEYS;
      
      const provider = createKeyProvider();
      expect(provider).toBeInstanceOf(EnvironmentKeyProvider);
    });
  });

  describe('getKeyProvider singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const provider1 = getKeyProvider();
      const provider2 = getKeyProvider();
      
      expect(provider1).toBe(provider2);
    });
  });
});

describe('Key Security Properties', () => {
  let provider;

  beforeEach(() => {
    process.env.USE_MANAGED_KEYS = 'true';
    provider = new EnvironmentKeyProvider();
  });

  describe('Key Generation Security', () => {
    it('should generate cryptographically secure keys', async () => {
      await provider.initialize();
      
      const keys = [];
      for (let i = 0; i < 10; i++) {
        const key = await provider.generateKey();
        keys.push(key.key);
      }
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
      
      // Keys should be of proper length (64 bytes -> base64 encoded)
      keys.forEach(key => {
        expect(key.length).toBeGreaterThan(60); // Base64 encoded 64-byte key
      });
    });

    it('should use secure random generation', async () => {
      await provider.initialize();
      
      const key1 = await provider.generateKey();
      const key2 = await provider.generateKey();
      
      // Keys should be different
      expect(key1.keyId).not.toBe(key2.keyId);
      expect(key1.key).not.toBe(key2.key);
      
      // Key IDs should follow UUID format
      expect(key1.keyId).toMatch(/^key-[0-9a-f-]{36}$/);
      expect(key2.keyId).toMatch(/^key-[0-9a-f-]{36}$/);
    });
  });

  describe('Key Rotation Security', () => {
    it('should not leak previous keys during rotation', async () => {
      await provider.initialize();
      const originalKey = await provider.getActiveSigningKey();
      
      const rotationResult = await provider.rotateKeys();
      
      // Previous key should still be accessible for verification
      const previousKey = await provider.getKeyById(rotationResult.previousKeyId);
      expect(previousKey).toBeDefined();
      expect(previousKey.key).toBe(originalKey.key);
      
      // But it should be marked as backup
      const allKeys = await provider.getAllValidKeys();
      const backupKey = allKeys.find(k => k.keyId === rotationResult.previousKeyId);
      expect(backupKey.status).toBe('backup');
    });
  });
});

describe('Integration with AuthService', () => {
  // These tests verify that the KeyProvider integrates properly with the auth system
  
  it('should provide keys in the correct format for JWT', async () => {
    process.env.USE_MANAGED_KEYS = 'true';
    const provider = new EnvironmentKeyProvider();
    await provider.initialize();
    
    const activeKey = await provider.getActiveSigningKey();
    
    expect(activeKey).toHaveProperty('keyId');
    expect(activeKey).toHaveProperty('key');
    expect(activeKey).toHaveProperty('algorithm');
    
    expect(typeof activeKey.keyId).toBe('string');
    expect(typeof activeKey.key).toBe('string');
    expect(activeKey.algorithm).toBe('HS256');
    
    expect(activeKey.keyId.length).toBeGreaterThan(0);
    expect(activeKey.key.length).toBeGreaterThan(0);
  });
});