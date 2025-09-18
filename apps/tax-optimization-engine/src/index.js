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
const TaxLossHarvester = require('./services/taxLossHarvester');
const TaxEfficientRebalancer = require('./services/taxEfficientRebalancer');
const TaxFormGenerator = require('./services/taxFormGenerator');
const TaxOptimizationEngine = require('./services/taxOptimizationEngine');
const TaxReportingEngine = require('./services/taxReportingEngine');
const TaxComplianceChecker = require('./services/taxComplianceChecker');
const TaxCalculationEngine = require('./services/taxCalculationEngine');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class TaxOptimizationSystem extends EventEmitter {
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
    
    this.port = process.env.PORT || 5010;
    
    // Core services
    this.taxLossHarvester = new TaxLossHarvester();
    this.taxEfficientRebalancer = new TaxEfficientRebalancer();
    this.taxFormGenerator = new TaxFormGenerator();
    this.taxOptimizationEngine = new TaxOptimizationEngine();
    this.taxReportingEngine = new TaxReportingEngine();
    this.taxComplianceChecker = new TaxComplianceChecker();
    this.taxCalculationEngine = new TaxCalculationEngine();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Tax optimization state
    this.isInitialized = false;
    this.activeOptimizations = new Map();
    this.taxForms = new Map();
    this.taxReports = new Map();
    this.optimizationStrategies = new Map();
    
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
        activeOptimizations: this.activeOptimizations.size,
        taxForms: this.taxForms.size,
        taxReports: this.taxReports.size,
        optimizationStrategies: this.optimizationStrategies.size
      });
    });

    // Tax loss harvesting endpoints
    this.app.post('/api/v1/tax-loss-harvesting/analyze',
      authenticateToken,
      validateRequest('taxLossHarvesting'),
      async (req, res) => {
        try {
          const { portfolioId, taxYear, strategies } = req.body;
          const analysis = await this.taxLossHarvester.analyzeHarvestingOpportunities(
            portfolioId, taxYear, strategies, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing tax loss harvesting:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze tax loss harvesting'
          });
        }
      }
    );

    this.app.post('/api/v1/tax-loss-harvesting/execute',
      authenticateToken,
      validateRequest('harvestingExecution'),
      async (req, res) => {
        try {
          const { portfolioId, harvestingPlan, confirmation } = req.body;
          const result = await this.taxLossHarvester.executeHarvesting(
            portfolioId, harvestingPlan, confirmation, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error executing tax loss harvesting:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to execute tax loss harvesting'
          });
        }
      }
    );

    this.app.get('/api/v1/tax-loss-harvesting/history/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { taxYear } = req.query;
          const history = await this.taxLossHarvester.getHarvestingHistory(
            portfolioId, taxYear, req.user.id
          );
          
          res.json({
            success: true,
            data: history
          });
        } catch (error) {
          logger.error('Error getting harvesting history:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get harvesting history'
          });
        }
      }
    );

    // Tax-efficient rebalancing endpoints
    this.app.post('/api/v1/rebalancing/optimize',
      authenticateToken,
      validateRequest('rebalancingOptimization'),
      async (req, res) => {
        try {
          const { portfolioId, targetAllocation, constraints } = req.body;
          const optimization = await this.taxEfficientRebalancer.optimizeRebalancing(
            portfolioId, targetAllocation, constraints, req.user.id
          );
          
          res.json({
            success: true,
            data: optimization
          });
        } catch (error) {
          logger.error('Error optimizing rebalancing:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to optimize rebalancing'
          });
        }
      }
    );

    this.app.post('/api/v1/rebalancing/execute',
      authenticateToken,
      validateRequest('rebalancingExecution'),
      async (req, res) => {
        try {
          const { portfolioId, rebalancingPlan, confirmation } = req.body;
          const result = await this.taxEfficientRebalancer.executeRebalancing(
            portfolioId, rebalancingPlan, confirmation, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error executing rebalancing:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to execute rebalancing'
          });
        }
      }
    );

    // Tax form generation endpoints
    this.app.post('/api/v1/forms/generate',
      authenticateToken,
      validateRequest('formGeneration'),
      async (req, res) => {
        try {
          const { formType, taxYear, portfolioId, format } = req.body;
          const form = await this.taxFormGenerator.generateForm(
            formType, taxYear, portfolioId, format, req.user.id
          );
          
          res.json({
            success: true,
            data: form
          });
        } catch (error) {
          logger.error('Error generating tax form:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate tax form'
          });
        }
      }
    );

    this.app.get('/api/v1/forms/:formId/download',
      authenticateToken,
      async (req, res) => {
        try {
          const { formId } = req.params;
          const formData = await this.taxFormGenerator.downloadForm(
            formId, req.user.id
          );
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${formData.filename}"`);
          res.send(formData.data);
        } catch (error) {
          logger.error('Error downloading tax form:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to download tax form'
          });
        }
      }
    );

    this.app.get('/api/v1/forms',
      authenticateToken,
      async (req, res) => {
        try {
          const { taxYear, formType, status } = req.query;
          const forms = await this.taxFormGenerator.getForms(
            req.user.id, taxYear, formType, status
          );
          
          res.json({
            success: true,
            data: forms
          });
        } catch (error) {
          logger.error('Error getting tax forms:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get tax forms'
          });
        }
      }
    );

    // Tax optimization endpoints
    this.app.post('/api/v1/optimization/analyze',
      authenticateToken,
      validateRequest('taxOptimization'),
      async (req, res) => {
        try {
          const { portfolioId, taxYear, optimizationType, parameters } = req.body;
          const analysis = await this.taxOptimizationEngine.analyzeOptimization(
            portfolioId, taxYear, optimizationType, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: analysis
          });
        } catch (error) {
          logger.error('Error analyzing tax optimization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze tax optimization'
          });
        }
      }
    );

    this.app.post('/api/v1/optimization/execute',
      authenticateToken,
      validateRequest('optimizationExecution'),
      async (req, res) => {
        try {
          const { portfolioId, optimizationPlan, confirmation } = req.body;
          const result = await this.taxOptimizationEngine.executeOptimization(
            portfolioId, optimizationPlan, confirmation, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error executing tax optimization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to execute tax optimization'
          });
        }
      }
    );

    this.app.get('/api/v1/optimization/strategies',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId, taxYear } = req.query;
          const strategies = await this.taxOptimizationEngine.getOptimizationStrategies(
            portfolioId, taxYear, req.user.id
          );
          
          res.json({
            success: true,
            data: strategies
          });
        } catch (error) {
          logger.error('Error getting optimization strategies:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get optimization strategies'
          });
        }
      }
    );

    // Tax reporting endpoints
    this.app.post('/api/v1/reports/generate',
      authenticateToken,
      validateRequest('taxReportGeneration'),
      async (req, res) => {
        try {
          const { reportType, taxYear, portfolioId, format } = req.body;
          const report = await this.taxReportingEngine.generateReport(
            reportType, taxYear, portfolioId, format, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error generating tax report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate tax report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports/:reportId/download',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId } = req.params;
          const reportData = await this.taxReportingEngine.downloadReport(
            reportId, req.user.id
          );
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
          res.send(reportData.data);
        } catch (error) {
          logger.error('Error downloading tax report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to download tax report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports',
      authenticateToken,
      async (req, res) => {
        try {
          const { taxYear, reportType, status } = req.query;
          const reports = await this.taxReportingEngine.getReports(
            req.user.id, taxYear, reportType, status
          );
          
          res.json({
            success: true,
            data: reports
          });
        } catch (error) {
          logger.error('Error getting tax reports:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get tax reports'
          });
        }
      }
    );

    // Tax compliance endpoints
    this.app.post('/api/v1/compliance/check',
      authenticateToken,
      validateRequest('taxComplianceCheck'),
      async (req, res) => {
        try {
          const { portfolioId, taxYear, jurisdiction } = req.body;
          const compliance = await this.taxComplianceChecker.checkCompliance(
            portfolioId, taxYear, jurisdiction, req.user.id
          );
          
          res.json({
            success: true,
            data: compliance
          });
        } catch (error) {
          logger.error('Error checking tax compliance:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to check tax compliance'
          });
        }
      }
    );

    this.app.get('/api/v1/compliance/status/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { taxYear } = req.query;
          const status = await this.taxComplianceChecker.getComplianceStatus(
            portfolioId, taxYear, req.user.id
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

    // Tax calculation endpoints
    this.app.post('/api/v1/calculations/calculate',
      authenticateToken,
      validateRequest('taxCalculation'),
      async (req, res) => {
        try {
          const { calculationType, parameters, taxYear } = req.body;
          const calculation = await this.taxCalculationEngine.calculateTax(
            calculationType, parameters, taxYear, req.user.id
          );
          
          res.json({
            success: true,
            data: calculation
          });
        } catch (error) {
          logger.error('Error calculating tax:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to calculate tax'
          });
        }
      }
    );

    this.app.get('/api/v1/calculations/history/:portfolioId',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.params;
          const { taxYear, calculationType } = req.query;
          const history = await this.taxCalculationEngine.getCalculationHistory(
            portfolioId, taxYear, calculationType, req.user.id
          );
          
          res.json({
            success: true,
            data: history
          });
        } catch (error) {
          logger.error('Error getting calculation history:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get calculation history'
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
      logger.info('Client connected to tax optimization system', {
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
        logger.info('Client disconnected from tax optimization system', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Run tax loss harvesting analysis daily
    cron.schedule('0 9 * * *', async () => {
      try {
        await this.runDailyTaxOptimization();
        logger.info('Daily tax optimization completed');
      } catch (error) {
        logger.error('Failed to run daily tax optimization:', error);
      }
    });

    // Generate tax forms monthly
    cron.schedule('0 10 1 * *', async () => {
      try {
        await this.generateMonthlyTaxForms();
        logger.info('Monthly tax forms generated');
      } catch (error) {
        logger.error('Failed to generate monthly tax forms:', error);
      }
    });

    // Check tax compliance weekly
    cron.schedule('0 11 * * 1', async () => {
      try {
        await this.checkWeeklyTaxCompliance();
        logger.info('Weekly tax compliance check completed');
      } catch (error) {
        logger.error('Failed to check weekly tax compliance:', error);
      }
    });

    // Clean up old data daily
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old tax optimization data cleaned up');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Tax optimization events
    this.taxOptimizationEngine.on('optimizationCompleted', (optimization) => {
      this.activeOptimizations.set(optimization.id, optimization);
      this.emit('optimizationCompleted', optimization);
    });

    this.taxOptimizationEngine.on('optimizationFailed', (error, optimization) => {
      logger.error('Tax optimization failed:', error);
      this.emit('optimizationFailed', error, optimization);
    });

    // Tax form events
    this.taxFormGenerator.on('formGenerated', (form) => {
      this.taxForms.set(form.id, form);
      this.emit('formGenerated', form);
    });

    // Tax report events
    this.taxReportingEngine.on('reportGenerated', (report) => {
      this.taxReports.set(report.id, report);
      this.emit('reportGenerated', report);
    });
  }

  async runDailyTaxOptimization() {
    try {
      // Run tax optimization for all active portfolios
      const activePortfolios = await this.getActivePortfolios();
      
      for (const portfolioId of activePortfolios) {
        try {
          await this.taxOptimizationEngine.runDailyOptimization(portfolioId);
        } catch (error) {
          logger.error(`Error optimizing portfolio ${portfolioId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error running daily tax optimization:', error);
    }
  }

  async generateMonthlyTaxForms() {
    try {
      // Generate tax forms for all portfolios
      const portfolios = await this.getActivePortfolios();
      const currentYear = new Date().getFullYear();
      
      for (const portfolioId of portfolios) {
        try {
          await this.taxFormGenerator.generateMonthlyForms(portfolioId, currentYear);
        } catch (error) {
          logger.error(`Error generating forms for portfolio ${portfolioId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error generating monthly tax forms:', error);
    }
  }

  async checkWeeklyTaxCompliance() {
    try {
      // Check tax compliance for all portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolioId of portfolios) {
        try {
          await this.taxComplianceChecker.checkWeeklyCompliance(portfolioId);
        } catch (error) {
          logger.error(`Error checking compliance for portfolio ${portfolioId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking weekly tax compliance:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old tax forms
      const cutoff = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000); // 7 years ago
      
      for (const [formId, form] of this.taxForms) {
        if (new Date(form.createdAt) < cutoff) {
          this.taxForms.delete(formId);
        }
      }
      
      // Clean up old reports
      for (const [reportId, report] of this.taxReports) {
        if (new Date(report.createdAt) < cutoff) {
          this.taxReports.delete(reportId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async getActivePortfolios() {
    try {
      // Mock implementation - in production, this would query the database
      return Array.from(this.activeOptimizations.keys());
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
      await this.taxLossHarvester.initialize();
      await this.taxEfficientRebalancer.initialize();
      await this.taxFormGenerator.initialize();
      await this.taxOptimizationEngine.initialize();
      await this.taxReportingEngine.initialize();
      await this.taxComplianceChecker.initialize();
      await this.taxCalculationEngine.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Tax Optimization Engine started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Tax Optimization Engine:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Tax Optimization Engine...');
    
    // Close services
    await this.taxLossHarvester.close();
    await this.taxEfficientRebalancer.close();
    await this.taxFormGenerator.close();
    await this.taxOptimizationEngine.close();
    await this.taxReportingEngine.close();
    await this.taxComplianceChecker.close();
    await this.taxCalculationEngine.close();
    
    this.server.close(() => {
      logger.info('Tax Optimization Engine shutdown complete');
      process.exit(0);
    });
  }
}

// Start the system
if (require.main === module) {
  const system = new TaxOptimizationSystem();
  system.start();
}

module.exports = TaxOptimizationSystem;
