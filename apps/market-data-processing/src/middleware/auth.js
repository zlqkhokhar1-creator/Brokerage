const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    // Verify JWT token
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Authentication failed: Invalid token', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          error: err.message
        });
        
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
      
      // Add user info to request
      req.user = user;
      
      logger.debug('Authentication successful', {
        userId: user.id,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
        return next();
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Authorization failed: No user in request', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userRole = req.user.role || 'user';
      
      if (!roles.includes(userRole)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRoles: roles,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      logger.debug('Authorization successful', {
        userId: req.user.id,
        userRole,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Resource ownership middleware
const authorizeResource = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Resource authorization failed: No user in request', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userId = req.user.id;
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      // Admin users can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Check if user owns the resource
      if (resourceUserId && resourceUserId !== userId) {
        logger.warn('Resource authorization failed: User does not own resource', {
          userId,
          resourceUserId,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only access your own resources'
        });
      }
      
      logger.debug('Resource authorization successful', {
        userId,
        resourceUserId,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      logger.error('Resource authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
    
    if (!apiKey) {
      logger.warn('API key authentication failed: No API key provided', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }
    
    // In production, this would validate against a database
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!validApiKeys.includes(apiKey)) {
      logger.warn('API key authentication failed: Invalid API key', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    // Add API key info to request
    req.apiKey = apiKey;
    
    logger.debug('API key authentication successful', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    next();
  } catch (error) {
    logger.error('API key authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const key = req.ip || req.user?.id || 'anonymous';
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old requests
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter(time => time > windowStart);
        requests.set(key, userRequests);
      } else {
        requests.set(key, []);
      }
      
      const userRequests = requests.get(key);
      
      if (userRequests.length >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          requestCount: userRequests.length,
          maxRequests,
          windowMs,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Add current request
      userRequests.push(now);
      requests.set(key, userRequests);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - userRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      
      next();
    } catch (error) {
      logger.error('Rate limiting middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Generate JWT token
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw error;
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Error verifying JWT token:', error);
    throw error;
  }
};

// Decode JWT token without verification
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding JWT token:', error);
    throw error;
  }
};

// Get user from token
const getUserFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    logger.error('Error getting user from token:', error);
    return null;
  }
};

// Check if user has permission
const hasPermission = (user, permission) => {
  try {
    if (!user || !user.permissions) {
      return false;
    }
    
    return user.permissions.includes(permission) || user.permissions.includes('*');
  } catch (error) {
    logger.error('Error checking user permission:', error);
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
    logger.error('Error checking user role:', error);
    return false;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorize,
  authorizeResource,
  authenticateApiKey,
  rateLimit,
  generateToken,
  verifyToken,
  decodeToken,
  getUserFromToken,
  hasPermission,
  hasRole
};
