const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');

class WebSocketManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.connections = new Map();
    this.subscriptions = new Map();
    this.rooms = new Map();
  }

  async subscribe(socketId, type, data) {
    try {
      const { symbol, dataType, userId } = data;
      
      logger.info(`WebSocket subscription request`, {
        socketId,
        type,
        symbol,
        dataType,
        userId
      });

      // Create room name based on subscription type
      const roomName = this.getRoomName(type, symbol, dataType);
      
      // Add socket to room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.join(roomName);
        
        // Store subscription info
        const subscriptionId = nanoid();
        const subscription = {
          id: subscriptionId,
          socketId,
          type,
          symbol,
          dataType,
          userId,
          roomName,
          subscribedAt: new Date().toISOString()
        };
        
        this.subscriptions.set(subscriptionId, subscription);
        
        // Track room membership
        if (!this.rooms.has(roomName)) {
          this.rooms.set(roomName, new Set());
        }
        this.rooms.get(roomName).add(socketId);
        
        // Emit subscription confirmation
        socket.emit('subscribed', {
          subscriptionId,
          type,
          symbol,
          dataType,
          roomName,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`WebSocket subscription created`, {
          subscriptionId,
          roomName,
          totalSubscriptions: this.subscriptions.size
        });
        
        return subscription;
      } else {
        throw new Error(`Socket ${socketId} not found`);
      }
    } catch (error) {
      logger.error('Error creating WebSocket subscription:', error);
      throw error;
    }
  }

  async unsubscribe(socketId, type, data) {
    try {
      const { symbol, dataType } = data;
      
      logger.info(`WebSocket unsubscription request`, {
        socketId,
        type,
        symbol,
        dataType
      });

      // Find subscriptions to remove
      const subscriptionsToRemove = [];
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (subscription.socketId === socketId && 
            subscription.type === type &&
            (!symbol || subscription.symbol === symbol) &&
            (!dataType || subscription.dataType === dataType)) {
          subscriptionsToRemove.push(subscriptionId);
        }
      }
      
      // Remove subscriptions and leave rooms
      let removedCount = 0;
      for (const subscriptionId of subscriptionsToRemove) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          // Leave room
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            await socket.leave(subscription.roomName);
            
            // Update room membership
            if (this.rooms.has(subscription.roomName)) {
              this.rooms.get(subscription.roomName).delete(socketId);
              
              // Remove empty room
              if (this.rooms.get(subscription.roomName).size === 0) {
                this.rooms.delete(subscription.roomName);
              }
            }
          }
          
          // Remove subscription
          this.subscriptions.delete(subscriptionId);
          removedCount++;
          
          // Emit unsubscription confirmation
          if (socket) {
            socket.emit('unsubscribed', {
              subscriptionId,
              type: subscription.type,
              symbol: subscription.symbol,
              dataType: subscription.dataType,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      logger.info(`WebSocket subscriptions removed`, {
        socketId,
        removedCount,
        totalSubscriptions: this.subscriptions.size
      });
      
      return { removedCount };
    } catch (error) {
      logger.error('Error removing WebSocket subscriptions:', error);
      throw error;
    }
  }

  async distributeData(type, symbol, dataType, data) {
    try {
      const roomName = this.getRoomName(type, symbol, dataType);
      
      if (this.rooms.has(roomName)) {
        const roomMembers = this.rooms.get(roomName);
        
        if (roomMembers.size > 0) {
          // Broadcast to room
          this.io.to(roomName).emit('marketData', {
            type,
            symbol,
            dataType,
            data,
            timestamp: new Date().toISOString()
          });
          
          logger.info(`Data distributed to room ${roomName}`, {
            roomName,
            memberCount: roomMembers.size,
            type,
            symbol,
            dataType
          });
        }
      }
      
    } catch (error) {
      logger.error('Error distributing data:', error);
      throw error;
    }
  }

  async broadcastToAll(type, data) {
    try {
      this.io.emit(type, {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted to all clients`, {
        type,
        clientCount: this.io.engine.clientsCount
      });
      
    } catch (error) {
      logger.error('Error broadcasting to all clients:', error);
      throw error;
    }
  }

  async sendToUser(userId, type, data) {
    try {
      // Find sockets for user
      const userSockets = [];
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (subscription.userId === userId) {
          userSockets.push(subscription.socketId);
        }
      }
      
      // Send to each socket
      for (const socketId of userSockets) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(type, {
            ...data,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      logger.info(`Sent to user ${userId}`, {
        userId,
        type,
        socketCount: userSockets.length
      });
      
    } catch (error) {
      logger.error('Error sending to user:', error);
      throw error;
    }
  }

  async handleDisconnect(socketId) {
    try {
      logger.info(`WebSocket client disconnected`, { socketId });
      
      // Remove all subscriptions for this socket
      const subscriptionsToRemove = [];
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (subscription.socketId === socketId) {
          subscriptionsToRemove.push(subscriptionId);
        }
      }
      
      let removedCount = 0;
      for (const subscriptionId of subscriptionsToRemove) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          // Update room membership
          if (this.rooms.has(subscription.roomName)) {
            this.rooms.get(subscription.roomName).delete(socketId);
            
            // Remove empty room
            if (this.rooms.get(subscription.roomName).size === 0) {
              this.rooms.delete(subscription.roomName);
            }
          }
          
          this.subscriptions.delete(subscriptionId);
          removedCount++;
        }
      }
      
      logger.info(`Cleaned up subscriptions for disconnected socket`, {
        socketId,
        removedCount
      });
      
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  getRoomName(type, symbol, dataType) {
    return `${type}:${symbol}:${dataType}`;
  }

  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      totalSubscriptions: this.subscriptions.size,
      totalRooms: this.rooms.size,
      roomMembers: Array.from(this.rooms.entries()).map(([roomName, members]) => ({
        roomName,
        memberCount: members.size
      }))
    };
  }

  getSubscriptionStats() {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      byType: {},
      bySymbol: {},
      byDataType: {}
    };
    
    for (const subscription of this.subscriptions.values()) {
      // By type
      stats.byType[subscription.type] = (stats.byType[subscription.type] || 0) + 1;
      
      // By symbol
      stats.bySymbol[subscription.symbol] = (stats.bySymbol[subscription.symbol] || 0) + 1;
      
      // By data type
      stats.byDataType[subscription.dataType] = (stats.byDataType[subscription.dataType] || 0) + 1;
    }
    
    return stats;
  }

  async cleanupInactiveSubscriptions() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const inactiveSubscriptions = [];
      
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (new Date(subscription.subscribedAt) < cutoff) {
          inactiveSubscriptions.push(subscriptionId);
        }
      }
      
      let removedCount = 0;
      for (const subscriptionId of inactiveSubscriptions) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          // Leave room
          const socket = this.io.sockets.sockets.get(subscription.socketId);
          if (socket) {
            await socket.leave(subscription.roomName);
          }
          
          // Update room membership
          if (this.rooms.has(subscription.roomName)) {
            this.rooms.get(subscription.roomName).delete(subscription.socketId);
            
            // Remove empty room
            if (this.rooms.get(subscription.roomName).size === 0) {
              this.rooms.delete(subscription.roomName);
            }
          }
          
          this.subscriptions.delete(subscriptionId);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        logger.info(`Cleaned up ${removedCount} inactive subscriptions`);
      }
      
    } catch (error) {
      logger.error('Error cleaning up inactive subscriptions:', error);
    }
  }
}

module.exports = WebSocketManager;
