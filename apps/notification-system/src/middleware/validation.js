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

// Notification validation schemas
const sendNotificationSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  type: Joi.string().required().valid('urgent', 'transactional', 'marketing'),
  channel: Joi.string().optional().valid('email', 'sms', 'push', 'webhook'),
  template: Joi.string().required().min(1).max(100),
  data: Joi.object().optional(),
  priority: Joi.string().optional().valid('low', 'medium', 'high'),
  scheduledAt: Joi.date().optional()
});

const getNotificationsSchema = Joi.object({
  userId: Joi.string().optional().uuid(),
  type: Joi.string().optional().valid('urgent', 'transactional', 'marketing'),
  status: Joi.string().optional().valid('pending', 'sent', 'failed'),
  channel: Joi.string().optional().valid('email', 'sms', 'push', 'webhook'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const notificationIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

const getNotificationStatsSchema = Joi.object({
  userId: Joi.string().optional().uuid(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// Template validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  channel: Joi.string().required().valid('email', 'sms', 'push', 'webhook'),
  subject: Joi.string().optional().max(255),
  title: Joi.string().optional().max(255),
  body: Joi.string().optional().max(1000),
  content: Joi.string().optional().max(5000),
  html_content: Joi.string().optional().max(10000),
  text_content: Joi.string().optional().max(5000),
  data_fields: Joi.object().optional()
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().optional().min(1).max(100),
  channel: Joi.string().optional().valid('email', 'sms', 'push', 'webhook'),
  subject: Joi.string().optional().max(255),
  title: Joi.string().optional().max(255),
  body: Joi.string().optional().max(1000),
  content: Joi.string().optional().max(5000),
  html_content: Joi.string().optional().max(10000),
  text_content: Joi.string().optional().max(5000),
  data_fields: Joi.object().optional()
});

const templateIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

const getTemplatesSchema = Joi.object({
  channel: Joi.string().optional().valid('email', 'sms', 'push', 'webhook'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// User preferences validation schemas
const updateUserPreferencesSchema = Joi.object({
  email_enabled: Joi.boolean().optional(),
  sms_enabled: Joi.boolean().optional(),
  push_enabled: Joi.boolean().optional(),
  webhook_enabled: Joi.boolean().optional(),
  quiet_hours: Joi.object({
    start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
  }).optional(),
  timezone: Joi.string().optional().max(50)
});

const userIdSchema = Joi.object({
  userId: Joi.string().required().uuid()
});

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  
  // Notification validators
  sendNotification: validateRequest(sendNotificationSchema),
  getNotifications: validateQuery(getNotificationsSchema),
  getNotification: validateParams(notificationIdSchema),
  getNotificationStats: validateQuery(getNotificationStatsSchema),
  retryNotification: validateParams(notificationIdSchema),
  
  // Template validators
  createTemplate: validateRequest(createTemplateSchema),
  updateTemplate: validateRequest(updateTemplateSchema),
  getTemplates: validateQuery(getTemplatesSchema),
  getTemplate: validateParams(templateIdSchema),
  deleteTemplate: validateParams(templateIdSchema),
  
  // User preferences validators
  updateUserPreferences: validateRequest(updateUserPreferencesSchema),
  getUserPreferences: validateParams(userIdSchema)
};