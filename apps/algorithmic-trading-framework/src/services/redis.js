const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    if (redisClient) {
      return redisClient;
    }

    const redisConfig = {
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
      maxMemoryPolicy: 'allkeys-lru'
    };

    redisClient = new Redis(redisConfig);

    // Handle connection events
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready for operations');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

// Redis utility functions
const redisUtils = {
  // Set with expiration
  async setex(key, seconds, value) {
    const client = getRedisClient();
    return await client.setex(key, seconds, value);
  },

  // Get value
  async get(key) {
    const client = getRedisClient();
    return await client.get(key);
  },

  // Set value
  async set(key, value) {
    const client = getRedisClient();
    return await client.set(key, value);
  },

  // Delete key
  async del(key) {
    const client = getRedisClient();
    return await client.del(key);
  },

  // Check if key exists
  async exists(key) {
    const client = getRedisClient();
    return await client.exists(key);
  },

  // Set expiration
  async expire(key, seconds) {
    const client = getRedisClient();
    return await client.expire(key, seconds);
  },

  // Get TTL
  async ttl(key) {
    const client = getRedisClient();
    return await client.ttl(key);
  },

  // Increment counter
  async incr(key) {
    const client = getRedisClient();
    return await client.incr(key);
  },

  // Increment by amount
  async incrby(key, amount) {
    const client = getRedisClient();
    return await client.incrby(key, amount);
  },

  // Decrement counter
  async decr(key) {
    const client = getRedisClient();
    return await client.decr(key);
  },

  // Decrement by amount
  async decrby(key, amount) {
    const client = getRedisClient();
    return await client.decrby(key, amount);
  },

  // Hash operations
  async hset(key, field, value) {
    const client = getRedisClient();
    return await client.hset(key, field, value);
  },

  async hget(key, field) {
    const client = getRedisClient();
    return await client.hget(key, field);
  },

  async hgetall(key) {
    const client = getRedisClient();
    return await client.hgetall(key);
  },

  async hdel(key, field) {
    const client = getRedisClient();
    return await client.hdel(key, field);
  },

  // List operations
  async lpush(key, ...values) {
    const client = getRedisClient();
    return await client.lpush(key, ...values);
  },

  async rpush(key, ...values) {
    const client = getRedisClient();
    return await client.rpush(key, ...values);
  },

  async lpop(key) {
    const client = getRedisClient();
    return await client.lpop(key);
  },

  async rpop(key) {
    const client = getRedisClient();
    return await client.rpop(key);
  },

  async lrange(key, start, stop) {
    const client = getRedisClient();
    return await client.lrange(key, start, stop);
  },

  async llen(key) {
    const client = getRedisClient();
    return await client.llen(key);
  },

  // Set operations
  async sadd(key, ...members) {
    const client = getRedisClient();
    return await client.sadd(key, ...members);
  },

  async srem(key, ...members) {
    const client = getRedisClient();
    return await client.srem(key, ...members);
  },

  async smembers(key) {
    const client = getRedisClient();
    return await client.smembers(key);
  },

  async sismember(key, member) {
    const client = getRedisClient();
    return await client.sismember(key, member);
  },

  // Sorted set operations
  async zadd(key, score, member) {
    const client = getRedisClient();
    return await client.zadd(key, score, member);
  },

  async zrem(key, member) {
    const client = getRedisClient();
    return await client.zrem(key, member);
  },

  async zrange(key, start, stop, withScores = false) {
    const client = getRedisClient();
    return await client.zrange(key, start, stop, withScores ? 'WITHSCORES' : '');
  },

  async zrevrange(key, start, stop, withScores = false) {
    const client = getRedisClient();
    return await client.zrevrange(key, start, stop, withScores ? 'WITHSCORES' : '');
  },

  async zremrangebyrank(key, start, stop) {
    const client = getRedisClient();
    return await client.zremrangebyrank(key, start, stop);
  },

  async zcard(key) {
    const client = getRedisClient();
    return await client.zcard(key);
  },

  // Key operations
  async keys(pattern) {
    const client = getRedisClient();
    return await client.keys(pattern);
  },

  async scan(cursor, pattern, count) {
    const client = getRedisClient();
    return await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
  },

  // Pub/Sub operations
  async publish(channel, message) {
    const client = getRedisClient();
    return await client.publish(channel, message);
  },

  async subscribe(channel) {
    const client = getRedisClient();
    return await client.subscribe(channel);
  },

  async unsubscribe(channel) {
    const client = getRedisClient();
    return await client.unsubscribe(channel);
  },

  // Transaction operations
  async multi() {
    const client = getRedisClient();
    return client.multi();
  },

  // Pipeline operations
  async pipeline() {
    const client = getRedisClient();
    return client.pipeline();
  },

  // Lua script execution
  async eval(script, keys, args) {
    const client = getRedisClient();
    return await client.eval(script, keys.length, ...keys, ...args);
  },

  // Health check
  async ping() {
    const client = getRedisClient();
    return await client.ping();
  },

  // Get info
  async info(section) {
    const client = getRedisClient();
    return await client.info(section);
  },

  // Get memory usage
  async memoryUsage(key) {
    const client = getRedisClient();
    return await client.memory('usage', key);
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  ...redisUtils
};

