const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class CorrelationAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.correlationCache = new Map();
    this.correlationMatrices = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      logger.info('Correlation Analyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Correlation Analyzer:', error);
      throw error;
    }
  }

  async analyzeCorrelation(symbols, timeframe = '30d', method = 'pearson') {
    try {
      const startTime = Date.now();
      
      // Get historical data for all symbols
      const historicalData = await this.getHistoricalDataForSymbols(symbols, timeframe);
      
      if (historicalData.length === 0) {
        throw new Error('Insufficient historical data for correlation analysis');
      }
      
      // Calculate returns for each symbol
      const returns = this.calculateReturnsMatrix(historicalData, symbols);
      
      if (returns.length === 0) {
        throw new Error('Unable to calculate returns for correlation analysis');
      }
      
      // Calculate correlation matrix
      const correlationMatrix = this.calculateCorrelationMatrix(returns, symbols, method);
      
      // Calculate additional correlation metrics
      const correlationMetrics = this.calculateCorrelationMetrics(correlationMatrix, symbols);
      
      // Identify correlation clusters
      const clusters = this.identifyCorrelationClusters(correlationMatrix, symbols);
      
      // Calculate portfolio correlation risk
      const portfolioCorrelationRisk = this.calculatePortfolioCorrelationRisk(correlationMatrix, symbols);
      
      const result = {
        symbols,
        timeframe,
        method,
        correlationMatrix,
        correlationMetrics,
        clusters,
        portfolioCorrelationRisk,
        dataPoints: returns.length,
        calculationTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      const cacheKey = `correlation:${symbols.sort().join(',')}:${timeframe}:${method}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      
      logger.performance('Correlation analysis', Date.now() - startTime, {
        symbols: symbols.length,
        timeframe,
        method
      });
      
      return result;
    } catch (error) {
      logger.error('Error analyzing correlation:', error);
      throw error;
    }
  }

  async getHistoricalDataForSymbols(symbols, timeframe) {
    try {
      const days = this.getDaysFromTimeframe(timeframe);
      const historicalData = [];
      
      for (const symbol of symbols) {
        const data = await this.getHistoricalData(symbol, days);
        if (data.length > 0) {
          historicalData.push({ symbol, data });
        }
      }
      
      return historicalData;
    } catch (error) {
      logger.error('Error getting historical data for symbols:', error);
      return [];
    }
  }

  async getHistoricalData(symbol, days) {
    try {
      // Check cache first
      const cacheKey = `historical_data:${symbol}:${days}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const query = `
        SELECT timestamp, close
        FROM market_data 
        WHERE symbol = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [symbol, days]);
      const data = result.rows.reverse(); // Reverse to get chronological order
      
      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(data));
      
      return data;
    } catch (error) {
      logger.error(`Error getting historical data for ${symbol}:`, error);
      return [];
    }
  }

  getDaysFromTimeframe(timeframe) {
    const timeframes = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      '2y': 730,
      '5y': 1825
    };
    
    return timeframes[timeframe] || 30;
  }

  calculateReturnsMatrix(historicalData, symbols) {
    try {
      // Align data by timestamp
      const alignedData = this.alignDataByTimestamp(historicalData);
      
      if (alignedData.length < 2) {
        return [];
      }
      
      const returns = [];
      
      for (let i = 1; i < alignedData.length; i++) {
        const dayReturns = {};
        let validReturns = 0;
        
        for (const symbol of symbols) {
          const currentPrice = alignedData[i][symbol];
          const previousPrice = alignedData[i - 1][symbol];
          
          if (currentPrice && previousPrice && previousPrice > 0) {
            dayReturns[symbol] = (currentPrice - previousPrice) / previousPrice;
            validReturns++;
          }
        }
        
        // Only include days with data for all symbols
        if (validReturns === symbols.length) {
          returns.push(dayReturns);
        }
      }
      
      return returns;
    } catch (error) {
      logger.error('Error calculating returns matrix:', error);
      return [];
    }
  }

  alignDataByTimestamp(historicalData) {
    try {
      if (historicalData.length === 0) return [];
      
      // Get all unique timestamps
      const allTimestamps = new Set();
      for (const { data } of historicalData) {
        for (const point of data) {
          allTimestamps.add(point.timestamp);
        }
      }
      
      const sortedTimestamps = Array.from(allTimestamps).sort();
      const alignedData = [];
      
      for (const timestamp of sortedTimestamps) {
        const alignedPoint = { timestamp };
        let hasData = false;
        
        for (const { symbol, data } of historicalData) {
          const point = data.find(p => p.timestamp === timestamp);
          if (point) {
            alignedPoint[symbol] = point.close;
            hasData = true;
          }
        }
        
        if (hasData) {
          alignedData.push(alignedPoint);
        }
      }
      
      return alignedData;
    } catch (error) {
      logger.error('Error aligning data by timestamp:', error);
      return [];
    }
  }

  calculateCorrelationMatrix(returns, symbols, method) {
    try {
      const matrix = {};
      
      for (const symbol1 of symbols) {
        matrix[symbol1] = {};
        for (const symbol2 of symbols) {
          if (symbol1 === symbol2) {
            matrix[symbol1][symbol2] = 1.0;
          } else {
            const correlation = this.calculateCorrelation(
              returns.map(r => r[symbol1]),
              returns.map(r => r[symbol2]),
              method
            );
            matrix[symbol1][symbol2] = correlation;
          }
        }
      }
      
      return matrix;
    } catch (error) {
      logger.error('Error calculating correlation matrix:', error);
      return {};
    }
  }

  calculateCorrelation(series1, series2, method = 'pearson') {
    try {
      if (series1.length !== series2.length || series1.length === 0) {
        return 0;
      }
      
      switch (method) {
        case 'pearson':
          return this.calculatePearsonCorrelation(series1, series2);
        case 'spearman':
          return this.calculateSpearmanCorrelation(series1, series2);
        case 'kendall':
          return this.calculateKendallCorrelation(series1, series2);
        default:
          return this.calculatePearsonCorrelation(series1, series2);
      }
    } catch (error) {
      logger.error('Error calculating correlation:', error);
      return 0;
    }
  }

  calculatePearsonCorrelation(series1, series2) {
    try {
      const n = series1.length;
      const sum1 = series1.reduce((sum, val) => sum + val, 0);
      const sum2 = series2.reduce((sum, val) => sum + val, 0);
      const sum1Sq = series1.reduce((sum, val) => sum + val * val, 0);
      const sum2Sq = series2.reduce((sum, val) => sum + val * val, 0);
      const pSum = series1.reduce((sum, val, i) => sum + val * series2[i], 0);
      
      const num = pSum - (sum1 * sum2 / n);
      const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
      
      return den === 0 ? 0 : num / den;
    } catch (error) {
      logger.error('Error calculating Pearson correlation:', error);
      return 0;
    }
  }

  calculateSpearmanCorrelation(series1, series2) {
    try {
      const ranks1 = this.calculateRanks(series1);
      const ranks2 = this.calculateRanks(series2);
      
      return this.calculatePearsonCorrelation(ranks1, ranks2);
    } catch (error) {
      logger.error('Error calculating Spearman correlation:', error);
      return 0;
    }
  }

  calculateKendallCorrelation(series1, series2) {
    try {
      const n = series1.length;
      let concordant = 0;
      let discordant = 0;
      
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const sign1 = Math.sign(series1[j] - series1[i]);
          const sign2 = Math.sign(series2[j] - series2[i]);
          
          if (sign1 * sign2 > 0) {
            concordant++;
          } else if (sign1 * sign2 < 0) {
            discordant++;
          }
        }
      }
      
      const total = concordant + discordant;
      return total === 0 ? 0 : (concordant - discordant) / total;
    } catch (error) {
      logger.error('Error calculating Kendall correlation:', error);
      return 0;
    }
  }

  calculateRanks(series) {
    try {
      const sorted = series.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
      const ranks = new Array(series.length);
      
      for (let i = 0; i < sorted.length; i++) {
        ranks[sorted[i].idx] = i + 1;
      }
      
      return ranks;
    } catch (error) {
      logger.error('Error calculating ranks:', error);
      return series;
    }
  }

  calculateCorrelationMetrics(correlationMatrix, symbols) {
    try {
      const metrics = {
        averageCorrelation: 0,
        maxCorrelation: -1,
        minCorrelation: 1,
        highCorrelationPairs: [],
        lowCorrelationPairs: [],
        correlationVolatility: 0
      };
      
      let correlationSum = 0;
      let correlationCount = 0;
      const correlations = [];
      
      for (const symbol1 of symbols) {
        for (const symbol2 of symbols) {
          if (symbol1 !== symbol2) {
            const correlation = correlationMatrix[symbol1][symbol2];
            correlations.push(correlation);
            correlationSum += correlation;
            correlationCount++;
            
            if (correlation > metrics.maxCorrelation) {
              metrics.maxCorrelation = correlation;
            }
            
            if (correlation < metrics.minCorrelation) {
              metrics.minCorrelation = correlation;
            }
            
            if (correlation > 0.7) {
              metrics.highCorrelationPairs.push({
                symbol1,
                symbol2,
                correlation
              });
            }
            
            if (correlation < 0.3) {
              metrics.lowCorrelationPairs.push({
                symbol1,
                symbol2,
                correlation
              });
            }
          }
        }
      }
      
      metrics.averageCorrelation = correlationCount > 0 ? correlationSum / correlationCount : 0;
      
      // Calculate correlation volatility (standard deviation of correlations)
      if (correlations.length > 1) {
        const mean = metrics.averageCorrelation;
        const variance = correlations.reduce((sum, corr) => sum + Math.pow(corr - mean, 2), 0) / correlations.length;
        metrics.correlationVolatility = Math.sqrt(variance);
      }
      
      return metrics;
    } catch (error) {
      logger.error('Error calculating correlation metrics:', error);
      return {
        averageCorrelation: 0,
        maxCorrelation: 0,
        minCorrelation: 0,
        highCorrelationPairs: [],
        lowCorrelationPairs: [],
        correlationVolatility: 0
      };
    }
  }

  identifyCorrelationClusters(correlationMatrix, symbols, threshold = 0.7) {
    try {
      const clusters = [];
      const visited = new Set();
      
      for (const symbol of symbols) {
        if (!visited.has(symbol)) {
          const cluster = this.findCorrelationCluster(symbol, correlationMatrix, symbols, threshold, visited);
          if (cluster.length > 1) {
            clusters.push(cluster);
          }
        }
      }
      
      return clusters;
    } catch (error) {
      logger.error('Error identifying correlation clusters:', error);
      return [];
    }
  }

  findCorrelationCluster(symbol, correlationMatrix, symbols, threshold, visited) {
    try {
      const cluster = [symbol];
      visited.add(symbol);
      
      for (const otherSymbol of symbols) {
        if (!visited.has(otherSymbol) && correlationMatrix[symbol][otherSymbol] >= threshold) {
          const subCluster = this.findCorrelationCluster(otherSymbol, correlationMatrix, symbols, threshold, visited);
          cluster.push(...subCluster);
        }
      }
      
      return cluster;
    } catch (error) {
      logger.error('Error finding correlation cluster:', error);
      return [symbol];
    }
  }

  calculatePortfolioCorrelationRisk(correlationMatrix, symbols) {
    try {
      // Calculate average correlation
      let correlationSum = 0;
      let correlationCount = 0;
      
      for (const symbol1 of symbols) {
        for (const symbol2 of symbols) {
          if (symbol1 !== symbol2) {
            correlationSum += Math.abs(correlationMatrix[symbol1][symbol2]);
            correlationCount++;
          }
        }
      }
      
      const averageCorrelation = correlationCount > 0 ? correlationSum / correlationCount : 0;
      
      // Calculate correlation risk score (0-100)
      const correlationRisk = Math.min(100, averageCorrelation * 100);
      
      return {
        averageCorrelation,
        correlationRisk,
        riskLevel: this.getCorrelationRiskLevel(correlationRisk),
        diversificationBenefit: this.calculateDiversificationBenefit(averageCorrelation)
      };
    } catch (error) {
      logger.error('Error calculating portfolio correlation risk:', error);
      return {
        averageCorrelation: 0,
        correlationRisk: 0,
        riskLevel: 'low',
        diversificationBenefit: 0
      };
    }
  }

  getCorrelationRiskLevel(correlationRisk) {
    if (correlationRisk < 30) return 'low';
    if (correlationRisk < 60) return 'medium';
    if (correlationRisk < 80) return 'high';
    return 'very_high';
  }

  calculateDiversificationBenefit(averageCorrelation) {
    // Diversification benefit decreases as correlation increases
    return Math.max(0, 1 - averageCorrelation);
  }

  async getCorrelationMatrix(portfolioId, userId) {
    try {
      // Check cache first
      const cacheKey = `correlation_matrix:${portfolioId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Get portfolio positions
      const positions = await this.getPortfolioPositions(portfolioId, userId);
      if (positions.length === 0) {
        return null;
      }
      
      const symbols = positions.map(p => p.symbol);
      
      // Calculate correlation matrix
      const correlationResult = await this.analyzeCorrelation(symbols, '30d', 'pearson');
      
      // Store in cache
      await this.redis.setex(cacheKey, 1800, JSON.stringify(correlationResult)); // 30 minutes
      
      return correlationResult;
    } catch (error) {
      logger.error(`Error getting correlation matrix for portfolio ${portfolioId}:`, error);
      return null;
    }
  }

  async getPortfolioPositions(portfolioId, userId) {
    try {
      // This would typically query a positions table
      // For now, return mock data
      return [
        { symbol: 'AAPL', quantity: 100, price: 150 },
        { symbol: 'GOOGL', quantity: 50, price: 2800 },
        { symbol: 'MSFT', quantity: 75, price: 300 }
      ];
    } catch (error) {
      logger.error(`Error getting portfolio positions for ${portfolioId}:`, error);
      return [];
    }
  }

  async close() {
    try {
      logger.info('Correlation Analyzer closed successfully');
    } catch (error) {
      logger.error('Error closing Correlation Analyzer:', error);
    }
  }
}

module.exports = CorrelationAnalyzer;

