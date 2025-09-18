const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class StrategyEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.strategies = new Map();
    this.activeStrategies = new Map();
    this.strategyInstances = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load strategies from database
      await this.loadStrategies();
      
      this._initialized = true;
      logger.info('StrategyEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize StrategyEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Stop all active strategies
      for (const [strategyId, strategy] of this.activeStrategies) {
        await this.stopStrategy(strategyId, strategy.userId);
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('StrategyEngine closed');
    } catch (error) {
      logger.error('Error closing StrategyEngine:', error);
    }
  }

  async createStrategy(name, description, pluginId, config, symbols, userId) {
    try {
      const strategyId = nanoid();
      const strategy = {
        id: strategyId,
        name,
        description,
        pluginId,
        config,
        symbols,
        userId,
        status: 'created',
        mode: 'paper', // Default to paper trading
        performance: {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in database
      await this.storeStrategy(strategy);
      
      // Store in memory
      this.strategies.set(strategyId, strategy);
      
      logger.info(`Strategy created: ${strategyId}`, { name, userId });
      this.emit('strategyCreated', strategy);
      
      return strategy;
    } catch (error) {
      logger.error('Error creating strategy:', error);
      throw error;
    }
  }

  async getStrategies(userId) {
    try {
      const strategies = Array.from(this.strategies.values())
        .filter(strategy => strategy.userId === userId);
      
      return strategies;
    } catch (error) {
      logger.error('Error getting strategies:', error);
      throw error;
    }
  }

  async getStrategy(strategyId, userId) {
    try {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }
      
      if (strategy.userId !== userId) {
        throw new Error('Unauthorized');
      }
      
      return strategy;
    } catch (error) {
      logger.error('Error getting strategy:', error);
      throw error;
    }
  }

  async startStrategy(strategyId, mode, userId) {
    try {
      const strategy = await this.getStrategy(strategyId, userId);
      
      if (strategy.status === 'running') {
        throw new Error('Strategy is already running');
      }

      // Load plugin
      const plugin = await this.loadPlugin(strategy.pluginId);
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Create strategy instance
      const instance = new plugin.instance.constructor(strategy.config);
      
      // Initialize strategy
      await this.initializeStrategy(instance, strategy.symbols);
      
      // Update strategy status
      strategy.status = 'running';
      strategy.mode = mode;
      strategy.startedAt = new Date().toISOString();
      strategy.updatedAt = new Date().toISOString();
      
      // Store in active strategies
      this.activeStrategies.set(strategyId, strategy);
      this.strategyInstances.set(strategyId, instance);
      
      // Update database
      await this.updateStrategy(strategy);
      
      // Start strategy execution
      this.startStrategyExecution(strategyId);
      
      logger.info(`Strategy started: ${strategyId}`, { mode, userId });
      this.emit('strategyStarted', strategy);
      
      return strategy;
    } catch (error) {
      logger.error('Error starting strategy:', error);
      throw error;
    }
  }

  async stopStrategy(strategyId, userId) {
    try {
      const strategy = await this.getStrategy(strategyId, userId);
      
      if (strategy.status !== 'running') {
        throw new Error('Strategy is not running');
      }

      // Stop strategy execution
      this.stopStrategyExecution(strategyId);
      
      // Update strategy status
      strategy.status = 'stopped';
      strategy.stoppedAt = new Date().toISOString();
      strategy.updatedAt = new Date().toISOString();
      
      // Remove from active strategies
      this.activeStrategies.delete(strategyId);
      this.strategyInstances.delete(strategyId);
      
      // Update database
      await this.updateStrategy(strategy);
      
      logger.info(`Strategy stopped: ${strategyId}`, { userId });
      this.emit('strategyStopped', strategy);
      
      return strategy;
    } catch (error) {
      logger.error('Error stopping strategy:', error);
      throw error;
    }
  }

  async updateStrategy(strategy) {
    try {
      const query = `
        UPDATE strategies SET
          name = $2,
          description = $3,
          plugin_id = $4,
          config = $5,
          symbols = $6,
          status = $7,
          mode = $8,
          performance = $9,
          started_at = $10,
          stopped_at = $11,
          updated_at = $12
        WHERE id = $1
      `;
      
      await pool.query(query, [
        strategy.id,
        strategy.name,
        strategy.description,
        strategy.pluginId,
        JSON.stringify(strategy.config),
        JSON.stringify(strategy.symbols),
        strategy.status,
        strategy.mode,
        JSON.stringify(strategy.performance),
        strategy.startedAt,
        strategy.stoppedAt,
        strategy.updatedAt
      ]);
      
    } catch (error) {
      logger.error('Error updating strategy:', error);
      throw error;
    }
  }

  async storeStrategy(strategy) {
    try {
      const query = `
        INSERT INTO strategies (
          id, user_id, name, description, plugin_id, config, 
          symbols, status, mode, performance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      await pool.query(query, [
        strategy.id,
        strategy.userId,
        strategy.name,
        strategy.description,
        strategy.pluginId,
        JSON.stringify(strategy.config),
        JSON.stringify(strategy.symbols),
        strategy.status,
        strategy.mode,
        JSON.stringify(strategy.performance),
        strategy.createdAt,
        strategy.updatedAt
      ]);
      
    } catch (error) {
      logger.error('Error storing strategy:', error);
      throw error;
    }
  }

  async loadStrategies() {
    try {
      const query = 'SELECT * FROM strategies ORDER BY created_at DESC';
      const result = await pool.query(query);
      
      for (const row of result.rows) {
        const strategy = {
          id: row.id,
          name: row.name,
          description: row.description,
          pluginId: row.plugin_id,
          config: JSON.parse(row.config),
          symbols: JSON.parse(row.symbols),
          userId: row.user_id,
          status: row.status,
          mode: row.mode,
          performance: JSON.parse(row.performance),
          startedAt: row.started_at,
          stoppedAt: row.stopped_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        this.strategies.set(strategy.id, strategy);
        
        // If strategy was running, restart it
        if (strategy.status === 'running') {
          try {
            await this.startStrategy(strategy.id, strategy.mode, strategy.userId);
          } catch (error) {
            logger.error(`Failed to restart strategy ${strategy.id}:`, error);
            strategy.status = 'error';
            await this.updateStrategy(strategy);
          }
        }
      }
      
      logger.info(`Loaded ${this.strategies.size} strategies`);
    } catch (error) {
      logger.error('Error loading strategies:', error);
      throw error;
    }
  }

  async loadPlugin(pluginId) {
    try {
      // This would typically load from the plugin manager
      // For now, return a mock plugin
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
            
            getMetrics() {
              return {};
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error loading plugin:', error);
      throw error;
    }
  }

  async initializeStrategy(instance, symbols) {
    try {
      if (typeof instance.initialize === 'function') {
        await instance.initialize(symbols);
      }
    } catch (error) {
      logger.error('Error initializing strategy:', error);
      throw error;
    }
  }

  startStrategyExecution(strategyId) {
    try {
      const strategy = this.activeStrategies.get(strategyId);
      const instance = this.strategyInstances.get(strategyId);
      
      if (!strategy || !instance) {
        throw new Error('Strategy or instance not found');
      }

      // Start execution loop
      const executionInterval = setInterval(async () => {
        try {
          await this.executeStrategy(strategyId);
        } catch (error) {
          logger.error(`Strategy execution error for ${strategyId}:`, error);
          this.emit('strategyError', error, strategy);
        }
      }, 1000); // Execute every second

      // Store interval ID for cleanup
      strategy.executionInterval = executionInterval;
      this.activeStrategies.set(strategyId, strategy);
      
    } catch (error) {
      logger.error('Error starting strategy execution:', error);
      throw error;
    }
  }

  stopStrategyExecution(strategyId) {
    try {
      const strategy = this.activeStrategies.get(strategyId);
      
      if (strategy && strategy.executionInterval) {
        clearInterval(strategy.executionInterval);
        delete strategy.executionInterval;
      }
      
    } catch (error) {
      logger.error('Error stopping strategy execution:', error);
    }
  }

  async executeStrategy(strategyId) {
    try {
      const strategy = this.activeStrategies.get(strategyId);
      const instance = this.strategyInstances.get(strategyId);
      
      if (!strategy || !instance) {
        return;
      }

      // Get market data for all symbols
      const marketData = await this.getMarketData(strategy.symbols);
      
      // Execute strategy for each symbol
      for (const symbol of strategy.symbols) {
        const symbolData = marketData[symbol];
        if (!symbolData || symbolData.length === 0) {
          continue;
        }

        try {
          const signal = instance.onTick(symbolData);
          
          if (signal) {
            await this.processSignal(strategyId, symbol, signal);
          }
        } catch (error) {
          logger.error(`Error executing strategy for symbol ${symbol}:`, error);
        }
      }
      
      // Update strategy metrics
      await this.updateStrategyMetrics(strategyId, instance);
      
    } catch (error) {
      logger.error(`Error executing strategy ${strategyId}:`, error);
      throw error;
    }
  }

  async getMarketData(symbols) {
    try {
      const marketData = {};
      
      for (const symbol of symbols) {
        // Get data from Redis cache
        const data = await this.redis.get(`market_data:${symbol}`);
        if (data) {
          marketData[symbol] = JSON.parse(data);
        }
      }
      
      return marketData;
    } catch (error) {
      logger.error('Error getting market data:', error);
      return {};
    }
  }

  async processSignal(strategyId, symbol, signal) {
    try {
      const strategy = this.activeStrategies.get(strategyId);
      
      // Create trade signal
      const tradeSignal = {
        id: nanoid(),
        strategyId,
        symbol,
        action: signal.action,
        confidence: signal.confidence,
        reason: signal.reason,
        timestamp: new Date().toISOString(),
        processed: false
      };
      
      // Store signal
      await this.storeSignal(tradeSignal);
      
      // Process based on strategy mode
      if (strategy.mode === 'paper') {
        await this.processPaperTrade(tradeSignal);
      } else if (strategy.mode === 'live') {
        await this.processLiveTrade(tradeSignal);
      }
      
      logger.info(`Signal processed: ${tradeSignal.id}`, { 
        strategyId, symbol, action: signal.action 
      });
      
      this.emit('signalGenerated', tradeSignal);
      
    } catch (error) {
      logger.error('Error processing signal:', error);
      throw error;
    }
  }

  async processPaperTrade(signal) {
    try {
      // Mock paper trading logic
      logger.info(`Paper trade executed: ${signal.symbol} ${signal.action}`);
    } catch (error) {
      logger.error('Error processing paper trade:', error);
      throw error;
    }
  }

  async processLiveTrade(signal) {
    try {
      // Send to order management system
      logger.info(`Live trade executed: ${signal.symbol} ${signal.action}`);
    } catch (error) {
      logger.error('Error processing live trade:', error);
      throw error;
    }
  }

  async storeSignal(signal) {
    try {
      const query = `
        INSERT INTO strategy_signals (
          id, strategy_id, symbol, action, confidence, reason, 
          timestamp, processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        signal.id,
        signal.strategyId,
        signal.symbol,
        signal.action,
        signal.confidence,
        signal.reason,
        signal.timestamp,
        signal.processed
      ]);
      
    } catch (error) {
      logger.error('Error storing signal:', error);
      throw error;
    }
  }

  async updateStrategyMetrics(strategyId, instance) {
    try {
      const strategy = this.activeStrategies.get(strategyId);
      if (!strategy) return;

      // Get metrics from strategy instance
      const metrics = instance.getMetrics();
      
      // Update strategy performance
      strategy.performance = {
        ...strategy.performance,
        ...metrics,
        lastUpdated: new Date().toISOString()
      };
      
      this.activeStrategies.set(strategyId, strategy);
      
    } catch (error) {
      logger.error('Error updating strategy metrics:', error);
    }
  }

  async getStrategyPerformance(strategyId, userId) {
    try {
      const strategy = await this.getStrategy(strategyId, userId);
      return strategy.performance;
    } catch (error) {
      logger.error('Error getting strategy performance:', error);
      throw error;
    }
  }

  async getActiveStrategies(userId) {
    try {
      const activeStrategies = Array.from(this.activeStrategies.values())
        .filter(strategy => strategy.userId === userId);
      
      return activeStrategies;
    } catch (error) {
      logger.error('Error getting active strategies:', error);
      throw error;
    }
  }

  async deleteStrategy(strategyId, userId) {
    try {
      const strategy = await this.getStrategy(strategyId, userId);
      
      // Stop strategy if running
      if (strategy.status === 'running') {
        await this.stopStrategy(strategyId, userId);
      }
      
      // Delete from database
      const query = 'DELETE FROM strategies WHERE id = $1 AND user_id = $2';
      await pool.query(query, [strategyId, userId]);
      
      // Remove from memory
      this.strategies.delete(strategyId);
      
      logger.info(`Strategy deleted: ${strategyId}`, { userId });
      this.emit('strategyDeleted', strategy);
      
      return true;
    } catch (error) {
      logger.error('Error deleting strategy:', error);
      throw error;
    }
  }
}

module.exports = StrategyEngine;
