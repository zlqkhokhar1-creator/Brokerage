const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
const redis = new Redis(redisConfig);

// Handle Redis errors
redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Test Redis connection
const connectRedis = async () => {
  try {
    await redis.ping();
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    throw error;
  }
};

// Health check
const healthCheck = async () => {
  try {
    const pong = await redis.ping();
    const info = await redis.info('server');
    return {
      status: 'healthy',
      pong,
      info: info.split('\r\n').slice(0, 10) // First 10 lines of info
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Utility functions
const setWithExpiry = async (key, value, ttlSeconds = 3600) => {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Error setting Redis key with expiry:', error);
    return false;
  }
};

const getAndParse = async (key) => {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Error getting and parsing Redis key:', error);
    return null;
  }
};

const incrementCounter = async (key, ttlSeconds = 3600) => {
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    logger.error('Error incrementing Redis counter:', error);
    return 0;
  }
};

const addToSet = async (key, value, ttlSeconds = 3600) => {
  try {
    const result = await redis.sadd(key, value);
    if (result === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return result;
  } catch (error) {
    logger.error('Error adding to Redis set:', error);
    return 0;
  }
};

const getSetMembers = async (key) => {
  try {
    return await redis.smembers(key);
  } catch (error) {
    logger.error('Error getting Redis set members:', error);
    return [];
  }
};

const addToSortedSet = async (key, score, value) => {
  try {
    return await redis.zadd(key, score, value);
  } catch (error) {
    logger.error('Error adding to Redis sorted set:', error);
    return 0;
  }
};

const getSortedSetRange = async (key, start = 0, stop = -1, withScores = false) => {
  try {
    if (withScores) {
      return await redis.zrange(key, start, stop, 'WITHSCORES');
    }
    return await redis.zrange(key, start, stop);
  } catch (error) {
    logger.error('Error getting Redis sorted set range:', error);
    return [];
  }
};

const publishMessage = async (channel, message) => {
  try {
    const subscribers = await redis.publish(channel, JSON.stringify(message));
    logger.debug(`Published message to ${channel}, ${subscribers} subscribers`);
    return subscribers;
  } catch (error) {
    logger.error('Error publishing Redis message:', error);
    return 0;
  }
};

const subscribeToChannel = async (channel, callback) => {
  try {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (receivedChannel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(receivedChannel, parsedMessage);
      } catch (error) {
        logger.error('Error parsing Redis message:', error);
      }
    });

    return subscriber;
  } catch (error) {
    logger.error('Error subscribing to Redis channel:', error);
    return null;
  }
};

// Close Redis connection
const close = async () => {
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
};

module.exports = {
  redis,
  connectRedis,
  healthCheck,
  setWithExpiry,
  getAndParse,
  incrementCounter,
  addToSet,
  getSetMembers,
  addToSortedSet,
  getSortedSetRange,
  publishMessage,
  subscribeToChannel,
  close
};
