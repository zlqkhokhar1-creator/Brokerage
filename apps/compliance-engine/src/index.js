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
const ComplianceRuleEngine = require('./services/complianceRuleEngine');
const RegulatoryReporter = require('./services/regulatoryReporter');
const KYCAnalyzer = require('./services/kycAnalyzer');
const AMLEngine = require('./services/amlEngine');
const TradeSurveillance = require('./services/tradeSurveillance');
const PatternDayTradingDetector = require('./services/patternDayTradingDetector');
const WashSaleDetector = require('./services/washSaleDetector');
const ComplianceAuditor = require('./services/complianceAuditor');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class ComplianceEngine extends EventEmitter {
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
    
    this.port = process.env.PORT || 5008;
    
    // Core services
    this.complianceRuleEngine = new ComplianceRuleEngine();
    this.regulatoryReporter = new RegulatoryReporter();
    this.kycAnalyzer = new KYCAnalyzer();
    this.amlEngine = new AMLEngine();
    this.tradeSurveillance = new TradeSurveillance();
    this.patternDayTradingDetector = new PatternDayTradingDetector();
    this.washSaleDetector = new WashSaleDetector();
    this.complianceAuditor = new ComplianceAuditor();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Compliance state
    this.isInitialized = false;
    this.activeRules = new Map();
    this.complianceViolations = new Map();
    this.regulatoryReports = new Map();
    this.kycCases = new Map();
    this.amlAlerts = new Map();
    
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
        activeRules: this.activeRules.size,
        violations: this.complianceViolations.size,
        reports: this.regulatoryReports.size,
        kycCases: this.kycCases.size,
        amlAlerts: this.amlAlerts.size
      });
    });

    // Compliance rules endpoints
    this.app.get('/api/v1/rules',
      authenticateToken,
      async (req, res) => {
        try {
          const { category, status } = req.query;
          const rules = await this.complianceRuleEngine.getRules(category, status);
          
          res.json({
            success: true,
            data: rules
          });
        } catch (error) {
          logger.error('Error getting compliance rules:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get compliance rules'
          });
        }
      }
    );

    this.app.post('/api/v1/rules',
      authenticateToken,
      validateRequest('complianceRule'),
      async (req, res) => {
        try {
          const rule = await this.complianceRuleEngine.createRule(req.body, req.user.id);
          
          res.json({
            success: true,
            data: rule
          });
        } catch (error) {
          logger.error('Error creating compliance rule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create compliance rule'
          });
        }
      }
    );

    this.app.put('/api/v1/rules/:ruleId',
      authenticateToken,
      validateRequest('complianceRuleUpdate'),
      async (req, res) => {
        try {
          const { ruleId } = req.params;
          const rule = await this.complianceRuleEngine.updateRule(ruleId, req.body, req.user.id);
          
          res.json({
            success: true,
            data: rule
          });
        } catch (error) {
          logger.error('Error updating compliance rule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to update compliance rule'
          });
        }
      }
    );

    this.app.delete('/api/v1/rules/:ruleId',
      authenticateToken,
      async (req, res) => {
        try {
          const { ruleId } = req.params;
          await this.complianceRuleEngine.deleteRule(ruleId, req.user.id);
          
          res.json({
            success: true,
            message: 'Rule deleted successfully'
          });
        } catch (error) {
          logger.error('Error deleting compliance rule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to delete compliance rule'
          });
        }
      }
    );

    // Compliance violations endpoints
    this.app.get('/api/v1/violations',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, severity, limit = 100 } = req.query;
          const violations = await this.complianceRuleEngine.getViolations(
            req.user.id, status, severity, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: violations
          });
        } catch (error) {
          logger.error('Error getting compliance violations:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get compliance violations'
          });
        }
      }
    );

    this.app.post('/api/v1/violations/:violationId/acknowledge',
      authenticateToken,
      async (req, res) => {
        try {
          const { violationId } = req.params;
          const violation = await this.complianceRuleEngine.acknowledgeViolation(
            violationId, req.user.id
          );
          
          res.json({
            success: true,
            data: violation
          });
        } catch (error) {
          logger.error('Error acknowledging violation:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to acknowledge violation'
          });
        }
      }
    );

    this.app.post('/api/v1/violations/:violationId/resolve',
      authenticateToken,
      validateRequest('violationResolution'),
      async (req, res) => {
        try {
          const { violationId } = req.params;
          const { resolution, notes } = req.body;
          const violation = await this.complianceRuleEngine.resolveViolation(
            violationId, resolution, notes, req.user.id
          );
          
          res.json({
            success: true,
            data: violation
          });
        } catch (error) {
          logger.error('Error resolving violation:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to resolve violation'
          });
        }
      }
    );

    // KYC endpoints
    this.app.post('/api/v1/kyc/analyze',
      authenticateToken,
      validateRequest('kycAnalysis'),
      async (req, res) => {
        try {
          const { userId, documents, personalInfo } = req.body;
          const kycResult = await this.kycAnalyzer.analyzeKYC(
            userId, documents, personalInfo, req.user.id
          );
          
          res.json({
            success: true,
            data: kycResult
          });
        } catch (error) {
          logger.error('Error analyzing KYC:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to analyze KYC'
          });
        }
      }
    );

    this.app.get('/api/v1/kyc/:userId/status',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const kycStatus = await this.kycAnalyzer.getKYCStatus(userId, req.user.id);
          
          res.json({
            success: true,
            data: kycStatus
          });
        } catch (error) {
          logger.error('Error getting KYC status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get KYC status'
          });
        }
      }
    );

    this.app.post('/api/v1/kyc/:userId/verify',
      authenticateToken,
      validateRequest('kycVerification'),
      async (req, res) => {
        try {
          const { userId } = req.params;
          const { verificationData } = req.body;
          const result = await this.kycAnalyzer.verifyKYC(
            userId, verificationData, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error verifying KYC:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to verify KYC'
          });
        }
      }
    );

    // AML endpoints
    this.app.post('/api/v1/aml/scan',
      authenticateToken,
      validateRequest('amlScan'),
      async (req, res) => {
        try {
          const { userId, transactions, customerData } = req.body;
          const amlResult = await this.amlEngine.scanTransactions(
            userId, transactions, customerData, req.user.id
          );
          
          res.json({
            success: true,
            data: amlResult
          });
        } catch (error) {
          logger.error('Error scanning AML:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to scan AML'
          });
        }
      }
    );

    this.app.get('/api/v1/aml/alerts',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, severity, limit = 100 } = req.query;
          const alerts = await this.amlEngine.getAlerts(
            req.user.id, status, severity, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: alerts
          });
        } catch (error) {
          logger.error('Error getting AML alerts:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get AML alerts'
          });
        }
      }
    );

    this.app.post('/api/v1/aml/alerts/:alertId/investigate',
      authenticateToken,
      validateRequest('amlInvestigation'),
      async (req, res) => {
        try {
          const { alertId } = req.params;
          const { investigationData } = req.body;
          const result = await this.amlEngine.investigateAlert(
            alertId, investigationData, req.user.id
          );
          
          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          logger.error('Error investigating AML alert:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to investigate AML alert'
          });
        }
      }
    );

    // Trade surveillance endpoints
    this.app.post('/api/v1/surveillance/scan',
      authenticateToken,
      validateRequest('surveillanceScan'),
      async (req, res) => {
        try {
          const { trades, marketData, timeRange } = req.body;
          const surveillanceResult = await this.tradeSurveillance.scanTrades(
            trades, marketData, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: surveillanceResult
          });
        } catch (error) {
          logger.error('Error scanning trades:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to scan trades'
          });
        }
      }
    );

    this.app.get('/api/v1/surveillance/patterns',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId, timeRange } = req.query;
          const patterns = await this.tradeSurveillance.getSuspiciousPatterns(
            userId, timeRange, req.user.id
          );
          
          res.json({
            success: true,
            data: patterns
          });
        } catch (error) {
          logger.error('Error getting suspicious patterns:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get suspicious patterns'
          });
        }
      }
    );

    // Pattern Day Trading detection endpoints
    this.app.get('/api/v1/pdt/status/:userId',
      authenticateToken,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const pdtStatus = await this.patternDayTradingDetector.getPDTStatus(
            userId, req.user.id
          );
          
          res.json({
            success: true,
            data: pdtStatus
          });
        } catch (error) {
          logger.error('Error getting PDT status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get PDT status'
          });
        }
      }
    );

    this.app.post('/api/v1/pdt/check',
      authenticateToken,
      validateRequest('pdtCheck'),
      async (req, res) => {
        try {
          const { userId, trades } = req.body;
          const pdtResult = await this.patternDayTradingDetector.checkPDT(
            userId, trades, req.user.id
          );
          
          res.json({
            success: true,
            data: pdtResult
          });
        } catch (error) {
          logger.error('Error checking PDT:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to check PDT'
          });
        }
      }
    );

    // Wash sale detection endpoints
    this.app.post('/api/v1/wash-sale/check',
      authenticateToken,
      validateRequest('washSaleCheck'),
      async (req, res) => {
        try {
          const { userId, trades } = req.body;
          const washSaleResult = await this.washSaleDetector.checkWashSales(
            userId, trades, req.user.id
          );
          
          res.json({
            success: true,
            data: washSaleResult
          });
        } catch (error) {
          logger.error('Error checking wash sales:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to check wash sales'
          });
        }
      }
    );

    // Regulatory reporting endpoints
    this.app.get('/api/v1/reports',
      authenticateToken,
      async (req, res) => {
        try {
          const { type, status, limit = 100 } = req.query;
          const reports = await this.regulatoryReporter.getReports(
            req.user.id, type, status, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: reports
          });
        } catch (error) {
          logger.error('Error getting regulatory reports:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get regulatory reports'
          });
        }
      }
    );

    this.app.post('/api/v1/reports/generate',
      authenticateToken,
      validateRequest('reportGeneration'),
      async (req, res) => {
        try {
          const { reportType, parameters, format } = req.body;
          const report = await this.regulatoryReporter.generateReport(
            reportType, parameters, format, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error generating report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports/:reportId/download',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId } = req.params;
          const reportData = await this.regulatoryReporter.downloadReport(
            reportId, req.user.id
          );
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
          res.send(reportData.data);
        } catch (error) {
          logger.error('Error downloading report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to download report'
          });
        }
      }
    );

    // Compliance audit endpoints
    this.app.get('/api/v1/audit/status',
      authenticateToken,
      async (req, res) => {
        try {
          const { portfolioId } = req.query;
          const auditStatus = await this.complianceAuditor.getAuditStatus(
            portfolioId, req.user.id
          );
          
          res.json({
            success: true,
            data: auditStatus
          });
        } catch (error) {
          logger.error('Error getting audit status:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get audit status'
          });
        }
      }
    );

    this.app.post('/api/v1/audit/run',
      authenticateToken,
      validateRequest('auditRun'),
      async (req, res) => {
        try {
          const { auditType, scope, parameters } = req.body;
          const auditResult = await this.complianceAuditor.runAudit(
            auditType, scope, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: auditResult
          });
        } catch (error) {
          logger.error('Error running audit:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to run audit'
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
      logger.info('Client connected to compliance engine', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, userId, portfolioId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { userId, portfolioId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, userId, portfolioId } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { userId, portfolioId });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from compliance engine', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Check compliance rules every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.checkComplianceRules();
        logger.info('Compliance rules checked');
      } catch (error) {
        logger.error('Failed to check compliance rules:', error);
      }
    });

    // Generate regulatory reports daily
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.generateDailyReports();
        logger.info('Daily regulatory reports generated');
      } catch (error) {
        logger.error('Failed to generate daily reports:', error);
      }
    });

    // Run compliance audits weekly
    cron.schedule('0 3 * * 1', async () => {
      try {
        await this.runWeeklyAudits();
        logger.info('Weekly compliance audits completed');
      } catch (error) {
        logger.error('Failed to run weekly audits:', error);
      }
    });

    // Clean up old data daily
    cron.schedule('0 4 * * *', async () => {
      try {
        await this.cleanupOldData();
        logger.info('Old compliance data cleaned up');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
      }
    });
  }

  setupEventHandlers() {
    // Compliance violation events
    this.complianceRuleEngine.on('violationDetected', (violation) => {
      this.complianceViolations.set(violation.id, violation);
      this.emit('violationDetected', violation);
    });

    this.complianceRuleEngine.on('violationResolved', (violation) => {
      this.complianceViolations.delete(violation.id);
      this.emit('violationResolved', violation);
    });

    // KYC events
    this.kycAnalyzer.on('kycStatusChanged', (kycCase) => {
      this.kycCases.set(kycCase.id, kycCase);
      this.emit('kycStatusChanged', kycCase);
    });

    // AML events
    this.amlEngine.on('alertGenerated', (alert) => {
      this.amlAlerts.set(alert.id, alert);
      this.emit('alertGenerated', alert);
    });

    // Regulatory reporting events
    this.regulatoryReporter.on('reportGenerated', (report) => {
      this.regulatoryReports.set(report.id, report);
      this.emit('reportGenerated', report);
    });
  }

  async checkComplianceRules() {
    try {
      // Check all active compliance rules
      for (const [ruleId, rule] of this.activeRules) {
        try {
          await this.complianceRuleEngine.checkRule(ruleId);
        } catch (error) {
          logger.error(`Error checking rule ${ruleId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking compliance rules:', error);
    }
  }

  async generateDailyReports() {
    try {
      // Generate daily regulatory reports
      const reportTypes = ['FINRA_OATS', 'SEC_RULE_606', 'TRACE', 'CTR', 'SAR'];
      
      for (const reportType of reportTypes) {
        try {
          await this.regulatoryReporter.generateReport(
            reportType,
            { date: new Date().toISOString().split('T')[0] },
            'CSV',
            'system'
          );
        } catch (error) {
          logger.error(`Error generating ${reportType} report:`, error);
        }
      }
    } catch (error) {
      logger.error('Error generating daily reports:', error);
    }
  }

  async runWeeklyAudits() {
    try {
      // Run weekly compliance audits
      const auditTypes = ['TRADE_SURVEILLANCE', 'KYC_COMPLIANCE', 'AML_COMPLIANCE', 'REGULATORY_REPORTING'];
      
      for (const auditType of auditTypes) {
        try {
          await this.complianceAuditor.runAudit(
            auditType,
            'ALL',
            {},
            'system'
          );
        } catch (error) {
          logger.error(`Error running ${auditType} audit:`, error);
        }
      }
    } catch (error) {
      logger.error('Error running weekly audits:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old violations
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      for (const [violationId, violation] of this.complianceViolations) {
        if (new Date(violation.createdAt) < cutoff && violation.status === 'resolved') {
          this.complianceViolations.delete(violationId);
        }
      }
      
      // Clean up old reports
      for (const [reportId, report] of this.regulatoryReports) {
        if (new Date(report.createdAt) < cutoff) {
          this.regulatoryReports.delete(reportId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.complianceRuleEngine.initialize();
      await this.regulatoryReporter.initialize();
      await this.kycAnalyzer.initialize();
      await this.amlEngine.initialize();
      await this.tradeSurveillance.initialize();
      await this.patternDayTradingDetector.initialize();
      await this.washSaleDetector.initialize();
      await this.complianceAuditor.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Compliance Engine started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Compliance Engine:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Compliance Engine...');
    
    // Close services
    await this.complianceRuleEngine.close();
    await this.regulatoryReporter.close();
    await this.kycAnalyzer.close();
    await this.amlEngine.close();
    await this.tradeSurveillance.close();
    await this.patternDayTradingDetector.close();
    await this.washSaleDetector.close();
    await this.complianceAuditor.close();
    
    this.server.close(() => {
      logger.info('Compliance Engine shutdown complete');
      process.exit(0);
    });
  }
}

// Start the engine
if (require.main === module) {
  const engine = new ComplianceEngine();
  engine.start();
}

module.exports = ComplianceEngine;
