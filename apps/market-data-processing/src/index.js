const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { EventEmitter } = require('events');

const { logger } = require('./utils/logger');
const { connectRedis } = require('./services/redis');
const { connectDatabase } = require('./services/database');
const MarketDataIngestionEngine = require('./services/marketDataIngestionEngine');
const TechnicalIndicatorCalculator = require('./services/technicalIndicatorCalculator');
const MarketDataDistributor = require('./services/marketDataDistributor');
const DataQualityMonitor = require('./services/dataQualityMonitor');
const LatencyOptimizer = require('./services/latencyOptimizer');
const MultiSourceAggregator = require('./services/multiSourceAggregator');
const MarketDataCache = require('./services/marketDataCache');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class MarketDataProcessingSystem extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 5012;
    
    // Core services
    this.marketDataIngestionEngine = new MarketDataIngestionEngine();
    this.technicalIndicatorCalculator = new TechnicalIndicatorCalculator();
    this.marketDataDistributor = new MarketDataDistributor();
    this.dataQualityMonitor = new DataQualityMonitor();
    this.latencyOptimizer = new LatencyOptimizer();
    this.multiSourceAggregator = new MultiSourceAggregator();
    this.marketDataCache = new MarketDataCache();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Market data processing state
    this.isInitialized = false;
    this.activeDataStreams = new Map();
    this.technicalIndicators = new Map();
    this.dataQualityMetrics = new Map();
    this.latencyMetrics = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupCronJobs();
    this.setupEventHandlers();
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
        version: process.env.npm_package_version || '1.0.0',
        activeDataStreams: this.activeDataStreams.size,
        technicalIndicators: this.technicalIndicators.size,
        dataQualityMetrics: this.dataQualityMetrics.size,
        latencyMetrics: this.latencyMetrics.size
      });
    });

    // Market data ingestion endpoints
    this.app.post('/api/v1/data/ingest',
      authenticateToken,
      validateRequest('dataIngestion'),
      async (req, res) => {
        try {
          const { symbol, dataType, source, data } = req.body;
          const result = await this.marketDataIngestionEngine.ingestData(
            symbol, dataType, source, data, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error ingesting market data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to ingest market data'
          });
        }
      }
    );

    this.app.get('/api/v1/data/streams',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, dataType, status } = req.query;
          const streams = await this.marketDataIngestionEngine.getDataStreams(
            symbol, dataType, status, req.user.id
          );
          
          res.json({
            success: true,
            data: streams
          });
        } catch (error) {
          logger.error('Error getting data streams:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get data streams'
          });
        }
      }
    );

    this.app.post('/api/v1/data/streams/:streamId/start',
      authenticateToken,
      async (req, res) => {
        try {
          const { streamId } = req.params;
          const result = await this.marketDataIngestionEngine.startDataStream(
            streamId, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error starting data stream:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to start data stream'
          });
        }
      }
    );

    this.app.post('/api/v1/data/streams/:streamId/stop',
      authenticateToken,
      async (req, res) => {
        try {
          const { streamId } = req.params;
          const result = await this.marketDataIngestionEngine.stopDataStream(
            streamId, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error stopping data stream:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to stop data stream'
          });
        }
      }
    );

    // Technical indicators endpoints
    this.app.post('/api/v1/indicators/calculate',
      authenticateToken,
      validateRequest('indicatorCalculation'),
      async (req, res) => {
        try {
          const { symbol, indicatorType, parameters, timeRange } = req.body;
          const result = await this.technicalIndicatorCalculator.calculateIndicator(
            symbol, indicatorType, parameters, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error calculating technical indicator:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate technical indicator'
          });
        }
      }
    );

    this.app.get('/api/v1/indicators/:symbol',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol } = req.params;
          const { indicatorType, timeRange } = req.query;
          const indicators = await this.technicalIndicatorCalculator.getIndicators(
            symbol, indicatorType, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: indicators
          });
        } catch (error) {
          logger.error('Error getting technical indicators:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get technical indicators'
          });
        }
      }
    );

    this.app.get('/api/v1/indicators/available',
      authenticateToken,
      async (req, res) => {
        try {
          const indicators = await this.technicalIndicatorCalculator.getAvailableIndicators();
          
          res.json({
            success: true,
            data: indicators
          });
        } catch (error) {
          logger.error('Error getting available indicators:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get available indicators'
          });
        }
      }
    );

    // Market data distribution endpoints
    this.app.post('/api/v1/distribution/subscribe',
      authenticateToken,
      validateRequest('dataSubscription'),
      async (req, res) => {
        try {
          const { symbols, dataTypes, frequency } = req.body;
          const subscription = await this.marketDataDistributor.subscribe(
            symbols, dataTypes, frequency, req.user.id
          );
          
          res.json({
            success: true,
            data: subscription
          });
        } catch (error) {
          logger.error('Error subscribing to market data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to subscribe to market data'
          });
        }
      }
    );

    this.app.post('/api/v1/distribution/unsubscribe',
      authenticateToken,
      validateRequest('dataUnsubscription'),
      async (req, res) => {
        try {
          const { subscriptionId } = req.body;
          const result = await this.marketDataDistributor.unsubscribe(
            subscriptionId, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error unsubscribing from market data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe from market data'
          });
        }
      }
    );

    this.app.get('/api/v1/distribution/subscriptions',
      authenticateToken,
      async (req, res) => {
        try {
          const subscriptions = await this.marketDataDistributor.getSubscriptions(
            req.user.id
          );
          
          res.json({
            success: true,
            data: subscriptions
          });
        } catch (error) {
          logger.error('Error getting subscriptions:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get subscriptions'
          });
        }
      }
    );

    // Data quality monitoring endpoints
    this.app.get('/api/v1/quality/metrics',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, timeRange } = req.query;
          const metrics = await this.dataQualityMonitor.getQualityMetrics(
            symbol, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: metrics
          });
        } catch (error) {
          logger.error('Error getting data quality metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get data quality metrics'
          });
        }
      }
    );

    this.app.get('/api/v1/quality/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { severity, status, limit = 100 } = req.query;
          const alerts = await this.dataQualityMonitor.getQualityAlerts(
            severity, status, parseInt(limit), req.user.id
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting data quality alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get data quality alerts'
          });
        }
      }
    );

    this.app.post('/api/v1/quality/validate',
      authenticateToken,
      validateRequest('dataValidation'),
      async (req, res) => {
        try {
          const { data, validationRules } = req.body;
          const result = await this.dataQualityMonitor.validateData(
            data, validationRules, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error validating data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to validate data'
          });
        }
      }
    );

    // Latency optimization endpoints
    this.app.get('/api/v1/latency/metrics',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, timeRange } = req.query;
          const metrics = await this.latencyOptimizer.getLatencyMetrics(
            symbol, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: metrics
          });
        } catch (error) {
          logger.error('Error getting latency metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get latency metrics'
          });
        }
      }
    );

    this.app.post('/api/v1/latency/optimize',
      authenticateToken,
      validateRequest('latencyOptimization'),
      async (req, res) => {
        try {
          const { symbol, optimizationType, parameters } = req.body;
          const result = await this.latencyOptimizer.optimizeLatency(
            symbol, optimizationType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error optimizing latency:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to optimize latency'
          });
        }
      }
    );

    // Multi-source aggregation endpoints
    this.app.post('/api/v1/aggregation/aggregate',
      authenticateToken,
      validateRequest('dataAggregation'),
      async (req, res) => {
        try {
          const { symbol, sources, aggregationType, parameters } = req.body;
          const result = await this.multiSourceAggregator.aggregateData(
            symbol, sources, aggregationType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error aggregating data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to aggregate data'
          });
        }
      }
    );

    this.app.get('/api/v1/aggregation/sources',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol, dataType } = req.query;
          const sources = await this.multiSourceAggregator.getAvailableSources(
            symbol, dataType, req.user.id
          );
          
          res.json({
            success: true,
            data: sources
          });
        } catch (error) {
          logger.error('Error getting available sources:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get available sources'
          });
        }
      }
    );

    // Market data cache endpoints
    this.app.get('/api/v1/cache/:symbol',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol } = req.params;
          const { dataType, timeRange } = req.query;
          const data = await this.marketDataCache.getCachedData(
            symbol, dataType, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: data
          });
        } catch (error) {
          logger.error('Error getting cached data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get cached data'
          });
        }
      }
    );

    this.app.post('/api/v1/cache/clear',
      authenticateToken,
      validateRequest('cacheClear'),
      async (req, res) => {
        try {
          const { symbol, dataType, timeRange } = req.body;
          const result = await this.marketDataCache.clearCache(
            symbol, dataType, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error clearing cache:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
          });
        }
      }
    );

    // Market data dashboard endpoints
    this.app.get('/api/v1/dashboard/:symbol',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol } = req.params;
          const { timeRange } = req.query;
          const dashboard = await this.getMarketDataDashboard(
            symbol, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error getting market data dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get market data dashboard'
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
      logger.info('Client connected to market data processing system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, symbol, dataType } = data;
          await this.webSocketManager.subscribe(socket.id, type, { symbol, dataType });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, symbol, dataType } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { symbol, dataType });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from market data processing system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update technical indicators every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.updateTechnicalIndicators();
        logger.info('Technical indicators updated');
      } catch (error) {
        logger.error('Failed to update technical indicators:', error);
      }
    });

    // Monitor data quality every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.monitorDataQuality();
        logger.info('Data quality monitoring completed');
      } catch (error) {
        logger.error('Failed to monitor data quality:', error);
      }
    });

    // Optimize latency every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        await this.optimizeLatency();
        logger.info('Latency optimization completed');
      } catch (error) {
        logger.error('Failed to optimize latency:', error);
      }
    });

    // Clean up old data daily
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old market data cleaned up');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Data stream events
    this.marketDataIngestionEngine.on('dataStreamStarted', (stream) => {
      this.activeDataStreams.set(stream.id, stream);
      this.emit('dataStreamStarted', stream);
    });

    this.marketDataIngestionEngine.on('dataStreamStopped', (stream) => {
      this.activeDataStreams.delete(stream.id);
      this.emit('dataStreamStopped', stream);
    });

    // Technical indicator events
    this.technicalIndicatorCalculator.on('indicatorCalculated', (indicator) => {
      this.technicalIndicators.set(indicator.id, indicator);
      this.emit('indicatorCalculated', indicator);
    });

    // Data quality events
    this.dataQualityMonitor.on('qualityAlert', (alert) => {
      this.emit('qualityAlert', alert);
    });

    // Latency events
    this.latencyOptimizer.on('latencyOptimized', (metrics) => {
      this.latencyMetrics.set(metrics.id, metrics);
      this.emit('latencyOptimized', metrics);
    });
  }

  async updateTechnicalIndicators() {
    try {
      // Update technical indicators for all active symbols
      const activeSymbols = await this.getActiveSymbols();
      
      for (const symbol of activeSymbols) {
        try {
          await this.technicalIndicatorCalculator.updateIndicators(symbol);
        } catch (error) {
          logger.error(`Error updating indicators for ${symbol}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating technical indicators:', error);
    }
  }

  async monitorDataQuality() {
    try {
      // Monitor data quality for all active data streams
      for (const [streamId, stream] of this.activeDataStreams) {
        try {
          await this.dataQualityMonitor.monitorStream(streamId);
        } catch (error) {
          logger.error(`Error monitoring stream ${streamId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error monitoring data quality:', error);
    }
  }

  async optimizeLatency() {
    try {
      // Optimize latency for all active symbols
      const activeSymbols = await this.getActiveSymbols();
      
      for (const symbol of activeSymbols) {
        try {
          await this.latencyOptimizer.optimizeSymbolLatency(symbol);
        } catch (error) {
          logger.error(`Error optimizing latency for ${symbol}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error optimizing latency:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old market data
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      for (const [indicatorId, indicator] of this.technicalIndicators) {
        if (new Date(indicator.createdAt) < cutoff) {
          this.technicalIndicators.delete(indicatorId);
        }
      }
      
      for (const [metricId, metric] of this.dataQualityMetrics) {
        if (new Date(metric.timestamp) < cutoff) {
          this.dataQualityMetrics.delete(metricId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async getMarketDataDashboard(symbol, timeRange, userId) {
    try {
      const marketData = await this.marketDataCache.getCachedData(symbol, 'price', timeRange, userId);
      const indicators = await this.technicalIndicatorCalculator.getIndicators(symbol, null, timeRange, userId);
      const qualityMetrics = await this.dataQualityMonitor.getQualityMetrics(symbol, timeRange, userId);
      const latencyMetrics = await this.latencyOptimizer.getLatencyMetrics(symbol, timeRange, userId);
      
      return {
        symbol,
        timeRange,
        marketData,
        indicators,
        qualityMetrics,
        latencyMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting market data dashboard:', error);
      throw error;
    }
  }

  async getActiveSymbols() {
    try {
      // Mock implementation - in production, this would query the database
      return Array.from(this.activeDataStreams.values()).map(stream => stream.symbol);
    } catch (error) {
      logger.error('Error getting active symbols:', error);
      return [];
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.marketDataIngestionEngine.initialize();
      await this.technicalIndicatorCalculator.initialize();
      await this.marketDataDistributor.initialize();
      await this.dataQualityMonitor.initialize();
      await this.latencyOptimizer.initialize();
      await this.multiSourceAggregator.initialize();
      await this.marketDataCache.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Market Data Processing System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Market Data Processing System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Market Data Processing System...');
    
    // Close services
    await this.marketDataIngestionEngine.close();
    await this.technicalIndicatorCalculator.close();
    await this.marketDataDistributor.close();
    await this.dataQualityMonitor.close();
    await this.latencyOptimizer.close();
    await this.multiSourceAggregator.close();
    await this.marketDataCache.close();
    
    this.server.close(() => {
      logger.info('Market Data Processing System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new MarketDataProcessingSystem();
  system.start();
}

module.exports = MarketDataProcessingSystem;
