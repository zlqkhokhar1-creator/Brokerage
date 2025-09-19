const winston = require('winston');
const path = require('path');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'risk-monitoring-system' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add custom methods
logger.performance = (message, duration, meta = {}) => {
  logger.info(message, { 
    ...meta, 
    duration, 
    type: 'performance' 
  });
};

logger.security = (message, portfolioId, meta = {}) => {
  logger.warn(message, { 
    ...meta, 
    portfolioId, 
    type: 'security' 
  });
};

logger.risk = (portfolioId, message, meta = {}) => {
  logger.warn(message, { 
    ...meta, 
    portfolioId, 
    type: 'risk' 
  });
};

module.exports = { logger };

