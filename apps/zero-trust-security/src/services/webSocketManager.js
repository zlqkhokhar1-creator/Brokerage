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
    
    this.connections = new Map();
    this.subscriptions = new Map();
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
      
      // Setup WebSocket event handlers
      this.setupWebSocketHandlers();
      
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

  async loadMessageTypes() {
    try {
      this.messageTypes = new Map([
        ['threat_alert', {
          name: 'Threat Alert',
          description: 'Real-time threat alerts',
          requiresAuth: true,
          broadcast: true
        }],
        ['incident_update', {
          name: 'Incident Update',
          description: 'Incident status updates',
          requiresAuth: true,
          broadcast: true
        }],
        ['policy_violation', {
          name: 'Policy Violation',
          description: 'Policy violation notifications',
          requiresAuth: true,
          broadcast: false
        }],
        ['security_alert', {
          name: 'Security Alert',
          description: 'Security system alerts',
          requiresAuth: true,
          broadcast: true
        }],
        ['access_denied', {
          name: 'Access Denied',
          description: 'Access denial notifications',
          requiresAuth: true,
          broadcast: false
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
        ['network_change', {
          name: 'Network Change',
          description: 'Network configuration changes',
          requiresAuth: true,
          broadcast: true
        }],
        ['compliance_check', {
          name: 'Compliance Check',
          description: 'Compliance check results',
          requiresAuth: true,
          broadcast: false
        }],
        ['heartbeat', {
          name: 'Heartbeat',
          description: 'Connection heartbeat',
          requiresAuth: false,
          broadcast: false
        }
      ]);
      
      logger.info('Message types loaded successfully');
    } catch (error) {
      logger.error('Error loading message types:', error);
      throw error;
    }
  }

  setupWebSocketHandlers() {
    try {
      this.io.on('connection', (socket) => {
        this.handleConnection(socket);
      });
      
      logger.info('WebSocket handlers setup complete');
    } catch (error) {
      logger.error('Error setting up WebSocket handlers:', error);
      throw error;
    }
  }

  async handleConnection(socket) {
    try {
      const connectionId = nanoid();
      const connection = {
        id: connectionId,
        socket: socket,
        userId: null,
        subscriptions: new Set(),
        rooms: new Set(),
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      };
      
      this.connections.set(connectionId, connection);
      
      // Set up event handlers
      socket.on('subscribe', (data) => this.handleSubscribe(connectionId, data));
      socket.on('unsubscribe', (data) => this.handleUnsubscribe(connectionId, data));
      socket.on('join_room', (data) => this.handleJoinRoom(connectionId, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(connectionId, data));
      socket.on('message', (data) => this.handleMessage(connectionId, data));
      socket.on('heartbeat', (data) => this.handleHeartbeat(connectionId, data));
      socket.on('disconnect', () => this.handleDisconnect(connectionId));
      socket.on('error', (error) => this.handleError(connectionId, error));
      
      // Send welcome message
      this.sendMessage(connectionId, 'connection_established', {
        connectionId: connectionId,
        timestamp: Date.now()
      });
      
      // Emit event
      this.emit('clientConnected', { connectionId, connection });
      
      logger.info(`Client connected: ${connectionId}`, {
        ip: connection.ip,
        userAgent: connection.userAgent
      });
    } catch (error) {
      logger.error('Error handling connection:', error);
    }
  }

  async handleSubscribe(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      const { type, userId } = data;
      
      if (!type) {
        this.sendError(connectionId, 'Subscription type is required');
        return;
      }
      
      // Validate message type
      const messageType = this.messageTypes.get(type);
      if (!messageType) {
        this.sendError(connectionId, `Unknown subscription type: ${type}`);
        return;
      }
      
      // Check authentication for protected message types
      if (messageType.requiresAuth && !connection.userId) {
        this.sendError(connectionId, 'Authentication required for this subscription');
        return;
      }
      
      // Add to subscriptions
      connection.subscriptions.add(type);
      
      // Add to subscriptions map
      if (!this.subscriptions.has(type)) {
        this.subscriptions.set(type, new Set());
      }
      this.subscriptions.get(type).add(connectionId);
      
      this.sendMessage(connectionId, 'subscribed', {
        type: type,
        timestamp: Date.now()
      });
      
      this.emit('clientSubscribed', { connectionId, type, userId });
      
      logger.info(`Client subscribed: ${connectionId}`, { type, userId });
    } catch (error) {
      logger.error('Error handling subscribe:', error);
      this.sendError(connectionId, 'Subscription failed');
    }
  }

  async handleUnsubscribe(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      const { type } = data;
      
      if (!type) {
        this.sendError(connectionId, 'Unsubscription type is required');
        return;
      }
      
      // Remove from subscriptions
      connection.subscriptions.delete(type);
      
      // Remove from subscriptions map
      if (this.subscriptions.has(type)) {
        this.subscriptions.get(type).delete(connectionId);
      }
      
      this.sendMessage(connectionId, 'unsubscribed', {
        type: type,
        timestamp: Date.now()
      });
      
      this.emit('clientUnsubscribed', { connectionId, type });
      
      logger.info(`Client unsubscribed: ${connectionId}`, { type });
    } catch (error) {
      logger.error('Error handling unsubscribe:', error);
      this.sendError(connectionId, 'Unsubscription failed');
    }
  }

  async handleJoinRoom(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      const { roomName } = data;
      
      if (!roomName) {
        this.sendError(connectionId, 'Room name is required');
        return;
      }
      
      // Add to room
      connection.rooms.add(roomName);
      
      // Add room to rooms map
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, new Set());
      }
      this.rooms.get(roomName).add(connectionId);
      
      this.sendMessage(connectionId, 'room_joined', {
        roomName: roomName,
        timestamp: Date.now()
      });
      
      this.emit('clientJoinedRoom', { connectionId, roomName });
      
      logger.info(`Client joined room: ${connectionId}`, { roomName });
    } catch (error) {
      logger.error('Error handling join room:', error);
      this.sendError(connectionId, 'Failed to join room');
    }
  }

  async handleLeaveRoom(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      const { roomName } = data;
      
      if (!roomName) {
        this.sendError(connectionId, 'Room name is required');
        return;
      }
      
      // Remove from room
      connection.rooms.delete(roomName);
      
      // Remove from rooms map
      if (this.rooms.has(roomName)) {
        this.rooms.get(roomName).delete(connectionId);
        
        // Remove room if empty
        if (this.rooms.get(roomName).size === 0) {
          this.rooms.delete(roomName);
        }
      }
      
      this.sendMessage(connectionId, 'room_left', {
        roomName: roomName,
        timestamp: Date.now()
      });
      
      this.emit('clientLeftRoom', { connectionId, roomName });
      
      logger.info(`Client left room: ${connectionId}`, { roomName });
    } catch (error) {
      logger.error('Error handling leave room:', error);
      this.sendError(connectionId, 'Failed to leave room');
    }
  }

  async handleMessage(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      connection.lastActivity = Date.now();
      
      const { type, payload } = data;
      
      if (!type) {
        this.sendError(connectionId, 'Message type is required');
        return;
      }
      
      // Validate message type
      const messageType = this.messageTypes.get(type);
      if (!messageType) {
        this.sendError(connectionId, `Unknown message type: ${type}`);
        return;
      }
      
      // Check authentication for protected message types
      if (messageType.requiresAuth && !connection.userId) {
        this.sendError(connectionId, 'Authentication required');
        return;
      }
      
      // Handle message
      await this.processMessage(connectionId, type, payload);
      
    } catch (error) {
      logger.error('Error handling message:', error);
      this.sendError(connectionId, 'Message processing failed');
    }
  }

  async handleHeartbeat(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.lastActivity = Date.now();
      }
      
      this.sendMessage(connectionId, 'heartbeat_ack', {
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling heartbeat:', error);
    }
  }

  async handleDisconnect(connectionId) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;
      
      // Remove from all subscriptions
      for (const subscription of connection.subscriptions) {
        if (this.subscriptions.has(subscription)) {
          this.subscriptions.get(subscription).delete(connectionId);
        }
      }
      
      // Remove from all rooms
      for (const roomName of connection.rooms) {
        if (this.rooms.has(roomName)) {
          this.rooms.get(roomName).delete(connectionId);
          
          // Remove room if empty
          if (this.rooms.get(roomName).size === 0) {
            this.rooms.delete(roomName);
          }
        }
      }
      
      this.connections.delete(connectionId);
      
      this.emit('clientDisconnected', { connectionId, connection });
      
      logger.info(`Client disconnected: ${connectionId}`, {
        duration: Date.now() - connection.connectedAt
      });
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  async handleError(connectionId, error) {
    try {
      logger.error(`WebSocket error for connection ${connectionId}:`, error);
      
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.disconnect();
      }
    } catch (error) {
      logger.error('Error handling WebSocket error:', error);
    }
  }

  async processMessage(connectionId, type, payload) {
    try {
      // Emit message event for processing
      this.emit('messageReceived', { connectionId, type, payload });
      
    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  async subscribe(connectionId, type, data) {
    try {
      await this.handleSubscribe(connectionId, { type, ...data });
    } catch (error) {
      logger.error('Error subscribing:', error);
      throw error;
    }
  }

  async sendMessage(connectionId, type, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return false;
      }
      
      const message = {
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      connection.socket.emit('message', message);
      
      return true;
    } catch (error) {
      logger.error(`Error sending message to connection ${connectionId}:`, error);
      return false;
    }
  }

  async sendError(connectionId, message) {
    try {
      await this.sendMessage(connectionId, 'error', {
        message: message,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error sending error message to connection ${connectionId}:`, error);
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
          const roomConnections = this.rooms.get(roomName);
          for (const connectionId of roomConnections) {
            await this.sendMessage(connectionId, type, data);
          }
        }
      } else {
        // Broadcast to all connections
        for (const [connectionId, connection] of this.connections.entries()) {
          await this.sendMessage(connectionId, type, data);
        }
      }
      
      logger.info(`Message broadcasted: ${type}`, {
        roomName,
        connectionCount: roomName ? this.rooms.get(roomName)?.size || 0 : this.connections.size
      });
    } catch (error) {
      logger.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async sendToSubscribers(type, data) {
    try {
      const message = {
        type: type,
        data: data,
        timestamp: Date.now()
      };
      
      if (this.subscriptions.has(type)) {
        const subscribers = this.subscriptions.get(type);
        for (const connectionId of subscribers) {
          await this.sendMessage(connectionId, type, data);
        }
      }
      
      logger.info(`Message sent to subscribers: ${type}`, {
        subscriberCount: this.subscriptions.get(type)?.size || 0
      });
    } catch (error) {
      logger.error('Error sending to subscribers:', error);
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
      
      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.userId === userId) {
          const sent = await this.sendMessage(connectionId, type, data);
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

  async getConnectionStats() {
    try {
      const stats = {
        totalConnections: this.connections.size,
        authenticatedConnections: 0,
        totalSubscriptions: this.subscriptions.size,
        totalRooms: this.rooms.size,
        subscriptionsByType: {},
        connectionsByRoom: {}
      };
      
      // Count authenticated connections
      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.userId) {
          stats.authenticatedConnections++;
        }
        
        // Count connections by room
        for (const roomName of connection.rooms) {
          if (!stats.connectionsByRoom[roomName]) {
            stats.connectionsByRoom[roomName] = 0;
          }
          stats.connectionsByRoom[roomName]++;
        }
      }
      
      // Count subscriptions by type
      for (const [type, connections] of this.subscriptions.entries()) {
        stats.subscriptionsByType[type] = connections.size;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      throw error;
    }
  }

  async getConnectedClients() {
    try {
      return Array.from(this.connections.values()).map(connection => ({
        id: connection.id,
        userId: connection.userId,
        subscriptions: Array.from(connection.subscriptions),
        rooms: Array.from(connection.rooms),
        connectedAt: connection.connectedAt,
        lastActivity: connection.lastActivity,
        ip: connection.ip,
        userAgent: connection.userAgent
      }));
    } catch (error) {
      logger.error('Error getting connected clients:', error);
      throw error;
    }
  }

  async getRooms() {
    try {
      const rooms = {};
      
      for (const [roomName, connections] of this.rooms.entries()) {
        rooms[roomName] = {
          name: roomName,
          connectionCount: connections.size,
          connections: Array.from(connections)
        };
      }
      
      return rooms;
    } catch (error) {
      logger.error('Error getting rooms:', error);
      throw error;
    }
  }

  async disconnectClient(connectionId) {
    try {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.disconnect();
      }
    } catch (error) {
      logger.error(`Error disconnecting client ${connectionId}:`, error);
      throw error;
    }
  }

  async disconnectUser(userId) {
    try {
      let disconnectedCount = 0;
      
      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.userId === userId) {
          connection.socket.disconnect();
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

module.exports = WebSocketManager;
