const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const PluginManager = require('./pluginManager');
const MarketDataProvider = require('./marketDataProvider');
const RiskManager = require('./riskManager');

class PaperTradingEngine extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
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
      
      logger.info('Paper Trading Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Paper Trading Engine:', error);
      throw error;
    }
  }

  async startSession(strategyId, initialCapital, symbols, userId) {
    try {
      const sessionId = uuidv4();
      
      // Get strategy from database
      const strategy = await this.getStrategy(strategyId, userId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      // Load plugin instance
      const pluginInstance = await this.pluginManager.getPluginInstance(strategy.pluginId);
      if (!pluginInstance) {
        throw new Error(`Plugin ${strategy.pluginId} not loaded`);
      }

      // Create paper trading session
      const session = {
        id: sessionId,
        strategyId: strategyId,
        userId: userId,
        initialCapital: initialCapital,
        currentCapital: initialCapital,
        symbols: symbols,
        status: 'active',
        startedAt: new Date(),
        lastUpdate: new Date(),
        positions: new Map(), // symbol -> { quantity, averagePrice, unrealizedPnL }
        trades: [],
        performance: {
          totalReturn: 0,
          totalPnL: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          sharpeRatio: 0
        },
        equityCurve: [{
          timestamp: new Date(),
          value: initialCapital,
          realizedPnL: 0,
          unrealizedPnL: 0
        }]
      };

      // Store session in database
      await this.saveSession(session);
      this.sessions.set(sessionId, session);

      // Subscribe to market data for all symbols
      for (const symbol of symbols) {
        await this.marketDataProvider.subscribe(symbol, (data) => {
          this.handleMarketData(sessionId, symbol, data);
        });
      }

      logger.info(`Paper trading session ${sessionId} started for strategy ${strategyId}`);
      this.emit('sessionStarted', session);

      return session;
    } catch (error) {
      logger.error('Failed to start paper trading session:', error);
      throw error;
    }
  }

  async stopSession(sessionId, userId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.userId !== userId) {
        throw new Error('Unauthorized access to session');
      }

      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      // Unsubscribe from market data
      for (const symbol of session.symbols) {
        await this.marketDataProvider.unsubscribe(symbol);
      }

      // Close all positions
      await this.closeAllPositions(sessionId);

      // Update session status
      session.status = 'stopped';
      session.stoppedAt = new Date();
      session.lastUpdate = new Date();

      // Calculate final performance
      session.performance = await this.calculatePerformance(session);

      // Update database
      await this.updateSession(session);

      // Remove from active sessions
      this.sessions.delete(sessionId);

      logger.info(`Paper trading session ${sessionId} stopped`);
      this.emit('sessionStopped', session);

      return session;
    } catch (error) {
      logger.error(`Failed to stop paper trading session ${sessionId}:`, error);
      throw error;
    }
  }

  async getSession(sessionId, userId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        // Try to load from database
        const dbSession = await this.loadSessionFromDatabase(sessionId, userId);
        if (dbSession) {
          this.sessions.set(sessionId, dbSession);
          return dbSession;
        }
        return null;
      }

      if (session.userId !== userId) {
        throw new Error('Unauthorized access to session');
      }

      return session;
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      throw error;
    }
  }

  async handleMarketData(sessionId, symbol, data) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'active') {
        return;
      }

      const strategy = await this.getStrategy(session.strategyId, session.userId);
      if (!strategy) {
        return;
      }

      // Get plugin instance
      const pluginInstance = await this.pluginManager.getPluginInstance(strategy.pluginId);
      if (!pluginInstance) {
        logger.error(`Plugin instance not found for session ${sessionId}`);
        return;
      }

      // Process data through plugin
      const signal = pluginInstance.instance.onData(data);
      
      if (signal) {
        // Validate trade with risk manager
        const riskCheck = await this.riskManager.validateTrade({
          symbol: symbol,
          action: signal.action,
          quantity: signal.quantity,
          price: data.close,
          userId: session.userId,
          strategyId: session.strategyId,
          isPaperTrading: true
        });

        if (riskCheck.approved) {
          // Execute paper trade
          const trade = await this.executePaperTrade(sessionId, symbol, signal, data);
          if (trade) {
            session.trades.push(trade);
            session.lastUpdate = new Date();
            
            // Update positions
            await this.updatePositions(sessionId, trade);
            
            // Update performance
            session.performance = await this.calculatePerformance(session);
            
            // Update equity curve
            this.updateEquityCurve(session);
            
            // Update session in database
            await this.updateSession(session);
            
            // Emit trade event
            this.emit('tradeExecuted', { sessionId, trade, session });
          }
        } else {
          logger.warn(`Paper trade rejected by risk manager for session ${sessionId}:`, riskCheck.reason);
        }
      }

      // Update session timestamp
      session.lastUpdate = new Date();
      this.sessions.set(sessionId, session);

    } catch (error) {
      logger.error(`Error handling market data for session ${sessionId}:`, error);
      this.emit('sessionError', error, { sessionId, symbol });
    }
  }

  async executePaperTrade(sessionId, symbol, signal, marketData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      const trade = {
        id: uuidv4(),
        sessionId: sessionId,
        symbol: symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: marketData.close,
        timestamp: new Date(),
        reason: signal.reason,
        status: 'executed',
        mode: 'paper'
      };

      // Calculate trade value
      const tradeValue = trade.quantity * trade.price;

      // Check if we have enough capital for buy orders
      if (trade.action === 'BUY' && tradeValue > session.currentCapital) {
        logger.warn(`Insufficient capital for buy order in session ${sessionId}`);
        return null;
      }

      // Execute the trade
      if (trade.action === 'BUY') {
        session.currentCapital -= tradeValue;
      } else if (trade.action === 'SELL') {
        session.currentCapital += tradeValue;
      }

      logger.info(`Paper trade executed for session ${sessionId}:`, trade);
      return trade;
    } catch (error) {
      logger.error(`Failed to execute paper trade for session ${sessionId}:`, error);
      return null;
    }
  }

  async updatePositions(sessionId, trade) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      const symbol = trade.symbol;
      const currentPosition = session.positions.get(symbol) || { quantity: 0, averagePrice: 0, unrealizedPnL: 0 };

      if (trade.action === 'BUY') {
        // Add to position
        const newQuantity = currentPosition.quantity + trade.quantity;
        const newAveragePrice = currentPosition.quantity === 0 
          ? trade.price 
          : ((currentPosition.quantity * currentPosition.averagePrice) + (trade.quantity * trade.price)) / newQuantity;
        
        session.positions.set(symbol, {
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          unrealizedPnL: 0 // Will be calculated when we get market data
        });
      } else if (trade.action === 'SELL') {
        // Reduce position
        const newQuantity = currentPosition.quantity - trade.quantity;
        
        if (newQuantity < 0) {
          logger.warn(`Short selling not allowed in session ${sessionId}`);
          return;
        }
        
        // Calculate realized P&L
        const realizedPnL = (trade.price - currentPosition.averagePrice) * trade.quantity;
        session.performance.realizedPnL += realizedPnL;
        
        if (newQuantity === 0) {
          // Position closed
          session.positions.delete(symbol);
        } else {
          session.positions.set(symbol, {
            quantity: newQuantity,
            averagePrice: currentPosition.averagePrice,
            unrealizedPnL: 0
          });
        }
      }

      this.sessions.set(sessionId, session);
    } catch (error) {
      logger.error(`Error updating positions for session ${sessionId}:`, error);
    }
  }

  async calculatePerformance(session) {
    try {
      const trades = session.trades;
      const positions = session.positions;
      
      // Calculate realized P&L
      const realizedPnL = session.performance.realizedPnL || 0;
      
      // Calculate unrealized P&L for open positions
      let unrealizedPnL = 0;
      for (const [symbol, position] of positions) {
        // This would need current market price - simplified for now
        const currentPrice = position.averagePrice; // In reality, get from market data
        unrealizedPnL += (currentPrice - position.averagePrice) * position.quantity;
      }
      
      const totalPnL = realizedPnL + unrealizedPnL;
      const totalReturn = (totalPnL / session.initialCapital) * 100;
      
      // Calculate trade statistics
      const winningTrades = trades.filter(trade => {
        // Simplified - in reality, track P&L per trade
        return trade.action === 'SELL' && trade.quantity > 0;
      });
      
      const losingTrades = trades.filter(trade => trade.action === 'BUY');
      
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      
      // Calculate average win/loss
      const averageWin = winningTrades.length > 0 ? 
        winningTrades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0) / winningTrades.length : 0;
      
      const averageLoss = losingTrades.length > 0 ? 
        losingTrades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0) / losingTrades.length : 0;
      
      // Calculate max drawdown
      let maxDrawdown = 0;
      let peakValue = session.initialCapital;
      
      for (const point of session.equityCurve) {
        if (point.value > peakValue) {
          peakValue = point.value;
        }
        const drawdown = (peakValue - point.value) / peakValue;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      // Calculate Sharpe ratio (simplified)
      const sharpeRatio = totalReturn > 0 ? totalReturn / Math.max(maxDrawdown, 0.01) : 0;

      return {
        totalReturn: totalReturn,
        totalPnL: totalPnL,
        realizedPnL: realizedPnL,
        unrealizedPnL: unrealizedPnL,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: winRate,
        averageWin: averageWin,
        averageLoss: averageLoss,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio: sharpeRatio
      };
    } catch (error) {
      logger.error('Error calculating performance:', error);
      return session.performance;
    }
  }

  updateEquityCurve(session) {
    try {
      const currentValue = session.currentCapital + session.performance.unrealizedPnL;
      
      session.equityCurve.push({
        timestamp: new Date(),
        value: currentValue,
        realizedPnL: session.performance.realizedPnL,
        unrealizedPnL: session.performance.unrealizedPnL
      });
      
      // Keep only last 1000 points to prevent memory issues
      if (session.equityCurve.length > 1000) {
        session.equityCurve = session.equityCurve.slice(-1000);
      }
    } catch (error) {
      logger.error('Error updating equity curve:', error);
    }
  }

  async closeAllPositions(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      // Close all open positions
      for (const [symbol, position] of session.positions) {
        if (position.quantity > 0) {
          const closeTrade = {
            id: uuidv4(),
            sessionId: sessionId,
            symbol: symbol,
            action: 'SELL',
            quantity: position.quantity,
            price: position.averagePrice, // Simplified - use average price
            timestamp: new Date(),
            reason: 'Session closed - position closed',
            status: 'executed',
            mode: 'paper'
          };
          
          session.trades.push(closeTrade);
          
          // Calculate realized P&L
          const realizedPnL = (closeTrade.price - position.averagePrice) * closeTrade.quantity;
          session.performance.realizedPnL += realizedPnL;
          session.currentCapital += closeTrade.quantity * closeTrade.price;
        }
      }
      
      // Clear all positions
      session.positions.clear();
      
      this.sessions.set(sessionId, session);
    } catch (error) {
      logger.error(`Error closing positions for session ${sessionId}:`, error);
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

  async saveSession(session) {
    try {
      const query = `
        INSERT INTO paper_trading_sessions (id, strategy_id, user_id, initial_capital, current_capital, 
                                           symbols, status, positions, trades, performance, equity_curve, 
                                           started_at, stopped_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      
      await this.db.query(query, [
        session.id,
        session.strategyId,
        session.userId,
        session.initialCapital,
        session.currentCapital,
        JSON.stringify(session.symbols),
        session.status,
        JSON.stringify(Array.from(session.positions.entries())),
        JSON.stringify(session.trades),
        JSON.stringify(session.performance),
        JSON.stringify(session.equityCurve),
        session.startedAt,
        session.stoppedAt
      ]);
    } catch (error) {
      logger.error('Error saving session:', error);
      throw error;
    }
  }

  async updateSession(session) {
    try {
      const query = `
        UPDATE paper_trading_sessions 
        SET current_capital = $1, status = $2, positions = $3, trades = $4, 
            performance = $5, equity_curve = $6, stopped_at = $7, last_update = $8
        WHERE id = $9
      `;
      
      await this.db.query(query, [
        session.currentCapital,
        session.status,
        JSON.stringify(Array.from(session.positions.entries())),
        JSON.stringify(session.trades),
        JSON.stringify(session.performance),
        JSON.stringify(session.equityCurve),
        session.stoppedAt,
        session.lastUpdate,
        session.id
      ]);
    } catch (error) {
      logger.error('Error updating session:', error);
      throw error;
    }
  }

  async loadSessionFromDatabase(sessionId, userId) {
    try {
      const query = `
        SELECT * FROM paper_trading_sessions 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [sessionId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        strategyId: row.strategy_id,
        userId: row.user_id,
        initialCapital: row.initial_capital,
        currentCapital: row.current_capital,
        symbols: row.symbols,
        status: row.status,
        positions: new Map(row.positions || []),
        trades: row.trades || [],
        performance: row.performance || {},
        equityCurve: row.equity_curve || [],
        startedAt: row.started_at,
        stoppedAt: row.stopped_at,
        lastUpdate: row.last_update
      };
    } catch (error) {
      logger.error(`Error loading session ${sessionId} from database:`, error);
      return null;
    }
  }

  async close() {
    try {
      // Stop all active sessions
      for (const [sessionId, session] of this.sessions) {
        await this.stopSession(sessionId, session.userId);
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

      logger.info('Paper Trading Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Paper Trading Engine:', error);
    }
  }
}

module.exports = PaperTradingEngine;

