const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');

const logger = require('./utils/logger');
const healthMonitor = require('./services/healthMonitor');
const alertManager = require('./services/alertManager');
const metricsCollector = require('./services/metricsCollector');
const webSocketManager = require('./services/webSocketManager');
const { authenticateToken } = require('./middleware/auth');
const { validateRequest, schemas } = require('./middleware/validation');

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
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const monitoringHealth = await healthMonitor.getSystemHealth();
    
    res.status(200).json({
      status: 'healthy',
      service: 'monitoring-system',
      timestamp: new Date().toISOString(),
      systemHealth: monitoringHealth
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'monitoring-system',
      error: error.message
    });
  }
});

// Service health endpoints
app.get('/api/services/health', authenticateToken, async (req, res) => {
  try {
    const servicesHealth = await healthMonitor.getAllServicesHealth();
    res.json(servicesHealth);
  } catch (error) {
    logger.error('Services health error:', error);
    res.status(500).json({ error: 'Failed to get services health' });
  }
});

app.get('/api/services/:serviceName/health', authenticateToken, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const serviceHealth = await healthMonitor.getServiceHealth(serviceName);
    res.json(serviceHealth);
  } catch (error) {
    logger.error('Service health error:', error);
    res.status(500).json({ error: 'Failed to get service health' });
  }
});

// Metrics endpoints
app.get('/api/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await metricsCollector.getAllMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.get('/api/metrics/:serviceName', authenticateToken, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const metrics = await metricsCollector.getServiceMetrics(serviceName);
    res.json(metrics);
  } catch (error) {
    logger.error('Service metrics error:', error);
    res.status(500).json({ error: 'Failed to get service metrics' });
  }
});

// Alert management endpoints
app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await alertManager.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    logger.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

app.post('/api/alerts/acknowledge', authenticateToken, validateRequest(schemas.acknowledgeAlert), async (req, res) => {
  try {
    const { alertId, acknowledgedBy } = req.body;
    const result = await alertManager.acknowledgeAlert(alertId, acknowledgedBy);
    res.json(result);
  } catch (error) {
    logger.error('Alert acknowledgment error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

app.post('/api/alerts/resolve', authenticateToken, validateRequest(schemas.resolveAlert), async (req, res) => {
  try {
    const { alertId, resolvedBy, resolution } = req.body;
    const result = await alertManager.resolveAlert(alertId, resolvedBy, resolution);
    res.json(result);
  } catch (error) {
    logger.error('Alert resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Dashboard endpoints
app.get('/api/dashboard/overview', authenticateToken, async (req, res) => {
  try {
    const overview = await healthMonitor.getDashboardOverview();
    res.json(overview);
  } catch (error) {
    logger.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

app.get('/api/dashboard/services', authenticateToken, async (req, res) => {
  try {
    const services = await healthMonitor.getServicesStatus();
    res.json(services);
  } catch (error) {
    logger.error('Services status error:', error);
    res.status(500).json({ error: 'Failed to get services status' });
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
  await healthMonitor.close();
  await alertManager.close();
  await metricsCollector.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await healthMonitor.close();
  await alertManager.close();
  await metricsCollector.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3021;
server.listen(PORT, () => {
  logger.info(`Monitoring System running on port ${PORT}`);
  
  // Start monitoring tasks
  healthMonitor.startMonitoring();
  metricsCollector.startCollection();
});

module.exports = app;
