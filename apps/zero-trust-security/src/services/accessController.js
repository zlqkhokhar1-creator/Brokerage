const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class AccessController {
  async checkAccess(userId, resource, action, context) {
    try {
      // Get user permissions
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check if user has permission for the resource and action
      const hasPermission = this.checkPermission(userPermissions, resource, action);
      
      if (!hasPermission) {
        return {
          allowed: false,
          reason: 'Insufficient permissions',
          permissions: userPermissions
        };
      }
      
      // Check resource-specific access rules
      const resourceAccess = await this.checkResourceAccess(userId, resource, action, context);
      
      if (!resourceAccess.allowed) {
        return {
          allowed: false,
          reason: resourceAccess.reason,
          permissions: userPermissions
        };
      }
      
      // Check time-based access restrictions
      const timeAccess = await this.checkTimeBasedAccess(userId, resource, context);
      
      if (!timeAccess.allowed) {
        return {
          allowed: false,
          reason: timeAccess.reason,
          permissions: userPermissions
        };
      }
      
      // Check location-based access restrictions
      const locationAccess = await this.checkLocationBasedAccess(userId, resource, context);
      
      if (!locationAccess.allowed) {
        return {
          allowed: false,
          reason: locationAccess.reason,
          permissions: userPermissions
        };
      }
      
      return {
        allowed: true,
        permissions: userPermissions,
        restrictions: {
          time: timeAccess.restrictions,
          location: locationAccess.restrictions
        }
      };
    } catch (error) {
      logger.error('Error checking access:', error);
      return {
        allowed: false,
        reason: 'Access check failed',
        permissions: []
      };
    }
  }

  async getUserPermissions(userId) {
    try {
      // Check cache first
      const cacheKey = `user_permissions:${userId}`;
      const cachedPermissions = await redis.get(cacheKey);
      
      if (cachedPermissions) {
        return cachedPermissions;
      }
      
      // Get from database
      const query = `
        SELECT p.permission_name, p.resource, p.action, p.conditions
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND up.is_active = true
      `;
      
      const result = await database.query(query, [userId]);
      const permissions = result.rows.map(row => ({
        name: row.permission_name,
        resource: row.resource,
        action: row.action,
        conditions: row.conditions
      }));
      
      // Cache permissions for 5 minutes
      await redis.set(cacheKey, permissions, 300);
      
      return permissions;
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  checkPermission(userPermissions, resource, action) {
    return userPermissions.some(permission => 
      permission.resource === resource && 
      permission.action === action
    );
  }

  async checkResourceAccess(userId, resource, action, context) {
    try {
      // Check resource-specific access rules
      const query = `
        SELECT * FROM resource_access_rules 
        WHERE resource = $1 AND action = $2 AND is_active = true
      `;
      
      const result = await database.query(query, [resource, action]);
      
      if (result.rows.length === 0) {
        return { allowed: true };
      }
      
      const rules = result.rows;
      
      for (const rule of rules) {
        const ruleResult = await this.evaluateAccessRule(rule, userId, context);
        
        if (!ruleResult.allowed) {
          return {
            allowed: false,
            reason: ruleResult.reason
          };
        }
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking resource access:', error);
      return { allowed: false, reason: 'Resource access check failed' };
    }
  }

  async evaluateAccessRule(rule, userId, context) {
    try {
      const conditions = rule.conditions || {};
      
      // Check user role condition
      if (conditions.userRoles) {
        const userRole = await this.getUserRole(userId);
        if (!conditions.userRoles.includes(userRole)) {
          return {
            allowed: false,
            reason: 'User role not authorized for this resource'
          };
        }
      }
      
      // Check time condition
      if (conditions.timeRestrictions) {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        
        if (conditions.timeRestrictions.allowedHours) {
          const allowedHours = conditions.timeRestrictions.allowedHours;
          if (!allowedHours.includes(currentHour)) {
            return {
              allowed: false,
              reason: 'Access not allowed at this time'
            };
        }
      }
      
      // Check location condition
      if (conditions.locationRestrictions && context.location) {
        const allowedLocations = conditions.locationRestrictions.allowedLocations;
        if (!allowedLocations.includes(context.location)) {
          return {
            allowed: false,
            reason: 'Access not allowed from this location'
          };
        }
      }
      
      // Check device condition
      if (conditions.deviceRestrictions && context.deviceId) {
        const allowedDevices = conditions.deviceRestrictions.allowedDevices;
        if (!allowedDevices.includes(context.deviceId)) {
          return {
            allowed: false,
            reason: 'Access not allowed from this device'
          };
        }
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error evaluating access rule:', error);
      return { allowed: false, reason: 'Access rule evaluation failed' };
    }
  }

  async checkTimeBasedAccess(userId, resource, context) {
    try {
      const query = `
        SELECT * FROM time_access_restrictions 
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `;
      
      const result = await database.query(query, [userId, resource]);
      
      if (result.rows.length === 0) {
        return { allowed: true };
      }
      
      const restrictions = result.rows[0];
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentDay = currentTime.getDay();
      
      // Check day restrictions
      if (restrictions.allowed_days && !restrictions.allowed_days.includes(currentDay)) {
        return {
          allowed: false,
          reason: 'Access not allowed on this day',
          restrictions: { allowedDays: restrictions.allowed_days }
        };
      }
      
      // Check hour restrictions
      if (restrictions.allowed_hours && !restrictions.allowed_hours.includes(currentHour)) {
        return {
          allowed: false,
          reason: 'Access not allowed at this hour',
          restrictions: { allowedHours: restrictions.allowed_hours }
        };
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking time-based access:', error);
      return { allowed: false, reason: 'Time-based access check failed' };
    }
  }

  async checkLocationBasedAccess(userId, resource, context) {
    try {
      if (!context.location) {
        return { allowed: true };
      }
      
      const query = `
        SELECT * FROM location_access_restrictions 
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `;
      
      const result = await database.query(query, [userId, resource]);
      
      if (result.rows.length === 0) {
        return { allowed: true };
      }
      
      const restrictions = result.rows[0];
      const allowedLocations = restrictions.allowed_locations || [];
      
      if (!allowedLocations.includes(context.location)) {
        return {
          allowed: false,
          reason: 'Access not allowed from this location',
          restrictions: { allowedLocations }
        };
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking location-based access:', error);
      return { allowed: false, reason: 'Location-based access check failed' };
    }
  }

  async getUserRole(userId) {
    try {
      const query = 'SELECT role FROM users WHERE id = $1';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].role;
    } catch (error) {
      logger.error('Error getting user role:', error);
      return null;
    }
  }

  async grantPermission(userId, resource, action, conditions = {}) {
    try {
      const query = `
        INSERT INTO user_permissions (user_id, permission_id, conditions, granted_by, granted_at)
        SELECT $1, p.id, $2, $3, NOW()
        FROM permissions p
        WHERE p.resource = $4 AND p.action = $5
        ON CONFLICT (user_id, permission_id) DO UPDATE SET
          is_active = true,
          conditions = $2,
          updated_at = NOW()
      `;
      
      await database.query(query, [userId, JSON.stringify(conditions), 'system', resource, action]);
      
      // Clear cache
      await redis.del(`user_permissions:${userId}`);
      
      return true;
    } catch (error) {
      logger.error('Error granting permission:', error);
      return false;
    }
  }

  async revokePermission(userId, resource, action) {
    try {
      const query = `
        UPDATE user_permissions 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND permission_id IN (
          SELECT id FROM permissions WHERE resource = $2 AND action = $3
        )
      `;
      
      await database.query(query, [userId, resource, action]);
      
      // Clear cache
      await redis.del(`user_permissions:${userId}`);
      
      return true;
    } catch (error) {
      logger.error('Error revoking permission:', error);
      return false;
    }
  }
}

module.exports = new AccessController();