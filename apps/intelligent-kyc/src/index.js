const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');

const logger = require('./utils/logger');
const database = require('./services/database');
const redis = require('./services/redis');
const webSocketManager = require('./services/webSocketManager');
const { authenticateToken, requireRole } = require('./middleware/auth');
const { validateRequest, validateQuery, validateParams, schemas } = require('./middleware/validation');

const kycEngine = require('./services/kycEngine');
const documentVerifier = require('./services/documentVerifier');
const onboardingService = require('./services/onboardingService');

const app = express();
const server = createServer(app);

// Initialize WebSocket
webSocketManager.initialize(server);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const redisHealth = await redis.healthCheck();
    
    const overallHealth = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
    
    res.status(overallHealth ? 200 : 503).json({
      status: overallHealth ? 'healthy' : 'unhealthy',
      service: 'intelligent-kyc',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
        redis: redisHealth
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'intelligent-kyc',
      error: error.message
    });
  }
});

// KYC Engine endpoints
app.post('/api/kyc/verify', authenticateToken, validateRequest(schemas.personalInfo), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await kycEngine.runKYCChecks(userId, req.body);
    
    // Send WebSocket update
    webSocketManager.sendKYCUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('KYC verification error:', error);
    res.status(500).json({ error: 'KYC verification failed' });
  }
});

app.get('/api/kyc/status/:userId', authenticateToken, validateParams(schemas.userId), async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await kycEngine.getKYCStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error('KYC status error:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

// Document verification endpoints
app.post('/api/documents/verify', authenticateToken, validateRequest(schemas.documentUpload), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await documentVerifier.verifyDocument(req.body);
    
    // Send WebSocket update
    webSocketManager.sendDocumentVerificationUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('Document verification error:', error);
    res.status(500).json({ error: 'Document verification failed' });
  }
});

// Onboarding endpoints
app.post('/api/onboarding/start', authenticateToken, validateRequest(schemas.onboardingData), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await onboardingService.processOnboarding(userId, req.body);
    
    // Send WebSocket update
    webSocketManager.sendOnboardingUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('Onboarding error:', error);
    res.status(500).json({ error: 'Onboarding failed' });
  }
});

app.get('/api/onboarding/status/:userId', authenticateToken, validateParams(schemas.userId), async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await onboardingService.getOnboardingStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3012;
server.listen(PORT, () => {
  logger.info(`Intelligent KYC Service running on port ${PORT}`);
});

module.exports = app;
