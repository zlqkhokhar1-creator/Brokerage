const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class BacktestEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.runningBacktests = new Map();
    this.backtestResults = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      this._initialized = true;
      logger.info('BacktestEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize BacktestEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Stop all running backtests
      for (const [backtestId, backtest] of this.runningBacktests) {
        await this.stopBacktest(backtestId);
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('BacktestEngine closed');
    } catch (error) {
      logger.error('Error closing BacktestEngine:', error);
    }
  }

  async runBacktest(strategyId, startDate, endDate, initialCapital, symbols, userId) {
    try {
      const backtestId = nanoid();
      const backtest = {
        id: backtestId,
        strategyId,
        startDate,
        endDate,
        initialCapital,
        symbols,
        userId,
        status: 'running',
        progress: 0,
        results: null,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString()
      };

      // Store backtest
      await this.storeBacktest(backtest);
      this.runningBacktests.set(backtestId, backtest);
      
      // Start backtest execution
      this.executeBacktest(backtestId);
      
      logger.info(`Backtest started: ${backtestId}`, { strategyId, userId });
      this.emit('backtestStarted', backtest);
      
      return backtest;
    } catch (error) {
      logger.error('Error starting backtest:', error);
      throw error;
    }
  }

  async executeBacktest(backtestId) {
    try {
      const backtest = this.runningBacktests.get(backtestId);
      if (!backtest) {
        throw new Error('Backtest not found');
      }

      // Get strategy
      const strategy = await this.getStrategy(backtest.strategyId, backtest.userId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Load plugin
      const plugin = await this.loadPlugin(strategy.pluginId);
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Create strategy instance
      const instance = new plugin.instance.constructor(strategy.config);
      await instance.initialize(backtest.symbols);

      // Get historical data
      const historicalData = await this.getHistoricalData(
        backtest.symbols,
        backtest.startDate,
        backtest.endDate
      );

      // Run backtest
      const results = await this.runBacktestSimulation(
        instance,
        historicalData,
        backtest.initialCapital,
        backtest
      );

      // Update backtest
      backtest.status = 'completed';
      backtest.results = results;
      backtest.completedAt = new Date().toISOString();
      backtest.progress = 100;

      // Store results
      await this.updateBacktest(backtest);
      this.backtestResults.set(backtestId, results);
      this.runningBacktests.delete(backtestId);

      logger.info(`Backtest completed: ${backtestId}`, { strategyId: backtest.strategyId });
      this.emit('backtestCompleted', backtest);

    } catch (error) {
      logger.error(`Backtest execution failed: ${backtestId}`, error);
      
      const backtest = this.runningBacktests.get(backtestId);
      if (backtest) {
        backtest.status = 'failed';
        backtest.error = error.message;
        backtest.failedAt = new Date().toISOString();
        await this.updateBacktest(backtest);
        this.runningBacktests.delete(backtestId);
      }
      
      this.emit('backtestFailed', error, backtest);
    }
  }

  async runBacktestSimulation(instance, historicalData, initialCapital, backtest) {
    try {
      const portfolio = {
        cash: initialCapital,
        positions: {},
        totalValue: initialCapital,
        trades: [],
        equity: [initialCapital]
      };

      const symbols = Object.keys(historicalData);
      const maxLength = Math.max(...symbols.map(symbol => historicalData[symbol].length));
      
      // Process each time step
      for (let i = 0; i < maxLength; i++) {
        // Update progress
        backtest.progress = Math.round((i / maxLength) * 100);
        await this.updateBacktest(backtest);
        
        // Prepare data for current time step
        const currentData = {};
        for (const symbol of symbols) {
          if (historicalData[symbol][i]) {
            currentData[symbol] = historicalData[symbol].slice(0, i + 1);
          }
        }

        // Execute strategy for each symbol
        for (const symbol of symbols) {
          if (!currentData[symbol]) continue;

          try {
            const signal = instance.onTick(currentData[symbol]);
            
            if (signal) {
              await this.processBacktestSignal(signal, symbol, historicalData[symbol][i], portfolio);
            }
          } catch (error) {
            logger.error(`Error processing signal for ${symbol}:`, error);
          }
        }

        // Update portfolio value
        await this.updatePortfolioValue(portfolio, historicalData, i);
        portfolio.equity.push(portfolio.totalValue);
      }

      // Calculate final results
      const results = this.calculateBacktestResults(portfolio, backtest);
      
      return results;
    } catch (error) {
      logger.error('Error running backtest simulation:', error);
      throw error;
    }
  }

  async processBacktestSignal(signal, symbol, currentPrice, portfolio) {
    try {
      const { action, confidence, reason } = signal;
      const price = currentPrice.close;
      const quantity = Math.floor((portfolio.cash * 0.1) / price); // Use 10% of cash

      if (action === 'BUY' && portfolio.cash >= price * quantity) {
        // Execute buy order
        const cost = price * quantity;
        portfolio.cash -= cost;
        portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) + quantity;
        
        portfolio.trades.push({
          id: nanoid(),
          symbol,
          action: 'BUY',
          quantity,
          price,
          cost,
          timestamp: currentPrice.timestamp,
          reason,
          confidence
        });
      } else if (action === 'SELL' && portfolio.positions[symbol] > 0) {
        // Execute sell order
        const quantity = portfolio.positions[symbol];
        const proceeds = price * quantity;
        portfolio.cash += proceeds;
        portfolio.positions[symbol] = 0;
        
        portfolio.trades.push({
          id: nanoid(),
          symbol,
          action: 'SELL',
          quantity,
          price,
          cost: proceeds,
          timestamp: currentPrice.timestamp,
          reason,
          confidence
        });
      }
    } catch (error) {
      logger.error('Error processing backtest signal:', error);
    }
  }

  async updatePortfolioValue(portfolio, historicalData, timeIndex) {
    try {
      let totalValue = portfolio.cash;
      
      for (const [symbol, quantity] of Object.entries(portfolio.positions)) {
        if (quantity > 0 && historicalData[symbol][timeIndex]) {
          const currentPrice = historicalData[symbol][timeIndex].close;
          totalValue += currentPrice * quantity;
        }
      }
      
      portfolio.totalValue = totalValue;
    } catch (error) {
      logger.error('Error updating portfolio value:', error);
    }
  }

  calculateBacktestResults(portfolio, backtest) {
    try {
      const equity = portfolio.equity;
      const trades = portfolio.trades;
      
      // Basic metrics
      const totalReturn = (equity[equity.length - 1] - equity[0]) / equity[0];
      const totalTrades = trades.length;
      const winningTrades = trades.filter(trade => {
        const buyTrade = trades.find(t => t.symbol === trade.symbol && t.action === 'BUY' && t.timestamp < trade.timestamp);
        return buyTrade && trade.price > buyTrade.price;
      }).length;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      
      // Calculate Sharpe ratio
      const returns = [];
      for (let i = 1; i < equity.length; i++) {
        returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
      }
      
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const returnVariance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
      const returnStdDev = Math.sqrt(returnVariance);
      const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
      
      // Calculate maximum drawdown
      let maxDrawdown = 0;
      let peak = equity[0];
      
      for (let i = 1; i < equity.length; i++) {
        if (equity[i] > peak) {
          peak = equity[i];
        }
        const drawdown = (peak - equity[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
      
      // Calculate other metrics
      const finalValue = equity[equity.length - 1];
      const profitLoss = finalValue - backtest.initialCapital;
      const profitLossPercent = (profitLoss / backtest.initialCapital) * 100;
      
      return {
        backtestId: backtest.id,
        strategyId: backtest.strategyId,
        startDate: backtest.startDate,
        endDate: backtest.endDate,
        initialCapital: backtest.initialCapital,
        finalValue,
        profitLoss,
        profitLossPercent,
        totalReturn,
        totalTrades,
        winningTrades,
        winRate,
        sharpeRatio,
        maxDrawdown,
        equity,
        trades,
        metrics: {
          avgReturn,
          returnStdDev,
          volatility: returnStdDev * Math.sqrt(252), // Annualized
          calmarRatio: totalReturn / maxDrawdown,
          sortinoRatio: this.calculateSortinoRatio(returns),
          var95: this.calculateVaR(returns, 0.95),
          var99: this.calculateVaR(returns, 0.99)
        },
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating backtest results:', error);
      throw error;
    }
  }

  calculateSortinoRatio(returns) {
    try {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const negativeReturns = returns.filter(r => r < 0);
      const downsideDeviation = Math.sqrt(
        negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negativeReturns.length
      );
      return downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
    } catch (error) {
      return 0;
    }
  }

  calculateVaR(returns, confidence) {
    try {
      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidence) * sortedReturns.length);
      return sortedReturns[index] || 0;
    } catch (error) {
      return 0;
    }
  }

  async getBacktest(backtestId, userId) {
    try {
      const query = 'SELECT * FROM backtests WHERE id = $1 AND user_id = $2';
      const result = await pool.query(query, [backtestId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Backtest not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        strategyId: row.strategy_id,
        startDate: row.start_date,
        endDate: row.end_date,
        initialCapital: row.initial_capital,
        symbols: JSON.parse(row.symbols),
        status: row.status,
        progress: row.progress,
        results: row.results ? JSON.parse(row.results) : null,
        error: row.error,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        failedAt: row.failed_at
      };
    } catch (error) {
      logger.error('Error getting backtest:', error);
      throw error;
    }
  }

  async getBacktestResults(backtestId, userId) {
    try {
      const backtest = await this.getBacktest(backtestId, userId);
      
      if (backtest.status !== 'completed') {
        throw new Error('Backtest not completed');
      }
      
      return backtest.results;
    } catch (error) {
      logger.error('Error getting backtest results:', error);
      throw error;
    }
  }

  async getHistoricalData(symbols, startDate, endDate) {
    try {
      const historicalData = {};
      
      for (const symbol of symbols) {
        // Get data from database
        const query = `
          SELECT timestamp, open, high, low, close, volume
          FROM market_data
          WHERE symbol = $1 AND timestamp BETWEEN $2 AND $3
          ORDER BY timestamp ASC
        `;
        
        const result = await pool.query(query, [symbol, startDate, endDate]);
        historicalData[symbol] = result.rows;
      }
      
      return historicalData;
    } catch (error) {
      logger.error('Error getting historical data:', error);
      return {};
    }
  }

  async getStrategy(strategyId, userId) {
    try {
      const query = 'SELECT * FROM strategies WHERE id = $1 AND user_id = $2';
      const result = await pool.query(query, [strategyId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        pluginId: row.plugin_id,
        config: JSON.parse(row.config),
        symbols: JSON.parse(row.symbols),
        userId: row.user_id
      };
    } catch (error) {
      logger.error('Error getting strategy:', error);
      return null;
    }
  }

  async loadPlugin(pluginId) {
    try {
      // Mock plugin loading
      return {
        instance: {
          constructor: class MockStrategy {
            constructor(config) {
              this.config = config;
            }
            
            async initialize(symbols) {
              this.symbols = symbols;
            }
            
            onTick(data) {
              // Mock strategy logic
              return null;
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error loading plugin:', error);
      throw error;
    }
  }

  async storeBacktest(backtest) {
    try {
      const query = `
        INSERT INTO backtests (
          id, strategy_id, user_id, start_date, end_date, initial_capital,
          symbols, status, progress, created_at, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(query, [
        backtest.id,
        backtest.strategyId,
        backtest.userId,
        backtest.startDate,
        backtest.endDate,
        backtest.initialCapital,
        JSON.stringify(backtest.symbols),
        backtest.status,
        backtest.progress,
        backtest.createdAt,
        backtest.startedAt
      ]);
    } catch (error) {
      logger.error('Error storing backtest:', error);
      throw error;
    }
  }

  async updateBacktest(backtest) {
    try {
      const query = `
        UPDATE backtests SET
          status = $2,
          progress = $3,
          results = $4,
          error = $5,
          completed_at = $6,
          failed_at = $7
        WHERE id = $1
      `;
      
      await pool.query(query, [
        backtest.id,
        backtest.status,
        backtest.progress,
        backtest.results ? JSON.stringify(backtest.results) : null,
        backtest.error,
        backtest.completedAt,
        backtest.failedAt
      ]);
    } catch (error) {
      logger.error('Error updating backtest:', error);
      throw error;
    }
  }

  async stopBacktest(backtestId) {
    try {
      const backtest = this.runningBacktests.get(backtestId);
      if (backtest) {
        backtest.status = 'stopped';
        backtest.stoppedAt = new Date().toISOString();
        await this.updateBacktest(backtest);
        this.runningBacktests.delete(backtestId);
      }
    } catch (error) {
      logger.error('Error stopping backtest:', error);
    }
  }

  async cleanupBacktest(backtestId) {
    try {
      const query = 'DELETE FROM backtests WHERE id = $1';
      await pool.query(query, [backtestId]);
      this.backtestResults.delete(backtestId);
    } catch (error) {
      logger.error('Error cleaning up backtest:', error);
    }
  }
}

module.exports = BacktestEngine;
