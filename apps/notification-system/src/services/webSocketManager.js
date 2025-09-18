const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const Redis = require('ioredis');

class WebSocketManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.subscriptions = new Map();
    this.rooms = new Map();
    this.connections = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Subscribe to Redis channels
      await this.setupRedisSubscriptions();
      
      this._initialized = true;
      logger.info('WebSocketManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocketManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('WebSocketManager closed');
    } catch (error) {
      logger.error('Error closing WebSocketManager:', error);
    }
  }

  async setupRedisSubscriptions() {
    try {
      // Subscribe to notification events
      await this.redis.subscribe('notification:created', 'notification:delivered', 'notification:failed');
      await this.redis.subscribe('template:created', 'template:updated', 'template:deleted');
      await this.redis.subscribe('channel:tested', 'channel:updated');
      await this.redis.subscribe('ab_test:created', 'ab_test:completed', 'ab_test:stopped');
      await this.redis.subscribe('analytics:updated', 'report:generated');
      
      // Handle Redis messages
      this.redis.on('message', (channel, message) => {
        this.handleRedisMessage(channel, message);
      });
      
      logger.info('Redis subscriptions established');
    } catch (error) {
      logger.error('Error setting up Redis subscriptions:', error);
      throw error;
    }
  }

  async handleRedisMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'notification:created':
          await this.broadcastToRoom('notifications', 'notificationCreated', data);
          break;
        case 'notification:delivered':
          await this.broadcastToRoom('notifications', 'notificationDelivered', data);
          break;
        case 'notification:failed':
          await this.broadcastToRoom('notifications', 'notificationFailed', data);
          break;
        case 'template:created':
          await this.broadcastToRoom('templates', 'templateCreated', data);
          break;
        case 'template:updated':
          await this.broadcastToRoom('templates', 'templateUpdated', data);
          break;
        case 'template:deleted':
          await this.broadcastToRoom('templates', 'templateDeleted', data);
          break;
        case 'channel:tested':
          await this.broadcastToRoom('channels', 'channelTested', data);
          break;
        case 'channel:updated':
          await this.broadcastToRoom('channels', 'channelUpdated', data);
          break;
        case 'ab_test:created':
          await this.broadcastToRoom('ab_tests', 'abTestCreated', data);
          break;
        case 'ab_test:completed':
          await this.broadcastToRoom('ab_tests', 'abTestCompleted', data);
          break;
        case 'ab_test:stopped':
          await this.broadcastToRoom('ab_tests', 'abTestStopped', data);
          break;
        case 'analytics:updated':
          await this.broadcastToRoom('analytics', 'analyticsUpdated', data);
          break;
        case 'report:generated':
          await this.broadcastToRoom('analytics', 'reportGenerated', data);
          break;
        default:
          logger.warn(`Unknown Redis channel: ${channel}`);
      }
    } catch (error) {
      logger.error('Error handling Redis message:', error);
    }
  }

  async subscribe(socketId, type, filters = {}) {
    try {
      const subscription = {
        id: nanoid(),
        socketId,
        type,
        filters,
        subscribedAt: new Date()
      };
      
      // Store subscription
      this.subscriptions.set(subscription.id, subscription);
      
      // Add to room
      const roomName = this.getRoomName(type, filters);
      await this.addToRoom(socketId, roomName);
      
      // Store connection info
      this.connections.set(socketId, {
        socketId,
        subscriptions: this.connections.get(socketId)?.subscriptions || new Set(),
        joinedAt: this.connections.get(socketId)?.joinedAt || new Date()
      });
      
      this.connections.get(socketId).subscriptions.add(subscription.id);
      
      logger.info(`Client subscribed to ${type}`, {
        socketId,
        subscriptionId: subscription.id,
        roomName
      });
      
      return subscription;
    } catch (error) {
      logger.error('Error subscribing client:', error);
      throw error;
    }
  }

  async unsubscribe(socketId, subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription || subscription.socketId !== socketId) {
        throw new Error('Subscription not found');
      }
      
      // Remove from room
      const roomName = this.getRoomName(subscription.type, subscription.filters);
      await this.removeFromRoom(socketId, roomName);
      
      // Remove subscription
      this.subscriptions.delete(subscriptionId);
      
      // Update connection info
      if (this.connections.has(socketId)) {
        this.connections.get(socketId).subscriptions.delete(subscriptionId);
      }
      
      logger.info(`Client unsubscribed from ${subscription.type}`, {
        socketId,
        subscriptionId
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error unsubscribing client:', error);
      throw error;
    }
  }

  async addToRoom(socketId, roomName) {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.join(roomName);
        
        // Track room membership
        if (!this.rooms.has(roomName)) {
          this.rooms.set(roomName, new Set());
        }
        this.rooms.get(roomName).add(socketId);
        
        logger.debug(`Socket ${socketId} joined room ${roomName}`);
      }
    } catch (error) {
      logger.error('Error adding socket to room:', error);
    }
  }

  async removeFromRoom(socketId, roomName) {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.leave(roomName);
        
        // Update room membership
        if (this.rooms.has(roomName)) {
          this.rooms.get(roomName).delete(socketId);
          if (this.rooms.get(roomName).size === 0) {
            this.rooms.delete(roomName);
          }
        }
        
        logger.debug(`Socket ${socketId} left room ${roomName}`);
      }
    } catch (error) {
      logger.error('Error removing socket from room:', error);
    }
  }

  getRoomName(type, filters = {}) {
    const baseRoom = `notification_system:${type}`;
    
    if (Object.keys(filters).length === 0) {
      return baseRoom;
    }
    
    const filterKeys = Object.keys(filters).sort();
    const filterString = filterKeys.map(key => `${key}:${filters[key]}`).join('|');
    
    return `${baseRoom}:${filterString}`;
  }

  async broadcastToRoom(roomType, event, data) {
    try {
      const roomName = this.getRoomName(roomType);
      this.io.to(roomName).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      logger.debug(`Broadcasted ${event} to room ${roomName}`, {
        roomName,
        event,
        dataKeys: Object.keys(data)
      });
    } catch (error) {
      logger.error('Error broadcasting to room:', error);
    }
  }

  async broadcastToSpecificRoom(roomName, event, data) {
    try {
      this.io.to(roomName).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      logger.debug(`Broadcasted ${event} to specific room ${roomName}`, {
        roomName,
        event,
        dataKeys: Object.keys(data)
      });
    } catch (error) {
      logger.error('Error broadcasting to specific room:', error);
    }
  }

  async sendToSocket(socketId, event, data) {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, {
          ...data,
          timestamp: new Date().toISOString()
        });
        
        logger.debug(`Sent ${event} to socket ${socketId}`, {
          socketId,
          event,
          dataKeys: Object.keys(data)
        });
      } else {
        logger.warn(`Socket ${socketId} not found`);
      }
    } catch (error) {
      logger.error('Error sending to socket:', error);
    }
  }

  async handleDisconnect(socketId) {
    try {
      // Get all subscriptions for this socket
      const subscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.socketId === socketId);
      
      // Remove all subscriptions
      for (const subscription of subscriptions) {
        this.subscriptions.delete(subscription.id);
      }
      
      // Remove from all rooms
      for (const [roomName, members] of this.rooms.entries()) {
        if (members.has(socketId)) {
          members.delete(socketId);
          if (members.size === 0) {
            this.rooms.delete(roomName);
          }
        }
      }
      
      // Remove connection info
      this.connections.delete(socketId);
      
      logger.info(`Client disconnected and cleaned up`, {
        socketId,
        subscriptionsRemoved: subscriptions.length
      });
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  async getConnectionStats() {
    try {
      const stats = {
        totalConnections: this.connections.size,
        totalSubscriptions: this.subscriptions.size,
        totalRooms: this.rooms.size,
        roomMembership: {}
      };
      
      // Count room membership
      for (const [roomName, members] of this.rooms.entries()) {
        stats.roomMembership[roomName] = members.size;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      throw error;
    }
  }

  async getSubscriptions(socketId) {
    try {
      const subscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.socketId === socketId);
      
      return subscriptions;
    } catch (error) {
      logger.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  async getRoomMembers(roomName) {
    try {
      const members = this.rooms.get(roomName) || new Set();
      return Array.from(members);
    } catch (error) {
      logger.error('Error getting room members:', error);
      throw error;
    }
  }

  async publishEvent(channel, event, data) {
    try {
      const message = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      });
      
      await this.redis.publish(channel, message);
      
      logger.debug(`Published event to Redis channel ${channel}`, {
        channel,
        event,
        dataKeys: Object.keys(data)
      });
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  async getActiveConnections() {
    try {
      const connections = Array.from(this.connections.values()).map(conn => ({
        socketId: conn.socketId,
        joinedAt: conn.joinedAt,
        subscriptionCount: conn.subscriptions.size,
        subscriptions: Array.from(conn.subscriptions)
      }));
      
      return connections;
    } catch (error) {
      logger.error('Error getting active connections:', error);
      throw error;
    }
  }

  async cleanupInactiveConnections() {
    try {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
      let cleanedCount = 0;
      
      for (const [socketId, connection] of this.connections.entries()) {
        const timeSinceJoined = now - connection.joinedAt;
        
        if (timeSinceJoined > inactiveThreshold) {
          // Check if socket is still connected
          const socket = this.io.sockets.sockets.get(socketId);
          if (!socket) {
            await this.handleDisconnect(socketId);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} inactive connections`);
      }
      
      return { cleanedCount };
    } catch (error) {
      logger.error('Error cleaning up inactive connections:', error);
      throw error;
    }
  }

  async sendNotificationUpdate(notificationId, update) {
    try {
      const event = 'notificationUpdate';
      const data = {
        notificationId,
        update,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all notification subscribers
      await this.broadcastToRoom('notifications', event, data);
      
      logger.debug(`Sent notification update: ${notificationId}`, {
        notificationId,
        updateType: update.type
      });
    } catch (error) {
      logger.error('Error sending notification update:', error);
    }
  }

  async sendTemplateUpdate(templateId, update) {
    try {
      const event = 'templateUpdate';
      const data = {
        templateId,
        update,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all template subscribers
      await this.broadcastToRoom('templates', event, data);
      
      logger.debug(`Sent template update: ${templateId}`, {
        templateId,
        updateType: update.type
      });
    } catch (error) {
      logger.error('Error sending template update:', error);
    }
  }

  async sendChannelUpdate(channelId, update) {
    try {
      const event = 'channelUpdate';
      const data = {
        channelId,
        update,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all channel subscribers
      await this.broadcastToRoom('channels', event, data);
      
      logger.debug(`Sent channel update: ${channelId}`, {
        channelId,
        updateType: update.type
      });
    } catch (error) {
      logger.error('Error sending channel update:', error);
    }
  }

  async sendABTestUpdate(testId, update) {
    try {
      const event = 'abTestUpdate';
      const data = {
        testId,
        update,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all A/B test subscribers
      await this.broadcastToRoom('ab_tests', event, data);
      
      logger.debug(`Sent A/B test update: ${testId}`, {
        testId,
        updateType: update.type
      });
    } catch (error) {
      logger.error('Error sending A/B test update:', error);
    }
  }

  async sendAnalyticsUpdate(update) {
    try {
      const event = 'analyticsUpdate';
      const data = {
        update,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all analytics subscribers
      await this.broadcastToRoom('analytics', event, data);
      
      logger.debug(`Sent analytics update`, {
        updateType: update.type
      });
    } catch (error) {
      logger.error('Error sending analytics update:', error);
    }
  }
}

module.exports = WebSocketManager;
