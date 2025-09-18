const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class CacheManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.cacheStrategies = new Map();
    this.cacheStats = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load cache strategies
      await this.loadCacheStrategies();
      
      // Start cache cleanup
      this.startCacheCleanup();
      
      this._initialized = true;
      logger.info('CacheManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CacheManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('CacheManager closed');
    } catch (error) {
      logger.error('Error closing CacheManager:', error);
    }
  }

  async loadCacheStrategies() {
    try {
      this.cacheStrategies = new Map([
        ['reports', {
          ttl: 3600, // 1 hour
          maxSize: 1000,
          strategy: 'lru',
          compression: true
        }],
        ['dashboards', {
          ttl: 1800, // 30 minutes
          maxSize: 500,
          strategy: 'lru',
          compression: true
        }],
        ['templates', {
          ttl: 7200, // 2 hours
          maxSize: 200,
          strategy: 'lru',
          compression: false
        }],
        ['exports', {
          ttl: 1800, // 30 minutes
          maxSize: 100,
          strategy: 'lru',
          compression: true
        }],
        ['schedules', {
          ttl: 3600, // 1 hour
          maxSize: 300,
          strategy: 'lru',
          compression: false
        }],
        ['user_data', {
          ttl: 900, // 15 minutes
          maxSize: 2000,
          strategy: 'lru',
          compression: false
        }],
        ['performance_metrics', {
          ttl: 300, // 5 minutes
          maxSize: 5000,
          strategy: 'fifo',
          compression: true
        }],
        ['audit_logs', {
          ttl: 86400, // 24 hours
          maxSize: 10000,
          strategy: 'fifo',
          compression: true
        }]
      ]);
      
      logger.info('Cache strategies loaded successfully');
    } catch (error) {
      logger.error('Error loading cache strategies:', error);
      throw error;
    }
  }

  startCacheCleanup() {
    // Clean up expired cache entries every 5 minutes
    setInterval(async () => {
      try {
        await this.cleanupExpiredCache();
      } catch (error) {
        logger.error('Error cleaning up expired cache:', error);
      }
    }, 300000);
    
    // Update cache stats every minute
    setInterval(async () => {
      try {
        await this.updateCacheStats();
      } catch (error) {
        logger.error('Error updating cache stats:', error);
      }
    }, 60000);
  }

  async get(key, category = 'default') {
    try {
      const cacheKey = this.buildCacheKey(key, category);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        // Update cache stats
        this.updateCacheHit(category);
        
        // Parse cached data
        const data = JSON.parse(cached);
        
        // Check if data is compressed
        if (data.compressed) {
          // In production, you'd use a compression library like zlib
          return data.data;
        }
        
        return data.data;
      }
      
      // Update cache miss stats
      this.updateCacheMiss(category);
      
      return null;
    } catch (error) {
      logger.error('Error getting from cache:', error);
      throw error;
    }
  }

  async set(key, value, category = 'default', ttl = null) {
    try {
      const cacheKey = this.buildCacheKey(key, category);
      const strategy = this.cacheStrategies.get(category);
      
      if (!strategy) {
        throw new Error(`Unknown cache category: ${category}`);
      }
      
      // Prepare data for caching
      const cacheData = {
        data: value,
        compressed: strategy.compression,
        timestamp: Date.now(),
        category
      };
      
      // Compress data if needed
      if (strategy.compression) {
        // In production, you'd use a compression library like zlib
        cacheData.compressed = true;
      }
      
      // Set cache with TTL
      const cacheTTL = ttl || strategy.ttl;
      await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(cacheData));
      
      // Update cache size
      await this.updateCacheSize(category);
      
      // Update cache stats
      this.updateCacheSet(category);
      
      this.emit('cacheSet', { key, category, ttl: cacheTTL });
      
      logger.debug(`Cache set: ${cacheKey}`, { category, ttl: cacheTTL });
    } catch (error) {
      logger.error('Error setting cache:', error);
      throw error;
    }
  }

  async del(key, category = 'default') {
    try {
      const cacheKey = this.buildCacheKey(key, category);
      await this.redis.del(cacheKey);
      
      // Update cache stats
      this.updateCacheDelete(category);
      
      this.emit('cacheDelete', { key, category });
      
      logger.debug(`Cache deleted: ${cacheKey}`, { category });
    } catch (error) {
      logger.error('Error deleting from cache:', error);
      throw error;
    }
  }

  async exists(key, category = 'default') {
    try {
      const cacheKey = this.buildCacheKey(key, category);
      const exists = await this.redis.exists(cacheKey);
      
      return exists === 1;
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      throw error;
    }
  }

  async expire(key, category = 'default', ttl) {
    try {
      const cacheKey = this.buildCacheKey(key, category);
      await this.redis.expire(cacheKey, ttl);
      
      logger.debug(`Cache expired: ${cacheKey}`, { category, ttl });
    } catch (error) {
      logger.error('Error setting cache expiration:', error);
      throw error;
    }
  }

  async flush(category = null) {
    try {
      if (category) {
        const pattern = `cache:${category}:*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        
        logger.info(`Cache flushed for category: ${category}`);
      } else {
        await this.redis.flushdb();
        logger.info('All cache flushed');
      }
      
      this.emit('cacheFlush', { category });
    } catch (error) {
      logger.error('Error flushing cache:', error);
      throw error;
    }
  }

  async getOrSet(key, category, fetcher, ttl = null) {
    try {
      // Try to get from cache first
      let value = await this.get(key, category);
      
      if (value === null) {
        // Value not in cache, fetch it
        value = await fetcher();
        
        // Store in cache
        await this.set(key, value, category, ttl);
      }
      
      return value;
    } catch (error) {
      logger.error('Error in getOrSet:', error);
      throw error;
    }
  }

  async mget(keys, category = 'default') {
    try {
      const cacheKeys = keys.map(key => this.buildCacheKey(key, category));
      const cached = await this.redis.mget(...cacheKeys);
      
      const results = {};
      keys.forEach((key, index) => {
        if (cached[index]) {
          const data = JSON.parse(cached[index]);
          results[key] = data.data;
        } else {
          results[key] = null;
        }
      });
      
      return results;
    } catch (error) {
      logger.error('Error in mget:', error);
      throw error;
    }
  }

  async mset(keyValuePairs, category = 'default', ttl = null) {
    try {
      const strategy = this.cacheStrategies.get(category);
      if (!strategy) {
        throw new Error(`Unknown cache category: ${category}`);
      }
      
      const cacheTTL = ttl || strategy.ttl;
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const cacheKey = this.buildCacheKey(key, category);
        const cacheData = {
          data: value,
          compressed: strategy.compression,
          timestamp: Date.now(),
          category
        };
        
        pipeline.setex(cacheKey, cacheTTL, JSON.stringify(cacheData));
      }
      
      await pipeline.exec();
      
      // Update cache stats
      this.updateCacheSet(category, Object.keys(keyValuePairs).length);
      
      logger.debug(`Cache mset completed: ${Object.keys(keyValuePairs).length} keys`, { category });
    } catch (error) {
      logger.error('Error in mset:', error);
      throw error;
    }
  }

  async cleanupExpiredCache() {
    try {
      // Redis automatically handles TTL, but we can clean up any orphaned entries
      const categories = Array.from(this.cacheStrategies.keys());
      
      for (const category of categories) {
        const pattern = `cache:${category}:*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          // Check TTL for each key
          const pipeline = this.redis.pipeline();
          keys.forEach(key => pipeline.ttl(key));
          const ttls = await pipeline.exec();
          
          // Remove keys with TTL of -1 (no expiration) or -2 (expired)
          const keysToDelete = keys.filter((key, index) => {
            const ttl = ttls[index][1];
            return ttl === -1 || ttl === -2;
          });
          
          if (keysToDelete.length > 0) {
            await this.redis.del(...keysToDelete);
            logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries for category: ${category}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up expired cache:', error);
      throw error;
    }
  }

  async updateCacheSize(category) {
    try {
      const strategy = this.cacheStrategies.get(category);
      if (!strategy) return;
      
      const pattern = `cache:${category}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > strategy.maxSize) {
        // Remove oldest entries based on strategy
        await this.evictCacheEntries(category, keys.length - strategy.maxSize);
      }
    } catch (error) {
      logger.error('Error updating cache size:', error);
      throw error;
    }
  }

  async evictCacheEntries(category, count) {
    try {
      const strategy = this.cacheStrategies.get(category);
      if (!strategy) return;
      
      const pattern = `cache:${category}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) return;
      
      let keysToDelete = [];
      
      if (strategy.strategy === 'lru') {
        // Get TTL for all keys to determine oldest
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.ttl(key));
        const ttls = await pipeline.exec();
        
        // Sort by TTL (lower TTL = older)
        const sortedKeys = keys.map((key, index) => ({
          key,
          ttl: ttls[index][1]
        })).sort((a, b) => a.ttl - b.ttl);
        
        keysToDelete = sortedKeys.slice(0, count).map(item => item.key);
      } else if (strategy.strategy === 'fifo') {
        // For FIFO, just take the first N keys
        keysToDelete = keys.slice(0, count);
      }
      
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        logger.debug(`Evicted ${keysToDelete.length} cache entries for category: ${category}`);
      }
    } catch (error) {
      logger.error('Error evicting cache entries:', error);
      throw error;
    }
  }

  async updateCacheStats() {
    try {
      const categories = Array.from(this.cacheStrategies.keys());
      
      for (const category of categories) {
        const pattern = `cache:${category}:*`;
        const keys = await this.redis.keys(pattern);
        
        this.cacheStats.set(category, {
          size: keys.length,
          hits: this.cacheStats.get(category)?.hits || 0,
          misses: this.cacheStats.get(category)?.misses || 0,
          sets: this.cacheStats.get(category)?.sets || 0,
          deletes: this.cacheStats.get(category)?.deletes || 0
        });
      }
    } catch (error) {
      logger.error('Error updating cache stats:', error);
      throw error;
    }
  }

  updateCacheHit(category) {
    const stats = this.cacheStats.get(category) || { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
    stats.hits++;
    this.cacheStats.set(category, stats);
  }

  updateCacheMiss(category) {
    const stats = this.cacheStats.get(category) || { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
    stats.misses++;
    this.cacheStats.set(category, stats);
  }

  updateCacheSet(category, count = 1) {
    const stats = this.cacheStats.get(category) || { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
    stats.sets += count;
    this.cacheStats.set(category, stats);
  }

  updateCacheDelete(category) {
    const stats = this.cacheStats.get(category) || { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
    stats.deletes++;
    this.cacheStats.set(category, stats);
  }

  buildCacheKey(key, category) {
    return `cache:${category}:${key}`;
  }

  async getCacheStats() {
    try {
      const stats = {};
      
      for (const [category, data] of this.cacheStats.entries()) {
        const total = data.hits + data.misses;
        stats[category] = {
          ...data,
          hitRate: total > 0 ? (data.hits / total) * 100 : 0,
          missRate: total > 0 ? (data.misses / total) * 100 : 0
        };
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw error;
    }
  }

  async getCacheStrategies() {
    try {
      return Array.from(this.cacheStrategies.entries()).map(([key, config]) => ({
        category: key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting cache strategies:', error);
      throw error;
    }
  }

  async getCacheInfo() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: {
          used: info.match(/used_memory:(\d+)/)?.[1] || 0,
          peak: info.match(/used_memory_peak:(\d+)/)?.[1] || 0,
          fragmentation: info.match(/mem_fragmentation_ratio:([\d.]+)/)?.[1] || 0
        },
        keyspace: keyspace.match(/db0:keys=(\d+)/)?.[1] || 0,
        stats: await this.getCacheStats()
      };
    } catch (error) {
      logger.error('Error getting cache info:', error);
      throw error;
    }
  }
}

module.exports = CacheManager;
