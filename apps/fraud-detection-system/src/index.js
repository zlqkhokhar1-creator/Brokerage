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
const FraudDetectionEngine = require('./services/fraudDetectionEngine');
const MLModelManager = require('./services/mlModelManager');
const AnomalyDetector = require('./services/anomalyDetector');
const BehavioralAnalyzer = require('./services/behavioralAnalyzer');
const DeviceFingerprinter = require('./services/deviceFingerprinter');
const TransactionMonitor = require('./services/transactionMonitor');
const RiskScorer = require('./services/riskScorer');
const AlertManager = require('./services/alertManager');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class FraudDetectionSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5009;
    
    // Core services
    this.fraudDetectionEngine = new FraudDetectionEngine();
    this.mlModelManager = new MLModelManager();
    this.anomalyDetector = new AnomalyDetector();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.deviceFingerprinter = new DeviceFingerprinter();
    this.transactionMonitor = new TransactionMonitor();
    this.riskScorer = new RiskScorer();
    this.alertManager = new AlertManager();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Fraud detection state
    this.isInitialized = false;
    this.activeModels = new Map();
    this.fraudAlerts = new Map();
    this.riskScores = new Map();
    this.deviceProfiles = new Map();
    this.behavioralProfiles = new Map();
    
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
        activeModels: this.activeModels.size,
        fraudAlerts: this.fraudAlerts.size,
        riskScores: this.riskScores.size,
        deviceProfiles: this.deviceProfiles.size,
        behavioralProfiles: this.behavioralProfiles.size
      });
    });

    // Fraud detection endpoints
    this.app.post('/api/v1/fraud/analyze',
      authenticateToken,
      validateRequest('fraudAnalysis'),
      async (req, res) => {
        try {
          const { transaction, userData, deviceData, behavioralData } = req.body;
          const fraudResult = await this.fraudDetectionEngine.analyzeTransaction(
            transaction, userData, deviceData, behavioralData, req.user.id
          );
          
          res.json({
            success: true,
            data: fraudResult
          });
        } catch (error) {
          logger.error('Error analyzing fraud:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze fraud'
          });
        }
      }
    );

    this.app.post('/api/v1/fraud/scan',
      authenticateToken,
      validateRequest('fraudScan'),
      async (req, res) => {
        try {
          const { transactions, userId, timeRange } = req.body;
          const scanResult = await this.fraudDetectionEngine.scanTransactions(
            transactions, userId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: scanResult
          });
        } catch (error) {
          logger.error('Error scanning fraud:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to scan fraud'
          });
        }
      }
    );

    // ML model endpoints
    this.app.get('/api/v1/models',
      authenticateToken,
      async (req, res) => {
        try {
          const models = await this.mlModelManager.getModels(req.user.id);
          
          res.json({
            success: true,
            data: models
          });
        } catch (error) {
          logger.error('Error getting models:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get models'
          });
        }
      }
    );

    this.app.post('/api/v1/models/train',
      authenticateToken,
      validateRequest('modelTraining'),
      async (req, res) => {
        try {
          const { modelType, trainingData, parameters } = req.body;
          const trainingResult = await this.mlModelManager.trainModel(
            modelType, trainingData, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: trainingResult
          });
        } catch (error) {
          logger.error('Error training model:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to train model'
          });
        }
      }
    );

    this.app.post('/api/v1/models/:modelId/predict',
      authenticateToken,
      validateRequest('modelPrediction'),
      async (req, res) => {
        try {
          const { modelId } = req.params;
          const { features } = req.body;
          const prediction = await this.mlModelManager.predict(
            modelId, features, req.user.id
          );
          
          res.json({
            success: true,
            data: prediction
          });
        } catch (error) {
          logger.error('Error making prediction:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to make prediction'
          });
        }
      }
    );

    // Anomaly detection endpoints
    this.app.post('/api/v1/anomaly/detect',
      authenticateToken,
      validateRequest('anomalyDetection'),
      async (req, res) => {
        try {
          const { data, algorithm, parameters } = req.body;
          const anomalies = await this.anomalyDetector.detectAnomalies(
            data, algorithm, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: anomalies
          });
        } catch (error) {
          logger.error('Error detecting anomalies:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to detect anomalies'
          });
        }
      }
    );

    this.app.get('/api/v1/anomaly/patterns/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { timeRange } = req.query;
          const patterns = await this.anomalyDetector.getAnomalyPatterns(
            userId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: patterns
          });
        } catch (error) {
          logger.error('Error getting anomaly patterns:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get anomaly patterns'
          });
        }
      }
    );

    // Behavioral analysis endpoints
    this.app.post('/api/v1/behavioral/analyze',
      authenticateToken,
      validateRequest('behavioralAnalysis'),
      async (req, res) => {
        try {
          const { userId, activities, timeRange } = req.body;
          const analysis = await this.behavioralAnalyzer.analyzeBehavior(
            userId, activities, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing behavior:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze behavior'
          });
        }
      }
    );

    this.app.get('/api/v1/behavioral/profile/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const profile = await this.behavioralAnalyzer.getBehavioralProfile(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: profile
          });
        } catch (error) {
          logger.error('Error getting behavioral profile:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get behavioral profile'
          });
        }
      }
    );

    // Device fingerprinting endpoints
    this.app.post('/api/v1/device/fingerprint',
      authenticateToken,
      validateRequest('deviceFingerprinting'),
      async (req, res) => {
        try {
          const { deviceData, userAgent, ipAddress } = req.body;
          const fingerprint = await this.deviceFingerprinter.createFingerprint(
            deviceData, userAgent, ipAddress, req.user.id
          );
          
          res.json({
            success: true,
            data: fingerprint
          });
        } catch (error) {
          logger.error('Error creating device fingerprint:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create device fingerprint'
          });
        }
      }
    );

    this.app.get('/api/v1/device/profile/:deviceId',
      authenticateToken,
      async (req, res) => {
        try {
          const { deviceId } = req.params;
          const profile = await this.deviceFingerprinter.getDeviceProfile(
            deviceId, req.user.id
          );
          
          res.json({
            success: true,
            data: profile
          });
        } catch (error) {
          logger.error('Error getting device profile:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get device profile'
          });
        }
      }
    );

    // Transaction monitoring endpoints
    this.app.post('/api/v1/transactions/monitor',
      authenticateToken,
      validateRequest('transactionMonitoring'),
      async (req, res) => {
        try {
          const { transaction, userId } = req.body;
          const monitoringResult = await this.transactionMonitor.monitorTransaction(
            transaction, userId, req.user.id
          );
          
          res.json({
            success: true,
            data: monitoringResult
          });
        } catch (error) {
          logger.error('Error monitoring transaction:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to monitor transaction'
          });
        }
      }
    );

    this.app.get('/api/v1/transactions/suspicious',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId, timeRange, limit = 100 } = req.query;
          const suspiciousTransactions = await this.transactionMonitor.getSuspiciousTransactions(
            userId, timeRange, parseInt(limit), req.user.id
          );
          
          res.json({
            success: true,
            data: suspiciousTransactions
          });
        } catch (error) {
          logger.error('Error getting suspicious transactions:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get suspicious transactions'
          });
        }
      }
    );

    // Risk scoring endpoints
    this.app.post('/api/v1/risk/score',
      authenticateToken,
      validateRequest('riskScoring'),
      async (req, res) => {
        try {
          const { userId, transaction, context } = req.body;
          const riskScore = await this.riskScorer.calculateRiskScore(
            userId, transaction, context, req.user.id
          );
          
          res.json({
            success: true,
            data: riskScore
          });
        } catch (error) {
          logger.error('Error calculating risk score:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate risk score'
          });
        }
      }
    );

    this.app.get('/api/v1/risk/history/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { timeRange } = req.query;
          const riskHistory = await this.riskScorer.getRiskHistory(
            userId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: riskHistory
          });
        } catch (error) {
          logger.error('Error getting risk history:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk history'
          });
        }
      }
    );

    // Alert management endpoints
    this.app.get('/api/v1/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, severity, limit = 100 } = req.query;
          const alerts = await this.alertManager.getAlerts(
            req.user.id, status, severity, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get alerts'
          });
        }
      }
    );

    this.app.post('/api/v1/alerts/:alertId/acknowledge',
      authenticateToken,
      async (req, res) => {
        try {
          const { alertId } = req.params;
          const alert = await this.alertManager.acknowledgeAlert(
            alertId, req.user.id
          );
          
          res.json({
            success: true,
            data: alert
          });
        } catch (error) {
          logger.error('Error acknowledging alert:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to acknowledge alert'
          });
        }
      }
    );

    this.app.post('/api/v1/alerts/:alertId/resolve',
      authenticateToken,
      validateRequest('alertResolution'),
      async (req, res) => {
        try {
          const { alertId } = req.params;
          const { resolution, notes } = req.body;
          const alert = await this.alertManager.resolveAlert(
            alertId, resolution, notes, req.user.id
          );
          
          res.json({
            success: true,
            data: alert
          });
        } catch (error) {
          logger.error('Error resolving alert:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to resolve alert'
          });
        }
      }
    );

    // Fraud prevention endpoints
    this.app.post('/api/v1/prevention/block',
      authenticateToken,
      validateRequest('fraudPrevention'),
      async (req, res) => {
        try {
          const { userId, reason, duration } = req.body;
          const blockResult = await this.fraudDetectionEngine.blockUser(
            userId, reason, duration, req.user.id
          );
          
          res.json({
            success: true,
            data: blockResult
          });
        } catch (error) {
          logger.error('Error blocking user:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to block user'
          });
        }
      }
    );

    this.app.post('/api/v1/prevention/unblock',
      authenticateToken,
      validateRequest('fraudPrevention'),
      async (req, res) => {
        try {
          const { userId, reason } = req.body;
          const unblockResult = await this.fraudDetectionEngine.unblockUser(
            userId, reason, req.user.id
          );
          
          res.json({
            success: true,
            data: unblockResult
          });
        } catch (error) {
          logger.error('Error unblocking user:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to unblock user'
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
      logger.info('Client connected to fraud detection system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, userId, alertId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { userId, alertId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, userId, alertId } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { userId, alertId });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from fraud detection system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update ML models every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.updateMLModels();
        logger.info('ML models updated');
      } catch (error) {
        logger.error('Failed to update ML models:', error);
      }
    });

    // Run fraud detection scans every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.runFraudScans();
        logger.info('Fraud scans completed');
      } catch (error) {
        logger.error('Failed to run fraud scans:', error);
      }
    });

    // Update behavioral profiles every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      try {
        await this.updateBehavioralProfiles();
        logger.info('Behavioral profiles updated');
      } catch (error) {
        logger.error('Failed to update behavioral profiles:', error);
      }
    });

    // Clean up old data daily
    cron.schedule('0 3 * * *', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old fraud detection data cleaned up');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Fraud alert events
    this.alertManager.on('alertGenerated', (alert) => {
      this.fraudAlerts.set(alert.id, alert);
      this.emit('alertGenerated', alert);
    });

    this.alertManager.on('alertResolved', (alert) => {
      this.fraudAlerts.delete(alert.id);
      this.emit('alertResolved', alert);
    });

    // Risk score events
    this.riskScorer.on('riskScoreUpdated', (userId, riskScore) => {
      this.riskScores.set(userId, riskScore);
      this.emit('riskScoreUpdated', userId, riskScore);
    });

    // Device profile events
    this.deviceFingerprinter.on('deviceProfileUpdated', (deviceId, profile) => {
      this.deviceProfiles.set(deviceId, profile);
      this.emit('deviceProfileUpdated', deviceId, profile);
    });

    // Behavioral profile events
    this.behavioralAnalyzer.on('behavioralProfileUpdated', (userId, profile) => {
      this.behavioralProfiles.set(userId, profile);
      this.emit('behavioralProfileUpdated', userId, profile);
    });
  }

  async updateMLModels() {
    try {
      // Update all active ML models
      for (const [modelId, model] of this.activeModels) {
        try {
          await this.mlModelManager.updateModel(modelId);
        } catch (error) {
          logger.error(`Error updating model ${modelId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating ML models:', error);
    }
  }

  async runFraudScans() {
    try {
      // Run fraud detection scans for active users
      const activeUsers = await this.getActiveUsers();
      
      for (const userId of activeUsers) {
        try {
          await this.fraudDetectionEngine.scanUserTransactions(userId);
        } catch (error) {
          logger.error(`Error scanning user ${userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error running fraud scans:', error);
    }
  }

  async updateBehavioralProfiles() {
    try {
      // Update behavioral profiles for active users
      for (const [userId, profile] of this.behavioralProfiles) {
        try {
          await this.behavioralAnalyzer.updateProfile(userId);
        } catch (error) {
          logger.error(`Error updating behavioral profile for ${userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating behavioral profiles:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old fraud alerts
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      for (const [alertId, alert] of this.fraudAlerts) {
        if (new Date(alert.createdAt) < cutoff && alert.status === 'resolved') {
          this.fraudAlerts.delete(alertId);
        }
      }
      
      // Clean up old risk scores
      for (const [userId, riskScore] of this.riskScores) {
        if (new Date(riskScore.timestamp) < cutoff) {
          this.riskScores.delete(userId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async getActiveUsers() {
    try {
      // Mock implementation - in production, this would query the database
      return Array.from(this.behavioralProfiles.keys());
    } catch (error) {
      logger.error('Error getting active users:', error);
      return [];
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.fraudDetectionEngine.initialize();
      await this.mlModelManager.initialize();
      await this.anomalyDetector.initialize();
      await this.behavioralAnalyzer.initialize();
      await this.deviceFingerprinter.initialize();
      await this.transactionMonitor.initialize();
      await this.riskScorer.initialize();
      await this.alertManager.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Fraud Detection System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Fraud Detection System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Fraud Detection System...');
    
    // Close services
    await this.fraudDetectionEngine.close();
    await this.mlModelManager.close();
    await this.anomalyDetector.close();
    await this.behavioralAnalyzer.close();
    await this.deviceFingerprinter.close();
    await this.transactionMonitor.close();
    await this.riskScorer.close();
    await this.alertManager.close();
    
    this.server.close(() => {
      logger.info('Fraud Detection System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new FraudDetectionSystem();
  system.start();
}

module.exports = FraudDetectionSystem;
