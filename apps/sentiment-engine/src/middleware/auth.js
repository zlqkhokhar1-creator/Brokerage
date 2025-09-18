const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify JWT token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Authentication failed: Invalid token', {
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

      // Add user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      logger.debug('User authenticated successfully', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        path: req.path
      });

      next();
    });

  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        req.user = null;
        return next();
      }

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      next();
    });

  } catch (error) {
    logger.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Authorization failed: Insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(permission)) {
      logger.warn('Authorization failed: Missing permission', {
        userId: req.user.id,
        userPermissions,
        requiredPermission: permission,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      logger.warn('API key authentication failed: No API key provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // In a real implementation, you would validate the API key against a database
    // For now, we'll use a simple validation
    if (apiKey !== process.env.API_KEY) {
      logger.warn('API key authentication failed: Invalid API key', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Add API key info to request
    req.apiKey = apiKey;
    req.user = {
      id: 'api-user',
      type: 'api',
      permissions: ['read:sentiment', 'write:sentiment']
    };

    logger.debug('API key authentication successful', {
      apiKey: apiKey.substring(0, 8) + '...',
      path: req.path
    });

    next();

  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

// Rate limiting by user
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, data] of requests.entries()) {
      if (data.timestamp < windowStart) {
        requests.delete(key);
      }
    }

    // Check current user's requests
    const userRequests = requests.get(userId) || { count: 0, timestamp: now };
    
    if (userRequests.timestamp < windowStart) {
      userRequests.count = 0;
      userRequests.timestamp = now;
    }

    if (userRequests.count >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        userId,
        count: userRequests.count,
        maxRequests,
        windowMs,
        path: req.path
      });
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((userRequests.timestamp + windowMs - now) / 1000)
      });
    }

    userRequests.count++;
    requests.set(userId, userRequests);

    next();
  };
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  authenticateApiKey,
  rateLimitByUser,
  generateToken,
  verifyToken
};
