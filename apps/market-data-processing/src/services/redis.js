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
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 1000,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableAutoPipelining: true,
      maxLoadingTimeout: 1000
    };

    redisClient = new Redis(redisConfig);

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connected', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });
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

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test connection
    await redisClient.ping();
    logger.info('Redis connection test successful');

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

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis client disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis client:', error);
    throw error;
  }
};

// Redis utility functions
const redisUtils = {
  // Set data with TTL
  async setex(key, ttl, value) {
    const client = getRedisClient();
    return await client.setex(key, ttl, value);
  },

  // Get data
  async get(key) {
    const client = getRedisClient();
    return await client.get(key);
  },

  // Set data
  async set(key, value) {
    const client = getRedisClient();
    return await client.set(key, value);
  },

  // Delete data
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
  async expire(key, ttl) {
    const client = getRedisClient();
    return await client.expire(key, ttl);
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

  // Increment counter with TTL
  async incrWithTTL(key, ttl) {
    const client = getRedisClient();
    const result = await client.incr(key);
    if (result === 1) {
      await client.expire(key, ttl);
    }
    return result;
  },

  // Decrement counter
  async decr(key) {
    const client = getRedisClient();
    return await client.decr(key);
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
  async lpush(key, value) {
    const client = getRedisClient();
    return await client.lpush(key, value);
  },

  async rpush(key, value) {
    const client = getRedisClient();
    return await client.rpush(key, value);
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
  async sadd(key, member) {
    const client = getRedisClient();
    return await client.sadd(key, member);
  },

  async srem(key, member) {
    const client = getRedisClient();
    return await client.srem(key, member);
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

  async zscore(key, member) {
    const client = getRedisClient();
    return await client.zscore(key, member);
  },

  // Pub/Sub operations
  async publish(channel, message) {
    const client = getRedisClient();
    return await client.publish(channel, message);
  },

  async subscribe(channel, callback) {
    const client = getRedisClient();
    await client.subscribe(channel);
    client.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  },

  async unsubscribe(channel) {
    const client = getRedisClient();
    return await client.unsubscribe(channel);
  },

  // Pattern operations
  async keys(pattern) {
    const client = getRedisClient();
    return await client.keys(pattern);
  },

  async scan(cursor, pattern, count) {
    const client = getRedisClient();
    return await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
  },

  // Transaction operations
  async multi() {
    const client = getRedisClient();
    return client.multi();
  },

  async exec(transaction) {
    return await transaction.exec();
  },

  // Pipeline operations
  async pipeline() {
    const client = getRedisClient();
    return client.pipeline();
  },

  async execPipeline(pipeline) {
    return await pipeline.exec();
  },

  // Utility functions
  async flushdb() {
    const client = getRedisClient();
    return await client.flushdb();
  },

  async flushall() {
    const client = getRedisClient();
    return await client.flushall();
  },

  async info(section) {
    const client = getRedisClient();
    return await client.info(section);
  },

  async config(action, key, value) {
    const client = getRedisClient();
    return await client.config(action, key, value);
  },

  // Health check
  async ping() {
    const client = getRedisClient();
    return await client.ping();
  },

  // Get client info
  getClientInfo() {
    if (!redisClient) {
      return null;
    }
    return {
      status: redisClient.status,
      host: redisClient.options.host,
      port: redisClient.options.port,
      db: redisClient.options.db,
      connected: redisClient.status === 'ready'
    };
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  ...redisUtils
};
