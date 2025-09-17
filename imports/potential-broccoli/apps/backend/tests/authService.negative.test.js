/**
 * AuthService Negative Path Tests
 * Enhanced security scenario testing with KeyProvider integration
 * Phase 1b of Epic #34 - Security & Identity Foundation
 */

const jwt = require('jsonwebtoken');
const { AuthService, authenticateToken } = require('../src/services/authService');
const { getKeyProvider } = require('../src/services/keyProvider');

// Mock dependencies
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
    createSession: jest.fn(),
    getSession: jest.fn(),
    destroySession: jest.fn()
  },
  rateLimitService: {
    isRateLimited: jest.fn(),
    incr: jest.fn()
  },
  cacheService: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
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

jest.mock('../src/services/keyProvider');

const { dbOps } = require('../src/config/database');
const { sessionService, rateLimitService, cacheService } = require('../src/config/redis');
const { logger, logSecurityEvent } = require('../src/utils/logger');

describe('AuthService - Negative Path Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.USE_MANAGED_KEYS;
    delete process.env.JWT_SECRET;
  });

  describe('Token Generation with KeyProvider Failures', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      permissions: ['read']
    };

    it('should fallback to static key when KeyProvider fails', async () => {
      // Mock KeyProvider to fail
      const mockKeyProvider = {
        getActiveSigningKey: jest.fn().mockRejectedValue(new Error('KeyProvider unavailable'))
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      process.env.JWT_SECRET = 'fallback-secret';
      
      const tokens = await AuthService.generateTokens(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.sessionId).toBeDefined();
      
      // Verify token can be decoded with fallback secret
      const decoded = jwt.decode(tokens.accessToken);
      expect(decoded.userId).toBe(mockUser.id);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'KeyProvider failed, falling back to static key',
        expect.objectContaining({
          error: 'KeyProvider unavailable'
        })
      );
    });

    it('should handle KeyProvider returning invalid key format', async () => {
      const mockKeyProvider = {
        getActiveSigningKey: jest.fn().mockResolvedValue({
          keyId: 'test-key',
          key: null, // Invalid key
          algorithm: 'HS256'
        })
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      process.env.JWT_SECRET = 'fallback-secret';
      
      // Should fallback to static key when KeyProvider returns invalid key
      const tokens = await AuthService.generateTokens(mockUser);
      expect(tokens.accessToken).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle KeyProvider returning unsupported algorithm', async () => {
      const mockKeyProvider = {
        getActiveSigningKey: jest.fn().mockResolvedValue({
          keyId: 'test-key',
          key: 'valid-key-data',
          algorithm: 'UNSUPPORTED_ALG'
        })
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      process.env.JWT_SECRET = 'fallback-secret';
      
      const tokens = await AuthService.generateTokens(mockUser);
      expect(tokens.accessToken).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle missing keyId in KeyProvider response', async () => {
      const mockKeyProvider = {
        getActiveSigningKey: jest.fn().mockResolvedValue({
          key: 'valid-key-data',
          algorithm: 'HS256'
          // Missing keyId
        })
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      process.env.JWT_SECRET = 'fallback-secret';
      
      const tokens = await AuthService.generateTokens(mockUser);
      expect(tokens.accessToken).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Token Verification with Key Rotation Scenarios', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        headers: { authorization: 'Bearer test-token' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      };
      mockRes = {};
      mockNext = jest.fn();
      
      // Mock session service
      sessionService.getSession.mockResolvedValue({
        userId: 1,
        email: 'test@example.com'
      });
      
      // Mock user lookup
      dbOps.findUserById.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        is_active: true
      });
    });

    it('should handle token signed with rotated key', async () => {
      // Create token with one key
      const oldKey = 'old-signing-key';
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        oldKey,
        { keyid: 'old-key-id' }
      );
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      // Mock KeyProvider with different active key but old key still available
      const mockKeyProvider = {
        getKeyById: jest.fn()
          .mockResolvedValueOnce(null) // First call for 'old-key-id' returns null
          .mockResolvedValueOnce({ keyId: 'old-key-id', key: oldKey, algorithm: 'HS256' }),
        getAllValidKeys: jest.fn().mockResolvedValue([
          { keyId: 'new-key-id', key: 'new-signing-key', algorithm: 'HS256', status: 'active' },
          { keyId: 'old-key-id', key: oldKey, algorithm: 'HS256', status: 'backup' }
        ])
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(1);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'TOKEN_VERIFIED',
        expect.objectContaining({
          keyUsed: 'old-key-id'
        })
      );
    });

    it('should reject token signed with unknown key', async () => {
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        'unknown-key',
        { keyid: 'unknown-key-id' }
      );
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const mockKeyProvider = {
        getKeyById: jest.fn().mockResolvedValue(null),
        getAllValidKeys: jest.fn().mockResolvedValue([
          { keyId: 'valid-key-id', key: 'valid-key', algorithm: 'HS256', status: 'active' }
        ])
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      await expect(authenticateToken(mockReq, mockRes, mockNext)).rejects.toThrow('Token signed with unknown key');
    });

    it('should fallback to static key when KeyProvider fails during verification', async () => {
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        'test-static-secret',
        { keyid: 'some-key-id' }
      );
      
      mockReq.headers.authorization = `Bearer ${token}`;
      process.env.JWT_SECRET = 'test-static-secret';
      
      const mockKeyProvider = {
        getKeyById: jest.fn().mockRejectedValue(new Error('KeyProvider failed')),
        getAllValidKeys: jest.fn().mockRejectedValue(new Error('KeyProvider failed'))
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'KeyProvider verification failed, trying static key',
        expect.objectContaining({
          error: 'KeyProvider failed'
        })
      );
    });

    it('should handle malformed JWT header', async () => {
      const malformedToken = 'not.a.valid.jwt.token';
      mockReq.headers.authorization = `Bearer ${malformedToken}`;
      
      const mockKeyProvider = {
        getKeyById: jest.fn(),
        getAllValidKeys: jest.fn()
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      await expect(authenticateToken(mockReq, mockRes, mockNext)).rejects.toThrow('Invalid token');
    });

    it('should handle JWT without keyid header', async () => {
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        'test-static-secret'
        // No keyid in header
      );
      
      mockReq.headers.authorization = `Bearer ${token}`;
      process.env.JWT_SECRET = 'test-static-secret';
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'TOKEN_VERIFIED',
        expect.objectContaining({
          keyUsed: 'static'
        })
      );
    });

    it('should handle corrupted key data from KeyProvider', async () => {
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        'correct-key',
        { keyid: 'test-key-id' }
      );
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const mockKeyProvider = {
        getKeyById: jest.fn().mockResolvedValue({
          keyId: 'test-key-id',
          key: 'corrupted-key-data', // Wrong key
          algorithm: 'HS256'
        }),
        getAllValidKeys: jest.fn().mockResolvedValue([])
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);
      
      process.env.JWT_SECRET = 'correct-key';
      
      // Should fallback to static key after key verification fails
      await authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('User Authentication Edge Cases', () => {
    const mockReq = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };

    it('should handle concurrent login attempts with rate limiting', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock rate limiting triggered
      rateLimitService.isRateLimited.mockResolvedValue(true);

      await expect(AuthService.login(credentials, mockReq)).rejects.toThrow('Too many login attempts');
      
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'LOGIN_RATE_LIMIT',
        expect.objectContaining({
          email: credentials.email
        })
      );
    });

    it('should handle database connection failures during login', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      rateLimitService.isRateLimited.mockResolvedValue(false);
      dbOps.findUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      await expect(AuthService.login(credentials, mockReq)).rejects.toThrow('Database connection failed');
    });

    it('should handle session creation failures', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      rateLimitService.isRateLimited.mockResolvedValue(false);
      dbOps.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$hashedpassword',
        two_factor_enabled: false
      });

      // Mock bcrypt verification to succeed
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Mock successful token generation
      const mockKeyProvider = {
        getActiveSigningKey: jest.fn().mockResolvedValue({
          keyId: 'test-key',
          key: 'test-signing-key',
          algorithm: 'HS256'
        })
      };
      getKeyProvider.mockReturnValue(mockKeyProvider);

      // Mock session creation failure
      sessionService.createSession.mockRejectedValue(new Error('Session store unavailable'));

      await expect(AuthService.login(credentials, mockReq)).rejects.toThrow('Session store unavailable');
    });

    it('should handle malformed 2FA token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        twoFactorToken: 'invalid-format-token'
      };

      rateLimitService.isRateLimited.mockResolvedValue(false);
      dbOps.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$hashedpassword',
        two_factor_enabled: true,
        two_factor_secret: 'valid-secret'
      });

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await expect(AuthService.login(credentials, mockReq)).rejects.toThrow('Invalid two-factor authentication code');
    });
  });

  describe('Password Security Edge Cases', () => {
    it('should handle extremely long passwords', async () => {
      const longPassword = 'a'.repeat(10000); // 10KB password
      
      // Should not crash, but should handle gracefully
      const strength = AuthService.checkPasswordStrength(longPassword);
      expect(strength).toBeDefined();
      expect(strength.isStrong).toBe(false); // Lacks complexity despite length
    });

    it('should handle passwords with unusual characters', async () => {
      const unicodePassword = '🔐🎯🚀🌟💎🔥⚡🎨🎪🎭🎬🎵';
      
      const strength = AuthService.checkPasswordStrength(unicodePassword);
      expect(strength).toBeDefined();
      expect(strength.reasons).toContain('uppercase letters');
      expect(strength.reasons).toContain('lowercase letters');
    });

    it('should handle password with only repeating characters', async () => {
      const repeatingPassword = 'aaaaaaaaaaaaaaaa';
      
      const strength = AuthService.checkPasswordStrength(repeatingPassword);
      expect(strength.isStrong).toBe(false);
      expect(strength.reasons).toContain('no repeated characters');
    });

    it('should handle null or undefined passwords', async () => {
      expect(() => AuthService.checkPasswordStrength(null)).not.toThrow();
      expect(() => AuthService.checkPasswordStrength(undefined)).not.toThrow();
      
      const nullStrength = AuthService.checkPasswordStrength(null);
      expect(nullStrength.isStrong).toBe(false);
    });
  });

  describe('Device Fingerprinting Edge Cases', () => {
    it('should handle missing user agent headers', () => {
      const mockReq = {
        get: jest.fn().mockReturnValue(undefined),
        ip: '127.0.0.1'
      };

      const fingerprint = AuthService.generateDeviceFingerprint(mockReq);
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
    });

    it('should handle requests without IP address', () => {
      const mockReq = {
        get: jest.fn().mockReturnValue('Mozilla/5.0...'),
        ip: undefined
      };

      const fingerprint = AuthService.generateDeviceFingerprint(mockReq);
      expect(fingerprint).toBeDefined();
    });

    it('should generate consistent fingerprints for same input', () => {
      const mockReq1 = {
        get: jest.fn().mockReturnValue('same-agent'),
        ip: '127.0.0.1'
      };
      const mockReq2 = {
        get: jest.fn().mockReturnValue('same-agent'),
        ip: '127.0.0.1'
      };

      const fingerprint1 = AuthService.generateDeviceFingerprint(mockReq1);
      const fingerprint2 = AuthService.generateDeviceFingerprint(mockReq2);
      
      expect(fingerprint1).toBe(fingerprint2);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle token generation under memory pressure', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        permissions: []
      };

      // Mock crypto operations to simulate memory pressure
      const crypto = require('crypto');
      const originalRandomUUID = crypto.randomUUID;
      
      let callCount = 0;
      crypto.randomUUID = jest.fn(() => {
        callCount++;
        if (callCount % 3 === 0) {
          throw new Error('Out of memory');
        }
        return originalRandomUUID();
      });

      try {
        // Should eventually succeed despite intermittent failures
        await expect(AuthService.generateTokens(mockUser)).resolves.toBeDefined();
      } finally {
        crypto.randomUUID = originalRandomUUID;
      }
    });

    it('should handle large number of concurrent token verifications', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer test-token' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const mockRes = {};
      const mockNext = jest.fn();

      // Mock successful authentication
      process.env.JWT_SECRET = 'test-secret';
      const token = jwt.sign(
        { userId: 1, sessionId: 'session-1' },
        'test-secret'
      );
      mockReq.headers.authorization = `Bearer ${token}`;

      sessionService.getSession.mockResolvedValue({
        userId: 1,
        email: 'test@example.com'
      });
      
      dbOps.findUserById.mockResolvedValue({
        id: 1,
        is_active: true,
        role: 'user',
        permissions: []
      });

      // Simulate 100 concurrent requests
      const promises = Array(100).fill().map(() => 
        authenticateToken(mockReq, mockRes, mockNext)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});