const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { redis } = require('../config/redis');

/**
 * Feature Toggle Middleware
 * Checks if user has access to specific features based on their membership tier
 * and any user-specific overrides
 */

// Cache feature permissions for 5 minutes to reduce database queries
const CACHE_TTL = 300;
const CACHE_PREFIX = 'feature_perms:';

/**
 * Get user's feature permissions with caching
 */
async function getUserFeaturePermissions(userId) {
  const cacheKey = `${CACHE_PREFIX}${userId}`;
  
  try {
    // Try to get from cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Query database for user permissions
    const query = `
      SELECT 
        feature_name,
        has_access,
        limits,
        override_expires_at
      FROM user_permissions 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    // Transform to object for easier access
    const permissions = {};
    const limits = {};
    
    result.rows.forEach(row => {
      // Check if override has expired
      if (row.override_expires_at && new Date(row.override_expires_at) < new Date()) {
        // Override expired, use default tier permission
        permissions[row.feature_name] = row.has_access;
      } else {
        permissions[row.feature_name] = row.has_access;
      }
      
      if (row.limits) {
        Object.assign(limits, row.limits);
      }
    });

    const userPermissions = { permissions, limits };

    // Cache the result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userPermissions));
    }

    return userPermissions;
  } catch (error) {
    logger.error('Error fetching user feature permissions:', {
      userId,
      error: error.message,
      stack: error.stack
    });
    
    // Return basic permissions as fallback
    return {
      permissions: {
        auth: true,
        kyc: true,
        portfolio_basic: true,
        market_data_basic: true,
        trading_basic: true
      },
      limits: {
        portfolios: 1,
        trades_per_month: 10,
        watchlists: 1,
        api_calls_per_day: 100
      }
    };
  }
}

/**
 * Clear user's feature permissions cache
 */
async function clearUserFeatureCache(userId) {
  if (redis) {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    await redis.del(cacheKey);
  }
}

/**
 * Middleware to check if user has access to a specific feature
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { permissions } = await getUserFeaturePermissions(userId);
      
      if (!permissions[featureName]) {
        logger.warn('Feature access denied', {
          userId,
          feature: featureName,
          userAgent: req.get('user-agent'),
          ip: req.ip,
          requestId: req.id
        });

        return res.status(403).json({
          success: false,
          message: `Access denied. This feature requires a higher membership tier.`,
          code: 'FEATURE_ACCESS_DENIED',
          feature: featureName,
          upgrade_url: '/memberships/upgrade'
        });
      }

      // Add feature permissions to request for use in route handlers
      req.userFeatures = permissions;
      next();
    } catch (error) {
      logger.error('Feature toggle middleware error:', {
        userId: req.user?.id,
        feature: featureName,
        error: error.message,
        requestId: req.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to check usage limits for a feature
 */
function checkUsageLimit(feature, limitKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { limits } = await getUserFeaturePermissions(userId);
      const limit = limits[limitKey];
      
      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      // Check current usage
      const currentPeriodStart = new Date();
      currentPeriodStart.setDate(1); // Start of current month
      currentPeriodStart.setHours(0, 0, 0, 0);

      const usageQuery = `
        SELECT count 
        FROM usage_tracking 
        WHERE user_id = $1 AND feature = $2 AND period_start = $3
      `;
      
      const usageResult = await pool.query(usageQuery, [
        userId, 
        feature, 
        currentPeriodStart.toISOString().split('T')[0]
      ]);

      const currentUsage = usageResult.rows[0]?.count || 0;

      if (currentUsage >= limit) {
        return res.status(429).json({
          success: false,
          message: `Usage limit exceeded. You have reached your ${limitKey} limit of ${limit} for this month.`,
          code: 'USAGE_LIMIT_EXCEEDED',
          current_usage: currentUsage,
          limit: limit,
          upgrade_url: '/memberships/upgrade'
        });
      }

      // Increment usage counter
      const incrementQuery = `
        INSERT INTO usage_tracking (user_id, feature, count, period_start, period_end)
        VALUES ($1, $2, 1, $3, $4)
        ON CONFLICT (user_id, feature, period_start)
        DO UPDATE SET count = usage_tracking.count + 1, updated_at = CURRENT_TIMESTAMP
      `;

      const periodEnd = new Date(currentPeriodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Last day of current month

      await pool.query(incrementQuery, [
        userId,
        feature,
        currentPeriodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0]
      ]);

      req.usageInfo = {
        current: currentUsage + 1,
        limit: limit,
        remaining: limit - currentUsage - 1
      };

      next();
    } catch (error) {
      logger.error('Usage limit middleware error:', {
        userId: req.user?.id,
        feature,
        limitKey,
        error: error.message,
        requestId: req.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to add user's feature permissions to request
 */
async function addFeaturePermissions(req, res, next) {
  try {
    const userId = req.user?.id;
    
    if (userId) {
      const { permissions, limits } = await getUserFeaturePermissions(userId);
      req.userFeatures = permissions;
      req.userLimits = limits;
    }
    
    next();
  } catch (error) {
    logger.error('Add feature permissions middleware error:', {
      userId: req.user?.id,
      error: error.message,
      requestId: req.id
    });
    
    // Continue without permissions rather than failing the request
    next();
  }
}

/**
 * Helper function to check feature access in route handlers
 */
function hasFeature(req, featureName) {
  return req.userFeatures?.[featureName] === true;
}

/**
 * Helper function to get user's limit for a specific feature
 */
function getUserLimit(req, limitKey) {
  return req.userLimits?.[limitKey] || 0;
}

/**
 * Conditional middleware - only apply if feature is required
 */
function conditionalFeature(featureName, middleware) {
  return async (req, res, next) => {
    if (hasFeature(req, featureName)) {
      return middleware(req, res, next);
    }
    next();
  };
}

module.exports = {
  requireFeature,
  checkUsageLimit,
  addFeaturePermissions,
  getUserFeaturePermissions,
  clearUserFeatureCache,
  hasFeature,
  getUserLimit,
  conditionalFeature
};
