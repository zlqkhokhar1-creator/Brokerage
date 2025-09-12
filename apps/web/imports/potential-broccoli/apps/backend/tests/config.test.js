/**
 * Configuration Module Tests
 * Tests for environment validation and configuration loading
 */

const { validateConfig, resetConfig, getConfigSummary } = require('../../../packages/config');

describe('Configuration Module', () => {
  beforeEach(() => {
    resetConfig();
  });

  describe('Environment Validation', () => {
    test('should validate valid configuration with HS256', () => {
      const validEnv = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret-at-least-32-characters-long-for-security',
        JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long',
        HTTP_PORT: '3000'
      };

      expect(() => validateConfig(validEnv)).not.toThrow();
      const config = validateConfig(validEnv);
      
      expect(config.NODE_ENV).toBe('test');
      expect(config.JWT_ALG).toBe('HS256');
      expect(config.HTTP_PORT).toBe(3000);
    });

    test('should validate valid configuration with RS256', () => {
      const validEnv = {
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_ALG: 'RS256',
        JWT_PRIVATE_KEY: 'fake-private-key',
        JWT_PUBLIC_KEY: 'fake-public-key',
      };

      expect(() => validateConfig(validEnv)).not.toThrow();
      const config = validateConfig(validEnv);
      
      expect(config.JWT_ALG).toBe('RS256');
      expect(config.JWT_PRIVATE_KEY).toBe('fake-private-key');
    });

    test('should fail validation when JWT_ISSUER is missing', () => {
      const invalidEnv = {
        JWT_AUDIENCE: 'test-audience',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret'
      };

      expect(() => validateConfig(invalidEnv)).toThrow();
    });

    test('should fail validation when JWT_AUDIENCE is missing', () => {
      const invalidEnv = {
        JWT_ISSUER: 'test-issuer',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret'
      };

      expect(() => validateConfig(invalidEnv)).toThrow();
    });

    test('should fail validation for invalid JWT_ACCESS_TTL format', () => {
      const invalidEnv = {
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_ACCESS_TTL: 'invalid-format',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret'
      };

      expect(() => validateConfig(invalidEnv)).toThrow(/JWT_ACCESS_TTL must be in format/);
    });

    test('should fail validation for invalid HTTP_PORT', () => {
      const invalidEnv = {
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret',
        HTTP_PORT: '99999999'
      };

      expect(() => validateConfig(invalidEnv)).toThrow();
    });

    test('should use default values for optional fields', () => {
      const minimalEnv = {
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_ALG: 'HS256',
        JWT_SECRET: 'test-secret-at-least-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long'
      };

      const config = validateConfig(minimalEnv);
      
      expect(config.NODE_ENV).toBe('development');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.JWT_ACCESS_TTL).toBe('15m');
      expect(config.JWT_REFRESH_TTL).toBe('7d');
      expect(config.HTTP_PORT).toBe(3000);
    });
  });

  describe('Configuration Summary', () => {
    test('should provide safe configuration summary', () => {
      // Mock a valid configuration
      process.env.JWT_ISSUER = 'test-issuer';
      process.env.JWT_AUDIENCE = 'test-audience';
      process.env.JWT_ALG = 'HS256';
      process.env.JWT_SECRET = 'test-secret-safe';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-safe';

      const summary = getConfigSummary();
      
      expect(summary).toHaveProperty('nodeEnv');
      expect(summary).toHaveProperty('jwtAlg');
      expect(summary).toHaveProperty('hasJwtSecret');
      expect(summary).not.toHaveProperty('JWT_SECRET');
      expect(typeof summary.hasJwtSecret).toBe('boolean');

      // Clean up
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;
      delete process.env.JWT_ALG;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
    });
  });

  describe('Algorithm-specific Validation', () => {
    test('should require JWT_SECRET for HS256', () => {
      process.env.JWT_ISSUER = 'test-issuer';
      process.env.JWT_AUDIENCE = 'test-audience';
      process.env.JWT_ALG = 'HS256';
      // Missing JWT_SECRET

      expect(() => {
        const { getConfig } = require('../../../packages/config');
        getConfig();
      }).toThrow(/JWT_SECRET is required/);

      // Clean up
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;
      delete process.env.JWT_ALG;
    });

    test('should require keys for RS256', () => {
      process.env.JWT_ISSUER = 'test-issuer';
      process.env.JWT_AUDIENCE = 'test-audience';
      process.env.JWT_ALG = 'RS256';
      // Missing JWT_PRIVATE_KEY and JWT_PUBLIC_KEY

      expect(() => {
        const { getConfig } = require('../../../packages/config');
        getConfig();
      }).toThrow(/JWT_PRIVATE_KEY.*is required/);

      // Clean up
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;
      delete process.env.JWT_ALG;
    });
  });
});