const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'sentiment-engine',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
    }),
    
    // File transports
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// Add request ID to logs if available
logger.addRequestId = (reqId) => {
  return logger.child({ requestId: reqId });
};

// Add user context to logs
logger.addUserContext = (userId, userEmail) => {
  return logger.child({ userId, userEmail });
};

// Add symbol context to logs
logger.addSymbolContext = (symbol) => {
  return logger.child({ symbol });
};

// Performance logging
logger.performance = (operation, duration, metadata = {}) => {
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata
  });
};

// Security logging
logger.security = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    ...details
  });
};

// Business metrics logging
logger.metrics = (metric, value, metadata = {}) => {
  logger.info('Business metric', {
    metric,
    value,
    ...metadata
  });
};

// Error logging with context
logger.logError = (error, context = {}) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    ...context
  });
};

// Audit logging
logger.audit = (action, details = {}) => {
  logger.info('Audit log', {
    action,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = { logger };
