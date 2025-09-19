const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');

class WebSocketManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.subscriptions = new Map(); // socketId -> Set of subscription types
    this.portfolioSubscriptions = new Map(); // portfolioId -> Set of socketIds
    this.userSubscriptions = new Map(); // userId -> Set of socketIds
  }

  async subscribe(socketId, type, data) {
    try {
      const { portfolioId, userId } = data;
      
      // Initialize socket subscriptions if not exists
      if (!this.subscriptions.has(socketId)) {
        this.subscriptions.set(socketId, new Set());
      }
      
      // Add subscription type
      this.subscriptions.get(socketId).add(type);
      
      // Add to specific subscription maps
      switch (type) {
        case 'portfolio_risk':
          if (portfolioId) {
            if (!this.portfolioSubscriptions.has(portfolioId)) {
              this.portfolioSubscriptions.set(portfolioId, new Set());
            }
            this.portfolioSubscriptions.get(portfolioId).add(socketId);
          }
          break;
          
        case 'risk_alerts':
          if (userId) {
            if (!this.userSubscriptions.has(userId)) {
              this.userSubscriptions.set(userId, new Set());
            }
            this.userSubscriptions.get(userId).add(socketId);
          }
          break;
      }
      
      logger.info(`Socket ${socketId} subscribed to ${type}`, { portfolioId, userId });
    } catch (error) {
      logger.error(`Error subscribing socket ${socketId} to ${type}:`, error);
    }
  }

  async unsubscribe(socketId, type, data) {
    try {
      const { portfolioId, userId } = data;
      
      // Remove from socket subscriptions
      if (this.subscriptions.has(socketId)) {
        this.subscriptions.get(socketId).delete(type);
      }
      
      // Remove from specific subscription maps
      switch (type) {
        case 'portfolio_risk':
          if (portfolioId && this.portfolioSubscriptions.has(portfolioId)) {
            this.portfolioSubscriptions.get(portfolioId).delete(socketId);
            if (this.portfolioSubscriptions.get(portfolioId).size === 0) {
              this.portfolioSubscriptions.delete(portfolioId);
            }
          }
          break;
          
        case 'risk_alerts':
          if (userId && this.userSubscriptions.has(userId)) {
            this.userSubscriptions.get(userId).delete(socketId);
            if (this.userSubscriptions.get(userId).size === 0) {
              this.userSubscriptions.delete(userId);
            }
          }
          break;
      }
      
      logger.info(`Socket ${socketId} unsubscribed from ${type}`, { portfolioId, userId });
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
            case 'portfolio_risk':
              this.removeFromPortfolioSubscriptions(socketId);
              break;
            case 'risk_alerts':
              this.removeFromUserSubscriptions(socketId);
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

  removeFromPortfolioSubscriptions(socketId) {
    for (const [portfolioId, socketIds] of this.portfolioSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.portfolioSubscriptions.delete(portfolioId);
      }
    }
  }

  removeFromUserSubscriptions(socketId) {
    for (const [userId, socketIds] of this.userSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }
  }

  broadcastPortfolioRiskUpdate(portfolioId, riskData) {
    try {
      if (this.portfolioSubscriptions.has(portfolioId)) {
        const socketIds = this.portfolioSubscriptions.get(portfolioId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('portfolio_risk_update', {
              portfolioId: portfolioId,
              data: riskData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted portfolio risk update for ${portfolioId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting portfolio risk update for ${portfolioId}:`, error);
    }
  }

  broadcastRiskAlert(userId, alert) {
    try {
      if (this.userSubscriptions.has(userId)) {
        const socketIds = this.userSubscriptions.get(userId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('risk_alert', {
              alert: alert,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted risk alert for user ${userId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting risk alert for user ${userId}:`, error);
    }
  }

  broadcastRiskLimitExceeded(portfolioId, violationData) {
    try {
      if (this.portfolioSubscriptions.has(portfolioId)) {
        const socketIds = this.portfolioSubscriptions.get(portfolioId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('risk_limit_exceeded', {
              portfolioId: portfolioId,
              violation: violationData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted risk limit exceeded for ${portfolioId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting risk limit exceeded for ${portfolioId}:`, error);
    }
  }

  broadcastStressTestUpdate(portfolioId, stressTestData) {
    try {
      if (this.portfolioSubscriptions.has(portfolioId)) {
        const socketIds = this.portfolioSubscriptions.get(portfolioId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('stress_test_update', {
              portfolioId: portfolioId,
              data: stressTestData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted stress test update for ${portfolioId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting stress test update for ${portfolioId}:`, error);
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
        portfolioSubscriptions: this.portfolioSubscriptions.size,
        userSubscriptions: this.userSubscriptions.size,
        totalPortfolioSubscribers: Array.from(this.portfolioSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0),
        totalUserSubscribers: Array.from(this.userSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0)
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return {
        totalSockets: 0,
        portfolioSubscriptions: 0,
        userSubscriptions: 0,
        totalPortfolioSubscribers: 0,
        totalUserSubscribers: 0
      };
    }
  }

  async close() {
    try {
      // Clear all subscriptions
      this.subscriptions.clear();
      this.portfolioSubscriptions.clear();
      this.userSubscriptions.clear();
      
      logger.info('WebSocket Manager closed successfully');
    } catch (error) {
      logger.error('Error closing WebSocket Manager:', error);
    }
  }
}

module.exports = WebSocketManager;

