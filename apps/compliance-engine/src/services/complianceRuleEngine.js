const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ComplianceRuleEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.rules = new Map();
    this.violations = new Map();
    this.ruleEvaluators = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load compliance rules
      await this.loadRules();
      
      // Initialize rule evaluators
      this.initializeRuleEvaluators();
      
      this._initialized = true;
      logger.info('ComplianceRuleEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ComplianceRuleEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ComplianceRuleEngine closed');
    } catch (error) {
      logger.error('Error closing ComplianceRuleEngine:', error);
    }
  }

  async createRule(ruleData, userId) {
    try {
      const ruleId = nanoid();
      const rule = {
        id: ruleId,
        name: ruleData.name,
        description: ruleData.description,
        category: ruleData.category,
        type: ruleData.type,
        conditions: ruleData.conditions,
        actions: ruleData.actions,
        severity: ruleData.severity || 'medium',
        status: 'active',
        priority: ruleData.priority || 1,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate rule
      this.validateRule(rule);

      // Store in database
      await this.storeRule(rule);
      
      // Store in memory
      this.rules.set(ruleId, rule);
      
      // Initialize rule evaluator
      this.initializeRuleEvaluator(ruleId, rule);
      
      logger.info(`Compliance rule created: ${ruleId}`, { name: rule.name, category: rule.category });
      this.emit('ruleCreated', rule);
      
      return rule;
    } catch (error) {
      logger.error('Error creating compliance rule:', error);
      throw error;
    }
  }

  async updateRule(ruleId, updateData, userId) {
    try {
      const existingRule = this.rules.get(ruleId);
      if (!existingRule) {
        throw new Error('Rule not found');
      }

      // Check permissions
      if (existingRule.createdBy !== userId) {
        throw new Error('Unauthorized to update this rule');
      }

      // Update rule
      const updatedRule = {
        ...existingRule,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // Validate updated rule
      this.validateRule(updatedRule);

      // Update in database
      await this.updateRuleInDatabase(updatedRule);
      
      // Update in memory
      this.rules.set(ruleId, updatedRule);
      
      // Reinitialize rule evaluator
      this.initializeRuleEvaluator(ruleId, updatedRule);
      
      logger.info(`Compliance rule updated: ${ruleId}`, { name: updatedRule.name });
      this.emit('ruleUpdated', updatedRule);
      
      return updatedRule;
    } catch (error) {
      logger.error('Error updating compliance rule:', error);
      throw error;
    }
  }

  async deleteRule(ruleId, userId) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      // Check permissions
      if (rule.createdBy !== userId) {
        throw new Error('Unauthorized to delete this rule');
      }

      // Delete from database
      await this.deleteRuleFromDatabase(ruleId);
      
      // Remove from memory
      this.rules.delete(ruleId);
      this.ruleEvaluators.delete(ruleId);
      
      logger.info(`Compliance rule deleted: ${ruleId}`, { name: rule.name });
      this.emit('ruleDeleted', rule);
      
      return true;
    } catch (error) {
      logger.error('Error deleting compliance rule:', error);
      throw error;
    }
  }

  async getRules(category = null, status = null) {
    try {
      let rules = Array.from(this.rules.values());
      
      if (category) {
        rules = rules.filter(rule => rule.category === category);
      }
      
      if (status) {
        rules = rules.filter(rule => rule.status === status);
      }
      
      return rules.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Error getting compliance rules:', error);
      throw error;
    }
  }

  async checkRule(ruleId) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule || rule.status !== 'active') {
        return;
      }

      const evaluator = this.ruleEvaluators.get(ruleId);
      if (!evaluator) {
        return;
      }

      // Evaluate rule
      const result = await evaluator.evaluate();
      
      if (result.violated) {
        await this.createViolation(ruleId, result);
      }
    } catch (error) {
      logger.error(`Error checking rule ${ruleId}:`, error);
    }
  }

  async createViolation(ruleId, violationData) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      const violationId = nanoid();
      const violation = {
        id: violationId,
        ruleId,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        description: violationData.description,
        details: violationData.details,
        userId: violationData.userId,
        portfolioId: violationData.portfolioId,
        status: 'open',
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
        acknowledgedBy: null,
        resolvedBy: null,
        resolution: null,
        notes: null
      };

      // Store in database
      await this.storeViolation(violation);
      
      // Store in memory
      this.violations.set(violationId, violation);
      
      logger.warn(`Compliance violation detected: ${violationId}`, {
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity
      });
      
      this.emit('violationDetected', violation);
      
      return violation;
    } catch (error) {
      logger.error('Error creating violation:', error);
      throw error;
    }
  }

  async getViolations(userId, status = null, severity = null, limit = 100) {
    try {
      let violations = Array.from(this.violations.values());
      
      if (userId) {
        violations = violations.filter(v => v.userId === userId);
      }
      
      if (status) {
        violations = violations.filter(v => v.status === status);
      }
      
      if (severity) {
        violations = violations.filter(v => v.severity === severity);
      }
      
      return violations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting violations:', error);
      throw error;
    }
  }

  async acknowledgeViolation(violationId, userId) {
    try {
      const violation = this.violations.get(violationId);
      if (!violation) {
        throw new Error('Violation not found');
      }

      if (violation.status !== 'open') {
        throw new Error('Violation is not open');
      }

      // Update violation
      violation.status = 'acknowledged';
      violation.acknowledgedAt = new Date().toISOString();
      violation.acknowledgedBy = userId;
      violation.updatedAt = new Date().toISOString();

      // Update in database
      await this.updateViolation(violation);
      
      logger.info(`Violation acknowledged: ${violationId}`, { userId });
      this.emit('violationAcknowledged', violation);
      
      return violation;
    } catch (error) {
      logger.error('Error acknowledging violation:', error);
      throw error;
    }
  }

  async resolveViolation(violationId, resolution, notes, userId) {
    try {
      const violation = this.violations.get(violationId);
      if (!violation) {
        throw new Error('Violation not found');
      }

      if (violation.status === 'resolved') {
        throw new Error('Violation is already resolved');
      }

      // Update violation
      violation.status = 'resolved';
      violation.resolvedAt = new Date().toISOString();
      violation.resolvedBy = userId;
      violation.resolution = resolution;
      violation.notes = notes;
      violation.updatedAt = new Date().toISOString();

      // Update in database
      await this.updateViolation(violation);
      
      logger.info(`Violation resolved: ${violationId}`, { userId, resolution });
      this.emit('violationResolved', violation);
      
      return violation;
    } catch (error) {
      logger.error('Error resolving violation:', error);
      throw error;
    }
  }

  validateRule(rule) {
    if (!rule.name || typeof rule.name !== 'string') {
      throw new Error('Rule name is required');
    }
    
    if (!rule.category || typeof rule.category !== 'string') {
      throw new Error('Rule category is required');
    }
    
    if (!rule.type || typeof rule.type !== 'string') {
      throw new Error('Rule type is required');
    }
    
    if (!rule.conditions || !Array.isArray(rule.conditions)) {
      throw new Error('Rule conditions are required');
    }
    
    if (!rule.actions || !Array.isArray(rule.actions)) {
      throw new Error('Rule actions are required');
    }
    
    const validCategories = ['KYC', 'AML', 'TRADE_SURVEILLANCE', 'REGULATORY_REPORTING', 'RISK_MANAGEMENT'];
    if (!validCategories.includes(rule.category)) {
      throw new Error(`Invalid rule category: ${rule.category}`);
    }
    
    const validTypes = ['THRESHOLD', 'PATTERN', 'BEHAVIORAL', 'REGULATORY'];
    if (!validTypes.includes(rule.type)) {
      throw new Error(`Invalid rule type: ${rule.type}`);
    }
    
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(rule.severity)) {
      throw new Error(`Invalid rule severity: ${rule.severity}`);
    }
  }

  initializeRuleEvaluators() {
    // Initialize built-in rule evaluators
    this.ruleEvaluators.set('pdt_check', new PatternDayTradingEvaluator());
    this.ruleEvaluators.set('wash_sale_check', new WashSaleEvaluator());
    this.ruleEvaluators.set('position_limit_check', new PositionLimitEvaluator());
    this.ruleEvaluators.set('concentration_check', new ConcentrationEvaluator());
    this.ruleEvaluators.set('volatility_check', new VolatilityEvaluator());
  }

  initializeRuleEvaluator(ruleId, rule) {
    try {
      let evaluator;
      
      switch (rule.type) {
        case 'THRESHOLD':
          evaluator = new ThresholdEvaluator(rule);
          break;
        case 'PATTERN':
          evaluator = new PatternEvaluator(rule);
          break;
        case 'BEHAVIORAL':
          evaluator = new BehavioralEvaluator(rule);
          break;
        case 'REGULATORY':
          evaluator = new RegulatoryEvaluator(rule);
          break;
        default:
          evaluator = new GenericEvaluator(rule);
      }
      
      this.ruleEvaluators.set(ruleId, evaluator);
    } catch (error) {
      logger.error(`Error initializing rule evaluator for ${ruleId}:`, error);
    }
  }

  async loadRules() {
    try {
      const query = 'SELECT * FROM compliance_rules WHERE status = $1 ORDER BY priority DESC';
      const result = await pool.query(query, ['active']);
      
      for (const row of result.rows) {
        const rule = {
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          type: row.type,
          conditions: JSON.parse(row.conditions),
          actions: JSON.parse(row.actions),
          severity: row.severity,
          status: row.status,
          priority: row.priority,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        this.rules.set(rule.id, rule);
        this.initializeRuleEvaluator(rule.id, rule);
      }
      
      logger.info(`Loaded ${this.rules.size} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
      throw error;
    }
  }

  async storeRule(rule) {
    try {
      const query = `
        INSERT INTO compliance_rules (
          id, name, description, category, type, conditions, actions,
          severity, status, priority, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      
      await pool.query(query, [
        rule.id,
        rule.name,
        rule.description,
        rule.category,
        rule.type,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.severity,
        rule.status,
        rule.priority,
        rule.createdBy,
        rule.createdAt,
        rule.updatedAt
      ]);
    } catch (error) {
      logger.error('Error storing compliance rule:', error);
      throw error;
    }
  }

  async updateRuleInDatabase(rule) {
    try {
      const query = `
        UPDATE compliance_rules SET
          name = $2, description = $3, category = $4, type = $5,
          conditions = $6, actions = $7, severity = $8, status = $9,
          priority = $10, updated_at = $11
        WHERE id = $1
      `;
      
      await pool.query(query, [
        rule.id,
        rule.name,
        rule.description,
        rule.category,
        rule.type,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.severity,
        rule.status,
        rule.priority,
        rule.updatedAt
      ]);
    } catch (error) {
      logger.error('Error updating compliance rule:', error);
      throw error;
    }
  }

  async deleteRuleFromDatabase(ruleId) {
    try {
      const query = 'DELETE FROM compliance_rules WHERE id = $1';
      await pool.query(query, [ruleId]);
    } catch (error) {
      logger.error('Error deleting compliance rule:', error);
      throw error;
    }
  }

  async storeViolation(violation) {
    try {
      const query = `
        INSERT INTO compliance_violations (
          id, rule_id, rule_name, category, severity, description, details,
          user_id, portfolio_id, status, created_at, acknowledged_at,
          resolved_at, acknowledged_by, resolved_by, resolution, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `;
      
      await pool.query(query, [
        violation.id,
        violation.ruleId,
        violation.ruleName,
        violation.category,
        violation.severity,
        violation.description,
        JSON.stringify(violation.details),
        violation.userId,
        violation.portfolioId,
        violation.status,
        violation.createdAt,
        violation.acknowledgedAt,
        violation.resolvedAt,
        violation.acknowledgedBy,
        violation.resolvedBy,
        violation.resolution,
        violation.notes
      ]);
    } catch (error) {
      logger.error('Error storing violation:', error);
      throw error;
    }
  }

  async updateViolation(violation) {
    try {
      const query = `
        UPDATE compliance_violations SET
          status = $2, acknowledged_at = $3, resolved_at = $4,
          acknowledged_by = $5, resolved_by = $6, resolution = $7, notes = $8
        WHERE id = $1
      `;
      
      await pool.query(query, [
        violation.id,
        violation.status,
        violation.acknowledgedAt,
        violation.resolvedAt,
        violation.acknowledgedBy,
        violation.resolvedBy,
        violation.resolution,
        violation.notes
      ]);
    } catch (error) {
      logger.error('Error updating violation:', error);
      throw error;
    }
  }
}

// Rule evaluator classes
class GenericEvaluator {
  constructor(rule) {
    this.rule = rule;
  }

  async evaluate() {
    // Generic rule evaluation logic
    return { violated: false };
  }
}

class ThresholdEvaluator {
  constructor(rule) {
    this.rule = rule;
  }

  async evaluate() {
    // Threshold-based rule evaluation
    return { violated: false };
  }
}

class PatternEvaluator {
  constructor(rule) {
    this.rule = rule;
  }

  async evaluate() {
    // Pattern-based rule evaluation
    return { violated: false };
  }
}

class BehavioralEvaluator {
  constructor(rule) {
    this.rule = rule;
  }

  async evaluate() {
    // Behavioral rule evaluation
    return { violated: false };
  }
}

class RegulatoryEvaluator {
  constructor(rule) {
    this.rule = rule;
  }

  async evaluate() {
    // Regulatory rule evaluation
    return { violated: false };
  }
}

class PatternDayTradingEvaluator {
  async evaluate() {
    // Pattern day trading evaluation logic
    return { violated: false };
  }
}

class WashSaleEvaluator {
  async evaluate() {
    // Wash sale evaluation logic
    return { violated: false };
  }
}

class PositionLimitEvaluator {
  async evaluate() {
    // Position limit evaluation logic
    return { violated: false };
  }
}

class ConcentrationEvaluator {
  async evaluate() {
    // Concentration evaluation logic
    return { violated: false };
  }
}

class VolatilityEvaluator {
  async evaluate() {
    // Volatility evaluation logic
    return { violated: false };
  }
}

module.exports = ComplianceRuleEngine;
