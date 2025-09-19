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
  complianceCheck: Joi.object({
    portfolioId: Joi.string().required(),
    positions: Joi.array().items(
      Joi.object({
        symbol: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().positive().required()
      })
    ).required(),
    marketData: Joi.object().optional(),
    portfolioValue: Joi.number().positive().required()
  }),

  regulatoryReport: Joi.object({
    reportType: Joi.string().valid('form_13f', 'form_adv', 'form_cpf', 'form_17h', 'form_8k', 'form_10k', 'form_10q').required(),
    portfolioId: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    format: Joi.string().valid('pdf', 'xml', 'excel').default('pdf')
  }),

  reportQuery: Joi.object({
    status: Joi.string().valid('pending', 'generating', 'completed', 'failed').optional(),
    reportType: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  kycVerification: Joi.object({
    customerId: Joi.string().required(),
    customerData: Joi.object({
      name: Joi.string().required(),
      dateOfBirth: Joi.date().required(),
      nationality: Joi.string().required(),
      address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zip: Joi.string().required()
      }).required(),
      phone: Joi.string().required(),
      email: Joi.string().email().required()
    }).required(),
    documents: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('passport', 'driver_license', 'national_id', 'utility_bill', 'bank_statement').required(),
        content: Joi.string().required(),
        metadata: Joi.object().optional()
      })
    ).required(),
    verificationMethods: Joi.array().items(Joi.string()).optional()
  }),

  tradeSurveillance: Joi.object({
    trades: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        symbol: Joi.string().required(),
        quantity: Joi.number().required(),
        price: Joi.number().positive().required(),
        timestamp: Joi.date().required(),
        orderSize: Joi.number().positive().required(),
        buyerAccount: Joi.string().required(),
        sellerAccount: Joi.string().required(),
        orderType: Joi.string().valid('market', 'limit', 'stop').required(),
        status: Joi.string().valid('pending', 'filled', 'cancelled').required()
      })
    ).required(),
    portfolioId: Joi.string().required(),
    userId: Joi.string().required()
  }),

  alertQuery: Joi.object({
    status: Joi.string().valid('active', 'acknowledged', 'resolved').optional(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    category: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  auditQuery: Joi.object({
    eventType: Joi.string().optional(),
    entityType: Joi.string().optional(),
    entityId: Joi.string().optional(),
    action: Joi.string().optional(),
    severity: Joi.string().valid('info', 'warning', 'error', 'critical').optional(),
    category: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  auditLog: Joi.object({
    eventType: Joi.string().required(),
    entityType: Joi.string().required(),
    entityId: Joi.string().optional(),
    action: Joi.string().required(),
    details: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  policy: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    category: Joi.string().required(),
    content: Joi.object().optional(),
    rules: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        description: Joi.string().optional(),
        condition: Joi.string().required(),
        action: Joi.string().required(),
        parameters: Joi.object().optional()
      })
    ).optional(),
    compliance: Joi.array().items(Joi.string()).optional(),
    enabled: Joi.boolean().default(true)
  })
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas
};

