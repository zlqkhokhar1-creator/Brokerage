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
const RiskCalculator = require('./services/riskCalculator');
const PortfolioRiskEngine = require('./services/portfolioRiskEngine');
const StressTestEngine = require('./services/stressTestEngine');
const CorrelationAnalyzer = require('./services/correlationAnalyzer');
const RiskAlertManager = require('./services/riskAlertManager');
const MarketDataProvider = require('./services/marketDataProvider');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class RiskMonitoringSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5007;
    
    // Core services
    this.riskCalculator = new RiskCalculator();
    this.portfolioRiskEngine = new PortfolioRiskEngine();
    this.stressTestEngine = new StressTestEngine();
    this.correlationAnalyzer = new CorrelationAnalyzer();
    this.riskAlertManager = new RiskAlertManager();
    this.marketDataProvider = new MarketDataProvider();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Risk monitoring state
    this.isInitialized = false;
    this.activePortfolios = new Map();
    this.riskMetrics = new Map();
    this.alerts = new Map();
    
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
        activePortfolios: this.activePortfolios.size,
        riskMetrics: this.riskMetrics.size,
        activeAlerts: this.alerts.size
      });
    });

    // Portfolio risk endpoints
    this.app.post('/api/v1/portfolio/risk',
      authenticateToken,
      validateRequest('portfolioRisk'),
      async (req, res) => {
        try {
          const { portfolioId, positions, marketData } = req.body;
          const riskMetrics = await this.portfolioRiskEngine.calculatePortfolioRisk(
            portfolioId, positions, marketData, req.user.id
          );
          
          res.json({
            success: true,
            data: riskMetrics
          });
        } catch (error) {
          logger.error('Error calculating portfolio risk:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate portfolio risk'
          });
        }
      }
    );

    this.app.get('/api/v1/portfolio/:portfolioId/risk',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const riskMetrics = await this.portfolioRiskEngine.getPortfolioRisk(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: riskMetrics
          });
        } catch (error) {
          logger.error('Error getting portfolio risk:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get portfolio risk'
          });
        }
      }
    );

    // VaR calculation endpoints
    this.app.post('/api/v1/var/calculate',
      authenticateToken,
      validateRequest('varCalculation'),
      async (req, res) => {
        try {
          const { positions, confidenceLevel, timeHorizon, method } = req.body;
          const varResult = await this.riskCalculator.calculateVaR(
            positions, confidenceLevel, timeHorizon, method
          );
          
          res.json({
            success: true,
            data: varResult
          });
        } catch (error) {
          logger.error('Error calculating VaR:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate VaR'
          });
        }
      }
    );

    this.app.post('/api/v1/cvar/calculate',
      authenticateToken,
      validateRequest('cvarCalculation'),
      async (req, res) => {
        try {
          const { positions, confidenceLevel, timeHorizon } = req.body;
          const cvarResult = await this.riskCalculator.calculateCVaR(
            positions, confidenceLevel, timeHorizon
          );
          
          res.json({
            success: true,
            data: cvarResult
          });
        } catch (error) {
          logger.error('Error calculating CVaR:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate CVaR'
          });
        }
      }
    );

    // Stress testing endpoints
    this.app.post('/api/v1/stress-test/run',
      authenticateToken,
      validateRequest('stressTest'),
      async (req, res) => {
        try {
          const { portfolioId, scenarios, positions } = req.body;
          const stressTestResults = await this.stressTestEngine.runStressTest(
            portfolioId, scenarios, positions, req.user.id
          );
          
          res.json({
            success: true,
            data: stressTestResults
          });
        } catch (error) {
          logger.error('Error running stress test:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to run stress test'
          });
        }
      }
    );

    this.app.get('/api/v1/stress-test/:testId',
      authenticateToken,
      async (req, res) => {
        try {
          const { testId } = req.params;
          const stressTest = await this.stressTestEngine.getStressTest(
            testId, req.user.id
          );
          
          res.json({
            success: true,
            data: stressTest
          });
        } catch (error) {
          logger.error('Error getting stress test:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get stress test'
          });
        }
      }
    );

    // Correlation analysis endpoints
    this.app.post('/api/v1/correlation/analyze',
      authenticateToken,
      validateRequest('correlationAnalysis'),
      async (req, res) => {
        try {
          const { symbols, timeframe, method } = req.body;
          const correlationResults = await this.correlationAnalyzer.analyzeCorrelation(
            symbols, timeframe, method
          );
          
          res.json({
            success: true,
            data: correlationResults
          });
        } catch (error) {
          logger.error('Error analyzing correlation:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze correlation'
          });
        }
      }
    );

    this.app.get('/api/v1/correlation/matrix/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const correlationMatrix = await this.correlationAnalyzer.getCorrelationMatrix(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: correlationMatrix
          });
        } catch (error) {
          logger.error('Error getting correlation matrix:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get correlation matrix'
          });
        }
      }
    );

    // Risk alerts endpoints
    this.app.get('/api/v1/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { status = 'active', limit = 100 } = req.query;
          const alerts = await this.riskAlertManager.getAlerts(
            req.user.id, status, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting risk alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk alerts'
          });
        }
      }
    );

    this.app.post('/api/v1/alerts/acknowledge',
      authenticateToken,
      validateRequest('alertAcknowledge'),
      async (req, res) => {
        try {
          const { alertIds } = req.body;
          const result = await this.riskAlertManager.acknowledgeAlerts(
            alertIds, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error acknowledging alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to acknowledge alerts'
          });
        }
      }
    );

    this.app.post('/api/v1/alerts/resolve',
      authenticateToken,
      validateRequest('alertResolve'),
      async (req, res) => {
        try {
          const { alertIds, resolution } = req.body;
          const result = await this.riskAlertManager.resolveAlerts(
            alertIds, resolution, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error resolving alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to resolve alerts'
          });
        }
      }
    );

    // Risk limits endpoints
    this.app.get('/api/v1/limits/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const limits = await this.portfolioRiskEngine.getRiskLimits(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: limits
          });
        } catch (error) {
          logger.error('Error getting risk limits:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk limits'
          });
        }
      }
    );

    this.app.post('/api/v1/limits/:portfolioId',
      authenticateToken,
      validateRequest('riskLimits'),
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { limits } = req.body;
          const result = await this.portfolioRiskEngine.setRiskLimits(
            portfolioId, limits, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error setting risk limits:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to set risk limits'
          });
        }
      }
    );

    // Risk dashboard endpoints
    this.app.get('/api/v1/dashboard/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const dashboard = await this.getRiskDashboard(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error getting risk dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk dashboard'
          });
        }
      }
    );

    // Real-time risk monitoring endpoints
    this.app.get('/api/v1/monitoring/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const monitoring = await this.getRealTimeMonitoring(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: monitoring
          });
        } catch (error) {
          logger.error('Error getting real-time monitoring:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get real-time monitoring'
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
      logger.info('Client connected to risk monitoring system', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, portfolioId, userId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { portfolioId, userId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, portfolioId, userId } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { portfolioId, userId });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from risk monitoring system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update risk metrics every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.updateRiskMetrics();
        logger.info('Risk metrics updated');
      } catch (error) {
        logger.error('Failed to update risk metrics:', error);
      }
    });

    // Run stress tests every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.runScheduledStressTests();
        logger.info('Scheduled stress tests completed');
      } catch (error) {
        logger.error('Failed to run scheduled stress tests:', error);
      }
    });

    // Check risk alerts every 10 seconds
    cron.schedule('*/10 * * * * *', async () => {
      try {
        await this.checkRiskAlerts();
        logger.info('Risk alerts checked');
      } catch (error) {
        logger.error('Failed to check risk alerts:', error);
      }
    });

    // Clean up old data every day
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old data cleanup completed');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Risk alert events
    this.riskAlertManager.on('alertTriggered', (alert) => {
      this.alerts.set(alert.id, alert);
      this.emit('alertTriggered', alert);
    });

    this.riskAlertManager.on('alertResolved', (alert) => {
      this.alerts.delete(alert.id);
      this.emit('alertResolved', alert);
    });

    // Portfolio risk events
    this.portfolioRiskEngine.on('riskLimitExceeded', (portfolioId, riskData) => {
      this.emit('riskLimitExceeded', portfolioId, riskData);
    });

    this.portfolioRiskEngine.on('riskLimitRestored', (portfolioId, riskData) => {
      this.emit('riskLimitRestored', portfolioId, riskData);
    });
  }

  async updateRiskMetrics() {
    try {
      for (const [portfolioId, portfolio] of this.activePortfolios) {
        const riskMetrics = await this.portfolioRiskEngine.calculatePortfolioRisk(
          portfolioId, portfolio.positions, portfolio.marketData, portfolio.userId
        );
        
        this.riskMetrics.set(portfolioId, riskMetrics);
        this.activePortfolios.set(portfolioId, { ...portfolio, riskMetrics });
      }
    } catch (error) {
      logger.error('Error updating risk metrics:', error);
    }
  }

  async runScheduledStressTests() {
    try {
      for (const [portfolioId, portfolio] of this.activePortfolios) {
        if (portfolio.riskMetrics && portfolio.riskMetrics.var > portfolio.riskLimits.var) {
          await this.stressTestEngine.runStressTest(
            portfolioId, 
            ['market_crash', 'interest_rate_shock', 'volatility_spike'],
            portfolio.positions,
            portfolio.userId
          );
        }
      }
    } catch (error) {
      logger.error('Error running scheduled stress tests:', error);
    }
  }

  async checkRiskAlerts() {
    try {
      for (const [portfolioId, riskMetrics] of this.riskMetrics) {
        await this.riskAlertManager.checkAlerts(portfolioId, riskMetrics);
      }
    } catch (error) {
      logger.error('Error checking risk alerts:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old risk metrics
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      for (const [portfolioId, riskMetrics] of this.riskMetrics) {
        if (new Date(riskMetrics.timestamp) < cutoff) {
          this.riskMetrics.delete(portfolioId);
        }
      }
      
      // Clean up old alerts
      for (const [alertId, alert] of this.alerts) {
        if (new Date(alert.createdAt) < cutoff) {
          this.alerts.delete(alertId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async getRiskDashboard(portfolioId, userId) {
    try {
      const riskMetrics = this.riskMetrics.get(portfolioId);
      const alerts = await this.riskAlertManager.getAlerts(userId, 'active', 10);
      const correlationMatrix = await this.correlationAnalyzer.getCorrelationMatrix(portfolioId, userId);
      
      return {
        portfolioId,
        riskMetrics,
        alerts,
        correlationMatrix,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting risk dashboard:', error);
      throw error;
    }
  }

  async getRealTimeMonitoring(portfolioId, userId) {
    try {
      const riskMetrics = this.riskMetrics.get(portfolioId);
      const alerts = await this.riskAlertManager.getAlerts(userId, 'active', 5);
      const marketData = await this.marketDataProvider.getRealTimeData(portfolioId);
      
      return {
        portfolioId,
        riskMetrics,
        alerts,
        marketData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting real-time monitoring:', error);
      throw error;
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.riskCalculator.initialize();
      await this.portfolioRiskEngine.initialize();
      await this.stressTestEngine.initialize();
      await this.correlationAnalyzer.initialize();
      await this.riskAlertManager.initialize();
      await this.marketDataProvider.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Risk Monitoring System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Risk Monitoring System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Risk Monitoring System...');
    
    // Close services
    await this.riskCalculator.close();
    await this.portfolioRiskEngine.close();
    await this.stressTestEngine.close();
    await this.correlationAnalyzer.close();
    await this.riskAlertManager.close();
    await this.marketDataProvider.close();
    
    this.server.close(() => {
      logger.info('Risk Monitoring System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new RiskMonitoringSystem();
  system.start();
}

module.exports = RiskMonitoringSystem;
