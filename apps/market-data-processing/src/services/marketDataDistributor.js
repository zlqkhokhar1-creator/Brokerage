const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MarketDataDistributor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.subscriptions = new Map();
    this.distributionQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Start distribution queue processor
      this.startQueueProcessor();
      
      this._initialized = true;
      logger.info('MarketDataDistributor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MarketDataDistributor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MarketDataDistributor closed');
    } catch (error) {
      logger.error('Error closing MarketDataDistributor:', error);
    }
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (this.distributionQueue.length > 0) {
        const item = this.distributionQueue.shift();
        try {
          await this.processDistributionItem(item);
        } catch (error) {
          logger.error('Error processing distribution item:', error);
        }
      }
    }, 50); // Process every 50ms for low latency
  }

  async processDistributionItem(item) {
    try {
      const { subscriptionId, data, timestamp } = item;
      
      // Get subscription details
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        logger.warn(`Subscription not found: ${subscriptionId}`);
        return;
      }
      
      // Distribute data to subscribers
      await this.distributeToSubscribers(subscription, data, timestamp);
      
    } catch (error) {
      logger.error('Error processing distribution item:', error);
      throw error;
    }
  }

  async distributeToSubscribers(subscription, data, timestamp) {
    try {
      // Distribute via WebSocket
      if (subscription.webSocketClients && subscription.webSocketClients.size > 0) {
        for (const clientId of subscription.webSocketClients) {
          try {
            // This would emit to the WebSocket client
            this.emit('distributeData', {
              clientId,
              subscriptionId: subscription.id,
              data,
              timestamp
            });
          } catch (error) {
            logger.error(`Error distributing to WebSocket client ${clientId}:`, error);
          }
        }
      }
      
      // Distribute via Redis pub/sub
      if (subscription.redisChannels && subscription.redisChannels.length > 0) {
        for (const channel of subscription.redisChannels) {
          try {
            await this.redis.publish(channel, JSON.stringify({
              subscriptionId: subscription.id,
              data,
              timestamp
            }));
          } catch (error) {
            logger.error(`Error publishing to Redis channel ${channel}:`, error);
          }
        }
      }
      
      // Distribute via webhook
      if (subscription.webhookUrl) {
        try {
          await this.distributeViaWebhook(subscription.webhookUrl, data, timestamp);
        } catch (error) {
          logger.error(`Error distributing via webhook:`, error);
        }
      }
      
    } catch (error) {
      logger.error('Error distributing to subscribers:', error);
      throw error;
    }
  }

  async distributeViaWebhook(webhookUrl, data, timestamp) {
    try {
      const axios = require('axios');
      
      await axios.post(webhookUrl, {
        data,
        timestamp,
        source: 'market_data_processing'
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BrokerageSystem/1.0'
        }
      });
      
    } catch (error) {
      logger.error('Error distributing via webhook:', error);
      throw error;
    }
  }

  async subscribe(symbols, dataTypes, frequency, userId) {
    try {
      const subscriptionId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Creating subscription for user ${userId}`, {
        subscriptionId,
        symbols,
        dataTypes,
        frequency,
        userId
      });

      const subscription = {
        id: subscriptionId,
        symbols,
        dataTypes,
        frequency,
        userId,
        status: 'active',
        webSocketClients: new Set(),
        redisChannels: [],
        webhookUrl: null,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      // Store subscription
      await this.storeSubscription(subscription);
      
      // Add to active subscriptions
      this.subscriptions.set(subscriptionId, subscription);
      
      // Set up Redis channels
      for (const symbol of symbols) {
        for (const dataType of dataTypes) {
          const channel = `market_data:${symbol}:${dataType}`;
          subscription.redisChannels.push(channel);
        }
      }
      
      const result = {
        id: subscriptionId,
        symbols,
        dataTypes,
        frequency,
        status: 'active',
        processingTime: Date.now() - startTime,
        createdAt: subscription.createdAt
      };

      this.emit('subscriptionCreated', result);
      
      logger.info(`Subscription created for user ${userId}`, {
        subscriptionId,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async unsubscribe(subscriptionId, userId) {
    try {
      logger.info(`Unsubscribing user ${userId} from subscription ${subscriptionId}`);

      // Get subscription
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Verify ownership
      if (subscription.userId !== userId) {
        throw new Error('Unauthorized to unsubscribe from this subscription');
      }

      // Update subscription status
      subscription.status = 'inactive';
      subscription.endedAt = new Date().toISOString();

      // Update database
      await pool.query(
        'UPDATE data_subscriptions SET status = $1, ended_at = $2 WHERE id = $3',
        ['inactive', subscription.endedAt, subscriptionId]
      );

      // Remove from active subscriptions
      this.subscriptions.delete(subscriptionId);

      this.emit('subscriptionEnded', { id: subscriptionId, userId });

      logger.info(`Subscription ended: ${subscriptionId}`);

      return {
        id: subscriptionId,
        status: 'inactive',
        endedAt: subscription.endedAt
      };
    } catch (error) {
      logger.error('Error unsubscribing:', error);
      throw error;
    }
  }

  async getSubscriptions(userId) {
    try {
      const query = `
        SELECT * FROM data_subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  async storeSubscription(subscription) {
    try {
      const query = `
        INSERT INTO data_subscriptions (
          id, symbols, data_types, frequency, user_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        subscription.id,
        JSON.stringify(subscription.symbols),
        JSON.stringify(subscription.dataTypes),
        subscription.frequency,
        subscription.userId,
        subscription.status,
        subscription.createdAt
      ]);
      
      logger.info(`Subscription stored: ${subscription.id}`);
    } catch (error) {
      logger.error('Error storing subscription:', error);
      throw error;
    }
  }

  async addWebSocketClient(subscriptionId, clientId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.webSocketClients.add(clientId);
      subscription.lastActivity = new Date().toISOString();

      logger.info(`WebSocket client ${clientId} added to subscription ${subscriptionId}`);
    } catch (error) {
      logger.error('Error adding WebSocket client:', error);
      throw error;
    }
  }

  async removeWebSocketClient(subscriptionId, clientId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return; // Subscription might already be removed
      }

      subscription.webSocketClients.delete(clientId);
      subscription.lastActivity = new Date().toISOString();

      logger.info(`WebSocket client ${clientId} removed from subscription ${subscriptionId}`);
    } catch (error) {
      logger.error('Error removing WebSocket client:', error);
      throw error;
    }
  }

  async setWebhookUrl(subscriptionId, webhookUrl, userId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('Unauthorized to modify this subscription');
      }

      subscription.webhookUrl = webhookUrl;
      subscription.lastActivity = new Date().toISOString();

      // Update database
      await pool.query(
        'UPDATE data_subscriptions SET webhook_url = $1, last_activity = $2 WHERE id = $3',
        [webhookUrl, subscription.lastActivity, subscriptionId]
      );

      logger.info(`Webhook URL set for subscription ${subscriptionId}: ${webhookUrl}`);
    } catch (error) {
      logger.error('Error setting webhook URL:', error);
      throw error;
    }
  }

  async distributeMarketData(symbol, dataType, data) {
    try {
      const timestamp = new Date().toISOString();
      
      // Find matching subscriptions
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (subscription.status === 'active' && 
            subscription.symbols.includes(symbol) && 
            subscription.dataTypes.includes(dataType)) {
          
          // Add to distribution queue
          this.distributionQueue.push({
            subscriptionId,
            data,
            timestamp
          });
        }
      }
      
    } catch (error) {
      logger.error('Error distributing market data:', error);
      throw error;
    }
  }

  async getSubscriptionStats() {
    try {
      const stats = {
        totalSubscriptions: this.subscriptions.size,
        activeSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.status === 'active').length,
        totalWebSocketClients: Array.from(this.subscriptions.values()).reduce((sum, s) => sum + s.webSocketClients.size, 0),
        totalRedisChannels: Array.from(this.subscriptions.values()).reduce((sum, s) => sum + s.redisChannels.length, 0),
        webhookSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.webhookUrl).length,
        queueLength: this.distributionQueue.length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      throw error;
    }
  }

  async cleanupInactiveSubscriptions() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const inactiveSubscriptions = [];
      
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (new Date(subscription.lastActivity) < cutoff) {
          inactiveSubscriptions.push(subscriptionId);
        }
      }
      
      for (const subscriptionId of inactiveSubscriptions) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.status = 'inactive';
          subscription.endedAt = new Date().toISOString();
          
          // Update database
          await pool.query(
            'UPDATE data_subscriptions SET status = $1, ended_at = $2 WHERE id = $3',
            ['inactive', subscription.endedAt, subscriptionId]
          );
          
          this.subscriptions.delete(subscriptionId);
          this.emit('subscriptionEnded', { id: subscriptionId, reason: 'inactive' });
        }
      }
      
      if (inactiveSubscriptions.length > 0) {
        logger.info(`Cleaned up ${inactiveSubscriptions.length} inactive subscriptions`);
      }
      
    } catch (error) {
      logger.error('Error cleaning up inactive subscriptions:', error);
      throw error;
    }
  }
}

module.exports = MarketDataDistributor;
