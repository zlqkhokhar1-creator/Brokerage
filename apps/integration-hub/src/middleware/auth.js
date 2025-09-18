const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        logger.warn('Invalid token', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

const authenticateOptional = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        req.user = null;
        return next();
      }

      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          userRoles,
          requiredRoles: roles,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const requirePermission = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      const hasRequiredPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermission) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions: permissions,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Permission authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const requireOwnership = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      if (resourceId !== userId) {
        logger.warn('Resource ownership violation', {
          userId,
          resourceId,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied - resource ownership required'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const requireApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      logger.warn('No API key provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Validate API key (this would typically check against a database)
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!validApiKeys.includes(apiKey)) {
      logger.warn('Invalid API key', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

const requireWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const secret = req.headers['x-webhook-secret'];

    if (!signature || !secret) {
      logger.warn('Missing webhook signature or secret', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Webhook signature and secret required'
      });
    }

    // Validate webhook signature (this would typically use HMAC)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    logger.error('Webhook signature validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook validation failed'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateOptional,
  requireRole,
  requirePermission,
  requireOwnership,
  requireApiKey,
  requireWebhookSignature
};
