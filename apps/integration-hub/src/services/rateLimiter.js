const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
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
    
    this.rateLimits = new Map();
    this.rateLimitCounters = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load rate limits
      await this.loadRateLimits();
      
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

  async loadRateLimits() {
    try {
      const result = await pool.query(`
        SELECT * FROM rate_limits
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const limit of result.rows) {
        this.rateLimits.set(limit.id, {
          ...limit,
          config: limit.config ? JSON.parse(limit.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} rate limits`);
    } catch (error) {
      logger.error('Error loading rate limits:', error);
      throw error;
    }
  }

  async createRateLimit(partnerId, endpoint, limits, window, createdBy) {
    try {
      const rateLimitId = nanoid();
      const rateLimit = {
        id: rateLimitId,
        partner_id: partnerId,
        endpoint: endpoint,
        limits: limits || {},
        window: window || 3600, // 1 hour default
        config: {
          algorithm: 'sliding_window',
          burst_limit: limits.burst || limits.requests,
          soft_limit: limits.soft || Math.floor(limits.requests * 0.8)
        },
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO rate_limits (id, partner_id, endpoint, limits, window, config, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        rateLimitId, partnerId, endpoint, JSON.stringify(limits), rateLimit.window,
        JSON.stringify(rateLimit.config), true, createdBy, rateLimit.created_at, rateLimit.updated_at
      ]);
      
      // Store in memory
      this.rateLimits.set(rateLimitId, rateLimit);
      
      // Store in Redis
      await this.redis.setex(
        `rate_limit:${rateLimitId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(rateLimit)
      );
      
      logger.info(`Rate limit created: ${rateLimitId}`, {
        partnerId,
        endpoint,
        limits
      });
      
      // Emit event
      this.emit('rateLimitCreated', rateLimit);
      
      return rateLimit;
    } catch (error) {
      logger.error('Error creating rate limit:', error);
      throw error;
    }
  }

  async getRateLimits(partnerId, endpoint, userId) {
    try {
      let query = `
        SELECT * FROM rate_limits
        WHERE is_active = true
      `;
      const params = [];
      let paramCount = 1;
      
      if (partnerId) {
        query += ` AND partner_id = $${paramCount}`;
        params.push(partnerId);
        paramCount++;
      }
      
      if (endpoint) {
        query += ` AND endpoint = $${paramCount}`;
        params.push(endpoint);
        paramCount++;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting rate limits:', error);
      throw error;
    }
  }

  async checkRateLimit(partnerId, endpoint, identifier) {
    try {
      const rateLimit = this.findRateLimit(partnerId, endpoint);
      if (!rateLimit) {
        return { allowed: true, remaining: Infinity, resetTime: null };
      }
      
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const now = Date.now();
      const window = rateLimit.window * 1000; // Convert to milliseconds
      
      // Get current count
      const current = await this.redis.get(key);
      const count = current ? parseInt(current) : 0;
      
      // Check if limit exceeded
      if (count >= rateLimit.limits.requests) {
        const ttl = await this.redis.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (ttl * 1000),
          retryAfter: ttl
        };
      }
      
      // Increment counter
      await this.redis.incr(key);
      if (count === 0) {
        await this.redis.expire(key, rateLimit.window);
      }
      
      const remaining = rateLimit.limits.requests - count - 1;
      const resetTime = now + window;
      
      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetTime: resetTime
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async checkRateLimitWithAlgorithm(partnerId, endpoint, identifier, algorithm = 'sliding_window') {
    try {
      const rateLimit = this.findRateLimit(partnerId, endpoint);
      if (!rateLimit) {
        return { allowed: true, remaining: Infinity, resetTime: null };
      }
      
      switch (algorithm) {
        case 'sliding_window':
          return await this.checkSlidingWindowRateLimit(rateLimit, identifier);
        case 'token_bucket':
          return await this.checkTokenBucketRateLimit(rateLimit, identifier);
        case 'fixed_window':
          return await this.checkFixedWindowRateLimit(rateLimit, identifier);
        case 'leaky_bucket':
          return await this.checkLeakyBucketRateLimit(rateLimit, identifier);
        default:
          return await this.checkSlidingWindowRateLimit(rateLimit, identifier);
      }
    } catch (error) {
      logger.error('Error checking rate limit with algorithm:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async checkSlidingWindowRateLimit(rateLimit, identifier) {
    try {
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const now = Date.now();
      const window = rateLimit.window * 1000;
      const limit = rateLimit.limits.requests;
      
      // Get current window start
      const windowStart = Math.floor(now / window) * window;
      const windowKey = `${key}:${windowStart}`;
      
      // Get current count
      const current = await this.redis.get(windowKey);
      const count = current ? parseInt(current) : 0;
      
      if (count >= limit) {
        const nextWindow = windowStart + window;
        return {
          allowed: false,
          remaining: 0,
          resetTime: nextWindow,
          retryAfter: Math.ceil((nextWindow - now) / 1000)
        };
      }
      
      // Increment counter
      await this.redis.incr(windowKey);
      await this.redis.expire(windowKey, rateLimit.window);
      
      const remaining = limit - count - 1;
      const resetTime = windowStart + window;
      
      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetTime: resetTime
      };
    } catch (error) {
      logger.error('Error checking sliding window rate limit:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async checkTokenBucketRateLimit(rateLimit, identifier) {
    try {
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const now = Date.now();
      const limit = rateLimit.limits.requests;
      const window = rateLimit.window * 1000;
      const refillRate = limit / window; // tokens per millisecond
      
      // Get current bucket state
      const bucket = await this.redis.hgetall(key);
      const tokens = bucket.tokens ? parseFloat(bucket.tokens) : limit;
      const lastRefill = bucket.lastRefill ? parseInt(bucket.lastRefill) : now;
      
      // Calculate tokens to add
      const timePassed = now - lastRefill;
      const tokensToAdd = timePassed * refillRate;
      const newTokens = Math.min(limit, tokens + tokensToAdd);
      
      if (newTokens < 1) {
        const nextRefill = Math.ceil((1 - newTokens) / refillRate);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + nextRefill,
          retryAfter: Math.ceil(nextRefill / 1000)
        };
      }
      
      // Consume token
      const updatedTokens = newTokens - 1;
      
      // Update bucket state
      await this.redis.hmset(key, {
        tokens: updatedTokens,
        lastRefill: now
      });
      await this.redis.expire(key, rateLimit.window);
      
      return {
        allowed: true,
        remaining: Math.floor(updatedTokens),
        resetTime: now + window
      };
    } catch (error) {
      logger.error('Error checking token bucket rate limit:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async checkFixedWindowRateLimit(rateLimit, identifier) {
    try {
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const now = Date.now();
      const window = rateLimit.window * 1000;
      const limit = rateLimit.limits.requests;
      
      // Get current window
      const windowStart = Math.floor(now / window) * window;
      const windowKey = `${key}:${windowStart}`;
      
      // Get current count
      const current = await this.redis.get(windowKey);
      const count = current ? parseInt(current) : 0;
      
      if (count >= limit) {
        const nextWindow = windowStart + window;
        return {
          allowed: false,
          remaining: 0,
          resetTime: nextWindow,
          retryAfter: Math.ceil((nextWindow - now) / 1000)
        };
      }
      
      // Increment counter
      await this.redis.incr(windowKey);
      await this.redis.expire(windowKey, rateLimit.window);
      
      const remaining = limit - count - 1;
      const resetTime = windowStart + window;
      
      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetTime: resetTime
      };
    } catch (error) {
      logger.error('Error checking fixed window rate limit:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async checkLeakyBucketRateLimit(rateLimit, identifier) {
    try {
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const now = Date.now();
      const limit = rateLimit.limits.requests;
      const window = rateLimit.window * 1000;
      const leakRate = limit / window; // requests per millisecond
      
      // Get current bucket state
      const bucket = await this.redis.hgetall(key);
      const level = bucket.level ? parseFloat(bucket.level) : 0;
      const lastLeak = bucket.lastLeak ? parseInt(bucket.lastLeak) : now;
      
      // Calculate leaked amount
      const timePassed = now - lastLeak;
      const leaked = timePassed * leakRate;
      const newLevel = Math.max(0, level - leaked);
      
      if (newLevel >= limit) {
        const nextLeak = Math.ceil((newLevel - limit + 1) / leakRate);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + nextLeak,
          retryAfter: Math.ceil(nextLeak / 1000)
        };
      }
      
      // Add request to bucket
      const updatedLevel = newLevel + 1;
      
      // Update bucket state
      await this.redis.hmset(key, {
        level: updatedLevel,
        lastLeak: now
      });
      await this.redis.expire(key, rateLimit.window);
      
      return {
        allowed: true,
        remaining: Math.floor(limit - updatedLevel),
        resetTime: now + window
      };
    } catch (error) {
      logger.error('Error checking leaky bucket rate limit:', error);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  async updateRateLimit(rateLimitId, updates, updatedBy) {
    try {
      const rateLimit = this.rateLimits.get(rateLimitId);
      if (!rateLimit) {
        throw new Error('Rate limit not found');
      }
      
      // Update rate limit
      Object.assign(rateLimit, updates, {
        updated_by: updatedBy,
        updated_at: new Date()
      });
      
      // Update database
      await pool.query(`
        UPDATE rate_limits
        SET partner_id = $1, endpoint = $2, limits = $3, window = $4, config = $5,
            is_active = $6, updated_by = $7, updated_at = $8
        WHERE id = $9
      `, [
        rateLimit.partner_id, rateLimit.endpoint, JSON.stringify(rateLimit.limits),
        rateLimit.window, JSON.stringify(rateLimit.config), rateLimit.is_active,
        updatedBy, rateLimit.updated_at, rateLimitId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `rate_limit:${rateLimitId}`,
        24 * 60 * 60,
        JSON.stringify(rateLimit)
      );
      
      logger.info(`Rate limit updated: ${rateLimitId}`, {
        updatedBy,
        updates: Object.keys(updates)
      });
      
      // Emit event
      this.emit('rateLimitUpdated', rateLimit);
      
      return rateLimit;
    } catch (error) {
      logger.error('Error updating rate limit:', error);
      throw error;
    }
  }

  async deleteRateLimit(rateLimitId, deletedBy) {
    try {
      const rateLimit = this.rateLimits.get(rateLimitId);
      if (!rateLimit) {
        throw new Error('Rate limit not found');
      }
      
      // Soft delete
      rateLimit.is_active = false;
      rateLimit.deleted_by = deletedBy;
      rateLimit.deleted_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE rate_limits
        SET is_active = false, deleted_by = $1, deleted_at = $2, updated_at = $3
        WHERE id = $4
      `, [deletedBy, rateLimit.deleted_at, new Date(), rateLimitId]);
      
      // Remove from memory
      this.rateLimits.delete(rateLimitId);
      
      // Remove from Redis
      await this.redis.del(`rate_limit:${rateLimitId}`);
      
      logger.info(`Rate limit deleted: ${rateLimitId}`, { deletedBy });
      
      // Emit event
      this.emit('rateLimitDeleted', rateLimit);
      
      return true;
    } catch (error) {
      logger.error('Error deleting rate limit:', error);
      throw error;
    }
  }

  async updateAllRateLimits() {
    try {
      const activeRateLimits = Array.from(this.rateLimits.values()).filter(r => r.is_active);
      
      for (const rateLimit of activeRateLimits) {
        await this.updateRateLimitCounters(rateLimit);
      }
      
      logger.info('Rate limits updated', {
        count: activeRateLimits.length
      });
    } catch (error) {
      logger.error('Error updating rate limits:', error);
    }
  }

  async updateRateLimitCounters(rateLimit) {
    try {
      const key = `rate_limit:${rateLimit.id}`;
      const pattern = `${key}:*`;
      
      // Get all keys matching pattern
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
        }
      }
    } catch (error) {
      logger.error('Error updating rate limit counters:', error);
    }
  }

  findRateLimit(partnerId, endpoint) {
    try {
      for (const [rateLimitId, rateLimit] of this.rateLimits.entries()) {
        if (rateLimit.is_active && 
            rateLimit.partner_id === partnerId && 
            rateLimit.endpoint === endpoint) {
          return rateLimit;
        }
      }
      return null;
    } catch (error) {
      logger.error('Error finding rate limit:', error);
      return null;
    }
  }

  async getRateLimitStats(partnerId, endpoint) {
    try {
      const rateLimit = this.findRateLimit(partnerId, endpoint);
      if (!rateLimit) {
        return null;
      }
      
      const key = `rate_limit:${rateLimit.id}`;
      const pattern = `${key}:*`;
      
      // Get all keys matching pattern
      const keys = await this.redis.keys(pattern);
      
      let totalRequests = 0;
      let activeKeys = 0;
      
      for (const key of keys) {
        const count = await this.redis.get(key);
        if (count) {
          totalRequests += parseInt(count);
          activeKeys++;
        }
      }
      
      return {
        rateLimitId: rateLimit.id,
        partnerId: rateLimit.partner_id,
        endpoint: rateLimit.endpoint,
        limit: rateLimit.limits.requests,
        window: rateLimit.window,
        totalRequests,
        activeKeys,
        utilization: (totalRequests / rateLimit.limits.requests) * 100
      };
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      return null;
    }
  }

  async getAllRateLimitStats() {
    try {
      const stats = {
        totalRateLimits: this.rateLimits.size,
        activeRateLimits: Array.from(this.rateLimits.values()).filter(r => r.is_active).length,
        rateLimitsByPartner: {},
        rateLimitsByEndpoint: {}
      };
      
      // Count by partner
      for (const [rateLimitId, rateLimit] of this.rateLimits.entries()) {
        if (rateLimit.is_active) {
          if (!stats.rateLimitsByPartner[rateLimit.partner_id]) {
            stats.rateLimitsByPartner[rateLimit.partner_id] = 0;
          }
          stats.rateLimitsByPartner[rateLimit.partner_id]++;
          
          if (!stats.rateLimitsByEndpoint[rateLimit.endpoint]) {
            stats.rateLimitsByEndpoint[rateLimit.endpoint] = 0;
          }
          stats.rateLimitsByEndpoint[rateLimit.endpoint]++;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting all rate limit stats:', error);
      throw error;
    }
  }

  async resetRateLimit(partnerId, endpoint, identifier) {
    try {
      const rateLimit = this.findRateLimit(partnerId, endpoint);
      if (!rateLimit) {
        throw new Error('Rate limit not found');
      }
      
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      await this.redis.del(key);
      
      logger.info(`Rate limit reset: ${rateLimit.id}`, {
        partnerId,
        endpoint,
        identifier
      });
      
      return true;
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  async getRateLimitUsage(partnerId, endpoint, identifier) {
    try {
      const rateLimit = this.findRateLimit(partnerId, endpoint);
      if (!rateLimit) {
        return null;
      }
      
      const key = `rate_limit:${rateLimit.id}:${identifier}`;
      const count = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      
      return {
        rateLimitId: rateLimit.id,
        partnerId: rateLimit.partner_id,
        endpoint: rateLimit.endpoint,
        identifier: identifier,
        current: count ? parseInt(count) : 0,
        limit: rateLimit.limits.requests,
        remaining: Math.max(0, rateLimit.limits.requests - (count ? parseInt(count) : 0)),
        resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : null,
        ttl: ttl
      };
    } catch (error) {
      logger.error('Error getting rate limit usage:', error);
      return null;
    }
  }
}

module.exports = RateLimiter;
