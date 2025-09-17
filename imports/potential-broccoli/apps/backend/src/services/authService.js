/**
 * Enterprise Authentication System
 * Advanced security features surpassing IBKR and Robinhood
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { promisify } = require('util');

const { dbOps, transaction } = require('../config/database');
const { sessionService, rateLimitService, cacheService } = require('../config/redis');
const { logger, logSecurityEvent, logUserActivity } = require('../utils/logger');
const { 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError,
  BusinessLogicError,
  asyncHandler 
} = require('../utils/errorHandler');
const { authSchemas, validate } = require('../utils/validation');
const { getKeyProvider } = require('./keyProvider');

// Backward compatibility - fallback to static secrets if KeyProvider fails
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class AuthService {
  
  // Enhanced password hashing with adaptive cost
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Secure password verification with timing attack protection
  static async verifyPassword(password, hash) {
    const startTime = process.hrtime.bigint();
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } finally {
      // Constant-time operation to prevent timing attacks
      const endTime = process.hrtime.bigint();
      const minTime = 100000000n; // 100ms in nanoseconds
      const elapsed = endTime - startTime;
      if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, Number(minTime - elapsed) / 1000000));
      }
    }
  }

  // Generate secure tokens using KeyProvider
  static async generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      sessionId: crypto.randomUUID()
    };

    try {
      // Use KeyProvider for active signing key
      const keyProvider = getKeyProvider();
      const signingKey = await keyProvider.getActiveSigningKey();
      
      // Include keyId in the JWT header for key identification during verification
      const accessToken = jwt.sign(payload, signingKey.key, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'brokerage-api',
        audience: 'brokerage-web',
        algorithm: signingKey.algorithm,
        header: {
          kid: signingKey.keyId
        }
      });

      // Use separate key for refresh tokens (still use static secret for now)
      const refreshToken = jwt.sign(
        { userId: user.id, sessionId: payload.sessionId },
        JWT_REFRESH_SECRET,
        {
          expiresIn: JWT_REFRESH_EXPIRES_IN,
          issuer: 'brokerage-api',
          audience: 'brokerage-web'
        }
      );

      logSecurityEvent('TOKENS_GENERATED', {
        userId: user.id,
        keyId: signingKey.keyId,
        sessionId: payload.sessionId
      });

      return { accessToken, refreshToken, sessionId: payload.sessionId };
    } catch (error) {
      // Fallback to static key for backward compatibility
      logger.warn('KeyProvider failed, falling back to static key', { error: error.message });
      
      const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'brokerage-api',
        audience: 'brokerage-web'
      });

      const refreshToken = jwt.sign(
        { userId: user.id, sessionId: payload.sessionId },
        JWT_REFRESH_SECRET,
        {
          expiresIn: JWT_REFRESH_EXPIRES_IN,
          issuer: 'brokerage-api',
          audience: 'brokerage-web'
        }
      );

      return { accessToken, refreshToken, sessionId: payload.sessionId };
    }
  }

  // Register with advanced security checks
  static async register(userData, req) {
    const { email, password, firstName, lastName, phone, acceptTerms, acceptPrivacy } = userData;
    
    // Check for rate limiting
    const clientKey = `register:${req.ip}`;
    if (await rateLimitService.isRateLimited(clientKey, 5, 3600)) { // 5 attempts per hour
      logSecurityEvent('REGISTRATION_RATE_LIMIT', { ip: req.ip, email });
      throw new BusinessLogicError('Too many registration attempts. Please try again later.');
    }

    return await transaction(async (client) => {
      // Check if user already exists
      const existingUser = await dbOps.findUserByEmail(email);
      if (existingUser) {
        logSecurityEvent('REGISTRATION_ATTEMPT_EXISTING_EMAIL', { email, ip: req.ip });
        throw new ValidationError('An account with this email already exists');
      }

      // Enhanced password security check
      const passwordStrength = this.checkPasswordStrength(password);
      if (!passwordStrength.isStrong) {
        throw new ValidationError(`Password is not secure enough: ${passwordStrength.reasons.join(', ')}`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const user = await dbOps.createUser({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone
      });

      // Generate email verification token
      const emailToken = crypto.randomBytes(32).toString('hex');
      await cacheService.set(`email_verify:${emailToken}`, user.id, 86400); // 24 hours

      // Log successful registration
      logUserActivity(user.id, 'USER_REGISTERED', {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Create audit log
      await dbOps.insertAuditLog(user.id, 'CREATE', 'users', user.id, null, {
        email: user.email,
        firstName,
        lastName
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: false
        },
        emailVerificationToken: emailToken
      };
    });
  }

  // Enhanced login with security features
  static async login(credentials, req) {
    const { email, password, twoFactorToken, rememberMe } = credentials;
    
    // Rate limiting per IP and email
    const ipKey = `login:ip:${req.ip}`;
    const emailKey = `login:email:${email}`;
    
    if (await rateLimitService.isRateLimited(ipKey, 10, 900) || // 10 attempts per 15 min per IP
        await rateLimitService.isRateLimited(emailKey, 5, 900)) { // 5 attempts per 15 min per email
      logSecurityEvent('LOGIN_RATE_LIMIT', { email, ip: req.ip });
      throw new BusinessLogicError('Too many login attempts. Please try again later.');
    }

    const user = await dbOps.findUserByEmail(email.toLowerCase());
    if (!user) {
      // Increment rate limit counters even for non-existent users
      await rateLimitService.incr(ipKey, 900);
      await rateLimitService.incr(emailKey, 900);
      logSecurityEvent('LOGIN_ATTEMPT_INVALID_EMAIL', { email, ip: req.ip });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    const lockKey = `account_lock:${user.id}`;
    if (await cacheService.exists(lockKey)) {
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', { userId: user.id, email, ip: req.ip });
      throw new AuthenticationError('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // Track failed attempts
      const failedKey = `login_failed:${user.id}`;
      const failedAttempts = await cacheService.incr(failedKey, 900);
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        await cacheService.set(lockKey, true, 1800); // 30 minutes lock
        logSecurityEvent('ACCOUNT_LOCKED', { userId: user.id, email, attempts: failedAttempts, ip: req.ip });
      }
      
      logSecurityEvent('LOGIN_ATTEMPT_INVALID_PASSWORD', { userId: user.id, email, ip: req.ip });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      if (!twoFactorToken) {
        throw new AuthenticationError('Two-factor authentication code required', { requires2FA: true });
      }
      
      const isValid2FA = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2 // Allow 2 steps tolerance
      });
      
      if (!isValid2FA) {
        logSecurityEvent('LOGIN_INVALID_2FA', { userId: user.id, email, ip: req.ip });
        throw new AuthenticationError('Invalid two-factor authentication code');
      }
    }

    // Clear failed login attempts
    await cacheService.del(`login_failed:${user.id}`);
    
    // Generate tokens
    const { accessToken, refreshToken, sessionId } = await this.generateTokens(user);
    
    // Store session
    const sessionData = {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      loginTime: new Date().toISOString(),
      rememberMe: !!rememberMe
    };
    
    const sessionTTL = rememberMe ? 2592000 : 86400; // 30 days vs 24 hours
    await sessionService.createSession(sessionId, sessionData, sessionTTL);
    
    // Update last login
    await dbOps.updateLastLogin(user.id);
    
    // Log successful login
    logUserActivity(user.id, 'USER_LOGIN', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      twoFactorUsed: !!user.two_factor_enabled
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
        kycStatus: user.kyc_status,
        accountStatus: user.account_status
      },
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  // Secure logout
  static async logout(sessionId, userId) {
    await sessionService.destroySession(sessionId);
    
    logUserActivity(userId, 'USER_LOGOUT', {
      sessionId
    });
  }

  // Token refresh with rotation
  static async refreshToken(refreshTokenString) {
    try {
      const decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
      
      // Check if session exists
      const session = await sessionService.getSession(decoded.sessionId);
      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      const user = await dbOps.findUserById(decoded.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      
      // Generate new tokens (refresh token rotation)
      const tokens = await this.generateTokens(user);
      
      // Update session with new session ID
      await sessionService.destroySession(decoded.sessionId);
      await sessionService.createSession(tokens.sessionId, session, session.rememberMe ? 2592000 : 86400);
      
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: JWT_EXPIRES_IN
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  // Enable 2FA
  static async enable2FA(userId) {
    const user = await dbOps.findUserById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `Brokerage Platform (${user.email})`,
      issuer: 'Brokerage Platform',
      length: 32
    });

    // Store temporary secret
    await cacheService.set(`2fa_setup:${userId}`, secret.base32, 900); // 15 minutes

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    };
  }

  // Verify and confirm 2FA setup
  static async confirm2FA(userId, token, secret) {
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!isValid) {
      throw new ValidationError('Invalid verification code');
    }

    // Enable 2FA for user
    await dbOps.query(
      'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2',
      [secret, userId]
    );

    // Clear setup cache
    await cacheService.del(`2fa_setup:${userId}`);

    logSecurityEvent('2FA_ENABLED', { userId });
    
    return { success: true };
  }

  // Generate backup codes
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Password strength checker
  static checkPasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return {
        isStrong: false,
        score: 0,
        reasons: ['password is required']
      };
    }
    
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noSequence: !/(.)\1{2,}/.test(password),
      noCommon: !this.isCommonPassword(password)
    };

    const reasons = [];
    if (!checks.length) reasons.push('at least 12 characters');
    if (!checks.uppercase) reasons.push('uppercase letters');
    if (!checks.lowercase) reasons.push('lowercase letters');
    if (!checks.numbers) reasons.push('numbers');
    if (!checks.symbols) reasons.push('special characters');
    if (!checks.noSequence) reasons.push('no repeated characters');
    if (!checks.noCommon) reasons.push('not a common password');

    return {
      isStrong: Object.values(checks).every(check => check),
      score: Object.values(checks).filter(check => check).length,
      reasons
    };
  }

  // Common password check (simplified)
  static isCommonPassword(password) {
    const common = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ];
    return common.includes(password.toLowerCase());
  }

  // Device fingerprinting
  static generateDeviceFingerprint(req) {
    const components = [
      req.get('user-agent') || '',
      req.get('accept-language') || '',
      req.get('accept-encoding') || '',
      req.ip
    ];
    
    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }
}

// Enhanced authentication middleware with KeyProvider support
const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Access token required');
  }

  try {
    let decoded;
    let keyUsed = 'static';
    
    // First, try to decode the token without verification to get the keyId
    const unverifiedDecoded = jwt.decode(token, { complete: true });
    const keyId = unverifiedDecoded?.header?.kid;
    
    if (keyId) {
      // Token has a keyId, try to verify with KeyProvider
      try {
        const keyProvider = getKeyProvider();
        const keyData = await keyProvider.getKeyById(keyId);
        
        if (keyData) {
          decoded = jwt.verify(token, keyData.key, {
            algorithms: [keyData.algorithm]
          });
          keyUsed = keyId;
        } else {
          // Key not found, try all valid keys (for key rotation scenarios)
          const validKeys = await keyProvider.getAllValidKeys();
          let tokenVerified = false;
          
          for (const key of validKeys) {
            try {
              decoded = jwt.verify(token, key.key, {
                algorithms: [key.algorithm]
              });
              keyUsed = key.keyId;
              tokenVerified = true;
              break;
            } catch (e) {
              // Continue to next key
            }
          }
          
          if (!tokenVerified) {
            throw new AuthenticationError('Token signed with unknown key');
          }
        }
      } catch (keyProviderError) {
        // Fallback to static key
        logger.warn('KeyProvider verification failed, trying static key', { 
          error: keyProviderError.message,
          keyId 
        });
        decoded = jwt.verify(token, JWT_SECRET);
      }
    } else {
      // No keyId in token, use static key (backward compatibility)
      decoded = jwt.verify(token, JWT_SECRET);
    }
    
    // Check session validity
    const session = await sessionService.getSession(decoded.sessionId);
    if (!session) {
      throw new AuthenticationError('Session expired');
    }

    // Get fresh user data
    const user = await dbOps.findUserById(decoded.userId);
    if (!user || !user.is_active) {
      throw new AuthenticationError('Account not found or deactivated');
    }

    // Check for suspicious activity
    const deviceFingerprint = AuthService.generateDeviceFingerprint(req);
    if (session.deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
      logSecurityEvent('SUSPICIOUS_DEVICE', { 
        userId: user.id, 
        sessionId: decoded.sessionId,
        ip: req.ip 
      });
    }

    // Log successful token verification
    logSecurityEvent('TOKEN_VERIFIED', {
      userId: user.id,
      sessionId: decoded.sessionId,
      keyUsed: keyUsed
    });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      sessionId: decoded.sessionId
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
});

// Role-based authorization middleware
const authorize = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      logSecurityEvent('AUTHORIZATION_DENIED', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        endpoint: req.path
      });
      throw new AuthorizationError('Insufficient permissions');
    }
    
    next();
  });
};

module.exports = {
  AuthService,
  authenticateToken,
  authorize,
  authSchemas,
  validate
};
