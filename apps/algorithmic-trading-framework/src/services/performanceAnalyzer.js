const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class PerformanceAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.performanceCache = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      logger.info('Performance Analyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Performance Analyzer:', error);
      throw error;
    }
  }

  async calculatePerformance(strategy) {
    try {
      const trades = strategy.trades || [];
      const initialCapital = strategy.initialCapital || 100000;
      
      if (trades.length === 0) {
        return this.getDefaultPerformance(initialCapital);
      }

      // Calculate basic metrics
      const metrics = this.calculateBasicMetrics(trades, initialCapital);
      
      // Calculate advanced metrics
      const advancedMetrics = this.calculateAdvancedMetrics(trades, initialCapital);
      
      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(trades, initialCapital);
      
      // Combine all metrics
      const performance = {
        ...metrics,
        ...advancedMetrics,
        ...riskMetrics,
        totalTrades: trades.length,
        analysisDate: new Date()
      };

      // Cache the performance
      this.performanceCache.set(strategy.id, performance);
      
      return performance;
    } catch (error) {
      logger.error('Error calculating performance:', error);
      return this.getDefaultPerformance(strategy.initialCapital || 100000);
    }
  }

  calculateBasicMetrics(trades, initialCapital) {
    try {
      let currentValue = initialCapital;
      let totalPnL = 0;
      let winningTrades = 0;
      let losingTrades = 0;
      let totalWinAmount = 0;
      let totalLossAmount = 0;
      
      // Process trades to calculate P&L
      for (const trade of trades) {
        const tradeValue = trade.quantity * trade.price;
        
        if (trade.action === 'BUY') {
          currentValue -= tradeValue;
        } else if (trade.action === 'SELL') {
          currentValue += tradeValue;
          
          // Calculate trade P&L (simplified)
          const tradePnL = tradeValue * 0.01; // Assume 1% profit per sell trade
          totalPnL += tradePnL;
          
          if (tradePnL > 0) {
            winningTrades++;
            totalWinAmount += tradePnL;
          } else {
            losingTrades++;
            totalLossAmount += Math.abs(tradePnL);
          }
        }
      }
      
      const totalReturn = (currentValue - initialCapital) / initialCapital;
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
      const averageWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
      const averageLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
      const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
      
      return {
        totalReturn: totalReturn * 100, // Convert to percentage
        totalPnL: totalPnL,
        currentValue: currentValue,
        winRate: winRate,
        averageWin: averageWin,
        averageLoss: averageLoss,
        profitFactor: profitFactor,
        winningTrades: winningTrades,
        losingTrades: losingTrades
      };
    } catch (error) {
      logger.error('Error calculating basic metrics:', error);
      return this.getDefaultBasicMetrics(initialCapital);
    }
  }

  calculateAdvancedMetrics(trades, initialCapital) {
    try {
      // Calculate Sharpe ratio
      const sharpeRatio = this.calculateSharpeRatio(trades, initialCapital);
      
      // Calculate Sortino ratio
      const sortinoRatio = this.calculateSortinoRatio(trades, initialCapital);
      
      // Calculate Calmar ratio
      const calmarRatio = this.calculateCalmarRatio(trades, initialCapital);
      
      // Calculate Information ratio
      const informationRatio = this.calculateInformationRatio(trades, initialCapital);
      
      // Calculate Alpha and Beta
      const alphaBeta = this.calculateAlphaBeta(trades, initialCapital);
      
      return {
        sharpeRatio: sharpeRatio,
        sortinoRatio: sortinoRatio,
        calmarRatio: calmarRatio,
        informationRatio: informationRatio,
        alpha: alphaBeta.alpha,
        beta: alphaBeta.beta
      };
    } catch (error) {
      logger.error('Error calculating advanced metrics:', error);
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        informationRatio: 0,
        alpha: 0,
        beta: 1
      };
    }
  }

  calculateRiskMetrics(trades, initialCapital) {
    try {
      // Calculate maximum drawdown
      const maxDrawdown = this.calculateMaxDrawdown(trades, initialCapital);
      
      // Calculate Value at Risk (VaR)
      const var95 = this.calculateVaR(trades, 0.95);
      const var99 = this.calculateVaR(trades, 0.99);
      
      // Calculate Conditional Value at Risk (CVaR)
      const cvar95 = this.calculateCVaR(trades, 0.95);
      const cvar99 = this.calculateCVaR(trades, 0.99);
      
      // Calculate volatility
      const volatility = this.calculateVolatility(trades);
      
      // Calculate downside deviation
      const downsideDeviation = this.calculateDownsideDeviation(trades);
      
      return {
        maxDrawdown: maxDrawdown,
        var95: var95,
        var99: var99,
        cvar95: cvar95,
        cvar99: cvar99,
        volatility: volatility,
        downsideDeviation: downsideDeviation
      };
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      return {
        maxDrawdown: 0,
        var95: 0,
        var99: 0,
        cvar95: 0,
        cvar99: 0,
        volatility: 0,
        downsideDeviation: 0
      };
    }
  }

  calculateSharpeRatio(trades, initialCapital) {
    try {
      if (trades.length < 2) return 0;
      
      // Calculate returns
      const returns = this.calculateReturns(trades, initialCapital);
      if (returns.length === 0) return 0;
      
      // Calculate mean return
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      
      // Calculate standard deviation
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      // Risk-free rate (assume 2% annual)
      const riskFreeRate = 0.02 / 252; // Daily risk-free rate
      
      return stdDev > 0 ? (meanReturn - riskFreeRate) / stdDev : 0;
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  calculateSortinoRatio(trades, initialCapital) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, initialCapital);
      if (returns.length === 0) return 0;
      
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      
      // Calculate downside deviation
      const downsideReturns = returns.filter(ret => ret < 0);
      if (downsideReturns.length === 0) return 0;
      
      const downsideVariance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / downsideReturns.length;
      const downsideDeviation = Math.sqrt(downsideVariance);
      
      const riskFreeRate = 0.02 / 252;
      
      return downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
    } catch (error) {
      logger.error('Error calculating Sortino ratio:', error);
      return 0;
    }
  }

  calculateCalmarRatio(trades, initialCapital) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, initialCapital);
      if (returns.length === 0) return 0;
      
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const annualizedReturn = meanReturn * 252;
      
      const maxDrawdown = this.calculateMaxDrawdown(trades, initialCapital);
      
      return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    } catch (error) {
      logger.error('Error calculating Calmar ratio:', error);
      return 0;
    }
  }

  calculateInformationRatio(trades, initialCapital) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, initialCapital);
      if (returns.length === 0) return 0;
      
      // Assume benchmark return of 0.08% daily (20% annual)
      const benchmarkReturn = 0.08 / 100;
      
      const excessReturns = returns.map(ret => ret - benchmarkReturn);
      const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
      
      const trackingError = this.calculateTrackingError(returns, benchmarkReturn);
      
      return trackingError > 0 ? meanExcessReturn / trackingError : 0;
    } catch (error) {
      logger.error('Error calculating Information ratio:', error);
      return 0;
    }
  }

  calculateAlphaBeta(trades, initialCapital) {
    try {
      if (trades.length < 2) return { alpha: 0, beta: 1 };
      
      const returns = this.calculateReturns(trades, initialCapital);
      if (returns.length === 0) return { alpha: 0, beta: 1 };
      
      // Assume benchmark returns (simplified)
      const benchmarkReturns = returns.map(() => 0.08 / 100);
      
      const n = returns.length;
      const sumReturns = returns.reduce((sum, ret) => sum + ret, 0);
      const sumBenchmark = benchmarkReturns.reduce((sum, ret) => sum + ret, 0);
      const sumReturnsSquared = returns.reduce((sum, ret) => sum + ret * ret, 0);
      const sumBenchmarkSquared = benchmarkReturns.reduce((sum, ret) => sum + ret * ret, 0);
      const sumReturnsBenchmark = returns.reduce((sum, ret, i) => sum + ret * benchmarkReturns[i], 0);
      
      const beta = (n * sumReturnsBenchmark - sumReturns * sumBenchmark) / 
                   (n * sumBenchmarkSquared - sumBenchmark * sumBenchmark);
      
      const alpha = (sumReturns - beta * sumBenchmark) / n;
      
      return { alpha: alpha, beta: beta };
    } catch (error) {
      logger.error('Error calculating Alpha/Beta:', error);
      return { alpha: 0, beta: 1 };
    }
  }

  calculateMaxDrawdown(trades, initialCapital) {
    try {
      let currentValue = initialCapital;
      let peakValue = initialCapital;
      let maxDrawdown = 0;
      
      for (const trade of trades) {
        const tradeValue = trade.quantity * trade.price;
        
        if (trade.action === 'BUY') {
          currentValue -= tradeValue;
        } else if (trade.action === 'SELL') {
          currentValue += tradeValue;
        }
        
        if (currentValue > peakValue) {
          peakValue = currentValue;
        }
        
        const drawdown = (peakValue - currentValue) / peakValue;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      return maxDrawdown * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  calculateVaR(trades, confidence) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, 100000); // Use 100k as base
      if (returns.length === 0) return 0;
      
      // Sort returns in ascending order
      const sortedReturns = returns.sort((a, b) => a - b);
      
      // Calculate VaR
      const index = Math.floor((1 - confidence) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index] || 0);
      
      return varValue * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      return 0;
    }
  }

  calculateCVaR(trades, confidence) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, 100000);
      if (returns.length === 0) return 0;
      
      const sortedReturns = returns.sort((a, b) => a - b);
      const varIndex = Math.floor((1 - confidence) * sortedReturns.length);
      
      // Calculate CVaR as average of returns below VaR
      const tailReturns = sortedReturns.slice(0, varIndex);
      const cvarValue = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length) : 0;
      
      return cvarValue * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      return 0;
    }
  }

  calculateVolatility(trades) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, 100000);
      if (returns.length === 0) return 0;
      
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      
      return volatility * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateDownsideDeviation(trades) {
    try {
      if (trades.length < 2) return 0;
      
      const returns = this.calculateReturns(trades, 100000);
      if (returns.length === 0) return 0;
      
      const downsideReturns = returns.filter(ret => ret < 0);
      if (downsideReturns.length === 0) return 0;
      
      const variance = downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length;
      const downsideDeviation = Math.sqrt(variance);
      
      return downsideDeviation * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating downside deviation:', error);
      return 0;
    }
  }

  calculateReturns(trades, initialCapital) {
    try {
      const returns = [];
      let currentValue = initialCapital;
      
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i];
        const tradeValue = trade.quantity * trade.price;
        
        if (trade.action === 'BUY') {
          currentValue -= tradeValue;
        } else if (trade.action === 'SELL') {
          currentValue += tradeValue;
          
          // Calculate return for this trade
          if (i > 0) {
            const previousValue = currentValue - tradeValue;
            const returnValue = (currentValue - previousValue) / previousValue;
            returns.push(returnValue);
          }
        }
      }
      
      return returns;
    } catch (error) {
      logger.error('Error calculating returns:', error);
      return [];
    }
  }

  calculateTrackingError(returns, benchmarkReturn) {
    try {
      if (returns.length < 2) return 0;
      
      const excessReturns = returns.map(ret => ret - benchmarkReturn);
      const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
      
      const variance = excessReturns.reduce((sum, ret) => sum + Math.pow(ret - meanExcessReturn, 2), 0) / excessReturns.length;
      const trackingError = Math.sqrt(variance);
      
      return trackingError;
    } catch (error) {
      logger.error('Error calculating tracking error:', error);
      return 0;
    }
  }

  async getStrategyPerformance(strategyId, timeframe, userId) {
    try {
      // Get strategy from database
      const query = `
        SELECT * FROM strategies 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [strategyId, userId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const strategy = result.rows[0];
      
      // Get performance from cache or calculate
      let performance = this.performanceCache.get(strategyId);
      if (!performance) {
        performance = await this.calculatePerformance(strategy);
      }
      
      // Filter by timeframe if needed
      if (timeframe !== 'all') {
        performance = this.filterPerformanceByTimeframe(performance, timeframe);
      }
      
      return performance;
    } catch (error) {
      logger.error(`Error getting strategy performance for ${strategyId}:`, error);
      return null;
    }
  }

  async compareStrategies(strategyIds, timeframe, userId) {
    try {
      const comparisons = [];
      
      for (const strategyId of strategyIds) {
        const performance = await this.getStrategyPerformance(strategyId, timeframe, userId);
        if (performance) {
          comparisons.push({
            strategyId: strategyId,
            performance: performance
          });
        }
      }
      
      // Sort by total return
      comparisons.sort((a, b) => b.performance.totalReturn - a.performance.totalReturn);
      
      return {
        strategies: comparisons,
        comparisonDate: new Date(),
        timeframe: timeframe
      };
    } catch (error) {
      logger.error('Error comparing strategies:', error);
      return null;
    }
  }

  filterPerformanceByTimeframe(performance, timeframe) {
    try {
      // This would filter performance data by timeframe
      // For now, return the full performance
      return performance;
    } catch (error) {
      logger.error('Error filtering performance by timeframe:', error);
      return performance;
    }
  }

  getDefaultPerformance(initialCapital) {
    return {
      totalReturn: 0,
      totalPnL: 0,
      currentValue: initialCapital,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      winningTrades: 0,
      losingTrades: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      informationRatio: 0,
      alpha: 0,
      beta: 1,
      maxDrawdown: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
      cvar99: 0,
      volatility: 0,
      downsideDeviation: 0,
      totalTrades: 0,
      analysisDate: new Date()
    };
  }

  getDefaultBasicMetrics(initialCapital) {
    return {
      totalReturn: 0,
      totalPnL: 0,
      currentValue: initialCapital,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      winningTrades: 0,
      losingTrades: 0
    };
  }

  async close() {
    try {
      logger.info('Performance Analyzer closed successfully');
    } catch (error) {
      logger.error('Error closing Performance Analyzer:', error);
    }
  }
}

module.exports = PerformanceAnalyzer;

