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
const APIGateway = require('./services/apiGateway');
const WebhookManager = require('./services/webhookManager');
const IntegrationOrchestrator = require('./services/integrationOrchestrator');
const DataTransformer = require('./services/dataTransformer');
const RateLimiter = require('./services/rateLimiter');
const MonitoringService = require('./services/monitoringService');
const PartnerManager = require('./services/partnerManager');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class IntegrationHub extends EventEmitter {
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
    
    this.port = process.env.PORT || 5015;
    
    // Core services
    this.apiGateway = new APIGateway();
    this.webhookManager = new WebhookManager();
    this.integrationOrchestrator = new IntegrationOrchestrator();
    this.dataTransformer = new DataTransformer();
    this.rateLimiter = new RateLimiter();
    this.monitoringService = new MonitoringService();
    this.partnerManager = new PartnerManager();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Integration state
    this.isInitialized = false;
    this.activeIntegrations = new Map();
    this.webhookEndpoints = new Map();
    this.partnerConnections = new Map();
    this.rateLimits = new Map();
    
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
        activeIntegrations: this.activeIntegrations.size,
        webhookEndpoints: this.webhookEndpoints.size,
        partnerConnections: this.partnerConnections.size,
        rateLimits: this.rateLimits.size
      });
    });

    // API Gateway endpoints
    this.app.all('/api/v1/gateway/*',
      authenticateToken,
      async (req, res) => {
        try {
          const result = await this.apiGateway.routeRequest(req, res);
          res.json(result);
        } catch (error) {
          logger.error('Error routing request:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to route request'
          });
        }
      }
    );

    // Webhook management endpoints
    this.app.post('/api/v1/webhooks',
      authenticateToken,
      validateRequest('webhookCreation'),
      async (req, res) => {
        try {
          const { name, url, events, secret, headers } = req.body;
          const webhook = await this.webhookManager.createWebhook(
            name, url, events, secret, headers, req.user.id
          );
          
          res.json({
            success: true,
            data: webhook
          });
        } catch (error) {
          logger.error('Error creating webhook:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create webhook'
          });
        }
      }
    );

    this.app.get('/api/v1/webhooks/:webhookId',
      authenticateToken,
      async (req, res) => {
        try {
          const { webhookId } = req.params;
          const webhook = await this.webhookManager.getWebhook(
            webhookId, req.user.id
          );
          
          res.json({
            success: true,
            data: webhook
          });
        } catch (error) {
          logger.error('Error getting webhook:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get webhook'
          });
        }
      }
    );

    this.app.post('/api/v1/webhooks/:webhookId/test',
      authenticateToken,
      async (req, res) => {
        try {
          const { webhookId } = req.params;
          const { testData } = req.body;
          const result = await this.webhookManager.testWebhook(
            webhookId, testData, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error testing webhook:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to test webhook'
          });
        }
      }
    );

    // Integration orchestration endpoints
    this.app.post('/api/v1/integrations',
      authenticateToken,
      validateRequest('integrationCreation'),
      async (req, res) => {
        try {
          const { name, type, configuration, partners } = req.body;
          const integration = await this.integrationOrchestrator.createIntegration(
            name, type, configuration, partners, req.user.id
          );
          
          res.json({
            success: true,
            data: integration
          });
        } catch (error) {
          logger.error('Error creating integration:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create integration'
          });
        }
      }
    );

    this.app.get('/api/v1/integrations/:integrationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { integrationId } = req.params;
          const integration = await this.integrationOrchestrator.getIntegration(
            integrationId, req.user.id
          );
          
          res.json({
            success: true,
            data: integration
          });
        } catch (error) {
          logger.error('Error getting integration:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get integration'
          });
        }
      }
    );

    this.app.post('/api/v1/integrations/:integrationId/execute',
      authenticateToken,
      validateRequest('integrationExecution'),
      async (req, res) => {
        try {
          const { integrationId } = req.params;
          const { parameters, data } = req.body;
          const result = await this.integrationOrchestrator.executeIntegration(
            integrationId, parameters, data, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error executing integration:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to execute integration'
          });
        }
      }
    );

    // Data transformation endpoints
    this.app.post('/api/v1/transform',
      authenticateToken,
      validateRequest('dataTransformation'),
      async (req, res) => {
        try {
          const { data, transformationType, parameters } = req.body;
          const result = await this.dataTransformer.transformData(
            data, transformationType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error transforming data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to transform data'
          });
        }
      }
    );

    this.app.get('/api/v1/transform/templates',
      authenticateToken,
      async (req, res) => {
        try {
          const templates = await this.dataTransformer.getTemplates(req.user.id);
          
          res.json({
            success: true,
            data: templates
          });
        } catch (error) {
          logger.error('Error getting transformation templates:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get transformation templates'
          });
        }
      }
    );

    // Rate limiting endpoints
    this.app.get('/api/v1/rate-limits',
      authenticateToken,
      async (req, res) => {
        try {
          const { partnerId, endpoint } = req.query;
          const limits = await this.rateLimiter.getRateLimits(
            partnerId, endpoint, req.user.id
          );
          
          res.json({
            success: true,
            data: limits
          });
        } catch (error) {
          logger.error('Error getting rate limits:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get rate limits'
          });
        }
      }
    );

    this.app.post('/api/v1/rate-limits',
      authenticateToken,
      validateRequest('rateLimitCreation'),
      async (req, res) => {
        try {
          const { partnerId, endpoint, limits, window } = req.body;
          const rateLimit = await this.rateLimiter.createRateLimit(
            partnerId, endpoint, limits, window, req.user.id
          );
          
          res.json({
            success: true,
            data: rateLimit
          });
        } catch (error) {
          logger.error('Error creating rate limit:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create rate limit'
          });
        }
      }
    );

    // Monitoring endpoints
    this.app.get('/api/v1/monitoring/metrics',
      authenticateToken,
      async (req, res) => {
        try {
          const { timeRange, metricType } = req.query;
          const metrics = await this.monitoringService.getMetrics(
            timeRange, metricType, req.user.id
          );
          
          res.json({
            success: true,
            data: metrics
          });
        } catch (error) {
          logger.error('Error getting monitoring metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get monitoring metrics'
          });
        }
      }
    );

    this.app.get('/api/v1/monitoring/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { severity, status, limit = 100 } = req.query;
          const alerts = await this.monitoringService.getAlerts(
            severity, status, parseInt(limit), req.user.id
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting monitoring alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get monitoring alerts'
          });
        }
      }
    );

    // Partner management endpoints
    this.app.post('/api/v1/partners',
      authenticateToken,
      validateRequest('partnerCreation'),
      async (req, res) => {
        try {
          const { name, type, configuration, credentials } = req.body;
          const partner = await this.partnerManager.createPartner(
            name, type, configuration, credentials, req.user.id
          );
          
          res.json({
            success: true,
            data: partner
          });
        } catch (error) {
          logger.error('Error creating partner:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create partner'
          });
        }
      }
    );

    this.app.get('/api/v1/partners/:partnerId',
      authenticateToken,
      async (req, res) => {
        try {
          const { partnerId } = req.params;
          const partner = await this.partnerManager.getPartner(
            partnerId, req.user.id
          );
          
          res.json({
            success: true,
            data: partner
          });
        } catch (error) {
          logger.error('Error getting partner:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get partner'
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
      logger.info('Client connected to integration hub', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, integrationId, partnerId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { integrationId, partnerId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from integration hub', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Monitor integrations every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.monitorIntegrations();
        logger.info('Integration monitoring completed');
      } catch (error) {
        logger.error('Failed to monitor integrations:', error);
      }
    });

    // Process webhooks every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.processWebhooks();
        logger.info('Webhook processing completed');
      } catch (error) {
        logger.error('Failed to process webhooks:', error);
      }
    });

    // Update rate limits every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.updateRateLimits();
        logger.info('Rate limits updated');
      } catch (error) {
        logger.error('Failed to update rate limits:', error);
      }
    });
  }

  setupEventHandlers() {
    // Integration events
    this.integrationOrchestrator.on('integrationCreated', (integration) => {
      this.activeIntegrations.set(integration.id, integration);
      this.emit('integrationCreated', integration);
    });

    this.integrationOrchestrator.on('integrationExecuted', (result) => {
      this.emit('integrationExecuted', result);
    });

    // Webhook events
    this.webhookManager.on('webhookCreated', (webhook) => {
      this.webhookEndpoints.set(webhook.id, webhook);
      this.emit('webhookCreated', webhook);
    });

    this.webhookManager.on('webhookTriggered', (webhook) => {
      this.emit('webhookTriggered', webhook);
    });

    // Partner events
    this.partnerManager.on('partnerCreated', (partner) => {
      this.partnerConnections.set(partner.id, partner);
      this.emit('partnerCreated', partner);
    });
  }

  async monitorIntegrations() {
    try {
      await this.monitoringService.monitorAllIntegrations();
    } catch (error) {
      logger.error('Error monitoring integrations:', error);
    }
  }

  async processWebhooks() {
    try {
      await this.webhookManager.processPendingWebhooks();
    } catch (error) {
      logger.error('Error processing webhooks:', error);
    }
  }

  async updateRateLimits() {
    try {
      await this.rateLimiter.updateAllRateLimits();
    } catch (error) {
      logger.error('Error updating rate limits:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.apiGateway.initialize();
      await this.webhookManager.initialize();
      await this.integrationOrchestrator.initialize();
      await this.dataTransformer.initialize();
      await this.rateLimiter.initialize();
      await this.monitoringService.initialize();
      await this.partnerManager.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Integration Hub started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Integration Hub:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Integration Hub...');
    
    // Close services
    await this.apiGateway.close();
    await this.webhookManager.close();
    await this.integrationOrchestrator.close();
    await this.dataTransformer.close();
    await this.rateLimiter.close();
    await this.monitoringService.close();
    await this.partnerManager.close();
    
    this.server.close(() => {
      logger.info('Integration Hub shutdown complete');
      process.exit(0);
    });
  }
}

// Start the hub
if (require.main === module) {
  const hub = new IntegrationHub();
  hub.start();
}

module.exports = IntegrationHub;
