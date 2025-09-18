const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class IdentityManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.users = new Map();
    this.sessions = new Map();
    this.devices = new Map();
    this.mfaSecrets = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load users from database
      await this.loadUsers();
      
      // Load active sessions
      await this.loadActiveSessions();
      
      this._initialized = true;
      logger.info('IdentityManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IdentityManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('IdentityManager closed');
    } catch (error) {
      logger.error('Error closing IdentityManager:', error);
    }
  }

  async loadUsers() {
    try {
      const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.is_active = true
      `);
      
      for (const user of result.rows) {
        this.users.set(user.id, {
          ...user,
          permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} users`);
    } catch (error) {
      logger.error('Error loading users:', error);
      throw error;
    }
  }

  async loadActiveSessions() {
    try {
      const result = await pool.query(`
        SELECT s.*, u.email, u.role_id
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_active = true AND s.expires_at > NOW()
      `);
      
      for (const session of result.rows) {
        this.sessions.set(session.id, session);
      }
      
      logger.info(`Loaded ${result.rows.length} active sessions`);
    } catch (error) {
      logger.error('Error loading active sessions:', error);
      throw error;
    }
  }

  async authenticate(username, password, mfaToken = null, deviceInfo = {}) {
    try {
      // Find user by username or email
      const user = Array.from(this.users.values()).find(u => 
        u.username === username || u.email === username
      );
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Check if user is locked
      if (user.is_locked) {
        throw new Error('Account is locked');
      }
      
      // Check if user is suspended
      if (user.is_suspended) {
        throw new Error('Account is suspended');
      }
      
      // Verify MFA if enabled
      if (user.mfa_enabled) {
        if (!mfaToken) {
          throw new Error('MFA token required');
        }
        
        const isValidMFA = await this.verifyMFAToken(user.id, mfaToken);
        if (!isValidMFA) {
          throw new Error('Invalid MFA token');
        }
      }
      
      // Create session
      const session = await this.createSession(user.id, deviceInfo);
      
      // Update last login
      await this.updateLastLogin(user.id);
      
      // Emit event
      this.emit('userAuthenticated', { user, session });
      
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role_name,
          permissions: user.permissions
        },
        session: {
          id: session.id,
          token: session.token,
          expiresAt: session.expires_at
        }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  async createSession(userId, deviceInfo) {
    try {
      const sessionId = nanoid();
      const token = jwt.sign(
        { userId, sessionId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const session = {
        id: sessionId,
        user_id: userId,
        token: token,
        device_info: deviceInfo,
        ip_address: deviceInfo.ipAddress,
        user_agent: deviceInfo.userAgent,
        created_at: new Date(),
        expires_at: expiresAt,
        is_active: true
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO user_sessions (id, user_id, token, device_info, ip_address, user_agent, created_at, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        sessionId, userId, token, JSON.stringify(deviceInfo),
        deviceInfo.ipAddress, deviceInfo.userAgent, session.created_at,
        session.expires_at, session.is_active
      ]);
      
      // Store in memory
      this.sessions.set(sessionId, session);
      
      // Store in Redis
      await this.redis.setex(
        `session:${sessionId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(session)
      );
      
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async verifySession(sessionId) {
    try {
      // Check Redis first
      const cachedSession = await this.redis.get(`session:${sessionId}`);
      if (cachedSession) {
        return JSON.parse(cachedSession);
      }
      
      // Check memory
      const session = this.sessions.get(sessionId);
      if (session && session.is_active && session.expires_at > new Date()) {
        return session;
      }
      
      // Check database
      const result = await pool.query(`
        SELECT * FROM user_sessions
        WHERE id = $1 AND is_active = true AND expires_at > NOW()
      `, [sessionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const dbSession = result.rows[0];
      
      // Store in memory and Redis
      this.sessions.set(sessionId, dbSession);
      await this.redis.setex(
        `session:${sessionId}`,
        24 * 60 * 60,
        JSON.stringify(dbSession)
      );
      
      return dbSession;
    } catch (error) {
      logger.error('Error verifying session:', error);
      return null;
    }
  }

  async revokeSession(sessionId) {
    try {
      // Update database
      await pool.query(`
        UPDATE user_sessions
        SET is_active = false, revoked_at = NOW()
        WHERE id = $1
      `, [sessionId]);
      
      // Remove from memory
      this.sessions.delete(sessionId);
      
      // Remove from Redis
      await this.redis.del(`session:${sessionId}`);
      
      logger.info(`Session revoked: ${sessionId}`);
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    }
  }

  async revokeAllUserSessions(userId) {
    try {
      // Update database
      await pool.query(`
        UPDATE user_sessions
        SET is_active = false, revoked_at = NOW()
        WHERE user_id = $1 AND is_active = true
      `, [userId]);
      
      // Remove from memory
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.user_id === userId) {
          this.sessions.delete(sessionId);
          await this.redis.del(`session:${sessionId}`);
        }
      }
      
      logger.info(`All sessions revoked for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking user sessions:', error);
      throw error;
    }
  }

  async enableMFA(userId) {
    try {
      const secret = speakeasy.generateSecret({
        name: `Brokerage App (${userId})`,
        issuer: 'Brokerage Platform'
      });
      
      // Store secret
      this.mfaSecrets.set(userId, secret.base32);
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      return {
        secret: secret.base32,
        qrCodeUrl: qrCodeUrl,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Error enabling MFA:', error);
      throw error;
    }
  }

  async verifyMFAToken(userId, token) {
    try {
      const secret = this.mfaSecrets.get(userId);
      if (!secret) {
        return false;
      }
      
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) of tolerance
      });
      
      return verified;
    } catch (error) {
      logger.error('Error verifying MFA token:', error);
      return false;
    }
  }

  async confirmMFA(userId, token) {
    try {
      const isValid = await this.verifyMFAToken(userId, token);
      if (!isValid) {
        throw new Error('Invalid MFA token');
      }
      
      // Update user in database
      await pool.query(`
        UPDATE users
        SET mfa_enabled = true, mfa_secret = $1, updated_at = NOW()
        WHERE id = $2
      `, [this.mfaSecrets.get(userId), userId]);
      
      // Update user in memory
      const user = this.users.get(userId);
      if (user) {
        user.mfa_enabled = true;
        user.mfa_secret = this.mfaSecrets.get(userId);
      }
      
      logger.info(`MFA enabled for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error confirming MFA:', error);
      throw error;
    }
  }

  async disableMFA(userId, password) {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }
      
      // Update user in database
      await pool.query(`
        UPDATE users
        SET mfa_enabled = false, mfa_secret = NULL, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
      
      // Update user in memory
      user.mfa_enabled = false;
      user.mfa_secret = null;
      
      // Remove secret from memory
      this.mfaSecrets.delete(userId);
      
      logger.info(`MFA disabled for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error disabling MFA:', error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      await pool.query(`
        UPDATE users
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [userId]);
      
      const user = this.users.get(userId);
      if (user) {
        user.last_login = new Date();
      }
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }

  async getUserById(userId) {
    try {
      return this.users.get(userId);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByUsername(username) {
    try {
      return Array.from(this.users.values()).find(u => 
        u.username === username || u.email === username
      );
    } catch (error) {
      logger.error('Error getting user by username:', error);
      return null;
    }
  }

  async updateUser(userId, updates) {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update database
      const fields = [];
      const values = [];
      let paramCount = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && user.hasOwnProperty(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }
      
      if (fields.length === 0) {
        return user;
      }
      
      values.push(userId);
      await pool.query(`
        UPDATE users
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
      `, values);
      
      // Update memory
      Object.assign(user, updates);
      
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update database
      await pool.query(`
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, userId]);
      
      // Update memory
      user.password_hash = hashedPassword;
      
      // Revoke all sessions
      await this.revokeAllUserSessions(userId);
      
      logger.info(`Password changed for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  async lockUser(userId, reason) {
    try {
      await pool.query(`
        UPDATE users
        SET is_locked = true, lock_reason = $1, locked_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [reason, userId]);
      
      const user = this.users.get(userId);
      if (user) {
        user.is_locked = true;
        user.lock_reason = reason;
        user.locked_at = new Date();
      }
      
      // Revoke all sessions
      await this.revokeAllUserSessions(userId);
      
      logger.info(`User locked: ${userId}`, { reason });
      return true;
    } catch (error) {
      logger.error('Error locking user:', error);
      throw error;
    }
  }

  async unlockUser(userId) {
    try {
      await pool.query(`
        UPDATE users
        SET is_locked = false, lock_reason = NULL, locked_at = NULL, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
      
      const user = this.users.get(userId);
      if (user) {
        user.is_locked = false;
        user.lock_reason = null;
        user.locked_at = null;
      }
      
      logger.info(`User unlocked: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error unlocking user:', error);
      throw error;
    }
  }

  async suspendUser(userId, reason, duration = null) {
    try {
      const suspendedUntil = duration ? new Date(Date.now() + duration) : null;
      
      await pool.query(`
        UPDATE users
        SET is_suspended = true, suspension_reason = $1, suspended_until = $2, suspended_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `, [reason, suspendedUntil, userId]);
      
      const user = this.users.get(userId);
      if (user) {
        user.is_suspended = true;
        user.suspension_reason = reason;
        user.suspended_until = suspendedUntil;
        user.suspended_at = new Date();
      }
      
      // Revoke all sessions
      await this.revokeAllUserSessions(userId);
      
      logger.info(`User suspended: ${userId}`, { reason, duration });
      return true;
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  async unsuspendUser(userId) {
    try {
      await pool.query(`
        UPDATE users
        SET is_suspended = false, suspension_reason = NULL, suspended_until = NULL, suspended_at = NULL, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
      
      const user = this.users.get(userId);
      if (user) {
        user.is_suspended = false;
        user.suspension_reason = null;
        user.suspended_until = null;
        user.suspended_at = null;
      }
      
      logger.info(`User unsuspended: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  async getActiveSessions(userId) {
    try {
      const result = await pool.query(`
        SELECT * FROM user_sessions
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  async getSessionStats() {
    try {
      const stats = {
        totalSessions: this.sessions.size,
        activeSessions: 0,
        expiredSessions: 0,
        sessionsByUser: {}
      };
      
      const now = new Date();
      
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.is_active && session.expires_at > now) {
          stats.activeSessions++;
          
          if (!stats.sessionsByUser[session.user_id]) {
            stats.sessionsByUser[session.user_id] = 0;
          }
          stats.sessionsByUser[session.user_id]++;
        } else {
          stats.expiredSessions++;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting session stats:', error);
      throw error;
    }
  }
}

module.exports = IdentityManager;
