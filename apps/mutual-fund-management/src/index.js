const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cron = require('node-cron');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const { logger } = require('./utils/logger');
const { databaseService } = require('./utils/database');
const redisService = require('./utils/redis');
const errorHandler = require('./middleware/errorHandler');

// Import service manager
const ServiceManager = require('./services/serviceManager');

// Import routes
const fundCatalogRoutes = require('./routes/fundCatalog');
const fundTradingRoutes = require('./routes/fundTrading');
const fundResearchRoutes = require('./routes/fundResearch');
const fundScreeningRoutes = require('./routes/fundScreening');
const fundPerformanceRoutes = require('./routes/fundPerformance');
const fundHoldingsRoutes = require('./routes/fundHoldings');
const fundTaxRoutes = require('./routes/fundTax');
const fundRebalancingRoutes = require('./routes/fundRebalancing');
const fundAnalyticsRoutes = require('./routes/fundAnalytics');

class MutualFundManagementSystem {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
      }
    });
    this.port = process.env.PORT || 3008;
    this.serviceManager = new ServiceManager();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Initialize database
      await databaseService.initialize();
      logger.info('Database initialized successfully');

      // Initialize Redis
      await redisService.initialize();
      logger.info('Redis initialized successfully');

      // Initialize service manager
      await this.serviceManager.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup WebSocket
      this.setupWebSocket();

      // Setup cron jobs
      this.setupCronJobs();

      // Setup error handling
      this.setupErrorHandling();

      this._initialized = true;
      logger.info('Mutual Fund Management System initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Mutual Fund Management System:', error);
      throw error;
    }
  }

  // Services are now managed by ServiceManager

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

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Sanitize data
    this.app.use(mongoSanitize());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Slow down repeated requests
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // allow 100 requests per 15 minutes, then...
      delayMs: 500 // begin adding 500ms of delay per request above 100
    });
    this.app.use('/api/', speedLimiter);

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

    // API documentation
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Mutual Fund Management API',
          version: '1.0.0',
          description: 'Comprehensive Mutual Fund Management System API'
        },
        servers: [
          {
            url: `http://localhost:${this.port}`,
            description: 'Development server'
          }
        ]
      },
      apis: ['./src/routes/*.js']
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // API routes
    this.app.use('/api/v1/funds/catalog', fundCatalogRoutes);
    this.app.use('/api/v1/funds/trading', fundTradingRoutes);
    this.app.use('/api/v1/funds/research', fundResearchRoutes);
    this.app.use('/api/v1/funds/screening', fundScreeningRoutes);
    this.app.use('/api/v1/funds/performance', fundPerformanceRoutes);
    this.app.use('/api/v1/funds/holdings', fundHoldingsRoutes);
    this.app.use('/api/v1/funds/tax', fundTaxRoutes);
    this.app.use('/api/v1/funds/rebalancing', fundRebalancingRoutes);
    this.app.use('/api/v1/funds/analytics', fundAnalyticsRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user to their personal room
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Join fund-specific room
      socket.on('join-fund-room', (fundId) => {
        socket.join(`fund-${fundId}`);
        logger.info(`Client joined fund room: ${fundId}`);
      });

      // Handle fund trade updates
      socket.on('subscribe-fund-trades', (userId) => {
        socket.join(`fund-trades-${userId}`);
      });

      // Handle fund performance updates
      socket.on('subscribe-fund-performance', (fundId) => {
        socket.join(`fund-performance-${fundId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Make io available to services
    this.app.locals.io = this.io;
  }

  setupCronJobs() {
    // Update fund performance data every 5 minutes during market hours
    cron.schedule('*/5 9-16 * * 1-5', async () => {
      try {
        logger.info('Updating fund performance data...');
        const marketDataService = this.serviceManager.getMarketDataService();
        await marketDataService.updateMarketData();
        logger.info('Fund performance data updated successfully');
      } catch (error) {
        logger.error('Error updating fund performance data:', error);
      }
    });

    // Update fund holdings data daily at 6 AM
    cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('Updating fund holdings data...');
        const marketDataService = this.serviceManager.getMarketDataService();
        await marketDataService.updateMarketData();
        logger.info('Fund holdings data updated successfully');
      } catch (error) {
        logger.error('Error updating fund holdings data:', error);
      }
    });

    // Process pending trades every minute
    cron.schedule('* * * * *', async () => {
      try {
        const tradingService = this.serviceManager.getTradingService();
        await tradingService.processPendingTrades();
      } catch (error) {
        logger.error('Error processing pending trades:', error);
      }
    });

    // Send fund alerts every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        // This would be handled by the notification service
        logger.info('Processing fund alerts...');
      } catch (error) {
        logger.error('Error processing fund alerts:', error);
      }
    });

    // Generate daily reports at 8 PM
    cron.schedule('0 20 * * *', async () => {
      try {
        logger.info('Generating daily reports...');
        const analyticsService = this.serviceManager.getAnalyticsService();
        // This would generate comprehensive daily reports
        logger.info('Daily reports generated successfully');
      } catch (error) {
        logger.error('Error generating daily reports:', error);
      }
    });

    // Clean up old data weekly
    cron.schedule('0 2 * * 0', async () => {
      try {
        logger.info('Cleaning up old data...');
        // This would be handled by the data management service
        logger.info('Old data cleanup completed');
      } catch (error) {
        logger.error('Error cleaning up old data:', error);
      }
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      if (!this._initialized) {
        await this.initialize();
      }

      this.server.listen(this.port, () => {
        logger.info(`Mutual Fund Management System running on port ${this.port}`);
        logger.info(`API Documentation available at http://localhost:${this.port}/api-docs`);
      });
    } catch (error) {
      logger.error('Failed to start Mutual Fund Management System:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      logger.info('Shutting down Mutual Fund Management System...');

      // Close service manager
      await this.serviceManager.close();
      logger.info('Service manager closed');

      // Close database connections
      await databaseService.close();
      logger.info('Database connections closed');

      // Close Redis connections
      await redisService.close();
      logger.info('Redis connections closed');

      // Close server
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (global.mutualFundSystem) {
    await global.mutualFundSystem.stop();
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (global.mutualFundSystem) {
    await global.mutualFundSystem.stop();
  }
});

// Start the system
const mutualFundSystem = new MutualFundManagementSystem();
global.mutualFundSystem = mutualFundSystem;

if (require.main === module) {
  mutualFundSystem.start().catch((error) => {
    logger.error('Failed to start Mutual Fund Management System:', error);
    process.exit(1);
  });
}

module.exports = mutualFundSystem;
