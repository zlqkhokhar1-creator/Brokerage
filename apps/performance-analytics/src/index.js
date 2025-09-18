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
const PerformanceAttributionAnalyzer = require('./services/performanceAttributionAnalyzer');
const RiskAdjustedReturnsCalculator = require('./services/riskAdjustedReturnsCalculator');
const BenchmarkComparisonEngine = require('./services/benchmarkComparisonEngine');
const FactorAnalyzer = require('./services/factorAnalyzer');
const PeerComparisonEngine = require('./services/peerComparisonEngine');
const PerformanceVisualizationEngine = require('./services/performanceVisualizationEngine');
const PerformanceReportingEngine = require('./services/performanceReportingEngine');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class PerformanceAnalyticsSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5011;
    
    // Core services
    this.performanceAttributionAnalyzer = new PerformanceAttributionAnalyzer();
    this.riskAdjustedReturnsCalculator = new RiskAdjustedReturnsCalculator();
    this.benchmarkComparisonEngine = new BenchmarkComparisonEngine();
    this.factorAnalyzer = new FactorAnalyzer();
    this.peerComparisonEngine = new PeerComparisonEngine();
    this.performanceVisualizationEngine = new PerformanceVisualizationEngine();
    this.performanceReportingEngine = new PerformanceReportingEngine();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Performance analytics state
    this.isInitialized = false;
    this.activeAnalyses = new Map();
    this.performanceReports = new Map();
    this.benchmarkData = new Map();
    this.visualizationCache = new Map();
    
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
        activeAnalyses: this.activeAnalyses.size,
        performanceReports: this.performanceReports.size,
        benchmarkData: this.benchmarkData.size,
        visualizationCache: this.visualizationCache.size
      });
    });

    // Performance attribution analysis endpoints
    this.app.post('/api/v1/attribution/analyze',
      authenticateToken,
      validateRequest('attributionAnalysis'),
      async (req, res) => {
        try {
          const { portfolioId, timeRange, attributionType } = req.body;
          const analysis = await this.performanceAttributionAnalyzer.analyzeAttribution(
            portfolioId, timeRange, attributionType, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing performance attribution:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze performance attribution'
          });
        }
      }
    );

    this.app.get('/api/v1/attribution/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { timeRange } = req.query;
          const attribution = await this.performanceAttributionAnalyzer.getAttribution(
            portfolioId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: attribution
          });
        } catch (error) {
          logger.error('Error getting performance attribution:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get performance attribution'
          });
        }
      }
    );

    // Risk-adjusted returns endpoints
    this.app.post('/api/v1/risk-adjusted/calculate',
      authenticateToken,
      validateRequest('riskAdjustedCalculation'),
      async (req, res) => {
        try {
          const { portfolioId, timeRange, riskFreeRate, metrics } = req.body;
          const calculation = await this.riskAdjustedReturnsCalculator.calculateRiskAdjustedReturns(
            portfolioId, timeRange, riskFreeRate, metrics, req.user.id
          );
          
          res.json({
            success: true,
            data: calculation
          });
        } catch (error) {
          logger.error('Error calculating risk-adjusted returns:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate risk-adjusted returns'
          });
        }
      }
    );

    this.app.get('/api/v1/risk-adjusted/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { timeRange } = req.query;
          const riskAdjusted = await this.riskAdjustedReturnsCalculator.getRiskAdjustedReturns(
            portfolioId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: riskAdjusted
          });
        } catch (error) {
          logger.error('Error getting risk-adjusted returns:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get risk-adjusted returns'
          });
        }
      }
    );

    // Benchmark comparison endpoints
    this.app.post('/api/v1/benchmark/compare',
      authenticateToken,
      validateRequest('benchmarkComparison'),
      async (req, res) => {
        try {
          const { portfolioId, benchmarkId, timeRange, metrics } = req.body;
          const comparison = await this.benchmarkComparisonEngine.compareToBenchmark(
            portfolioId, benchmarkId, timeRange, metrics, req.user.id
          );
          
          res.json({
            success: true,
            data: comparison
          });
        } catch (error) {
          logger.error('Error comparing to benchmark:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to compare to benchmark'
          });
        }
      }
    );

    this.app.get('/api/v1/benchmark/available',
      authenticateToken,
      async (req, res) => {
        try {
          const { assetClass, region } = req.query;
          const benchmarks = await this.benchmarkComparisonEngine.getAvailableBenchmarks(
            assetClass, region, req.user.id
          );
          
          res.json({
            success: true,
            data: benchmarks
          });
        } catch (error) {
          logger.error('Error getting available benchmarks:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get available benchmarks'
          });
        }
      }
    );

    // Factor analysis endpoints
    this.app.post('/api/v1/factor/analyze',
      authenticateToken,
      validateRequest('factorAnalysis'),
      async (req, res) => {
        try {
          const { portfolioId, timeRange, factorModel, factors } = req.body;
          const analysis = await this.factorAnalyzer.analyzeFactors(
            portfolioId, timeRange, factorModel, factors, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing factors:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze factors'
          });
        }
      }
    );

    this.app.get('/api/v1/factor/exposures/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { timeRange } = req.query;
          const exposures = await this.factorAnalyzer.getFactorExposures(
            portfolioId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: exposures
          });
        } catch (error) {
          logger.error('Error getting factor exposures:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get factor exposures'
          });
        }
      }
    );

    // Peer comparison endpoints
    this.app.post('/api/v1/peer/compare',
      authenticateToken,
      validateRequest('peerComparison'),
      async (req, res) => {
        try {
          const { portfolioId, peerGroup, timeRange, metrics } = req.body;
          const comparison = await this.peerComparisonEngine.compareToPeers(
            portfolioId, peerGroup, timeRange, metrics, req.user.id
          );
          
          res.json({
            success: true,
            data: comparison
          });
        } catch (error) {
          logger.error('Error comparing to peers:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to compare to peers'
          });
        }
      }
    );

    this.app.get('/api/v1/peer/groups',
      authenticateToken,
      async (req, res) => {
        try {
          const { assetClass, strategy, size } = req.query;
          const peerGroups = await this.peerComparisonEngine.getPeerGroups(
            assetClass, strategy, size, req.user.id
          );
          
          res.json({
            success: true,
            data: peerGroups
          });
        } catch (error) {
          logger.error('Error getting peer groups:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get peer groups'
          });
        }
      }
    );

    // Performance visualization endpoints
    this.app.post('/api/v1/visualization/generate',
      authenticateToken,
      validateRequest('visualizationGeneration'),
      async (req, res) => {
        try {
          const { portfolioId, visualizationType, parameters, format } = req.body;
          const visualization = await this.performanceVisualizationEngine.generateVisualization(
            portfolioId, visualizationType, parameters, format, req.user.id
          );
          
          res.json({
            success: true,
            data: visualization
          });
        } catch (error) {
          logger.error('Error generating visualization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate visualization'
          });
        }
      }
    );

    this.app.get('/api/v1/visualization/:visualizationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { visualizationId } = req.params;
          const visualization = await this.performanceVisualizationEngine.getVisualization(
            visualizationId, req.user.id
          );
          
          res.json({
            success: true,
            data: visualization
          });
        } catch (error) {
          logger.error('Error getting visualization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get visualization'
          });
        }
      }
    );

    // Performance reporting endpoints
    this.app.post('/api/v1/reports/generate',
      authenticateToken,
      validateRequest('performanceReportGeneration'),
      async (req, res) => {
        try {
          const { portfolioId, reportType, timeRange, format, parameters } = req.body;
          const report = await this.performanceReportingEngine.generateReport(
            portfolioId, reportType, timeRange, format, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error generating performance report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate performance report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports/:reportId/download',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId } = req.params;
          const reportData = await this.performanceReportingEngine.downloadReport(
            reportId, req.user.id
          );
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
          res.send(reportData.data);
        } catch (error) {
          logger.error('Error downloading performance report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to download performance report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId, reportType, status, limit = 100 } = req.query;
          const reports = await this.performanceReportingEngine.getReports(
            req.user.id, portfolioId, reportType, status, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: reports
          });
        } catch (error) {
          logger.error('Error getting performance reports:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get performance reports'
          });
        }
      }
    );

    // Performance dashboard endpoints
    this.app.get('/api/v1/dashboard/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { timeRange } = req.query;
          const dashboard = await this.getPerformanceDashboard(
            portfolioId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error getting performance dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get performance dashboard'
          });
        }
      }
    );

    // Performance metrics endpoints
    this.app.get('/api/v1/metrics/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { timeRange, metrics } = req.query;
          const performanceMetrics = await this.getPerformanceMetrics(
            portfolioId, timeRange, metrics, req.user.id
          );
          
          res.json({
            success: true,
            data: performanceMetrics
          });
        } catch (error) {
          logger.error('Error getting performance metrics:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get performance metrics'
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
      logger.info('Client connected to performance analytics system', {
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
        logger.info('Client disconnected from performance analytics system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update performance metrics every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.updatePerformanceMetrics();
        logger.info('Performance metrics updated');
      } catch (error) {
        logger.error('Failed to update performance metrics:', error);
      }
    });

    // Generate performance reports daily
    cron.schedule('0 6 * * *', async () => {
      try {
        await this.generateDailyPerformanceReports();
        logger.info('Daily performance reports generated');
      } catch (error) {
        logger.error('Failed to generate daily performance reports:', error);
      }
    });

    // Update benchmark data daily
    cron.schedule('0 8 * * *', async () => {
      try {
        await this.updateBenchmarkData();
        logger.info('Benchmark data updated');
      } catch (error) {
        logger.error('Failed to update benchmark data:', error);
      }
    });

    // Clean up old data weekly
    cron.schedule('0 2 * * 0', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old performance analytics data cleaned up');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Performance analysis events
    this.performanceAttributionAnalyzer.on('analysisCompleted', (analysis) => {
      this.activeAnalyses.set(analysis.id, analysis);
      this.emit('analysisCompleted', analysis);
    });

    this.performanceAttributionAnalyzer.on('analysisFailed', (error, analysis) => {
      logger.error('Performance analysis failed:', error);
      this.emit('analysisFailed', error, analysis);
    });

    // Performance report events
    this.performanceReportingEngine.on('reportGenerated', (report) => {
      this.performanceReports.set(report.id, report);
      this.emit('reportGenerated', report);
    });

    // Benchmark data events
    this.benchmarkComparisonEngine.on('benchmarkDataUpdated', (benchmark) => {
      this.benchmarkData.set(benchmark.id, benchmark);
      this.emit('benchmarkDataUpdated', benchmark);
    });
  }

  async updatePerformanceMetrics() {
    try {
      // Update performance metrics for all active portfolios
      const activePortfolios = await this.getActivePortfolios();
      
      for (const portfolioId of activePortfolios) {
        try {
          await this.performanceAttributionAnalyzer.updateMetrics(portfolioId);
          await this.riskAdjustedReturnsCalculator.updateMetrics(portfolioId);
        } catch (error) {
          logger.error(`Error updating metrics for portfolio ${portfolioId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating performance metrics:', error);
    }
  }

  async generateDailyPerformanceReports() {
    try {
      // Generate daily performance reports for all portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolioId of portfolios) {
        try {
          await this.performanceReportingEngine.generateDailyReport(portfolioId);
        } catch (error) {
          logger.error(`Error generating daily report for portfolio ${portfolioId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error generating daily performance reports:', error);
    }
  }

  async updateBenchmarkData() {
    try {
      // Update benchmark data for all available benchmarks
      const benchmarks = await this.benchmarkComparisonEngine.getAvailableBenchmarks();
      
      for (const benchmark of benchmarks) {
        try {
          await this.benchmarkComparisonEngine.updateBenchmarkData(benchmark.id);
        } catch (error) {
          logger.error(`Error updating benchmark ${benchmark.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating benchmark data:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old performance analyses
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      for (const [analysisId, analysis] of this.activeAnalyses) {
        if (new Date(analysis.createdAt) < cutoff) {
          this.activeAnalyses.delete(analysisId);
        }
      }
      
      // Clean up old visualizations
      for (const [visualizationId, visualization] of this.visualizationCache) {
        if (new Date(visualization.createdAt) < cutoff) {
          this.visualizationCache.delete(visualizationId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async getPerformanceDashboard(portfolioId, timeRange, userId) {
    try {
      const attribution = await this.performanceAttributionAnalyzer.getAttribution(portfolioId, timeRange, userId);
      const riskAdjusted = await this.riskAdjustedReturnsCalculator.getRiskAdjustedReturns(portfolioId, timeRange, userId);
      const benchmarkComparison = await this.benchmarkComparisonEngine.getLatestComparison(portfolioId, userId);
      const factorExposures = await this.factorAnalyzer.getFactorExposures(portfolioId, timeRange, userId);
      
      return {
        portfolioId,
        timeRange,
        attribution,
        riskAdjusted,
        benchmarkComparison,
        factorExposures,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting performance dashboard:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(portfolioId, timeRange, metrics, userId) {
    try {
      const performanceMetrics = {};
      
      if (!metrics || metrics.includes('attribution')) {
        performanceMetrics.attribution = await this.performanceAttributionAnalyzer.getAttribution(portfolioId, timeRange, userId);
      }
      
      if (!metrics || metrics.includes('riskAdjusted')) {
        performanceMetrics.riskAdjusted = await this.riskAdjustedReturnsCalculator.getRiskAdjustedReturns(portfolioId, timeRange, userId);
      }
      
      if (!metrics || metrics.includes('benchmark')) {
        performanceMetrics.benchmark = await this.benchmarkComparisonEngine.getLatestComparison(portfolioId, userId);
      }
      
      if (!metrics || metrics.includes('factors')) {
        performanceMetrics.factors = await this.factorAnalyzer.getFactorExposures(portfolioId, timeRange, userId);
      }
      
      return performanceMetrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async getActivePortfolios() {
    try {
      // Mock implementation - in production, this would query the database
      return Array.from(this.activeAnalyses.keys());
    } catch (error) {
      logger.error('Error getting active portfolios:', error);
      return [];
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.performanceAttributionAnalyzer.initialize();
      await this.riskAdjustedReturnsCalculator.initialize();
      await this.benchmarkComparisonEngine.initialize();
      await this.factorAnalyzer.initialize();
      await this.peerComparisonEngine.initialize();
      await this.performanceVisualizationEngine.initialize();
      await this.performanceReportingEngine.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Performance Analytics System started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Performance Analytics System:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Performance Analytics System...');
    
    // Close services
    await this.performanceAttributionAnalyzer.close();
    await this.riskAdjustedReturnsCalculator.close();
    await this.benchmarkComparisonEngine.close();
    await this.factorAnalyzer.close();
    await this.peerComparisonEngine.close();
    await this.performanceVisualizationEngine.close();
    await this.performanceReportingEngine.close();
    
    this.server.close(() => {
      logger.info('Performance Analytics System shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new PerformanceAnalyticsSystem();
  system.start();
}

module.exports = PerformanceAnalyticsSystem;
