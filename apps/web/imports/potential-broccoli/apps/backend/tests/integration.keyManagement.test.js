/**
 * Integration Test - Key Management System
 * Demonstrates end-to-end functionality of Phase 1b enhancements
 */

const jwt = require('jsonwebtoken');
const { AuthService } = require('../src/services/authService');
const { getKeyProvider } = require('../src/services/keyProvider');

// Mock dependencies for integration test
jest.mock('../src/config/database', () => ({
  dbOps: {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    updateLastLogin: jest.fn(),
    insertAuditLog: jest.fn(),
    query: jest.fn()
  },
  transaction: jest.fn((callback) => callback({}))
}));

jest.mock('../src/config/redis', () => ({
  sessionService: {
    createSession: jest.fn().mockResolvedValue({}),
    getSession: jest.fn().mockResolvedValue({ userId: 1 }),
    destroySession: jest.fn().mockResolvedValue({})
  },
  rateLimitService: {
    isRateLimited: jest.fn().mockResolvedValue(false),
    incr: jest.fn()
  },
  cacheService: {
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
    incr: jest.fn()
  }
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  logSecurityEvent: jest.fn(),
  logUserActivity: jest.fn()
}));

const fs = require('fs').promises;
const path = require('path');

describe('Key Management System - Integration Test', () => {
  beforeEach(async () => {
    // Clean up any existing keys
    try {
      await fs.unlink(path.join(__dirname, '../../.keys'));
    } catch (error) {
      // File might not exist
    }
    
    // Reset environment
    delete process.env.USE_MANAGED_KEYS;
    delete process.env.USE_LOCAL_DEV_KEYS;
    
    // Clear any cached instances
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.unlink(path.join(__dirname, '../../.keys'));
    } catch (error) {
      // File might not exist
    }
  });

  describe('Complete Token Lifecycle with Key Rotation', () => {
    it('should demonstrate full key management workflow', async () => {
      // Enable managed keys
      process.env.USE_MANAGED_KEYS = 'true';
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        permissions: ['read', 'write']
      };

      // Step 1: Generate initial tokens
      console.log('🔑 Step 1: Generate initial tokens with KeyProvider');
      const tokens1 = await AuthService.generateTokens(mockUser);
      
      expect(tokens1.accessToken).toBeDefined();
      expect(tokens1.sessionId).toBeDefined();
      
      // Decode token to check keyId
      const decoded1 = jwt.decode(tokens1.accessToken, { complete: true });
      const keyId1 = decoded1.header.kid;
      
      expect(keyId1).toBeDefined();
      console.log(`   ✅ Token generated with keyId: ${keyId1}`);

      // Step 2: Verify KeyProvider has the key
      console.log('🔍 Step 2: Verify key is available in KeyProvider');
      const keyProvider = getKeyProvider();
      await keyProvider.initialize();
      
      const activeKey = await keyProvider.getActiveSigningKey();
      expect(activeKey.keyId).toBe(keyId1);
      console.log(`   ✅ Active key confirmed: ${activeKey.keyId}`);

      // Step 3: Rotate keys
      console.log('🔄 Step 3: Perform key rotation');
      const rotationResult = await keyProvider.rotateKeys();
      
      expect(rotationResult.newKeyId).toBeDefined();
      expect(rotationResult.previousKeyId).toBe(keyId1);
      console.log(`   ✅ Keys rotated: ${rotationResult.previousKeyId} → ${rotationResult.newKeyId}`);

      // Step 4: Generate tokens with new key
      console.log('🔑 Step 4: Generate new tokens with rotated key');
      const tokens2 = await AuthService.generateTokens(mockUser);
      
      const decoded2 = jwt.decode(tokens2.accessToken, { complete: true });
      const keyId2 = decoded2.header.kid;
      
      expect(keyId2).toBe(rotationResult.newKeyId);
      expect(keyId2).not.toBe(keyId1);
      console.log(`   ✅ New token generated with rotated keyId: ${keyId2}`);

      // Step 5: Verify both old and new tokens can be verified
      console.log('🔓 Step 5: Verify both old and new tokens are valid');
      
      // Old token should still be verifiable with backup key
      const oldKey = await keyProvider.getKeyById(keyId1);
      expect(oldKey).toBeDefined();
      expect(oldKey.keyId).toBe(keyId1);
      
      // New token should be verifiable with active key
      const newActiveKey = await keyProvider.getActiveSigningKey();
      expect(newActiveKey.keyId).toBe(keyId2);
      
      // Verify both tokens can be decoded with their respective keys
      const verifiedOld = jwt.verify(tokens1.accessToken, oldKey.key);
      const verifiedNew = jwt.verify(tokens2.accessToken, newActiveKey.key);
      
      expect(verifiedOld.userId).toBe(mockUser.id);
      expect(verifiedNew.userId).toBe(mockUser.id);
      
      console.log(`   ✅ Old token verified with backup key: ${keyId1}`);
      console.log(`   ✅ New token verified with active key: ${keyId2}`);

      // Step 6: Check key metadata
      console.log('📋 Step 6: Verify key metadata and status');
      const allKeys = await keyProvider.getAllValidKeys();
      
      const activeKeys = allKeys.filter(k => k.status === 'active');
      const backupKeys = allKeys.filter(k => k.status === 'backup');
      
      expect(activeKeys.length).toBe(1);
      expect(activeKeys[0].keyId).toBe(keyId2);
      
      expect(backupKeys.length).toBeGreaterThanOrEqual(1);
      const backupKey = backupKeys.find(k => k.keyId === keyId1);
      expect(backupKey).toBeDefined();
      
      console.log(`   ✅ Active keys: ${activeKeys.length}`);
      console.log(`   ✅ Backup keys: ${backupKeys.length}`);
      console.log(`   ✅ Total valid keys: ${allKeys.length}`);

      console.log('🎉 Integration test completed successfully!');
    });

    it('should demonstrate local development key generation', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCAL_DEV_KEYS = 'true';
      process.env.USE_MANAGED_KEYS = 'true';
      
      const { LocalDevelopmentKeyProvider } = require('../src/services/keyProvider');
      const devProvider = new LocalDevelopmentKeyProvider();
      
      console.log('🚀 Development Key Generation Test');
      
      await devProvider.initialize();
      const devKey = await devProvider.getActiveSigningKey();
      
      expect(devKey.keyId).toMatch(/^key-/);
      expect(devKey.algorithm).toBe('HS256');
      expect(devKey.key).toBeDefined();
      
      console.log(`   ✅ Development key generated: ${devKey.keyId}`);
      console.log(`   ✅ Rotation interval: ${devProvider.keyRotationInterval} hours`);
      
      const mockUser = { id: 1, email: 'dev@example.com', role: 'developer' };
      
      // Override getKeyProvider to return dev provider for this test
      const originalKeyProvider = require('../src/services/keyProvider').getKeyProvider;
      jest.doMock('../src/services/keyProvider', () => ({
        ...jest.requireActual('../src/services/keyProvider'),
        getKeyProvider: () => devProvider
      }));
      
      const tokens = await AuthService.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.accessToken, { complete: true });
      
      expect(decoded.header.kid).toBe(devKey.keyId);
      console.log(`   ✅ Token signed with development key: ${decoded.header.kid}`);
      
      // Restore original
      jest.doMock('../src/services/keyProvider', () => ({
        ...jest.requireActual('../src/services/keyProvider'),
        getKeyProvider: originalKeyProvider
      }));
      
      console.log('🎉 Development key test completed!');
    });

    it('should demonstrate backward compatibility with static keys', async () => {
      // Don't enable managed keys - should fall back to static
      process.env.JWT_SECRET = 'test-static-secret-for-compatibility';
      delete process.env.USE_MANAGED_KEYS;
      
      console.log('🔧 Backward Compatibility Test');
      
      const mockUser = { id: 1, email: 'legacy@example.com', role: 'user' };
      
      const tokens = await AuthService.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.accessToken, { complete: true });
      
      // Should not have kid header (static key mode)
      expect(decoded.header.kid).toBeUndefined();
      
      // Should be verifiable with static secret
      const verified = jwt.verify(tokens.accessToken, 'test-static-secret-for-compatibility');
      expect(verified.userId).toBe(mockUser.id);
      
      console.log('   ✅ Token generated in static key mode');
      console.log('   ✅ Token verified with static JWT_SECRET');
      console.log('🎉 Backward compatibility confirmed!');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle KeyProvider failures gracefully', async () => {
      console.log('⚠️  Error Handling Test - KeyProvider Failure');
      
      // Mock a failing KeyProvider
      const mockFailingProvider = {
        initialize: jest.fn().mockRejectedValue(new Error('KeyProvider initialization failed')),
        getActiveSigningKey: jest.fn().mockRejectedValue(new Error('Key retrieval failed'))
      };
      
      // Override getKeyProvider temporarily
      jest.doMock('../src/services/keyProvider', () => ({
        getKeyProvider: () => mockFailingProvider
      }));
      
      process.env.JWT_SECRET = 'fallback-secret';
      process.env.USE_MANAGED_KEYS = 'true';
      
      const mockUser = { id: 1, email: 'resilient@example.com', role: 'user' };
      
      // Should not throw, should fall back to static key
      const tokens = await AuthService.generateTokens(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      
      // Should be verifiable with fallback secret
      const verified = jwt.verify(tokens.accessToken, 'fallback-secret');
      expect(verified.userId).toBe(mockUser.id);
      
      console.log('   ✅ Graceful fallback to static key');
      console.log('   ✅ System remains operational during KeyProvider failure');
      console.log('🎉 Resilience test passed!');
    });
  });
});