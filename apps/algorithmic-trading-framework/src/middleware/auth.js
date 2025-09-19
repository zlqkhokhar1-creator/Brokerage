const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        logger.warn('Invalid token provided', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
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
    res.status(500).json({
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

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
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

      const userRole = req.user.role || 'user';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          userRole: userRole,
          requiredRoles: allowedRoles,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission)) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          permission: permission,
          userPermissions: userPermissions,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Permission denied'
        });
      }

      next();
    } catch (error) {
      logger.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const validateOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: 'Resource user ID not provided'
        });
      }

      if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
        logger.warn('Resource ownership validation failed', {
          userId: req.user.id,
          resourceUserId: resourceUserId,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied - resource ownership required'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

const generateToken = (user) => {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      permissions: user.permissions || [],
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, secret, { expiresIn });
    
    logger.audit('Token generated', user.id, 'authentication', {
      userId: user.id,
      role: user.role
    });

    return token;
  } catch (error) {
    logger.error('Token generation error:', error);
    throw error;
  }
};

const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error('Token verification error:', error);
    throw error;
  }
};

const refreshToken = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Generate new token
    const newToken = generateToken(req.user);
    
    res.json({
      success: true,
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateOptional,
  requireRole,
  requirePermission,
  validateOwnership,
  generateToken,
  verifyToken,
  refreshToken
};

