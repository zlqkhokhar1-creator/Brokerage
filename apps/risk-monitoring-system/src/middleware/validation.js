const Joi = require('joi');
const { logger } = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        logger.warn('Validation error', { 
          error: error.details[0].message,
          path: error.details[0].path
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }
      
      req.body = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      res.status(500).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query);
      
      if (error) {
        logger.warn('Query validation error', { 
          error: error.details[0].message,
          path: error.details[0].path
        });
        
        return res.status(400).json({
          error: 'Query validation failed',
          message: error.details[0].message,
          code: 'QUERY_VALIDATION_ERROR'
        });
      }
      
      req.query = value;
      next();
    } catch (err) {
      logger.error('Query validation middleware error:', err);
      res.status(500).json({
        error: 'Query validation failed',
        code: 'QUERY_VALIDATION_ERROR'
      });
    }
  };
};

// Common validation schemas
const schemas = {
  portfolioRisk: Joi.object({
    portfolioId: Joi.string().required(),
    positions: Joi.array().items(
      Joi.object({
        symbol: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().positive().required()
      })
    ).required(),
    marketData: Joi.object().optional()
  }),

  stressTest: Joi.object({
    portfolioId: Joi.string().required(),
    scenarios: Joi.array().items(Joi.string()).min(1).required(),
    positions: Joi.array().items(
      Joi.object({
        symbol: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().positive().required()
      })
    ).required()
  }),

  correlationAnalysis: Joi.object({
    symbols: Joi.array().items(Joi.string()).min(2).required(),
    timeframe: Joi.string().valid('1d', '7d', '30d', '90d', '1y', '2y', '5y').default('30d'),
    method: Joi.string().valid('pearson', 'spearman', 'kendall').default('pearson')
  }),

  riskLimits: Joi.object({
    maxVar95: Joi.number().min(0).max(1).default(0.05),
    maxVar99: Joi.number().min(0).max(1).default(0.10),
    maxCVaR95: Joi.number().min(0).max(1).default(0.08),
    maxDrawdown: Joi.number().min(0).max(1).default(0.20),
    maxConcentration: Joi.number().min(0).max(100).default(30),
    maxLiquidityRisk: Joi.number().min(0).max(100).default(50),
    maxRiskScore: Joi.number().min(0).max(100).default(70)
  }),

  alertAcknowledgment: Joi.object({
    alertIds: Joi.array().items(Joi.string()).min(1).required()
  }),

  alertResolution: Joi.object({
    alertIds: Joi.array().items(Joi.string()).min(1).required(),
    resolution: Joi.string().required()
  })
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas
};

