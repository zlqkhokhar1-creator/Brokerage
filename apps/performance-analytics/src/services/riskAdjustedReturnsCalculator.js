const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class RiskAdjustedReturnsCalculator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.riskMetrics = new Map();
    this.calculationCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load risk metrics definitions
      await this.loadRiskMetrics();
      
      this._initialized = true;
      logger.info('RiskAdjustedReturnsCalculator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RiskAdjustedReturnsCalculator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('RiskAdjustedReturnsCalculator closed');
    } catch (error) {
      logger.error('Error closing RiskAdjustedReturnsCalculator:', error);
    }
  }

  async loadRiskMetrics() {
    try {
      this.riskMetrics = new Map([
        ['sharpe', {
          name: 'Sharpe Ratio',
          description: 'Return per unit of risk',
          formula: '(Portfolio Return - Risk Free Rate) / Portfolio Volatility',
          higherIsBetter: true
        }],
        ['sortino', {
          name: 'Sortino Ratio',
          description: 'Return per unit of downside risk',
          formula: '(Portfolio Return - Risk Free Rate) / Downside Deviation',
          higherIsBetter: true
        }],
        ['calmar', {
          name: 'Calmar Ratio',
          description: 'Return per unit of maximum drawdown',
          formula: 'Annualized Return / Maximum Drawdown',
          higherIsBetter: true
        }],
        ['treynor', {
          name: 'Treynor Ratio',
          description: 'Return per unit of systematic risk',
          formula: '(Portfolio Return - Risk Free Rate) / Beta',
          higherIsBetter: true
        }],
        ['information', {
          name: 'Information Ratio',
          description: 'Active return per unit of tracking error',
          formula: 'Active Return / Tracking Error',
          higherIsBetter: true
        }],
        ['alpha', {
          name: 'Alpha',
          description: 'Excess return over expected return',
          formula: 'Portfolio Return - (Risk Free Rate + Beta * (Market Return - Risk Free Rate))',
          higherIsBetter: true
        }],
        ['beta', {
          name: 'Beta',
          description: 'Sensitivity to market movements',
          formula: 'Covariance(Portfolio, Market) / Variance(Market)',
          higherIsBetter: false
        }],
        ['volatility', {
          name: 'Volatility',
          description: 'Standard deviation of returns',
          formula: 'Standard Deviation of Returns',
          higherIsBetter: false
        }],
        ['maxDrawdown', {
          name: 'Maximum Drawdown',
          description: 'Largest peak-to-trough decline',
          formula: 'Max(Peak - Trough) / Peak',
          higherIsBetter: false
        }],
        ['var', {
          name: 'Value at Risk (VaR)',
          description: 'Potential loss at confidence level',
          formula: 'Percentile of return distribution',
          higherIsBetter: false
        }],
        ['cvar', {
          name: 'Conditional Value at Risk (CVaR)',
          description: 'Expected loss beyond VaR',
          formula: 'Expected Value of returns below VaR',
          higherIsBetter: false
        }]
      ]);
      
      logger.info('Risk metrics loaded successfully');
    } catch (error) {
      logger.error('Error loading risk metrics:', error);
      throw error;
    }
  }

  async calculateRiskAdjustedReturns(portfolioId, timeRange, riskFreeRate, metrics, userId) {
    try {
      const calculationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting risk-adjusted returns calculation for portfolio ${portfolioId}`, {
        calculationId,
        portfolioId,
        timeRange,
        riskFreeRate,
        metrics,
        userId
      });

      // Get portfolio data
      const portfolioData = await this.getPortfolioData(portfolioId, timeRange);
      const benchmarkData = await this.getBenchmarkData(portfolioId, timeRange);
      
      // Calculate risk-adjusted returns
      const riskAdjustedReturns = await this.calculateMetrics(
        portfolioData, 
        benchmarkData, 
        riskFreeRate, 
        metrics
      );
      
      // Store results
      const calculation = {
        id: calculationId,
        portfolioId,
        timeRange,
        riskFreeRate,
        metrics: riskAdjustedReturns,
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeRiskAdjustedReturns(calculation);
      
      // Cache results
      await this.redis.setex(
        `risk-adjusted:${calculationId}`, 
        3600, 
        JSON.stringify(calculation)
      );
      
      this.emit('calculationCompleted', calculation);
      
      logger.info(`Risk-adjusted returns calculation completed for portfolio ${portfolioId}`, {
        calculationId,
        processingTime: calculation.processingTime
      });
      
      return calculation;
    } catch (error) {
      logger.error('Error calculating risk-adjusted returns:', error);
      this.emit('calculationFailed', error, { portfolioId, timeRange, riskFreeRate, metrics, userId });
      throw error;
    }
  }

  async calculateMetrics(portfolioData, benchmarkData, riskFreeRate, metrics) {
    try {
      const results = {};
      
      for (const metric of metrics) {
        if (!this.riskMetrics.has(metric)) {
          logger.warn(`Unknown risk metric: ${metric}`);
          continue;
        }
        
        const metricDefinition = this.riskMetrics.get(metric);
        results[metric] = {
          name: metricDefinition.name,
          description: metricDefinition.description,
          formula: metricDefinition.formula,
          value: await this.calculateMetric(metric, portfolioData, benchmarkData, riskFreeRate),
          higherIsBetter: metricDefinition.higherIsBetter
        };
      }
      
      return results;
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      throw error;
    }
  }

  async calculateMetric(metric, portfolioData, benchmarkData, riskFreeRate) {
    try {
      switch (metric) {
        case 'sharpe':
          return this.calculateSharpeRatio(portfolioData, riskFreeRate);
        case 'sortino':
          return this.calculateSortinoRatio(portfolioData, riskFreeRate);
        case 'calmar':
          return this.calculateCalmarRatio(portfolioData);
        case 'treynor':
          return this.calculateTreynorRatio(portfolioData, benchmarkData, riskFreeRate);
        case 'information':
          return this.calculateInformationRatio(portfolioData, benchmarkData);
        case 'alpha':
          return this.calculateAlpha(portfolioData, benchmarkData, riskFreeRate);
        case 'beta':
          return this.calculateBeta(portfolioData, benchmarkData);
        case 'volatility':
          return this.calculateVolatility(portfolioData);
        case 'maxDrawdown':
          return this.calculateMaxDrawdown(portfolioData);
        case 'var':
          return this.calculateVaR(portfolioData);
        case 'cvar':
          return this.calculateCVaR(portfolioData);
        default:
          throw new Error(`Unknown metric: ${metric}`);
      }
    } catch (error) {
      logger.error(`Error calculating metric ${metric}:`, error);
      throw error;
    }
  }

  calculateSharpeRatio(portfolioData, riskFreeRate) {
    try {
      const excessReturn = portfolioData.totalReturn - riskFreeRate;
      const volatility = this.calculateVolatility(portfolioData);
      return volatility > 0 ? excessReturn / volatility : 0;
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      throw error;
    }
  }

  calculateSortinoRatio(portfolioData, riskFreeRate) {
    try {
      const excessReturn = portfolioData.totalReturn - riskFreeRate;
      const downsideDeviation = this.calculateDownsideDeviation(portfolioData);
      return downsideDeviation > 0 ? excessReturn / downsideDeviation : 0;
    } catch (error) {
      logger.error('Error calculating Sortino ratio:', error);
      throw error;
    }
  }

  calculateCalmarRatio(portfolioData) {
    try {
      const annualizedReturn = portfolioData.totalReturn;
      const maxDrawdown = this.calculateMaxDrawdown(portfolioData);
      return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    } catch (error) {
      logger.error('Error calculating Calmar ratio:', error);
      throw error;
    }
  }

  calculateTreynorRatio(portfolioData, benchmarkData, riskFreeRate) {
    try {
      const excessReturn = portfolioData.totalReturn - riskFreeRate;
      const beta = this.calculateBeta(portfolioData, benchmarkData);
      return beta > 0 ? excessReturn / beta : 0;
    } catch (error) {
      logger.error('Error calculating Treynor ratio:', error);
      throw error;
    }
  }

  calculateInformationRatio(portfolioData, benchmarkData) {
    try {
      const activeReturn = portfolioData.totalReturn - benchmarkData.totalReturn;
      const trackingError = this.calculateTrackingError(portfolioData, benchmarkData);
      return trackingError > 0 ? activeReturn / trackingError : 0;
    } catch (error) {
      logger.error('Error calculating Information ratio:', error);
      throw error;
    }
  }

  calculateAlpha(portfolioData, benchmarkData, riskFreeRate) {
    try {
      const beta = this.calculateBeta(portfolioData, benchmarkData);
      const expectedReturn = riskFreeRate + beta * (benchmarkData.totalReturn - riskFreeRate);
      return portfolioData.totalReturn - expectedReturn;
    } catch (error) {
      logger.error('Error calculating Alpha:', error);
      throw error;
    }
  }

  calculateBeta(portfolioData, benchmarkData) {
    try {
      // Simplified beta calculation - in production, use proper covariance
      const portfolioReturns = portfolioData.returns || [0.15];
      const benchmarkReturns = benchmarkData.returns || [0.12];
      
      const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
      const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
      
      let covariance = 0;
      let benchmarkVariance = 0;
      
      for (let i = 0; i < portfolioReturns.length; i++) {
        covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
        benchmarkVariance += Math.pow(benchmarkReturns[i] - benchmarkMean, 2);
      }
      
      return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
    } catch (error) {
      logger.error('Error calculating Beta:', error);
      throw error;
    }
  }

  calculateVolatility(portfolioData) {
    try {
      const returns = portfolioData.returns || [0.15];
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, return_) => sum + Math.pow(return_ - mean, 2), 0) / returns.length;
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating volatility:', error);
      throw error;
    }
  }

  calculateDownsideDeviation(portfolioData) {
    try {
      const returns = portfolioData.returns || [0.15];
      const targetReturn = 0; // Risk-free rate or target return
      const downsideReturns = returns.filter(return_ => return_ < targetReturn);
      
      if (downsideReturns.length === 0) return 0;
      
      const mean = downsideReturns.reduce((a, b) => a + b, 0) / downsideReturns.length;
      const variance = downsideReturns.reduce((sum, return_) => sum + Math.pow(return_ - mean, 2), 0) / downsideReturns.length;
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating downside deviation:', error);
      throw error;
    }
  }

  calculateMaxDrawdown(portfolioData) {
    try {
      const returns = portfolioData.returns || [0.15];
      let peak = 0;
      let maxDrawdown = 0;
      
      for (const return_ of returns) {
        peak = Math.max(peak, return_);
        const drawdown = (peak - return_) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
      
      return maxDrawdown;
    } catch (error) {
      logger.error('Error calculating maximum drawdown:', error);
      throw error;
    }
  }

  calculateVaR(portfolioData, confidenceLevel = 0.05) {
    try {
      const returns = portfolioData.returns || [0.15];
      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor(confidenceLevel * sortedReturns.length);
      return sortedReturns[index] || 0;
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      throw error;
    }
  }

  calculateCVaR(portfolioData, confidenceLevel = 0.05) {
    try {
      const returns = portfolioData.returns || [0.15];
      const varValue = this.calculateVaR(portfolioData, confidenceLevel);
      const tailReturns = returns.filter(return_ => return_ <= varValue);
      
      return tailReturns.length > 0 ? tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length : 0;
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      throw error;
    }
  }

  calculateTrackingError(portfolioData, benchmarkData) {
    try {
      const portfolioReturns = portfolioData.returns || [0.15];
      const benchmarkReturns = benchmarkData.returns || [0.12];
      
      if (portfolioReturns.length !== benchmarkReturns.length) {
        throw new Error('Portfolio and benchmark returns must have same length');
      }
      
      const activeReturns = portfolioReturns.map((p, i) => p - benchmarkReturns[i]);
      const mean = activeReturns.reduce((a, b) => a + b, 0) / activeReturns.length;
      const variance = activeReturns.reduce((sum, return_) => sum + Math.pow(return_ - mean, 2), 0) / activeReturns.length;
      
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating tracking error:', error);
      throw error;
    }
  }

  async getRiskAdjustedReturns(portfolioId, timeRange, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `risk-adjusted:${portfolioId}:${timeRange}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const query = `
        SELECT * FROM risk_adjusted_returns 
        WHERE portfolio_id = $1 AND time_range = $2 AND user_id = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [portfolioId, timeRange, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('No risk-adjusted returns data found');
      }

      const riskAdjustedReturns = result.rows[0];
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(riskAdjustedReturns));
      
      return riskAdjustedReturns;
    } catch (error) {
      logger.error('Error getting risk-adjusted returns:', error);
      throw error;
    }
  }

  async getPortfolioData(portfolioId, timeRange) {
    try {
      // Mock implementation - in production, this would query the database
      return {
        portfolioId,
        timeRange,
        totalReturn: 0.15,
        returns: [0.02, 0.03, -0.01, 0.04, 0.02, 0.01, 0.03, 0.02, 0.01, 0.02]
      };
    } catch (error) {
      logger.error('Error getting portfolio data:', error);
      throw error;
    }
  }

  async getBenchmarkData(portfolioId, timeRange) {
    try {
      // Mock implementation - in production, this would query the database
      return {
        portfolioId,
        timeRange,
        totalReturn: 0.12,
        returns: [0.01, 0.02, -0.02, 0.03, 0.01, 0.01, 0.02, 0.01, 0.01, 0.01]
      };
    } catch (error) {
      logger.error('Error getting benchmark data:', error);
      throw error;
    }
  }

  async storeRiskAdjustedReturns(calculation) {
    try {
      const query = `
        INSERT INTO risk_adjusted_returns (
          id, portfolio_id, time_range, risk_free_rate, user_id, 
          metrics_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        calculation.id,
        calculation.portfolioId,
        calculation.timeRange,
        calculation.riskFreeRate,
        calculation.userId,
        JSON.stringify(calculation.metrics),
        calculation.createdAt
      ]);
      
      logger.info(`Risk-adjusted returns calculation stored: ${calculation.id}`);
    } catch (error) {
      logger.error('Error storing risk-adjusted returns calculation:', error);
      throw error;
    }
  }

  async updateMetrics(portfolioId) {
    try {
      // Update risk metrics for a specific portfolio
      logger.info(`Updating risk metrics for portfolio ${portfolioId}`);
      
      // This would typically involve recalculating risk metrics
      // and updating the database
      
    } catch (error) {
      logger.error(`Error updating risk metrics for portfolio ${portfolioId}:`, error);
      throw error;
    }
  }
}

module.exports = RiskAdjustedReturnsCalculator;
