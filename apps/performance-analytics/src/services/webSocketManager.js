const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.userSessions = new Map();
  }

  initialize(server) {
    try {
      this.wss = new WebSocketServer({ 
        server,
        path: '/ws/performance-analytics'
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      logger.info('WebSocket Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket Manager:', error);
      throw error;
    }
  }

  handleConnection(ws, req) {
    try {
      const clientId = uuidv4();
      const client = {
        id: clientId,
        ws: ws,
        userId: null,
        connectedAt: new Date(),
        lastPing: new Date()
      };

      this.clients.set(clientId, client);

      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId: clientId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} connected`);
    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
    }
  }

  handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, message);
          break;
        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error handling message from client ${clientId}:`, error);
    }
  }

  handleAuthentication(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const { userId, token } = message;
      
      // In a real implementation, you would validate the token
      if (userId && token) {
        client.userId = userId;
        
        // Add to user sessions
        if (!this.userSessions.has(userId)) {
          this.userSessions.set(userId, new Set());
        }
        this.userSessions.get(userId).add(clientId);

        this.sendToClient(clientId, {
          type: 'authenticated',
          userId: userId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Client ${clientId} authenticated as user ${userId}`);
      } else {
        this.sendToClient(clientId, {
          type: 'authentication_failed',
          error: 'Invalid credentials',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error(`Error handling authentication for client ${clientId}:`, error);
    }
  }

  handleSubscription(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const { topics } = message;
      
      if (!client.subscriptions) {
        client.subscriptions = new Set();
      }

      topics.forEach(topic => {
        client.subscriptions.add(topic);
      });

      this.sendToClient(clientId, {
        type: 'subscribed',
        topics: topics,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Error handling subscription for client ${clientId}:`, error);
    }
  }

  handleUnsubscription(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const { topics } = message;
      
      if (client.subscriptions) {
        topics.forEach(topic => {
          client.subscriptions.delete(topic);
        });
      }

      this.sendToClient(clientId, {
        type: 'unsubscribed',
        topics: topics,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} unsubscribed from topics: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Error handling unsubscription for client ${clientId}:`, error);
    }
  }

  handlePing(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.lastPing = new Date();

      this.sendToClient(clientId, {
        type: 'pong',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error handling ping for client ${clientId}:`, error);
    }
  }

  handleDisconnection(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      // Remove from user sessions
      if (client.userId && this.userSessions.has(client.userId)) {
        this.userSessions.get(client.userId).delete(clientId);
        if (this.userSessions.get(client.userId).size === 0) {
          this.userSessions.delete(client.userId);
        }
      }

      this.clients.delete(clientId);
      logger.info(`Client ${clientId} disconnected`);
    } catch (error) {
      logger.error(`Error handling disconnection for client ${clientId}:`, error);
    }
  }

  sendToClient(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== client.ws.OPEN) return;

      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
    }
  }

  sendToUser(userId, message) {
    try {
      const userSessions = this.userSessions.get(userId);
      if (!userSessions) return;

      userSessions.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    } catch (error) {
      logger.error(`Error sending message to user ${userId}:`, error);
    }
  }

  broadcast(message, excludeClientId = null) {
    try {
      this.clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId) {
          this.sendToClient(clientId, message);
        }
      });
    } catch (error) {
      logger.error('Error broadcasting message:', error);
    }
  }

  broadcastToSubscribers(topic, message, excludeClientId = null) {
    try {
      this.clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && 
            client.subscriptions && 
            client.subscriptions.has(topic)) {
          this.sendToClient(clientId, message);
        }
      });
    } catch (error) {
      logger.error(`Error broadcasting to subscribers of topic ${topic}:`, error);
    }
  }

  sendPerformanceUpdate(userId, update) {
    try {
      const message = {
        type: 'performance_update',
        update: update,
        timestamp: new Date().toISOString()
      };

      this.sendToUser(userId, message);
    } catch (error) {
      logger.error(`Error sending performance update to user ${userId}:`, error);
    }
  }

  sendAttributionUpdate(userId, update) {
    try {
      const message = {
        type: 'attribution_update',
        update: update,
        timestamp: new Date().toISOString()
      };

      this.sendToUser(userId, message);
    } catch (error) {
      logger.error(`Error sending attribution update to user ${userId}:`, error);
    }
  }

  sendBenchmarkUpdate(userId, update) {
    try {
      const message = {
        type: 'benchmark_update',
        update: update,
        timestamp: new Date().toISOString()
      };

      this.sendToUser(userId, message);
    } catch (error) {
      logger.error(`Error sending benchmark update to user ${userId}:`, error);
    }
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
      subscriptions: client.subscriptions ? Array.from(client.subscriptions) : []
    }));
  }

  getConnectedUsers() {
    return Array.from(this.userSessions.keys());
  }

  getClientCount() {
    return this.clients.size;
  }

  getUserSessionCount(userId) {
    const userSessions = this.userSessions.get(userId);
    return userSessions ? userSessions.size : 0;
  }

  close() {
    try {
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      
      this.clients.clear();
      this.userSessions.clear();
      
      logger.info('WebSocket Manager closed');
    } catch (error) {
      logger.error('Error closing WebSocket Manager:', error);
    }
  }
}

module.exports = WebSocketManager;

