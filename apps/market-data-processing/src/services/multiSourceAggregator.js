const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MultiSourceAggregator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.dataSources = new Map();
    this.aggregationRules = new Map();
    this.aggregatedData = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load data sources
      await this.loadDataSources();
      
      // Load aggregation rules
      await this.loadAggregationRules();
      
      this._initialized = true;
      logger.info('MultiSourceAggregator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MultiSourceAggregator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MultiSourceAggregator closed');
    } catch (error) {
      logger.error('Error closing MultiSourceAggregator:', error);
    }
  }

  async loadDataSources() {
    try {
      this.dataSources = new Map([
        ['alpha_vantage', {
          name: 'Alpha Vantage',
          weight: 0.3,
          reliability: 0.9,
          latency: 200, // ms
          cost: 0.01
        }],
        ['yahoo_finance', {
          name: 'Yahoo Finance',
          weight: 0.4,
          reliability: 0.95,
          latency: 150, // ms
          cost: 0
        }],
        ['iex_cloud', {
          name: 'IEX Cloud',
          weight: 0.2,
          reliability: 0.85,
          latency: 100, // ms
          cost: 0.005
        }],
        ['polygon', {
          name: 'Polygon.io',
          weight: 0.1,
          reliability: 0.8,
          latency: 80, // ms
          cost: 0.02
        }]
      ]);
      
      logger.info('Data sources loaded successfully');
    } catch (error) {
      logger.error('Error loading data sources:', error);
      throw error;
    }
  }

  async loadAggregationRules() {
    try {
      this.aggregationRules = new Map([
        ['weighted_average', {
          name: 'Weighted Average',
          description: 'Calculate weighted average based on source reliability and latency',
          formula: 'sum(price * weight * reliability) / sum(weight * reliability)'
        }],
        ['median', {
          name: 'Median',
          description: 'Use median value to reduce impact of outliers',
          formula: 'median(prices)'
        }],
        ['consensus', {
          name: 'Consensus',
          description: 'Use value that most sources agree on',
          formula: 'mode(prices)'
        }],
        ['best_source', {
          name: 'Best Source',
          description: 'Use data from the most reliable source',
          formula: 'price from source with highest reliability'
        }],
        ['latency_optimized', {
          name: 'Latency Optimized',
          description: 'Use data from the fastest source',
          formula: 'price from source with lowest latency'
        }],
        ['cost_optimized', {
          name: 'Cost Optimized',
          description: 'Use data from the cheapest source',
          formula: 'price from source with lowest cost'
        }]
      ]);
      
      logger.info('Aggregation rules loaded successfully');
    } catch (error) {
      logger.error('Error loading aggregation rules:', error);
      throw error;
    }
  }

  async aggregateData(symbol, sources, aggregationType, parameters, userId) {
    try {
      const aggregationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting data aggregation for ${symbol}`, {
        aggregationId,
        symbol,
        sources,
        aggregationType,
        parameters,
        userId
      });

      // Get data from all sources
      const sourceData = await this.getDataFromSources(symbol, sources);
      
      // Apply aggregation rule
      const aggregatedData = await this.applyAggregationRule(
        aggregationType, 
        sourceData, 
        parameters
      );
      
      // Store results
      const result = {
        id: aggregationId,
        symbol,
        sources,
        aggregationType,
        parameters,
        sourceData,
        aggregatedData,
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeAggregationResult(result);
      
      // Cache results
      await this.redis.setex(
        `aggregation:${aggregationId}`, 
        3600, 
        JSON.stringify(result)
      );
      
      this.emit('aggregationCompleted', result);
      
      logger.info(`Data aggregation completed for ${symbol}`, {
        aggregationId,
        processingTime: result.processingTime
      });
      
      return result;
    } catch (error) {
      logger.error('Error aggregating data:', error);
      this.emit('aggregationFailed', error, { symbol, sources, aggregationType, parameters, userId });
      throw error;
    }
  }

  async getDataFromSources(symbol, sources) {
    try {
      const sourceData = new Map();
      
      for (const source of sources) {
        try {
          const data = await this.fetchDataFromSource(symbol, source);
          sourceData.set(source, data);
        } catch (error) {
          logger.error(`Error fetching data from ${source}:`, error);
          // Continue with other sources
        }
      }
      
      if (sourceData.size === 0) {
        throw new Error('No data available from any source');
      }
      
      return sourceData;
    } catch (error) {
      logger.error('Error getting data from sources:', error);
      throw error;
    }
  }

  async fetchDataFromSource(symbol, source) {
    try {
      // Mock implementation - in production, this would fetch real data
      const sourceConfig = this.dataSources.get(source);
      if (!sourceConfig) {
        throw new Error(`Unknown source: ${source}`);
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, sourceConfig.latency));
      
      return {
        source,
        symbol,
        price: 100 + Math.random() * 10,
        timestamp: new Date().toISOString(),
        reliability: sourceConfig.reliability,
        latency: sourceConfig.latency,
        cost: sourceConfig.cost
      };
    } catch (error) {
      logger.error(`Error fetching data from source ${source}:`, error);
      throw error;
    }
  }

  async applyAggregationRule(aggregationType, sourceData, parameters) {
    try {
      const rule = this.aggregationRules.get(aggregationType);
      if (!rule) {
        throw new Error(`Unknown aggregation type: ${aggregationType}`);
      }

      switch (aggregationType) {
        case 'weighted_average':
          return this.calculateWeightedAverage(sourceData, parameters);
        case 'median':
          return this.calculateMedian(sourceData, parameters);
        case 'consensus':
          return this.calculateConsensus(sourceData, parameters);
        case 'best_source':
          return this.selectBestSource(sourceData, parameters);
        case 'latency_optimized':
          return this.selectLatencyOptimized(sourceData, parameters);
        case 'cost_optimized':
          return this.selectCostOptimized(sourceData, parameters);
        default:
          throw new Error(`Unsupported aggregation type: ${aggregationType}`);
      }
    } catch (error) {
      logger.error('Error applying aggregation rule:', error);
      throw error;
    }
  }

  calculateWeightedAverage(sourceData, parameters) {
    try {
      const { useReliability = true, useLatency = false } = parameters;
      
      let totalWeight = 0;
      let weightedSum = 0;
      const weights = new Map();
      
      for (const [source, data] of sourceData) {
        const sourceConfig = this.dataSources.get(source);
        let weight = sourceConfig.weight;
        
        if (useReliability) {
          weight *= data.reliability;
        }
        
        if (useLatency) {
          weight *= (1 / (1 + data.latency / 1000)); // Inverse latency weighting
        }
        
        weights.set(source, weight);
        totalWeight += weight;
        weightedSum += data.price * weight;
      }
      
      const aggregatedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      return {
        type: 'weighted_average',
        price: aggregatedPrice,
        weights: Object.fromEntries(weights),
        totalWeight,
        sourceCount: sourceData.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating weighted average:', error);
      throw error;
    }
  }

  calculateMedian(sourceData, parameters) {
    try {
      const prices = Array.from(sourceData.values()).map(data => data.price);
      prices.sort((a, b) => a - b);
      
      const mid = Math.floor(prices.length / 2);
      const medianPrice = prices.length % 2 === 0 
        ? (prices[mid - 1] + prices[mid]) / 2 
        : prices[mid];
      
      return {
        type: 'median',
        price: medianPrice,
        prices,
        sourceCount: sourceData.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating median:', error);
      throw error;
    }
  }

  calculateConsensus(sourceData, parameters) {
    try {
      const { tolerance = 0.01 } = parameters; // 1% tolerance
      
      const prices = Array.from(sourceData.values()).map(data => data.price);
      const priceGroups = new Map();
      
      // Group prices by similarity
      for (const price of prices) {
        let found = false;
        for (const [groupPrice, count] of priceGroups) {
          if (Math.abs(price - groupPrice) / groupPrice <= tolerance) {
            priceGroups.set(groupPrice, count + 1);
            found = true;
            break;
          }
        }
        if (!found) {
          priceGroups.set(price, 1);
        }
      }
      
      // Find the group with most prices
      let maxCount = 0;
      let consensusPrice = 0;
      for (const [price, count] of priceGroups) {
        if (count > maxCount) {
          maxCount = count;
          consensusPrice = price;
        }
      }
      
      return {
        type: 'consensus',
        price: consensusPrice,
        consensusCount: maxCount,
        totalSources: sourceData.size,
        priceGroups: Object.fromEntries(priceGroups),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating consensus:', error);
      throw error;
    }
  }

  selectBestSource(sourceData, parameters) {
    try {
      const { criteria = 'reliability' } = parameters;
      
      let bestSource = null;
      let bestValue = 0;
      
      for (const [source, data] of sourceData) {
        let value = 0;
        
        switch (criteria) {
          case 'reliability':
            value = data.reliability;
            break;
          case 'latency':
            value = 1 / (1 + data.latency / 1000); // Inverse latency
            break;
          case 'cost':
            value = 1 / (1 + data.cost); // Inverse cost
            break;
          default:
            value = data.reliability;
        }
        
        if (value > bestValue) {
          bestValue = value;
          bestSource = source;
        }
      }
      
      const bestData = sourceData.get(bestSource);
      
      return {
        type: 'best_source',
        price: bestData.price,
        source: bestSource,
        criteria,
        value: bestValue,
        timestamp: bestData.timestamp
      };
    } catch (error) {
      logger.error('Error selecting best source:', error);
      throw error;
    }
  }

  selectLatencyOptimized(sourceData, parameters) {
    try {
      let fastestSource = null;
      let minLatency = Infinity;
      
      for (const [source, data] of sourceData) {
        if (data.latency < minLatency) {
          minLatency = data.latency;
          fastestSource = source;
        }
      }
      
      const fastestData = sourceData.get(fastestSource);
      
      return {
        type: 'latency_optimized',
        price: fastestData.price,
        source: fastestSource,
        latency: minLatency,
        timestamp: fastestData.timestamp
      };
    } catch (error) {
      logger.error('Error selecting latency optimized source:', error);
      throw error;
    }
  }

  selectCostOptimized(sourceData, parameters) {
    try {
      let cheapestSource = null;
      let minCost = Infinity;
      
      for (const [source, data] of sourceData) {
        if (data.cost < minCost) {
          minCost = data.cost;
          cheapestSource = source;
        }
      }
      
      const cheapestData = sourceData.get(cheapestSource);
      
      return {
        type: 'cost_optimized',
        price: cheapestData.price,
        source: cheapestSource,
        cost: minCost,
        timestamp: cheapestData.timestamp
      };
    } catch (error) {
      logger.error('Error selecting cost optimized source:', error);
      throw error;
    }
  }

  async getAvailableSources(symbol, dataType, userId) {
    try {
      const sources = [];
      
      for (const [sourceId, sourceConfig] of this.dataSources) {
        sources.push({
          id: sourceId,
          name: sourceConfig.name,
          weight: sourceConfig.weight,
          reliability: sourceConfig.reliability,
          latency: sourceConfig.latency,
          cost: sourceConfig.cost,
          available: true // In production, this would check actual availability
        });
      }
      
      return sources;
    } catch (error) {
      logger.error('Error getting available sources:', error);
      throw error;
    }
  }

  async storeAggregationResult(result) {
    try {
      const query = `
        INSERT INTO data_aggregations (
          id, symbol, sources, aggregation_type, parameters, user_id, 
          source_data, aggregated_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        result.id,
        result.symbol,
        JSON.stringify(result.sources),
        result.aggregationType,
        JSON.stringify(result.parameters),
        result.userId,
        JSON.stringify(result.sourceData),
        JSON.stringify(result.aggregatedData),
        result.createdAt
      ]);
      
      logger.info(`Aggregation result stored: ${result.id}`);
    } catch (error) {
      logger.error('Error storing aggregation result:', error);
      throw error;
    }
  }

  async getAggregationHistory(symbol, userId) {
    try {
      const query = `
        SELECT * FROM data_aggregations 
        WHERE symbol = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query, [symbol, userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting aggregation history:', error);
      throw error;
    }
  }

  async getAggregationStats() {
    try {
      const stats = {
        totalSources: this.dataSources.size,
        totalRules: this.aggregationRules.size,
        activeAggregations: this.aggregatedData.size,
        sourceReliability: Object.fromEntries(
          Array.from(this.dataSources.entries()).map(([id, config]) => [id, config.reliability])
        ),
        averageLatency: Array.from(this.dataSources.values())
          .reduce((sum, config) => sum + config.latency, 0) / this.dataSources.size,
        totalCost: Array.from(this.dataSources.values())
          .reduce((sum, config) => sum + config.cost, 0)
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting aggregation stats:', error);
      throw error;
    }
  }
}

module.exports = MultiSourceAggregator;
