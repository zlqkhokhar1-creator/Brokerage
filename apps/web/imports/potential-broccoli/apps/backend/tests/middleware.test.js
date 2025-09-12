/**
 * Middleware Tests
 * Tests for JWT authentication middleware
 */

const request = require('supertest');
const express = require('express');
const { createJWTMiddleware, createOptionalJWTMiddleware, createAuthorizationMiddleware } = require('../../../packages/security/middleware');
const { JWTService } = require('../../../packages/security');

describe('JWT Middleware', () => {
  const testConfig = {
    JWT_ALG: 'HS256',
    JWT_SECRET: 'test-secret-at-least-32-characters-long-for-security-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long-for-security',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d'
  };

  const mockLogger = {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  };

  let jwtService;
  let app;

  beforeAll(() => {
    jwtService = new JWTService(testConfig);
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();
  });

  describe('Required JWT Middleware', () => {
    test('should authenticate valid JWT token', async () => {
      const middleware = createJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({
          userId: req.user.userId,
          roles: req.user.roles,
          authenticated: true
        });
      });

      const token = jwtService.signAccessToken({
        sub: 'user123',
        email: 'test@example.com',
        roles: ['user', 'trader']
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        userId: 'user123',
        roles: ['user', 'trader'],
        authenticated: true
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'JWT authentication successful',
        expect.objectContaining({
          userId: 'user123',
          roles: ['user', 'trader']
        })
      );
    });

    test('should reject request without token', async () => {
      const middleware = createJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ authenticated: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication attempt without token',
        expect.objectContaining({
          path: '/test',
          method: 'GET'
        })
      );
    });

    test('should reject invalid token', async () => {
      const middleware = createJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ authenticated: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid token signature',
        code: 'INVALID_SIGNATURE'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'JWT authentication failed',
        expect.objectContaining({
          path: '/test'
        })
      );
    });

    test('should reject expired token', async () => {
      // Create a service with very short expiry
      const shortConfig = {
        ...testConfig,
        JWT_ACCESS_TTL: '1ms'
      };
      const shortService = new JWTService(shortConfig);
      const middleware = createJWTMiddleware(shortConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ authenticated: true });
      });

      const token = shortService.signAccessToken({ sub: 'user123' });
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
      expect(response.body.error).toBe('Token has expired');
    });

    test('should handle malformed Authorization header', async () => {
      const middleware = createJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ authenticated: true });
      });

      await request(app)
        .get('/test')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      await request(app)
        .get('/test')
        .set('Authorization', 'Bearer')
        .expect(401);
    });
  });

  describe('Optional JWT Middleware', () => {
    test('should authenticate valid token when provided', async () => {
      const middleware = createOptionalJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({
          authenticated: !!req.user,
          userId: req.user?.userId
        });
      });

      const token = jwtService.signAccessToken({
        sub: 'user123',
        email: 'test@example.com'
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        authenticated: true,
        userId: 'user123'
      });
    });

    test('should continue without authentication when no token', async () => {
      const middleware = createOptionalJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({
          authenticated: !!req.user,
          userId: req.user?.userId
        });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        userId: undefined
      });
    });

    test('should continue without authentication when invalid token', async () => {
      const middleware = createOptionalJWTMiddleware(testConfig, mockLogger);
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({
          authenticated: !!req.user,
          userId: req.user?.userId
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid.token')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        userId: undefined
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Optional JWT authentication failed, continuing without auth',
        expect.objectContaining({
          path: '/test'
        })
      );
    });
  });

  describe('Authorization Middleware', () => {
    test('should allow access with required role', async () => {
      const jwtMiddleware = createJWTMiddleware(testConfig, mockLogger);
      const authMiddleware = createAuthorizationMiddleware(['admin', 'trader']);
      
      app.use(jwtMiddleware);
      app.use(authMiddleware);
      app.get('/test', (req, res) => {
        res.json({ authorized: true });
      });

      const token = jwtService.signAccessToken({
        sub: 'user123',
        roles: ['trader', 'user']
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ authorized: true });
    });

    test('should deny access without required role', async () => {
      const jwtMiddleware = createJWTMiddleware(testConfig, mockLogger);
      const authMiddleware = createAuthorizationMiddleware(['admin']);
      
      app.use(jwtMiddleware);
      app.use(authMiddleware);
      app.get('/test', (req, res) => {
        res.json({ authorized: true });
      });

      const token = jwtService.signAccessToken({
        sub: 'user123',
        roles: ['user', 'trader']
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: ['admin'],
        userRoles: ['user', 'trader']
      });
    });

    test('should allow access when no roles required', async () => {
      const jwtMiddleware = createJWTMiddleware(testConfig, mockLogger);
      const authMiddleware = createAuthorizationMiddleware([]);
      
      app.use(jwtMiddleware);
      app.use(authMiddleware);
      app.get('/test', (req, res) => {
        res.json({ authorized: true });
      });

      const token = jwtService.signAccessToken({
        sub: 'user123',
        roles: []
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ authorized: true });
    });

    test('should require authentication first', async () => {
      const authMiddleware = createAuthorizationMiddleware(['admin']);
      
      app.use(authMiddleware);
      app.get('/test', (req, res) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH_CONTEXT'
      });
    });
  });
});