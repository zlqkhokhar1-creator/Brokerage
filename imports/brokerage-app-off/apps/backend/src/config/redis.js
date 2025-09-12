/**
 * Redis Configuration and Caching Service
 * Session storage, caching, and rate limiting
 */

const Redis = require('redis');
const { logger } = require('../utils/logger');

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_delayOnFailover: 100,
  retry_delayOnClusterDown: 300,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
const client = Redis.createClient(redisConfig);

// Error handling
client.on('error', (err) => {
  logger.error('Redis client error', { error: err.message, stack: err.stack });
});

client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

client.on('end', () => {
  logger.info('Redis client connection ended');
});

client.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Connect to Redis
client.connect().catch((err) => {
  logger.error('Failed to connect to Redis', { error: err.message });
});

// Cache service
const cacheService = {
  // Basic operations
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await client.setEx(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      throw error;
    }
  },

  async get(key) {
    try {
      const value = await client.get(key);
      if (value === null) {
        logger.debug('Cache miss', { key });
        return null;
      }
      logger.debug('Cache hit', { key });
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null; // Return null on error to avoid breaking the application
    }
  },

  async del(key) {
    try {
      const result = await client.del(key);
      logger.debug('Cache delete', { key, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      throw error;
    }
  },

  async exists(key) {
    try {
      return await client.exists(key);
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  },

  async ttl(key) {
    try {
      return await client.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', { key, error: error.message });
      return -1;
    }
  },

  // Pattern operations
  async keys(pattern) {
    try {
      return await client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error', { pattern, error: error.message });
      return [];
    }
  },

  async deletePattern(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        const result = await client.del(keys);
        logger.debug('Cache pattern delete', { pattern, deleted: result });
        return result;
      }
      return 0;
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error: error.message });
      throw error;
    }
  },

  // Hash operations (for structured data)
  async hset(key, field, value, ttl = null) {
    try {
      const serializedValue = JSON.stringify(value);
      await client.hSet(key, field, serializedValue);
      if (ttl) {
        await client.expire(key, ttl);
      }
      logger.debug('Cache hash set', { key, field, ttl });
    } catch (error) {
      logger.error('Cache hash set error', { key, field, error: error.message });
      throw error;
    }
  },

  async hget(key, field) {
    try {
      const value = await client.hGet(key, field);
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache hash get error', { key, field, error: error.message });
      return null;
    }
  },

  async hgetall(key) {
    try {
      const hash = await client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error('Cache hash get all error', { key, error: error.message });
      return {};
    }
  },

  // List operations (for queues, etc.)
  async lpush(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      return await client.lPush(key, serializedValue);
    } catch (error) {
      logger.error('Cache list push error', { key, error: error.message });
      throw error;
    }
  },

  async rpop(key) {
    try {
      const value = await client.rPop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache list pop error', { key, error: error.message });
      return null;
    }
  },

  // Increment operations (for counters)
  async incr(key, ttl = null) {
    try {
      const result = await client.incr(key);
      if (ttl && result === 1) { // Only set TTL on first increment
        await client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Cache increment error', { key, error: error.message });
      throw error;
    }
  },

  async incrby(key, increment, ttl = null) {
    try {
      const result = await client.incrBy(key, increment);
      if (ttl) {
        await client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Cache increment by error', { key, increment, error: error.message });
      throw error;
    }
  }
};

// Session service
const sessionService = {
  async createSession(sessionId, userData, ttl = 86400) { // 24 hours default
    await cacheService.set(`session:${sessionId}`, userData, ttl);
  },

  async getSession(sessionId) {
    return await cacheService.get(`session:${sessionId}`);
  },

  async updateSession(sessionId, userData, ttl = 86400) {
    await cacheService.set(`session:${sessionId}`, userData, ttl);
  },

  async destroySession(sessionId) {
    await cacheService.del(`session:${sessionId}`);
  },

  async destroyAllUserSessions(userId) {
    const pattern = `session:*`;
    const keys = await cacheService.keys(pattern);
    
    for (const key of keys) {
      const session = await cacheService.get(key);
      if (session && session.userId === userId) {
        await cacheService.del(key);
      }
    }
  }
};

// Rate limiting service
const rateLimitService = {
  async isRateLimited(key, limit, window) {
    try {
      const current = await cacheService.incr(`rate_limit:${key}`, window);
      return current > limit;
    } catch (error) {
      logger.error('Rate limit check error', { key, error: error.message });
      return false; // Allow request on error
    }
  },

  async getRemainingRequests(key, limit, window) {
    try {
      const current = await cacheService.get(`rate_limit:${key}`) || 0;
      return Math.max(0, limit - current);
    } catch (error) {
      logger.error('Rate limit remaining error', { key, error: error.message });
      return limit; // Return full limit on error
    }
  },

  async resetRateLimit(key) {
    await cacheService.del(`rate_limit:${key}`);
  }
};

// Market data caching
const marketDataCache = {
  async getStockQuote(symbol) {
    return await cacheService.get(`quote:${symbol}`);
  },

  async setStockQuote(symbol, quote, ttl = 60) { // 1 minute cache
    await cacheService.set(`quote:${symbol}`, quote, ttl);
  },

  async getCompanyProfile(symbol) {
    return await cacheService.get(`profile:${symbol}`);
  },

  async setCompanyProfile(symbol, profile, ttl = 3600) { // 1 hour cache
    await cacheService.set(`profile:${symbol}`, profile, ttl);
  },

  async getMarketNews(category = 'general') {
    return await cacheService.get(`news:${category}`);
  },

  async setMarketNews(category, news, ttl = 300) { // 5 minutes cache
    await cacheService.set(`news:${category}`, news, ttl);
  },

  async invalidateSymbol(symbol) {
    await cacheService.deletePattern(`*:${symbol}`);
  }
};

// Health check
const healthCheck = async () => {
  try {
    await client.ping();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Closing Redis connection...');
  await client.quit();
  logger.info('Redis connection closed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  client,
  cacheService,
  sessionService,
  rateLimitService,
  marketDataCache,
  healthCheck,
  shutdown
};
