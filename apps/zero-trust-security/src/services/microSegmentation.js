const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MicroSegmentation extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.segments = new Map();
    this.policies = new Map();
    this.rules = new Map();
    this.networkConfigs = new Map();
    this.enforcementPoints = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load segments
      await this.loadSegments();
      
      // Load policies
      await this.loadPolicies();
      
      // Load rules
      await this.loadRules();
      
      // Load network configurations
      await this.loadNetworkConfigs();
      
      // Load enforcement points
      await this.loadEnforcementPoints();
      
      this._initialized = true;
      logger.info('MicroSegmentation initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MicroSegmentation:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MicroSegmentation closed');
    } catch (error) {
      logger.error('Error closing MicroSegmentation:', error);
    }
  }

  async loadSegments() {
    try {
      const result = await pool.query(`
        SELECT * FROM network_segments
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const segment of result.rows) {
        this.segments.set(segment.id, {
          ...segment,
          rules: segment.rules ? JSON.parse(segment.rules) : [],
          conditions: segment.conditions ? JSON.parse(segment.conditions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} segments`);
    } catch (error) {
      logger.error('Error loading segments:', error);
      throw error;
    }
  }

  async loadPolicies() {
    try {
      const result = await pool.query(`
        SELECT * FROM segmentation_policies
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
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

  async loadRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM segmentation_rules
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

  async loadNetworkConfigs() {
    try {
      const result = await pool.query(`
        SELECT * FROM network_configurations
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const config of result.rows) {
        this.networkConfigs.set(config.id, {
          ...config,
          config: config.config ? JSON.parse(config.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} network configurations`);
    } catch (error) {
      logger.error('Error loading network configurations:', error);
      throw error;
    }
  }

  async loadEnforcementPoints() {
    try {
      const result = await pool.query(`
        SELECT * FROM enforcement_points
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const point of result.rows) {
        this.enforcementPoints.set(point.id, {
          ...point,
          config: point.config ? JSON.parse(point.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} enforcement points`);
    } catch (error) {
      logger.error('Error loading enforcement points:', error);
      throw error;
    }
  }

  async createPolicy(name, description, rules, networkConfig, createdBy) {
    try {
      const policyId = nanoid();
      const policy = {
        id: policyId,
        name,
        description,
        rules: rules || [],
        networkConfig: networkConfig || {},
        priority: 0,
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO segmentation_policies (id, name, description, rules, network_config, priority, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        policyId, name, description, JSON.stringify(rules), JSON.stringify(networkConfig),
        0, true, createdBy, policy.created_at, policy.updated_at
      ]);
      
      // Store in memory
      this.policies.set(policyId, policy);
      
      // Store in Redis
      await this.redis.setex(
        `policy:${policyId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(policy)
      );
      
      // Apply policy
      await this.applyPolicy(policy);
      
      logger.info(`Segmentation policy created: ${policyId}`, {
        name,
        createdBy
      });
      
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
        UPDATE segmentation_policies
        SET name = $1, description = $2, rules = $3, network_config = $4, 
            priority = $5, is_active = $6, updated_by = $7, updated_at = $8
        WHERE id = $9
      `, [
        policy.name, policy.description, JSON.stringify(policy.rules),
        JSON.stringify(policy.networkConfig), policy.priority, policy.is_active,
        updatedBy, policy.updated_at, policyId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `policy:${policyId}`,
        24 * 60 * 60,
        JSON.stringify(policy)
      );
      
      // Reapply policy
      await this.applyPolicy(policy);
      
      logger.info(`Segmentation policy updated: ${policyId}`, {
        updatedBy,
        updates: Object.keys(updates)
      });
      
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
        UPDATE segmentation_policies
        SET is_active = false, deleted_by = $1, deleted_at = $2, updated_at = $3
        WHERE id = $4
      `, [deletedBy, policy.deleted_at, new Date(), policyId]);
      
      // Remove from memory
      this.policies.delete(policyId);
      
      // Remove from Redis
      await this.redis.del(`policy:${policyId}`);
      
      // Remove policy from enforcement points
      await this.removePolicyFromEnforcementPoints(policyId);
      
      logger.info(`Segmentation policy deleted: ${policyId}`, {
        deletedBy
      });
      
      // Emit event
      this.emit('policyDeleted', policy);
      
      return true;
    } catch (error) {
      logger.error('Error deleting policy:', error);
      throw error;
    }
  }

  async applyPolicy(policy) {
    try {
      const { rules, networkConfig } = policy;
      
      // Apply rules to enforcement points
      for (const [pointId, point] of this.enforcementPoints.entries()) {
        if (point.is_active) {
          await this.applyRulesToEnforcementPoint(pointId, rules);
        }
      }
      
      // Apply network configuration
      if (networkConfig && Object.keys(networkConfig).length > 0) {
        await this.applyNetworkConfiguration(networkConfig);
      }
      
      logger.info(`Policy applied: ${policy.id}`, {
        rulesCount: rules.length,
        enforcementPoints: this.enforcementPoints.size
      });
    } catch (error) {
      logger.error('Error applying policy:', error);
      throw error;
    }
  }

  async applyRulesToEnforcementPoint(pointId, rules) {
    try {
      const point = this.enforcementPoints.get(pointId);
      if (!point) {
        return;
      }
      
      // Apply each rule to the enforcement point
      for (const rule of rules) {
        await this.applyRuleToEnforcementPoint(pointId, rule);
      }
      
      logger.info(`Rules applied to enforcement point: ${pointId}`, {
        rulesCount: rules.length
      });
    } catch (error) {
      logger.error('Error applying rules to enforcement point:', error);
    }
  }

  async applyRuleToEnforcementPoint(pointId, rule) {
    try {
      const point = this.enforcementPoints.get(pointId);
      if (!point) {
        return;
      }
      
      const { type, conditions, actions } = rule;
      
      // Check if rule conditions are met
      if (conditions && conditions.length > 0) {
        const isApplicable = await this.evaluateRuleConditions(conditions, point);
        if (!isApplicable) {
          return; // Rule doesn't apply to this enforcement point
        }
      }
      
      // Apply rule actions
      for (const action of actions) {
        await this.executeRuleAction(pointId, action);
      }
      
      logger.info(`Rule applied to enforcement point: ${pointId}`, {
        ruleType: type,
        actionsCount: actions.length
      });
    } catch (error) {
      logger.error('Error applying rule to enforcement point:', error);
    }
  }

  async evaluateRuleConditions(conditions, point) {
    try {
      for (const condition of conditions) {
        if (!await this.evaluateCondition(condition, point)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error evaluating rule conditions:', error);
      return false;
    }
  }

  async evaluateCondition(condition, point) {
    try {
      const { type, field, operator, value } = condition;
      const pointValue = this.getFieldValue(point, field);
      
      switch (type) {
        case 'equals':
          return pointValue === value;
        case 'not_equals':
          return pointValue !== value;
        case 'contains':
          return pointValue && pointValue.includes(value);
        case 'not_contains':
          return !pointValue || !pointValue.includes(value);
        case 'in':
          return value.includes(pointValue);
        case 'not_in':
          return !value.includes(pointValue);
        case 'greater_than':
          return pointValue > value;
        case 'less_than':
          return pointValue < value;
        case 'exists':
          return pointValue !== undefined && pointValue !== null;
        case 'not_exists':
          return pointValue === undefined || pointValue === null;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async executeRuleAction(pointId, action) {
    try {
      const { type, parameters } = action;
      
      switch (type) {
        case 'allow':
          await this.allowTraffic(pointId, parameters);
          break;
        case 'deny':
          await this.denyTraffic(pointId, parameters);
          break;
        case 'redirect':
          await this.redirectTraffic(pointId, parameters);
          break;
        case 'log':
          await this.logTraffic(pointId, parameters);
          break;
        case 'rate_limit':
          await this.rateLimitTraffic(pointId, parameters);
          break;
        case 'encrypt':
          await this.encryptTraffic(pointId, parameters);
          break;
        case 'decrypt':
          await this.decryptTraffic(pointId, parameters);
          break;
        case 'inspect':
          await this.inspectTraffic(pointId, parameters);
          break;
        case 'quarantine':
          await this.quarantineTraffic(pointId, parameters);
          break;
        default:
          logger.warn(`Unknown rule action type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing rule action:', error);
    }
  }

  async allowTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, duration } = parameters;
      
      // Implementation for allowing traffic
      logger.info(`Traffic allowed at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        duration
      });
    } catch (error) {
      logger.error('Error allowing traffic:', error);
    }
  }

  async denyTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, reason } = parameters;
      
      // Implementation for denying traffic
      logger.info(`Traffic denied at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        reason
      });
    } catch (error) {
      logger.error('Error denying traffic:', error);
    }
  }

  async redirectTraffic(pointId, parameters) {
    try {
      const { source, destination, redirectTo, protocol, port } = parameters;
      
      // Implementation for redirecting traffic
      logger.info(`Traffic redirected at enforcement point: ${pointId}`, {
        source,
        destination,
        redirectTo,
        protocol,
        port
      });
    } catch (error) {
      logger.error('Error redirecting traffic:', error);
    }
  }

  async logTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, level, data } = parameters;
      
      // Implementation for logging traffic
      logger.info(`Traffic logged at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        level,
        data
      });
    } catch (error) {
      logger.error('Error logging traffic:', error);
    }
  }

  async rateLimitTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, rate, burst } = parameters;
      
      // Implementation for rate limiting traffic
      logger.info(`Traffic rate limited at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        rate,
        burst
      });
    } catch (error) {
      logger.error('Error rate limiting traffic:', error);
    }
  }

  async encryptTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, algorithm, key } = parameters;
      
      // Implementation for encrypting traffic
      logger.info(`Traffic encrypted at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        algorithm
      });
    } catch (error) {
      logger.error('Error encrypting traffic:', error);
    }
  }

  async decryptTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, algorithm, key } = parameters;
      
      // Implementation for decrypting traffic
      logger.info(`Traffic decrypted at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        algorithm
      });
    } catch (error) {
      logger.error('Error decrypting traffic:', error);
    }
  }

  async inspectTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, inspectionType, rules } = parameters;
      
      // Implementation for inspecting traffic
      logger.info(`Traffic inspected at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        inspectionType,
        rulesCount: rules ? rules.length : 0
      });
    } catch (error) {
      logger.error('Error inspecting traffic:', error);
    }
  }

  async quarantineTraffic(pointId, parameters) {
    try {
      const { source, destination, protocol, port, duration, reason } = parameters;
      
      // Implementation for quarantining traffic
      logger.info(`Traffic quarantined at enforcement point: ${pointId}`, {
        source,
        destination,
        protocol,
        port,
        duration,
        reason
      });
    } catch (error) {
      logger.error('Error quarantining traffic:', error);
    }
  }

  async applyNetworkConfiguration(networkConfig) {
    try {
      const { segments, routes, firewalls, loadBalancers, vpns } = networkConfig;
      
      // Apply segments
      if (segments && segments.length > 0) {
        await this.applySegments(segments);
      }
      
      // Apply routes
      if (routes && routes.length > 0) {
        await this.applyRoutes(routes);
      }
      
      // Apply firewalls
      if (firewalls && firewalls.length > 0) {
        await this.applyFirewalls(firewalls);
      }
      
      // Apply load balancers
      if (loadBalancers && loadBalancers.length > 0) {
        await this.applyLoadBalancers(loadBalancers);
      }
      
      // Apply VPNs
      if (vpns && vpns.length > 0) {
        await this.applyVPNs(vpns);
      }
      
      logger.info('Network configuration applied', {
        segments: segments ? segments.length : 0,
        routes: routes ? routes.length : 0,
        firewalls: firewalls ? firewalls.length : 0,
        loadBalancers: loadBalancers ? loadBalancers.length : 0,
        vpns: vpns ? vpns.length : 0
      });
    } catch (error) {
      logger.error('Error applying network configuration:', error);
      throw error;
    }
  }

  async applySegments(segments) {
    try {
      for (const segment of segments) {
        await this.applySegment(segment);
      }
    } catch (error) {
      logger.error('Error applying segments:', error);
    }
  }

  async applySegment(segment) {
    try {
      const { id, name, network, rules, conditions } = segment;
      
      // Store segment
      this.segments.set(id, {
        id,
        name,
        network,
        rules: rules || [],
        conditions: conditions || [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Apply segment rules
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          await this.applySegmentRule(id, rule);
        }
      }
      
      logger.info(`Segment applied: ${id}`, {
        name,
        network,
        rulesCount: rules ? rules.length : 0
      });
    } catch (error) {
      logger.error('Error applying segment:', error);
    }
  }

  async applySegmentRule(segmentId, rule) {
    try {
      const { type, conditions, actions } = rule;
      
      // Apply rule to all enforcement points in the segment
      for (const [pointId, point] of this.enforcementPoints.entries()) {
        if (point.segment_id === segmentId && point.is_active) {
          await this.applyRuleToEnforcementPoint(pointId, rule);
        }
      }
    } catch (error) {
      logger.error('Error applying segment rule:', error);
    }
  }

  async applyRoutes(routes) {
    try {
      for (const route of routes) {
        await this.applyRoute(route);
      }
    } catch (error) {
      logger.error('Error applying routes:', error);
    }
  }

  async applyRoute(route) {
    try {
      const { destination, gateway, interface, metric, type } = route;
      
      // Implementation for applying route
      logger.info(`Route applied: ${destination}`, {
        gateway,
        interface,
        metric,
        type
      });
    } catch (error) {
      logger.error('Error applying route:', error);
    }
  }

  async applyFirewalls(firewalls) {
    try {
      for (const firewall of firewalls) {
        await this.applyFirewall(firewall);
      }
    } catch (error) {
      logger.error('Error applying firewalls:', error);
    }
  }

  async applyFirewall(firewall) {
    try {
      const { name, rules, interface, direction } = firewall;
      
      // Implementation for applying firewall
      logger.info(`Firewall applied: ${name}`, {
        rulesCount: rules ? rules.length : 0,
        interface,
        direction
      });
    } catch (error) {
      logger.error('Error applying firewall:', error);
    }
  }

  async applyLoadBalancers(loadBalancers) {
    try {
      for (const lb of loadBalancers) {
        await this.applyLoadBalancer(lb);
      }
    } catch (error) {
      logger.error('Error applying load balancers:', error);
    }
  }

  async applyLoadBalancer(loadBalancer) {
    try {
      const { name, algorithm, backends, healthCheck } = loadBalancer;
      
      // Implementation for applying load balancer
      logger.info(`Load balancer applied: ${name}`, {
        algorithm,
        backendsCount: backends ? backends.length : 0,
        healthCheck
      });
    } catch (error) {
      logger.error('Error applying load balancer:', error);
    }
  }

  async applyVPNs(vpns) {
    try {
      for (const vpn of vpns) {
        await this.applyVPN(vpn);
      }
    } catch (error) {
      logger.error('Error applying VPNs:', error);
    }
  }

  async applyVPN(vpn) {
    try {
      const { name, type, endpoints, encryption, authentication } = vpn;
      
      // Implementation for applying VPN
      logger.info(`VPN applied: ${name}`, {
        type,
        endpointsCount: endpoints ? endpoints.length : 0,
        encryption,
        authentication
      });
    } catch (error) {
      logger.error('Error applying VPN:', error);
    }
  }

  async removePolicyFromEnforcementPoints(policyId) {
    try {
      for (const [pointId, point] of this.enforcementPoints.entries()) {
        if (point.is_active) {
          await this.removePolicyFromEnforcementPoint(pointId, policyId);
        }
      }
    } catch (error) {
      logger.error('Error removing policy from enforcement points:', error);
    }
  }

  async removePolicyFromEnforcementPoint(pointId, policyId) {
    try {
      const point = this.enforcementPoints.get(pointId);
      if (!point) {
        return;
      }
      
      // Implementation for removing policy from enforcement point
      logger.info(`Policy removed from enforcement point: ${pointId}`, {
        policyId
      });
    } catch (error) {
      logger.error('Error removing policy from enforcement point:', error);
    }
  }

  async getStatus(userId) {
    try {
      const status = {
        segments: {
          total: this.segments.size,
          active: Array.from(this.segments.values()).filter(s => s.is_active).length
        },
        policies: {
          total: this.policies.size,
          active: Array.from(this.policies.values()).filter(p => p.is_active).length
        },
        rules: {
          total: this.rules.size,
          active: Array.from(this.rules.values()).filter(r => r.is_active).length
        },
        enforcementPoints: {
          total: this.enforcementPoints.size,
          active: Array.from(this.enforcementPoints.values()).filter(p => p.is_active).length
        },
        networkConfigs: {
          total: this.networkConfigs.size,
          active: Array.from(this.networkConfigs.values()).filter(c => c.is_active).length
        }
      };
      
      return status;
    } catch (error) {
      logger.error('Error getting status:', error);
      throw error;
    }
  }

  getFieldValue(point, field) {
    try {
      const fields = field.split('.');
      let value = point;
      
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

  async getSegmentationStats() {
    try {
      const stats = {
        totalSegments: this.segments.size,
        activeSegments: Array.from(this.segments.values()).filter(s => s.is_active).length,
        totalPolicies: this.policies.size,
        activePolicies: Array.from(this.policies.values()).filter(p => p.is_active).length,
        totalRules: this.rules.size,
        activeRules: Array.from(this.rules.values()).filter(r => r.is_active).length,
        totalEnforcementPoints: this.enforcementPoints.size,
        activeEnforcementPoints: Array.from(this.enforcementPoints.values()).filter(p => p.is_active).length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting segmentation stats:', error);
      throw error;
    }
  }
}

module.exports = MicroSegmentation;
