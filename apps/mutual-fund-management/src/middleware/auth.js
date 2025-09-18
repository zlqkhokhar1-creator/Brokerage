const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
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
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware
const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Check if user has required permissions
      if (requiredPermissions.length > 0) {
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };
};

// Role-based authorization middleware
const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Check if user has required role
      if (allowedRoles.length > 0) {
        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient role privileges'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role authorization failed'
      });
    }
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      // Token is invalid, but we don't fail the request
      req.user = null;
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

// User ID validation middleware
const validateUserId = (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.user_id || req.query.user_id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is trying to access their own data
    if (req.user && req.user.id !== userId) {
      // Check if user has admin role or permission to access other users' data
      const hasAdminRole = req.user.role === 'admin';
      const hasUserAccessPermission = req.user.permissions?.includes('access_other_users');
      
      if (!hasAdminRole && !hasUserAccessPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot access other users\' data'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('User ID validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'User ID validation failed'
    });
  }
};

// Resource ownership validation middleware
const validateResourceOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: `${resourceUserIdField} is required`
        });
      }

      // Check if user is trying to access their own resource
      if (req.user.id !== resourceUserId) {
        // Check if user has admin role or permission to access other users' resources
        const hasAdminRole = req.user.role === 'admin';
        const hasResourceAccessPermission = req.user.permissions?.includes('access_other_resources');
        
        if (!hasAdminRole && !hasResourceAccessPermission) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Cannot access other users\' resources'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Resource ownership validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Resource ownership validation failed'
      });
    }
  };
};

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const clientId = req.user?.id || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old requests
      if (requests.has(clientId)) {
        const clientRequests = requests.get(clientId);
        const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
        requests.set(clientId, validRequests);
      }
      
      // Check if client has exceeded rate limit
      const clientRequests = requests.get(clientId) || [];
      
      if (clientRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Add current request
      clientRequests.push(now);
      requests.set(clientId, clientRequests);
      
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // In a real implementation, you would validate the API key against a database
    // For now, we'll use a simple environment variable check
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Add API key info to request
    req.apiKey = {
      key: apiKey,
      type: 'api_key'
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'API key authentication failed'
    });
  }
};

// Generate JWT token
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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

module.exports = {
  authenticate,
  authorize,
  authorizeRole,
  optionalAuth,
  validateUserId,
  validateResourceOwnership,
  rateLimit,
  authenticateApiKey,
  generateToken,
  verifyToken,
  decodeToken
};
