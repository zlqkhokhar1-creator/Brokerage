const Joi = require('joi');
const { logger } = require('../services/logger');

// Validation schemas
const schemas = {
  report: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    type: Joi.string().valid('portfolio', 'performance', 'risk', 'compliance', 'custom').required(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').required(),
    schedule: Joi.object({
      frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
      time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
      dayOfMonth: Joi.number().integer().min(1).max(31).optional()
    }).optional(),
    filters: Joi.object().optional(),
    recipients: Joi.array().items(Joi.string().email()).optional(),
    isPublic: Joi.boolean().optional().default(false)
  }),

  template: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    type: Joi.string().valid('portfolio', 'performance', 'risk', 'compliance', 'custom').required(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').required(),
    template: Joi.string().required(),
    variables: Joi.array().items(Joi.string()).optional(),
    isPublic: Joi.boolean().optional().default(false)
  }),

  dashboard: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    layout: Joi.object().required(),
    widgets: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      position: Joi.object({
        x: Joi.number().integer().min(0).required(),
        y: Joi.number().integer().min(0).required(),
        width: Joi.number().integer().min(1).required(),
        height: Joi.number().integer().min(1).required()
      }).required(),
      config: Joi.object().optional()
    })).required(),
    isPublic: Joi.boolean().optional().default(false)
  }),

  export: Joi.object({
    reportId: Joi.string().required(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').required(),
    options: Joi.object({
      includeCharts: Joi.boolean().optional().default(true),
      includeData: Joi.boolean().optional().default(true),
      pageSize: Joi.string().valid('A4', 'A3', 'Letter').optional().default('A4'),
      orientation: Joi.string().valid('portrait', 'landscape').optional().default('portrait')
    }).optional()
  }),

  schedule: Joi.object({
    reportId: Joi.string().required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
    dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
    recipients: Joi.array().items(Joi.string().email()).required(),
    isActive: Joi.boolean().optional().default(true)
  }),

  visualization: Joi.object({
    name: Joi.string().required().min(1).max(255),
    type: Joi.string().valid('line', 'bar', 'pie', 'scatter', 'area', 'heatmap', 'table').required(),
    data: Joi.object().required(),
    config: Joi.object({
      title: Joi.string().optional(),
      xAxis: Joi.object().optional(),
      yAxis: Joi.object().optional(),
      colors: Joi.array().items(Joi.string()).optional(),
      legend: Joi.object().optional()
    }).optional()
  }),

  email: Joi.object({
    to: Joi.array().items(Joi.string().email()).required(),
    subject: Joi.string().required().min(1).max(255),
    body: Joi.string().required(),
    attachments: Joi.array().items(Joi.object({
      filename: Joi.string().required(),
      content: Joi.string().required(),
      contentType: Joi.string().optional()
    })).optional(),
    isHtml: Joi.boolean().optional().default(true)
  }),

  notification: Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().valid('email', 'sms', 'push', 'webhook').required(),
    title: Joi.string().required().min(1).max(255),
    message: Joi.string().required(),
    data: Joi.object().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional().default('medium')
  }),

  accessControl: Joi.object({
    userId: Joi.string().required(),
    resourceType: Joi.string().valid('report', 'template', 'dashboard', 'export').required(),
    resourceId: Joi.string().required(),
    permission: Joi.string().valid('read', 'write', 'delete', 'admin').required()
  }),

  auditLog: Joi.object({
    userId: Joi.string().required(),
    action: Joi.string().required(),
    resourceType: Joi.string().required(),
    resourceId: Joi.string().required(),
    details: Joi.object().optional(),
    ipAddress: Joi.string().optional(),
    userAgent: Joi.string().optional()
  }),

  performanceMetrics: Joi.object({
    service: Joi.string().required(),
    operation: Joi.string().required(),
    duration: Joi.number().positive().required(),
    success: Joi.boolean().required(),
    metadata: Joi.object().optional()
  }),

  cache: Joi.object({
    key: Joi.string().required(),
    value: Joi.any().required(),
    ttl: Joi.number().integer().min(0).optional(),
    tags: Joi.array().items(Joi.string()).optional()
  }),

  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required(),
    stack: Joi.string().optional(),
    context: Joi.object().optional(),
    timestamp: Joi.date().optional().default(Date.now)
  }),

  security: Joi.object({
    userId: Joi.string().required(),
    action: Joi.string().required(),
    resource: Joi.string().required(),
    ipAddress: Joi.string().optional(),
    userAgent: Joi.string().optional(),
    timestamp: Joi.date().optional().default(Date.now)
  }),

  health: Joi.object({
    service: Joi.string().required(),
    status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    timestamp: Joi.date().optional().default(Date.now),
    details: Joi.object().optional()
  }),

  metrics: Joi.object({
    name: Joi.string().required(),
    value: Joi.number().required(),
    unit: Joi.string().optional(),
    tags: Joi.object().optional(),
    timestamp: Joi.date().optional().default(Date.now)
  }),

  configuration: Joi.object({
    key: Joi.string().required(),
    value: Joi.any().required(),
    type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').required(),
    description: Joi.string().optional(),
    isPublic: Joi.boolean().optional().default(false)
  }),

  event: Joi.object({
    type: Joi.string().required(),
    data: Joi.object().required(),
    timestamp: Joi.date().optional().default(Date.now),
    source: Joi.string().optional()
  }),

  validation: Joi.object({
    data: Joi.any().required(),
    schema: Joi.string().required(),
    strict: Joi.boolean().optional().default(false)
  }),

  rateLimit: Joi.object({
    key: Joi.string().required(),
    limit: Joi.number().integer().min(1).required(),
    window: Joi.number().integer().min(1).required(),
    current: Joi.number().integer().min(0).required()
  }),

  encryption: Joi.object({
    data: Joi.string().required(),
    algorithm: Joi.string().valid('aes-256-gcm', 'aes-256-cbc').optional().default('aes-256-gcm'),
    key: Joi.string().optional()
  }),

  compression: Joi.object({
    data: Joi.any().required(),
    algorithm: Joi.string().valid('gzip', 'deflate', 'brotli').optional().default('gzip'),
    level: Joi.number().integer().min(1).max(9).optional().default(6)
  }),

  backup: Joi.object({
    type: Joi.string().valid('full', 'incremental', 'differential').required(),
    source: Joi.string().required(),
    destination: Joi.string().required(),
    compression: Joi.boolean().optional().default(true),
    encryption: Joi.boolean().optional().default(true)
  }),

  monitoring: Joi.object({
    service: Joi.string().required(),
    metric: Joi.string().required(),
    value: Joi.number().required(),
    threshold: Joi.number().optional(),
    alert: Joi.boolean().optional().default(false)
  }),

  analytics: Joi.object({
    event: Joi.string().required(),
    userId: Joi.string().optional(),
    properties: Joi.object().optional(),
    timestamp: Joi.date().optional().default(Date.now)
  }),

  queue: Joi.object({
    name: Joi.string().required(),
    data: Joi.any().required(),
    priority: Joi.number().integer().min(0).max(10).optional().default(5),
    delay: Joi.number().integer().min(0).optional().default(0),
    attempts: Joi.number().integer().min(1).optional().default(1)
  }),

  scheduler: Joi.object({
    name: Joi.string().required(),
    cron: Joi.string().required(),
    task: Joi.string().required(),
    data: Joi.object().optional(),
    isActive: Joi.boolean().optional().default(true)
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

// Query parameter validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, { abortEarly: false });
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Query validation failed', {
          path: req.path,
          method: req.method,
          errors: errorDetails
        });
        
        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors: errorDetails
        });
      }
      
      req.query = value;
      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Path parameter validation
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, { abortEarly: false });
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Params validation failed', {
          path: req.path,
          method: req.method,
          errors: errorDetails
        });
        
        return res.status(400).json({
          success: false,
          message: 'Params validation failed',
          errors: errorDetails
        });
      }
      
      req.params = value;
      next();
    } catch (error) {
      logger.error('Params validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Custom validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const validateDate = (date) => {
  return !isNaN(Date.parse(date));
};

const validateNumber = (value, min = null, max = null) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};

const validateString = (value, minLength = null, maxLength = null) => {
  if (typeof value !== 'string') return false;
  if (minLength !== null && value.length < minLength) return false;
  if (maxLength !== null && value.length > maxLength) return false;
  return true;
};

const validateArray = (value, minLength = null, maxLength = null) => {
  if (!Array.isArray(value)) return false;
  if (minLength !== null && value.length < minLength) return false;
  if (maxLength !== null && value.length > maxLength) return false;
  return true;
};

const validateObject = (value, requiredFields = []) => {
  if (typeof value !== 'object' || value === null) return false;
  for (const field of requiredFields) {
    if (!(field in value)) return false;
  }
  return true;
};

module.exports = {
  schemas,
  validate,
  validateQuery,
  validateParams,
  validateEmail,
  validateUUID,
  validateDate,
  validateNumber,
  validateString,
  validateArray,
  validateObject
};
