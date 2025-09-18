const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class PolicyEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.policies = new Map();
    this.rules = new Map();
    this.conditions = new Map();
    this.violations = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load policies
      await this.loadPolicies();
      
      // Load rules
      await this.loadRules();
      
      // Load conditions
      await this.loadConditions();
      
      this._initialized = true;
      logger.info('PolicyEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PolicyEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('PolicyEngine closed');
    } catch (error) {
      logger.error('Error closing PolicyEngine:', error);
    }
  }

  async loadPolicies() {
    try {
      const result = await pool.query(`
        SELECT * FROM security_policies
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const policy of result.rows) {
        this.policies.set(policy.id, {
          ...policy,
          rules: policy.rules ? JSON.parse(policy.rules) : [],
          conditions: policy.conditions ? JSON.parse(policy.conditions) : [],
          actions: policy.actions ? JSON.parse(policy.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} policies`);
    } catch (error) {
      logger.error('Error loading policies:', error);
      throw error;
    }
  }

  async loadRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM policy_rules
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const rule of result.rows) {
        this.rules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} rules`);
    } catch (error) {
      logger.error('Error loading rules:', error);
      throw error;
    }
  }

  async loadConditions() {
    try {
      const result = await pool.query(`
        SELECT * FROM policy_conditions
        WHERE is_active = true
        ORDER BY name
      `);
      
      for (const condition of result.rows) {
        this.conditions.set(condition.id, condition);
      }
      
      logger.info(`Loaded ${result.rows.length} conditions`);
    } catch (error) {
      logger.error('Error loading conditions:', error);
      throw error;
    }
  }

  async createPolicy(name, description, rules, conditions, createdBy) {
    try {
      const policyId = nanoid();
      const policy = {
        id: policyId,
        name,
        description,
        rules: rules || [],
        conditions: conditions || [],
        actions: [],
        priority: 0,
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO security_policies (id, name, description, rules, conditions, actions, priority, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        policyId, name, description, JSON.stringify(rules), JSON.stringify(conditions),
        JSON.stringify([]), 0, true, createdBy, policy.created_at, policy.updated_at
      ]);
      
      // Store in memory
      this.policies.set(policyId, policy);
      
      // Store in Redis
      await this.redis.setex(
        `policy:${policyId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(policy)
      );
      
      logger.info(`Policy created: ${policyId}`, { name, createdBy });
      
      // Emit event
      this.emit('policyCreated', policy);
      
      return policy;
    } catch (error) {
      logger.error('Error creating policy:', error);
      throw error;
    }
  }

  async updatePolicy(policyId, updates, updatedBy) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }
      
      // Update policy
      Object.assign(policy, updates, {
        updated_by: updatedBy,
        updated_at: new Date()
      });
      
      // Update database
      await pool.query(`
        UPDATE security_policies
        SET name = $1, description = $2, rules = $3, conditions = $4, actions = $5, 
            priority = $6, is_active = $7, updated_by = $8, updated_at = $9
        WHERE id = $10
      `, [
        policy.name, policy.description, JSON.stringify(policy.rules),
        JSON.stringify(policy.conditions), JSON.stringify(policy.actions),
        policy.priority, policy.is_active, updatedBy, policy.updated_at, policyId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `policy:${policyId}`,
        24 * 60 * 60,
        JSON.stringify(policy)
      );
      
      logger.info(`Policy updated: ${policyId}`, { updatedBy });
      
      // Emit event
      this.emit('policyUpdated', policy);
      
      return policy;
    } catch (error) {
      logger.error('Error updating policy:', error);
      throw error;
    }
  }

  async deletePolicy(policyId, deletedBy) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }
      
      // Soft delete
      policy.is_active = false;
      policy.deleted_by = deletedBy;
      policy.deleted_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE security_policies
        SET is_active = false, deleted_by = $1, deleted_at = $2, updated_at = $3
        WHERE id = $4
      `, [deletedBy, policy.deleted_at, new Date(), policyId]);
      
      // Remove from memory
      this.policies.delete(policyId);
      
      // Remove from Redis
      await this.redis.del(`policy:${policyId}`);
      
      logger.info(`Policy deleted: ${policyId}`, { deletedBy });
      
      // Emit event
      this.emit('policyDeleted', policy);
      
      return true;
    } catch (error) {
      logger.error('Error deleting policy:', error);
      throw error;
    }
  }

  async getPolicy(policyId, userId) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        return null;
      }
      
      // Check if user has access to this policy
      if (policy.created_by !== userId && !await this.hasPolicyAccess(userId, policyId)) {
        throw new Error('Access denied');
      }
      
      return policy;
    } catch (error) {
      logger.error('Error getting policy:', error);
      throw error;
    }
  }

  async getPolicies(userId, filters = {}) {
    try {
      let policies = Array.from(this.policies.values());
      
      // Filter by user access
      policies = policies.filter(policy => 
        policy.created_by === userId || this.hasPolicyAccess(userId, policy.id)
      );
      
      // Apply filters
      if (filters.is_active !== undefined) {
        policies = policies.filter(policy => policy.is_active === filters.is_active);
      }
      
      if (filters.priority !== undefined) {
        policies = policies.filter(policy => policy.priority === filters.priority);
      }
      
      if (filters.name) {
        policies = policies.filter(policy => 
          policy.name.toLowerCase().includes(filters.name.toLowerCase())
        );
      }
      
      // Sort by priority and creation date
      policies.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return policies;
    } catch (error) {
      logger.error('Error getting policies:', error);
      throw error;
    }
  }

  async enforcePolicies(userId, resource, action, context = {}) {
    try {
      const applicablePolicies = this.getApplicablePolicies(userId, resource, action, context);
      const violations = [];
      
      for (const policy of applicablePolicies) {
        const violation = await this.evaluatePolicy(policy, userId, resource, action, context);
        if (violation) {
          violations.push(violation);
          
          // Execute policy actions
          await this.executePolicyActions(policy, violation);
        }
      }
      
      return {
        enforced: applicablePolicies.length,
        violations: violations.length,
        details: violations
      };
    } catch (error) {
      logger.error('Error enforcing policies:', error);
      throw error;
    }
  }

  async enforceAllPolicies() {
    try {
      const activePolicies = Array.from(this.policies.values()).filter(p => p.is_active);
      let totalEnforced = 0;
      let totalViolations = 0;
      
      for (const policy of activePolicies) {
        try {
          const result = await this.enforcePolicy(policy);
          totalEnforced += result.enforced;
          totalViolations += result.violations;
        } catch (error) {
          logger.error(`Error enforcing policy ${policy.id}:`, error);
        }
      }
      
      logger.info('Policy enforcement completed', {
        totalPolicies: activePolicies.length,
        totalEnforced,
        totalViolations
      });
      
      return {
        totalPolicies: activePolicies.length,
        totalEnforced,
        totalViolations
      };
    } catch (error) {
      logger.error('Error enforcing all policies:', error);
      throw error;
    }
  }

  getApplicablePolicies(userId, resource, action, context) {
    try {
      return Array.from(this.policies.values()).filter(policy => 
        policy.is_active && this.isPolicyApplicable(policy, userId, resource, action, context)
      );
    } catch (error) {
      logger.error('Error getting applicable policies:', error);
      return [];
    }
  }

  isPolicyApplicable(policy, userId, resource, action, context) {
    try {
      const { target_users, target_resources, target_actions, conditions } = policy;
      
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
      
      // Check conditions
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          if (!this.evaluateCondition(condition, context)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking policy applicability:', error);
      return false;
    }
  }

  async evaluatePolicy(policy, userId, resource, action, context) {
    try {
      const { rules } = policy;
      
      if (!rules || rules.length === 0) {
        return null; // No rules to evaluate
      }
      
      for (const rule of rules) {
        const violation = await this.evaluateRule(rule, userId, resource, action, context);
        if (violation) {
          return {
            policyId: policy.id,
            policyName: policy.name,
            ruleId: rule.id,
            ruleName: rule.name,
            violation: violation,
            timestamp: new Date(),
            userId,
            resource,
            action,
            context
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating policy:', error);
      return null;
    }
  }

  async evaluateRule(rule, userId, resource, action, context) {
    try {
      const { type, conditions, threshold, timeWindow } = rule;
      
      switch (type) {
        case 'frequency':
          return await this.evaluateFrequencyRule(rule, userId, resource, action, context);
        case 'pattern':
          return await this.evaluatePatternRule(rule, userId, resource, action, context);
        case 'threshold':
          return await this.evaluateThresholdRule(rule, userId, resource, action, context);
        case 'time_based':
          return await this.evaluateTimeBasedRule(rule, userId, resource, action, context);
        case 'location_based':
          return await this.evaluateLocationBasedRule(rule, userId, resource, action, context);
        case 'device_based':
          return await this.evaluateDeviceBasedRule(rule, userId, resource, action, context);
        case 'behavioral':
          return await this.evaluateBehavioralRule(rule, userId, resource, action, context);
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error evaluating rule:', error);
      return null;
    }
  }

  async evaluateFrequencyRule(rule, userId, resource, action, context) {
    try {
      const { threshold, timeWindow } = rule;
      const timeCondition = this.getTimeCondition(timeWindow);
      
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM access_logs
        WHERE user_id = $1 AND resource = $2 AND action = $3 AND timestamp >= $4
      `, [userId, resource, action, timeCondition]);
      
      const count = parseInt(result.rows[0].count);
      
      if (count >= threshold) {
        return {
          type: 'frequency',
          message: `Frequency threshold exceeded: ${count} attempts in ${timeWindow}`,
          count,
          threshold,
          timeWindow
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating frequency rule:', error);
      return null;
    }
  }

  async evaluatePatternRule(rule, userId, resource, action, context) {
    try {
      const { patterns } = rule;
      
      for (const pattern of patterns) {
        if (this.matchesPattern(context, pattern)) {
          return {
            type: 'pattern',
            message: `Pattern matched: ${pattern.name}`,
            pattern: pattern.name,
            matchedFields: this.getMatchedFields(context, pattern)
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating pattern rule:', error);
      return null;
    }
  }

  async evaluateThresholdRule(rule, userId, resource, action, context) {
    try {
      const { field, operator, threshold } = rule;
      const value = this.getFieldValue(context, field);
      
      if (value === null || value === undefined) {
        return null;
      }
      
      let violated = false;
      switch (operator) {
        case 'gt':
          violated = value > threshold;
          break;
        case 'gte':
          violated = value >= threshold;
          break;
        case 'lt':
          violated = value < threshold;
          break;
        case 'lte':
          violated = value <= threshold;
          break;
        case 'eq':
          violated = value === threshold;
          break;
        case 'ne':
          violated = value !== threshold;
          break;
        default:
          return null;
      }
      
      if (violated) {
        return {
          type: 'threshold',
          message: `Threshold violated: ${field} ${operator} ${threshold}`,
          field,
          operator,
          threshold,
          actualValue: value
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating threshold rule:', error);
      return null;
    }
  }

  async evaluateTimeBasedRule(rule, userId, resource, action, context) {
    try {
      const { allowedHours, allowedDays, timezone } = rule;
      const now = new Date();
      
      // Check day of week
      if (allowedDays && allowedDays.length > 0) {
        const currentDay = now.getDay();
        if (!allowedDays.includes(currentDay)) {
          return {
            type: 'time_based',
            message: `Access not allowed on day ${currentDay}`,
            allowedDays,
            currentDay
          };
        }
      }
      
      // Check hour of day
      if (allowedHours && allowedHours.length > 0) {
        const currentHour = now.getHours();
        if (!allowedHours.includes(currentHour)) {
          return {
            type: 'time_based',
            message: `Access not allowed at hour ${currentHour}`,
            allowedHours,
            currentHour
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating time-based rule:', error);
      return null;
    }
  }

  async evaluateLocationBasedRule(rule, userId, resource, action, context) {
    try {
      const { allowedLocations, blockedLocations } = rule;
      const userLocation = context.location || context.ipAddress;
      
      if (!userLocation) {
        return null;
      }
      
      // Check blocked locations
      if (blockedLocations && blockedLocations.includes(userLocation)) {
        return {
          type: 'location_based',
          message: `Access blocked from location: ${userLocation}`,
          blockedLocations,
          userLocation
        };
      }
      
      // Check allowed locations
      if (allowedLocations && !allowedLocations.includes(userLocation)) {
        return {
          type: 'location_based',
          message: `Access not allowed from location: ${userLocation}`,
          allowedLocations,
          userLocation
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating location-based rule:', error);
      return null;
    }
  }

  async evaluateDeviceBasedRule(rule, userId, resource, action, context) {
    try {
      const { allowedDevices, blockedDevices, allowedDeviceTypes, blockedDeviceTypes } = rule;
      const deviceInfo = context.deviceInfo || {};
      const deviceId = deviceInfo.id;
      const deviceType = deviceInfo.type;
      
      // Check blocked devices
      if (blockedDevices && deviceId && blockedDevices.includes(deviceId)) {
        return {
          type: 'device_based',
          message: `Access blocked from device: ${deviceId}`,
          blockedDevices,
          deviceId
        };
      }
      
      // Check blocked device types
      if (blockedDeviceTypes && deviceType && blockedDeviceTypes.includes(deviceType)) {
        return {
          type: 'device_based',
          message: `Access blocked from device type: ${deviceType}`,
          blockedDeviceTypes,
          deviceType
        };
      }
      
      // Check allowed devices
      if (allowedDevices && deviceId && !allowedDevices.includes(deviceId)) {
        return {
          type: 'device_based',
          message: `Access not allowed from device: ${deviceId}`,
          allowedDevices,
          deviceId
        };
      }
      
      // Check allowed device types
      if (allowedDeviceTypes && deviceType && !allowedDeviceTypes.includes(deviceType)) {
        return {
          type: 'device_based',
          message: `Access not allowed from device type: ${deviceType}`,
          allowedDeviceTypes,
          deviceType
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating device-based rule:', error);
      return null;
    }
  }

  async evaluateBehavioralRule(rule, userId, resource, action, context) {
    try {
      const { behaviorPatterns, timeWindow } = rule;
      const timeCondition = this.getTimeCondition(timeWindow);
      
      // Get user's recent behavior
      const result = await pool.query(`
        SELECT * FROM access_logs
        WHERE user_id = $1 AND timestamp >= $2
        ORDER BY timestamp DESC
        LIMIT 100
      `, [userId, timeCondition]);
      
      const recentBehavior = result.rows;
      
      // Analyze behavior patterns
      for (const pattern of behaviorPatterns) {
        if (this.matchesBehaviorPattern(recentBehavior, pattern)) {
          return {
            type: 'behavioral',
            message: `Behavioral pattern detected: ${pattern.name}`,
            pattern: pattern.name,
            timeWindow
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error evaluating behavioral rule:', error);
      return null;
    }
  }

  evaluateCondition(condition, context) {
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

  async executePolicyActions(policy, violation) {
    try {
      const { actions } = policy;
      
      if (!actions || actions.length === 0) {
        return;
      }
      
      for (const action of actions) {
        await this.executeAction(action, violation);
      }
    } catch (error) {
      logger.error('Error executing policy actions:', error);
    }
  }

  async executeAction(action, violation) {
    try {
      const { type, parameters } = action;
      
      switch (type) {
        case 'log':
          await this.logViolation(violation);
          break;
        case 'alert':
          await this.sendAlert(violation, parameters);
          break;
        case 'block':
          await this.blockUser(violation.userId, parameters);
          break;
        case 'suspend':
          await this.suspendUser(violation.userId, parameters);
          break;
        case 'notify':
          await this.notifyUser(violation.userId, violation, parameters);
          break;
        case 'escalate':
          await this.escalateViolation(violation, parameters);
          break;
        default:
          logger.warn(`Unknown action type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
    }
  }

  async logViolation(violation) {
    try {
      const violationId = nanoid();
      
      // Store in database
      await pool.query(`
        INSERT INTO policy_violations (id, policy_id, rule_id, user_id, resource, action, violation_data, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        violationId, violation.policyId, violation.ruleId, violation.userId,
        violation.resource, violation.action, JSON.stringify(violation), violation.timestamp
      ]);
      
      // Store in memory
      this.violations.set(violationId, violation);
      
      // Store in Redis
      await this.redis.setex(
        `violation:${violationId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(violation)
      );
      
      logger.info(`Policy violation logged: ${violationId}`, {
        policyId: violation.policyId,
        userId: violation.userId,
        resource: violation.resource
      });
    } catch (error) {
      logger.error('Error logging violation:', error);
    }
  }

  async sendAlert(violation, parameters) {
    try {
      // Implementation for sending alerts
      logger.info('Policy violation alert sent', {
        violationId: violation.id,
        userId: violation.userId,
        parameters
      });
    } catch (error) {
      logger.error('Error sending alert:', error);
    }
  }

  async blockUser(userId, parameters) {
    try {
      // Implementation for blocking user
      logger.info('User blocked due to policy violation', {
        userId,
        parameters
      });
    } catch (error) {
      logger.error('Error blocking user:', error);
    }
  }

  async suspendUser(userId, parameters) {
    try {
      // Implementation for suspending user
      logger.info('User suspended due to policy violation', {
        userId,
        parameters
      });
    } catch (error) {
      logger.error('Error suspending user:', error);
    }
  }

  async notifyUser(userId, violation, parameters) {
    try {
      // Implementation for notifying user
      logger.info('User notified of policy violation', {
        userId,
        violationId: violation.id,
        parameters
      });
    } catch (error) {
      logger.error('Error notifying user:', error);
    }
  }

  async escalateViolation(violation, parameters) {
    try {
      // Implementation for escalating violation
      logger.info('Policy violation escalated', {
        violationId: violation.id,
        userId: violation.userId,
        parameters
      });
    } catch (error) {
      logger.error('Error escalating violation:', error);
    }
  }

  matchesPattern(context, pattern) {
    try {
      const { field, operator, value } = pattern;
      const contextValue = this.getFieldValue(context, field);
      
      if (contextValue === null || contextValue === undefined) {
        return false;
      }
      
      switch (operator) {
        case 'equals':
          return contextValue === value;
        case 'contains':
          return contextValue.includes(value);
        case 'regex':
          return new RegExp(value).test(contextValue);
        case 'starts_with':
          return contextValue.startsWith(value);
        case 'ends_with':
          return contextValue.endsWith(value);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error matching pattern:', error);
      return false;
    }
  }

  getMatchedFields(context, pattern) {
    try {
      const matchedFields = [];
      const { field } = pattern;
      
      if (this.matchesPattern(context, pattern)) {
        matchedFields.push(field);
      }
      
      return matchedFields;
    } catch (error) {
      logger.error('Error getting matched fields:', error);
      return [];
    }
  }

  getFieldValue(context, field) {
    try {
      const fields = field.split('.');
      let value = context;
      
      for (const f of fields) {
        if (value && typeof value === 'object' && f in value) {
          value = value[f];
        } else {
          return null;
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Error getting field value:', error);
      return null;
    }
  }

  matchesBehaviorPattern(behavior, pattern) {
    try {
      const { type, threshold, timeWindow } = pattern;
      
      switch (type) {
        case 'rapid_succession':
          return this.checkRapidSuccession(behavior, threshold, timeWindow);
        case 'unusual_hours':
          return this.checkUnusualHours(behavior, threshold);
        case 'multiple_locations':
          return this.checkMultipleLocations(behavior, threshold, timeWindow);
        case 'unusual_patterns':
          return this.checkUnusualPatterns(behavior, threshold);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error matching behavior pattern:', error);
      return false;
    }
  }

  checkRapidSuccession(behavior, threshold, timeWindow) {
    try {
      if (behavior.length < threshold) {
        return false;
      }
      
      const timeWindowMs = this.getTimeWindowMs(timeWindow);
      const now = new Date();
      
      for (let i = 0; i < behavior.length - threshold + 1; i++) {
        const startTime = new Date(behavior[i].timestamp);
        const endTime = new Date(behavior[i + threshold - 1].timestamp);
        
        if (endTime.getTime() - startTime.getTime() <= timeWindowMs) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking rapid succession:', error);
      return false;
    }
  }

  checkUnusualHours(behavior, threshold) {
    try {
      const unusualHours = [0, 1, 2, 3, 4, 5, 22, 23]; // 10 PM to 6 AM
      let count = 0;
      
      for (const entry of behavior) {
        const hour = new Date(entry.timestamp).getHours();
        if (unusualHours.includes(hour)) {
          count++;
        }
      }
      
      return count >= threshold;
    } catch (error) {
      logger.error('Error checking unusual hours:', error);
      return false;
    }
  }

  checkMultipleLocations(behavior, threshold, timeWindow) {
    try {
      const locations = new Set();
      const timeWindowMs = this.getTimeWindowMs(timeWindow);
      const now = new Date();
      
      for (const entry of behavior) {
        const entryTime = new Date(entry.timestamp);
        if (now.getTime() - entryTime.getTime() <= timeWindowMs) {
          if (entry.ip_address) {
            locations.add(entry.ip_address);
          }
        }
      }
      
      return locations.size >= threshold;
    } catch (error) {
      logger.error('Error checking multiple locations:', error);
      return false;
    }
  }

  checkUnusualPatterns(behavior, threshold) {
    try {
      // Simple implementation - can be enhanced with ML
      const patterns = {
        sameResource: 0,
        sameAction: 0,
        sameIP: 0
      };
      
      for (let i = 1; i < behavior.length; i++) {
        const current = behavior[i];
        const previous = behavior[i - 1];
        
        if (current.resource === previous.resource) {
          patterns.sameResource++;
        }
        if (current.action === previous.action) {
          patterns.sameAction++;
        }
        if (current.ip_address === previous.ip_address) {
          patterns.sameIP++;
        }
      }
      
      return Object.values(patterns).some(count => count >= threshold);
    } catch (error) {
      logger.error('Error checking unusual patterns:', error);
      return false;
    }
  }

  getTimeCondition(timeWindow) {
    const now = new Date();
    switch (timeWindow) {
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

  getTimeWindowMs(timeWindow) {
    switch (timeWindow) {
      case '1h':
        return 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  async hasPolicyAccess(userId, policyId) {
    try {
      // Check if user has access to policy
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM policy_access
        WHERE user_id = $1 AND policy_id = $2
      `, [userId, policyId]);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking policy access:', error);
      return false;
    }
  }

  async getViolations(userId, limit = 100, offset = 0) {
    try {
      const result = await pool.query(`
        SELECT * FROM policy_violations
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting violations:', error);
      throw error;
    }
  }

  async getPolicyStats() {
    try {
      const stats = {
        totalPolicies: this.policies.size,
        activePolicies: Array.from(this.policies.values()).filter(p => p.is_active).length,
        totalViolations: this.violations.size,
        violationsByPolicy: {},
        violationsByUser: {}
      };
      
      // Count violations by policy
      for (const [violationId, violation] of this.violations.entries()) {
        if (!stats.violationsByPolicy[violation.policyId]) {
          stats.violationsByPolicy[violation.policyId] = 0;
        }
        stats.violationsByPolicy[violation.policyId]++;
        
        if (!stats.violationsByUser[violation.userId]) {
          stats.violationsByUser[violation.userId] = 0;
        }
        stats.violationsByUser[violation.userId]++;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting policy stats:', error);
      throw error;
    }
  }
}

module.exports = PolicyEngine;
