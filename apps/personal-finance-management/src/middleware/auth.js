/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Invalid token format.',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Add user info to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user',
            permissions: decoded.permissions || []
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Access denied. Invalid token.',
                code: 'INVALID_TOKEN'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access denied. Token expired.',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            return res.status(500).json({
                error: 'Internal server error during authentication.',
                code: 'AUTH_ERROR'
            });
        }
    }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token is provided
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role || 'user',
                    permissions: decoded.permissions || []
                };
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

/**
 * Role-based access control middleware
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied. Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

/**
 * Permission-based access control middleware
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({
                error: 'Access denied. Required permission not found.',
                code: 'MISSING_PERMISSION'
            });
        }

        next();
    };
};

/**
 * Resource ownership middleware
 * Ensures user can only access their own resources
 */
const requireOwnership = (resourceUserIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const resourceUserId = req.params[resourceUserIdParam];
        
        if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied. You can only access your own resources.',
                code: 'RESOURCE_OWNERSHIP_REQUIRED'
            });
        }

        next();
    };
};

/**
 * API key authentication middleware
 * For service-to-service communication
 */
const apiKeyAuth = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({
                error: 'Access denied. API key required.',
                code: 'API_KEY_REQUIRED'
            });
        }

        // Verify API key (in production, check against database)
        const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
        
        if (!validApiKeys.includes(apiKey)) {
            return res.status(401).json({
                error: 'Access denied. Invalid API key.',
                code: 'INVALID_API_KEY'
            });
        }

        // Add service info to request
        req.service = {
            type: 'api_key',
            key: apiKey
        };

        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Internal server error during API key authentication.',
            code: 'API_KEY_AUTH_ERROR'
        });
    }
};

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per user
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        for (const [key, value] of requests.entries()) {
            if (value.timestamp < windowStart) {
                requests.delete(key);
            }
        }

        // Check current user's requests
        const userRequests = requests.get(userId) || { count: 0, timestamp: now };
        
        if (userRequests.timestamp < windowStart) {
            userRequests.count = 1;
            userRequests.timestamp = now;
        } else {
            userRequests.count++;
        }

        requests.set(userId, userRequests);

        if (userRequests.count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((userRequests.timestamp + windowMs - now) / 1000)
            });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    requirePermission,
    requireOwnership,
    apiKeyAuth,
    rateLimitByUser
};
