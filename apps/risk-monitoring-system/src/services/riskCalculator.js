const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class RiskCalculator extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.historicalData = new Map();
    this.correlationMatrix = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      logger.info('Risk Calculator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Risk Calculator:', error);
      throw error;
    }
  }

  async calculateVaR(positions, confidenceLevel = 0.95, timeHorizon = 1, method = 'historical') {
    try {
      const startTime = Date.now();
      
      let varResult;
      
      switch (method) {
        case 'historical':
          varResult = await this.calculateHistoricalVaR(positions, confidenceLevel, timeHorizon);
          break;
        case 'parametric':
          varResult = await this.calculateParametricVaR(positions, confidenceLevel, timeHorizon);
          break;
        case 'monte_carlo':
          varResult = await this.calculateMonteCarloVaR(positions, confidenceLevel, timeHorizon);
          break;
        default:
          throw new Error(`Unsupported VaR method: ${method}`);
      }
      
      const duration = Date.now() - startTime;
      
      logger.performance('VaR calculation', duration, {
        method,
        confidenceLevel,
        timeHorizon,
        positionsCount: positions.length
      });
      
      return {
        var: varResult.var,
        confidenceLevel,
        timeHorizon,
        method,
        calculationTime: duration,
        timestamp: new Date().toISOString(),
        details: varResult.details
      };
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      throw error;
    }
  }

  async calculateHistoricalVaR(positions, confidenceLevel, timeHorizon) {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252); // 1 year of data
      
      if (historicalReturns.length === 0) {
        throw new Error('Insufficient historical data for VaR calculation');
      }
      
      // Calculate portfolio returns
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      
      // Sort returns and find VaR
      const sortedReturns = portfolioReturns.sort((a, b) => a - b);
      const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var = Math.abs(sortedReturns[varIndex] || 0);
      
      return {
        var,
        details: {
          dataPoints: portfolioReturns.length,
          minReturn: Math.min(...portfolioReturns),
          maxReturn: Math.max(...portfolioReturns),
          meanReturn: portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length,
          stdDev: this.calculateStandardDeviation(portfolioReturns)
        }
      };
    } catch (error) {
      logger.error('Error calculating historical VaR:', error);
      throw error;
    }
  }

  async calculateParametricVaR(positions, confidenceLevel, timeHorizon) {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      
      if (historicalReturns.length === 0) {
        throw new Error('Insufficient historical data for parametric VaR calculation');
      }
      
      // Calculate portfolio statistics
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      const meanReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
      const stdDev = this.calculateStandardDeviation(portfolioReturns);
      
      // Calculate VaR using normal distribution
      const zScore = this.getZScore(confidenceLevel);
      const var = Math.abs(meanReturn - zScore * stdDev * Math.sqrt(timeHorizon));
      
      return {
        var,
        details: {
          meanReturn,
          stdDev,
          zScore,
          timeHorizon,
          dataPoints: portfolioReturns.length
        }
      };
    } catch (error) {
      logger.error('Error calculating parametric VaR:', error);
      throw error;
    }
  }

  async calculateMonteCarloVaR(positions, confidenceLevel, timeHorizon, simulations = 10000) {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      
      if (historicalReturns.length === 0) {
        throw new Error('Insufficient historical data for Monte Carlo VaR calculation');
      }
      
      // Calculate portfolio statistics
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      const meanReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
      const stdDev = this.calculateStandardDeviation(portfolioReturns);
      
      // Generate Monte Carlo simulations
      const simulatedReturns = [];
      for (let i = 0; i < simulations; i++) {
        const randomReturn = this.generateRandomReturn(meanReturn, stdDev, timeHorizon);
        simulatedReturns.push(randomReturn);
      }
      
      // Sort and find VaR
      const sortedReturns = simulatedReturns.sort((a, b) => a - b);
      const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var = Math.abs(sortedReturns[varIndex] || 0);
      
      return {
        var,
        details: {
          simulations,
          meanReturn,
          stdDev,
          timeHorizon,
          dataPoints: portfolioReturns.length
        }
      };
    } catch (error) {
      logger.error('Error calculating Monte Carlo VaR:', error);
      throw error;
    }
  }

  async calculateCVaR(positions, confidenceLevel = 0.95, timeHorizon = 1) {
    try {
      const startTime = Date.now();
      
      // First calculate VaR
      const varResult = await this.calculateVaR(positions, confidenceLevel, timeHorizon, 'historical');
      
      // Get historical returns for CVaR calculation
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      
      // Find returns below VaR threshold
      const varThreshold = -varResult.var;
      const tailReturns = portfolioReturns.filter(ret => ret <= varThreshold);
      
      // Calculate CVaR as average of tail returns
      const cvar = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length) : 0;
      
      const duration = Date.now() - startTime;
      
      logger.performance('CVaR calculation', duration, {
        confidenceLevel,
        timeHorizon,
        positionsCount: positions.length
      });
      
      return {
        cvar,
        var: varResult.var,
        confidenceLevel,
        timeHorizon,
        calculationTime: duration,
        timestamp: new Date().toISOString(),
        details: {
          tailReturnsCount: tailReturns.length,
          totalReturnsCount: portfolioReturns.length,
          tailProbability: tailReturns.length / portfolioReturns.length
        }
      };
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      throw error;
    }
  }

  async calculatePortfolioReturns(positions, historicalReturns) {
    try {
      const portfolioReturns = [];
      
      for (let i = 1; i < historicalReturns.length; i++) {
        let portfolioReturn = 0;
        let totalValue = 0;
        
        for (const position of positions) {
          const symbolReturns = historicalReturns[i][position.symbol];
          const positionValue = position.quantity * position.price;
          const positionReturn = symbolReturns * positionValue;
          
          portfolioReturn += positionReturn;
          totalValue += positionValue;
        }
        
        if (totalValue > 0) {
          portfolioReturns.push(portfolioReturn / totalValue);
        }
      }
      
      return portfolioReturns;
    } catch (error) {
      logger.error('Error calculating portfolio returns:', error);
      throw error;
    }
  }

  async getHistoricalReturns(symbols, days) {
    try {
      const returns = [];
      
      for (const symbol of symbols) {
        const historicalData = await this.getHistoricalData(symbol, days);
        if (historicalData.length > 0) {
          const symbolReturns = this.calculateSymbolReturns(historicalData);
          returns.push({ symbol, returns: symbolReturns });
        }
      }
      
      // Align returns by date
      const alignedReturns = this.alignReturnsByDate(returns);
      
      return alignedReturns;
    } catch (error) {
      logger.error('Error getting historical returns:', error);
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
        SELECT timestamp, open, high, low, close, volume
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

  calculateSymbolReturns(historicalData) {
    try {
      const returns = [];
      
      for (let i = 1; i < historicalData.length; i++) {
        const currentPrice = historicalData[i].close;
        const previousPrice = historicalData[i - 1].close;
        
        if (previousPrice > 0) {
          const returnValue = (currentPrice - previousPrice) / previousPrice;
          returns.push(returnValue);
        }
      }
      
      return returns;
    } catch (error) {
      logger.error('Error calculating symbol returns:', error);
      return [];
    }
  }

  alignReturnsByDate(returnsData) {
    try {
      if (returnsData.length === 0) return [];
      
      const minLength = Math.min(...returnsData.map(r => r.returns.length));
      const alignedReturns = [];
      
      for (let i = 0; i < minLength; i++) {
        const dayReturns = {};
        
        for (const { symbol, returns } of returnsData) {
          dayReturns[symbol] = returns[i];
        }
        
        alignedReturns.push(dayReturns);
      }
      
      return alignedReturns;
    } catch (error) {
      logger.error('Error aligning returns by date:', error);
      return [];
    }
  }

  calculateStandardDeviation(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating standard deviation:', error);
      return 0;
    }
  }

  getZScore(confidenceLevel) {
    // Common z-scores for normal distribution
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326,
      0.999: 3.090
    };
    
    return zScores[confidenceLevel] || 1.645; // Default to 95%
  }

  generateRandomReturn(mean, stdDev, timeHorizon) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return mean * timeHorizon + stdDev * Math.sqrt(timeHorizon) * z0;
  }

  async calculateSharpeRatio(positions, riskFreeRate = 0.02) {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      
      if (portfolioReturns.length === 0) return 0;
      
      const meanReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
      const stdDev = this.calculateStandardDeviation(portfolioReturns);
      
      const annualizedReturn = meanReturn * 252;
      const annualizedStdDev = stdDev * Math.sqrt(252);
      
      return annualizedStdDev > 0 ? (annualizedReturn - riskFreeRate) / annualizedStdDev : 0;
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  async calculateMaxDrawdown(positions) {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      
      if (portfolioReturns.length === 0) return 0;
      
      let maxDrawdown = 0;
      let peak = 0;
      let currentValue = 1; // Start with 1 (100%)
      
      for (const returnValue of portfolioReturns) {
        currentValue *= (1 + returnValue);
        
        if (currentValue > peak) {
          peak = currentValue;
        }
        
        const drawdown = (peak - currentValue) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      return maxDrawdown;
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  async calculateBeta(positions, benchmarkSymbol = 'SPY') {
    try {
      const symbols = positions.map(p => p.symbol);
      const historicalReturns = await this.getHistoricalReturns(symbols, 252);
      const benchmarkReturns = await this.getHistoricalReturns([benchmarkSymbol], 252);
      
      if (historicalReturns.length === 0 || benchmarkReturns.length === 0) return 1;
      
      const portfolioReturns = this.calculatePortfolioReturns(positions, historicalReturns);
      const benchmarkPortfolioReturns = this.calculatePortfolioReturns(
        [{ symbol: benchmarkSymbol, quantity: 1, price: 1 }], 
        benchmarkReturns
      );
      
      if (portfolioReturns.length !== benchmarkPortfolioReturns.length) return 1;
      
      // Calculate covariance and variance
      const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
      const benchmarkMean = benchmarkPortfolioReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkPortfolioReturns.length;
      
      let covariance = 0;
      let benchmarkVariance = 0;
      
      for (let i = 0; i < portfolioReturns.length; i++) {
        const portfolioDiff = portfolioReturns[i] - portfolioMean;
        const benchmarkDiff = benchmarkPortfolioReturns[i] - benchmarkMean;
        
        covariance += portfolioDiff * benchmarkDiff;
        benchmarkVariance += benchmarkDiff * benchmarkDiff;
      }
      
      covariance /= portfolioReturns.length;
      benchmarkVariance /= portfolioReturns.length;
      
      return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
    } catch (error) {
      logger.error('Error calculating beta:', error);
      return 1;
    }
  }

  async close() {
    try {
      logger.info('Risk Calculator closed successfully');
    } catch (error) {
      logger.error('Error closing Risk Calculator:', error);
    }
  }
}

module.exports = RiskCalculator;