const Redis = require('ioredis');
const { logger } = require('./logger');

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this._initialized = false;
  }

  async initialize() {
    try {
      // Create main Redis client
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Create subscriber client
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Create publisher client
      this.publisher = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Connect to Redis
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();

      // Test connection
      await this.client.ping();
      await this.subscriber.ping();
      await this.publisher.ping();

      this._initialized = true;
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis service:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      this._initialized = false;
      logger.info('Redis service closed');
    } catch (error) {
      logger.error('Error closing Redis service:', error);
    }
  }

  // Cache operations
  async set(key, value, ttl = 3600) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error setting cache:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error getting cache:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Error deleting cache:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      throw error;
    }
  }

  async expire(key, ttl) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Error setting cache expiration:', error);
      throw error;
    }
  }

  // Hash operations
  async hset(key, field, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error setting hash field:', error);
      throw error;
    }
  }

  async hget(key, field) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error getting hash field:', error);
      throw error;
    }
  }

  async hgetall(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const hash = await this.client.hgetall(key);
      const result = {};
      
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch (parseError) {
          result[field] = value;
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting all hash fields:', error);
      throw error;
    }
  }

  async hdel(key, field) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Error deleting hash field:', error);
      throw error;
    }
  }

  // List operations
  async lpush(key, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.lpush(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error pushing to list:', error);
      throw error;
    }
  }

  async rpush(key, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.rpush(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error pushing to list:', error);
      throw error;
    }
  }

  async lpop(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const value = await this.client.lpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error popping from list:', error);
      throw error;
    }
  }

  async rpop(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const value = await this.client.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error popping from list:', error);
      throw error;
    }
  }

  async lrange(key, start, stop) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const values = await this.client.lrange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          return value;
        }
      });
    } catch (error) {
      logger.error('Error getting list range:', error);
      throw error;
    }
  }

  // Set operations
  async sadd(key, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.sadd(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error adding to set:', error);
      throw error;
    }
  }

  async srem(key, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.srem(key, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error removing from set:', error);
      throw error;
    }
  }

  async smembers(key) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const values = await this.client.smembers(key);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          return value;
        }
      });
    } catch (error) {
      logger.error('Error getting set members:', error);
      throw error;
    }
  }

  async sismember(key, value) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedValue = JSON.stringify(value);
      const result = await this.client.sismember(key, serializedValue);
      return result === 1;
    } catch (error) {
      logger.error('Error checking set membership:', error);
      throw error;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const serializedMessage = JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
      return true;
    } catch (error) {
      logger.error('Error publishing message:', error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (parseError) {
            callback(message);
          }
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error subscribing to channel:', error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      logger.error('Error unsubscribing from channel:', error);
      throw error;
    }
  }

  // Utility operations
  async keys(pattern) {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      logger.error('Error getting keys:', error);
      throw error;
    }
  }

  async flushdb() {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error('Error flushing database:', error);
      throw error;
    }
  }

  async info() {
    try {
      if (!this._initialized) {
        throw new Error('Redis service not initialized');
      }
      
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Error getting Redis info:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this._initialized) {
        return { status: 'not_initialized', message: 'Redis service not initialized' };
      }
      
      await this.client.ping();
      return { status: 'healthy', message: 'Redis service is healthy' };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;
