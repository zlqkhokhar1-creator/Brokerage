const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { logger } = require('./utils/logger');
const { connectRedis } = require('./services/redis');
const { connectDatabase } = require('./services/database');
const SentimentProcessor = require('./services/sentimentProcessor');
const DataCollector = require('./services/dataCollector');
const SentimentAnalyzer = require('./services/sentimentAnalyzer');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class SentimentEngine {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 5002;
    this.sentimentProcessor = new SentimentProcessor();
    this.dataCollector = new DataCollector();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.webSocketManager = new WebSocketManager(this.io);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupCronJobs();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
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
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Sentiment analysis endpoints
    this.app.post('/api/v1/sentiment/analyze', 
      authenticateToken,
      validateRequest('sentimentAnalysis'),
      async (req, res) => {
        try {
          const { text, symbol, source, metadata } = req.body;
          const result = await this.sentimentAnalyzer.analyzeText(text, {
            symbol,
            source,
            metadata,
            userId: req.user?.id
          });
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error analyzing sentiment:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze sentiment'
          });
        }
      }
    );

    // Get sentiment for symbol
    this.app.get('/api/v1/sentiment/symbol/:symbol',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol } = req.params;
          const { timeframe = '1h', limit = 100 } = req.query;
          
          const sentiment = await this.sentimentProcessor.getSymbolSentiment(
            symbol.toUpperCase(),
            timeframe,
            parseInt(limit)
          );
          
          res.json({
            success: true,
            data: sentiment
          });
        } catch (error) {
          logger.error('Error fetching symbol sentiment:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch symbol sentiment'
          });
        }
      }
    );

    // Get market-wide sentiment
    this.app.get('/api/v1/sentiment/market',
      authenticateToken,
      async (req, res) => {
        try {
          const { timeframe = '1h', limit = 100 } = req.query;
          
          const marketSentiment = await this.sentimentProcessor.getMarketSentiment(
            timeframe,
            parseInt(limit)
          );
          
          res.json({
            success: true,
            data: marketSentiment
          });
        } catch (error) {
          logger.error('Error fetching market sentiment:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch market sentiment'
          });
        }
      }
    );

    // Get sentiment trends
    this.app.get('/api/v1/sentiment/trends',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, timeframe = '24h' } = req.query;
          
          const trends = await this.sentimentProcessor.getSentimentTrends(
            symbol,
            timeframe
          );
          
          res.json({
            success: true,
            data: trends
          });
        } catch (error) {
          logger.error('Error fetching sentiment trends:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch sentiment trends'
          });
        }
      }
    );

    // Get sentiment alerts
    this.app.get('/api/v1/sentiment/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, threshold = 0.7 } = req.query;
          
          const alerts = await this.sentimentProcessor.getSentimentAlerts(
            symbol,
            parseFloat(threshold)
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error fetching sentiment alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch sentiment alerts'
          });
        }
      }
    );

    // Subscribe to real-time sentiment updates
    this.app.post('/api/v1/sentiment/subscribe',
      authenticateToken,
      validateRequest('sentimentSubscription'),
      async (req, res) => {
        try {
          const { symbols, userId } = req.body;
          
          await this.webSocketManager.subscribeToSymbols(userId, symbols);
          
          res.json({
            success: true,
            message: 'Successfully subscribed to sentiment updates'
          });
        } catch (error) {
          logger.error('Error subscribing to sentiment updates:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to subscribe to sentiment updates'
          });
        }
      }
    );

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
    this.io.on('connection', (socket) => {
      logger.info('Client connected to sentiment engine', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { symbols, userId } = data;
          await this.webSocketManager.subscribeToSymbols(socket.id, symbols);
          socket.emit('subscribed', { symbols, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { symbols } = data;
          await this.webSocketManager.unsubscribeFromSymbols(socket.id, symbols);
          socket.emit('unsubscribed', { symbols, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from sentiment engine', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Collect data every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.dataCollector.collectAllData();
        logger.info('Data collection completed');
      } catch (error) {
        logger.error('Data collection failed:', error);
      }
    });

    // Process sentiment every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.sentimentProcessor.processPendingData();
        logger.info('Sentiment processing completed');
      } catch (error) {
        logger.error('Sentiment processing failed:', error);
      }
    });

    // Clean up old data every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.sentimentProcessor.cleanupOldData();
        logger.info('Data cleanup completed');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.sentimentProcessor.initialize();
      await this.dataCollector.initialize();
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Sentiment Engine started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Sentiment Engine:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Sentiment Engine...');
    
    this.server.close(() => {
      logger.info('Sentiment Engine shutdown complete');
      process.exit(0);
    });
  }
}

// Start the engine
if (require.main === module) {
  const engine = new SentimentEngine();
  engine.start();
}

module.exports = SentimentEngine;
