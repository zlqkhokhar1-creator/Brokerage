const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  try {
    if (redisClient && redisClient.status === 'ready') {
      return redisClient;
    }

    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 5000,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false
    };

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis client disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

module.exports = {
  connectRedis,
  disconnectRedis
};

