const Joi = require('joi');
const { logger } = require('./logger');

// Validation schemas
const schemas = {
  notificationSending: Joi.object({
    recipients: Joi.array().items(Joi.string()).min(1).required(),
    message: Joi.alternatives().try(
      Joi.string().min(1).max(1000),
      Joi.object({
        text: Joi.string().min(1).max(1000).required(),
        subject: Joi.string().min(1).max(200).optional(),
        html: Joi.string().max(5000).optional()
      })
    ).required(),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'webhook', 'in_app')).min(1).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    schedule: Joi.date().greater('now').optional()
  }),

  templateCreation: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    content: Joi.alternatives().try(
      Joi.string().min(1).max(1000),
      Joi.object({
        text: Joi.string().min(1).max(1000).required(),
        subject: Joi.string().min(1).max(200).optional(),
        html: Joi.string().max(5000).optional()
      })
    ).required(),
    variables: Joi.array().items(Joi.string()).optional(),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'webhook', 'in_app')).min(1).required()
  }),

  channelTest: Joi.object({
    testData: Joi.object().required()
  }),

  personalizationAnalysis: Joi.object({
    userId: Joi.string().required(),
    behaviorData: Joi.object().optional(),
    preferences: Joi.object().optional()
  }),

  deliveryOptimization: Joi.object({
    notificationId: Joi.string().required(),
    optimizationType: Joi.string().valid('timing', 'channel_selection', 'personalization', 'batch_processing', 'retry_strategy').required(),
    parameters: Joi.object().optional()
  }),

  abTestCreation: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    variants: Joi.array().items(Joi.object({
      name: Joi.string().min(1).max(100).required(),
      configuration: Joi.object().required()
    })).min(2).required(),
    trafficSplit: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(100)).required(),
    duration: Joi.number().integer().min(1).max(365).required()
  })
};

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

      logger.warn('Validation error:', {
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

      logger.warn('Query validation error:', {
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

const validateParams = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema not found: ${schemaName}`);
      return res.status(500).json({
        success: false,
        error: 'Validation schema not found'
      });
    }

    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      });

      logger.warn('Params validation error:', {
        schema: schemaName,
        errors: errorDetails,
        params: req.params
      });

      return res.status(400).json({
        success: false,
        error: 'Params validation failed',
        details: errorDetails
      });
    }

    // Replace req.params with validated and sanitized data
    req.params = value;
    next();
  };
};

// Custom validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateWebhookUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
};

const validateDeviceToken = (token) => {
  return token && token.length >= 10;
};

const validateNotificationChannels = (channels) => {
  const validChannels = ['email', 'sms', 'push', 'webhook', 'in_app'];
  return channels.every(channel => validChannels.includes(channel));
};

const validateNotificationPriority = (priority) => {
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  return validPriorities.includes(priority);
};

const validateTemplateVariables = (variables) => {
  if (!Array.isArray(variables)) {
    return false;
  }
  
  return variables.every(variable => 
    typeof variable === 'string' && 
    variable.length > 0 && 
    variable.length <= 50 &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)
  );
};

const validateABTestVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length < 2) {
    return false;
  }
  
  return variants.every(variant => 
    variant.name && 
    variant.configuration &&
    typeof variant.name === 'string' &&
    typeof variant.configuration === 'object'
  );
};

const validateTrafficSplit = (trafficSplit) => {
  if (typeof trafficSplit !== 'object' || trafficSplit === null) {
    return false;
  }
  
  const percentages = Object.values(trafficSplit);
  const total = percentages.reduce((sum, percentage) => sum + percentage, 0);
  
  return Math.abs(total - 100) < 0.01 && 
         percentages.every(percentage => percentage >= 0 && percentage <= 100);
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  validateEmail,
  validatePhoneNumber,
  validateWebhookUrl,
  validateDeviceToken,
  validateNotificationChannels,
  validateNotificationPriority,
  validateTemplateVariables,
  validateABTestVariants,
  validateTrafficSplit,
  schemas
};
