const Joi = require('joi');
const { logger } = require('../utils/logger');

// Validation schemas
const schemas = {
  authentication: Joi.object({
    username: Joi.string().required().min(1).max(255),
    password: Joi.string().required().min(8).max(255),
    mfaToken: Joi.string().optional().length(6),
    deviceInfo: Joi.object({
      type: Joi.string().valid('web', 'mobile', 'desktop').optional(),
      id: Joi.string().optional(),
      ipAddress: Joi.string().ip().optional(),
      userAgent: Joi.string().optional()
    }).optional()
  }),

  authorization: Joi.object({
    resource: Joi.string().required().min(1).max(255),
    action: Joi.string().required().min(1).max(255),
    context: Joi.object().optional()
  }),

  policyCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    rules: Joi.array().items(Joi.object()).optional(),
    conditions: Joi.array().items(Joi.object()).optional()
  }),

  threatAnalysis: Joi.object({
    data: Joi.any().required(),
    analysisType: Joi.string().valid('pattern', 'behavioral', 'statistical', 'network', 'temporal').required(),
    parameters: Joi.object().optional()
  }),

  incidentCreation: Joi.object({
    title: Joi.string().required().min(1).max(255),
    description: Joi.string().required().min(1).max(2000),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    category: Joi.string().valid('security', 'system', 'network', 'application').required(),
    affectedSystems: Joi.array().items(Joi.string()).optional()
  }),

  segmentationPolicy: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    rules: Joi.array().items(Joi.object()).optional(),
    networkConfig: Joi.object().optional()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { abortEarly: false });
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errorDetails
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorDetails
        });
      }
      
      req.body = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = { validate, schemas };
