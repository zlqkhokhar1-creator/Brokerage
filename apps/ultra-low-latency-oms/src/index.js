const cluster = require('cluster');
const os = require('os');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Redis = require('ioredis');
const { performance } = require('perf_hooks');
const { nanoid } = require('nanoid');
const msgpack = require('msgpack-lite');
const snappy = require('snappy');
const { logger } = require('./utils/logger');
const { connectDatabase } = require('./services/database');
const OrderProcessor = require('./services/orderProcessor');
const MarketDataFeed = require('./services/marketDataFeed');
const RiskEngine = require('./services/riskEngine');
const ExecutionEngine = require('./services/executionEngine');
const LatencyMonitor = require('./services/latencyMonitor');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class UltraLowLatencyOMS {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.port = process.env.PORT || 5005;
    this.workerCount = process.env.WORKER_COUNT || os.cpus().length;
    
    // Core services
    this.orderProcessor = new OrderProcessor();
    this.marketDataFeed = new MarketDataFeed();
    this.riskEngine = new RiskEngine();
    this.executionEngine = new ExecutionEngine();
    this.latencyMonitor = new LatencyMonitor();
    
    // Performance tracking
    this.metrics = {
      ordersProcessed: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      errors: 0
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupPerformanceMonitoring();
  }

  setupMiddleware() {
    // Minimal middleware for maximum performance
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // Request timing middleware
    this.app.use((req, res, next) => {
      req.startTime = performance.now();
      next();
    });
    
    // Response timing middleware
    this.app.use((req, res, next) => {
      const originalSend = res.send;
      res.send = function(data) {
        const latency = performance.now() - req.startTime;
        res.setHeader('X-Response-Time', `${latency.toFixed(3)}ms`);
        return originalSend.call(this, data);
      };
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: this.metrics,
        worker: cluster.worker ? cluster.worker.id : 'master'
      });
    });

    // Order placement endpoint
    this.app.post('/api/v1/orders',
      authenticateToken,
      validateRequest('orderPlacement'),
      async (req, res) => {
        const startTime = performance.now();
        
        try {
          const order = await this.processOrder(req.body, req.user);
          const latency = performance.now() - startTime;
          
          this.updateMetrics(latency);
          
          res.json({
            success: true,
            orderId: order.id,
            status: order.status,
            latency: `${latency.toFixed(3)}ms`
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          this.updateMetrics(latency, true);
          
          logger.error('Order processing failed:', error);
          res.status(400).json({
            success: false,
            error: error.message,
            latency: `${latency.toFixed(3)}ms`
          });
        }
      }
    );

    // Order modification endpoint
    this.app.put('/api/v1/orders/:orderId',
      authenticateToken,
      validateRequest('orderModification'),
      async (req, res) => {
        const startTime = performance.now();
        
        try {
          const { orderId } = req.params;
          const order = await this.modifyOrder(orderId, req.body, req.user);
          const latency = performance.now() - startTime;
          
          this.updateMetrics(latency);
          
          res.json({
            success: true,
            orderId: order.id,
            status: order.status,
            latency: `${latency.toFixed(3)}ms`
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          this.updateMetrics(latency, true);
          
          logger.error('Order modification failed:', error);
          res.status(400).json({
            success: false,
            error: error.message,
            latency: `${latency.toFixed(3)}ms`
          });
        }
      }
    );

    // Order cancellation endpoint
    this.app.delete('/api/v1/orders/:orderId',
      authenticateToken,
      async (req, res) => {
        const startTime = performance.now();
        
        try {
          const { orderId } = req.params;
          const order = await this.cancelOrder(orderId, req.user);
          const latency = performance.now() - startTime;
          
          this.updateMetrics(latency);
          
          res.json({
            success: true,
            orderId: order.id,
            status: order.status,
            latency: `${latency.toFixed(3)}ms`
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          this.updateMetrics(latency, true);
          
          logger.error('Order cancellation failed:', error);
          res.status(400).json({
            success: false,
            error: error.message,
            latency: `${latency.toFixed(3)}ms`
          });
        }
      }
    );

    // Order status endpoint
    this.app.get('/api/v1/orders/:orderId',
      authenticateToken,
      async (req, res) => {
        const startTime = performance.now();
        
        try {
          const { orderId } = req.params;
          const order = await this.getOrderStatus(orderId, req.user);
          const latency = performance.now() - startTime;
          
          this.updateMetrics(latency);
          
          res.json({
            success: true,
            order: order,
            latency: `${latency.toFixed(3)}ms`
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          this.updateMetrics(latency, true);
          
          logger.error('Order status retrieval failed:', error);
          res.status(400).json({
            success: false,
            error: error.message,
            latency: `${latency.toFixed(3)}ms`
          });
        }
      }
    );

    // Market data endpoint
    this.app.get('/api/v1/market-data/:symbol',
      authenticateToken,
      async (req, res) => {
        const startTime = performance.now();
        
        try {
          const { symbol } = req.params;
          const marketData = await this.getMarketData(symbol);
          const latency = performance.now() - startTime;
          
          this.updateMetrics(latency);
          
          res.json({
            success: true,
            symbol: symbol,
            data: marketData,
            latency: `${latency.toFixed(3)}ms`
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          this.updateMetrics(latency, true);
          
          logger.error('Market data retrieval failed:', error);
          res.status(400).json({
            success: false,
            error: error.message,
            latency: `${latency.toFixed(3)}ms`
          });
        }
      }
    );

    // Performance metrics endpoint
    this.app.get('/api/v1/metrics', (req, res) => {
      res.json({
        success: true,
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      logger.info('WebSocket client connected', {
        ip: req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });

      // Set up message handling
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message handling failed:', error);
          ws.send(JSON.stringify({
            success: false,
            error: 'Invalid message format'
          }));
        }
      });

      // Set up close handling
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });

      // Set up error handling
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }

  setupPerformanceMonitoring() {
    // Monitor performance every second
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 1000);

    // Reset metrics every minute
    setInterval(() => {
      this.resetMetrics();
    }, 60000);
  }

  async processOrder(orderData, user) {
    const startTime = performance.now();
    
    try {
      // Generate order ID
      const orderId = nanoid();
      
      // Create order object
      const order = {
        id: orderId,
        userId: user.id,
        symbol: orderData.symbol,
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        orderType: orderData.orderType,
        timeInForce: orderData.timeInForce || 'GTC',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Risk check
      const riskCheck = await this.riskEngine.checkOrder(order, user);
      if (!riskCheck.approved) {
        throw new Error(`Risk check failed: ${riskCheck.reason}`);
      }

      // Process order
      const processedOrder = await this.orderProcessor.processOrder(order);
      
      // Execute order if market order
      if (order.orderType === 'market') {
        await this.executionEngine.executeOrder(processedOrder);
      }

      const latency = performance.now() - startTime;
      logger.info('Order processed', {
        orderId: order.id,
        symbol: order.symbol,
        latency: `${latency.toFixed(3)}ms`
      });

      return processedOrder;

    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order processing failed', {
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async modifyOrder(orderId, modificationData, user) {
    const startTime = performance.now();
    
    try {
      // Get existing order
      const existingOrder = await this.orderProcessor.getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      if (existingOrder.userId !== user.id) {
        throw new Error('Unauthorized');
      }

      if (existingOrder.status !== 'pending') {
        throw new Error('Order cannot be modified');
      }

      // Apply modifications
      const modifiedOrder = {
        ...existingOrder,
        ...modificationData,
        updatedAt: new Date().toISOString()
      };

      // Risk check
      const riskCheck = await this.riskEngine.checkOrder(modifiedOrder, user);
      if (!riskCheck.approved) {
        throw new Error(`Risk check failed: ${riskCheck.reason}`);
      }

      // Update order
      const updatedOrder = await this.orderProcessor.updateOrder(modifiedOrder);

      const latency = performance.now() - startTime;
      logger.info('Order modified', {
        orderId: order.id,
        latency: `${latency.toFixed(3)}ms`
      });

      return updatedOrder;

    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order modification failed', {
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async cancelOrder(orderId, user) {
    const startTime = performance.now();
    
    try {
      // Get existing order
      const existingOrder = await this.orderProcessor.getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      if (existingOrder.userId !== user.id) {
        throw new Error('Unauthorized');
      }

      if (existingOrder.status !== 'pending') {
        throw new Error('Order cannot be cancelled');
      }

      // Cancel order
      const cancelledOrder = await this.orderProcessor.cancelOrder(orderId);

      const latency = performance.now() - startTime;
      logger.info('Order cancelled', {
        orderId: order.id,
        latency: `${latency.toFixed(3)}ms`
      });

      return cancelledOrder;

    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order cancellation failed', {
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async getOrderStatus(orderId, user) {
    const startTime = performance.now();
    
    try {
      const order = await this.orderProcessor.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId !== user.id) {
        throw new Error('Unauthorized');
      }

      const latency = performance.now() - startTime;
      logger.info('Order status retrieved', {
        orderId: order.id,
        latency: `${latency.toFixed(3)}ms`
      });

      return order;

    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order status retrieval failed', {
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async getMarketData(symbol) {
    const startTime = performance.now();
    
    try {
      const marketData = await this.marketDataFeed.getMarketData(symbol);
      
      const latency = performance.now() - startTime;
      logger.info('Market data retrieved', {
        symbol: symbol,
        latency: `${latency.toFixed(3)}ms`
      });

      return marketData;

    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Market data retrieval failed', {
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async handleWebSocketMessage(ws, data) {
    try {
      switch (data.type) {
        case 'subscribe':
          await this.handleSubscription(ws, data);
          break;
        case 'unsubscribe':
          await this.handleUnsubscription(ws, data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          ws.send(JSON.stringify({
            success: false,
            error: 'Unknown message type'
          }));
      }
    } catch (error) {
      logger.error('WebSocket message handling failed:', error);
      ws.send(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  async handleSubscription(ws, data) {
    // Subscribe to market data updates
    const { symbols } = data;
    if (symbols && Array.isArray(symbols)) {
      ws.symbols = symbols;
      ws.send(JSON.stringify({
        success: true,
        message: 'Subscribed to market data',
        symbols: symbols
      }));
    }
  }

  async handleUnsubscription(ws, data) {
    // Unsubscribe from market data updates
    ws.symbols = [];
    ws.send(JSON.stringify({
      success: true,
      message: 'Unsubscribed from market data'
    }));
  }

  updateMetrics(latency, isError = false) {
    this.metrics.ordersProcessed++;
    
    if (isError) {
      this.metrics.errors++;
    }
    
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.ordersProcessed - 1) + latency) / 
      this.metrics.ordersProcessed;
    
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
  }

  resetMetrics() {
    this.metrics = {
      ordersProcessed: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      errors: 0
    };
  }

  logPerformanceMetrics() {
    if (this.metrics.ordersProcessed > 0) {
      logger.info('Performance metrics', {
        ordersProcessed: this.metrics.ordersProcessed,
        averageLatency: `${this.metrics.averageLatency.toFixed(3)}ms`,
        maxLatency: `${this.metrics.maxLatency.toFixed(3)}ms`,
        minLatency: `${this.metrics.minLatency.toFixed(3)}ms`,
        errorRate: `${(this.metrics.errors / this.metrics.ordersProcessed * 100).toFixed(2)}%`
      });
    }
  }

  async start() {
    try {
      // Connect to database
      await connectDatabase();
      
      // Initialize services
      await this.orderProcessor.initialize();
      await this.marketDataFeed.initialize();
      await this.riskEngine.initialize();
      await this.executionEngine.initialize();
      await this.latencyMonitor.initialize();
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Ultra-Low Latency OMS started on port ${this.port}`, {
          port: this.port,
          worker: cluster.worker ? cluster.worker.id : 'master',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Ultra-Low Latency OMS:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Ultra-Low Latency OMS...');
    
    // Close services
    await this.orderProcessor.close();
    await this.marketDataFeed.close();
    await this.riskEngine.close();
    await this.executionEngine.close();
    await this.latencyMonitor.close();
    
    this.server.close(() => {
      logger.info('Ultra-Low Latency OMS shutdown complete');
      process.exit(0);
    });
  }
}

// Cluster setup for multi-core processing
if (cluster.isMaster) {
  logger.info(`Master process ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`, { code, signal });
    cluster.fork(); // Restart worker
  });
  
} else {
  // Worker process
  const oms = new UltraLowLatencyOMS();
  oms.start();
}

module.exports = UltraLowLatencyOMS;
