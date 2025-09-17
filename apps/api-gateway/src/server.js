const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger } = require('./utils/logger');

// Import route modules
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const advancedTradingRoutes = require('./routes/advancedTrading');
const tradingJournalRoutes = require('./routes/tradingJournal');
const paperTradingRoutes = require('./routes/paperTrading');
const watchlistRoutes = require('./routes/watchlists');
const notificationsRoutes = require('./routes/notifications');
const featuresRoutes = require('./routes/features');
const membershipsRoutes = require('./routes/memberships');
const roboAdvisorRoutes = require('./routes/roboAdvisor');
const socialTradingRoutes = require('./routes/socialTrading');
const goalsRoutes = require('./routes/goals');
const recurringBuysRoutes = require('./routes/recurringBuys');
const beneficiariesRoutes = require('./routes/beneficiaries');
const apiKeysRoutes = require('./routes/apiKeys');
const twoFactorAuthRoutes = require('./routes/twoFactorAuth');
const biometricsRoutes = require('./routes/biometrics');
const sessionRoutes = require('./routes/session');
const userPreferencesRoutes = require('./routes/userPreferences');
const chartingRoutes = require('./routes/charting');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const { transaction } = require('./config/database');
    await transaction(async (client) => {
      await client.query('SELECT 1');
    });
    
    res.json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected' // Add actual Redis check
      }
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/trading', advancedTradingRoutes);
app.use('/api/v1/trading/journal', tradingJournalRoutes);
app.use('/api/v1/paper-trading', paperTradingRoutes);
app.use('/api/v1/watchlists', watchlistRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/features', featuresRoutes);
app.use('/api/v1/memberships', membershipsRoutes);
app.use('/api/v1/robo-advisor', roboAdvisorRoutes);
app.use('/api/v1/social-trading', socialTradingRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/recurring-buys', recurringBuysRoutes);
app.use('/api/v1/beneficiaries', beneficiariesRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);
app.use('/api/v1/2fa', twoFactorAuthRoutes);
app.use('/api/v1/biometrics', biometricsRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1/preferences', userPreferencesRoutes);
app.use('/api/v1/charting', chartingRoutes);
app.use('/api/v1/admin', adminRoutes);

// WebSocket support for real-time features
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  // Join market data room
  socket.on('join-market-data', () => {
    socket.join('market-data');
    logger.info('Client joined market data room');
  });

  // Handle trading events
  socket.on('subscribe-symbol', (symbol) => {
    socket.join(`symbol-${symbol}`);
    logger.info(`Client subscribed to ${symbol}`);
  });

  socket.on('unsubscribe-symbol', (symbol) => {
    socket.leave(`symbol-${symbol}`);
    logger.info(`Client unsubscribed from ${symbol}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`API Gateway server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Readiness check: http://localhost:${PORT}/ready`);
});

module.exports = { app, server, io };
