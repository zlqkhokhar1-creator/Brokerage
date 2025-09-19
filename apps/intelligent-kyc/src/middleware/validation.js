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

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      logger.warn('Query validation error:', error.details);
      return res.status(400).json({
        error: 'Query validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      logger.warn('Params validation error:', error.details);
      return res.status(400).json({
        error: 'Params validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  userId: Joi.object({
    userId: Joi.string().uuid().required()
  }),
  
  documentUpload: Joi.object({
    type: Joi.string().valid('passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement').required(),
    content: Joi.string().required(),
    metadata: Joi.object().optional()
  }),
  
  personalInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
    dateOfBirth: Joi.date().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).required()
  }),
  
  onboardingData: Joi.object({
    personalInfo: Joi.object().required(),
    documents: Joi.array().items(Joi.object()).required(),
    preferences: Joi.object().optional()
  })
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  schemas
};