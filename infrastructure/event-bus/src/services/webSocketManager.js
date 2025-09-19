const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      logger.info('New WebSocket connection:', { clientId, ip: req.socket.remoteAddress });
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info('WebSocket connection closed:', { clientId });
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to Event Bus service'
      }));
    });
  }

  handleMessage(clientId, data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'subscribe':
        this.handleSubscribe(clientId, payload);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, payload);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        logger.warn('Unknown message type:', type);
    }
  }

  handleSubscribe(clientId, payload) {
    const { serviceName, eventTypes } = payload;
    
    // Store subscription info
    const client = this.clients.get(clientId);
    if (client) {
      client.serviceName = serviceName;
      client.eventTypes = eventTypes || [];
      
      this.sendToClient(clientId, {
        type: 'subscribed',
        serviceName,
        eventTypes: client.eventTypes
      });
    }
  }

  handleUnsubscribe(clientId, payload) {
    const client = this.clients.get(clientId);
    if (client) {
      client.eventTypes = [];
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        message: 'All subscriptions removed'
      });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcastToService(serviceName, message) {
    this.clients.forEach((client, clientId) => {
      if (client.serviceName === serviceName && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  broadcastEventUpdate(update) {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(update));
      }
    });
  }

  generateClientId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getConnectedClients() {
    return Array.from(this.clients.keys());
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new WebSocketManager();