const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'market-data-processing' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for market data specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'market-data.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Add custom methods for market data specific logging
logger.marketData = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'market_data' });
};

logger.dataIngestion = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'data_ingestion' });
};

logger.dataDistribution = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'data_distribution' });
};

logger.dataQuality = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'data_quality' });
};

logger.latency = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'latency' });
};

logger.cache = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'cache' });
};

logger.websocket = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'websocket' });
};

logger.aggregation = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'aggregation' });
};

logger.indicators = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'indicators' });
};

// Performance logging
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation}`, {
    ...meta,
    category: 'performance',
    operation,
    duration,
    durationMs: duration
  });
};

// Error logging with context
logger.errorWithContext = (message, error, context = {}) => {
  logger.error(message, {
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });
};

// Request logging
logger.request = (req, res, responseTime) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    category: 'http_request'
  });
};

// Database query logging
logger.databaseQuery = (query, duration, meta = {}) => {
  logger.debug('Database Query', {
    ...meta,
    category: 'database',
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    duration: `${duration}ms`
  });
};

// Redis operation logging
logger.redisOperation = (operation, key, duration, meta = {}) => {
  logger.debug('Redis Operation', {
    ...meta,
    category: 'redis',
    operation,
    key,
    duration: `${duration}ms`
  });
};

// WebSocket event logging
logger.websocketEvent = (event, socketId, meta = {}) => {
  logger.info(`WebSocket Event: ${event}`, {
    ...meta,
    category: 'websocket',
    event,
    socketId
  });
};

// Data validation logging
logger.dataValidation = (result, data, meta = {}) => {
  const level = result.passed ? 'info' : 'warn';
  logger[level](`Data Validation: ${result.passed ? 'PASSED' : 'FAILED'}`, {
    ...meta,
    category: 'data_validation',
    validationResult: result,
    dataType: data.type,
    symbol: data.symbol
  });
};

// Cache operation logging
logger.cacheOperation = (operation, key, hit, meta = {}) => {
  logger.info(`Cache ${operation}`, {
    ...meta,
    category: 'cache',
    operation,
    key,
    hit,
    timestamp: new Date().toISOString()
  });
};

// Latency optimization logging
logger.latencyOptimization = (operation, before, after, improvement, meta = {}) => {
  logger.info(`Latency Optimization: ${operation}`, {
    ...meta,
    category: 'latency_optimization',
    operation,
    beforeLatency: before,
    afterLatency: after,
    improvement: `${improvement}%`,
    improvementMs: after - before
  });
};

// Data aggregation logging
logger.dataAggregation = (symbol, sources, aggregationType, result, meta = {}) => {
  logger.info(`Data Aggregation: ${symbol}`, {
    ...meta,
    category: 'data_aggregation',
    symbol,
    sources,
    aggregationType,
    resultCount: result.length,
    processingTime: result.processingTime
  });
};

// Technical indicator calculation logging
logger.indicatorCalculation = (symbol, indicatorType, parameters, result, meta = {}) => {
  logger.info(`Indicator Calculation: ${symbol} - ${indicatorType}`, {
    ...meta,
    category: 'indicators',
    symbol,
    indicatorType,
    parameters,
    resultCount: result.values ? result.values.length : 0,
    processingTime: result.processingTime
  });
};

// Export logger
module.exports = { logger };
