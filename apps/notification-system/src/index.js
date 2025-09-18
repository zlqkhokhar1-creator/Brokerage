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
const NotificationEngine = require('./services/notificationEngine');
const DeliveryOptimizer = require('./services/deliveryOptimizer');
const PersonalizationEngine = require('./services/personalizationEngine');
const ChannelManager = require('./services/channelManager');
const TemplateEngine = require('./services/templateEngine');
const AnalyticsEngine = require('./services/analyticsEngine');
const ABTestingEngine = require('./services/abTestingEngine');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class NotificationSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5016;
    
    // Core services
    this.notificationEngine = new NotificationEngine();
    this.deliveryOptimizer = new DeliveryOptimizer();
    this.personalizationEngine = new PersonalizationEngine();
    this.channelManager = new ChannelManager();
    this.templateEngine = new TemplateEngine();
    this.analyticsEngine = new AnalyticsEngine();
    this.abTestingEngine = new ABTestingEngine();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Notification state
    this.isInitialized = false;
    this.activeNotifications = new Map();
    this.notificationTemplates = new Map();
    this.deliveryQueues = new Map();
    this.userPreferences = new Map();
    
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
        activeNotifications: this.activeNotifications.size,
        notificationTemplates: this.notificationTemplates.size,
        deliveryQueues: this.deliveryQueues.size,
        userPreferences: this.userPreferences.size
      });
    });

    // Notification sending endpoints
    this.app.post('/api/v1/notifications/send',
      authenticateToken,
      validateRequest('notificationSending'),
      async (req, res) => {
        try {
          const { recipients, message, channels, priority, schedule } = req.body;
          const notification = await this.notificationEngine.sendNotification(
            recipients, message, channels, priority, schedule, req.user.id
          );
          
          res.json({
            success: true,
            data: notification
          });
        } catch (error) {
          logger.error('Error sending notification:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to send notification'
          });
        }
      }
    );

    this.app.get('/api/v1/notifications/:notificationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { notificationId } = req.params;
          const notification = await this.notificationEngine.getNotification(
            notificationId, req.user.id
          );
          
          res.json({
            success: true,
            data: notification
          });
        } catch (error) {
          logger.error('Error getting notification:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get notification'
          });
        }
      }
    );

    this.app.get('/api/v1/notifications',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, channel, limit = 100 } = req.query;
          const notifications = await this.notificationEngine.getNotifications(
            req.user.id, status, channel, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: notifications
          });
        } catch (error) {
          logger.error('Error getting notifications:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get notifications'
          });
        }
      }
    );

    // Template management endpoints
    this.app.post('/api/v1/templates',
      authenticateToken,
      validateRequest('templateCreation'),
      async (req, res) => {
        try {
          const { name, content, variables, channels } = req.body;
          const template = await this.templateEngine.createTemplate(
            name, content, variables, channels, req.user.id
          );
          
          res.json({
            success: true,
            data: template
          });
        } catch (error) {
          logger.error('Error creating template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create template'
          });
        }
      }
    );

    this.app.get('/api/v1/templates/:templateId',
      authenticateToken,
      async (req, res) => {
        try {
          const { templateId } = req.params;
          const template = await this.templateEngine.getTemplate(
            templateId, req.user.id
          );
          
          res.json({
            success: true,
            data: template
          });
        } catch (error) {
          logger.error('Error getting template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get template'
          });
        }
      }
    );

    // Channel management endpoints
    this.app.get('/api/v1/channels',
      authenticateToken,
      async (req, res) => {
        try {
          const channels = await this.channelManager.getChannels(req.user.id);
          
          res.json({
            success: true,
            data: channels
          });
        } catch (error) {
          logger.error('Error getting channels:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get channels'
          });
        }
      }
    );

    this.app.post('/api/v1/channels/:channelId/test',
      authenticateToken,
      validateRequest('channelTest'),
      async (req, res) => {
        try {
          const { channelId } = req.params;
          const { testData } = req.body;
          const result = await this.channelManager.testChannel(
            channelId, testData, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error testing channel:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to test channel'
          });
        }
      }
    );

    // Personalization endpoints
    this.app.post('/api/v1/personalization/analyze',
      authenticateToken,
      validateRequest('personalizationAnalysis'),
      async (req, res) => {
        try {
          const { userId, behaviorData, preferences } = req.body;
          const analysis = await this.personalizationEngine.analyzeUser(
            userId, behaviorData, preferences, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing personalization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze personalization'
          });
        }
      }
    );

    this.app.get('/api/v1/personalization/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const personalization = await this.personalizationEngine.getPersonalization(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: personalization
          });
        } catch (error) {
          logger.error('Error getting personalization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get personalization'
          });
        }
      }
    );

    // Delivery optimization endpoints
    this.app.post('/api/v1/delivery/optimize',
      authenticateToken,
      validateRequest('deliveryOptimization'),
      async (req, res) => {
        try {
          const { notificationId, optimizationType, parameters } = req.body;
          const result = await this.deliveryOptimizer.optimizeDelivery(
            notificationId, optimizationType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error optimizing delivery:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to optimize delivery'
          });
        }
      }
    );

    this.app.get('/api/v1/delivery/status/:notificationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { notificationId } = req.params;
          const status = await this.deliveryOptimizer.getDeliveryStatus(
            notificationId, req.user.id
          );
          
          res.json({
            success: true,
            data: status
          });
        } catch (error) {
          logger.error('Error getting delivery status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get delivery status'
          });
        }
      }
    );

    // Analytics endpoints
    this.app.get('/api/v1/analytics/metrics',
      authenticateToken,
      async (req, res) => {
        try {
          const { timeRange, metricType, channel } = req.query;
          const metrics = await this.analyticsEngine.getMetrics(
            timeRange, metricType, channel, req.user.id
          );
          
          res.json({
            success: true,
            data: metrics
          });
        } catch (error) {
          logger.error('Error getting analytics metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get analytics metrics'
          });
        }
      }
    );

    this.app.get('/api/v1/analytics/reports',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportType, timeRange, format } = req.query;
          const report = await this.analyticsEngine.generateReport(
            reportType, timeRange, format, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error generating analytics report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate analytics report'
          });
        }
      }
    );

    // A/B testing endpoints
    this.app.post('/api/v1/ab-tests',
      authenticateToken,
      validateRequest('abTestCreation'),
      async (req, res) => {
        try {
          const { name, variants, trafficSplit, duration } = req.body;
          const test = await this.abTestingEngine.createTest(
            name, variants, trafficSplit, duration, req.user.id
          );
          
          res.json({
            success: true,
            data: test
          });
        } catch (error) {
          logger.error('Error creating A/B test:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create A/B test'
          });
        }
      }
    );

    this.app.get('/api/v1/ab-tests/:testId',
      authenticateToken,
      async (req, res) => {
        try {
          const { testId } = req.params;
          const test = await this.abTestingEngine.getTest(
            testId, req.user.id
          );
          
          res.json({
            success: true,
            data: test
          });
        } catch (error) {
          logger.error('Error getting A/B test:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get A/B test'
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
      logger.info('Client connected to notification system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, userId, channel } = data;
          await this.webSocketManager.subscribe(socket.id, type, { userId, channel });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from notification system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Process delivery queues every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.processDeliveryQueues();
        logger.info('Delivery queues processed');
      } catch (error) {
        logger.error('Failed to process delivery queues:', error);
      }
    });

    // Optimize delivery every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.optimizeDelivery();
        logger.info('Delivery optimization completed');
      } catch (error) {
        logger.error('Failed to optimize delivery:', error);
      }
    });

    // Update analytics every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.updateAnalytics();
        logger.info('Analytics updated');
      } catch (error) {
        logger.error('Failed to update analytics:', error);
      }
    });
  }

  setupEventHandlers() {
    // Notification events
    this.notificationEngine.on('notificationSent', (notification) => {
      this.activeNotifications.set(notification.id, notification);
      this.emit('notificationSent', notification);
    });

    this.notificationEngine.on('notificationDelivered', (notification) => {
      this.emit('notificationDelivered', notification);
    });

    // Template events
    this.templateEngine.on('templateCreated', (template) => {
      this.notificationTemplates.set(template.id, template);
      this.emit('templateCreated', template);
    });

    // Delivery events
    this.deliveryOptimizer.on('deliveryOptimized', (result) => {
      this.emit('deliveryOptimized', result);
    });
  }

  async processDeliveryQueues() {
    try {
      await this.deliveryOptimizer.processAllQueues();
    } catch (error) {
      logger.error('Error processing delivery queues:', error);
    }
  }

  async optimizeDelivery() {
    try {
      await this.deliveryOptimizer.optimizeAllDeliveries();
    } catch (error) {
      logger.error('Error optimizing delivery:', error);
    }
  }

  async updateAnalytics() {
    try {
      await this.analyticsEngine.updateAllMetrics();
    } catch (error) {
      logger.error('Error updating analytics:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.notificationEngine.initialize();
      await this.deliveryOptimizer.initialize();
      await this.personalizationEngine.initialize();
      await this.channelManager.initialize();
      await this.templateEngine.initialize();
      await this.analyticsEngine.initialize();
      await this.abTestingEngine.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Notification System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Notification System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Notification System...');
    
    // Close services
    await this.notificationEngine.close();
    await this.deliveryOptimizer.close();
    await this.personalizationEngine.close();
    await this.channelManager.close();
    await this.templateEngine.close();
    await this.analyticsEngine.close();
    await this.abTestingEngine.close();
    
    this.server.close(() => {
      logger.info('Notification System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new NotificationSystem();
  system.start();
}

module.exports = NotificationSystem;
