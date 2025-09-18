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
const PluginManager = require('./services/pluginManager');
const StrategyEngine = require('./services/strategyEngine');
const BacktestEngine = require('./services/backtestEngine');
const PaperTradingEngine = require('./services/paperTradingEngine');
const MarketDataProvider = require('./services/marketDataProvider');
const RiskManager = require('./services/riskManager');
const PerformanceAnalyzer = require('./services/performanceAnalyzer');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class AlgorithmicTradingFramework extends EventEmitter {
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
    
    this.port = process.env.PORT || 5006;
    
    // Core services
    this.pluginManager = new PluginManager();
    this.strategyEngine = new StrategyEngine();
    this.backtestEngine = new BacktestEngine();
    this.paperTradingEngine = new PaperTradingEngine();
    this.marketDataProvider = new MarketDataProvider();
    this.riskManager = new RiskManager();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Framework state
    this.isInitialized = false;
    this.activeStrategies = new Map();
    this.runningBacktests = new Map();
    this.paperTradingSessions = new Map();
    
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
        activeStrategies: this.activeStrategies.size,
        runningBacktests: this.runningBacktests.size,
        paperTradingSessions: this.paperTradingSessions.size
      });
    });

    // Plugin management endpoints
    this.app.get('/api/v1/plugins',
      authenticateToken,
      async (req, res) => {
        try {
          const plugins = await this.pluginManager.getAvailablePlugins();
          res.json({
            success: true,
            data: plugins
          });
        } catch (error) {
          logger.error('Error getting plugins:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get plugins'
          });
        }
      }
    );

    this.app.post('/api/v1/plugins/load',
      authenticateToken,
      validateRequest('pluginLoad'),
      async (req, res) => {
        try {
          const { pluginId, config } = req.body;
          const plugin = await this.pluginManager.loadPlugin(pluginId, config);
          res.json({
            success: true,
            data: plugin
          });
        } catch (error) {
          logger.error('Error loading plugin:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to load plugin'
          });
        }
      }
    );

    this.app.delete('/api/v1/plugins/:pluginId',
      authenticateToken,
      async (req, res) => {
        try {
          const { pluginId } = req.params;
          await this.pluginManager.unloadPlugin(pluginId);
          res.json({
            success: true,
            message: 'Plugin unloaded successfully'
          });
        } catch (error) {
          logger.error('Error unloading plugin:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to unload plugin'
          });
        }
      }
    );

    // Strategy management endpoints
    this.app.post('/api/v1/strategies/create',
      authenticateToken,
      validateRequest('strategyCreate'),
      async (req, res) => {
        try {
          const { name, description, pluginId, config, symbols } = req.body;
          const strategy = await this.strategyEngine.createStrategy(
            name, description, pluginId, config, symbols, req.user.id
          );
          res.json({
            success: true,
            data: strategy
          });
        } catch (error) {
          logger.error('Error creating strategy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create strategy'
          });
        }
      }
    );

    this.app.get('/api/v1/strategies',
      authenticateToken,
      async (req, res) => {
        try {
          const strategies = await this.strategyEngine.getStrategies(req.user.id);
          res.json({
            success: true,
            data: strategies
          });
        } catch (error) {
          logger.error('Error getting strategies:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get strategies'
          });
        }
      }
    );

    this.app.post('/api/v1/strategies/:strategyId/start',
      authenticateToken,
      async (req, res) => {
        try {
          const { strategyId } = req.params;
          const { mode = 'paper' } = req.body;
          const strategy = await this.strategyEngine.startStrategy(strategyId, mode, req.user.id);
          res.json({
            success: true,
            data: strategy
          });
        } catch (error) {
          logger.error('Error starting strategy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to start strategy'
          });
        }
      }
    );

    this.app.post('/api/v1/strategies/:strategyId/stop',
      authenticateToken,
      async (req, res) => {
        try {
          const { strategyId } = req.params;
          const strategy = await this.strategyEngine.stopStrategy(strategyId, req.user.id);
          res.json({
            success: true,
            data: strategy
          });
        } catch (error) {
          logger.error('Error stopping strategy:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to stop strategy'
          });
        }
      }
    );

    // Backtesting endpoints
    this.app.post('/api/v1/backtest/run',
      authenticateToken,
      validateRequest('backtestRun'),
      async (req, res) => {
        try {
          const { strategyId, startDate, endDate, initialCapital, symbols } = req.body;
          const backtest = await this.backtestEngine.runBacktest(
            strategyId, startDate, endDate, initialCapital, symbols, req.user.id
          );
          res.json({
            success: true,
            data: backtest
          });
        } catch (error) {
          logger.error('Error running backtest:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to run backtest'
          });
        }
      }
    );

    this.app.get('/api/v1/backtest/:backtestId',
      authenticateToken,
      async (req, res) => {
        try {
          const { backtestId } = req.params;
          const backtest = await this.backtestEngine.getBacktest(backtestId, req.user.id);
          res.json({
            success: true,
            data: backtest
          });
        } catch (error) {
          logger.error('Error getting backtest:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get backtest'
          });
        }
      }
    );

    this.app.get('/api/v1/backtest/:backtestId/results',
      authenticateToken,
      async (req, res) => {
        try {
          const { backtestId } = req.params;
          const results = await this.backtestEngine.getBacktestResults(backtestId, req.user.id);
          res.json({
            success: true,
            data: results
          });
        } catch (error) {
          logger.error('Error getting backtest results:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get backtest results'
          });
        }
      }
    );

    // Paper trading endpoints
    this.app.post('/api/v1/paper-trading/start',
      authenticateToken,
      validateRequest('paperTradingStart'),
      async (req, res) => {
        try {
          const { strategyId, initialCapital, symbols } = req.body;
          const session = await this.paperTradingEngine.startSession(
            strategyId, initialCapital, symbols, req.user.id
          );
          res.json({
            success: true,
            data: session
          });
        } catch (error) {
          logger.error('Error starting paper trading:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to start paper trading'
          });
        }
      }
    );

    this.app.get('/api/v1/paper-trading/:sessionId',
      authenticateToken,
      async (req, res) => {
        try {
          const { sessionId } = req.params;
          const session = await this.paperTradingEngine.getSession(sessionId, req.user.id);
          res.json({
            success: true,
            data: session
          });
        } catch (error) {
          logger.error('Error getting paper trading session:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get paper trading session'
          });
        }
      }
    );

    this.app.post('/api/v1/paper-trading/:sessionId/stop',
      authenticateToken,
      async (req, res) => {
        try {
          const { sessionId } = req.params;
          const session = await this.paperTradingEngine.stopSession(sessionId, req.user.id);
          res.json({
            success: true,
            data: session
          });
        } catch (error) {
          logger.error('Error stopping paper trading:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to stop paper trading'
          });
        }
      }
    );

    // Performance analytics endpoints
    this.app.get('/api/v1/performance/:strategyId',
      authenticateToken,
      async (req, res) => {
        try {
          const { strategyId } = req.params;
          const { timeframe = '30d' } = req.query;
          const performance = await this.performanceAnalyzer.getStrategyPerformance(
            strategyId, timeframe, req.user.id
          );
          res.json({
            success: true,
            data: performance
          });
        } catch (error) {
          logger.error('Error getting strategy performance:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get strategy performance'
          });
        }
      }
    );

    this.app.get('/api/v1/performance/compare',
      authenticateToken,
      async (req, res) => {
        try {
          const { strategyIds, timeframe = '30d' } = req.query;
          const comparison = await this.performanceAnalyzer.compareStrategies(
            strategyIds.split(','), timeframe, req.user.id
          );
          res.json({
            success: true,
            data: comparison
          });
        } catch (error) {
          logger.error('Error comparing strategies:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to compare strategies'
          });
        }
      }
    );

    // Market data endpoints
    this.app.get('/api/v1/market-data/:symbol',
      authenticateToken,
      async (req, res) => {
        try {
          const { symbol } = req.params;
          const { timeframe = '1m', limit = 1000 } = req.query;
          const data = await this.marketDataProvider.getHistoricalData(
            symbol, timeframe, parseInt(limit)
          );
          res.json({
            success: true,
            data: data
          });
        } catch (error) {
          logger.error('Error getting market data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get market data'
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
      logger.info('Client connected to algorithmic trading framework', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, strategyId, sessionId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { strategyId, sessionId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, strategyId, sessionId } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { strategyId, sessionId });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from algorithmic trading framework', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Update strategy performance every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.updateStrategyPerformance();
        logger.info('Strategy performance updated');
      } catch (error) {
        logger.error('Failed to update strategy performance:', error);
      }
    });

    // Clean up old backtests every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupOldBacktests();
        logger.info('Old backtests cleaned up');
      } catch (error) {
        logger.error('Failed to cleanup old backtests:', error);
      }
    });

    // Update market data every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.updateMarketData();
        logger.info('Market data updated');
      } catch (error) {
        logger.error('Failed to update market data:', error);
      }
    });
  }

  setupEventHandlers() {
    // Strategy events
    this.strategyEngine.on('strategyStarted', (strategy) => {
      this.activeStrategies.set(strategy.id, strategy);
      this.emit('strategyStarted', strategy);
    });

    this.strategyEngine.on('strategyStopped', (strategy) => {
      this.activeStrategies.delete(strategy.id);
      this.emit('strategyStopped', strategy);
    });

    this.strategyEngine.on('strategyError', (error, strategy) => {
      logger.error('Strategy error:', { error, strategyId: strategy.id });
      this.emit('strategyError', error, strategy);
    });

    // Backtest events
    this.backtestEngine.on('backtestStarted', (backtest) => {
      this.runningBacktests.set(backtest.id, backtest);
      this.emit('backtestStarted', backtest);
    });

    this.backtestEngine.on('backtestCompleted', (backtest) => {
      this.runningBacktests.delete(backtest.id);
      this.emit('backtestCompleted', backtest);
    });

    // Paper trading events
    this.paperTradingEngine.on('sessionStarted', (session) => {
      this.paperTradingSessions.set(session.id, session);
      this.emit('sessionStarted', session);
    });

    this.paperTradingEngine.on('sessionStopped', (session) => {
      this.paperTradingSessions.delete(session.id);
      this.emit('sessionStopped', session);
    });
  }

  async updateStrategyPerformance() {
    try {
      for (const [strategyId, strategy] of this.activeStrategies) {
        const performance = await this.performanceAnalyzer.calculatePerformance(strategy);
        strategy.performance = performance;
        this.activeStrategies.set(strategyId, strategy);
      }
    } catch (error) {
      logger.error('Error updating strategy performance:', error);
    }
  }

  async cleanupOldBacktests() {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const oldBacktests = Array.from(this.runningBacktests.values())
        .filter(backtest => new Date(backtest.createdAt) < cutoff);
      
      for (const backtest of oldBacktests) {
        await this.backtestEngine.cleanupBacktest(backtest.id);
        this.runningBacktests.delete(backtest.id);
      }
    } catch (error) {
      logger.error('Error cleaning up old backtests:', error);
    }
  }

  async updateMarketData() {
    try {
      const symbols = Array.from(this.activeStrategies.values())
        .flatMap(strategy => strategy.symbols);
      
      for (const symbol of symbols) {
        await this.marketDataProvider.updateSymbolData(symbol);
      }
    } catch (error) {
      logger.error('Error updating market data:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.pluginManager.initialize();
      await this.strategyEngine.initialize();
      await this.backtestEngine.initialize();
      await this.paperTradingEngine.initialize();
      await this.marketDataProvider.initialize();
      await this.riskManager.initialize();
      await this.performanceAnalyzer.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Algorithmic Trading Framework started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Algorithmic Trading Framework:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Algorithmic Trading Framework...');
    
    // Stop all active strategies
    for (const [strategyId, strategy] of this.activeStrategies) {
      try {
        await this.strategyEngine.stopStrategy(strategyId, strategy.userId);
      } catch (error) {
        logger.error(`Error stopping strategy ${strategyId}:`, error);
      }
    }
    
    // Stop all paper trading sessions
    for (const [sessionId, session] of this.paperTradingSessions) {
      try {
        await this.paperTradingEngine.stopSession(sessionId, session.userId);
      } catch (error) {
        logger.error(`Error stopping paper trading session ${sessionId}:`, error);
      }
    }
    
    // Close services
    await this.pluginManager.close();
    await this.strategyEngine.close();
    await this.backtestEngine.close();
    await this.paperTradingEngine.close();
    await this.marketDataProvider.close();
    await this.riskManager.close();
    await this.performanceAnalyzer.close();
    
    this.server.close(() => {
      logger.info('Algorithmic Trading Framework shutdown complete');
      process.exit(0);
    });
  }
}

// Start the framework
if (require.main === module) {
  const framework = new AlgorithmicTradingFramework();
  framework.start();
}

module.exports = AlgorithmicTradingFramework;
