const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const WebSocket = require('ws');

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.messageTypes = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load message types
      await this.loadMessageTypes();
      
      // Start WebSocket server
      this.startWebSocketServer();
      
      this._initialized = true;
      logger.info('WebSocketService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocketService:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.wss) {
        this.wss.close();
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('WebSocketService closed');
    } catch (error) {
      logger.error('Error closing WebSocketService:', error);
    }
  }

  async loadMessageTypes() {
    try {
      this.messageTypes = new Map([
        ['report_ready', {
          name: 'Report Ready',
          description: 'Sent when a report is ready for download',
          requiresAuth: true,
          broadcast: false
        }],
        ['export_ready', {
          name: 'Export Ready',
          description: 'Sent when an export is ready for download',
          requiresAuth: true,
          broadcast: false
        }],
        ['notification', {
          name: 'Notification',
          description: 'General notification message',
          requiresAuth: true,
          broadcast: false
        }],
        ['market_data', {
          name: 'Market Data',
          description: 'Real-time market data updates',
          requiresAuth: true,
          broadcast: true
        }],
        ['system_status', {
          name: 'System Status',
          description: 'System health and status updates',
          requiresAuth: false,
          broadcast: true
        }],
        ['user_activity', {
          name: 'User Activity',
          description: 'User activity updates',
          requiresAuth: true,
          broadcast: false
        }],
        ['dashboard_update', {
          name: 'Dashboard Update',
          description: 'Dashboard data updates',
          requiresAuth: true,
          broadcast: false
        }],
        ['error_alert', {
          name: 'Error Alert',
          description: 'Error and alert notifications',
          requiresAuth: true,
          broadcast: false
        }],
        ['heartbeat', {
          name: 'Heartbeat',
          description: 'Connection heartbeat',
          requiresAuth: false,
          broadcast: false
        }],
        ['join_room', {
          name: 'Join Room',
          description: 'Join a specific room/channel',
          requiresAuth: true,
          broadcast: false
        }],
        ['leave_room', {
          name: 'Leave Room',
          description: 'Leave a specific room/channel',
          requiresAuth: true,
          broadcast: false
        }]
      ]);
      
      logger.info('Message types loaded successfully');
    } catch (error) {
      logger.error('Error loading message types:', error);
      throw error;
    }
  }

  startWebSocketServer() {
    try {
      this.wss = new WebSocket.Server({ 
        port: process.env.WS_PORT || 8080,
        perMessageDeflate: false
      });
      
      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });
      
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });
      
      logger.info(`WebSocket server started on port ${process.env.WS_PORT || 8080}`);
    } catch (error) {
      logger.error('Error starting WebSocket server:', error);
      throw error;
    }
  }

  async handleConnection(ws, req) {
    try {
      const clientId = nanoid();
      const client = {
        id: clientId,
        ws: ws,
        userId: null,
        rooms: new Set(),
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ip: req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      
      this.clients.set(clientId, client);
      
      // Set up event handlers
      ws.on('message', (data) => this.handleMessage(clientId, data));
      ws.on('close', () => this.handleDisconnection(clientId));
      ws.on('error', (error) => this.handleError(clientId, error));
      
      // Send welcome message
      this.sendMessage(clientId, 'connection_established', {
        clientId: clientId,
        timestamp: Date.now()
      });
      
      this.emit('clientConnected', { clientId, client });
      
      logger.info(`Client connected: ${clientId}`, {
        ip: client.ip,
        userAgent: client.userAgent
      });
    } catch (error) {
      logger.error('Error handling connection:', error);
    }
  }

  async handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      client.lastActivity = Date.now();
      
      let message;
      try {
        message = JSON.parse(data);
      } catch (error) {
        this.sendError(clientId, 'Invalid JSON message');
        return;
      }
      
      const { type, data: messageData, room } = message;
      
      if (!type) {
        this.sendError(clientId, 'Message type is required');
        return;
      }
      
      // Validate message type
      const messageType = this.messageTypes.get(type);
      if (!messageType) {
        this.sendError(clientId, `Unknown message type: ${type}`);
        return;
      }
      
      // Check authentication for protected message types
      if (messageType.requiresAuth && !client.userId) {
        this.sendError(clientId, 'Authentication required');
        return;
      }
      
      // Handle message based on type
      await this.processMessage(clientId, type, messageData, room);
      
    } catch (error) {
      logger.error(`Error handling message from client ${clientId}:`, error);
      this.sendError(clientId, 'Internal server error');
    }
  }

  async processMessage(clientId, type, data, room) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      switch (type) {
        case 'authenticate':
          await this.handleAuthentication(clientId, data);
          break;
        case 'join_room':
          await this.handleJoinRoom(clientId, data);
          break;
        case 'leave_room':
          await this.handleLeaveRoom(clientId, data);
          break;
        case 'heartbeat':
          await this.handleHeartbeat(clientId, data);
          break;
        case 'subscribe':
          await this.handleSubscribe(clientId, data);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(clientId, data);
          break;
        default:
          // Forward message to appropriate handler
          this.emit('messageReceived', { clientId, type, data, room });
      }
    } catch (error) {
      logger.error(`Error processing message from client ${clientId}:`, error);
      throw error;
    }
  }

  async handleAuthentication(clientId, data) {
    try {
      const { token } = data;
      
      if (!token) {
        this.sendError(clientId, 'Authentication token is required');
        return;
      }
      
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const client = this.clients.get(clientId);
      if (client) {
        client.userId = decoded.userId;
        client.authenticatedAt = Date.now();
      }
      
      this.sendMessage(clientId, 'authenticated', {
        userId: decoded.userId,
        timestamp: Date.now()
      });
      
      logger.info(`Client authenticated: ${clientId}`, { userId: decoded.userId });
    } catch (error) {
      logger.error(`Authentication error for client ${clientId}:`, error);
      this.sendError(clientId, 'Authentication failed');
    }
  }

  async handleJoinRoom(clientId, data) {
    try {
      const { roomName } = data;
      
      if (!roomName) {
        this.sendError(clientId, 'Room name is required');
        return;
      }
      
      const client = this.clients.get(clientId);
      if (!client) return;
      
      client.rooms.add(roomName);
      
      // Add room to rooms map if it doesn't exist
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, new Set());
      }
      
      this.rooms.get(roomName).add(clientId);
      
      this.sendMessage(clientId, 'room_joined', {
        roomName: roomName,
        timestamp: Date.now()
      });
      
      this.emit('clientJoinedRoom', { clientId, roomName });
      
      logger.info(`Client joined room: ${clientId} -> ${roomName}`);
    } catch (error) {
      logger.error(`Error joining room for client ${clientId}:`, error);
      this.sendError(clientId, 'Failed to join room');
    }
  }

  async handleLeaveRoom(clientId, data) {
    try {
      const { roomName } = data;
      
      if (!roomName) {
        this.sendError(clientId, 'Room name is required');
        return;
      }
      
      const client = this.clients.get(clientId);
      if (!client) return;
      
      client.rooms.delete(roomName);
      
      if (this.rooms.has(roomName)) {
        this.rooms.get(roomName).delete(clientId);
        
        // Remove room if empty
        if (this.rooms.get(roomName).size === 0) {
          this.rooms.delete(roomName);
        }
      }
      
      this.sendMessage(clientId, 'room_left', {
        roomName: roomName,
        timestamp: Date.now()
      });
      
      this.emit('clientLeftRoom', { clientId, roomName });
      
      logger.info(`Client left room: ${clientId} -> ${roomName}`);
    } catch (error) {
      logger.error(`Error leaving room for client ${clientId}:`, error);
      this.sendError(clientId, 'Failed to leave room');
    }
  }

  async handleHeartbeat(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
      }
      
      this.sendMessage(clientId, 'heartbeat_ack', {
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error handling heartbeat for client ${clientId}:`, error);
    }
  }

  async handleSubscribe(clientId, data) {
    try {
      const { topics } = data;
      
      if (!Array.isArray(topics)) {
        this.sendError(clientId, 'Topics must be an array');
        return;
      }
      
      const client = this.clients.get(clientId);
      if (!client) return;
      
      if (!client.subscriptions) {
        client.subscriptions = new Set();
      }
      
      topics.forEach(topic => {
        client.subscriptions.add(topic);
      });
      
      this.sendMessage(clientId, 'subscribed', {
        topics: topics,
        timestamp: Date.now()
      });
      
      logger.info(`Client subscribed to topics: ${clientId}`, { topics });
    } catch (error) {
      logger.error(`Error handling subscription for client ${clientId}:`, error);
      this.sendError(clientId, 'Failed to subscribe');
    }
  }

  async handleUnsubscribe(clientId, data) {
    try {
      const { topics } = data;
      
      if (!Array.isArray(topics)) {
        this.sendError(clientId, 'Topics must be an array');
        return;
      }
      
      const client = this.clients.get(clientId);
      if (!client) return;
      
      if (client.subscriptions) {
        topics.forEach(topic => {
          client.subscriptions.delete(topic);
        });
      }
      
      this.sendMessage(clientId, 'unsubscribed', {
        topics: topics,
        timestamp: Date.now()
      });
      
      logger.info(`Client unsubscribed from topics: ${clientId}`, { topics });
    } catch (error) {
      logger.error(`Error handling unsubscription for client ${clientId}:`, error);
      this.sendError(clientId, 'Failed to unsubscribe');
    }
  }

  async handleDisconnection(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      // Remove client from all rooms
      client.rooms.forEach(roomName => {
        if (this.rooms.has(roomName)) {
          this.rooms.get(roomName).delete(clientId);
          
          // Remove room if empty
          if (this.rooms.get(roomName).size === 0) {
            this.rooms.delete(roomName);
          }
        }
      });
      
      this.clients.delete(clientId);
      
      this.emit('clientDisconnected', { clientId, client });
      
      logger.info(`Client disconnected: ${clientId}`, {
        duration: Date.now() - client.connectedAt
      });
    } catch (error) {
      logger.error(`Error handling disconnection for client ${clientId}:`, error);
    }
  }

  async handleError(clientId, error) {
    try {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.close();
      }
    } catch (error) {
      logger.error(`Error handling WebSocket error for client ${clientId}:`, error);
    }
  }

  async sendMessage(clientId, type, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      
      const message = {
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      client.ws.send(JSON.stringify(message));
      
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  async sendError(clientId, message) {
    try {
      await this.sendMessage(clientId, 'error', {
        message: message,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error sending error message to client ${clientId}:`, error);
    }
  }

  async broadcastMessage(type, data, roomName = null) {
    try {
      const message = {
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      if (roomName) {
        // Broadcast to specific room
        if (this.rooms.has(roomName)) {
          const roomClients = this.rooms.get(roomName);
          for (const clientId of roomClients) {
            await this.sendMessage(clientId, type, data);
          }
        }
      } else {
        // Broadcast to all clients
        for (const [clientId, client] of this.clients.entries()) {
          await this.sendMessage(clientId, type, data);
        }
      }
      
      logger.info(`Message broadcasted: ${type}`, { roomName, clientCount: roomName ? this.rooms.get(roomName)?.size || 0 : this.clients.size });
    } catch (error) {
      logger.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async sendToUser(userId, type, data) {
    try {
      const message = {
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      let sentCount = 0;
      
      for (const [clientId, client] of this.clients.entries()) {
        if (client.userId === userId) {
          const sent = await this.sendMessage(clientId, type, data);
          if (sent) sentCount++;
        }
      }
      
      logger.info(`Message sent to user: ${userId}`, { type, sentCount });
      return sentCount;
    } catch (error) {
      logger.error(`Error sending message to user ${userId}:`, error);
      throw error;
    }
  }

  async sendToRoom(roomName, type, data) {
    try {
      await this.broadcastMessage(type, data, roomName);
    } catch (error) {
      logger.error(`Error sending message to room ${roomName}:`, error);
      throw error;
    }
  }

  async getConnectedClients() {
    try {
      return Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        rooms: Array.from(client.rooms),
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
        ip: client.ip,
        userAgent: client.userAgent
      }));
    } catch (error) {
      logger.error('Error getting connected clients:', error);
      throw error;
    }
  }

  async getRooms() {
    try {
      const rooms = {};
      
      for (const [roomName, clientIds] of this.rooms.entries()) {
        rooms[roomName] = {
          name: roomName,
          clientCount: clientIds.size,
          clients: Array.from(clientIds)
        };
      }
      
      return rooms;
    } catch (error) {
      logger.error('Error getting rooms:', error);
      throw error;
    }
  }

  async getClientStats() {
    try {
      const stats = {
        totalClients: this.clients.size,
        authenticatedClients: 0,
        totalRooms: this.rooms.size,
        clientsByRoom: {}
      };
      
      for (const [clientId, client] of this.clients.entries()) {
        if (client.userId) {
          stats.authenticatedClients++;
        }
        
        client.rooms.forEach(roomName => {
          if (!stats.clientsByRoom[roomName]) {
            stats.clientsByRoom[roomName] = 0;
          }
          stats.clientsByRoom[roomName]++;
        });
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting client stats:', error);
      throw error;
    }
  }

  async disconnectClient(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.close();
      }
    } catch (error) {
      logger.error(`Error disconnecting client ${clientId}:`, error);
      throw error;
    }
  }

  async disconnectUser(userId) {
    try {
      let disconnectedCount = 0;
      
      for (const [clientId, client] of this.clients.entries()) {
        if (client.userId === userId) {
          client.ws.close();
          disconnectedCount++;
        }
      }
      
      logger.info(`Disconnected user: ${userId}`, { disconnectedCount });
      return disconnectedCount;
    } catch (error) {
      logger.error(`Error disconnecting user ${userId}:`, error);
      throw error;
    }
  }

  async getMessageTypes() {
    try {
      return Array.from(this.messageTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting message types:', error);
      throw error;
    }
  }
}

module.exports = WebSocketService;
