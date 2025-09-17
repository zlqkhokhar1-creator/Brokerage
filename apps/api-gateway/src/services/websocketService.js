const { logger } = require('./logger');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.marketDataInterval = null;
    this.connectedClients = new Map();
  }

  // Initialize WebSocket service
  initialize() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Start market data broadcasting
    this.startMarketDataBroadcast();
  }

  handleConnection(socket) {
    logger.info('WebSocket client connected:', socket.id);
    
    this.connectedClients.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      subscribedSymbols: new Set(),
      userId: null
    });

    // Handle user authentication
    socket.on('authenticate', (data) => {
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.userId = data.userId;
        socket.join(`user-${data.userId}`);
        logger.info(`User ${data.userId} authenticated via WebSocket`);
      }
    });

    // Handle symbol subscriptions
    socket.on('subscribe-symbol', (symbol) => {
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.subscribedSymbols.add(symbol);
        socket.join(`symbol-${symbol}`);
        logger.info(`Client ${socket.id} subscribed to ${symbol}`);
      }
    });

    socket.on('unsubscribe-symbol', (symbol) => {
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.subscribedSymbols.delete(symbol);
        socket.leave(`symbol-${symbol}`);
        logger.info(`Client ${socket.id} unsubscribed from ${symbol}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected:', socket.id);
      this.connectedClients.delete(socket.id);
    });
  }

  // Start broadcasting market data
  startMarketDataBroadcast() {
    this.marketDataInterval = setInterval(() => {
      this.broadcastMarketData();
    }, 1000); // Update every second
  }

  // Generate mock market data
  generateMarketData() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
    const marketData = {};

    symbols.forEach(symbol => {
      const basePrice = this.getBasePrice(symbol);
      const change = (Math.random() - 0.5) * 2;
      const newPrice = Math.max(0.01, basePrice + change);
      const changePercent = (change / basePrice) * 100;

      marketData[symbol] = {
        symbol,
        price: parseFloat(newPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        timestamp: new Date().toISOString()
      };
    });

    return marketData;
  }

  getBasePrice(symbol) {
    const basePrices = {
      'AAPL': 175.43,
      'MSFT': 335.89,
      'GOOGL': 142.56,
      'AMZN': 158.23,
      'TSLA': 245.67,
      'NVDA': 432.12,
      'META': 298.45,
      'NFLX': 456.78
    };
    return basePrices[symbol] || 100;
  }

  // Broadcast market data to all connected clients
  broadcastMarketData() {
    const marketData = this.generateMarketData();
    
    // Broadcast to all clients in market-data room
    this.io.to('market-data').emit('market-data-update', marketData);
    
    // Broadcast to clients subscribed to specific symbols
    Object.keys(marketData).forEach(symbol => {
      this.io.to(`symbol-${symbol}`).emit('symbol-update', marketData[symbol]);
    });
  }

  // Send notification to specific user
  sendUserNotification(userId, notification) {
    this.io.to(`user-${userId}`).emit('notification', notification);
    logger.info(`Notification sent to user ${userId}:`, notification.title);
  }

  // Send trade update to user
  sendTradeUpdate(userId, tradeData) {
    this.io.to(`user-${userId}`).emit('trade-update', tradeData);
    logger.info(`Trade update sent to user ${userId}:`, tradeData.symbol);
  }

  // Send order book update
  sendOrderBookUpdate(symbol, orderBookData) {
    this.io.to(`symbol-${symbol}`).emit('orderbook-update', orderBookData);
  }

  // Send portfolio update
  sendPortfolioUpdate(userId, portfolioData) {
    this.io.to(`user-${userId}`).emit('portfolio-update', portfolioData);
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  // Get clients subscribed to a symbol
  getSymbolSubscribers(symbol) {
    const subscribers = [];
    this.connectedClients.forEach((client, socketId) => {
      if (client.subscribedSymbols.has(symbol)) {
        subscribers.push(socketId);
      }
    });
    return subscribers;
  }

  // Stop the service
  stop() {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
      this.marketDataInterval = null;
    }
    logger.info('WebSocket service stopped');
  }
}

module.exports = WebSocketService;
