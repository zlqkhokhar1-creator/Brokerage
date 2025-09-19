const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const { logger } = require('./utils/logger');
const { authenticateToken, requireRole } = require('./middleware/auth');
const { validateRequest, validateQuery, schemas } = require('./middleware/validation');

// Import services
const ComplianceEngine = require('./services/complianceEngine');
const RegulatoryReporting = require('./services/regulatoryReporting');
const KYCService = require('./services/kycService');
const TradeSurveillance = require('./services/tradeSurveillance');
const AuditTrail = require('./services/auditTrail');
const PolicyManager = require('./services/policyManager');
const WebSocketManager = require('./services/webSocketManager');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize services
const complianceEngine = new ComplianceEngine();
const regulatoryReporting = new RegulatoryReporting();
const kycService = new KYCService();
const tradeSurveillance = new TradeSurveillance();
const auditTrail = new AuditTrail();
const policyManager = new PolicyManager();
const webSocketManager = new WebSocketManager(io);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'compliance-engine',
    version: '1.0.0'
  });
});

// API Routes

// Compliance Engine Routes
app.post('/api/compliance/check', authenticateToken, validateRequest(schemas.complianceCheck), async (req, res) => {
  try {
    const result = await complianceEngine.checkCompliance(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Compliance check error:', error);
    res.status(500).json({ error: 'Compliance check failed' });
  }
});

app.get('/api/compliance/status/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const status = await complianceEngine.getComplianceStatus(req.params.portfolioId, req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Get compliance status error:', error);
    res.status(500).json({ error: 'Failed to get compliance status' });
  }
});

// Regulatory Reporting Routes
app.post('/api/regulatory/generate-report', authenticateToken, requireRole(['admin', 'compliance']), validateRequest(schemas.regulatoryReport), async (req, res) => {
  try {
    const report = await regulatoryReporting.generateReport(req.body, req.user);
    res.json(report);
  } catch (error) {
    logger.error('Generate regulatory report error:', error);
    res.status(500).json({ error: 'Failed to generate regulatory report' });
  }
});

app.get('/api/regulatory/reports', authenticateToken, requireRole(['admin', 'compliance']), validateQuery(schemas.reportQuery), async (req, res) => {
  try {
    const reports = await regulatoryReporting.getReports(req.query, req.user.id);
    res.json(reports);
  } catch (error) {
    logger.error('Get regulatory reports error:', error);
    res.status(500).json({ error: 'Failed to get regulatory reports' });
  }
});

// KYC Service Routes
app.post('/api/kyc/verify', authenticateToken, validateRequest(schemas.kycVerification), async (req, res) => {
  try {
    const result = await kycService.verifyCustomer(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('KYC verification error:', error);
    res.status(500).json({ error: 'KYC verification failed' });
  }
});

app.get('/api/kyc/status/:customerId', authenticateToken, async (req, res) => {
  try {
    const status = await kycService.getVerificationStatus(req.params.customerId, req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Get KYC status error:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

// Trade Surveillance Routes
app.post('/api/surveillance/monitor', authenticateToken, requireRole(['admin', 'compliance']), validateRequest(schemas.tradeSurveillance), async (req, res) => {
  try {
    const result = await tradeSurveillance.monitorTrades(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Trade surveillance error:', error);
    res.status(500).json({ error: 'Trade surveillance failed' });
  }
});

app.get('/api/surveillance/alerts', authenticateToken, requireRole(['admin', 'compliance']), validateQuery(schemas.alertQuery), async (req, res) => {
  try {
    const alerts = await tradeSurveillance.getAlerts(req.query, req.user.id);
    res.json(alerts);
  } catch (error) {
    logger.error('Get surveillance alerts error:', error);
    res.status(500).json({ error: 'Failed to get surveillance alerts' });
  }
});

// Audit Trail Routes
app.get('/api/audit/trail', authenticateToken, requireRole(['admin', 'compliance']), validateQuery(schemas.auditQuery), async (req, res) => {
  try {
    const trail = await auditTrail.getAuditTrail(req.query, req.user.id);
    res.json(trail);
  } catch (error) {
    logger.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

app.post('/api/audit/log', authenticateToken, validateRequest(schemas.auditLog), async (req, res) => {
  try {
    await auditTrail.logEvent(req.body, req.user);
    res.json({ success: true });
  } catch (error) {
    logger.error('Log audit event error:', error);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
});

// Policy Manager Routes
app.get('/api/policies', authenticateToken, async (req, res) => {
  try {
    const policies = await policyManager.getPolicies(req.user.id);
    res.json(policies);
  } catch (error) {
    logger.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

app.post('/api/policies', authenticateToken, requireRole(['admin', 'compliance']), validateRequest(schemas.policy), async (req, res) => {
  try {
    const policy = await policyManager.createPolicy(req.body, req.user);
    res.json(policy);
  } catch (error) {
    logger.error('Create policy error:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe', (data) => {
    webSocketManager.subscribe(socket.id, data.type, data);
  });
  
  socket.on('unsubscribe', (data) => {
    webSocketManager.unsubscribe(socket.id, data.type, data);
  });
  
  socket.on('disconnect', () => {
    webSocketManager.handleDisconnect(socket.id);
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Event handlers
complianceEngine.on('complianceViolation', (data) => {
  webSocketManager.broadcastComplianceViolation(data.portfolioId, data);
  logger.security('Compliance violation detected', data.portfolioId, data);
});

regulatoryReporting.on('reportGenerated', (data) => {
  webSocketManager.broadcastReportGenerated(data.userId, data);
  logger.info('Regulatory report generated', data);
});

kycService.on('kycStatusChanged', (data) => {
  webSocketManager.broadcastKYCStatusChanged(data.customerId, data);
  logger.info('KYC status changed', data);
});

tradeSurveillance.on('surveillanceAlert', (data) => {
  webSocketManager.broadcastSurveillanceAlert(data.userId, data);
  logger.security('Trade surveillance alert', data.userId, data);
});

// Cron jobs
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Running daily compliance checks...');
    await complianceEngine.runDailyChecks();
  } catch (error) {
    logger.error('Daily compliance checks failed:', error);
  }
});

cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Running monthly regulatory reporting...');
    await regulatoryReporting.runMonthlyReporting();
  } catch (error) {
    logger.error('Monthly regulatory reporting failed:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Running trade surveillance checks...');
    await tradeSurveillance.runSurveillanceChecks();
  } catch (error) {
    logger.error('Trade surveillance checks failed:', error);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Initialize services
async function initialize() {
  try {
    await complianceEngine.initialize();
    await regulatoryReporting.initialize();
    await kycService.initialize();
    await tradeSurveillance.initialize();
    await auditTrail.initialize();
    await policyManager.initialize();
    
    logger.info('Compliance Engine initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Compliance Engine:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  try {
    await complianceEngine.close();
    await regulatoryReporting.close();
    await kycService.close();
    await tradeSurveillance.close();
    await auditTrail.close();
    await policyManager.close();
    await webSocketManager.close();
    
    server.close(() => {
      logger.info('Compliance Engine shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  try {
    await complianceEngine.close();
    await regulatoryReporting.close();
    await kycService.close();
    await tradeSurveillance.close();
    await auditTrail.close();
    await policyManager.close();
    await webSocketManager.close();
    
    server.close(() => {
      logger.info('Compliance Engine shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
const PORT = process.env.PORT || 3004;
server.listen(PORT, async () => {
  await initialize();
  logger.info(`Compliance Engine running on port ${PORT}`);
});

module.exports = app;