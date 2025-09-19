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

// Report validation schemas
const createReportSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().required().valid('trading', 'portfolio', 'market', 'risk', 'performance'),
  template_id: Joi.string().required().uuid(),
  parameters: Joi.object().optional(),
  schedule: Joi.object().optional()
});

const updateReportSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().optional().valid('trading', 'portfolio', 'market', 'risk', 'performance'),
  template_id: Joi.string().optional().uuid(),
  parameters: Joi.object().optional(),
  schedule: Joi.object().optional()
});

const getReportsSchema = Joi.object({
  userId: Joi.string().optional().uuid(),
  type: Joi.string().optional().valid('trading', 'portfolio', 'market', 'risk', 'performance'),
  status: Joi.string().optional().valid('draft', 'active', 'completed', 'failed'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const reportIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

// Dashboard validation schemas
const createDashboardSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().required().valid('portfolio', 'trading', 'market', 'risk', 'performance'),
  layout: Joi.object().required(),
  widgets: Joi.array().required(),
  filters: Joi.object().optional()
});

const updateDashboardSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().optional().valid('portfolio', 'trading', 'market', 'risk', 'performance'),
  layout: Joi.object().optional(),
  widgets: Joi.array().optional(),
  filters: Joi.object().optional()
});

const getDashboardsSchema = Joi.object({
  userId: Joi.string().optional().uuid(),
  type: Joi.string().optional().valid('portfolio', 'trading', 'market', 'risk', 'performance'),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const dashboardIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

// Template validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().required().valid('html', 'pdf', 'excel', 'json'),
  category: Joi.string().required().min(1).max(100),
  content: Joi.object().required(),
  parameters: Joi.object().optional(),
  metadata: Joi.object().optional()
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(1000),
  type: Joi.string().optional().valid('html', 'pdf', 'excel', 'json'),
  category: Joi.string().optional().min(1).max(100),
  content: Joi.object().optional(),
  parameters: Joi.object().optional(),
  metadata: Joi.object().optional()
});

const getTemplatesSchema = Joi.object({
  type: Joi.string().optional().valid('html', 'pdf', 'excel', 'json'),
  category: Joi.string().optional().min(1).max(100),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const templateIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

// Data aggregation validation schemas
const aggregateDataSchema = Joi.object({
  source: Joi.string().required().valid('trading', 'portfolio', 'market', 'risk', 'performance'),
  filters: Joi.object().optional(),
  aggregation: Joi.string().optional().valid('sum', 'avg', 'count', 'min', 'max'),
  groupBy: Joi.string().optional(),
  timeRange: Joi.string().optional()
});

const queryDataSchema = Joi.object({
  query: Joi.string().required().min(1).max(10000),
  filters: Joi.object().optional(),
  limit: Joi.number().integer().min(1).max(10000).optional()
});

// Export validation schemas
const exportReportSchema = Joi.object({
  format: Joi.string().required().valid('pdf', 'excel', 'csv', 'json')
});

const batchExportSchema = Joi.object({
  reportIds: Joi.array().items(Joi.string().uuid()).required().min(1).max(50),
  format: Joi.string().required().valid('pdf', 'excel', 'csv', 'json'),
  userId: Joi.string().required().uuid()
});

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  
  // Report validators
  createReport: validateRequest(createReportSchema),
  updateReport: validateRequest(updateReportSchema),
  getReports: validateQuery(getReportsSchema),
  getReport: validateParams(reportIdSchema),
  deleteReport: validateParams(reportIdSchema),
  executeReport: validateParams(reportIdSchema),
  exportReport: validateParams(exportReportSchema),
  
  // Dashboard validators
  createDashboard: validateRequest(createDashboardSchema),
  updateDashboard: validateRequest(updateDashboardSchema),
  getDashboards: validateQuery(getDashboardsSchema),
  getDashboard: validateParams(dashboardIdSchema),
  deleteDashboard: validateParams(dashboardIdSchema),
  refreshDashboard: validateParams(dashboardIdSchema),
  
  // Template validators
  createTemplate: validateRequest(createTemplateSchema),
  updateTemplate: validateRequest(updateTemplateSchema),
  getTemplates: validateQuery(getTemplatesSchema),
  getTemplate: validateParams(templateIdSchema),
  deleteTemplate: validateParams(templateIdSchema),
  
  // Data aggregation validators
  aggregateData: validateRequest(aggregateDataSchema),
  getDataSources: validateQuery(Joi.object({})),
  queryData: validateRequest(queryDataSchema),
  
  // Export validators
  getExportFormats: validateQuery(Joi.object({})),
  batchExport: validateRequest(batchExportSchema)
};