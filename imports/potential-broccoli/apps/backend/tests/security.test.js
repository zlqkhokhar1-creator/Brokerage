/**
 * Security Module Tests
 * Tests for JWT signing, verification, and key management
 */

const fs = require('fs');
const path = require('path');
const { JWTService, TOKEN_TYPES, createJWTService } = require('../../../packages/security');

describe('Security Module', () => {
  const testKeysPath = path.join(__dirname, '../../tests/fixtures/keys');
  const privateKeyPath = path.join(testKeysPath, 'test-private.pem');
  const publicKeyPath = path.join(testKeysPath, 'test-public.pem');

  // Test configurations
  const hs256Config = {
    JWT_ALG: 'HS256',
    JWT_SECRET: 'test-secret-at-least-32-characters-long-for-security-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long-for-security',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d'
  };

  const rs256Config = {
    JWT_ALG: 'RS256',
    JWT_PRIVATE_KEY_PATH: privateKeyPath,
    JWT_PUBLIC_KEY_PATH: publicKeyPath,
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d'
  };

  describe('JWT Service with HS256', () => {
    let jwtService;

    beforeAll(() => {
      jwtService = new JWTService(hs256Config);
    });

    test('should sign and verify access token', () => {
      const claims = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['user', 'trader']
      };

      const token = jwtService.signAccessToken(claims);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = jwtService.verifyToken(token, TOKEN_TYPES.ACCESS);
      expect(decoded.sub).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roles).toEqual(['user', 'trader']);
      expect(decoded.type).toBe(TOKEN_TYPES.ACCESS);
      expect(decoded.iss).toBe('test-issuer');
      expect(decoded.aud).toBe('test-audience');
    });

    test('should sign and verify refresh token', () => {
      const claims = {
        sub: 'user123',
        sessionId: 'session456'
      };

      const token = jwtService.signRefreshToken(claims);
      expect(token).toBeTruthy();

      const decoded = jwtService.verifyToken(token, TOKEN_TYPES.REFRESH);
      expect(decoded.sub).toBe('user123');
      expect(decoded.sessionId).toBe('session456');
      expect(decoded.type).toBe(TOKEN_TYPES.REFRESH);
    });

    test('should generate token pair', () => {
      const claims = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['user']
      };

      const tokenPair = jwtService.generateTokenPair(claims);
      
      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('sessionId');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(tokenPair).toHaveProperty('tokenType');
      
      expect(tokenPair.tokenType).toBe('Bearer');
      expect(tokenPair.expiresIn).toBe('15m');

      // Verify both tokens work
      const accessDecoded = jwtService.verifyToken(tokenPair.accessToken, TOKEN_TYPES.ACCESS);
      const refreshDecoded = jwtService.verifyToken(tokenPair.refreshToken, TOKEN_TYPES.REFRESH);
      
      expect(accessDecoded.sessionId).toBe(refreshDecoded.sessionId);
    });

    test('should fail verification of wrong token type', () => {
      const claims = { sub: 'user123' };
      const accessToken = jwtService.signAccessToken(claims);

      try {
        jwtService.verifyToken(accessToken, TOKEN_TYPES.REFRESH);
      } catch (err) {
        expect(err.code).toBe('INVALID_TOKEN_TYPE');
        expect(err.message).toMatch(/Invalid token type/);
      }
    });

    test('should fail verification of invalid token', () => {
      expect(() => {
        jwtService.verifyToken('invalid.token.here', TOKEN_TYPES.ACCESS);
      }).toThrow(/Invalid token signature/);
    });

    test('should handle expired tokens', async () => {
      // Create a service with very short expiry
      const shortConfig = {
        ...hs256Config,
        JWT_ACCESS_TTL: '1ms'
      };
      const shortService = new JWTService(shortConfig);
      
      const token = shortService.signAccessToken({ sub: 'user123' });
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(() => {
        shortService.verifyToken(token, TOKEN_TYPES.ACCESS);
      }).toThrow(/Token has expired/);
    });
  });

  describe('JWT Service with RS256', () => {
    let jwtService;

    beforeAll(() => {
      // Skip if test keys don't exist
      if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        console.warn('RS256 test keys not found, skipping RS256 tests');
        return;
      }
      jwtService = new JWTService(rs256Config);
    });

    test('should sign and verify with RSA keys', () => {
      if (!jwtService) {
        console.warn('Skipping RS256 test - keys not available');
        return;
      }

      const claims = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['admin']
      };

      const token = jwtService.signAccessToken(claims);
      expect(token).toBeTruthy();

      const decoded = jwtService.verifyToken(token, TOKEN_TYPES.ACCESS);
      expect(decoded.sub).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roles).toEqual(['admin']);
    });
  });

  describe('Token Header Extraction', () => {
    test('should extract token from Bearer header', () => {
      const authHeader = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test';
      const token = JWTService.extractTokenFromHeader(authHeader);
      expect(token).toBe('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test');
    });

    test('should return null for invalid header format', () => {
      expect(JWTService.extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(JWTService.extractTokenFromHeader('Basic dGVzdA==')).toBeNull();
      expect(JWTService.extractTokenFromHeader('')).toBeNull();
      expect(JWTService.extractTokenFromHeader(null)).toBeNull();
      expect(JWTService.extractTokenFromHeader(undefined)).toBeNull();
    });

    test('should handle case insensitive Bearer keyword', () => {
      const token = JWTService.extractTokenFromHeader('bearer test-token');
      expect(token).toBe('test-token');
      
      const token2 = JWTService.extractTokenFromHeader('BEARER test-token');
      expect(token2).toBe('test-token');
    });
  });

  describe('Factory Function', () => {
    test('should create JWT service instance', () => {
      const service = createJWTService(hs256Config);
      expect(service).toBeInstanceOf(JWTService);
      
      const token = service.signAccessToken({ sub: 'user123' });
      expect(token).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should throw error for missing keys in RS256', () => {
      const invalidConfig = {
        JWT_ALG: 'RS256',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience'
      };

      expect(() => {
        new JWTService(invalidConfig);
      }).toThrow();
    });

    test('should throw error for missing secrets in HS256', () => {
      const invalidConfig = {
        JWT_ALG: 'HS256',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience'
      };

      expect(() => {
        new JWTService(invalidConfig);
      }).toThrow();
    });

    test('should throw error for unsupported algorithm', () => {
      const invalidConfig = {
        JWT_ALG: 'ES256',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience'
      };

      expect(() => {
        new JWTService(invalidConfig);
      }).toThrow(/Unsupported JWT algorithm/);
    });
  });
});