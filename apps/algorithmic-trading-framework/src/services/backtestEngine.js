const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const PluginManager = require('./pluginManager');
const MarketDataProvider = require('./marketDataProvider');
const RiskManager = require('./riskManager');

class BacktestEngine extends EventEmitter {
  constructor() {
    super();
    this.runningBacktests = new Map();
    this.redis = null;
    this.db = null;
    this.pluginManager = null;
    this.marketDataProvider = null;
    this.riskManager = null;
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      this.pluginManager = new PluginManager();
      this.marketDataProvider = new MarketDataProvider();
      this.riskManager = new RiskManager();
      
      await this.pluginManager.initialize();
      await this.marketDataProvider.initialize();
      await this.riskManager.initialize();
      
      logger.info('Backtest Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Backtest Engine:', error);
      throw error;
    }
  }

  async runBacktest(strategyId, startDate, endDate, initialCapital, symbols, userId) {
    try {
      const backtestId = uuidv4();
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        throw new Error('Start date must be before end date');
      }

      // Get strategy from database
      const strategy = await this.getStrategy(strategyId, userId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      // Create backtest record
      const backtest = {
        id: backtestId,
        strategyId: strategyId,
        userId: userId,
        startDate: start,
        endDate: end,
        initialCapital: initialCapital,
        symbols: symbols,
        status: 'running',
        createdAt: new Date(),
        results: {
          totalReturn: 0,
          annualizedReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0,
          finalValue: initialCapital,
          peakValue: initialCapital
        },
        trades: [],
        equityCurve: [],
        drawdownCurve: []
      };

      // Store backtest in database
      await this.saveBacktest(backtest);
      this.runningBacktests.set(backtestId, backtest);

      // Start backtest execution
      this.executeBacktest(backtestId);

      logger.info(`Backtest ${backtestId} started for strategy ${strategyId}`);
      this.emit('backtestStarted', backtest);

      return backtest;
    } catch (error) {
      logger.error('Failed to run backtest:', error);
      throw error;
    }
  }

  async executeBacktest(backtestId) {
    try {
      const backtest = this.runningBacktests.get(backtestId);
      if (!backtest) {
        throw new Error(`Backtest ${backtestId} not found`);
      }

      // Get strategy
      const strategy = await this.getStrategy(backtest.strategyId, backtest.userId);
      if (!strategy) {
        throw new Error(`Strategy ${backtest.strategyId} not found`);
      }

      // Load plugin instance
      const pluginInstance = await this.pluginManager.getPluginInstance(strategy.pluginId);
      if (!pluginInstance) {
        throw new Error(`Plugin ${strategy.pluginId} not loaded`);
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(
        backtest.symbols, 
        backtest.startDate, 
        backtest.endDate
      );

      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      // Initialize backtest state
      let currentValue = backtest.initialCapital;
      let peakValue = backtest.initialCapital;
      let maxDrawdown = 0;
      let trades = [];
      let equityCurve = [];
      let drawdownCurve = [];

      // Process each data point
      for (const dataPoint of historicalData) {
        // Process data through plugin
        const signal = pluginInstance.instance.onData(dataPoint);
        
        if (signal) {
          // Validate trade with risk manager
          const riskCheck = await this.riskManager.validateTrade({
            symbol: dataPoint.symbol,
            action: signal.action,
            quantity: signal.quantity,
            price: dataPoint.close,
            userId: backtest.userId,
            strategyId: backtest.strategyId,
            isBacktest: true
          });

          if (riskCheck.approved) {
            // Execute trade
            const trade = this.executeBacktestTrade(
              backtestId,
              dataPoint,
              signal,
              currentValue
            );

            if (trade) {
              trades.push(trade);
              
              // Update portfolio value
              const tradeValue = trade.quantity * trade.price;
              if (trade.action === 'BUY') {
                currentValue -= tradeValue;
              } else if (trade.action === 'SELL') {
                currentValue += tradeValue;
              }

              // Update peak value and drawdown
              if (currentValue > peakValue) {
                peakValue = currentValue;
              }
              
              const drawdown = (peakValue - currentValue) / peakValue;
              if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
              }
            }
          }
        }

        // Record equity curve point
        equityCurve.push({
          timestamp: dataPoint.timestamp,
          value: currentValue,
          price: dataPoint.close
        });

        // Record drawdown curve point
        drawdownCurve.push({
          timestamp: dataPoint.timestamp,
          drawdown: (peakValue - currentValue) / peakValue * 100
        });
      }

      // Calculate final results
      const results = this.calculateBacktestResults(
        trades,
        backtest.initialCapital,
        currentValue,
        peakValue,
        maxDrawdown,
        backtest.startDate,
        backtest.endDate
      );

      // Update backtest with results
      backtest.results = results;
      backtest.trades = trades;
      backtest.equityCurve = equityCurve;
      backtest.drawdownCurve = drawdownCurve;
      backtest.status = 'completed';
      backtest.completedAt = new Date();

      // Save results to database
      await this.updateBacktest(backtest);

      // Remove from running backtests
      this.runningBacktests.delete(backtestId);

      logger.info(`Backtest ${backtestId} completed successfully`);
      this.emit('backtestCompleted', backtest);

    } catch (error) {
      logger.error(`Error executing backtest ${backtestId}:`, error);
      
      // Update backtest status to failed
      const backtest = this.runningBacktests.get(backtestId);
      if (backtest) {
        backtest.status = 'failed';
        backtest.error = error.message;
        backtest.completedAt = new Date();
        await this.updateBacktest(backtest);
        this.runningBacktests.delete(backtestId);
      }

      this.emit('backtestError', error, { backtestId });
    }
  }

  executeBacktestTrade(backtestId, marketData, signal, currentValue) {
    try {
      const trade = {
        id: uuidv4(),
        backtestId: backtestId,
        symbol: marketData.symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: marketData.close,
        timestamp: marketData.timestamp,
        reason: signal.reason,
        status: 'executed'
      };

      return trade;
    } catch (error) {
      logger.error(`Failed to execute backtest trade:`, error);
      return null;
    }
  }

  calculateBacktestResults(trades, initialCapital, finalValue, peakValue, maxDrawdown, startDate, endDate) {
    try {
      const totalReturn = (finalValue - initialCapital) / initialCapital;
      
      // Calculate annualized return
      const days = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

      // Calculate trade statistics
      const winningTrades = trades.filter(trade => {
        // This is a simplified calculation - in reality, you'd track P&L per trade
        return trade.action === 'SELL' && trade.quantity > 0;
      });

      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

      // Calculate profit factor (simplified)
      const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0);
      const grossLoss = trades.filter(trade => trade.action === 'BUY').reduce((sum, trade) => sum + (trade.quantity * trade.price), 0);
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

      // Calculate average win/loss
      const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
      const losingTrades = trades.filter(trade => trade.action === 'BUY');
      const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

      // Calculate Sharpe ratio (simplified)
      const sharpeRatio = totalReturn > 0 ? totalReturn / Math.max(maxDrawdown, 0.01) : 0;

      return {
        totalReturn: totalReturn * 100, // Convert to percentage
        annualizedReturn: annualizedReturn * 100, // Convert to percentage
        sharpeRatio: sharpeRatio,
        maxDrawdown: maxDrawdown * 100, // Convert to percentage
        winRate: winRate,
        totalTrades: trades.length,
        profitFactor: profitFactor,
        averageWin: averageWin,
        averageLoss: averageLoss,
        finalValue: finalValue,
        peakValue: peakValue
      };
    } catch (error) {
      logger.error('Error calculating backtest results:', error);
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        finalValue: initialCapital,
        peakValue: initialCapital
      };
    }
  }

  async getHistoricalData(symbols, startDate, endDate) {
    try {
      // This would typically fetch from a market data service
      // For now, we'll simulate some data
      const data = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        for (const symbol of symbols) {
          // Generate simulated OHLCV data
          const basePrice = 100 + Math.random() * 50;
          const open = basePrice + (Math.random() - 0.5) * 2;
          const high = open + Math.random() * 3;
          const low = open - Math.random() * 3;
          const close = low + Math.random() * (high - low);
          const volume = Math.floor(Math.random() * 1000000) + 100000;

          data.push({
            symbol: symbol,
            timestamp: new Date(currentDate),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: volume
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return data;
    } catch (error) {
      logger.error('Error getting historical data:', error);
      return [];
    }
  }

  async getStrategy(strategyId, userId) {
    try {
      const query = `
        SELECT id, name, description, plugin_id, config, symbols, user_id, status
        FROM strategies 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [strategyId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        pluginId: row.plugin_id,
        config: row.config,
        symbols: row.symbols,
        userId: row.user_id,
        status: row.status
      };
    } catch (error) {
      logger.error(`Error getting strategy ${strategyId}:`, error);
      return null;
    }
  }

  async saveBacktest(backtest) {
    try {
      const query = `
        INSERT INTO backtests (id, strategy_id, user_id, start_date, end_date, initial_capital, 
                              symbols, status, results, trades, equity_curve, drawdown_curve, 
                              created_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      await this.db.query(query, [
        backtest.id,
        backtest.strategyId,
        backtest.userId,
        backtest.startDate,
        backtest.endDate,
        backtest.initialCapital,
        JSON.stringify(backtest.symbols),
        backtest.status,
        JSON.stringify(backtest.results),
        JSON.stringify(backtest.trades),
        JSON.stringify(backtest.equityCurve),
        JSON.stringify(backtest.drawdownCurve),
        backtest.createdAt,
        backtest.completedAt
      ]);
    } catch (error) {
      logger.error('Error saving backtest:', error);
      throw error;
    }
  }

  async updateBacktest(backtest) {
    try {
      const query = `
        UPDATE backtests 
        SET status = $1, results = $2, trades = $3, equity_curve = $4, 
            drawdown_curve = $5, completed_at = $6, error = $7
        WHERE id = $8
      `;
      
      await this.db.query(query, [
        backtest.status,
        JSON.stringify(backtest.results),
        JSON.stringify(backtest.trades),
        JSON.stringify(backtest.equityCurve),
        JSON.stringify(backtest.drawdownCurve),
        backtest.completedAt,
        backtest.error || null,
        backtest.id
      ]);
    } catch (error) {
      logger.error('Error updating backtest:', error);
      throw error;
    }
  }

  async getBacktest(backtestId, userId) {
    try {
      const query = `
        SELECT * FROM backtests 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [backtestId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        strategyId: row.strategy_id,
        userId: row.user_id,
        startDate: row.start_date,
        endDate: row.end_date,
        initialCapital: row.initial_capital,
        symbols: row.symbols,
        status: row.status,
        results: row.results,
        trades: row.trades,
        equityCurve: row.equity_curve,
        drawdownCurve: row.drawdown_curve,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        error: row.error
      };
    } catch (error) {
      logger.error(`Error getting backtest ${backtestId}:`, error);
      return null;
    }
  }

  async getBacktestResults(backtestId, userId) {
    try {
      const backtest = await this.getBacktest(backtestId, userId);
      if (!backtest) {
        return null;
      }

      return {
        summary: backtest.results,
        trades: backtest.trades,
        equityCurve: backtest.equityCurve,
        drawdownCurve: backtest.drawdownCurve,
        status: backtest.status,
        completedAt: backtest.completedAt
      };
    } catch (error) {
      logger.error(`Error getting backtest results ${backtestId}:`, error);
      return null;
    }
  }

  async cleanupBacktest(backtestId) {
    try {
      const query = `DELETE FROM backtests WHERE id = $1`;
      await this.db.query(query, [backtestId]);
      logger.info(`Backtest ${backtestId} cleaned up`);
    } catch (error) {
      logger.error(`Error cleaning up backtest ${backtestId}:`, error);
    }
  }

  async close() {
    try {
      // Close services
      if (this.pluginManager) {
        await this.pluginManager.close();
      }
      if (this.marketDataProvider) {
        await this.marketDataProvider.close();
      }
      if (this.riskManager) {
        await this.riskManager.close();
      }

      logger.info('Backtest Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Backtest Engine:', error);
    }
  }
}

module.exports = BacktestEngine;