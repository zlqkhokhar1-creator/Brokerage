const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');

class WebSocketManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.subscriptions = new Map(); // socketId -> Set of subscription types
    this.strategySubscriptions = new Map(); // strategyId -> Set of socketIds
    this.sessionSubscriptions = new Map(); // sessionId -> Set of socketIds
    this.marketDataSubscriptions = new Map(); // symbol -> Set of socketIds
  }

  async subscribe(socketId, type, data) {
    try {
      const { strategyId, sessionId, symbol } = data;
      
      // Initialize socket subscriptions if not exists
      if (!this.subscriptions.has(socketId)) {
        this.subscriptions.set(socketId, new Set());
      }
      
      // Add subscription type
      this.subscriptions.get(socketId).add(type);
      
      // Add to specific subscription maps
      switch (type) {
        case 'strategy':
          if (strategyId) {
            if (!this.strategySubscriptions.has(strategyId)) {
              this.strategySubscriptions.set(strategyId, new Set());
            }
            this.strategySubscriptions.get(strategyId).add(socketId);
          }
          break;
          
        case 'paper_trading':
          if (sessionId) {
            if (!this.sessionSubscriptions.has(sessionId)) {
              this.sessionSubscriptions.set(sessionId, new Set());
            }
            this.sessionSubscriptions.get(sessionId).add(socketId);
          }
          break;
          
        case 'market_data':
          if (symbol) {
            if (!this.marketDataSubscriptions.has(symbol)) {
              this.marketDataSubscriptions.set(symbol, new Set());
            }
            this.marketDataSubscriptions.get(symbol).add(socketId);
          }
          break;
      }
      
      logger.info(`Socket ${socketId} subscribed to ${type}`, { strategyId, sessionId, symbol });
    } catch (error) {
      logger.error(`Error subscribing socket ${socketId} to ${type}:`, error);
    }
  }

  async unsubscribe(socketId, type, data) {
    try {
      const { strategyId, sessionId, symbol } = data;
      
      // Remove from socket subscriptions
      if (this.subscriptions.has(socketId)) {
        this.subscriptions.get(socketId).delete(type);
      }
      
      // Remove from specific subscription maps
      switch (type) {
        case 'strategy':
          if (strategyId && this.strategySubscriptions.has(strategyId)) {
            this.strategySubscriptions.get(strategyId).delete(socketId);
            if (this.strategySubscriptions.get(strategyId).size === 0) {
              this.strategySubscriptions.delete(strategyId);
            }
          }
          break;
          
        case 'paper_trading':
          if (sessionId && this.sessionSubscriptions.has(sessionId)) {
            this.sessionSubscriptions.get(sessionId).delete(socketId);
            if (this.sessionSubscriptions.get(sessionId).size === 0) {
              this.sessionSubscriptions.delete(sessionId);
            }
          }
          break;
          
        case 'market_data':
          if (symbol && this.marketDataSubscriptions.has(symbol)) {
            this.marketDataSubscriptions.get(symbol).delete(socketId);
            if (this.marketDataSubscriptions.get(symbol).size === 0) {
              this.marketDataSubscriptions.delete(symbol);
            }
          }
          break;
      }
      
      logger.info(`Socket ${socketId} unsubscribed from ${type}`, { strategyId, sessionId, symbol });
    } catch (error) {
      logger.error(`Error unsubscribing socket ${socketId} from ${type}:`, error);
    }
  }

  handleDisconnect(socketId) {
    try {
      // Remove from all subscriptions
      if (this.subscriptions.has(socketId)) {
        const subscriptionTypes = this.subscriptions.get(socketId);
        
        for (const type of subscriptionTypes) {
          switch (type) {
            case 'strategy':
              this.removeFromStrategySubscriptions(socketId);
              break;
            case 'paper_trading':
              this.removeFromSessionSubscriptions(socketId);
              break;
            case 'market_data':
              this.removeFromMarketDataSubscriptions(socketId);
              break;
          }
        }
        
        this.subscriptions.delete(socketId);
      }
      
      logger.info(`Socket ${socketId} disconnected and cleaned up`);
    } catch (error) {
      logger.error(`Error handling disconnect for socket ${socketId}:`, error);
    }
  }

  removeFromStrategySubscriptions(socketId) {
    for (const [strategyId, socketIds] of this.strategySubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.strategySubscriptions.delete(strategyId);
      }
    }
  }

  removeFromSessionSubscriptions(socketId) {
    for (const [sessionId, socketIds] of this.sessionSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }
  }

  removeFromMarketDataSubscriptions(socketId) {
    for (const [symbol, socketIds] of this.marketDataSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.marketDataSubscriptions.delete(symbol);
      }
    }
  }

  broadcastStrategyUpdate(strategyId, data) {
    try {
      if (this.strategySubscriptions.has(strategyId)) {
        const socketIds = this.strategySubscriptions.get(strategyId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('strategy_update', {
              strategyId: strategyId,
              data: data,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted strategy update for ${strategyId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting strategy update for ${strategyId}:`, error);
    }
  }

  broadcastSessionUpdate(sessionId, data) {
    try {
      if (this.sessionSubscriptions.has(sessionId)) {
        const socketIds = this.sessionSubscriptions.get(sessionId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('session_update', {
              sessionId: sessionId,
              data: data,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted session update for ${sessionId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting session update for ${sessionId}:`, error);
    }
  }

  broadcastMarketData(symbol, data) {
    try {
      if (this.marketDataSubscriptions.has(symbol)) {
        const socketIds = this.marketDataSubscriptions.get(symbol);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('market_data', {
              symbol: symbol,
              data: data,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted market data for ${symbol} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting market data for ${symbol}:`, error);
    }
  }

  broadcastTradeExecution(strategyId, sessionId, trade) {
    try {
      const data = {
        trade: trade,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to strategy subscribers
      if (strategyId && this.strategySubscriptions.has(strategyId)) {
        const socketIds = this.strategySubscriptions.get(strategyId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('trade_executed', {
              strategyId: strategyId,
              ...data
            });
          }
        }
      }
      
      // Broadcast to session subscribers
      if (sessionId && this.sessionSubscriptions.has(sessionId)) {
        const socketIds = this.sessionSubscriptions.get(sessionId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('trade_executed', {
              sessionId: sessionId,
              ...data
            });
          }
        }
      }
      
      logger.info(`Broadcasted trade execution`, { strategyId, sessionId, tradeId: trade.id });
    } catch (error) {
      logger.error(`Error broadcasting trade execution:`, error);
    }
  }

  broadcastBacktestUpdate(backtestId, data) {
    try {
      // Broadcast to all connected clients (backtests are typically viewed by the creator)
      this.io.emit('backtest_update', {
        backtestId: backtestId,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted backtest update for ${backtestId}`);
    } catch (error) {
      logger.error(`Error broadcasting backtest update for ${backtestId}:`, error);
    }
  }

  broadcastSystemAlert(alert) {
    try {
      this.io.emit('system_alert', {
        alert: alert,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted system alert: ${alert.message}`);
    } catch (error) {
      logger.error(`Error broadcasting system alert:`, error);
    }
  }

  getSubscriptionStats() {
    try {
      return {
        totalSockets: this.subscriptions.size,
        strategySubscriptions: this.strategySubscriptions.size,
        sessionSubscriptions: this.sessionSubscriptions.size,
        marketDataSubscriptions: this.marketDataSubscriptions.size,
        totalStrategySubscribers: Array.from(this.strategySubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0),
        totalSessionSubscribers: Array.from(this.sessionSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0),
        totalMarketDataSubscribers: Array.from(this.marketDataSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0)
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return {
        totalSockets: 0,
        strategySubscriptions: 0,
        sessionSubscriptions: 0,
        marketDataSubscriptions: 0,
        totalStrategySubscribers: 0,
        totalSessionSubscribers: 0,
        totalMarketDataSubscribers: 0
      };
    }
  }

  async close() {
    try {
      // Clear all subscriptions
      this.subscriptions.clear();
      this.strategySubscriptions.clear();
      this.sessionSubscriptions.clear();
      this.marketDataSubscriptions.clear();
      
      logger.info('WebSocket Manager closed successfully');
    } catch (error) {
      logger.error('Error closing WebSocket Manager:', error);
    }
  }
}

module.exports = WebSocketManager;

