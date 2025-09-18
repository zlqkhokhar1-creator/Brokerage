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
const BehavioralAnalyzer = require('./services/behavioralAnalyzer');
const BiasDetector = require('./services/biasDetector');
const CoachingEngine = require('./services/coachingEngine');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class BehavioralFinanceAdvisor {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 5004;
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.biasDetector = new BiasDetector();
    this.coachingEngine = new CoachingEngine();
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

    // Behavioral analysis endpoints
    this.app.post('/api/v1/behavioral/analyze', 
      authenticateToken,
      validateRequest('behavioralAnalysis'),
      async (req, res) => {
        try {
          const { userId, tradingData, timeRange } = req.body;
          const analysis = await this.behavioralAnalyzer.analyzeBehavior(userId, tradingData, timeRange);
          
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

    // Bias detection endpoints
    this.app.post('/api/v1/bias/detect',
      authenticateToken,
      validateRequest('biasDetection'),
      async (req, res) => {
        try {
          const { userId, tradingHistory, marketData } = req.body;
          const biases = await this.biasDetector.detectBiases(userId, tradingHistory, marketData);
          
          res.json({
            success: true,
            data: biases
          });
        } catch (error) {
          logger.error('Error detecting biases:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to detect biases'
          });
        }
      }
    );

    // Get user's behavioral profile
    this.app.get('/api/v1/behavioral/profile/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const profile = await this.behavioralAnalyzer.getBehavioralProfile(userId);
          
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

    // Get coaching recommendations
    this.app.get('/api/v1/coaching/recommendations/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { type = 'all', limit = 10 } = req.query;
          
          const recommendations = await this.coachingEngine.getRecommendations(
            userId, 
            type, 
            parseInt(limit)
          );
          
          res.json({
            success: true,
            data: recommendations
          });
        } catch (error) {
          logger.error('Error getting coaching recommendations:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get coaching recommendations'
          });
        }
      }
    );

    // Generate personalized coaching plan
    this.app.post('/api/v1/coaching/plan',
      authenticateToken,
      validateRequest('coachingPlan'),
      async (req, res) => {
        try {
          const { userId, goals, currentLevel, preferences } = req.body;
          const plan = await this.coachingEngine.generateCoachingPlan(
            userId, 
            goals, 
            currentLevel, 
            preferences
          );
          
          res.json({
            success: true,
            data: plan
          });
        } catch (error) {
          logger.error('Error generating coaching plan:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate coaching plan'
          });
        }
      }
    );

    // Track coaching progress
    this.app.post('/api/v1/coaching/progress',
      authenticateToken,
      validateRequest('coachingProgress'),
      async (req, res) => {
        try {
          const { userId, action, data } = req.body;
          const progress = await this.coachingEngine.trackProgress(userId, action, data);
          
          res.json({
            success: true,
            data: progress
          });
        } catch (error) {
          logger.error('Error tracking coaching progress:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to track coaching progress'
          });
        }
      }
    );

    // Get behavioral insights
    this.app.get('/api/v1/insights/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { timeframe = '30d', type = 'all' } = req.query;
          
          const insights = await this.behavioralAnalyzer.getInsights(
            userId, 
            timeframe, 
            type
          );
          
          res.json({
            success: true,
            data: insights
          });
        } catch (error) {
          logger.error('Error getting behavioral insights:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get behavioral insights'
          });
        }
      }
    );

    // Get risk tolerance analysis
    this.app.get('/api/v1/risk-tolerance/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const analysis = await this.behavioralAnalyzer.getRiskToleranceAnalysis(userId);
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing risk tolerance:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze risk tolerance'
          });
        }
      }
    );

    // Get emotional state analysis
    this.app.post('/api/v1/emotional-state',
      authenticateToken,
      validateRequest('emotionalState'),
      async (req, res) => {
        try {
          const { userId, tradingData, marketConditions } = req.body;
          const emotionalState = await this.behavioralAnalyzer.analyzeEmotionalState(
            userId, 
            tradingData, 
            marketConditions
          );
          
          res.json({
            success: true,
            data: emotionalState
          });
        } catch (error) {
          logger.error('Error analyzing emotional state:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze emotional state'
          });
        }
      }
    );

    // Get trading pattern analysis
    this.app.get('/api/v1/patterns/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { timeframe = '90d' } = req.query;
          
          const patterns = await this.behavioralAnalyzer.getTradingPatterns(
            userId, 
            timeframe
          );
          
          res.json({
            success: true,
            data: patterns
          });
        } catch (error) {
          logger.error('Error analyzing trading patterns:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze trading patterns'
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
      logger.info('Client connected to behavioral finance advisor', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { userId, types } = data;
          await this.webSocketManager.subscribeToUser(socket.id, userId, types);
          socket.emit('subscribed', { userId, types, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { userId, types } = data;
          await this.webSocketManager.unsubscribeFromUser(socket.id, userId, types);
          socket.emit('unsubscribed', { userId, types, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from behavioral finance advisor', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update behavioral profiles every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.behavioralAnalyzer.updateAllProfiles();
        logger.info('Behavioral profiles updated');
      } catch (error) {
        logger.error('Failed to update behavioral profiles:', error);
      }
    });

    // Generate coaching recommendations every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        await this.coachingEngine.generateRecommendationsForAllUsers();
        logger.info('Coaching recommendations generated');
      } catch (error) {
        logger.error('Failed to generate coaching recommendations:', error);
      }
    });

    // Clean up old data every day
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.behavioralAnalyzer.cleanupOldData();
        await this.coachingEngine.cleanupOldData();
        logger.info('Old data cleanup completed');
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
      await this.behavioralAnalyzer.initialize();
      await this.biasDetector.initialize();
      await this.coachingEngine.initialize();
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Behavioral Finance Advisor started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Behavioral Finance Advisor:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Behavioral Finance Advisor...');
    
    this.server.close(() => {
      logger.info('Behavioral Finance Advisor shutdown complete');
      process.exit(0);
    });
  }
}

// Start the advisor
if (require.main === module) {
  const advisor = new BehavioralFinanceAdvisor();
  advisor.start();
}

module.exports = BehavioralFinanceAdvisor;
