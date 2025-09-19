const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const PluginManager = require('./pluginManager');
const MarketDataProvider = require('./marketDataProvider');
const RiskManager = require('./riskManager');

class StrategyEngine extends EventEmitter {
  constructor() {
    super();
    this.strategies = new Map();
    this.activeStrategies = new Map();
    this.redis = null;
    this.db = null;
    this.pluginManager = null;
    this.marketDataProvider = null;
    this.riskManager = null;
    this.isRunning = false;
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
      
      await this.loadStrategiesFromDatabase();
      this.startStrategyLoop();
      
      logger.info('Strategy Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Strategy Engine:', error);
      throw error;
    }
  }

  async loadStrategiesFromDatabase() {
    try {
      const query = `
        SELECT id, name, description, plugin_id, config, symbols, user_id, 
               status, created_at, updated_at
        FROM strategies 
        WHERE status = 'active'
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        const strategy = {
          id: row.id,
          name: row.name,
          description: row.description,
          pluginId: row.plugin_id,
          config: row.config,
          symbols: row.symbols,
          userId: row.user_id,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          performance: {
            totalReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            totalTrades: 0
          }
        };
        
        this.strategies.set(strategy.id, strategy);
      }
      
      logger.info(`Loaded ${result.rows.length} strategies from database`);
    } catch (error) {
      logger.error('Failed to load strategies from database:', error);
    }
  }

  async createStrategy(name, description, pluginId, config, symbols, userId) {
    try {
      // Validate plugin exists
      const plugins = await this.pluginManager.getAvailablePlugins();
      const plugin = plugins.find(p => p.id === pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Validate symbols
      if (!Array.isArray(symbols) || symbols.length === 0) {
        throw new Error('At least one symbol is required');
      }

      // Create strategy record
      const strategyId = uuidv4();
      const query = `
        INSERT INTO strategies (id, name, description, plugin_id, config, symbols, user_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const now = new Date();
      const result = await this.db.query(query, [
        strategyId, name, description, pluginId, JSON.stringify(config),
        JSON.stringify(symbols), userId, 'inactive', now, now
      ]);

      const strategy = {
        id: strategyId,
        name,
        description,
        pluginId,
        config,
        symbols,
        userId,
        status: 'inactive',
        createdAt: now,
        updatedAt: now,
        performance: {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0
        }
      };

      this.strategies.set(strategyId, strategy);
      
      logger.info(`Strategy ${name} created successfully`, { strategyId, userId });
      this.emit('strategyCreated', strategy);

      return strategy;
    } catch (error) {
      logger.error('Failed to create strategy:', error);
      throw error;
    }
  }

  async getStrategies(userId) {
    try {
      const userStrategies = Array.from(this.strategies.values())
        .filter(strategy => strategy.userId === userId)
        .map(strategy => ({
          id: strategy.id,
          name: strategy.name,
          description: strategy.description,
          pluginId: strategy.pluginId,
          config: strategy.config,
          symbols: strategy.symbols,
          status: strategy.status,
          performance: strategy.performance,
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt
        }));

      return userStrategies;
    } catch (error) {
      logger.error('Failed to get strategies:', error);
      throw error;
    }
  }

  async startStrategy(strategyId, mode, userId) {
    try {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      if (strategy.userId !== userId) {
        throw new Error('Unauthorized access to strategy');
      }

      if (strategy.status === 'active') {
        throw new Error('Strategy is already running');
      }

      // Load plugin instance
      const pluginInstance = await this.pluginManager.getPluginInstance(strategy.pluginId);
      if (!pluginInstance) {
        throw new Error(`Plugin ${strategy.pluginId} not loaded`);
      }

      // Create strategy execution context
      const executionContext = {
        id: strategyId,
        name: strategy.name,
        pluginId: strategy.pluginId,
        config: strategy.config,
        symbols: strategy.symbols,
        userId: userId,
        mode: mode, // 'paper' or 'live'
        status: 'starting',
        startedAt: new Date(),
        lastUpdate: new Date(),
        trades: [],
        performance: {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0,
          currentValue: 100000, // Starting capital
          peakValue: 100000
        }
      };

      // Start market data subscription
      for (const symbol of strategy.symbols) {
        await this.marketDataProvider.subscribe(symbol, (data) => {
          this.handleMarketData(strategyId, symbol, data);
        });
      }

      // Update strategy status
      strategy.status = 'active';
      this.activeStrategies.set(strategyId, executionContext);

      // Update database
      await this.updateStrategyStatus(strategyId, 'active');

      logger.info(`Strategy ${strategy.name} started successfully`, { strategyId, mode });
      this.emit('strategyStarted', executionContext);

      return executionContext;
    } catch (error) {
      logger.error(`Failed to start strategy ${strategyId}:`, error);
      throw error;
    }
  }

  async stopStrategy(strategyId, userId) {
    try {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      if (strategy.userId !== userId) {
        throw new Error('Unauthorized access to strategy');
      }

      if (strategy.status !== 'active') {
        throw new Error('Strategy is not running');
      }

      const executionContext = this.activeStrategies.get(strategyId);
      if (executionContext) {
        // Unsubscribe from market data
        for (const symbol of strategy.symbols) {
          await this.marketDataProvider.unsubscribe(symbol);
        }

        // Update execution context
        executionContext.status = 'stopped';
        executionContext.stoppedAt = new Date();

        // Calculate final performance
        executionContext.performance = await this.calculatePerformance(executionContext);

        this.activeStrategies.delete(strategyId);
      }

      // Update strategy status
      strategy.status = 'inactive';
      await this.updateStrategyStatus(strategyId, 'inactive');

      logger.info(`Strategy ${strategy.name} stopped successfully`, { strategyId });
      this.emit('strategyStopped', executionContext);

      return executionContext;
    } catch (error) {
      logger.error(`Failed to stop strategy ${strategyId}:`, error);
      throw error;
    }
  }

  async handleMarketData(strategyId, symbol, data) {
    try {
      const executionContext = this.activeStrategies.get(strategyId);
      if (!executionContext || executionContext.status !== 'active') {
        return;
      }

      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        return;
      }

      // Get plugin instance
      const pluginInstance = await this.pluginManager.getPluginInstance(strategy.pluginId);
      if (!pluginInstance) {
        logger.error(`Plugin instance not found for strategy ${strategyId}`);
        return;
      }

      // Process data through plugin
      const signal = pluginInstance.instance.onData(data);
      
      if (signal) {
        // Validate signal with risk manager
        const riskCheck = await this.riskManager.validateTrade({
          symbol: symbol,
          action: signal.action,
          quantity: signal.quantity,
          price: data.close,
          userId: executionContext.userId,
          strategyId: strategyId
        });

        if (riskCheck.approved) {
          // Execute trade
          const trade = await this.executeTrade(strategyId, symbol, signal, data);
          if (trade) {
            executionContext.trades.push(trade);
            executionContext.lastUpdate = new Date();
            
            // Update performance
            executionContext.performance = await this.calculatePerformance(executionContext);
            
            // Emit trade event
            this.emit('tradeExecuted', { strategyId, trade, executionContext });
          }
        } else {
          logger.warn(`Trade rejected by risk manager for strategy ${strategyId}:`, riskCheck.reason);
        }
      }

      // Update strategy state
      executionContext.lastUpdate = new Date();
      this.activeStrategies.set(strategyId, executionContext);

    } catch (error) {
      logger.error(`Error handling market data for strategy ${strategyId}:`, error);
      this.emit('strategyError', error, { id: strategyId, symbol });
    }
  }

  async executeTrade(strategyId, symbol, signal, marketData) {
    try {
      const executionContext = this.activeStrategies.get(strategyId);
      if (!executionContext) {
        return null;
      }

      const trade = {
        id: uuidv4(),
        strategyId: strategyId,
        symbol: symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: marketData.close,
        timestamp: new Date(),
        reason: signal.reason,
        status: 'executed'
      };

      // In paper trading mode, just record the trade
      if (executionContext.mode === 'paper') {
        trade.mode = 'paper';
        logger.info(`Paper trade executed for strategy ${strategyId}:`, trade);
        return trade;
      }

      // In live mode, send to order management system
      // This would integrate with the actual trading system
      trade.mode = 'live';
      logger.info(`Live trade executed for strategy ${strategyId}:`, trade);
      
      // TODO: Integrate with actual order management system
      // await this.orderManagementSystem.placeOrder(trade);

      return trade;
    } catch (error) {
      logger.error(`Failed to execute trade for strategy ${strategyId}:`, error);
      return null;
    }
  }

  async calculatePerformance(executionContext) {
    try {
      const trades = executionContext.trades;
      if (trades.length === 0) {
        return executionContext.performance;
      }

      let totalReturn = 0;
      let winningTrades = 0;
      let maxDrawdown = 0;
      let currentValue = executionContext.performance.currentValue;
      let peakValue = executionContext.performance.peakValue;

      // Calculate returns for each trade
      for (const trade of trades) {
        const tradeValue = trade.quantity * trade.price;
        if (trade.action === 'BUY') {
          currentValue -= tradeValue;
        } else if (trade.action === 'SELL') {
          currentValue += tradeValue;
          if (tradeValue > 0) {
            winningTrades++;
          }
        }

        // Update peak value and calculate drawdown
        if (currentValue > peakValue) {
          peakValue = currentValue;
        }
        
        const drawdown = (peakValue - currentValue) / peakValue;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      totalReturn = (currentValue - 100000) / 100000; // Assuming starting capital of 100k
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

      // Calculate Sharpe ratio (simplified)
      const sharpeRatio = totalReturn > 0 ? totalReturn / Math.max(maxDrawdown, 0.01) : 0;

      return {
        totalReturn: totalReturn * 100, // Convert to percentage
        sharpeRatio: sharpeRatio,
        maxDrawdown: maxDrawdown * 100, // Convert to percentage
        winRate: winRate,
        totalTrades: trades.length,
        currentValue: currentValue,
        peakValue: peakValue
      };
    } catch (error) {
      logger.error('Error calculating performance:', error);
      return executionContext.performance;
    }
  }

  async updateStrategyStatus(strategyId, status) {
    try {
      const query = `
        UPDATE strategies 
        SET status = $1, updated_at = $2 
        WHERE id = $3
      `;
      
      await this.db.query(query, [status, new Date(), strategyId]);
    } catch (error) {
      logger.error(`Failed to update strategy status for ${strategyId}:`, error);
    }
  }

  startStrategyLoop() {
    this.isRunning = true;
    
    const loop = async () => {
      if (!this.isRunning) return;

      try {
        // Update performance for all active strategies
        for (const [strategyId, executionContext] of this.activeStrategies) {
          if (executionContext.status === 'active') {
            executionContext.performance = await this.calculatePerformance(executionContext);
            this.activeStrategies.set(strategyId, executionContext);
          }
        }

        // Check for strategy health
        await this.checkStrategyHealth();
      } catch (error) {
        logger.error('Error in strategy loop:', error);
      }

      // Run every 5 seconds
      setTimeout(loop, 5000);
    };

    loop();
  }

  async checkStrategyHealth() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [strategyId, executionContext] of this.activeStrategies) {
      if (executionContext.status === 'active') {
        const timeSinceUpdate = now - executionContext.lastUpdate;
        
        if (timeSinceUpdate > timeout) {
          logger.warn(`Strategy ${strategyId} appears to be unresponsive`);
          this.emit('strategyError', new Error('Strategy unresponsive'), { id: strategyId });
        }
      }
    }
  }

  async close() {
    try {
      this.isRunning = false;
      
      // Stop all active strategies
      for (const [strategyId, executionContext] of this.activeStrategies) {
        await this.stopStrategy(strategyId, executionContext.userId);
      }

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

      logger.info('Strategy Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Strategy Engine:', error);
    }
  }
}

module.exports = StrategyEngine;