/**
 * Enhanced Logging System with Winston
 * Structured logging for the brokerage platform
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure transports
const transports = [
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // HTTP requests log
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3
  })
];

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  defaultMeta: { 
    service: 'brokerage-api',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// HTTP request logging middleware
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.http('HTTP Request Started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    userId: req.user?.id,
    sessionId: req.sessionID,
    contentLength: req.get('content-length'),
    contentType: req.get('content-type')
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, 'HTTP Request Completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length'),
      userId: req.user?.id,
      ip: req.ip
    });
  });
  
  next();
};

// Database query logging
const logQuery = (query, params = [], duration = null) => {
  logger.debug('Database Query', {
    query: query.replace(/\s+/g, ' ').trim(),
    params,
    duration,
    timestamp: new Date().toISOString()
  });
};

// Business operation logging
const logBusinessOperation = (operation, data = {}, userId = null) => {
  logger.info('Business Operation', {
    operation,
    userId,
    data,
    timestamp: new Date().toISOString()
  });
};

// Security event logging
const logSecurityEvent = (event, details = {}, severity = 'warn') => {
  logger.log(severity, 'Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// API call logging
const logApiCall = (service, endpoint, duration, success, error = null) => {
  const level = success ? 'info' : 'warn';
  
  logger.log(level, 'External API Call', {
    service,
    endpoint,
    duration,
    success,
    error: error?.message,
    timestamp: new Date().toISOString()
  });
};

// Performance monitoring
const logPerformance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

// User activity logging
const logUserActivity = (userId, activity, details = {}) => {
  logger.info('User Activity', {
    userId,
    activity,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Trading operation logging
const logTradingOperation = (userId, operation, data = {}) => {
  logger.info('Trading Operation', {
    userId,
    operation,
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Error context logging
const logErrorContext = (error, context = {}) => {
  logger.error('Error Context', {
    error: error.message,
    stack: error.stack,
    type: error.constructor.name,
    ...context,
    timestamp: new Date().toISOString()
  });
};

// Health check logging
const logHealthCheck = (checks, status) => {
  logger.info('Health Check', {
    status,
    checks,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  httpLogger,
  logQuery,
  logBusinessOperation,
  logSecurityEvent,
  logApiCall,
  logPerformance,
  logUserActivity,
  logTradingOperation,
  logErrorContext,
  logHealthCheck
};
