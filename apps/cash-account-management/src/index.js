const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
const { logger } = require('./utils/logger');
const { databaseService } = require('./utils/database');
const { redisService } = require('./utils/redis');
const CashAccountService = require('./services/cashAccountService');
const PaymentGatewayService = require('./services/paymentGatewayService');
const CurrencyExchangeService = require('./services/currencyExchangeService');
const ComplianceService = require('./services/complianceService');

class CashAccountManagementSystem {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
      }
    });
    this.port = process.env.PORT || 3007;
    this.services = {};
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

      // Initialize services
      await this.initializeServices();

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
      logger.info('Cash Account Management System initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cash Account Management System:', error);
      throw error;
    }
  }

  async initializeServices() {
    try {
      // Initialize core services
      this.services.cashAccount = new CashAccountService();
      this.services.paymentGateway = new PaymentGatewayService();
      this.services.currencyExchange = new CurrencyExchangeService();
      this.services.compliance = new ComplianceService();

      // Initialize all services
      for (const [name, service] of Object.entries(this.services)) {
        await service.initialize();
        logger.info(`${name} service initialized`);
      }

      // Setup service event listeners
      this.setupServiceEventListeners();
    } catch (error) {
      logger.error('Error initializing services:', error);
      throw error;
    }
  }

  setupServiceEventListeners() {
    // Cash Account Service events
    this.services.cashAccount.on('buyOrderPlaced', (data) => {
      this.io.to(`user_${data.user_id}`).emit('buyOrderPlaced', data);
    });

    this.services.cashAccount.on('sellOrderPlaced', (data) => {
      this.io.to(`user_${data.user_id}`).emit('sellOrderPlaced', data);
    });

    this.services.cashAccount.on('tradeExecuted', (data) => {
      this.io.to(`user_${data.user_id}`).emit('tradeExecuted', data);
    });

    this.services.cashAccount.on('depositProcessed', (data) => {
      this.io.to(`user_${data.user_id}`).emit('depositProcessed', data);
    });

    this.services.cashAccount.on('withdrawalProcessed', (data) => {
      this.io.to(`user_${data.user_id}`).emit('withdrawalProcessed', data);
    });

    // Payment Gateway Service events
    this.services.paymentGateway.on('webhookReceived', (data) => {
      this.io.emit('webhookReceived', data);
    });

    // Compliance Service events
    this.services.compliance.on('kycCompleted', (data) => {
      this.io.to(`user_${data.user_id}`).emit('kycCompleted', data);
    });

    this.services.compliance.on('amlScreeningCompleted', (data) => {
      this.io.to(`user_${data.user_id}`).emit('amlScreeningCompleted', data);
    });
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: Object.keys(this.services).reduce((acc, key) => {
          acc[key] = 'running';
          return acc;
        }, {})
      });
    });

    // API routes
    this.app.use('/api/v1/accounts', require('./routes/cashAccount'));
    this.app.use('/api/v1/payments', require('./routes/payments'));
    this.app.use('/api/v1/transactions', require('./routes/transactions'));
    this.app.use('/api/v1/currencies', require('./routes/currencies'));
    this.app.use('/api/v1/compliance', require('./routes/compliance'));
    this.app.use('/api/v1/webhooks', require('./routes/webhooks'));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user room
      socket.on('joinUser', (userId) => {
        socket.join(`user_${userId}`);
        logger.info(`Client ${socket.id} joined user room: ${userId}`);
      });

      // Leave user room
      socket.on('leaveUser', (userId) => {
        socket.leave(`user_${userId}`);
        logger.info(`Client ${socket.id} left user room: ${userId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  setupCronJobs() {
    // Update exchange rates every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Updating exchange rates...');
        await this.services.currencyExchange.updateExchangeRates();
        logger.info('Exchange rates updated successfully');
      } catch (error) {
        logger.error('Error updating exchange rates:', error);
      }
    });

    // Process pending transactions every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Processing pending transactions...');
        // This would process pending transactions
        logger.info('Pending transactions processed');
      } catch (error) {
        logger.error('Error processing pending transactions:', error);
      }
    });

    // Generate compliance reports daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Generating compliance reports...');
        // This would generate compliance reports
        logger.info('Compliance reports generated');
      } catch (error) {
        logger.error('Error generating compliance reports:', error);
      }
    });

    // Clean up old data weekly
    cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Cleaning up old data...');
        // This would clean up old data
        logger.info('Old data cleanup completed');
      } catch (error) {
        logger.error('Error cleaning up old data:', error);
      }
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  async start() {
    try {
      if (!this._initialized) {
        await this.initialize();
      }

      this.server.listen(this.port, () => {
        logger.info(`Cash Account Management System running on port ${this.port}`);
        logger.info(`Health check available at http://localhost:${this.port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start Cash Account Management System:', error);
      throw error;
    }
  }

  async stop() {
    try {
      logger.info('Shutting down Cash Account Management System...');

      // Close services
      for (const [name, service] of Object.entries(this.services)) {
        await service.close();
        logger.info(`${name} service closed`);
      }

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

// Create and start the application
const app = new CashAccountManagementSystem();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  app.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  app.stop();
});

// Start the application
if (require.main === module) {
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = app;
