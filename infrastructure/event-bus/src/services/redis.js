const redis = require('redis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const stringValue = JSON.stringify(value);
      await this.client.setex(key, ttl, stringValue);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async zadd(key, score, member) {
    try {
      await this.client.zadd(key, score, member);
      return true;
    } catch (error) {
      logger.error('Redis ZADD error:', error);
      return false;
    }
  }

  async zrange(key, start, stop) {
    try {
      const result = await this.client.zrange(key, start, stop);
      return result;
    } catch (error) {
      logger.error('Redis ZRANGE error:', error);
      return [];
    }
  }

  async zrem(key, member) {
    try {
      await this.client.zrem(key, member);
      return true;
    } catch (error) {
      logger.error('Redis ZREM error:', error);
      return false;
    }
  }

  async healthCheck() {
    try {
      await this.client.ping();
      return { status: 'healthy', service: 'redis' };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', service: 'redis', error: error.message };
    }
  }

  async close() {
    try {
      await this.client.quit();
      logger.info('Redis client closed');
    } catch (error) {
      logger.error('Error closing Redis client:', error);
    }
  }
}

module.exports = new RedisService();

