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
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'algorithmic-trading-framework' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write strategy logs to strategy.log
    new winston.transports.File({
      filename: path.join(logsDir, 'strategy.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          });
        })
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add custom methods for different log types
logger.strategy = (strategyId, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    strategyId,
    type: 'strategy'
  });
};

logger.trade = (tradeId, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    tradeId,
    type: 'trade'
  });
};

logger.backtest = (backtestId, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    backtestId,
    type: 'backtest'
  });
};

logger.performance = (strategyId, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    strategyId,
    type: 'performance'
  });
};

logger.risk = (userId, message, meta = {}) => {
  logger.warn(message, {
    ...meta,
    userId,
    type: 'risk'
  });
};

logger.market = (symbol, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    symbol,
    type: 'market'
  });
};

// Add performance logging
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation}`, {
    ...meta,
    operation,
    duration,
    type: 'performance'
  });
};

// Add error context
logger.errorWithContext = (error, context = {}) => {
  logger.error(error.message, {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    type: 'error'
  });
};

// Add audit logging
logger.audit = (action, userId, resource, meta = {}) => {
  logger.info(`Audit: ${action}`, {
    ...meta,
    action,
    userId,
    resource,
    type: 'audit'
  });
};

// Add security logging
logger.security = (event, userId, meta = {}) => {
  logger.warn(`Security: ${event}`, {
    ...meta,
    event,
    userId,
    type: 'security'
  });
};

// Add system health logging
logger.health = (component, status, meta = {}) => {
  logger.info(`Health: ${component} - ${status}`, {
    ...meta,
    component,
    status,
    type: 'health'
  });
};

// Add metrics logging
logger.metrics = (metric, value, meta = {}) => {
  logger.info(`Metrics: ${metric} = ${value}`, {
    ...meta,
    metric,
    value,
    type: 'metrics'
  });
};

// Export logger
module.exports = { logger };

