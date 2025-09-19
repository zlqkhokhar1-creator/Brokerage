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
const FraudDetectionEngine = require('./services/fraudDetectionEngine');
const MLModelManager = require('./services/mlModelManager');
const BehavioralAnalyzer = require('./services/behavioralAnalyzer');
const RealTimeMonitor = require('./services/realTimeMonitor');
const AlertManager = require('./services/alertManager');
const DataProcessor = require('./services/dataProcessor');
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
const fraudDetectionEngine = new FraudDetectionEngine();
const mlModelManager = new MLModelManager();
const behavioralAnalyzer = new BehavioralAnalyzer();
const realTimeMonitor = new RealTimeMonitor();
const alertManager = new AlertManager();
const dataProcessor = new DataProcessor();
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
    service: 'fraud-detection-system',
    version: '1.0.0'
  });
});

// API Routes

// Fraud Detection Engine Routes
app.post('/api/fraud/detect', authenticateToken, validateRequest(schemas.fraudDetection), async (req, res) => {
  try {
    const result = await fraudDetectionEngine.detectFraud(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Fraud detection failed' });
  }
});

app.get('/api/fraud/status/:transactionId', authenticateToken, async (req, res) => {
  try {
    const status = await fraudDetectionEngine.getFraudStatus(req.params.transactionId, req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Get fraud status error:', error);
    res.status(500).json({ error: 'Failed to get fraud status' });
  }
});

// ML Model Manager Routes
app.get('/api/models', authenticateToken, requireRole(['admin', 'fraud_analyst']), async (req, res) => {
  try {
    const models = await mlModelManager.getModels(req.user.id);
    res.json(models);
  } catch (error) {
    logger.error('Get models error:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

app.post('/api/models/train', authenticateToken, requireRole(['admin', 'fraud_analyst']), validateRequest(schemas.modelTraining), async (req, res) => {
  try {
    const result = await mlModelManager.trainModel(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Model training error:', error);
    res.status(500).json({ error: 'Model training failed' });
  }
});

// Behavioral Analyzer Routes
app.post('/api/behavioral/analyze', authenticateToken, validateRequest(schemas.behavioralAnalysis), async (req, res) => {
  try {
    const result = await behavioralAnalyzer.analyzeBehavior(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Behavioral analysis error:', error);
    res.status(500).json({ error: 'Behavioral analysis failed' });
  }
});

app.get('/api/behavioral/patterns/:userId', authenticateToken, async (req, res) => {
  try {
    const patterns = await behavioralAnalyzer.getBehaviorPatterns(req.params.userId, req.user.id);
    res.json(patterns);
  } catch (error) {
    logger.error('Get behavior patterns error:', error);
    res.status(500).json({ error: 'Failed to get behavior patterns' });
  }
});

// Real-Time Monitor Routes
app.post('/api/monitor/start', authenticateToken, requireRole(['admin', 'fraud_analyst']), validateRequest(schemas.monitoringConfig), async (req, res) => {
  try {
    const result = await realTimeMonitor.startMonitoring(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Start monitoring error:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

app.post('/api/monitor/stop', authenticateToken, requireRole(['admin', 'fraud_analyst']), async (req, res) => {
  try {
    const result = await realTimeMonitor.stopMonitoring(req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Stop monitoring error:', error);
    res.status(500).json({ error: 'Failed to stop monitoring' });
  }
});

// Alert Manager Routes
app.get('/api/alerts', authenticateToken, validateQuery(schemas.alertQuery), async (req, res) => {
  try {
    const alerts = await alertManager.getAlerts(req.query, req.user.id);
    res.json(alerts);
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

app.post('/api/alerts/acknowledge', authenticateToken, validateRequest(schemas.alertAcknowledgment), async (req, res) => {
  try {
    const result = await alertManager.acknowledgeAlerts(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Acknowledge alerts error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
});

// Data Processor Routes
app.post('/api/data/process', authenticateToken, requireRole(['admin', 'fraud_analyst']), validateRequest(schemas.dataProcessing), async (req, res) => {
  try {
    const result = await dataProcessor.processData(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Data processing error:', error);
    res.status(500).json({ error: 'Data processing failed' });
  }
});

app.get('/api/data/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const status = await dataProcessor.getProcessingStatus(req.params.jobId, req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Get processing status error:', error);
    res.status(500).json({ error: 'Failed to get processing status' });
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
fraudDetectionEngine.on('fraudDetected', (data) => {
  webSocketManager.broadcastFraudAlert(data.userId, data);
  logger.security('Fraud detected', data.userId, data);
});

behavioralAnalyzer.on('anomalyDetected', (data) => {
  webSocketManager.broadcastAnomalyAlert(data.userId, data);
  logger.security('Behavioral anomaly detected', data.userId, data);
});

realTimeMonitor.on('monitoringAlert', (data) => {
  webSocketManager.broadcastMonitoringAlert(data.userId, data);
  logger.security('Monitoring alert', data.userId, data);
});

alertManager.on('alertGenerated', (data) => {
  webSocketManager.broadcastAlert(data.userId, data);
  logger.security('Alert generated', data.userId, data);
});

// Cron jobs
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Running real-time fraud monitoring...');
    await realTimeMonitor.runMonitoringCycle();
  } catch (error) {
    logger.error('Real-time monitoring failed:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Running daily fraud analysis...');
    await fraudDetectionEngine.runDailyAnalysis();
  } catch (error) {
    logger.error('Daily fraud analysis failed:', error);
  }
});

cron.schedule('0 0 * * 0', async () => {
  try {
    logger.info('Running weekly model retraining...');
    await mlModelManager.runWeeklyRetraining();
  } catch (error) {
    logger.error('Weekly model retraining failed:', error);
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
    await fraudDetectionEngine.initialize();
    await mlModelManager.initialize();
    await behavioralAnalyzer.initialize();
    await realTimeMonitor.initialize();
    await alertManager.initialize();
    await dataProcessor.initialize();
    
    logger.info('Fraud Detection System initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Fraud Detection System:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  try {
    await fraudDetectionEngine.close();
    await mlModelManager.close();
    await behavioralAnalyzer.close();
    await realTimeMonitor.close();
    await alertManager.close();
    await dataProcessor.close();
    await webSocketManager.close();
    
    server.close(() => {
      logger.info('Fraud Detection System shut down successfully');
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
    await fraudDetectionEngine.close();
    await mlModelManager.close();
    await behavioralAnalyzer.close();
    await realTimeMonitor.close();
    await alertManager.close();
    await dataProcessor.close();
    await webSocketManager.close();
    
    server.close(() => {
      logger.info('Fraud Detection System shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
const PORT = process.env.PORT || 3005;
server.listen(PORT, async () => {
  await initialize();
  logger.info(`Fraud Detection System running on port ${PORT}`);
});

module.exports = app;