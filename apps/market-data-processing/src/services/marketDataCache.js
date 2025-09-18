const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MarketDataCache extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.cacheStats = new Map();
    this.cachePolicies = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load cache policies
      await this.loadCachePolicies();
      
      // Start cache cleanup process
      this.startCacheCleanup();
      
      this._initialized = true;
      logger.info('MarketDataCache initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MarketDataCache:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MarketDataCache closed');
    } catch (error) {
      logger.error('Error closing MarketDataCache:', error);
    }
  }

  async loadCachePolicies() {
    try {
      this.cachePolicies = new Map([
        ['price', {
          ttl: 300, // 5 minutes
          maxSize: 1000,
          compression: true,
          priority: 'high'
        }],
        ['quote', {
          ttl: 60, // 1 minute
          maxSize: 5000,
          compression: false,
          priority: 'high'
        }],
        ['trade', {
          ttl: 1800, // 30 minutes
          maxSize: 10000,
          compression: true,
          priority: 'medium'
        }],
        ['ohlc', {
          ttl: 3600, // 1 hour
          maxSize: 2000,
          compression: true,
          priority: 'medium'
        }],
        ['indicator', {
          ttl: 1800, // 30 minutes
          maxSize: 500,
          compression: true,
          priority: 'low'
        }]
      ]);
      
      logger.info('Cache policies loaded successfully');
    } catch (error) {
      logger.error('Error loading cache policies:', error);
      throw error;
    }
  }

  startCacheCleanup() {
    // Run cache cleanup every 5 minutes
    setInterval(async () => {
      try {
        await this.cleanupExpiredData();
      } catch (error) {
        logger.error('Error during cache cleanup:', error);
      }
    }, 5 * 60 * 1000);
  }

  async getCachedData(symbol, dataType, timeRange, userId) {
    try {
      const cacheKey = this.buildCacheKey(symbol, dataType, timeRange);
      
      logger.info(`Getting cached data for ${symbol}`, {
        cacheKey,
        dataType,
        timeRange,
        userId
      });

      // Try to get from Redis cache
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        // Update cache stats
        this.updateCacheStats(cacheKey, 'hit');
        
        const data = JSON.parse(cached);
        
        // Check if data is still valid
        if (this.isDataValid(data, dataType)) {
          logger.info(`Cache hit for ${symbol}`, { cacheKey });
          return data;
        } else {
          // Data is expired, remove from cache
          await this.redis.del(cacheKey);
          this.updateCacheStats(cacheKey, 'expired');
        }
      }
      
      // Cache miss, get from database
      this.updateCacheStats(cacheKey, 'miss');
      
      const data = await this.getDataFromDatabase(symbol, dataType, timeRange, userId);
      
      if (data) {
        // Cache the data
        await this.cacheData(cacheKey, data, dataType);
      }
      
      return data;
    } catch (error) {
      logger.error('Error getting cached data:', error);
      throw error;
    }
  }

  async cacheData(cacheKey, data, dataType) {
    try {
      const policy = this.cachePolicies.get(dataType);
      if (!policy) {
        logger.warn(`No cache policy found for data type: ${dataType}`);
        return;
      }

      // Prepare data for caching
      const cacheData = {
        data,
        dataType,
        cachedAt: new Date().toISOString(),
        ttl: policy.ttl,
        compressed: policy.compression
      };

      // Compress data if needed
      if (policy.compression) {
        cacheData.data = await this.compressData(data);
      }

      // Store in Redis with TTL
      await this.redis.setex(cacheKey, policy.ttl, JSON.stringify(cacheData));
      
      // Update cache stats
      this.updateCacheStats(cacheKey, 'stored');
      
      logger.info(`Data cached for ${cacheKey}`, {
        dataType,
        ttl: policy.ttl,
        compressed: policy.compression
      });
      
    } catch (error) {
      logger.error('Error caching data:', error);
      throw error;
    }
  }

  async clearCache(symbol, dataType, timeRange, userId) {
    try {
      const cacheKey = this.buildCacheKey(symbol, dataType, timeRange);
      
      logger.info(`Clearing cache for ${symbol}`, {
        cacheKey,
        dataType,
        timeRange,
        userId
      });

      // Remove from Redis
      const deleted = await this.redis.del(cacheKey);
      
      if (deleted > 0) {
        this.updateCacheStats(cacheKey, 'cleared');
        logger.info(`Cache cleared for ${cacheKey}`);
      }
      
      return {
        success: true,
        cacheKey,
        deleted
      };
    } catch (error) {
      logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  buildCacheKey(symbol, dataType, timeRange) {
    return `market_data:${symbol}:${dataType}:${timeRange}`;
  }

  isDataValid(data, dataType) {
    try {
      const policy = this.cachePolicies.get(dataType);
      if (!policy) {
        return false;
      }

      const cachedAt = new Date(data.cachedAt);
      const now = new Date();
      const age = (now - cachedAt) / 1000; // Age in seconds
      
      return age < policy.ttl;
    } catch (error) {
      logger.error('Error validating data:', error);
      return false;
    }
  }

  async getDataFromDatabase(symbol, dataType, timeRange, userId) {
    try {
      // Mock implementation - in production, this would query the database
      const now = new Date();
      const data = [];
      
      // Generate mock data based on time range
      let dataPoints = 100;
      let interval = 60000; // 1 minute
      
      switch (timeRange) {
        case '1h':
          dataPoints = 60;
          interval = 60000;
          break;
        case '1d':
          dataPoints = 1440;
          interval = 60000;
          break;
        case '1w':
          dataPoints = 10080;
          interval = 60000;
          break;
        case '1m':
          dataPoints = 43200;
          interval = 60000;
          break;
      }
      
      for (let i = 0; i < dataPoints; i++) {
        const timestamp = new Date(now.getTime() - (dataPoints - i) * interval);
        data.push({
          timestamp: timestamp.toISOString(),
          symbol,
          dataType,
          price: 100 + Math.random() * 10,
          volume: Math.floor(Math.random() * 1000000),
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10
        });
      }
      
      return data;
    } catch (error) {
      logger.error('Error getting data from database:', error);
      throw error;
    }
  }

  async compressData(data) {
    try {
      // Mock compression - in production, use actual compression library
      return {
        compressed: true,
        originalSize: JSON.stringify(data).length,
        compressedSize: Math.floor(JSON.stringify(data).length * 0.7),
        data: data
      };
    } catch (error) {
      logger.error('Error compressing data:', error);
      throw error;
    }
  }

  async decompressData(compressedData) {
    try {
      // Mock decompression - in production, use actual decompression library
      return compressedData.data;
    } catch (error) {
      logger.error('Error decompressing data:', error);
      throw error;
    }
  }

  updateCacheStats(cacheKey, operation) {
    try {
      const stats = this.cacheStats.get(cacheKey) || {
        hits: 0,
        misses: 0,
        stores: 0,
        clears: 0,
        expires: 0
      };
      
      switch (operation) {
        case 'hit':
          stats.hits++;
          break;
        case 'miss':
          stats.misses++;
          break;
        case 'stored':
          stats.stores++;
          break;
        case 'cleared':
          stats.clears++;
          break;
        case 'expired':
          stats.expires++;
          break;
      }
      
      this.cacheStats.set(cacheKey, stats);
    } catch (error) {
      logger.error('Error updating cache stats:', error);
    }
  }

  async cleanupExpiredData() {
    try {
      const keys = await this.redis.keys('market_data:*');
      let cleaned = 0;
      
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (!this.isDataValid(parsed, parsed.dataType)) {
              await this.redis.del(key);
              cleaned++;
            }
          }
        } catch (error) {
          // If we can't parse the data, it's probably corrupted, so delete it
          await this.redis.del(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} expired cache entries`);
      }
      
    } catch (error) {
      logger.error('Error cleaning up expired data:', error);
    }
  }

  async getCacheStats() {
    try {
      const stats = {
        totalKeys: this.cacheStats.size,
        totalHits: 0,
        totalMisses: 0,
        totalStores: 0,
        totalClears: 0,
        totalExpires: 0,
        hitRate: 0,
        byDataType: {}
      };
      
      for (const [key, keyStats] of this.cacheStats) {
        stats.totalHits += keyStats.hits;
        stats.totalMisses += keyStats.misses;
        stats.totalStores += keyStats.stores;
        stats.totalClears += keyStats.clears;
        stats.totalExpires += keyStats.expires;
        
        // Extract data type from key
        const parts = key.split(':');
        if (parts.length >= 3) {
          const dataType = parts[2];
          if (!stats.byDataType[dataType]) {
            stats.byDataType[dataType] = {
              hits: 0,
              misses: 0,
              stores: 0,
              clears: 0,
              expires: 0
            };
          }
          
          stats.byDataType[dataType].hits += keyStats.hits;
          stats.byDataType[dataType].misses += keyStats.misses;
          stats.byDataType[dataType].stores += keyStats.stores;
          stats.byDataType[dataType].clears += keyStats.clears;
          stats.byDataType[dataType].expires += keyStats.expires;
        }
      }
      
      const totalRequests = stats.totalHits + stats.totalMisses;
      stats.hitRate = totalRequests > 0 ? (stats.totalHits / totalRequests) * 100 : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw error;
    }
  }

  async getCachePolicy(dataType) {
    try {
      return this.cachePolicies.get(dataType);
    } catch (error) {
      logger.error('Error getting cache policy:', error);
      throw error;
    }
  }

  async setCachePolicy(dataType, policy) {
    try {
      this.cachePolicies.set(dataType, policy);
      logger.info(`Cache policy updated for ${dataType}`, policy);
    } catch (error) {
      logger.error('Error setting cache policy:', error);
      throw error;
    }
  }

  async getCacheSize() {
    try {
      const info = await this.redis.info('memory');
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
      const maxMemory = info.match(/maxmemory:(\d+)/)?.[1];
      
      return {
        usedMemory: parseInt(usedMemory) || 0,
        maxMemory: parseInt(maxMemory) || 0,
        usagePercentage: maxMemory > 0 ? (parseInt(usedMemory) / parseInt(maxMemory)) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting cache size:', error);
      throw error;
    }
  }

  async flushCache() {
    try {
      await this.redis.flushdb();
      this.cacheStats.clear();
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error('Error flushing cache:', error);
      throw error;
    }
  }
}

module.exports = MarketDataCache;
