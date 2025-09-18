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
const OnboardingEngine = require('./services/onboardingEngine');
const DocumentVerifier = require('./services/documentVerifier');
const IdentityVerifier = require('./services/identityVerifier');
const RiskAssessor = require('./services/riskAssessor');
const TierAssigner = require('./services/tierAssigner');
const ComplianceChecker = require('./services/complianceChecker');
const ProgressTracker = require('./services/progressTracker');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class IntelligentKYCSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5017;
    
    // Core services
    this.onboardingEngine = new OnboardingEngine();
    this.documentVerifier = new DocumentVerifier();
    this.identityVerifier = new IdentityVerifier();
    this.riskAssessor = new RiskAssessor();
    this.tierAssigner = new TierAssigner();
    this.complianceChecker = new ComplianceChecker();
    this.progressTracker = new ProgressTracker();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // KYC state
    this.isInitialized = false;
    this.activeOnboardings = new Map();
    this.kycSessions = new Map();
    this.verificationResults = new Map();
    this.riskAssessments = new Map();
    
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
        activeOnboardings: this.activeOnboardings.size,
        kycSessions: this.kycSessions.size,
        verificationResults: this.verificationResults.size,
        riskAssessments: this.riskAssessments.size
      });
    });

    // Onboarding endpoints
    this.app.post('/api/v1/onboarding/start',
      validateRequest('onboardingStart'),
      async (req, res) => {
        try {
          const { userId, userType, preferences } = req.body;
          const onboarding = await this.onboardingEngine.startOnboarding(
            userId, userType, preferences
          );
          
          res.json({
            success: true,
            data: onboarding
          });
        } catch (error) {
          logger.error('Error starting onboarding:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to start onboarding'
          });
        }
      }
    );

    this.app.get('/api/v1/onboarding/:onboardingId',
      authenticateToken,
      async (req, res) => {
        try {
          const { onboardingId } = req.params;
          const onboarding = await this.onboardingEngine.getOnboarding(
            onboardingId, req.user.id
          );
          
          res.json({
            success: true,
            data: onboarding
          });
        } catch (error) {
          logger.error('Error getting onboarding:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get onboarding'
          });
        }
      }
    );

    this.app.post('/api/v1/onboarding/:onboardingId/step',
      authenticateToken,
      validateRequest('onboardingStep'),
      async (req, res) => {
        try {
          const { onboardingId } = req.params;
          const { stepId, data, response } = req.body;
          const result = await this.onboardingEngine.completeStep(
            onboardingId, stepId, data, response, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error completing onboarding step:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to complete onboarding step'
          });
        }
      }
    );

    // Document verification endpoints
    this.app.post('/api/v1/verification/documents',
      authenticateToken,
      validateRequest('documentVerification'),
      async (req, res) => {
        try {
          const { documents, documentType, userId } = req.body;
          const result = await this.documentVerifier.verifyDocuments(
            documents, documentType, userId, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error verifying documents:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to verify documents'
          });
        }
      }
    );

    this.app.get('/api/v1/verification/documents/:verificationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { verificationId } = req.params;
          const verification = await this.documentVerifier.getVerification(
            verificationId, req.user.id
          );
          
          res.json({
            success: true,
            data: verification
          });
        } catch (error) {
          logger.error('Error getting document verification:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get document verification'
          });
        }
      }
    );

    // Identity verification endpoints
    this.app.post('/api/v1/verification/identity',
      authenticateToken,
      validateRequest('identityVerification'),
      async (req, res) => {
        try {
          const { identityData, verificationType, userId } = req.body;
          const result = await this.identityVerifier.verifyIdentity(
            identityData, verificationType, userId, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error verifying identity:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to verify identity'
          });
        }
      }
    );

    this.app.get('/api/v1/verification/identity/:verificationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { verificationId } = req.params;
          const verification = await this.identityVerifier.getVerification(
            verificationId, req.user.id
          );
          
          res.json({
            success: true,
            data: verification
          });
        } catch (error) {
          logger.error('Error getting identity verification:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get identity verification'
          });
        }
      }
    );

    // Risk assessment endpoints
    this.app.post('/api/v1/risk/assess',
      authenticateToken,
      validateRequest('riskAssessment'),
      async (req, res) => {
        try {
          const { userId, riskData, assessmentType } = req.body;
          const assessment = await this.riskAssessor.assessRisk(
            userId, riskData, assessmentType, req.user.id
          );
          
          res.json({
            success: true,
            data: assessment
          });
        } catch (error) {
          logger.error('Error assessing risk:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to assess risk'
          });
        }
      }
    );

    this.app.get('/api/v1/risk/assessments/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const assessments = await this.riskAssessor.getRiskAssessments(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: assessments
          });
        } catch (error) {
          logger.error('Error getting risk assessments:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk assessments'
          });
        }
      }
    );

    // Tier assignment endpoints
    this.app.post('/api/v1/tiers/assign',
      authenticateToken,
      validateRequest('tierAssignment'),
      async (req, res) => {
        try {
          const { userId, tierData, assignmentCriteria } = req.body;
          const assignment = await this.tierAssigner.assignTier(
            userId, tierData, assignmentCriteria, req.user.id
          );
          
          res.json({
            success: true,
            data: assignment
          });
        } catch (error) {
          logger.error('Error assigning tier:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to assign tier'
          });
        }
      }
    );

    this.app.get('/api/v1/tiers/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const tier = await this.tierAssigner.getTier(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: tier
          });
        } catch (error) {
          logger.error('Error getting tier:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get tier'
          });
        }
      }
    );

    // Compliance checking endpoints
    this.app.post('/api/v1/compliance/check',
      authenticateToken,
      validateRequest('complianceCheck'),
      async (req, res) => {
        try {
          const { userId, complianceData, checkType } = req.body;
          const result = await this.complianceChecker.checkCompliance(
            userId, complianceData, checkType, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error checking compliance:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to check compliance'
          });
        }
      }
    );

    this.app.get('/api/v1/compliance/status/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const status = await this.complianceChecker.getComplianceStatus(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: status
          });
        } catch (error) {
          logger.error('Error getting compliance status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get compliance status'
          });
        }
      }
    );

    // Progress tracking endpoints
    this.app.get('/api/v1/progress/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const progress = await this.progressTracker.getProgress(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: progress
          });
        } catch (error) {
          logger.error('Error getting progress:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get progress'
          });
        }
      }
    );

    this.app.post('/api/v1/progress/update',
      authenticateToken,
      validateRequest('progressUpdate'),
      async (req, res) => {
        try {
          const { userId, stepId, status, data } = req.body;
          const result = await this.progressTracker.updateProgress(
            userId, stepId, status, data, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error updating progress:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to update progress'
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
      logger.info('Client connected to intelligent KYC system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, userId, onboardingId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { userId, onboardingId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from intelligent KYC system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Process pending verifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.processPendingVerifications();
        logger.info('Pending verifications processed');
      } catch (error) {
        logger.error('Failed to process pending verifications:', error);
      }
    });

    // Update progress tracking every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.updateProgressTracking();
        logger.info('Progress tracking updated');
      } catch (error) {
        logger.error('Failed to update progress tracking:', error);
      }
    });

    // Clean up expired sessions daily
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupExpiredSessions();
        logger.info('Expired sessions cleaned up');
      } catch (error) {
        logger.error('Failed to cleanup expired sessions:', error);
      }
    });
  }

  setupEventHandlers() {
    // Onboarding events
    this.onboardingEngine.on('onboardingStarted', (onboarding) => {
      this.activeOnboardings.set(onboarding.id, onboarding);
      this.emit('onboardingStarted', onboarding);
    });

    this.onboardingEngine.on('onboardingCompleted', (onboarding) => {
      this.emit('onboardingCompleted', onboarding);
    });

    // Verification events
    this.documentVerifier.on('verificationCompleted', (verification) => {
      this.verificationResults.set(verification.id, verification);
      this.emit('verificationCompleted', verification);
    });

    this.identityVerifier.on('verificationCompleted', (verification) => {
      this.verificationResults.set(verification.id, verification);
      this.emit('verificationCompleted', verification);
    });

    // Risk assessment events
    this.riskAssessor.on('riskAssessed', (assessment) => {
      this.riskAssessments.set(assessment.id, assessment);
      this.emit('riskAssessed', assessment);
    });

    // Tier assignment events
    this.tierAssigner.on('tierAssigned', (assignment) => {
      this.emit('tierAssigned', assignment);
    });
  }

  async processPendingVerifications() {
    try {
      await this.documentVerifier.processPendingVerifications();
      await this.identityVerifier.processPendingVerifications();
    } catch (error) {
      logger.error('Error processing pending verifications:', error);
    }
  }

  async updateProgressTracking() {
    try {
      await this.progressTracker.updateAllProgress();
    } catch (error) {
      logger.error('Error updating progress tracking:', error);
    }
  }

  async cleanupExpiredSessions() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [sessionId, session] of this.kycSessions) {
        if (new Date(session.createdAt) < cutoff) {
          this.kycSessions.delete(sessionId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.onboardingEngine.initialize();
      await this.documentVerifier.initialize();
      await this.identityVerifier.initialize();
      await this.riskAssessor.initialize();
      await this.tierAssigner.initialize();
      await this.complianceChecker.initialize();
      await this.progressTracker.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Intelligent KYC System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Intelligent KYC System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Intelligent KYC System...');
    
    // Close services
    await this.onboardingEngine.close();
    await this.documentVerifier.close();
    await this.identityVerifier.close();
    await this.riskAssessor.close();
    await this.tierAssigner.close();
    await this.complianceChecker.close();
    await this.progressTracker.close();
    
    this.server.close(() => {
      logger.info('Intelligent KYC System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new IntelligentKYCSystem();
  system.start();
}

module.exports = IntelligentKYCSystem;
