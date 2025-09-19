const logger = require('../utils/logger');
const redis = require('./redis');

class WebSocketManager {
  constructor() {
    this.connections = new Map();
  }

  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    this.connections.set(connectionId, {
      ws,
      userId: null,
      subscriptions: new Set(),
      connectedAt: new Date()
    });

    logger.info(`New WebSocket connection: ${connectionId}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(connectionId, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        this.sendError(connectionId, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for connection ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    });

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString()
    });
  }

  handleMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      switch (data.type) {
        case 'authenticate':
          this.handleAuthentication(connectionId, data);
          break;
        case 'subscribe':
          this.handleSubscription(connectionId, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(connectionId, data);
          break;
        case 'ping':
          this.sendMessage(connectionId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          this.sendError(connectionId, 'Unknown message type');
      }
    } catch (error) {
      logger.error(`Error handling message for connection ${connectionId}:`, error);
      this.sendError(connectionId, 'Error processing message');
    }
  }

  handleAuthentication(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Validate JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'secret');
      
      connection.userId = decoded.userId;
      logger.info(`Connection ${connectionId} authenticated for user ${decoded.userId}`);
      
      this.sendMessage(connectionId, {
        type: 'authenticated',
        userId: decoded.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Authentication failed for connection ${connectionId}:`, error);
      this.sendError(connectionId, 'Authentication failed');
    }
  }

  handleSubscription(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.userId) {
      this.sendError(connectionId, 'Authentication required');
      return;
    }

    try {
      const { channel } = data;
      connection.subscriptions.add(channel);
      
      logger.info(`Connection ${connectionId} subscribed to channel: ${channel}`);
      
      this.sendMessage(connectionId, {
        type: 'subscribed',
        channel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Subscription error for connection ${connectionId}:`, error);
      this.sendError(connectionId, 'Subscription failed');
    }
  }

  handleUnsubscription(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const { channel } = data;
      connection.subscriptions.delete(channel);
      
      logger.info(`Connection ${connectionId} unsubscribed from channel: ${channel}`);
      
      this.sendMessage(connectionId, {
        type: 'unsubscribed',
        channel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Unsubscription error for connection ${connectionId}:`, error);
      this.sendError(connectionId, 'Unsubscription failed');
    }
  }

  handleDisconnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      logger.info(`WebSocket connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
    }
  }

  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === 1) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending message to connection ${connectionId}:`, error);
      }
    }
  }

  sendError(connectionId, error) {
    this.sendMessage(connectionId, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToChannel(channel, message) {
    let sentCount = 0;
    this.connections.forEach((connection, connectionId) => {
      if (connection.subscriptions.has(channel)) {
        this.sendMessage(connectionId, {
          type: 'broadcast',
          channel,
          data: message,
          timestamp: new Date().toISOString()
        });
        sentCount++;
      }
    });
    logger.info(`Broadcasted message to ${sentCount} connections on channel: ${channel}`);
  }

  broadcastToUser(userId, message) {
    let sentCount = 0;
    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId) {
        this.sendMessage(connectionId, {
          type: 'user_message',
          data: message,
          timestamp: new Date().toISOString()
        });
        sentCount++;
      }
    });
    logger.info(`Broadcasted message to ${sentCount} connections for user: ${userId}`);
  }

  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(c => c.userId).length,
      channels: new Set(Array.from(this.connections.values()).flatMap(c => Array.from(c.subscriptions))).size
    };
  }

  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new WebSocketManager();

