const Joi = require('joi');
const logger = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      logger.error('Validation error:', error.details[0].message);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details[0].message 
      });
    }
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      logger.error('Query validation error:', error.details[0].message);
      return res.status(400).json({ 
        error: 'Query validation error', 
        details: error.details[0].message 
      });
    }
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      logger.error('Params validation error:', error.details[0].message);
      return res.status(400).json({ 
        error: 'Params validation error', 
        details: error.details[0].message 
      });
    }
    next();
  };
};

// Integration validation schemas
const createIntegrationSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  type: Joi.string().required().valid('market_data', 'trading', 'banking', 'compliance'),
  provider: Joi.string().required().min(1).max(100),
  configuration: Joi.object().required(),
  endpoints: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required().uri(),
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').required()
  })).required(),
  authentication: Joi.object({
    type: Joi.string().valid('api_key', 'bearer_token', 'basic_auth', 'oauth2').required(),
    header: Joi.string().optional(),
    key: Joi.string().optional(),
    token: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
    access_token: Joi.string().optional()
  }).required()
});

const updateIntegrationSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  type: Joi.string().optional().valid('market_data', 'trading', 'banking', 'compliance'),
  provider: Joi.string().optional().min(1).max(100),
  configuration: Joi.object().optional(),
  endpoints: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required().uri(),
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').required()
  })).optional(),
  authentication: Joi.object({
    type: Joi.string().valid('api_key', 'bearer_token', 'basic_auth', 'oauth2').required(),
    header: Joi.string().optional(),
    key: Joi.string().optional(),
    token: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
    access_token: Joi.string().optional()
  }).optional()
});

const getIntegrationsSchema = Joi.object({
  type: Joi.string().optional().valid('market_data', 'trading', 'banking', 'compliance'),
  status: Joi.string().optional().valid('active', 'inactive', 'error'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const integrationIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

// Data transformation validation schemas
const transformDataSchema = Joi.object({
  sourceData: Joi.alternatives().try(
    Joi.object(),
    Joi.array().items(Joi.object())
  ).required(),
  transformationRules: Joi.object({
    fieldMappings: Joi.object().optional(),
    validations: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      type: Joi.string().valid('string', 'number', 'email', 'date', 'boolean').required(),
      required: Joi.boolean().optional(),
      min: Joi.number().optional(),
      max: Joi.number().optional(),
      pattern: Joi.string().optional()
    })).optional(),
    filters: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in').required(),
      value: Joi.any().required()
    })).optional(),
    aggregations: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      operation: Joi.string().valid('sum', 'avg', 'min', 'max', 'count', 'distinct_count').required(),
      groupBy: Joi.string().optional()
    })).optional()
  }).required(),
  targetFormat: Joi.string().valid('json', 'csv', 'xml', 'yaml').required()
});

// Data sync validation schemas
const syncDataSchema = Joi.object({
  integrationId: Joi.string().required().uuid(),
  dataType: Joi.string().required().min(1).max(100),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// API route validation schemas
const createRouteSchema = Joi.object({
  path: Joi.string().required().min(1).max(255),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').required(),
  target: Joi.string().required().uri(),
  service: Joi.string().required().min(1).max(100),
  loadBalancer: Joi.string().optional(),
  circuitBreaker: Joi.string().optional(),
  rateLimit: Joi.number().integer().min(1).optional(),
  authentication: Joi.boolean().optional(),
  authorization: Joi.string().optional(),
  middleware: Joi.array().items(Joi.string()).optional()
});

const updateRouteSchema = Joi.object({
  path: Joi.string().optional().min(1).max(255),
  method: Joi.string().optional().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  target: Joi.string().optional().uri(),
  service: Joi.string().optional().min(1).max(100),
  loadBalancer: Joi.string().optional(),
  circuitBreaker: Joi.string().optional(),
  rateLimit: Joi.number().integer().min(1).optional(),
  authentication: Joi.boolean().optional(),
  authorization: Joi.string().optional(),
  middleware: Joi.array().items(Joi.string()).optional()
});

const getRoutesSchema = Joi.object({
  service: Joi.string().optional().min(1).max(100),
  method: Joi.string().optional().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const routeIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  
  // Integration validators
  createIntegration: validateRequest(createIntegrationSchema),
  updateIntegration: validateRequest(updateIntegrationSchema),
  getIntegrations: validateQuery(getIntegrationsSchema),
  getIntegration: validateParams(integrationIdSchema),
  deleteIntegration: validateParams(integrationIdSchema),
  testIntegration: validateParams(integrationIdSchema),
  
  // Data transformation validators
  transformData: validateRequest(transformDataSchema),
  
  // Data sync validators
  syncData: validateRequest(syncDataSchema),
  
  // API route validators
  createRoute: validateRequest(createRouteSchema),
  updateRoute: validateRequest(updateRouteSchema),
  getRoutes: validateQuery(getRoutesSchema),
  getRoute: validateParams(routeIdSchema),
  deleteRoute: validateParams(routeIdSchema)
};