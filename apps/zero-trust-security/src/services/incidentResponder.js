const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class IncidentResponder extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.incidents = new Map();
    this.responsePlans = new Map();
    this.responseActions = new Map();
    this.escalationRules = new Map();
    this.notificationChannels = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load response plans
      await this.loadResponsePlans();
      
      // Load response actions
      await this.loadResponseActions();
      
      // Load escalation rules
      await this.loadEscalationRules();
      
      // Load notification channels
      await this.loadNotificationChannels();
      
      this._initialized = true;
      logger.info('IncidentResponder initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IncidentResponder:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('IncidentResponder closed');
    } catch (error) {
      logger.error('Error closing IncidentResponder:', error);
    }
  }

  async loadResponsePlans() {
    try {
      const result = await pool.query(`
        SELECT * FROM incident_response_plans
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const plan of result.rows) {
        this.responsePlans.set(plan.id, {
          ...plan,
          steps: plan.steps ? JSON.parse(plan.steps) : [],
          conditions: plan.conditions ? JSON.parse(plan.conditions) : [],
          actions: plan.actions ? JSON.parse(plan.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} response plans`);
    } catch (error) {
      logger.error('Error loading response plans:', error);
      throw error;
    }
  }

  async loadResponseActions() {
    try {
      const result = await pool.query(`
        SELECT * FROM incident_response_actions
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const action of result.rows) {
        this.responseActions.set(action.id, {
          ...action,
          parameters: action.parameters ? JSON.parse(action.parameters) : {},
          conditions: action.conditions ? JSON.parse(action.conditions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} response actions`);
    } catch (error) {
      logger.error('Error loading response actions:', error);
      throw error;
    }
  }

  async loadEscalationRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM escalation_rules
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const rule of result.rows) {
        this.escalationRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} escalation rules`);
    } catch (error) {
      logger.error('Error loading escalation rules:', error);
      throw error;
    }
  }

  async loadNotificationChannels() {
    try {
      const result = await pool.query(`
        SELECT * FROM notification_channels
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const channel of result.rows) {
        this.notificationChannels.set(channel.id, {
          ...channel,
          config: channel.config ? JSON.parse(channel.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} notification channels`);
    } catch (error) {
      logger.error('Error loading notification channels:', error);
      throw error;
    }
  }

  async createIncident(title, description, severity, category, affectedSystems, createdBy) {
    try {
      const incidentId = nanoid();
      const incident = {
        id: incidentId,
        title,
        description,
        severity,
        category,
        affectedSystems: affectedSystems || [],
        status: 'open',
        priority: this.calculatePriority(severity, category),
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
        resolved_at: null,
        data: {}
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO security_incidents (id, title, description, severity, category, affected_systems, status, priority, created_by, created_at, updated_at, resolved_at, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        incidentId, title, description, severity, category, JSON.stringify(affectedSystems),
        incident.status, incident.priority, createdBy, incident.created_at, incident.updated_at,
        incident.resolved_at, JSON.stringify(incident.data)
      ]);
      
      // Store in memory
      this.incidents.set(incidentId, incident);
      
      // Store in Redis
      await this.redis.setex(
        `incident:${incidentId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(incident)
      );
      
      // Start incident response
      await this.startIncidentResponse(incident);
      
      // Emit event
      this.emit('incidentCreated', incident);
      
      logger.info(`Incident created: ${incidentId}`, {
        title,
        severity,
        category,
        priority: incident.priority
      });
      
      return incident;
    } catch (error) {
      logger.error('Error creating incident:', error);
      throw error;
    }
  }

  async getIncident(incidentId, userId) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        return null;
      }
      
      // Check if user has access to this incident
      if (incident.created_by !== userId && !await this.hasIncidentAccess(userId, incidentId)) {
        throw new Error('Access denied');
      }
      
      return incident;
    } catch (error) {
      logger.error('Error getting incident:', error);
      throw error;
    }
  }

  async updateIncident(incidentId, updates, updatedBy) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }
      
      // Update incident
      Object.assign(incident, updates, {
        updated_by: updatedBy,
        updated_at: new Date()
      });
      
      // Update database
      await pool.query(`
        UPDATE security_incidents
        SET title = $1, description = $2, severity = $3, category = $4, affected_systems = $5,
            status = $6, priority = $7, updated_by = $8, updated_at = $9, resolved_at = $10, data = $11
        WHERE id = $12
      `, [
        incident.title, incident.description, incident.severity, incident.category,
        JSON.stringify(incident.affectedSystems), incident.status, incident.priority,
        updatedBy, incident.updated_at, incident.resolved_at, JSON.stringify(incident.data),
        incidentId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `incident:${incidentId}`,
        24 * 60 * 60,
        JSON.stringify(incident)
      );
      
      // Emit event
      this.emit('incidentUpdated', incident);
      
      logger.info(`Incident updated: ${incidentId}`, {
        updatedBy,
        updates: Object.keys(updates)
      });
      
      return incident;
    } catch (error) {
      logger.error('Error updating incident:', error);
      throw error;
    }
  }

  async resolveIncident(incidentId, resolution, resolvedBy) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }
      
      // Update incident
      incident.status = 'resolved';
      incident.resolution = resolution;
      incident.resolved_by = resolvedBy;
      incident.resolved_at = new Date();
      incident.updated_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE security_incidents
        SET status = $1, resolution = $2, resolved_by = $3, resolved_at = $4, updated_at = $5
        WHERE id = $6
      `, [
        incident.status, incident.resolution, incident.resolved_by,
        incident.resolved_at, incident.updated_at, incidentId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `incident:${incidentId}`,
        24 * 60 * 60,
        JSON.stringify(incident)
      );
      
      // Emit event
      this.emit('incidentResolved', incident);
      
      logger.info(`Incident resolved: ${incidentId}`, {
        resolvedBy,
        resolution
      });
      
      return incident;
    } catch (error) {
      logger.error('Error resolving incident:', error);
      throw error;
    }
  }

  async startIncidentResponse(incident) {
    try {
      // Find applicable response plan
      const responsePlan = this.findApplicableResponsePlan(incident);
      
      if (responsePlan) {
        // Execute response plan
        await this.executeResponsePlan(incident, responsePlan);
      } else {
        // Execute default response actions
        await this.executeDefaultResponse(incident);
      }
      
      // Check for escalation
      await this.checkEscalation(incident);
      
      // Send notifications
      await this.sendIncidentNotifications(incident);
      
    } catch (error) {
      logger.error('Error starting incident response:', error);
    }
  }

  findApplicableResponsePlan(incident) {
    try {
      const applicablePlans = Array.from(this.responsePlans.values()).filter(plan => 
        plan.is_active && this.isPlanApplicable(plan, incident)
      );
      
      if (applicablePlans.length === 0) {
        return null;
      }
      
      // Sort by priority and return the highest priority plan
      applicablePlans.sort((a, b) => b.priority - a.priority);
      return applicablePlans[0];
    } catch (error) {
      logger.error('Error finding applicable response plan:', error);
      return null;
    }
  }

  isPlanApplicable(plan, incident) {
    try {
      const { conditions } = plan;
      
      if (!conditions || conditions.length === 0) {
        return true; // No conditions, plan is always applicable
      }
      
      for (const condition of conditions) {
        if (!this.evaluateCondition(condition, incident)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking plan applicability:', error);
      return false;
    }
  }

  evaluateCondition(condition, incident) {
    try {
      const { type, field, operator, value } = condition;
      const incidentValue = this.getFieldValue(incident, field);
      
      switch (type) {
        case 'equals':
          return incidentValue === value;
        case 'not_equals':
          return incidentValue !== value;
        case 'contains':
          return incidentValue && incidentValue.includes(value);
        case 'not_contains':
          return !incidentValue || !incidentValue.includes(value);
        case 'in':
          return value.includes(incidentValue);
        case 'not_in':
          return !value.includes(incidentValue);
        case 'greater_than':
          return incidentValue > value;
        case 'less_than':
          return incidentValue < value;
        case 'exists':
          return incidentValue !== undefined && incidentValue !== null;
        case 'not_exists':
          return incidentValue === undefined || incidentValue === null;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async executeResponsePlan(incident, responsePlan) {
    try {
      const { steps, actions } = responsePlan;
      
      // Execute steps
      for (const step of steps) {
        await this.executeStep(incident, step);
      }
      
      // Execute actions
      for (const action of actions) {
        await this.executeAction(incident, action);
      }
      
      logger.info(`Response plan executed for incident: ${incident.id}`, {
        planId: responsePlan.id,
        planName: responsePlan.name
      });
    } catch (error) {
      logger.error('Error executing response plan:', error);
    }
  }

  async executeDefaultResponse(incident) {
    try {
      const defaultActions = [
        {
          type: 'log',
          parameters: {
            message: `Incident ${incident.id} created: ${incident.title}`
          }
        },
        {
          type: 'notify',
          parameters: {
            channels: ['email', 'slack'],
            message: `New incident: ${incident.title}`
          }
        }
      ];
      
      for (const action of defaultActions) {
        await this.executeAction(incident, action);
      }
      
      logger.info(`Default response executed for incident: ${incident.id}`);
    } catch (error) {
      logger.error('Error executing default response:', error);
    }
  }

  async executeStep(incident, step) {
    try {
      const { type, parameters, conditions } = step;
      
      // Check conditions
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          if (!this.evaluateCondition(condition, incident)) {
            return; // Skip this step
          }
        }
      }
      
      // Execute step based on type
      switch (type) {
        case 'assign':
          await this.assignIncident(incident, parameters);
          break;
        case 'escalate':
          await this.escalateIncident(incident, parameters);
          break;
        case 'notify':
          await this.notifyIncident(incident, parameters);
          break;
        case 'block':
          await this.blockIncident(incident, parameters);
          break;
        case 'quarantine':
          await this.quarantineIncident(incident, parameters);
          break;
        case 'investigate':
          await this.investigateIncident(incident, parameters);
          break;
        case 'contain':
          await this.containIncident(incident, parameters);
          break;
        case 'eradicate':
          await this.eradicateIncident(incident, parameters);
          break;
        case 'recover':
          await this.recoverIncident(incident, parameters);
          break;
        default:
          logger.warn(`Unknown step type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing step:', error);
    }
  }

  async executeAction(incident, action) {
    try {
      const { type, parameters } = action;
      
      switch (type) {
        case 'log':
          await this.logIncident(incident, parameters);
          break;
        case 'notify':
          await this.notifyIncident(incident, parameters);
          break;
        case 'escalate':
          await this.escalateIncident(incident, parameters);
          break;
        case 'assign':
          await this.assignIncident(incident, parameters);
          break;
        case 'block':
          await this.blockIncident(incident, parameters);
          break;
        case 'quarantine':
          await this.quarantineIncident(incident, parameters);
          break;
        case 'investigate':
          await this.investigateIncident(incident, parameters);
          break;
        case 'contain':
          await this.containIncident(incident, parameters);
          break;
        case 'eradicate':
          await this.eradicateIncident(incident, parameters);
          break;
        case 'recover':
          await this.recoverIncident(incident, parameters);
          break;
        default:
          logger.warn(`Unknown action type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
    }
  }

  async assignIncident(incident, parameters) {
    try {
      const { assignee, team, priority } = parameters;
      
      // Update incident
      incident.assigned_to = assignee;
      incident.assigned_team = team;
      if (priority) {
        incident.priority = priority;
      }
      
      // Update database
      await pool.query(`
        UPDATE security_incidents
        SET assigned_to = $1, assigned_team = $2, priority = $3, updated_at = $4
        WHERE id = $5
      `, [assignee, team, incident.priority, new Date(), incident.id]);
      
      logger.info(`Incident assigned: ${incident.id}`, {
        assignee,
        team,
        priority: incident.priority
      });
    } catch (error) {
      logger.error('Error assigning incident:', error);
    }
  }

  async escalateIncident(incident, parameters) {
    try {
      const { level, reason, notify } = parameters;
      
      // Update incident
      incident.escalation_level = level;
      incident.escalation_reason = reason;
      incident.escalated_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE security_incidents
        SET escalation_level = $1, escalation_reason = $2, escalated_at = $3, updated_at = $4
        WHERE id = $5
      `, [level, reason, incident.escalated_at, new Date(), incident.id]);
      
      // Send escalation notifications
      if (notify) {
        await this.sendEscalationNotifications(incident, level, reason);
      }
      
      logger.info(`Incident escalated: ${incident.id}`, {
        level,
        reason
      });
    } catch (error) {
      logger.error('Error escalating incident:', error);
    }
  }

  async notifyIncident(incident, parameters) {
    try {
      const { channels, message, recipients } = parameters;
      
      for (const channelId of channels) {
        const channel = this.notificationChannels.get(channelId);
        if (channel) {
          await this.sendNotification(channel, incident, message, recipients);
        }
      }
      
      logger.info(`Incident notifications sent: ${incident.id}`, {
        channels,
        recipients: recipients ? recipients.length : 0
      });
    } catch (error) {
      logger.error('Error notifying incident:', error);
    }
  }

  async blockIncident(incident, parameters) {
    try {
      const { resources, duration, reason } = parameters;
      
      // Implementation for blocking resources
      logger.info(`Incident blocked: ${incident.id}`, {
        resources,
        duration,
        reason
      });
    } catch (error) {
      logger.error('Error blocking incident:', error);
    }
  }

  async quarantineIncident(incident, parameters) {
    try {
      const { resources, duration, reason } = parameters;
      
      // Implementation for quarantining resources
      logger.info(`Incident quarantined: ${incident.id}`, {
        resources,
        duration,
        reason
      });
    } catch (error) {
      logger.error('Error quarantining incident:', error);
    }
  }

  async investigateIncident(incident, parameters) {
    try {
      const { investigators, tools, timeline } = parameters;
      
      // Implementation for investigation
      logger.info(`Incident investigation started: ${incident.id}`, {
        investigators,
        tools,
        timeline
      });
    } catch (error) {
      logger.error('Error investigating incident:', error);
    }
  }

  async containIncident(incident, parameters) {
    try {
      const { resources, methods, duration } = parameters;
      
      // Implementation for containment
      logger.info(`Incident contained: ${incident.id}`, {
        resources,
        methods,
        duration
      });
    } catch (error) {
      logger.error('Error containing incident:', error);
    }
  }

  async eradicateIncident(incident, parameters) {
    try {
      const { resources, methods, verification } = parameters;
      
      // Implementation for eradication
      logger.info(`Incident eradicated: ${incident.id}`, {
        resources,
        methods,
        verification
      });
    } catch (error) {
      logger.error('Error eradicating incident:', error);
    }
  }

  async recoverIncident(incident, parameters) {
    try {
      const { resources, methods, verification } = parameters;
      
      // Implementation for recovery
      logger.info(`Incident recovered: ${incident.id}`, {
        resources,
        methods,
        verification
      });
    } catch (error) {
      logger.error('Error recovering incident:', error);
    }
  }

  async logIncident(incident, parameters) {
    try {
      const { message, level, data } = parameters;
      
      logger.info(`Incident log: ${incident.id}`, {
        message,
        level,
        data
      });
    } catch (error) {
      logger.error('Error logging incident:', error);
    }
  }

  async checkEscalation(incident) {
    try {
      const applicableRules = Array.from(this.escalationRules.values()).filter(rule => 
        rule.is_active && this.isEscalationRuleApplicable(rule, incident)
      );
      
      for (const rule of applicableRules) {
        await this.executeEscalationRule(incident, rule);
      }
    } catch (error) {
      logger.error('Error checking escalation:', error);
    }
  }

  isEscalationRuleApplicable(rule, incident) {
    try {
      const { conditions } = rule;
      
      if (!conditions || conditions.length === 0) {
        return true; // No conditions, rule is always applicable
      }
      
      for (const condition of conditions) {
        if (!this.evaluateCondition(condition, incident)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking escalation rule applicability:', error);
      return false;
    }
  }

  async executeEscalationRule(incident, rule) {
    try {
      const { actions } = rule;
      
      for (const action of actions) {
        await this.executeAction(incident, action);
      }
      
      logger.info(`Escalation rule executed for incident: ${incident.id}`, {
        ruleId: rule.id,
        ruleName: rule.name
      });
    } catch (error) {
      logger.error('Error executing escalation rule:', error);
    }
  }

  async sendIncidentNotifications(incident) {
    try {
      const channels = Array.from(this.notificationChannels.values()).filter(channel => 
        channel.is_active && this.isChannelApplicable(channel, incident)
      );
      
      for (const channel of channels) {
        await this.sendNotification(channel, incident);
      }
    } catch (error) {
      logger.error('Error sending incident notifications:', error);
    }
  }

  async sendEscalationNotifications(incident, level, reason) {
    try {
      const channels = Array.from(this.notificationChannels.values()).filter(channel => 
        channel.is_active && channel.escalation_levels && channel.escalation_levels.includes(level)
      );
      
      for (const channel of channels) {
        await this.sendNotification(channel, incident, `Incident escalated to level ${level}: ${reason}`);
      }
    } catch (error) {
      logger.error('Error sending escalation notifications:', error);
    }
  }

  isChannelApplicable(channel, incident) {
    try {
      const { severity_levels, categories, conditions } = channel;
      
      // Check severity levels
      if (severity_levels && !severity_levels.includes(incident.severity)) {
        return false;
      }
      
      // Check categories
      if (categories && !categories.includes(incident.category)) {
        return false;
      }
      
      // Check conditions
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          if (!this.evaluateCondition(condition, incident)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking channel applicability:', error);
      return false;
    }
  }

  async sendNotification(channel, incident, message, recipients) {
    try {
      const { type, config } = channel;
      
      switch (type) {
        case 'email':
          await this.sendEmailNotification(config, incident, message, recipients);
          break;
        case 'slack':
          await this.sendSlackNotification(config, incident, message);
          break;
        case 'webhook':
          await this.sendWebhookNotification(config, incident, message);
          break;
        case 'sms':
          await this.sendSMSNotification(config, incident, message, recipients);
          break;
        default:
          logger.warn(`Unknown notification channel type: ${type}`);
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  async sendEmailNotification(config, incident, message, recipients) {
    try {
      // Implementation for email notifications
      logger.info(`Email notification sent for incident: ${incident.id}`, {
        recipients: recipients ? recipients.length : 0,
        message
      });
    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  async sendSlackNotification(config, incident, message) {
    try {
      // Implementation for Slack notifications
      logger.info(`Slack notification sent for incident: ${incident.id}`, {
        message
      });
    } catch (error) {
      logger.error('Error sending Slack notification:', error);
    }
  }

  async sendWebhookNotification(config, incident, message) {
    try {
      // Implementation for webhook notifications
      logger.info(`Webhook notification sent for incident: ${incident.id}`, {
        message
      });
    } catch (error) {
      logger.error('Error sending webhook notification:', error);
    }
  }

  async sendSMSNotification(config, incident, message, recipients) {
    try {
      // Implementation for SMS notifications
      logger.info(`SMS notification sent for incident: ${incident.id}`, {
        recipients: recipients ? recipients.length : 0,
        message
      });
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
    }
  }

  calculatePriority(severity, category) {
    try {
      const severityWeights = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      const categoryWeights = {
        'security': 4,
        'system': 3,
        'network': 2,
        'application': 1
      };
      
      const severityWeight = severityWeights[severity] || 1;
      const categoryWeight = categoryWeights[category] || 1;
      
      return Math.min(severityWeight + categoryWeight, 5); // Max priority of 5
    } catch (error) {
      logger.error('Error calculating priority:', error);
      return 1;
    }
  }

  getFieldValue(incident, field) {
    try {
      const fields = field.split('.');
      let value = incident;
      
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

  async hasIncidentAccess(userId, incidentId) {
    try {
      // Check if user has access to incident
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM incident_access
        WHERE user_id = $1 AND incident_id = $2
      `, [userId, incidentId]);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking incident access:', error);
      return false;
    }
  }

  async getIncidentStats() {
    try {
      const stats = {
        totalIncidents: this.incidents.size,
        openIncidents: Array.from(this.incidents.values()).filter(i => i.status === 'open').length,
        resolvedIncidents: Array.from(this.incidents.values()).filter(i => i.status === 'resolved').length,
        incidentsBySeverity: {},
        incidentsByCategory: {},
        incidentsByPriority: {}
      };
      
      // Count incidents by severity
      for (const [incidentId, incident] of this.incidents.entries()) {
        if (!stats.incidentsBySeverity[incident.severity]) {
          stats.incidentsBySeverity[incident.severity] = 0;
        }
        stats.incidentsBySeverity[incident.severity]++;
        
        if (!stats.incidentsByCategory[incident.category]) {
          stats.incidentsByCategory[incident.category] = 0;
        }
        stats.incidentsByCategory[incident.category]++;
        
        if (!stats.incidentsByPriority[incident.priority]) {
          stats.incidentsByPriority[incident.priority] = 0;
        }
        stats.incidentsByPriority[incident.priority]++;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting incident stats:', error);
      throw error;
    }
  }
}

module.exports = IncidentResponder;
