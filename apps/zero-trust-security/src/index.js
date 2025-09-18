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
const IdentityManager = require('./services/identityManager');
const AccessController = require('./services/accessController');
const PolicyEngine = require('./services/policyEngine');
const ThreatDetector = require('./services/threatDetector');
const SecurityMonitor = require('./services/securityMonitor');
const IncidentResponder = require('./services/incidentResponder');
const MicroSegmentation = require('./services/microSegmentation');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class ZeroTrustSecuritySystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5014;
    
    // Core services
    this.identityManager = new IdentityManager();
    this.accessController = new AccessController();
    this.policyEngine = new PolicyEngine();
    this.threatDetector = new ThreatDetector();
    this.securityMonitor = new SecurityMonitor();
    this.incidentResponder = new IncidentResponder();
    this.microSegmentation = new MicroSegmentation();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Security state
    this.isInitialized = false;
    this.activeSessions = new Map();
    this.securityPolicies = new Map();
    this.threatAlerts = new Map();
    this.incidents = new Map();
    
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
        activeSessions: this.activeSessions.size,
        securityPolicies: this.securityPolicies.size,
        threatAlerts: this.threatAlerts.size,
        incidents: this.incidents.size
      });
    });

    // Identity management endpoints
    this.app.post('/api/v1/identity/authenticate',
      validateRequest('authentication'),
      async (req, res) => {
        try {
          const { username, password, mfaToken, deviceInfo } = req.body;
          const result = await this.identityManager.authenticate(
            username, password, mfaToken, deviceInfo
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error authenticating user:', error);
          res.status(401).json({
            success: false,
            error: 'Authentication failed'
          });
        }
      }
    );

    this.app.post('/api/v1/identity/authorize',
      authenticateToken,
      validateRequest('authorization'),
      async (req, res) => {
        try {
          const { resource, action, context } = req.body;
          const result = await this.accessController.authorize(
            req.user.id, resource, action, context
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error authorizing user:', error);
          res.status(403).json({
            success: false,
            error: 'Authorization failed'
          });
        }
      }
    );

    // Policy management endpoints
    this.app.post('/api/v1/policies',
      authenticateToken,
      validateRequest('policyCreation'),
      async (req, res) => {
        try {
          const { name, description, rules, conditions } = req.body;
          const policy = await this.policyEngine.createPolicy(
            name, description, rules, conditions, req.user.id
          );
          
          res.json({
            success: true,
            data: policy
          });
        } catch (error) {
          logger.error('Error creating policy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create policy'
          });
        }
      }
    );

    this.app.get('/api/v1/policies/:policyId',
      authenticateToken,
      async (req, res) => {
        try {
          const { policyId } = req.params;
          const policy = await this.policyEngine.getPolicy(
            policyId, req.user.id
          );
          
          res.json({
            success: true,
            data: policy
          });
        } catch (error) {
          logger.error('Error getting policy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get policy'
          });
        }
      }
    );

    // Threat detection endpoints
    this.app.get('/api/v1/threats',
      authenticateToken,
      async (req, res) => {
        try {
          const { severity, status, limit = 100 } = req.query;
          const threats = await this.threatDetector.getThreats(
            severity, status, parseInt(limit), req.user.id
          );
          
          res.json({
            success: true,
            data: threats
          });
        } catch (error) {
          logger.error('Error getting threats:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get threats'
          });
        }
      }
    );

    this.app.post('/api/v1/threats/analyze',
      authenticateToken,
      validateRequest('threatAnalysis'),
      async (req, res) => {
        try {
          const { data, analysisType, parameters } = req.body;
          const result = await this.threatDetector.analyzeThreats(
            data, analysisType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error analyzing threats:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze threats'
          });
        }
      }
    );

    // Security monitoring endpoints
    this.app.get('/api/v1/security/metrics',
      authenticateToken,
      async (req, res) => {
        try {
          const { timeRange, metricType } = req.query;
          const metrics = await this.securityMonitor.getMetrics(
            timeRange, metricType, req.user.id
          );
          
          res.json({
            success: true,
            data: metrics
          });
        } catch (error) {
          logger.error('Error getting security metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get security metrics'
          });
        }
      }
    );

    this.app.get('/api/v1/security/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { severity, status, limit = 100 } = req.query;
          const alerts = await this.securityMonitor.getAlerts(
            severity, status, parseInt(limit), req.user.id
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting security alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get security alerts'
          });
        }
      }
    );

    // Incident response endpoints
    this.app.post('/api/v1/incidents',
      authenticateToken,
      validateRequest('incidentCreation'),
      async (req, res) => {
        try {
          const { title, description, severity, category, affectedSystems } = req.body;
          const incident = await this.incidentResponder.createIncident(
            title, description, severity, category, affectedSystems, req.user.id
          );
          
          res.json({
            success: true,
            data: incident
          });
        } catch (error) {
          logger.error('Error creating incident:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create incident'
          });
        }
      }
    );

    this.app.get('/api/v1/incidents/:incidentId',
      authenticateToken,
      async (req, res) => {
        try {
          const { incidentId } = req.params;
          const incident = await this.incidentResponder.getIncident(
            incidentId, req.user.id
          );
          
          res.json({
            success: true,
            data: incident
          });
        } catch (error) {
          logger.error('Error getting incident:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get incident'
          });
        }
      }
    );

    // Micro-segmentation endpoints
    this.app.post('/api/v1/segmentation/policies',
      authenticateToken,
      validateRequest('segmentationPolicy'),
      async (req, res) => {
        try {
          const { name, description, rules, networkConfig } = req.body;
          const policy = await this.microSegmentation.createPolicy(
            name, description, rules, networkConfig, req.user.id
          );
          
          res.json({
            success: true,
            data: policy
          });
        } catch (error) {
          logger.error('Error creating segmentation policy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create segmentation policy'
          });
        }
      }
    );

    this.app.get('/api/v1/segmentation/status',
      authenticateToken,
      async (req, res) => {
        try {
          const status = await this.microSegmentation.getStatus(req.user.id);
          
          res.json({
            success: true,
            data: status
          });
        } catch (error) {
          logger.error('Error getting segmentation status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get segmentation status'
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
      logger.info('Client connected to zero-trust security system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, userId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { userId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from zero-trust security system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Security monitoring every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.monitorSecurity();
        logger.info('Security monitoring completed');
      } catch (error) {
        logger.error('Failed to monitor security:', error);
      }
    });

    // Threat detection every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.detectThreats();
        logger.info('Threat detection completed');
      } catch (error) {
        logger.error('Failed to detect threats:', error);
      }
    });

    // Policy enforcement every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        await this.enforcePolicies();
        logger.info('Policy enforcement completed');
      } catch (error) {
        logger.error('Failed to enforce policies:', error);
      }
    });
  }

  setupEventHandlers() {
    // Security events
    this.identityManager.on('userAuthenticated', (user) => {
      this.activeSessions.set(user.id, user);
      this.emit('userAuthenticated', user);
    });

    this.threatDetector.on('threatDetected', (threat) => {
      this.threatAlerts.set(threat.id, threat);
      this.emit('threatDetected', threat);
    });

    this.incidentResponder.on('incidentCreated', (incident) => {
      this.incidents.set(incident.id, incident);
      this.emit('incidentCreated', incident);
    });
  }

  async monitorSecurity() {
    try {
      await this.securityMonitor.monitorAllSystems();
    } catch (error) {
      logger.error('Error monitoring security:', error);
    }
  }

  async detectThreats() {
    try {
      await this.threatDetector.detectAllThreats();
    } catch (error) {
      logger.error('Error detecting threats:', error);
    }
  }

  async enforcePolicies() {
    try {
      await this.policyEngine.enforceAllPolicies();
    } catch (error) {
      logger.error('Error enforcing policies:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.identityManager.initialize();
      await this.accessController.initialize();
      await this.policyEngine.initialize();
      await this.threatDetector.initialize();
      await this.securityMonitor.initialize();
      await this.incidentResponder.initialize();
      await this.microSegmentation.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Zero-Trust Security System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Zero-Trust Security System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Zero-Trust Security System...');
    
    // Close services
    await this.identityManager.close();
    await this.accessController.close();
    await this.policyEngine.close();
    await this.threatDetector.close();
    await this.securityMonitor.close();
    await this.incidentResponder.close();
    await this.microSegmentation.close();
    
    this.server.close(() => {
      logger.info('Zero-Trust Security System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new ZeroTrustSecuritySystem();
  system.start();
}

module.exports = ZeroTrustSecuritySystem;
