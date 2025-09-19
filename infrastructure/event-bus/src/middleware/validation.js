const Joi = require('joi');
const logger = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      logger.warn('Validation error:', error.details);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  publishEvent: Joi.object({
    eventType: Joi.string().required(),
    data: Joi.object().required(),
    targetServices: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
  }),
  
  subscribeEvent: Joi.object({
    serviceName: Joi.string().required(),
    eventTypes: Joi.array().items(Joi.string()).required(),
    callbackUrl: Joi.string().uri().required()
  }),
  
  sendMessage: Joi.object({
    queueName: Joi.string().required(),
    message: Joi.object().required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    delay: Joi.number().min(0).optional()
  }),
  
  registerService: Joi.object({
    serviceName: Joi.string().required(),
    serviceUrl: Joi.string().uri().required(),
    healthCheckUrl: Joi.string().uri().required(),
    capabilities: Joi.array().items(Joi.string()).optional()
  })
};

module.exports = {
  validateRequest,
  schemas
};
