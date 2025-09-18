const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class SecurityManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.securityPolicies = new Map();
    this.threatLevels = new Map();
    this.securityRules = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load security policies and rules
      await this.loadSecurityPolicies();
      await this.loadThreatLevels();
      await this.loadSecurityRules();
      
      this._initialized = true;
      logger.info('SecurityManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecurityManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('SecurityManager closed');
    } catch (error) {
      logger.error('Error closing SecurityManager:', error);
    }
  }

  async loadSecurityPolicies() {
    try {
      this.securityPolicies = new Map([
        ['password_policy', {
          name: 'Password Policy',
          description: 'Password complexity and security requirements',
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90, // days
          preventReuse: 5, // last 5 passwords
          lockoutAttempts: 5,
          lockoutDuration: 30 // minutes
        }],
        ['session_policy', {
          name: 'Session Policy',
          description: 'Session security and management',
          maxDuration: 480, // minutes (8 hours)
          idleTimeout: 30, // minutes
          requireReauth: true,
          secureOnly: true,
          httpOnly: true,
          sameSite: 'strict'
        }],
        ['api_security', {
          name: 'API Security',
          description: 'API access and rate limiting',
          rateLimit: 1000, // requests per hour
          burstLimit: 100, // requests per minute
          requireAuth: true,
          requireHTTPS: true,
          maxRequestSize: 10485760, // 10MB
          timeout: 30000 // 30 seconds
        }],
        ['data_encryption', {
          name: 'Data Encryption',
          description: 'Data encryption and protection',
          encryptAtRest: true,
          encryptInTransit: true,
          keyRotation: 90, // days
          algorithm: 'aes-256-gcm',
          keyLength: 256
        }],
        ['access_control', {
          name: 'Access Control',
          description: 'Access control and permissions',
          requireMFA: true,
          maxConcurrentSessions: 3,
          ipWhitelist: false,
          geoRestrictions: false,
          timeRestrictions: false
        }]
      ]);
      
      logger.info('Security policies loaded successfully');
    } catch (error) {
      logger.error('Error loading security policies:', error);
      throw error;
    }
  }

  async loadThreatLevels() {
    try {
      this.threatLevels = new Map([
        ['low', {
          name: 'Low Threat',
          description: 'Minimal security risk',
          color: 'green',
          actions: ['log', 'monitor'],
          escalation: false
        }],
        ['medium', {
          name: 'Medium Threat',
          description: 'Moderate security risk',
          color: 'yellow',
          actions: ['log', 'monitor', 'alert'],
          escalation: false
        }],
        ['high', {
          name: 'High Threat',
          description: 'Significant security risk',
          color: 'orange',
          actions: ['log', 'monitor', 'alert', 'block'],
          escalation: true
        }],
        ['critical', {
          name: 'Critical Threat',
          description: 'Immediate security risk',
          color: 'red',
          actions: ['log', 'monitor', 'alert', 'block', 'lockout'],
          escalation: true
        }]
      ]);
      
      logger.info('Threat levels loaded successfully');
    } catch (error) {
      logger.error('Error loading threat levels:', error);
      throw error;
    }
  }

  async loadSecurityRules() {
    try {
      this.securityRules = new Map([
        ['brute_force_detection', {
          name: 'Brute Force Detection',
          description: 'Detect and prevent brute force attacks',
          enabled: true,
          maxAttempts: 5,
          timeWindow: 15, // minutes
          action: 'lockout',
          duration: 30 // minutes
        }],
        ['suspicious_login', {
          name: 'Suspicious Login Detection',
          description: 'Detect suspicious login patterns',
          enabled: true,
          checkIP: true,
          checkLocation: true,
          checkDevice: true,
          action: 'alert'
        }],
        ['data_exfiltration', {
          name: 'Data Exfiltration Detection',
          description: 'Detect unauthorized data access',
          enabled: true,
          maxDataSize: 104857600, // 100MB
          timeWindow: 60, // minutes
          action: 'block'
        }],
        ['sql_injection', {
          name: 'SQL Injection Detection',
          description: 'Detect SQL injection attempts',
          enabled: true,
          patterns: [
            /union.*select/i,
            /drop.*table/i,
            /insert.*into/i,
            /delete.*from/i,
            /update.*set/i
          ],
          action: 'block'
        }],
        ['xss_attack', {
          name: 'XSS Attack Detection',
          description: 'Detect cross-site scripting attacks',
          enabled: true,
          patterns: [
            /<script.*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe.*>/i
          ],
          action: 'block'
        }],
        ['rate_limiting', {
          name: 'Rate Limiting',
          description: 'Prevent API abuse and DoS attacks',
          enabled: true,
          maxRequests: 1000,
          timeWindow: 3600, // 1 hour
          action: 'throttle'
        }]
      ]);
      
      logger.info('Security rules loaded successfully');
    } catch (error) {
      logger.error('Error loading security rules:', error);
      throw error;
    }
  }

  async validatePassword(password, userId = null) {
    try {
      const policy = this.securityPolicies.get('password_policy');
      const violations = [];
      
      // Check minimum length
      if (password.length < policy.minLength) {
        violations.push(`Password must be at least ${policy.minLength} characters long`);
      }
      
      // Check for uppercase letters
      if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        violations.push('Password must contain at least one uppercase letter');
      }
      
      // Check for lowercase letters
      if (policy.requireLowercase && !/[a-z]/.test(password)) {
        violations.push('Password must contain at least one lowercase letter');
      }
      
      // Check for numbers
      if (policy.requireNumbers && !/\d/.test(password)) {
        violations.push('Password must contain at least one number');
      }
      
      // Check for special characters
      if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        violations.push('Password must contain at least one special character');
      }
      
      // Check password reuse if userId provided
      if (userId && policy.preventReuse > 0) {
        const isReused = await this.checkPasswordReuse(userId, password);
        if (isReused) {
          violations.push(`Password cannot be one of the last ${policy.preventReuse} passwords`);
        }
      }
      
      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      logger.error('Error validating password:', error);
      throw error;
    }
  }

  async checkPasswordReuse(userId, password) {
    try {
      const query = `
        SELECT password_hash FROM password_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const policy = this.securityPolicies.get('password_policy');
      const result = await pool.query(query, [userId, policy.preventReuse]);
      
      for (const row of result.rows) {
        const isMatch = await bcrypt.compare(password, row.password_hash);
        if (isMatch) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking password reuse:', error);
      throw error;
    }
  }

  async hashPassword(password) {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw error;
    }
  }

  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw error;
    }
  }

  async generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Error generating secure token:', error);
      throw error;
    }
  }

  async generateAPIKey() {
    try {
      const prefix = 'brk_';
      const randomPart = crypto.randomBytes(32).toString('hex');
      return `${prefix}${randomPart}`;
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw error;
    }
  }

  async encryptData(data, key = null) {
    try {
      const algorithm = 'aes-256-gcm';
      const encryptionKey = key || process.env.ENCRYPTION_KEY;
      
      if (!encryptionKey) {
        throw new Error('Encryption key not provided');
      }
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, encryptionKey);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Error encrypting data:', error);
      throw error;
    }
  }

  async decryptData(encryptedData, key = null) {
    try {
      const algorithm = 'aes-256-gcm';
      const decryptionKey = key || process.env.ENCRYPTION_KEY;
      
      if (!decryptionKey) {
        throw new Error('Decryption key not provided');
      }
      
      const decipher = crypto.createDecipher(algorithm, decryptionKey);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting data:', error);
      throw error;
    }
  }

  async detectThreats(request, user = null) {
    try {
      const threats = [];
      
      // Check for brute force attacks
      const bruteForceThreat = await this.detectBruteForce(request, user);
      if (bruteForceThreat) {
        threats.push(bruteForceThreat);
      }
      
      // Check for suspicious login patterns
      const suspiciousLoginThreat = await this.detectSuspiciousLogin(request, user);
      if (suspiciousLoginThreat) {
        threats.push(suspiciousLoginThreat);
      }
      
      // Check for SQL injection
      const sqlInjectionThreat = await this.detectSQLInjection(request);
      if (sqlInjectionThreat) {
        threats.push(sqlInjectionThreat);
      }
      
      // Check for XSS attacks
      const xssThreat = await this.detectXSSAttack(request);
      if (xssThreat) {
        threats.push(xssThreat);
      }
      
      // Check for data exfiltration
      const dataExfiltrationThreat = await this.detectDataExfiltration(request, user);
      if (dataExfiltrationThreat) {
        threats.push(dataExfiltrationThreat);
      }
      
      // Check rate limiting
      const rateLimitThreat = await this.detectRateLimitViolation(request, user);
      if (rateLimitThreat) {
        threats.push(rateLimitThreat);
      }
      
      return threats;
    } catch (error) {
      logger.error('Error detecting threats:', error);
      throw error;
    }
  }

  async detectBruteForce(request, user) {
    try {
      const rule = this.securityRules.get('brute_force_detection');
      if (!rule.enabled) return null;
      
      const ipAddress = request.ip || request.connection.remoteAddress;
      const cacheKey = `brute_force:${ipAddress}`;
      
      // Get current attempt count
      const attempts = await this.redis.get(cacheKey) || 0;
      const attemptCount = parseInt(attempts) + 1;
      
      // Store updated count
      await this.redis.setex(cacheKey, rule.timeWindow * 60, attemptCount);
      
      if (attemptCount >= rule.maxAttempts) {
        return {
          type: 'brute_force',
          level: 'high',
          message: `Brute force attack detected from IP ${ipAddress}`,
          details: {
            ipAddress,
            attemptCount,
            timeWindow: rule.timeWindow
          },
          action: rule.action,
          duration: rule.duration
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting brute force:', error);
      throw error;
    }
  }

  async detectSuspiciousLogin(request, user) {
    try {
      const rule = this.securityRules.get('suspicious_login');
      if (!rule.enabled || !user) return null;
      
      const ipAddress = request.ip || request.connection.remoteAddress;
      const userAgent = request.get('User-Agent');
      
      // Check if IP is different from usual
      if (rule.checkIP) {
        const usualIPs = await this.getUserUsualIPs(user.id);
        if (usualIPs.length > 0 && !usualIPs.includes(ipAddress)) {
          return {
            type: 'suspicious_login',
            level: 'medium',
            message: `Suspicious login from new IP address`,
            details: {
              userId: user.id,
              ipAddress,
              usualIPs
            },
            action: rule.action
          };
        }
      }
      
      // Check if location is different from usual
      if (rule.checkLocation) {
        const location = await this.getIPLocation(ipAddress);
        const usualLocations = await this.getUserUsualLocations(user.id);
        
        if (location && usualLocations.length > 0) {
          const isUnusualLocation = !usualLocations.some(usual => 
            this.calculateDistance(location, usual) < 100 // 100km radius
          );
          
          if (isUnusualLocation) {
            return {
              type: 'suspicious_login',
              level: 'medium',
              message: `Suspicious login from unusual location`,
              details: {
                userId: user.id,
                ipAddress,
                location,
                usualLocations
              },
              action: rule.action
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting suspicious login:', error);
      throw error;
    }
  }

  async detectSQLInjection(request) {
    try {
      const rule = this.securityRules.get('sql_injection');
      if (!rule.enabled) return null;
      
      const queryString = request.query;
      const body = request.body;
      const params = { ...queryString, ...body };
      
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          for (const pattern of rule.patterns) {
            if (pattern.test(value)) {
              return {
                type: 'sql_injection',
                level: 'high',
                message: `SQL injection attempt detected in parameter: ${key}`,
                details: {
                  parameter: key,
                  value: value,
                  pattern: pattern.toString()
                },
                action: rule.action
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting SQL injection:', error);
      throw error;
    }
  }

  async detectXSSAttack(request) {
    try {
      const rule = this.securityRules.get('xss_attack');
      if (!rule.enabled) return null;
      
      const queryString = request.query;
      const body = request.body;
      const params = { ...queryString, ...body };
      
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          for (const pattern of rule.patterns) {
            if (pattern.test(value)) {
              return {
                type: 'xss_attack',
                level: 'high',
                message: `XSS attack attempt detected in parameter: ${key}`,
                details: {
                  parameter: key,
                  value: value,
                  pattern: pattern.toString()
                },
                action: rule.action
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting XSS attack:', error);
      throw error;
    }
  }

  async detectDataExfiltration(request, user) {
    try {
      const rule = this.securityRules.get('data_exfiltration');
      if (!rule.enabled || !user) return null;
      
      const dataSize = JSON.stringify(request.body).length;
      const cacheKey = `data_exfiltration:${user.id}`;
      
      // Get current data size for user
      const currentSize = await this.redis.get(cacheKey) || 0;
      const totalSize = parseInt(currentSize) + dataSize;
      
      // Store updated size
      await this.redis.setex(cacheKey, rule.timeWindow * 60, totalSize);
      
      if (totalSize > rule.maxDataSize) {
        return {
          type: 'data_exfiltration',
          level: 'high',
          message: `Data exfiltration detected for user ${user.id}`,
          details: {
            userId: user.id,
            dataSize: totalSize,
            maxDataSize: rule.maxDataSize,
            timeWindow: rule.timeWindow
          },
          action: rule.action
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting data exfiltration:', error);
      throw error;
    }
  }

  async detectRateLimitViolation(request, user) {
    try {
      const rule = this.securityRules.get('rate_limiting');
      if (!rule.enabled) return null;
      
      const identifier = user ? user.id : request.ip;
      const cacheKey = `rate_limit:${identifier}`;
      
      // Get current request count
      const requests = await this.redis.get(cacheKey) || 0;
      const requestCount = parseInt(requests) + 1;
      
      // Store updated count
      await this.redis.setex(cacheKey, rule.timeWindow, requestCount);
      
      if (requestCount > rule.maxRequests) {
        return {
          type: 'rate_limit_violation',
          level: 'medium',
          message: `Rate limit exceeded for ${user ? 'user' : 'IP'}: ${identifier}`,
          details: {
            identifier,
            requestCount,
            maxRequests: rule.maxRequests,
            timeWindow: rule.timeWindow
          },
          action: rule.action
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting rate limit violation:', error);
      throw error;
    }
  }

  async handleThreat(threat) {
    try {
      const threatId = nanoid();
      const timestamp = new Date().toISOString();
      
      // Store threat
      await this.storeThreat({
        id: threatId,
        type: threat.type,
        level: threat.level,
        message: threat.message,
        details: threat.details,
        action: threat.action,
        timestamp: timestamp,
        resolved: false
      });
      
      // Execute action
      await this.executeThreatAction(threat);
      
      this.emit('threatDetected', { threatId, threat });
      
      logger.warn(`Threat detected: ${threatId}`, {
        type: threat.type,
        level: threat.level,
        action: threat.action
      });
      
      return { threatId, threat };
    } catch (error) {
      logger.error('Error handling threat:', error);
      throw error;
    }
  }

  async executeThreatAction(threat) {
    try {
      switch (threat.action) {
        case 'block':
          await this.blockUser(threat.details.identifier);
          break;
        case 'lockout':
          await this.lockoutUser(threat.details.identifier, threat.duration);
          break;
        case 'alert':
          await this.sendSecurityAlert(threat);
          break;
        case 'throttle':
          await this.throttleUser(threat.details.identifier);
          break;
        default:
          logger.warn(`Unknown threat action: ${threat.action}`);
      }
    } catch (error) {
      logger.error('Error executing threat action:', error);
      throw error;
    }
  }

  async blockUser(identifier) {
    try {
      const cacheKey = `blocked:${identifier}`;
      await this.redis.setex(cacheKey, 3600, 'true'); // Block for 1 hour
      
      logger.info(`User blocked: ${identifier}`);
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  async lockoutUser(identifier, duration = 30) {
    try {
      const cacheKey = `lockout:${identifier}`;
      await this.redis.setex(cacheKey, duration * 60, 'true');
      
      logger.info(`User locked out: ${identifier} for ${duration} minutes`);
    } catch (error) {
      logger.error('Error locking out user:', error);
      throw error;
    }
  }

  async throttleUser(identifier) {
    try {
      const cacheKey = `throttled:${identifier}`;
      await this.redis.setex(cacheKey, 300, 'true'); // Throttle for 5 minutes
      
      logger.info(`User throttled: ${identifier}`);
    } catch (error) {
      logger.error('Error throttling user:', error);
      throw error;
    }
  }

  async sendSecurityAlert(threat) {
    try {
      // This would integrate with actual alerting services
      logger.warn(`Security alert: ${threat.type}`, {
        level: threat.level,
        message: threat.message,
        details: threat.details
      });
    } catch (error) {
      logger.error('Error sending security alert:', error);
      throw error;
    }
  }

  async storeThreat(threatRecord) {
    try {
      const query = `
        INSERT INTO security_threats (
          id, type, level, message, details, action, timestamp, resolved
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        threatRecord.id,
        threatRecord.type,
        threatRecord.level,
        threatRecord.message,
        JSON.stringify(threatRecord.details),
        threatRecord.action,
        threatRecord.timestamp,
        threatRecord.resolved
      ]);
      
      logger.info(`Threat stored: ${threatRecord.id}`);
    } catch (error) {
      logger.error('Error storing threat:', error);
      throw error;
    }
  }

  async getSecurityPolicies() {
    try {
      return Array.from(this.securityPolicies.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting security policies:', error);
      throw error;
    }
  }

  async getThreatLevels() {
    try {
      return Array.from(this.threatLevels.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting threat levels:', error);
      throw error;
    }
  }

  async getSecurityRules() {
    try {
      return Array.from(this.securityRules.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting security rules:', error);
      throw error;
    }
  }

  async getSecurityStats() {
    try {
      const query = `
        SELECT 
          type,
          level,
          COUNT(*) as count,
          COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count
        FROM security_threats 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY type, level
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting security stats:', error);
      throw error;
    }
  }
}

module.exports = SecurityManager;
