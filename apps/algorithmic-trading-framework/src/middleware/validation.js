const Joi = require('joi');
const { logger } = require('../utils/logger');

// Validation schemas
const schemas = {
  pluginLoad: Joi.object({
    pluginId: Joi.string().required(),
    config: Joi.object().optional()
  }),

  strategyCreate: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    pluginId: Joi.string().required(),
    config: Joi.object().optional(),
    symbols: Joi.array().items(Joi.string()).min(1).required()
  }),

  backtestRun: Joi.object({
    strategyId: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    initialCapital: Joi.number().positive().required(),
    symbols: Joi.array().items(Joi.string()).min(1).required()
  }),

  paperTradingStart: Joi.object({
    strategyId: Joi.string().required(),
    initialCapital: Joi.number().positive().required(),
    symbols: Joi.array().items(Joi.string()).min(1).required()
  }),

  marketDataRequest: Joi.object({
    symbol: Joi.string().required(),
    timeframe: Joi.string().valid('1m', '5m', '15m', '1h', '4h', '1d').optional(),
    limit: Joi.number().integer().min(1).max(10000).optional()
  }),

  performanceRequest: Joi.object({
    timeframe: Joi.string().valid('1d', '7d', '30d', '90d', '1y', 'all').optional()
  }),

  strategyUpdate: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    config: Joi.object().optional(),
    symbols: Joi.array().items(Joi.string()).min(1).optional()
  }),

  riskLimits: Joi.object({
    maxPositionSize: Joi.number().positive().optional(),
    maxDailyLoss: Joi.number().positive().optional(),
    maxDrawdown: Joi.number().min(0).max(1).optional(),
    maxTradesPerDay: Joi.number().integer().positive().optional(),
    maxExposure: Joi.number().positive().optional(),
    riskTolerance: Joi.string().valid('low', 'moderate', 'high', 'aggressive').optional()
  }),

  tradeExecution: Joi.object({
    symbol: Joi.string().required(),
    action: Joi.string().valid('BUY', 'SELL').required(),
    quantity: Joi.number().positive().required(),
    price: Joi.number().positive().optional(),
    orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT').optional(),
    timeInForce: Joi.string().valid('DAY', 'GTC', 'IOC', 'FOK').optional()
  }),

  symbolSearch: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(100).optional()
  }),

  performanceComparison: Joi.object({
    strategyIds: Joi.array().items(Joi.string()).min(2).max(10).required(),
    timeframe: Joi.string().valid('1d', '7d', '30d', '90d', '1y', 'all').optional()
  })
};

// Validation middleware factory
const validateRequest = (schemaName) => {
  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        logger.error(`Validation schema '${schemaName}' not found`);
        return res.status(500).json({
          success: false,
          error: 'Validation schema not found'
        });
      }

      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation failed', {
          schema: schemaName,
          errors: errorDetails,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorDetails
        });
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  };
};

// Query parameter validation
const validateQuery = (schemaName) => {
  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        logger.error(`Validation schema '${schemaName}' not found`);
        return res.status(500).json({
          success: false,
          error: 'Validation schema not found'
        });
      }

      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Query validation failed', {
          schema: schemaName,
          errors: errorDetails,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errorDetails
        });
      }

      req.query = value;
      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Query validation failed'
      });
    }
  };
};

// Custom validation functions
const validateSymbol = (symbol) => {
  const symbolSchema = Joi.string().pattern(/^[A-Z]{1,5}$/).required();
  const { error } = symbolSchema.validate(symbol);
  return !error;
};

const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (start >= end) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  if (start > now) {
    return { valid: false, error: 'Start date cannot be in the future' };
  }
  
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    return { valid: false, error: 'Date range cannot exceed 365 days' };
  }
  
  return { valid: true };
};

const validateCapital = (capital) => {
  if (typeof capital !== 'number' || capital <= 0) {
    return { valid: false, error: 'Capital must be a positive number' };
  }
  
  if (capital < 1000) {
    return { valid: false, error: 'Minimum capital is $1,000' };
  }
  
  if (capital > 10000000) {
    return { valid: false, error: 'Maximum capital is $10,000,000' };
  }
  
  return { valid: true };
};

const validateQuantity = (quantity) => {
  if (typeof quantity !== 'number' || quantity <= 0) {
    return { valid: false, error: 'Quantity must be a positive number' };
  }
  
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be a whole number' };
  }
  
  if (quantity > 1000000) {
    return { valid: false, error: 'Maximum quantity is 1,000,000' };
  }
  
  return { valid: true };
};

const validatePrice = (price) => {
  if (typeof price !== 'number' || price <= 0) {
    return { valid: false, error: 'Price must be a positive number' };
  }
  
  if (price > 1000000) {
    return { valid: false, error: 'Maximum price is $1,000,000' };
  }
  
  return { valid: true };
};

// Sanitization functions
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

const sanitizeNumber = (num) => {
  if (typeof num === 'string') {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof num === 'number' ? num : 0;
};

const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
};

// Error response formatter
const formatValidationError = (error) => {
  return {
    success: false,
    error: 'Validation failed',
    details: error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))
  };
};

module.exports = {
  validateRequest,
  validateQuery,
  validateSymbol,
  validateDateRange,
  validateCapital,
  validateQuantity,
  validatePrice,
  sanitizeString,
  sanitizeNumber,
  sanitizeArray,
  formatValidationError,
  schemas
};

