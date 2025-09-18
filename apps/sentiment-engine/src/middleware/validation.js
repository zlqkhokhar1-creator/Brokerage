const Joi = require('joi');
const { logger } = require('../utils/logger');

// Validation schemas
const schemas = {
  sentimentAnalysis: Joi.object({
    text: Joi.string().min(1).max(10000).required(),
    symbol: Joi.string().min(1).max(10).optional(),
    source: Joi.string().valid('news', 'twitter', 'reddit', 'youtube', 'analyst', 'earnings', 'press_release', 'general').optional(),
    metadata: Joi.object().optional()
  }),

  sentimentSubscription: Joi.object({
    symbols: Joi.array().items(Joi.string().min(1).max(10)).min(1).max(50).required(),
    userId: Joi.string().uuid().optional()
  }),

  sentimentQuery: Joi.object({
    timeframe: Joi.string().valid('1h', '4h', '24h', '7d').optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    threshold: Joi.number().min(0).max(1).optional()
  }),

  sentimentAlert: Joi.object({
    symbol: Joi.string().min(1).max(10).required(),
    threshold: Joi.number().min(0).max(1).optional(),
    enabled: Joi.boolean().optional()
  })
};

// Validation middleware factory
const validateRequest = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema not found: ${schemaName}`);
      return res.status(500).json({
        success: false,
        error: 'Validation schema not found'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', {
        schema: schemaName,
        errors: errorDetails,
        body: req.body
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
  };
};

// Query parameter validation middleware
const validateQuery = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema not found: ${schemaName}`);
      return res.status(500).json({
        success: false,
        error: 'Validation schema not found'
      });
    }

    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      });

      logger.warn('Query validation failed', {
        schema: schemaName,
        errors: errorDetails,
        query: req.query
      });

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: errorDetails
      });
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    next();
  };
};

// Custom validation functions
const validateSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }
  
  // Basic symbol validation (alphanumeric, 1-10 characters)
  const symbolRegex = /^[A-Z0-9]{1,10}$/;
  return symbolRegex.test(symbol.toUpperCase());
};

const validateTimeframe = (timeframe) => {
  const validTimeframes = ['1h', '4h', '24h', '7d'];
  return validTimeframes.includes(timeframe);
};

const validateSentimentScore = (score) => {
  return typeof score === 'number' && score >= -1 && score <= 1;
};

const validateConfidence = (confidence) => {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
};

// Sanitization functions
const sanitizeText = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 10000); // Limit length
};

const sanitizeSymbol = (symbol) => {
  if (typeof symbol !== 'string') {
    return '';
  }
  
  return symbol
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 10); // Limit length
};

const sanitizeSource = (source) => {
  const validSources = ['news', 'twitter', 'reddit', 'youtube', 'analyst', 'earnings', 'press_release', 'general'];
  return validSources.includes(source) ? source : 'general';
};

// Error response helper
const validationError = (res, message, details = []) => {
  return res.status(400).json({
    success: false,
    error: message,
    details
  });
};

module.exports = {
  validateRequest,
  validateQuery,
  validateSymbol,
  validateTimeframe,
  validateSentimentScore,
  validateConfidence,
  sanitizeText,
  sanitizeSymbol,
  sanitizeSource,
  validationError,
  schemas
};
