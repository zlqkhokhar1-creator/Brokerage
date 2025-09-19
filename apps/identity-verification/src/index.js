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

const identityVerifier = require('./services/identityVerifier');
const nadraService = require('./services/nadraService');
const internationalVerificationService = require('./services/internationalVerificationService');

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
      service: 'identity-verification',
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
      service: 'identity-verification',
      error: error.message
    });
  }
});

// Identity verification endpoints
app.post('/api/identity/verify', authenticateToken, validateRequest(schemas.identityVerification), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await identityVerifier.verifyIdentity(userId, req.body);
    
    // Send WebSocket update
    webSocketManager.sendIdentityVerificationUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('Identity verification error:', error);
    res.status(500).json({ error: 'Identity verification failed' });
  }
});

app.get('/api/identity/status/:userId', authenticateToken, validateParams(schemas.userId), async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await identityVerifier.getVerificationStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error('Identity status error:', error);
    res.status(500).json({ error: 'Failed to get identity status' });
  }
});

// NADRA integration endpoints
app.post('/api/nadra/verify', authenticateToken, validateRequest(schemas.nadraVerification), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await nadraService.verifyWithNADRA(userId, req.body);
    
    // Send WebSocket update
    webSocketManager.sendNADRAVerificationUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('NADRA verification error:', error);
    res.status(500).json({ error: 'NADRA verification failed' });
  }
});

// International verification endpoints
app.post('/api/international/verify', authenticateToken, validateRequest(schemas.internationalVerification), async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await internationalVerificationService.verifyInternationally(userId, req.body);
    
    // Send WebSocket update
    webSocketManager.sendInternationalVerificationUpdate(userId, result);
    
    res.json(result);
  } catch (error) {
    logger.error('International verification error:', error);
    res.status(500).json({ error: 'International verification failed' });
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

const PORT = process.env.PORT || 3013;
server.listen(PORT, () => {
  logger.info(`Identity Verification Service running on port ${PORT}`);
});

module.exports = app;

