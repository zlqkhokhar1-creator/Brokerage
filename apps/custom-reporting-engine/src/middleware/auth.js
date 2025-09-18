const jwt = require('jsonwebtoken');
const { logger } = require('../services/logger');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired'
      });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userRole = req.user.role;
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Resource ownership middleware
const requireOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userId = req.user.id;
      const resourceUserId = req.body[resourceField] || req.params[resourceField] || req.query[resourceField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: 'Resource user ID is required'
        });
      }
      
      if (userId !== resourceUserId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own resources'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Generate JWT token
const generateToken = (payload, expiresIn = '24h') => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  } catch (error) {
    logger.error('Token generation error:', error);
    throw error;
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Token verification error:', error);
    throw error;
  }
};

// Decode JWT token without verification
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token decode error:', error);
    throw error;
  }
};

// Get token from request
const getTokenFromRequest = (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  } catch (error) {
    logger.error('Get token error:', error);
    return null;
  }
};

// Check if user has permission
const hasPermission = (user, permission) => {
  try {
    if (!user || !user.permissions) {
      return false;
    }
    
    return user.permissions.includes(permission);
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
};

// Check if user has role
const hasRole = (user, role) => {
  try {
    if (!user || !user.role) {
      return false;
    }
    
    return user.role === role;
  } catch (error) {
    logger.error('Role check error:', error);
    return false;
  }
};

// Check if user has any of the specified roles
const hasAnyRole = (user, roles) => {
  try {
    if (!user || !user.role) {
      return false;
    }
    
    return roles.includes(user.role);
  } catch (error) {
    logger.error('Role check error:', error);
    return false;
  }
};

// Check if user has all of the specified permissions
const hasAllPermissions = (user, permissions) => {
  try {
    if (!user || !user.permissions) {
      return false;
    }
    
    return permissions.every(permission => user.permissions.includes(permission));
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
};

// Check if user has any of the specified permissions
const hasAnyPermission = (user, permissions) => {
  try {
    if (!user || !user.permissions) {
      return false;
    }
    
    return permissions.some(permission => user.permissions.includes(permission));
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requirePermission,
  requireOwnership,
  requireAdmin,
  generateToken,
  verifyToken,
  decodeToken,
  getTokenFromRequest,
  hasPermission,
  hasRole,
  hasAnyRole,
  hasAllPermissions,
  hasAnyPermission
};
