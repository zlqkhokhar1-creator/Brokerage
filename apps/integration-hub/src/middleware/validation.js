const Joi = require('joi');
const { logger } = require('./logger');

// Validation schemas
const schemas = {
  webhookCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    url: Joi.string().uri().required(),
    events: Joi.array().items(Joi.string()).min(1).required(),
    secret: Joi.string().optional().min(1).max(255),
    headers: Joi.object().optional()
  }),

  integrationCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    type: Joi.string().valid('api', 'webhook', 'database', 'file').required(),
    configuration: Joi.object().required(),
    partners: Joi.array().items(Joi.string()).optional()
  }),

  integrationExecution: Joi.object({
    parameters: Joi.object().optional(),
    data: Joi.object().optional()
  }),

  dataTransformation: Joi.object({
    data: Joi.any().required(),
    transformationType: Joi.string().required(),
    parameters: Joi.object().optional()
  }),

  rateLimitCreation: Joi.object({
    partnerId: Joi.string().required(),
    endpoint: Joi.string().required(),
    limits: Joi.object({
      requests: Joi.number().integer().min(1).required(),
      window: Joi.number().integer().min(1).required()
    }).required(),
    window: Joi.string().valid('second', 'minute', 'hour', 'day').required()
  }),

  partnerCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    type: Joi.string().valid('api', 'webhook', 'database', 'file').required(),
    configuration: Joi.object().required(),
    credentials: Joi.object().optional()
  }),

  alertCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    integrationId: Joi.string().required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    conditions: Joi.array().items(Joi.object({
      type: Joi.string().required(),
      field: Joi.string().required(),
      operator: Joi.string().required(),
      value: Joi.any().required()
    })).min(1).required(),
    config: Joi.object().optional()
  }),

  healthCheckCreation: Joi.object({
    name: Joi.string().required().min(1).max(255),
    integrationId: Joi.string().required(),
    type: Joi.string().valid('api', 'webhook', 'database', 'file').required(),
    config: Joi.object().required(),
    interval: Joi.number().integer().min(1).max(3600).required(),
    timeout: Joi.number().integer().min(1).max(300).optional()
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
const validateWebhookUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
};

const validateApiConfiguration = (config) => {
  const requiredFields = ['baseUrl'];
  return requiredFields.every(field => config.hasOwnProperty(field));
};

const validateWebhookConfiguration = (config) => {
  const requiredFields = ['webhookUrl'];
  return requiredFields.every(field => config.hasOwnProperty(field));
};

const validateDatabaseConfiguration = (config) => {
  const requiredFields = ['connectionString'];
  return requiredFields.every(field => config.hasOwnProperty(field));
};

const validateFileConfiguration = (config) => {
  const requiredFields = ['filePath'];
  return requiredFields.every(field => config.hasOwnProperty(field));
};

const validateIntegrationConfiguration = (type, config) => {
  switch (type) {
    case 'api':
      return validateApiConfiguration(config);
    case 'webhook':
      return validateWebhookConfiguration(config);
    case 'database':
      return validateDatabaseConfiguration(config);
    case 'file':
      return validateFileConfiguration(config);
    default:
      return false;
  }
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  validateWebhookUrl,
  validateApiConfiguration,
  validateWebhookConfiguration,
  validateDatabaseConfiguration,
  validateFileConfiguration,
  validateIntegrationConfiguration,
  schemas
};
