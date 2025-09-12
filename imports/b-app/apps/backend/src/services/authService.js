/**
 * Enhanced Auth Service with Dual-Write Support
 * Integrates new UserRepository with existing auth system
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const db = require('../config/database');
const featureFlags = require('../config/featureFlags');

// Import TypeScript repositories (compiled to JS)
let UserRepository;
try {
  // Try to load compiled TypeScript first
  const { UserRepository: TSUserRepo } = require('../repositories/UserRepository');
  UserRepository = TSUserRepo;
} catch (error) {
  // Fallback: load via ts-node if available
  try {
    const tsNode = require('ts-node').register();
    const { UserRepository: TSUserRepo } = require('../repositories/UserRepository.ts');
    UserRepository = TSUserRepo;
  } catch (tsError) {
    logger.warn('TypeScript repositories not available, using legacy auth only');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

class AuthService {
  constructor() {
    this.userRepo = UserRepository ? new UserRepository() : null;
  }

  /**
   * Register a new user with dual-write support
   */
  async registerUser(userData) {
    const { email, password, firstName, lastName, phone } = userData;
    
    try {
      // Check if user exists (primary check using new repo if available)
      let existingUser = null;
      if (this.userRepo && featureFlags.FEATURE_DUAL_WRITE_USERS) {
        existingUser = await this.userRepo.findByEmail(email);
      } else {
        // Legacy check
        const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        existingUser = result.rows[0];
      }

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user based on feature flags
      let newUser;
      if (this.userRepo && featureFlags.FEATURE_ARGON2_ENABLED) {
        // Use new Argon2id-based repository
        newUser = await this.userRepo.createUser({
          email,
          password,
          firstName,
          lastName,
          phone
        });
        
        logger.info('User created with Argon2id', { userId: newUser.id, email });
        
        // Dual-write to legacy system if enabled
        if (featureFlags.FEATURE_DUAL_WRITE_USERS) {
          try {
            await this.createLegacyUser(userData);
            logger.info('User dual-written to legacy system', { userId: newUser.id });
          } catch (legacyError) {
            logger.warn('Legacy user creation failed during dual-write', { 
              error: legacyError.message,
              userId: newUser.id 
            });
          }
        }
      } else {
        // Use legacy bcrypt-based creation
        newUser = await this.createLegacyUser(userData);
        logger.info('User created with legacy bcrypt', { userId: newUser.id, email });
      }

      return {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        createdAt: newUser.created_at
      };
      
    } catch (error) {
      logger.error('User registration failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Authenticate user with password verification and optional rehashing
   */
  async authenticateUser(email, password) {
    try {
      let user = null;
      let needsRehash = false;

      // Try new repository first if available
      if (this.userRepo && featureFlags.FEATURE_ARGON2_ENABLED) {
        const authResult = await this.userRepo.verifyPasswordAndRehash(email, password);
        if (authResult) {
          user = authResult.user;
          needsRehash = authResult.needsRehash;
          
          if (needsRehash) {
            logger.info('Password rehashed to current Argon2id parameters', { 
              userId: user.id, 
              email 
            });
          }
        }
      } else {
        // Fallback to legacy authentication
        const result = await db.query(
          'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows[0]) {
          const dbUser = result.rows[0];
          const isValid = await bcrypt.compare(password, dbUser.password_hash);
          
          if (isValid) {
            user = {
              id: dbUser.id,
              email: dbUser.email,
              first_name: dbUser.first_name,
              last_name: dbUser.last_name
            };
          }
        }
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      // Update last login
      await this.updateLastLogin(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
      };

    } catch (error) {
      logger.error('Authentication failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      let validToken = null;
      if (this.userRepo && featureFlags.FEATURE_REFRESH_TOKENS_ENABLED) {
        validToken = await this.userRepo.findValidToken(tokenHash);
      } else {
        // Legacy token validation (if implemented)
        throw new Error('Refresh tokens not supported in legacy mode');
      }

      if (!validToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user info
      const user = await this.getUserById(validToken.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.rotateRefreshToken(tokenHash);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRES_IN
      };

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate and store refresh token
   */
  async generateRefreshToken(userId) {
    if (!this.userRepo || !featureFlags.FEATURE_REFRESH_TOKENS_ENABLED) {
      // Return a simple token for legacy compatibility
      return jwt.sign(
        { userId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.userRepo.createRefreshToken(userId, tokenHash, expiresAt);
    
    return token;
  }

  /**
   * Rotate refresh token
   */
  async rotateRefreshToken(oldTokenHash) {
    if (!this.userRepo || !featureFlags.FEATURE_REFRESH_TOKENS_ENABLED) {
      throw new Error('Token rotation not supported');
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const rotatedToken = await this.userRepo.rotateRefreshToken(
      oldTokenHash, 
      newTokenHash, 
      expiresAt
    );

    if (!rotatedToken) {
      throw new Error('Token rotation failed');
    }

    return newToken;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    if (this.userRepo) {
      return await this.userRepo.findById(userId);
    } else {
      // Legacy lookup
      const result = await db.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0] || null;
    }
  }

  /**
   * Legacy user creation (for dual-write)
   */
  async createLegacyUser(userData) {
    const { email, password, firstName, lastName, phone } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, first_name, last_name, created_at
    `, [email, hashedPassword, firstName, lastName, phone]);

    return result.rows[0];
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    // This would require adding last_login column to users table
    // For now, just log the event
    logger.info('User login recorded', { userId });
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logoutUser(refreshToken) {
    if (!this.userRepo || !featureFlags.FEATURE_REFRESH_TOKENS_ENABLED) {
      // For legacy mode, just return success
      return { success: true };
    }

    try {
      const tokenHash = this.hashToken(refreshToken);
      const token = await this.userRepo.findValidToken(tokenHash);
      
      if (token) {
        await this.userRepo.revokeRefreshToken(token.id);
      }
      
      return { success: true };
    } catch (error) {
      logger.warn('Logout token revocation failed', { error: error.message });
      return { success: true }; // Don't fail logout on token issues
    }
  }
}

module.exports = { AuthService };