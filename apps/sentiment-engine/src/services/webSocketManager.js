const { logger } = require('../utils/logger');

class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.subscriptions = new Map(); // socketId -> Set of symbols
    this.symbolSubscribers = new Map(); // symbol -> Set of socketIds
  }

  async subscribeToSymbols(socketId, symbols) {
    try {
      if (!Array.isArray(symbols)) {
        symbols = [symbols];
      }

      // Normalize symbols
      const normalizedSymbols = symbols.map(symbol => symbol.toUpperCase());

      // Update subscriptions
      this.subscriptions.set(socketId, new Set(normalizedSymbols));

      // Update symbol subscribers
      normalizedSymbols.forEach(symbol => {
        if (!this.symbolSubscribers.has(symbol)) {
          this.symbolSubscribers.set(symbol, new Set());
        }
        this.symbolSubscribers.get(symbol).add(socketId);
      });

      logger.info(`Socket ${socketId} subscribed to symbols: ${normalizedSymbols.join(', ')}`);

      // Send current sentiment data for subscribed symbols
      await this.sendCurrentSentimentData(socketId, normalizedSymbols);

    } catch (error) {
      logger.error('Error subscribing to symbols:', error);
      throw error;
    }
  }

  async unsubscribeFromSymbols(socketId, symbols) {
    try {
      if (!Array.isArray(symbols)) {
        symbols = [symbols];
      }

      const normalizedSymbols = symbols.map(symbol => symbol.toUpperCase());

      // Update subscriptions
      const currentSubscriptions = this.subscriptions.get(socketId);
      if (currentSubscriptions) {
        normalizedSymbols.forEach(symbol => {
          currentSubscriptions.delete(symbol);
        });
      }

      // Update symbol subscribers
      normalizedSymbols.forEach(symbol => {
        const subscribers = this.symbolSubscribers.get(symbol);
        if (subscribers) {
          subscribers.delete(socketId);
          if (subscribers.size === 0) {
            this.symbolSubscribers.delete(symbol);
          }
        }
      });

      logger.info(`Socket ${socketId} unsubscribed from symbols: ${normalizedSymbols.join(', ')}`);

    } catch (error) {
      logger.error('Error unsubscribing from symbols:', error);
      throw error;
    }
  }

  handleDisconnect(socketId) {
    try {
      // Get current subscriptions
      const subscriptions = this.subscriptions.get(socketId);
      if (subscriptions) {
        // Remove from symbol subscribers
        subscriptions.forEach(symbol => {
          const subscribers = this.symbolSubscribers.get(symbol);
          if (subscribers) {
            subscribers.delete(socketId);
            if (subscribers.size === 0) {
              this.symbolSubscribers.delete(symbol);
            }
          }
        });

        // Remove socket subscriptions
        this.subscriptions.delete(socketId);
      }

      logger.info(`Socket ${socketId} disconnected and cleaned up`);

    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  async broadcastSentimentUpdate(symbol, sentimentData) {
    try {
      const subscribers = this.symbolSubscribers.get(symbol);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      const message = {
        type: 'sentiment_update',
        symbol,
        data: sentimentData,
        timestamp: new Date().toISOString()
      };

      // Send to all subscribers
      subscribers.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit('sentiment_update', message);
        } else {
          // Clean up disconnected socket
          this.handleDisconnect(socketId);
        }
      });

      logger.debug(`Broadcasted sentiment update for ${symbol} to ${subscribers.size} subscribers`);

    } catch (error) {
      logger.error('Error broadcasting sentiment update:', error);
    }
  }

  async broadcastMarketSentimentUpdate(marketData) {
    try {
      const message = {
        type: 'market_sentiment_update',
        data: marketData,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients
      this.io.emit('market_sentiment_update', message);

      logger.debug('Broadcasted market sentiment update to all clients');

    } catch (error) {
      logger.error('Error broadcasting market sentiment update:', error);
    }
  }

  async broadcastSentimentAlert(alert) {
    try {
      const message = {
        type: 'sentiment_alert',
        data: alert,
        timestamp: new Date().toISOString()
      };

      // Send to subscribers of the specific symbol
      const subscribers = this.symbolSubscribers.get(alert.symbol);
      if (subscribers) {
        subscribers.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && socket.connected) {
            socket.emit('sentiment_alert', message);
          }
        });
      }

      // Also broadcast to all clients for high-priority alerts
      if (alert.priority === 'high') {
        this.io.emit('sentiment_alert', message);
      }

      logger.info(`Broadcasted sentiment alert for ${alert.symbol}`);

    } catch (error) {
      logger.error('Error broadcasting sentiment alert:', error);
    }
  }

  async sendCurrentSentimentData(socketId, symbols) {
    try {
      // This would fetch current sentiment data from Redis/database
      // For now, send a placeholder message
      const message = {
        type: 'current_sentiment',
        symbols,
        data: {},
        timestamp: new Date().toISOString()
      };

      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.emit('current_sentiment', message);
      }

    } catch (error) {
      logger.error('Error sending current sentiment data:', error);
    }
  }

  getSubscriptionStats() {
    return {
      totalSockets: this.subscriptions.size,
      totalSymbols: this.symbolSubscribers.size,
      subscriptions: Array.from(this.subscriptions.entries()).map(([socketId, symbols]) => ({
        socketId,
        symbols: Array.from(symbols)
      })),
      symbolSubscribers: Array.from(this.symbolSubscribers.entries()).map(([symbol, socketIds]) => ({
        symbol,
        subscriberCount: socketIds.size
      }))
    };
  }

  async getActiveSubscriptions() {
    const activeSubscriptions = new Map();
    
    this.subscriptions.forEach((symbols, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        activeSubscriptions.set(socketId, Array.from(symbols));
      }
    });

    return activeSubscriptions;
  }

  async cleanupInactiveSubscriptions() {
    try {
      const inactiveSockets = [];
      
      this.subscriptions.forEach((symbols, socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          inactiveSockets.push(socketId);
        }
      });

      inactiveSockets.forEach(socketId => {
        this.handleDisconnect(socketId);
      });

      if (inactiveSockets.length > 0) {
        logger.info(`Cleaned up ${inactiveSockets.length} inactive subscriptions`);
      }

    } catch (error) {
      logger.error('Error cleaning up inactive subscriptions:', error);
    }
  }
}

module.exports = WebSocketManager;
