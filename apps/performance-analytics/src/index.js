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
const { validateRequest, performanceAnalysisSchema, benchmarkComparisonSchema } = require('./middleware/validation');

// Import services
const PerformanceAnalyticsEngine = require('./services/performanceAnalyticsEngine');
const AttributionAnalysisService = require('./services/attributionAnalysisService');
const BenchmarkComparisonService = require('./services/benchmarkComparisonService');
const RiskAdjustedReturnsService = require('./services/riskAdjustedReturnsService');
const PortfolioAnalyticsService = require('./services/portfolioAnalyticsService');
const WebSocketManager = require('./services/webSocketManager');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/performance-analytics' });

// Initialize services
const performanceAnalyticsEngine = new PerformanceAnalyticsEngine();
const attributionAnalysisService = new AttributionAnalysisService();
const benchmarkComparisonService = new BenchmarkComparisonService();
const riskAdjustedReturnsService = new RiskAdjustedReturnsService();
const portfolioAnalyticsService = new PortfolioAnalyticsService();
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
    service: 'performance-analytics',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/performance-analytics', authenticateToken);

// Performance Analytics Routes
app.post('/api/performance-analytics/analyze', validateRequest(performanceAnalysisSchema), async (req, res) => {
  try {
    const result = await performanceAnalyticsEngine.analyzePerformance(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Performance analysis error:', error);
    res.status(500).json({ error: 'Performance analysis failed' });
  }
});

app.get('/api/performance-analytics/metrics', async (req, res) => {
  try {
    const metrics = await performanceAnalyticsEngine.getPerformanceMetrics(req.user);
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Attribution Analysis Routes
app.post('/api/performance-analytics/attribution', async (req, res) => {
  try {
    const result = await attributionAnalysisService.performAttributionAnalysis(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Attribution analysis error:', error);
    res.status(500).json({ error: 'Attribution analysis failed' });
  }
});

app.get('/api/performance-analytics/attribution/history', async (req, res) => {
  try {
    const history = await attributionAnalysisService.getAttributionHistory(req.user);
    res.json(history);
  } catch (error) {
    logger.error('Error fetching attribution history:', error);
    res.status(500).json({ error: 'Failed to fetch attribution history' });
  }
});

// Benchmark Comparison Routes
app.post('/api/performance-analytics/benchmark', validateRequest(benchmarkComparisonSchema), async (req, res) => {
  try {
    const result = await benchmarkComparisonService.compareWithBenchmark(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Benchmark comparison error:', error);
    res.status(500).json({ error: 'Benchmark comparison failed' });
  }
});

app.get('/api/performance-analytics/benchmarks', async (req, res) => {
  try {
    const benchmarks = await benchmarkComparisonService.getAvailableBenchmarks();
    res.json(benchmarks);
  } catch (error) {
    logger.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

// Risk-Adjusted Returns Routes
app.post('/api/performance-analytics/risk-adjusted', async (req, res) => {
  try {
    const result = await riskAdjustedReturnsService.calculateRiskAdjustedReturns(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Risk-adjusted returns calculation error:', error);
    res.status(500).json({ error: 'Risk-adjusted returns calculation failed' });
  }
});

app.get('/api/performance-analytics/risk-adjusted/history', async (req, res) => {
  try {
    const history = await riskAdjustedReturnsService.getRiskAdjustedHistory(req.user);
    res.json(history);
  } catch (error) {
    logger.error('Error fetching risk-adjusted history:', error);
    res.status(500).json({ error: 'Failed to fetch risk-adjusted history' });
  }
});

// Portfolio Analytics Routes
app.post('/api/performance-analytics/portfolio', async (req, res) => {
  try {
    const result = await portfolioAnalyticsService.analyzePortfolio(req.body, req.user);
    res.json(result);
  } catch (error) {
    logger.error('Portfolio analysis error:', error);
    res.status(500).json({ error: 'Portfolio analysis failed' });
  }
});

app.get('/api/performance-analytics/portfolio/summary', async (req, res) => {
  try {
    const summary = await portfolioAnalyticsService.getPortfolioSummary(req.user);
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching portfolio summary:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  webSocketManager.handleConnection(ws, req);
});

// Event handlers
performanceAnalyticsEngine.on('analysisComplete', (data) => {
  webSocketManager.broadcastToSubscribers('performance_analytics', {
    type: 'analysis_complete',
    data: data
  });
});

attributionAnalysisService.on('attributionComplete', (data) => {
  webSocketManager.broadcastToSubscribers('attribution_analysis', {
    type: 'attribution_complete',
    data: data
  });
});

benchmarkComparisonService.on('comparisonComplete', (data) => {
  webSocketManager.broadcastToSubscribers('benchmark_comparison', {
    type: 'comparison_complete',
    data: data
  });
});

// Cron jobs
cron.schedule('0 0 * * *', async () => {
  logger.info('Running daily performance analytics tasks...');
  try {
    await performanceAnalyticsEngine.runDailyAnalysis();
    await attributionAnalysisService.runDailyAttribution();
    await benchmarkComparisonService.runDailyComparison();
    logger.info('Daily performance analytics tasks completed');
  } catch (error) {
    logger.error('Error running daily performance analytics tasks:', error);
  }
});

cron.schedule('0 0 * * 1', async () => {
  logger.info('Running weekly performance analytics tasks...');
  try {
    await portfolioAnalyticsService.runWeeklyAnalysis();
    logger.info('Weekly performance analytics tasks completed');
  } catch (error) {
    logger.error('Error running weekly performance analytics tasks:', error);
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
    await performanceAnalyticsEngine.close();
    await attributionAnalysisService.close();
    await benchmarkComparisonService.close();
    await riskAdjustedReturnsService.close();
    await portfolioAnalyticsService.close();
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
    await performanceAnalyticsEngine.initialize();
    await attributionAnalysisService.initialize();
    await benchmarkComparisonService.initialize();
    await riskAdjustedReturnsService.initialize();
    await portfolioAnalyticsService.initialize();
    webSocketManager.initialize(server);
    
    const PORT = process.env.PORT || 3006;
    server.listen(PORT, () => {
      logger.info(`Performance Analytics running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();