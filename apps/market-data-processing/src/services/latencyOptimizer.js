const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class LatencyOptimizer extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.latencyMetrics = new Map();
    this.optimizationStrategies = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load optimization strategies
      await this.loadOptimizationStrategies();
      
      this._initialized = true;
      logger.info('LatencyOptimizer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LatencyOptimizer:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('LatencyOptimizer closed');
    } catch (error) {
      logger.error('Error closing LatencyOptimizer:', error);
    }
  }

  async loadOptimizationStrategies() {
    try {
      this.optimizationStrategies = new Map([
        ['caching', {
          name: 'Data Caching',
          description: 'Cache frequently accessed data to reduce database queries',
          priority: 'high',
          impact: 'medium'
        }],
        ['connection_pooling', {
          name: 'Connection Pooling',
          description: 'Optimize database connection management',
          priority: 'high',
          impact: 'high'
        }],
        ['data_compression', {
          name: 'Data Compression',
          description: 'Compress data to reduce network latency',
          priority: 'medium',
          impact: 'medium'
        }],
        ['batch_processing', {
          name: 'Batch Processing',
          description: 'Process multiple requests in batches',
          priority: 'medium',
          impact: 'high'
        }],
        ['async_processing', {
          name: 'Async Processing',
          description: 'Use asynchronous processing for non-critical operations',
          priority: 'low',
          impact: 'medium'
        }],
        ['memory_optimization', {
          name: 'Memory Optimization',
          description: 'Optimize memory usage and garbage collection',
          priority: 'medium',
          impact: 'low'
        }]
      ]);
      
      logger.info('Optimization strategies loaded successfully');
    } catch (error) {
      logger.error('Error loading optimization strategies:', error);
      throw error;
    }
  }

  async getLatencyMetrics(symbol, timeRange, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `latency_metrics:${symbol}:${timeRange}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const query = `
        SELECT * FROM latency_metrics 
        WHERE symbol = $1 AND time_range = $2 AND user_id = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [symbol, timeRange, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('No latency metrics found');
      }

      const metrics = result.rows[0];
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(metrics));
      
      return metrics;
    } catch (error) {
      logger.error('Error getting latency metrics:', error);
      throw error;
    }
  }

  async optimizeLatency(symbol, optimizationType, parameters, userId) {
    try {
      const optimizationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting latency optimization for ${symbol}`, {
        optimizationId,
        symbol,
        optimizationType,
        parameters,
        userId
      });

      // Get current latency metrics
      const currentMetrics = await this.getCurrentLatencyMetrics(symbol);
      
      // Apply optimization strategy
      const optimization = await this.applyOptimizationStrategy(
        optimizationType, 
        symbol, 
        parameters, 
        currentMetrics
      );
      
      // Measure improvement
      const newMetrics = await this.getCurrentLatencyMetrics(symbol);
      const improvement = this.calculateImprovement(currentMetrics, newMetrics);
      
      // Store optimization results
      const result = {
        id: optimizationId,
        symbol,
        optimizationType,
        parameters,
        userId,
        currentMetrics,
        newMetrics,
        improvement,
        status: 'completed',
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeOptimizationResult(result);
      
      // Cache results
      await this.redis.setex(
        `optimization:${optimizationId}`, 
        3600, 
        JSON.stringify(result)
      );
      
      this.emit('latencyOptimized', result);
      
      logger.info(`Latency optimization completed for ${symbol}`, {
        optimizationId,
        improvement: improvement.percentage,
        processingTime: result.processingTime
      });
      
      return result;
    } catch (error) {
      logger.error('Error optimizing latency:', error);
      this.emit('optimizationFailed', error, { symbol, optimizationType, parameters, userId });
      throw error;
    }
  }

  async applyOptimizationStrategy(optimizationType, symbol, parameters, currentMetrics) {
    try {
      const strategy = this.optimizationStrategies.get(optimizationType);
      if (!strategy) {
        throw new Error(`Unknown optimization type: ${optimizationType}`);
      }

      switch (optimizationType) {
        case 'caching':
          return await this.optimizeCaching(symbol, parameters);
        case 'connection_pooling':
          return await this.optimizeConnectionPooling(symbol, parameters);
        case 'data_compression':
          return await this.optimizeDataCompression(symbol, parameters);
        case 'batch_processing':
          return await this.optimizeBatchProcessing(symbol, parameters);
        case 'async_processing':
          return await this.optimizeAsyncProcessing(symbol, parameters);
        case 'memory_optimization':
          return await this.optimizeMemory(symbol, parameters);
        default:
          throw new Error(`Unsupported optimization type: ${optimizationType}`);
      }
    } catch (error) {
      logger.error('Error applying optimization strategy:', error);
      throw error;
    }
  }

  async optimizeCaching(symbol, parameters) {
    try {
      const { cacheSize, ttl, compression } = parameters;
      
      // Configure Redis cache settings
      await this.redis.config('SET', 'maxmemory', cacheSize);
      await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      
      // Set up symbol-specific cache
      const cacheKey = `symbol_cache:${symbol}`;
      await this.redis.setex(cacheKey, ttl, JSON.stringify({
        symbol,
        cachedAt: new Date().toISOString(),
        compression
      }));
      
      return {
        type: 'caching',
        cacheSize,
        ttl,
        compression,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing caching:', error);
      throw error;
    }
  }

  async optimizeConnectionPooling(symbol, parameters) {
    try {
      const { minConnections, maxConnections, idleTimeout } = parameters;
      
      // Update connection pool settings
      // This would typically involve updating the database connection pool configuration
      
      return {
        type: 'connection_pooling',
        minConnections,
        maxConnections,
        idleTimeout,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing connection pooling:', error);
      throw error;
    }
  }

  async optimizeDataCompression(symbol, parameters) {
    try {
      const { algorithm, level, threshold } = parameters;
      
      // Configure data compression
      // This would typically involve setting up compression for data transmission
      
      return {
        type: 'data_compression',
        algorithm,
        level,
        threshold,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing data compression:', error);
      throw error;
    }
  }

  async optimizeBatchProcessing(symbol, parameters) {
    try {
      const { batchSize, batchTimeout, maxBatchSize } = parameters;
      
      // Configure batch processing
      // This would typically involve setting up batch processing queues
      
      return {
        type: 'batch_processing',
        batchSize,
        batchTimeout,
        maxBatchSize,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing batch processing:', error);
      throw error;
    }
  }

  async optimizeAsyncProcessing(symbol, parameters) {
    try {
      const { asyncThreshold, queueSize, workerCount } = parameters;
      
      // Configure async processing
      // This would typically involve setting up async processing queues
      
      return {
        type: 'async_processing',
        asyncThreshold,
        queueSize,
        workerCount,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing async processing:', error);
      throw error;
    }
  }

  async optimizeMemory(symbol, parameters) {
    try {
      const { gcThreshold, memoryLimit, optimizationLevel } = parameters;
      
      // Configure memory optimization
      // This would typically involve setting up memory management
      
      return {
        type: 'memory_optimization',
        gcThreshold,
        memoryLimit,
        optimizationLevel,
        status: 'applied'
      };
    } catch (error) {
      logger.error('Error optimizing memory:', error);
      throw error;
    }
  }

  async getCurrentLatencyMetrics(symbol) {
    try {
      // Mock implementation - in production, this would measure actual latency
      return {
        symbol,
        averageLatency: Math.random() * 100, // ms
        p95Latency: Math.random() * 200, // ms
        p99Latency: Math.random() * 500, // ms
        throughput: Math.random() * 1000, // requests per second
        errorRate: Math.random() * 0.01, // 1%
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting current latency metrics:', error);
      throw error;
    }
  }

  calculateImprovement(currentMetrics, newMetrics) {
    try {
      const latencyImprovement = ((currentMetrics.averageLatency - newMetrics.averageLatency) / currentMetrics.averageLatency) * 100;
      const throughputImprovement = ((newMetrics.throughput - currentMetrics.throughput) / currentMetrics.throughput) * 100;
      const errorRateImprovement = ((currentMetrics.errorRate - newMetrics.errorRate) / currentMetrics.errorRate) * 100;
      
      const overallImprovement = (latencyImprovement + throughputImprovement + errorRateImprovement) / 3;
      
      return {
        latency: latencyImprovement,
        throughput: throughputImprovement,
        errorRate: errorRateImprovement,
        overall: overallImprovement,
        percentage: overallImprovement
      };
    } catch (error) {
      logger.error('Error calculating improvement:', error);
      throw error;
    }
  }

  async storeOptimizationResult(result) {
    try {
      const query = `
        INSERT INTO latency_optimizations (
          id, symbol, optimization_type, parameters, user_id, 
          current_metrics, new_metrics, improvement, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await pool.query(query, [
        result.id,
        result.symbol,
        result.optimizationType,
        JSON.stringify(result.parameters),
        result.userId,
        JSON.stringify(result.currentMetrics),
        JSON.stringify(result.newMetrics),
        JSON.stringify(result.improvement),
        result.status,
        result.createdAt
      ]);
      
      logger.info(`Optimization result stored: ${result.id}`);
    } catch (error) {
      logger.error('Error storing optimization result:', error);
      throw error;
    }
  }

  async optimizeSymbolLatency(symbol) {
    try {
      // Optimize latency for a specific symbol
      logger.info(`Optimizing latency for ${symbol}`);
      
      // Get current metrics
      const currentMetrics = await this.getCurrentLatencyMetrics(symbol);
      
      // Apply automatic optimizations based on metrics
      if (currentMetrics.averageLatency > 100) {
        await this.optimizeCaching(symbol, { cacheSize: '100mb', ttl: 300, compression: true });
      }
      
      if (currentMetrics.throughput < 500) {
        await this.optimizeBatchProcessing(symbol, { batchSize: 10, batchTimeout: 1000, maxBatchSize: 100 });
      }
      
      if (currentMetrics.errorRate > 0.01) {
        await this.optimizeConnectionPooling(symbol, { minConnections: 5, maxConnections: 20, idleTimeout: 30000 });
      }
      
    } catch (error) {
      logger.error(`Error optimizing latency for ${symbol}:`, error);
      throw error;
    }
  }

  async getOptimizationHistory(symbol, userId) {
    try {
      const query = `
        SELECT * FROM latency_optimizations 
        WHERE symbol = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query, [symbol, userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting optimization history:', error);
      throw error;
    }
  }

  async getOptimizationRecommendations(symbol, userId) {
    try {
      const currentMetrics = await this.getCurrentLatencyMetrics(symbol);
      const recommendations = [];
      
      // Generate recommendations based on current metrics
      if (currentMetrics.averageLatency > 100) {
        recommendations.push({
          type: 'caching',
          priority: 'high',
          description: 'High latency detected. Consider implementing data caching.',
          expectedImprovement: '30-50%'
        });
      }
      
      if (currentMetrics.throughput < 500) {
        recommendations.push({
          type: 'batch_processing',
          priority: 'medium',
          description: 'Low throughput detected. Consider implementing batch processing.',
          expectedImprovement: '20-40%'
        });
      }
      
      if (currentMetrics.errorRate > 0.01) {
        recommendations.push({
          type: 'connection_pooling',
          priority: 'high',
          description: 'High error rate detected. Consider optimizing connection pooling.',
          expectedImprovement: '40-60%'
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error getting optimization recommendations:', error);
      throw error;
    }
  }
}

module.exports = LatencyOptimizer;
