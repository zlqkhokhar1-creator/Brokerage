const { logger } = require('../utils/logger');

// Validation schemas for different request types
const validationSchemas = {
  dataIngestion: {
    symbol: { type: 'string', required: true, minLength: 1, maxLength: 10 },
    dataType: { type: 'string', required: true, enum: ['price', 'quote', 'trade', 'ohlc', 'realtime'] },
    source: { type: 'string', required: true, enum: ['alpha_vantage', 'yahoo_finance', 'iex_cloud', 'polygon'] },
    data: { type: 'object', required: true }
  },
  
  indicatorCalculation: {
    symbol: { type: 'string', required: true, minLength: 1, maxLength: 10 },
    indicatorType: { type: 'string', required: true, enum: ['sma', 'ema', 'rsi', 'macd', 'bollinger_bands', 'stochastic', 'williams_r', 'atr', 'adx', 'cci'] },
    parameters: { type: 'object', required: true },
    timeRange: { type: 'string', required: true, enum: ['1h', '1d', '1w', '1m', '3m', '6m', '1y'] }
  },
  
  dataSubscription: {
    symbols: { type: 'array', required: true, minItems: 1, maxItems: 100 },
    dataTypes: { type: 'array', required: true, minItems: 1, maxItems: 10 },
    frequency: { type: 'string', required: true, enum: ['realtime', '1s', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h'] }
  },
  
  dataUnsubscription: {
    subscriptionId: { type: 'string', required: true, minLength: 1 }
  },
  
  dataValidation: {
    data: { type: 'object', required: true },
    validationRules: { type: 'array', required: true, minItems: 1 }
  },
  
  latencyOptimization: {
    symbol: { type: 'string', required: true, minLength: 1, maxLength: 10 },
    optimizationType: { type: 'string', required: true, enum: ['caching', 'connection_pooling', 'data_compression', 'batch_processing', 'async_processing', 'memory_optimization'] },
    parameters: { type: 'object', required: true }
  },
  
  dataAggregation: {
    symbol: { type: 'string', required: true, minLength: 1, maxLength: 10 },
    sources: { type: 'array', required: true, minItems: 2, maxItems: 10 },
    aggregationType: { type: 'string', required: true, enum: ['weighted_average', 'median', 'consensus', 'best_source', 'latency_optimized', 'cost_optimized'] },
    parameters: { type: 'object', required: true }
  },
  
  cacheClear: {
    symbol: { type: 'string', required: true, minLength: 1, maxLength: 10 },
    dataType: { type: 'string', required: true, enum: ['price', 'quote', 'trade', 'ohlc', 'indicator'] },
    timeRange: { type: 'string', required: true, enum: ['1h', '1d', '1w', '1m', '3m', '6m', '1y'] }
  }
};

// Validation functions
const validators = {
  string: (value, rules) => {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      return { valid: false, error: `Must be at least ${rules.minLength} characters long` };
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, error: `Must be no more than ${rules.maxLength} characters long` };
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      return { valid: false, error: 'Does not match required pattern' };
    }
    
    if (rules.enum && !rules.enum.includes(value)) {
      return { valid: false, error: `Must be one of: ${rules.enum.join(', ')}` };
    }
    
    return { valid: true };
  },
  
  number: (value, rules) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: 'Must be a number' };
    }
    
    if (rules.min !== undefined && value < rules.min) {
      return { valid: false, error: `Must be at least ${rules.min}` };
    }
    
    if (rules.max !== undefined && value > rules.max) {
      return { valid: false, error: `Must be no more than ${rules.max}` };
    }
    
    if (rules.integer && !Number.isInteger(value)) {
      return { valid: false, error: 'Must be an integer' };
    }
    
    return { valid: true };
  },
  
  boolean: (value, rules) => {
    if (typeof value !== 'boolean') {
      return { valid: false, error: 'Must be a boolean' };
    }
    
    return { valid: true };
  },
  
  array: (value, rules) => {
    if (!Array.isArray(value)) {
      return { valid: false, error: 'Must be an array' };
    }
    
    if (rules.minItems && value.length < rules.minItems) {
      return { valid: false, error: `Must have at least ${rules.minItems} items` };
    }
    
    if (rules.maxItems && value.length > rules.maxItems) {
      return { valid: false, error: `Must have no more than ${rules.maxItems} items` };
    }
    
    if (rules.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = validateValue(value[i], rules.items);
        if (!itemResult.valid) {
          return { valid: false, error: `Item at index ${i}: ${itemResult.error}` };
        }
      }
    }
    
    return { valid: true };
  },
  
  object: (value, rules) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, error: 'Must be an object' };
    }
    
    if (rules.properties) {
      for (const [prop, propRules] of Object.entries(rules.properties)) {
        if (propRules.required && !(prop in value)) {
          return { valid: false, error: `Missing required property: ${prop}` };
        }
        
        if (prop in value) {
          const propResult = validateValue(value[prop], propRules);
          if (!propResult.valid) {
            return { valid: false, error: `Property '${prop}': ${propResult.error}` };
          }
        }
      }
    }
    
    return { valid: true };
  }
};

// Main validation function
const validateValue = (value, rules) => {
  if (rules.required && (value === undefined || value === null)) {
    return { valid: false, error: 'Required field is missing' };
  }
  
  if (value === undefined || value === null) {
    return { valid: true };
  }
  
  const validator = validators[rules.type];
  if (!validator) {
    return { valid: false, error: `Unknown validation type: ${rules.type}` };
  }
  
  return validator(value, rules);
};

// Validate request body against schema
const validateRequest = (schemaName) => {
  return (req, res, next) => {
    try {
      const schema = validationSchemas[schemaName];
      if (!schema) {
        logger.error(`Unknown validation schema: ${schemaName}`);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        const result = validateValue(req.body[field], rules);
        if (!result.valid) {
          errors.push({
            field,
            error: result.error
          });
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Request validation failed', {
          schema: schemaName,
          errors,
          body: req.body
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }
      
      logger.debug('Request validation passed', {
        schema: schemaName,
        body: req.body
      });
      
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        const result = validateValue(req.query[field], rules);
        if (!result.valid) {
          errors.push({
            field,
            error: result.error
          });
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Query validation failed', {
          errors,
          query: req.query
        });
        
        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errors
        });
      }
      
      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Validate path parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        const result = validateValue(req.params[field], rules);
        if (!result.valid) {
          errors.push({
            field,
            error: result.error
          });
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Params validation failed', {
          errors,
          params: req.params
        });
        
        return res.status(400).json({
          success: false,
          error: 'Params validation failed',
          details: errors
        });
      }
      
      next();
    } catch (error) {
      logger.error('Params validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize string fields
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[<>]/g, '');
    };
    
    // Recursively sanitize object
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize path parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Sanitization middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Rate limiting validation
const validateRateLimit = (req, res, next) => {
  try {
    // This would typically integrate with a rate limiting library
    // For now, we'll just log the request
    logger.debug('Rate limit check', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    next();
  } catch (error) {
    logger.error('Rate limit validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  sanitizeInput,
  validateRateLimit,
  validationSchemas,
  validators
};
