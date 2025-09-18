const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class AccessController extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.permissions = new Map();
    this.roles = new Map();
    this.resources = new Map();
    this.policies = new Map();
    this.accessLogs = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load permissions
      await this.loadPermissions();
      
      // Load roles
      await this.loadRoles();
      
      // Load resources
      await this.loadResources();
      
      // Load policies
      await this.loadPolicies();
      
      this._initialized = true;
      logger.info('AccessController initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AccessController:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('AccessController closed');
    } catch (error) {
      logger.error('Error closing AccessController:', error);
    }
  }

  async loadPermissions() {
    try {
      const result = await pool.query(`
        SELECT * FROM permissions
        WHERE is_active = true
        ORDER BY name
      `);
      
      for (const permission of result.rows) {
        this.permissions.set(permission.id, permission);
      }
      
      logger.info(`Loaded ${result.rows.length} permissions`);
    } catch (error) {
      logger.error('Error loading permissions:', error);
      throw error;
    }
  }

  async loadRoles() {
    try {
      const result = await pool.query(`
        SELECT r.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', p.id,
                     'name', p.name,
                     'description', p.description
                   )
                 ) FILTER (WHERE p.id IS NOT NULL),
                 '[]'::json
               ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.is_active = true
        GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
        ORDER BY r.name
      `);
      
      for (const role of result.rows) {
        this.roles.set(role.id, {
          ...role,
          permissions: role.permissions || []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} roles`);
    } catch (error) {
      logger.error('Error loading roles:', error);
      throw error;
    }
  }

  async loadResources() {
    try {
      const result = await pool.query(`
        SELECT * FROM resources
        WHERE is_active = true
        ORDER BY name
      `);
      
      for (const resource of result.rows) {
        this.resources.set(resource.id, resource);
      }
      
      logger.info(`Loaded ${result.rows.length} resources`);
    } catch (error) {
      logger.error('Error loading resources:', error);
      throw error;
    }
  }

  async loadPolicies() {
    try {
      const result = await pool.query(`
        SELECT * FROM access_policies
        WHERE is_active = true
        ORDER BY name
      `);
      
      for (const policy of result.rows) {
        this.policies.set(policy.id, {
          ...policy,
          rules: policy.rules ? JSON.parse(policy.rules) : [],
          conditions: policy.conditions ? JSON.parse(policy.conditions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} policies`);
    } catch (error) {
      logger.error('Error loading policies:', error);
      throw error;
    }
  }

  async authorize(userId, resource, action, context = {}) {
    try {
      const startTime = Date.now();
      
      // Get user info
      const user = await this.getUserInfo(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user is active
      if (!user.is_active) {
        throw new Error('User account is inactive');
      }
      
      // Check if user is locked
      if (user.is_locked) {
        throw new Error('User account is locked');
      }
      
      // Check if user is suspended
      if (user.is_suspended) {
        throw new Error('User account is suspended');
      }
      
      // Get user permissions
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check resource access
      const resourceAccess = await this.checkResourceAccess(userId, resource, action, context);
      
      // Check policy compliance
      const policyCompliance = await this.checkPolicyCompliance(userId, resource, action, context);
      
      // Check time-based access
      const timeAccess = await this.checkTimeBasedAccess(userId, resource, action, context);
      
      // Check location-based access
      const locationAccess = await this.checkLocationBasedAccess(userId, resource, action, context);
      
      // Check device-based access
      const deviceAccess = await this.checkDeviceBasedAccess(userId, resource, action, context);
      
      // Check IP-based access
      const ipAccess = await this.checkIPBasedAccess(userId, resource, action, context);
      
      // Determine final authorization
      const isAuthorized = resourceAccess && policyCompliance && timeAccess && 
                          locationAccess && deviceAccess && ipAccess;
      
      // Log access attempt
      await this.logAccessAttempt(userId, resource, action, context, isAuthorized);
      
      const duration = Date.now() - startTime;
      
      // Emit event
      this.emit('accessAttempt', {
        userId,
        resource,
        action,
        context,
        authorized: isAuthorized,
        duration
      });
      
      return {
        authorized: isAuthorized,
        reason: isAuthorized ? 'Access granted' : 'Access denied',
        permissions: userPermissions,
        resourceAccess,
        policyCompliance,
        timeAccess,
        locationAccess,
        deviceAccess,
        ipAccess,
        duration
      };
    } catch (error) {
      logger.error('Authorization error:', error);
      throw error;
    }
  }

  async getUserInfo(userId) {
    try {
      // Check Redis cache first
      const cached = await this.redis.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
      
      // Cache for 5 minutes
      await this.redis.setex(`user:${userId}`, 300, JSON.stringify(user));
      
      return user;
    } catch (error) {
      logger.error('Error getting user info:', error);
      return null;
    }
  }

  async getUserPermissions(userId) {
    try {
      // Check Redis cache first
      const cached = await this.redis.get(`user_permissions:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const result = await pool.query(`
        SELECT DISTINCT p.*
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.is_active = true
        UNION
        SELECT DISTINCT p.*
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = $1 AND p.is_active = true
        ORDER BY name
      `, [userId]);
      
      const permissions = result.rows;
      
      // Cache for 5 minutes
      await this.redis.setex(`user_permissions:${userId}`, 300, JSON.stringify(permissions));
      
      return permissions;
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  async checkResourceAccess(userId, resource, action, context) {
    try {
      // Get resource definition
      const resourceDef = Array.from(this.resources.values()).find(r => 
        r.name === resource || r.path === resource
      );
      
      if (!resourceDef) {
        return false;
      }
      
      // Check if resource is active
      if (!resourceDef.is_active) {
        return false;
      }
      
      // Check user permissions for this resource
      const userPermissions = await this.getUserPermissions(userId);
      const hasPermission = userPermissions.some(p => 
        p.resource === resource && p.action === action
      );
      
      if (!hasPermission) {
        return false;
      }
      
      // Check resource-specific conditions
      if (resourceDef.conditions) {
        const conditions = JSON.parse(resourceDef.conditions);
        for (const condition of conditions) {
          if (!await this.evaluateCondition(condition, context)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking resource access:', error);
      return false;
    }
  }

  async checkPolicyCompliance(userId, resource, action, context) {
    try {
      // Get applicable policies
      const applicablePolicies = Array.from(this.policies.values()).filter(policy => 
        policy.is_active && this.isPolicyApplicable(policy, userId, resource, action, context)
      );
      
      // Check each policy
      for (const policy of applicablePolicies) {
        if (!await this.evaluatePolicy(policy, userId, resource, action, context)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking policy compliance:', error);
      return false;
    }
  }

  async checkTimeBasedAccess(userId, resource, action, context) {
    try {
      // Get user's time-based access rules
      const result = await pool.query(`
        SELECT * FROM time_access_rules
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `, [userId, resource]);
      
      if (result.rows.length === 0) {
        return true; // No time restrictions
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = now.getDay();
      
      for (const rule of result.rows) {
        const { start_time, end_time, days_of_week } = rule;
        
        // Check day of week
        if (days_of_week && !days_of_week.includes(currentDay)) {
          continue;
        }
        
        // Check time range
        const startMinutes = this.timeToMinutes(start_time);
        const endMinutes = this.timeToMinutes(end_time);
        
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking time-based access:', error);
      return false;
    }
  }

  async checkLocationBasedAccess(userId, resource, action, context) {
    try {
      // Get user's location-based access rules
      const result = await pool.query(`
        SELECT * FROM location_access_rules
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `, [userId, resource]);
      
      if (result.rows.length === 0) {
        return true; // No location restrictions
      }
      
      const userLocation = context.location || context.ipAddress;
      if (!userLocation) {
        return false; // No location info provided
      }
      
      for (const rule of result.rows) {
        const { allowed_locations, blocked_locations } = rule;
        
        // Check blocked locations first
        if (blocked_locations && blocked_locations.includes(userLocation)) {
          return false;
        }
        
        // Check allowed locations
        if (allowed_locations && allowed_locations.includes(userLocation)) {
          return true;
        }
      }
      
      return true; // No specific restrictions
    } catch (error) {
      logger.error('Error checking location-based access:', error);
      return false;
    }
  }

  async checkDeviceBasedAccess(userId, resource, action, context) {
    try {
      // Get user's device-based access rules
      const result = await pool.query(`
        SELECT * FROM device_access_rules
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `, [userId, resource]);
      
      if (result.rows.length === 0) {
        return true; // No device restrictions
      }
      
      const deviceInfo = context.deviceInfo || {};
      const deviceType = deviceInfo.type || 'unknown';
      const deviceId = deviceInfo.id || 'unknown';
      
      for (const rule of result.rows) {
        const { allowed_device_types, blocked_device_types, allowed_devices, blocked_devices } = rule;
        
        // Check blocked device types
        if (blocked_device_types && blocked_device_types.includes(deviceType)) {
          return false;
        }
        
        // Check blocked devices
        if (blocked_devices && blocked_devices.includes(deviceId)) {
          return false;
        }
        
        // Check allowed device types
        if (allowed_device_types && allowed_device_types.includes(deviceType)) {
          return true;
        }
        
        // Check allowed devices
        if (allowed_devices && allowed_devices.includes(deviceId)) {
          return true;
        }
      }
      
      return true; // No specific restrictions
    } catch (error) {
      logger.error('Error checking device-based access:', error);
      return false;
    }
  }

  async checkIPBasedAccess(userId, resource, action, context) {
    try {
      // Get user's IP-based access rules
      const result = await pool.query(`
        SELECT * FROM ip_access_rules
        WHERE user_id = $1 AND resource = $2 AND is_active = true
      `, [userId, resource]);
      
      if (result.rows.length === 0) {
        return true; // No IP restrictions
      }
      
      const userIP = context.ipAddress;
      if (!userIP) {
        return false; // No IP info provided
      }
      
      for (const rule of result.rows) {
        const { allowed_ips, blocked_ips } = rule;
        
        // Check blocked IPs
        if (blocked_ips && this.isIPInRange(userIP, blocked_ips)) {
          return false;
        }
        
        // Check allowed IPs
        if (allowed_ips && this.isIPInRange(userIP, allowed_ips)) {
          return true;
        }
      }
      
      return true; // No specific restrictions
    } catch (error) {
      logger.error('Error checking IP-based access:', error);
      return false;
    }
  }

  async evaluateCondition(condition, context) {
    try {
      const { type, field, operator, value } = condition;
      
      switch (type) {
        case 'equals':
          return context[field] === value;
        case 'not_equals':
          return context[field] !== value;
        case 'greater_than':
          return context[field] > value;
        case 'less_than':
          return context[field] < value;
        case 'contains':
          return context[field] && context[field].includes(value);
        case 'not_contains':
          return !context[field] || !context[field].includes(value);
        case 'in':
          return value.includes(context[field]);
        case 'not_in':
          return !value.includes(context[field]);
        case 'exists':
          return context[field] !== undefined && context[field] !== null;
        case 'not_exists':
          return context[field] === undefined || context[field] === null;
        default:
          return true;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async evaluatePolicy(policy, userId, resource, action, context) {
    try {
      const { rules, conditions } = policy;
      
      // Check conditions first
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          if (!await this.evaluateCondition(condition, context)) {
            return true; // Condition not met, policy doesn't apply
          }
        }
      }
      
      // Check rules
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (!await this.evaluateRule(rule, userId, resource, action, context)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error evaluating policy:', error);
      return false;
    }
  }

  async evaluateRule(rule, userId, resource, action, context) {
    try {
      const { type, conditions } = rule;
      
      switch (type) {
        case 'allow':
          return true;
        case 'deny':
          return false;
        case 'conditional':
          if (conditions && conditions.length > 0) {
            for (const condition of conditions) {
              if (!await this.evaluateCondition(condition, context)) {
                return false;
              }
            }
          }
          return true;
        default:
          return true;
      }
    } catch (error) {
      logger.error('Error evaluating rule:', error);
      return false;
    }
  }

  isPolicyApplicable(policy, userId, resource, action, context) {
    try {
      const { target_users, target_resources, target_actions } = policy;
      
      // Check target users
      if (target_users && target_users.length > 0 && !target_users.includes(userId)) {
        return false;
      }
      
      // Check target resources
      if (target_resources && target_resources.length > 0 && !target_resources.includes(resource)) {
        return false;
      }
      
      // Check target actions
      if (target_actions && target_actions.length > 0 && !target_actions.includes(action)) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking policy applicability:', error);
      return false;
    }
  }

  async logAccessAttempt(userId, resource, action, context, authorized) {
    try {
      const logEntry = {
        id: nanoid(),
        user_id: userId,
        resource: resource,
        action: action,
        context: context,
        authorized: authorized,
        timestamp: new Date(),
        ip_address: context.ipAddress,
        user_agent: context.userAgent
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO access_logs (id, user_id, resource, action, context, authorized, timestamp, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        logEntry.id, logEntry.user_id, logEntry.resource, logEntry.action,
        JSON.stringify(logEntry.context), logEntry.authorized, logEntry.timestamp,
        logEntry.ip_address, logEntry.user_agent
      ]);
      
      // Store in memory
      this.accessLogs.set(logEntry.id, logEntry);
      
      // Store in Redis
      await this.redis.setex(
        `access_log:${logEntry.id}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(logEntry)
      );
      
    } catch (error) {
      logger.error('Error logging access attempt:', error);
    }
  }

  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  isIPInRange(ip, ranges) {
    try {
      for (const range of ranges) {
        if (this.isIPInCIDR(ip, range)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error checking IP range:', error);
      return false;
    }
  }

  isIPInCIDR(ip, cidr) {
    try {
      const [network, prefixLength] = cidr.split('/');
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      logger.error('Error checking IP CIDR:', error);
      return false;
    }
  }

  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  async getAccessLogs(userId, limit = 100, offset = 0) {
    try {
      const result = await pool.query(`
        SELECT * FROM access_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting access logs:', error);
      throw error;
    }
  }

  async getAccessStats(userId, timeRange = '24h') {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN authorized = true THEN 1 END) as successful_attempts,
          COUNT(CASE WHEN authorized = false THEN 1 END) as failed_attempts,
          resource,
          action
        FROM access_logs
        WHERE user_id = $1 AND timestamp >= $2
        GROUP BY resource, action
        ORDER BY total_attempts DESC
      `, [userId, timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting access stats:', error);
      throw error;
    }
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = AccessController;
