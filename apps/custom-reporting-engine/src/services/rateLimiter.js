const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class RateLimiter extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.rateLimitRules = new Map();
    this.rateLimitCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load rate limit rules
      await this.loadRateLimitRules();
      
      this._initialized = true;
      logger.info('RateLimiter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RateLimiter:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('RateLimiter closed');
    } catch (error) {
      logger.error('Error closing RateLimiter:', error);
    }
  }

  async loadRateLimitRules() {
    try {
      this.rateLimitRules = new Map([
        ['api_requests', {
          name: 'API Requests',
          description: 'Rate limit for API requests',
          window: 3600, // 1 hour
          limit: 1000,
          burst: 100,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['report_generation', {
          name: 'Report Generation',
          description: 'Rate limit for report generation',
          window: 3600, // 1 hour
          limit: 50,
          burst: 10,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['dashboard_creation', {
          name: 'Dashboard Creation',
          description: 'Rate limit for dashboard creation',
          window: 3600, // 1 hour
          limit: 20,
          burst: 5,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['export_creation', {
          name: 'Export Creation',
          description: 'Rate limit for export creation',
          window: 3600, // 1 hour
          limit: 100,
          burst: 20,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['template_creation', {
          name: 'Template Creation',
          description: 'Rate limit for template creation',
          window: 3600, // 1 hour
          limit: 30,
          burst: 5,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['schedule_creation', {
          name: 'Schedule Creation',
          description: 'Rate limit for schedule creation',
          window: 3600, // 1 hour
          limit: 20,
          burst: 5,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['user_login', {
          name: 'User Login',
          description: 'Rate limit for user login attempts',
          window: 900, // 15 minutes
          limit: 10,
          burst: 3,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['password_reset', {
          name: 'Password Reset',
          description: 'Rate limit for password reset requests',
          window: 3600, // 1 hour
          limit: 5,
          burst: 2,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['email_verification', {
          name: 'Email Verification',
          description: 'Rate limit for email verification requests',
          window: 3600, // 1 hour
          limit: 10,
          burst: 3,
          strategy: 'sliding_window',
          enabled: true
        }],
        ['file_upload', {
          name: 'File Upload',
          description: 'Rate limit for file uploads',
          window: 3600, // 1 hour
          limit: 100,
          burst: 20,
          strategy: 'sliding_window',
          enabled: true
        }]
      ]);
      
      logger.info('Rate limit rules loaded successfully');
    } catch (error) {
      logger.error('Error loading rate limit rules:', error);
      throw error;
    }
  }

  async checkRateLimit(identifier, ruleName, options = {}) {
    try {
      const rule = this.rateLimitRules.get(ruleName);
      if (!rule || !rule.enabled) {
        return { allowed: true, remaining: 0, resetTime: 0 };
      }
      
      const key = `${ruleName}:${identifier}`;
      const now = Date.now();
      const window = rule.window * 1000; // Convert to milliseconds
      
      let result;
      
      switch (rule.strategy) {
        case 'sliding_window':
          result = await this.checkSlidingWindow(key, rule, now, window);
          break;
        case 'fixed_window':
          result = await this.checkFixedWindow(key, rule, now, window);
          break;
        case 'token_bucket':
          result = await this.checkTokenBucket(key, rule, now, window);
          break;
        default:
          throw new Error(`Unknown rate limit strategy: ${rule.strategy}`);
      }
      
      // Store rate limit attempt
      await this.storeRateLimitAttempt(identifier, ruleName, result);
      
      this.emit('rateLimitChecked', { identifier, ruleName, result });
      
      return result;
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      throw error;
    }
  }

  async checkSlidingWindow(key, rule, now, window) {
    try {
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, now - window);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${nanoid()}`);
      
      // Set expiration
      pipeline.expire(key, rule.window);
      
      const results = await pipeline.exec();
      const currentCount = results[1][1];
      
      if (currentCount >= rule.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + window,
          limit: rule.limit,
          current: currentCount
        };
      }
      
      return {
        allowed: true,
        remaining: rule.limit - currentCount - 1,
        resetTime: now + window,
        limit: rule.limit,
        current: currentCount + 1
      };
    } catch (error) {
      logger.error('Error checking sliding window rate limit:', error);
      throw error;
    }
  }

  async checkFixedWindow(key, rule, now, window) {
    try {
      const windowStart = Math.floor(now / window) * window;
      const windowKey = `${key}:${windowStart}`;
      
      const pipeline = this.redis.pipeline();
      
      // Get current count
      pipeline.get(windowKey);
      
      // Increment count
      pipeline.incr(windowKey);
      
      // Set expiration
      pipeline.expire(windowKey, rule.window);
      
      const results = await pipeline.exec();
      const currentCount = results[1][1];
      
      if (currentCount > rule.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + window,
          limit: rule.limit,
          current: currentCount
        };
      }
      
      return {
        allowed: true,
        remaining: rule.limit - currentCount,
        resetTime: windowStart + window,
        limit: rule.limit,
        current: currentCount
      };
    } catch (error) {
      logger.error('Error checking fixed window rate limit:', error);
      throw error;
    }
  }

  async checkTokenBucket(key, rule, now, window) {
    try {
      const pipeline = this.redis.pipeline();
      
      // Get current bucket state
      pipeline.hmget(key, 'tokens', 'lastRefill');
      
      const results = await pipeline.exec();
      const bucketData = results[0][1];
      
      let tokens = rule.burst;
      let lastRefill = now;
      
      if (bucketData[0] !== null) {
        tokens = parseInt(bucketData[0]);
        lastRefill = parseInt(bucketData[1]);
      }
      
      // Calculate tokens to add based on time passed
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor((timePassed / window) * rule.limit);
      
      if (tokensToAdd > 0) {
        tokens = Math.min(rule.burst, tokens + tokensToAdd);
        lastRefill = now;
      }
      
      if (tokens <= 0) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + window,
          limit: rule.limit,
          current: 0
        };
      }
      
      // Consume a token
      tokens--;
      
      // Update bucket state
      const updatePipeline = this.redis.pipeline();
      updatePipeline.hmset(key, 'tokens', tokens, 'lastRefill', lastRefill);
      updatePipeline.expire(key, rule.window);
      await updatePipeline.exec();
      
      return {
        allowed: true,
        remaining: tokens,
        resetTime: now + window,
        limit: rule.limit,
        current: rule.burst - tokens
      };
    } catch (error) {
      logger.error('Error checking token bucket rate limit:', error);
      throw error;
    }
  }

  async storeRateLimitAttempt(identifier, ruleName, result) {
    try {
      const query = `
        INSERT INTO rate_limit_attempts (
          id, identifier, rule_name, allowed, remaining, reset_time, 
          limit_value, current_count, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        nanoid(),
        identifier,
        ruleName,
        result.allowed,
        result.remaining,
        new Date(result.resetTime),
        result.limit,
        result.current,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing rate limit attempt:', error);
      throw error;
    }
  }

  async getRateLimitStatus(identifier, ruleName) {
    try {
      const rule = this.rateLimitRules.get(ruleName);
      if (!rule || !rule.enabled) {
        return { allowed: true, remaining: 0, resetTime: 0 };
      }
      
      const key = `${ruleName}:${identifier}`;
      const now = Date.now();
      const window = rule.window * 1000;
      
      let currentCount = 0;
      let resetTime = now + window;
      
      switch (rule.strategy) {
        case 'sliding_window':
          currentCount = await this.redis.zcard(key);
          break;
        case 'fixed_window':
          const windowStart = Math.floor(now / window) * window;
          const windowKey = `${key}:${windowStart}`;
          const count = await this.redis.get(windowKey);
          currentCount = count ? parseInt(count) : 0;
          resetTime = windowStart + window;
          break;
        case 'token_bucket':
          const bucketData = await this.redis.hmget(key, 'tokens', 'lastRefill');
          if (bucketData[0] !== null) {
            currentCount = rule.burst - parseInt(bucketData[0]);
          }
          break;
      }
      
      return {
        allowed: currentCount < rule.limit,
        remaining: Math.max(0, rule.limit - currentCount),
        resetTime: resetTime,
        limit: rule.limit,
        current: currentCount
      };
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      throw error;
    }
  }

  async resetRateLimit(identifier, ruleName) {
    try {
      const key = `${ruleName}:${identifier}`;
      await this.redis.del(key);
      
      logger.info(`Rate limit reset for ${identifier} on rule ${ruleName}`);
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  async getRateLimitStats(ruleName = null, timeRange = '24h') {
    try {
      let query = `
        SELECT 
          rule_name,
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN allowed = true THEN 1 END) as allowed_attempts,
          COUNT(CASE WHEN allowed = false THEN 1 END) as blocked_attempts,
          AVG(remaining) as avg_remaining
        FROM rate_limit_attempts 
        WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
      `;
      
      const params = [];
      if (ruleName) {
        query += ' AND rule_name = $1';
        params.push(ruleName);
      }
      
      query += ' GROUP BY rule_name ORDER BY total_attempts DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      throw error;
    }
  }

  async getRateLimitRules() {
    try {
      return Array.from(this.rateLimitRules.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting rate limit rules:', error);
      throw error;
    }
  }

  async updateRateLimitRule(ruleName, updates) {
    try {
      const rule = this.rateLimitRules.get(ruleName);
      if (!rule) {
        throw new Error(`Rate limit rule not found: ${ruleName}`);
      }
      
      // Update rule
      Object.assign(rule, updates);
      this.rateLimitRules.set(ruleName, rule);
      
      // Store in database
      const query = `
        INSERT INTO rate_limit_rules (name, config, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET
          config = EXCLUDED.config,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        ruleName,
        JSON.stringify(rule),
        new Date().toISOString()
      ]);
      
      logger.info(`Rate limit rule updated: ${ruleName}`);
    } catch (error) {
      logger.error('Error updating rate limit rule:', error);
      throw error;
    }
  }

  async createRateLimitRule(ruleName, config) {
    try {
      if (this.rateLimitRules.has(ruleName)) {
        throw new Error(`Rate limit rule already exists: ${ruleName}`);
      }
      
      // Add rule
      this.rateLimitRules.set(ruleName, config);
      
      // Store in database
      const query = `
        INSERT INTO rate_limit_rules (name, config, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(query, [
        ruleName,
        JSON.stringify(config),
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      logger.info(`Rate limit rule created: ${ruleName}`);
    } catch (error) {
      logger.error('Error creating rate limit rule:', error);
      throw error;
    }
  }

  async deleteRateLimitRule(ruleName) {
    try {
      if (!this.rateLimitRules.has(ruleName)) {
        throw new Error(`Rate limit rule not found: ${ruleName}`);
      }
      
      // Remove rule
      this.rateLimitRules.delete(ruleName);
      
      // Remove from database
      const query = 'DELETE FROM rate_limit_rules WHERE name = $1';
      await pool.query(query, [ruleName]);
      
      logger.info(`Rate limit rule deleted: ${ruleName}`);
    } catch (error) {
      logger.error('Error deleting rate limit rule:', error);
      throw error;
    }
  }

  async clearRateLimitData(ruleName = null) {
    try {
      if (ruleName) {
        // Clear specific rule data
        const pattern = `${ruleName}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Clear all rate limit data
        const pattern = '*:*';
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      logger.info(`Rate limit data cleared for rule: ${ruleName || 'all'}`);
    } catch (error) {
      logger.error('Error clearing rate limit data:', error);
      throw error;
    }
  }

  async getRateLimitViolations(ruleName = null, timeRange = '24h') {
    try {
      let query = `
        SELECT 
          identifier,
          rule_name,
          COUNT(*) as violation_count,
          MAX(timestamp) as last_violation
        FROM rate_limit_attempts 
        WHERE allowed = false AND timestamp >= NOW() - INTERVAL '${timeRange}'
      `;
      
      const params = [];
      if (ruleName) {
        query += ' AND rule_name = $1';
        params.push(ruleName);
      }
      
      query += ' GROUP BY identifier, rule_name ORDER BY violation_count DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting rate limit violations:', error);
      throw error;
    }
  }
}

module.exports = RateLimiter;
