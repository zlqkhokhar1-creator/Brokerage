const Redis = require('ioredis');
const { logger } = require('./logger');

class RedisService {
  constructor() {
    this.client = null;
    this._initialized = false;
  }

  async initialize() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Test connection
      await this.client.ping();
      this._initialized = true;
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        this._initialized = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        return await this.client.setex(key, ttl, value);
      } else {
        return await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  async hget(key, field) {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      throw error;
    }
  }

  async hset(key, field, value) {
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error:', error);
      throw error;
    }
  }

  async hgetall(key) {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      throw error;
    }
  }

  async lpush(key, ...values) {
    try {
      return await this.client.lpush(key, ...values);
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      throw error;
    }
  }

  async rpop(key) {
    try {
      return await this.client.rpop(key);
    } catch (error) {
      logger.error('Redis RPOP error:', error);
      throw error;
    }
  }

  async llen(key) {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error('Redis LLEN error:', error);
      throw error;
    }
  }

  async sadd(key, ...members) {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      logger.error('Redis SADD error:', error);
      throw error;
    }
  }

  async smembers(key) {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error);
      throw error;
    }
  }

  async srem(key, ...members) {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      logger.error('Redis SREM error:', error);
      throw error;
    }
  }

  async zadd(key, score, member) {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      logger.error('Redis ZADD error:', error);
      throw error;
    }
  }

  async zrange(key, start, stop) {
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      logger.error('Redis ZRANGE error:', error);
      throw error;
    }
  }

  async zrem(key, ...members) {
    try {
      return await this.client.zrem(key, ...members);
    } catch (error) {
      logger.error('Redis ZREM error:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isInitialized() {
    return this._initialized;
  }
}

const redisService = new RedisService();

module.exports = { redisService };
