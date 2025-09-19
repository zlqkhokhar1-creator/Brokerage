const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cron = require('node-cron');

const { logger } = require('./utils/logger');
const { connectDatabase } = require('./services/database');
const { connectRedis } = require('./services/redis');
const { authenticateToken } = require('./middleware/auth');
const { validateRequest, marketDataSchema, technicalIndicatorSchema } = require('./middleware/validation');

// Import services
const MarketDataProcessor = require('./services/marketDataProcessor');
const TechnicalIndicatorService = require('./services/technicalIndicatorService');
const DataIngestionService = require('./services/dataIngestionService');
const DataStorageService = require('./services/dataStorageService');
const DataValidationService = require('./services/dataValidationService');
const WebSocketManager = require('./services/webSocketManager');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/market-data' });

// Initialize services
const marketDataProcessor = new MarketDataProcessor();
const technicalIndicatorService = new TechnicalIndicatorService();
const dataIngestionService = new DataIngestionService();
const dataStorageService = new DataStorageService();
const dataValidationService = new DataValidationService();
const webSocketManager = new WebSocketManager();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'market-data-processing',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/market-data', authenticateToken);

// Market Data Routes
app.post('/api/market-data/process', validateRequest(marketDataSchema), async (req, res) => {
  try {
    const result = await marketDataProcessor.processMarketData(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Market data processing error:', error);
    res.status(500).json({ error: 'Market data processing failed' });
  }
});

app.get('/api/market-data/symbols', async (req, res) => {
  try {
    const symbols = await marketDataProcessor.getAvailableSymbols(req.user);
    res.json(symbols);
  } catch (error) {
    logger.error('Error fetching available symbols:', error);
    res.status(500).json({ error: 'Failed to fetch available symbols' });
  }
});

app.get('/api/market-data/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { start, end, interval } = req.query;
    
    const history = await marketDataProcessor.getMarketDataHistory(symbol, {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
      interval: interval || '1d'
    }, req.user);
    
    res.json(history);
  } catch (error) {
    logger.error('Error fetching market data history:', error);
    res.status(500).json({ error: 'Failed to fetch market data history' });
  }
});

// Technical Indicators Routes
app.post('/api/market-data/technical-indicators', validateRequest(technicalIndicatorSchema), async (req, res) => {
  try {
    const result = await technicalIndicatorService.calculateIndicators(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Technical indicator calculation error:', error);
    res.status(500).json({ error: 'Technical indicator calculation failed' });
  }
});

app.get('/api/market-data/technical-indicators/available', async (req, res) => {
  try {
    const indicators = await technicalIndicatorService.getAvailableIndicators();
    res.json(indicators);
  } catch (error) {
    logger.error('Error fetching available indicators:', error);
    res.status(500).json({ error: 'Failed to fetch available indicators' });
  }
});

app.get('/api/market-data/technical-indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { start, end, indicators } = req.query;
    
    const result = await technicalIndicatorService.getIndicatorsForSymbol(symbol, {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
      indicators: indicators ? indicators.split(',') : []
    }, req.user);
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching technical indicators:', error);
    res.status(500).json({ error: 'Failed to fetch technical indicators' });
  }
});

// Data Ingestion Routes
app.post('/api/market-data/ingest', async (req, res) => {
  try {
    const result = await dataIngestionService.ingestMarketData(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Data ingestion error:', error);
    res.status(500).json({ error: 'Data ingestion failed' });
  }
});

app.get('/api/market-data/ingestion/status', async (req, res) => {
  try {
    const status = await dataIngestionService.getIngestionStatus(req.user);
    res.json(status);
  } catch (error) {
    logger.error('Error fetching ingestion status:', error);
    res.status(500).json({ error: 'Failed to fetch ingestion status' });
  }
});

// Data Storage Routes
app.get('/api/market-data/storage/stats', async (req, res) => {
  try {
    const stats = await dataStorageService.getStorageStats(req.user);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Failed to fetch storage stats' });
  }
});

app.post('/api/market-data/storage/cleanup', async (req, res) => {
  try {
    const result = await dataStorageService.cleanupOldData(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Data cleanup error:', error);
    res.status(500).json({ error: 'Data cleanup failed' });
  }
});

// Data Validation Routes
app.post('/api/market-data/validate', async (req, res) => {
  try {
    const result = await dataValidationService.validateMarketData(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Data validation error:', error);
    res.status(500).json({ error: 'Data validation failed' });
  }
});

app.get('/api/market-data/validation/reports', async (req, res) => {
  try {
    const reports = await dataValidationService.getValidationReports(req.user);
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching validation reports:', error);
    res.status(500).json({ error: 'Failed to fetch validation reports' });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  webSocketManager.handleConnection(ws, req);
});

// Event handlers
marketDataProcessor.on('dataProcessed', (data) => {
  webSocketManager.broadcastToSubscribers('market_data', {
    type: 'data_processed',
    data: data
  });
});

technicalIndicatorService.on('indicatorsCalculated', (data) => {
  webSocketManager.broadcastToSubscribers('technical_indicators', {
    type: 'indicators_calculated',
    data: data
  });
});

dataIngestionService.on('dataIngested', (data) => {
  webSocketManager.broadcastToSubscribers('data_ingestion', {
    type: 'data_ingested',
    data: data
  });
});

// Cron jobs
cron.schedule('*/5 * * * *', async () => {
  logger.info('Running market data processing tasks...');
  try {
    await marketDataProcessor.processRealTimeData();
    await technicalIndicatorService.updateIndicators();
    logger.info('Market data processing tasks completed');
  } catch (error) {
    logger.error('Error running market data processing tasks:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  logger.info('Running daily market data tasks...');
  try {
    await dataStorageService.cleanupOldData({ retentionDays: 30 });
    await dataValidationService.runDailyValidation();
    logger.info('Daily market data tasks completed');
  } catch (error) {
    logger.error('Error running daily market data tasks:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  try {
    await marketDataProcessor.close();
    await technicalIndicatorService.close();
    await dataIngestionService.close();
    await dataStorageService.close();
    await dataValidationService.close();
    await webSocketManager.close();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize services
    await connectDatabase();
    await connectRedis();
    await marketDataProcessor.initialize();
    await technicalIndicatorService.initialize();
    await dataIngestionService.initialize();
    await dataStorageService.initialize();
    await dataValidationService.initialize();
    webSocketManager.initialize(server);
    
    const PORT = process.env.PORT || 3007;
    server.listen(PORT, () => {
      logger.info(`Market Data Processing running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();