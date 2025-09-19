const redis = require('redis');
const logger = require('../utils/logger');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
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

client.on('connect', () => {
  logger.info('Connected to Redis');
});

client.on('error', (err) => {
  logger.error('Redis error:', err);
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

const get = async (key) => {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const set = async (key, value, expireInSeconds = null) => {
  try {
    const stringValue = JSON.stringify(value);
    if (expireInSeconds) {
      await client.setex(key, expireInSeconds, stringValue);
    } else {
      await client.set(key, stringValue);
    }
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

const del = async (key) => {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

const exists = async (key) => {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis exists error:', error);
    return false;
  }
};

const close = async () => {
  try {
    await client.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

module.exports = {
  client,
  get,
  set,
  del,
  exists,
  close
};