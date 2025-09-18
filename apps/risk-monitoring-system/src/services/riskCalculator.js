const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const math = require('mathjs');

class RiskCalculator extends EventEmitter {
  constructor() {
    super();
    this._initialized = false;
  }

  async initialize() {
    try {
      this._initialized = true;
      logger.info('RiskCalculator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RiskCalculator:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('RiskCalculator closed');
    } catch (error) {
      logger.error('Error closing RiskCalculator:', error);
    }
  }

  async calculateVaR(positions, confidenceLevel = 0.95, timeHorizon = 1, method = 'historical') {
    try {
      if (!this._initialized) {
        throw new Error('RiskCalculator not initialized');
      }

      logger.info('Calculating VaR', { 
        confidenceLevel, 
        timeHorizon, 
        method,
        positionCount: positions.length 
      });

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
          throw new Error(`Unknown VaR method: ${method}`);
      }

      logger.info('VaR calculated successfully', { 
        var: varResult.var,
        confidenceLevel,
        method 
      });

      return varResult;

    } catch (error) {
      logger.error('Error calculating VaR:', error);
      throw error;
    }
  }

  async calculateHistoricalVaR(positions, confidenceLevel, timeHorizon) {
    try {
      // Get historical returns for all positions
      const returns = await this.getHistoricalReturns(positions, timeHorizon);
      
      if (returns.length === 0) {
        throw new Error('No historical returns available');
      }

      // Calculate portfolio returns
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Sort returns
      const sortedReturns = portfolioReturns.sort((a, b) => a - b);
      
      // Calculate VaR
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index]);
      
      // Calculate additional metrics
      const meanReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const volatility = this.calculateVolatility(portfolioReturns);
      const skewness = this.calculateSkewness(portfolioReturns);
      const kurtosis = this.calculateKurtosis(portfolioReturns);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'historical',
        meanReturn,
        volatility,
        skewness,
        kurtosis,
        sampleSize: portfolioReturns.length,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating historical VaR:', error);
      throw error;
    }
  }

  async calculateParametricVaR(positions, confidenceLevel, timeHorizon) {
    try {
      // Calculate portfolio statistics
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      
      // Calculate VaR using normal distribution assumption
      const zScore = this.getZScore(confidenceLevel);
      const varValue = Math.abs(portfolioStats.meanReturn + zScore * portfolioStats.volatility);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'parametric',
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        zScore,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating parametric VaR:', error);
      throw error;
    }
  }

  async calculateMonteCarloVaR(positions, confidenceLevel, timeHorizon, simulations = 10000) {
    try {
      // Get portfolio statistics
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      
      // Generate random returns using Monte Carlo simulation
      const simulatedReturns = this.generateMonteCarloReturns(
        portfolioStats.meanReturn,
        portfolioStats.volatility,
        simulations
      );
      
      // Sort returns
      const sortedReturns = simulatedReturns.sort((a, b) => a - b);
      
      // Calculate VaR
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index]);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'monte_carlo',
        simulations,
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating Monte Carlo VaR:', error);
      throw error;
    }
  }

  async calculateCVaR(positions, confidenceLevel = 0.95, timeHorizon = 1) {
    try {
      logger.info('Calculating CVaR', { confidenceLevel, timeHorizon });

      // Calculate VaR first
      const varResult = await this.calculateVaR(positions, confidenceLevel, timeHorizon, 'historical');
      
      // Get historical returns
      const returns = await this.getHistoricalReturns(positions, timeHorizon);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Filter returns that are worse than VaR
      const tailReturns = portfolioReturns.filter(r => r <= -varResult.var);
      
      // Calculate CVaR (expected value of tail returns)
      const cvar = tailReturns.length > 0 
        ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length)
        : varResult.var;
      
      return {
        cvar,
        var: varResult.var,
        confidenceLevel,
        timeHorizon,
        tailReturns: tailReturns.length,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      throw error;
    }
  }

  async calculatePortfolioStatistics(positions) {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      const meanReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const volatility = this.calculateVolatility(portfolioReturns);
      
      return {
        meanReturn,
        volatility,
        sampleSize: portfolioReturns.length
      };

    } catch (error) {
      logger.error('Error calculating portfolio statistics:', error);
      throw error;
    }
  }

  async getHistoricalReturns(positions, timeHorizon) {
    try {
      // Mock historical returns - in production, this would fetch from database
      const returns = [];
      const days = 252; // One year of trading days
      
      for (let i = 0; i < days; i++) {
        const dayReturns = {};
        
        for (const position of positions) {
          // Generate random returns based on position characteristics
          const volatility = position.volatility || 0.2;
          const meanReturn = position.meanReturn || 0.001;
          const returnValue = this.generateRandomReturn(meanReturn, volatility);
          dayReturns[position.symbol] = returnValue;
        }
        
        returns.push(dayReturns);
      }
      
      return returns;

    } catch (error) {
      logger.error('Error getting historical returns:', error);
      return [];
    }
  }

  calculatePortfolioReturns(positions, returns) {
    try {
      const portfolioReturns = [];
      
      for (const dayReturns of returns) {
        let portfolioReturn = 0;
        let totalWeight = 0;
        
        for (const position of positions) {
          const weight = position.weight || (1 / positions.length);
          const symbolReturn = dayReturns[position.symbol] || 0;
          portfolioReturn += weight * symbolReturn;
          totalWeight += weight;
        }
        
        if (totalWeight > 0) {
          portfolioReturn /= totalWeight;
        }
        
        portfolioReturns.push(portfolioReturn);
      }
      
      return portfolioReturns;

    } catch (error) {
      logger.error('Error calculating portfolio returns:', error);
      return [];
    }
  }

  calculateVolatility(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance);

    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateSkewness(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev === 0) return 0;
      
      const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
      
      return skewness;

    } catch (error) {
      logger.error('Error calculating skewness:', error);
      return 0;
    }
  }

  calculateKurtosis(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev === 0) return 0;
      
      const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
      
      return kurtosis;

    } catch (error) {
      logger.error('Error calculating kurtosis:', error);
      return 0;
    }
  }

  getZScore(confidenceLevel) {
    // Z-scores for common confidence levels
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326,
      0.999: 3.090
    };
    
    return zScores[confidenceLevel] || 1.645;
  }

  generateRandomReturn(mean, volatility) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return mean + volatility * z0;
  }

  generateMonteCarloReturns(mean, volatility, simulations) {
    const returns = [];
    
    for (let i = 0; i < simulations; i++) {
      const returnValue = this.generateRandomReturn(mean, volatility);
      returns.push(returnValue);
    }
    
    return returns;
  }

  async calculateSharpeRatio(positions, riskFreeRate = 0.02) {
    try {
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      const excessReturn = portfolioStats.meanReturn - riskFreeRate;
      
      return {
        sharpeRatio: portfolioStats.volatility > 0 ? excessReturn / portfolioStats.volatility : 0,
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        riskFreeRate,
        excessReturn
      };

    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      throw error;
    }
  }

  async calculateMaximumDrawdown(positions) {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      let maxDrawdown = 0;
      let peak = 0;
      let currentValue = 1;
      
      for (const returnValue of portfolioReturns) {
        currentValue *= (1 + returnValue);
        
        if (currentValue > peak) {
          peak = currentValue;
        }
        
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
      
      return {
        maxDrawdown,
        peak,
        currentValue,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating maximum drawdown:', error);
      throw error;
    }
  }

  async calculateBeta(positions, marketIndex = 'SPY') {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Mock market returns
      const marketReturns = portfolioReturns.map(() => this.generateRandomReturn(0.0008, 0.15));
      
      // Calculate covariance and variance
      const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
      
      let covariance = 0;
      let marketVariance = 0;
      
      for (let i = 0; i < portfolioReturns.length; i++) {
        covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
        marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
      }
      
      covariance /= portfolioReturns.length;
      marketVariance /= portfolioReturns.length;
      
      const beta = marketVariance > 0 ? covariance / marketVariance : 0;
      
      return {
        beta,
        covariance,
        marketVariance,
        portfolioMean,
        marketMean,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating beta:', error);
      throw error;
    }
  }
}

module.exports = RiskCalculator;
