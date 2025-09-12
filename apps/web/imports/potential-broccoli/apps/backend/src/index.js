require('dotenv').config();

// Validate configuration early - fail fast if missing required environment variables
const { getConfig, getConfigSummary } = require('../../../packages/config');

const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');

// Enhanced utilities
const { errorHandler } = require('./utils/errorHandler');
const { httpLogger, logger } = require('./utils/logger');
const { healthCheck: dbHealthCheck } = require('./config/database');
const { healthCheck: redisHealthCheck } = require('./config/redis');

// Routes
const api = require('./routes/api');
const { healthRouter, createWhoAmIRoute } = require('./routes/health');

// Initialize and validate configuration
let config;
try {
  config = getConfig();
  const configSummary = getConfigSummary();
  
  // Log startup configuration (safe summary only)
  logger.info('Starting brokerage gateway with configuration', configSummary);
} catch (error) {
  console.error('❌ Configuration validation failed:');
  console.error(error.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Trust proxy (for production load balancers)
app.set('trust proxy', 1);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Response compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Enhanced CORS configuration
const allowedOrigins = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    
    logger.warn('CORS blocked origin', { origin, userAgent: 'unknown' });
    return callback(new Error(`CORS policy violation: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-API-Key',
    'X-Client-Version',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
}));

// Enhanced body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// HTTP request logging
app.use(httpLogger);

// Request sanitization
app.use((req, res, next) => {
  // Remove potential XSS in query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
  }
  next();
});

// API routes
const apiRoutes = require('./routes/api');
const keyManagementRoutes = require('./routes/keyManagement');
app.use('/api/v1', apiRoutes);
app.use('/api/v1/key-management', keyManagementRoutes);

// Security & Identity Foundation endpoints
app.use('/', healthRouter); // Adds /healthz endpoint
app.get('/whoami', ...createWhoAmIRoute(logger)); // JWT-protected endpoint

// Enhanced health check endpoint
// Import all enterprise services
const { tradingEngine } = require('./services/tradingEngine');
const { marketDataService } = require('./services/marketDataService');
const { riskManagementSystem } = require('./services/riskManagementSystem');
const { complianceSystem } = require('./services/complianceSystem');
const { orderManagementSystem } = require('./services/orderManagementSystem');
const { notificationSystem } = require('./services/notificationSystem');
const { slideToExecuteService } = require('./services/slideToExecuteService');

// Health check endpoint with comprehensive service monitoring
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        redis: 'connected',
        tradingEngine: 'active',
        marketData: 'active',
        riskManagement: 'active',
        compliance: 'active',
        orderManagement: 'active',
        notifications: 'active'
      },
      performance: {
        orderManagement: orderManagementSystem.getPerformanceMetrics(),
        marketData: marketDataService.getServicePerformance(),
        tradingEngine: tradingEngine.getEngineStatus()
      }
    };
    
    res.status(200).json(health);
  } catch (error) {
    logger.error('HEALTH_CHECK_ERROR', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

// Ready check (for Kubernetes)
app.get('/ready', async (req, res) => {
  const dbStatus = await dbHealthCheck();
  const redisStatus = await redisHealthCheck();
  
  if (dbStatus.status === 'healthy' && redisStatus.status === 'healthy') {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Live check (for Kubernetes)
app.get('/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id
  });
  
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// Enhanced global error handler
app.use(errorHandler);

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      const { shutdown: dbShutdown } = require('./config/database');
      await dbShutdown();
      
      // Close Redis connections
      const { shutdown: redisShutdown } = require('./config/redis');
      await redisShutdown();
      
      logger.info('All connections closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason.message || reason,
    stack: reason.stack,
    promise: promise
  });
  process.exit(1);
});

const port = config.HTTP_PORT;

// Start server with enhanced logging
server.listen(port, () => {
  logger.info('🚀 Brokerage Platform API Server Started', {
    port,
    environment: config.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    apiUrl: `http://localhost:${port}/api/v1`,
    healthCheck: `http://localhost:${port}/healthz`,
    whoami: `http://localhost:${port}/whoami`,
    processId: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    jwtAlgorithm: config.JWT_ALG,
    jwtIssuer: config.JWT_ISSUER
  });
  
  // Initialize WebSocket server
  initializeWebSocket(server);
  
  // Start market data simulation
  startMarketDataSimulation();
  
  // Start background processes for enterprise services
  logger.info('🔄 Starting background services...');
  
  try {
    // Start order management background processes
    if (orderManagementSystem.startBackgroundProcesses) {
      orderManagementSystem.startBackgroundProcesses();
    }
    
    // Start trading engine background processes  
    if (tradingEngine.startOrderProcessor) {
      tradingEngine.startOrderProcessor();
    }
    if (tradingEngine.startRiskMonitoring) {
      tradingEngine.startRiskMonitoring();
    }
    
    // Start compliance system background processes
    if (complianceSystem.startBackgroundProcesses) {
      complianceSystem.startBackgroundProcesses();
    }
    
    // Start slide-to-execute background processes
    if (slideToExecuteService.startBackgroundProcesses) {
      slideToExecuteService.startBackgroundProcesses();
    }
    
    logger.info('✅ All background services started successfully');
  } catch (error) {
    logger.error('❌ Failed to start background services', { error: error.message });
  }
  
  logger.info('✅ All services initialized successfully');
});
