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

// Authentication validation schemas
const authenticateUserSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(8),
  deviceId: Joi.string().required().uuid(),
  location: Joi.string().optional().max(100)
});

// Authorization validation schemas
const authorizeRequestSchema = Joi.object({
  resource: Joi.string().required().max(100),
  action: Joi.string().required().max(50),
  userId: Joi.string().required().uuid(),
  context: Joi.object().optional()
});

// Threat detection validation schemas
const detectThreatsSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  activity: Joi.object().required(),
  context: Joi.object().optional()
});

// Identity verification validation schemas
const verifyIdentitySchema = Joi.object({
  userId: Joi.string().required().uuid(),
  verificationType: Joi.string().required().valid('biometric', 'document', 'multi_factor', 'behavioral'),
  verificationData: Joi.object().required()
});

// Security profile validation schemas
const createSecurityProfileSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  securityLevel: Joi.string().required().valid('low', 'medium', 'high', 'critical'),
  networkSegments: Joi.array().items(Joi.string()).required(),
  dataAccessLevel: Joi.string().required().valid('public', 'internal', 'confidential', 'restricted', 'top_secret'),
  applicationAccess: Joi.array().items(Joi.string()).required(),
  restrictions: Joi.object().optional()
});

const updateSecurityProfileSchema = Joi.object({
  securityLevel: Joi.string().optional().valid('low', 'medium', 'high', 'critical'),
  networkSegments: Joi.array().items(Joi.string()).optional(),
  dataAccessLevel: Joi.string().optional().valid('public', 'internal', 'confidential', 'restricted', 'top_secret'),
  applicationAccess: Joi.array().items(Joi.string()).optional(),
  restrictions: Joi.object().optional()
});

// Permission management validation schemas
const grantPermissionSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  resource: Joi.string().required().max(100),
  action: Joi.string().required().max(50),
  conditions: Joi.object().optional()
});

const revokePermissionSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  resource: Joi.string().required().max(100),
  action: Joi.string().required().max(50)
});

// Security event validation schemas
const getSecurityEventsSchema = Joi.object({
  userId: Joi.string().optional().uuid(),
  eventType: Joi.string().optional().max(50),
  severity: Joi.string().optional().valid('low', 'medium', 'high', 'critical'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const securityEventIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

// User management validation schemas
const createUserSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8),
  role: Joi.string().required().valid('admin', 'user', 'viewer'),
  securityLevel: Joi.string().optional().valid('low', 'medium', 'high', 'critical')
});

const updateUserSchema = Joi.object({
  username: Joi.string().optional().min(3).max(50),
  email: Joi.string().optional().email(),
  role: Joi.string().optional().valid('admin', 'user', 'viewer'),
  securityLevel: Joi.string().optional().valid('low', 'medium', 'high', 'critical'),
  isActive: Joi.boolean().optional()
});

const userIdSchema = Joi.object({
  id: Joi.string().required().uuid()
});

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  
  // Authentication validators
  authenticateUser: validateRequest(authenticateUserSchema),
  
  // Authorization validators
  authorizeRequest: validateRequest(authorizeRequestSchema),
  
  // Threat detection validators
  detectThreats: validateRequest(detectThreatsSchema),
  
  // Identity verification validators
  verifyIdentity: validateRequest(verifyIdentitySchema),
  
  // Security profile validators
  createSecurityProfile: validateRequest(createSecurityProfileSchema),
  updateSecurityProfile: validateRequest(updateSecurityProfileSchema),
  
  // Permission management validators
  grantPermission: validateRequest(grantPermissionSchema),
  revokePermission: validateRequest(revokePermissionSchema),
  
  // Security event validators
  getSecurityEvents: validateQuery(getSecurityEventsSchema),
  getSecurityEvent: validateParams(securityEventIdSchema),
  
  // User management validators
  createUser: validateRequest(createUserSchema),
  updateUser: validateRequest(updateUserSchema),
  getUser: validateParams(userIdSchema),
  deleteUser: validateParams(userIdSchema)
};