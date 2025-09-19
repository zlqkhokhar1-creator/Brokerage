const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class PolicyManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.policies = new Map();
    this.policyCategories = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadPolicyCategories();
      await this.loadDefaultPolicies();
      logger.info('Policy Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Policy Manager:', error);
      throw error;
    }
  }

  async loadPolicyCategories() {
    try {
      const categories = [
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Regulatory compliance policies',
          enabled: true
        },
        {
          id: 'security',
          name: 'Security',
          description: 'Security and access control policies',
          enabled: true
        },
        {
          id: 'risk_management',
          name: 'Risk Management',
          description: 'Risk management and mitigation policies',
          enabled: true
        },
        {
          id: 'data_protection',
          name: 'Data Protection',
          description: 'Data privacy and protection policies',
          enabled: true
        },
        {
          id: 'trading',
          name: 'Trading',
          description: 'Trading and investment policies',
          enabled: true
        },
        {
          id: 'operational',
          name: 'Operational',
          description: 'Operational and business policies',
          enabled: true
        }
      ];

      for (const category of categories) {
        this.policyCategories.set(category.id, category);
      }

      logger.info(`Loaded ${categories.length} policy categories`);
    } catch (error) {
      logger.error('Error loading policy categories:', error);
    }
  }

  async loadDefaultPolicies() {
    try {
      const defaultPolicies = [
        {
          id: 'data_retention',
          name: 'Data Retention Policy',
          description: 'Policy for data retention and archival',
          category: 'data_protection',
          version: '1.0',
          status: 'active',
          content: {
            retentionPeriod: '7 years',
            archivalProcess: 'Automated archival after 1 year',
            deletionProcess: 'Secure deletion after retention period',
            exceptions: ['Legal holds', 'Regulatory requirements']
          },
          rules: [
            {
              id: 'retention_rule_1',
              name: 'Transaction Data Retention',
              description: 'Retain transaction data for 7 years',
              condition: 'data_type = "transaction"',
              action: 'retain',
              parameters: {
                period: '7 years',
                format: 'encrypted'
              }
            }
          ],
          compliance: ['SOX', 'GDPR', 'CCPA'],
          enabled: true
        },
        {
          id: 'access_control',
          name: 'Access Control Policy',
          description: 'Policy for user access control and permissions',
          category: 'security',
          version: '1.0',
          status: 'active',
          content: {
            principle: 'Least privilege access',
            authentication: 'Multi-factor authentication required',
            authorization: 'Role-based access control',
            monitoring: 'Continuous access monitoring'
          },
          rules: [
            {
              id: 'access_rule_1',
              name: 'Admin Access',
              description: 'Admin access requires approval',
              condition: 'role = "admin"',
              action: 'require_approval',
              parameters: {
                approver: 'super_admin',
                duration: '24 hours'
              }
            }
          ],
          compliance: ['SOX', 'PCI-DSS', 'ISO27001'],
          enabled: true
        },
        {
          id: 'risk_limits',
          name: 'Risk Limits Policy',
          description: 'Policy for risk management limits and controls',
          category: 'risk_management',
          version: '1.0',
          status: 'active',
          content: {
            varLimit: '5% of portfolio value',
            concentrationLimit: '10% per single asset',
            sectorLimit: '25% per sector',
            countryLimit: '40% per country'
          },
          rules: [
            {
              id: 'risk_rule_1',
              name: 'VaR Limit',
              description: 'Portfolio VaR must not exceed 5%',
              condition: 'portfolio_var > 0.05',
              action: 'alert_and_restrict',
              parameters: {
                threshold: 0.05,
                escalation: 'risk_committee'
              }
            }
          ],
          compliance: ['Basel III', 'MiFID II', 'Dodd-Frank'],
          enabled: true
        },
        {
          id: 'trading_restrictions',
          name: 'Trading Restrictions Policy',
          description: 'Policy for trading restrictions and controls',
          category: 'trading',
          version: '1.0',
          status: 'active',
          content: {
            blackoutPeriods: 'Earnings announcements, major news events',
            positionLimits: 'Based on risk limits policy',
            preTradeApproval: 'Required for large trades',
            postTradeReporting: 'Required within 24 hours'
          },
          rules: [
            {
              id: 'trading_rule_1',
              name: 'Blackout Period',
              description: 'No trading during blackout periods',
              condition: 'current_time in blackout_periods',
              action: 'block_trade',
              parameters: {
                blackoutPeriods: ['earnings', 'news_events'],
                notification: 'compliance_team'
              }
            }
          ],
          compliance: ['MiFID II', 'MAR', 'SEC'],
          enabled: true
        },
        {
          id: 'data_privacy',
          name: 'Data Privacy Policy',
          description: 'Policy for data privacy and protection',
          category: 'data_protection',
          version: '1.0',
          status: 'active',
          content: {
            dataClassification: 'Public, Internal, Confidential, Restricted',
            encryption: 'Required for Confidential and Restricted data',
            accessLogging: 'All data access must be logged',
            dataMinimization: 'Collect only necessary data'
          },
          rules: [
            {
              id: 'privacy_rule_1',
              name: 'Data Encryption',
              description: 'Encrypt all confidential data',
              condition: 'data_classification in ["confidential", "restricted"]',
              action: 'encrypt',
              parameters: {
                algorithm: 'AES-256',
                keyManagement: 'HSM'
              }
            }
          ],
          compliance: ['GDPR', 'CCPA', 'PIPEDA'],
          enabled: true
        }
      ];

      for (const policy of defaultPolicies) {
        this.policies.set(policy.id, policy);
      }

      logger.info(`Loaded ${defaultPolicies.length} default policies`);
    } catch (error) {
      logger.error('Error loading default policies:', error);
    }
  }

  async createPolicy(data, user) {
    try {
      const { name, description, category, content, rules, compliance, enabled = true } = data;
      
      const policy = {
        id: uuidv4(),
        name,
        description,
        category,
        version: '1.0',
        status: 'draft',
        content: content || {},
        rules: rules || [],
        compliance: compliance || [],
        enabled,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };
      
      // Validate policy
      await this.validatePolicy(policy);
      
      // Store policy
      await this.storePolicy(policy);
      this.policies.set(policy.id, policy);
      
      logger.info(`Policy created: ${policy.name}`, {
        policyId: policy.id,
        category: policy.category,
        createdBy: user.id
      });
      
      this.emit('policyCreated', {
        policyId: policy.id,
        policyName: policy.name,
        category: policy.category,
        createdBy: user.id
      });
      
      return policy;
    } catch (error) {
      logger.error('Error creating policy:', error);
      throw error;
    }
  }

  async updatePolicy(policyId, data, user) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }
      
      // Update policy fields
      if (data.name) policy.name = data.name;
      if (data.description) policy.description = data.description;
      if (data.category) policy.category = data.category;
      if (data.content) policy.content = data.content;
      if (data.rules) policy.rules = data.rules;
      if (data.compliance) policy.compliance = data.compliance;
      if (data.enabled !== undefined) policy.enabled = data.enabled;
      
      policy.updatedBy = user.id;
      policy.updatedAt = new Date();
      
      // Validate updated policy
      await this.validatePolicy(policy);
      
      // Store updated policy
      await this.updatePolicyInDatabase(policy);
      this.policies.set(policyId, policy);
      
      logger.info(`Policy updated: ${policy.name}`, {
        policyId: policy.id,
        updatedBy: user.id
      });
      
      this.emit('policyUpdated', {
        policyId: policy.id,
        policyName: policy.name,
        updatedBy: user.id
      });
      
      return policy;
    } catch (error) {
      logger.error(`Error updating policy ${policyId}:`, error);
      throw error;
    }
  }

  async deletePolicy(policyId, user) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }
      
      // Soft delete - mark as deleted
      policy.status = 'deleted';
      policy.deletedBy = user.id;
      policy.deletedAt = new Date();
      
      // Update in database
      await this.updatePolicyInDatabase(policy);
      this.policies.delete(policyId);
      
      logger.info(`Policy deleted: ${policy.name}`, {
        policyId: policy.id,
        deletedBy: user.id
      });
      
      this.emit('policyDeleted', {
        policyId: policy.id,
        policyName: policy.name,
        deletedBy: user.id
      });
      
      return policy;
    } catch (error) {
      logger.error(`Error deleting policy ${policyId}:`, error);
      throw error;
    }
  }

  async getPolicies(userId) {
    try {
      const query = `
        SELECT * FROM policies 
        WHERE status != 'deleted'
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        version: row.version,
        status: row.status,
        content: row.content,
        rules: row.rules,
        compliance: row.compliance,
        enabled: row.enabled,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata
      }));
    } catch (error) {
      logger.error('Error getting policies:', error);
      return [];
    }
  }

  async getPolicy(policyId, userId) {
    try {
      const query = `
        SELECT * FROM policies 
        WHERE id = $1 AND status != 'deleted'
      `;
      
      const result = await this.db.query(query, [policyId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        version: row.version,
        status: row.status,
        content: row.content,
        rules: row.rules,
        compliance: row.compliance,
        enabled: row.enabled,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata
      };
    } catch (error) {
      logger.error(`Error getting policy ${policyId}:`, error);
      return null;
    }
  }

  async getPoliciesByCategory(category, userId) {
    try {
      const query = `
        SELECT * FROM policies 
        WHERE category = $1 AND status != 'deleted'
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [category]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        version: row.version,
        status: row.status,
        content: row.content,
        rules: row.rules,
        compliance: row.compliance,
        enabled: row.enabled,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata
      }));
    } catch (error) {
      logger.error(`Error getting policies by category ${category}:`, error);
      return [];
    }
  }

  async activatePolicy(policyId, user) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }
      
      policy.status = 'active';
      policy.activatedBy = user.id;
      policy.activatedAt = new Date();
      policy.updatedAt = new Date();
      
      await this.updatePolicyInDatabase(policy);
      this.policies.set(policyId, policy);
      
      logger.info(`Policy activated: ${policy.name}`, {
        policyId: policy.id,
        activatedBy: user.id
      });
      
      this.emit('policyActivated', {
        policyId: policy.id,
        policyName: policy.name,
        activatedBy: user.id
      });
      
      return policy;
    } catch (error) {
      logger.error(`Error activating policy ${policyId}:`, error);
      throw error;
    }
  }

  async deactivatePolicy(policyId, user) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }
      
      policy.status = 'inactive';
      policy.deactivatedBy = user.id;
      policy.deactivatedAt = new Date();
      policy.updatedAt = new Date();
      
      await this.updatePolicyInDatabase(policy);
      this.policies.set(policyId, policy);
      
      logger.info(`Policy deactivated: ${policy.name}`, {
        policyId: policy.id,
        deactivatedBy: user.id
      });
      
      this.emit('policyDeactivated', {
        policyId: policy.id,
        policyName: policy.name,
        deactivatedBy: user.id
      });
      
      return policy;
    } catch (error) {
      logger.error(`Error deactivating policy ${policyId}:`, error);
      throw error;
    }
  }

  async validatePolicy(policy) {
    try {
      // Validate required fields
      if (!policy.name || policy.name.trim().length === 0) {
        throw new Error('Policy name is required');
      }
      
      if (!policy.description || policy.description.trim().length === 0) {
        throw new Error('Policy description is required');
      }
      
      if (!policy.category || !this.policyCategories.has(policy.category)) {
        throw new Error('Valid policy category is required');
      }
      
      // Validate rules
      if (policy.rules && Array.isArray(policy.rules)) {
        for (const rule of policy.rules) {
          if (!rule.id || !rule.name || !rule.condition || !rule.action) {
            throw new Error('Policy rules must have id, name, condition, and action');
          }
        }
      }
      
      // Validate compliance requirements
      if (policy.compliance && Array.isArray(policy.compliance)) {
        const validCompliance = ['SOX', 'GDPR', 'CCPA', 'PCI-DSS', 'ISO27001', 'Basel III', 'MiFID II', 'Dodd-Frank', 'MAR', 'SEC', 'PIPEDA'];
        for (const compliance of policy.compliance) {
          if (!validCompliance.includes(compliance)) {
            throw new Error(`Invalid compliance requirement: ${compliance}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Policy validation failed:', error);
      throw error;
    }
  }

  async evaluatePolicy(policyId, context) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy || !policy.enabled || policy.status !== 'active') {
        return {
          policyId,
          status: 'not_applicable',
          reason: 'Policy not found, disabled, or inactive'
        };
      }
      
      const results = [];
      
      // Evaluate each rule in the policy
      for (const rule of policy.rules) {
        try {
          const ruleResult = await this.evaluateRule(rule, context);
          results.push(ruleResult);
        } catch (error) {
          logger.error(`Error evaluating rule ${rule.id}:`, error);
          results.push({
            ruleId: rule.id,
            status: 'error',
            error: error.message
          });
        }
      }
      
      // Determine overall policy evaluation result
      const hasViolations = results.some(r => r.status === 'violation');
      const hasErrors = results.some(r => r.status === 'error');
      
      let status = 'compliant';
      if (hasErrors) {
        status = 'error';
      } else if (hasViolations) {
        status = 'violation';
      }
      
      return {
        policyId,
        policyName: policy.name,
        status,
        results,
        evaluatedAt: new Date()
      };
    } catch (error) {
      logger.error(`Error evaluating policy ${policyId}:`, error);
      return {
        policyId,
        status: 'error',
        error: error.message
      };
    }
  }

  async evaluateRule(rule, context) {
    try {
      // Mock rule evaluation - in reality would use a rule engine
      const { condition, action, parameters } = rule;
      
      // Simple condition evaluation
      const isConditionMet = this.evaluateCondition(condition, context);
      
      if (isConditionMet) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          status: 'violation',
          action: action,
          parameters: parameters,
          message: `Rule violation: ${rule.name}`
        };
      } else {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          status: 'compliant',
          action: action,
          parameters: parameters,
          message: `Rule compliant: ${rule.name}`
        };
      }
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}:`, error);
      return {
        ruleId: rule.id,
        status: 'error',
        error: error.message
      };
    }
  }

  evaluateCondition(condition, context) {
    try {
      // Mock condition evaluation - in reality would use a proper expression evaluator
      // This is a simplified version for demonstration
      
      if (condition.includes('data_type = "transaction"')) {
        return context.dataType === 'transaction';
      }
      
      if (condition.includes('role = "admin"')) {
        return context.role === 'admin';
      }
      
      if (condition.includes('portfolio_var > 0.05')) {
        return context.portfolioVar > 0.05;
      }
      
      if (condition.includes('current_time in blackout_periods')) {
        return context.isBlackoutPeriod === true;
      }
      
      if (condition.includes('data_classification in ["confidential", "restricted"]')) {
        return ['confidential', 'restricted'].includes(context.dataClassification);
      }
      
      return false;
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async getPolicyCategories() {
    try {
      return Array.from(this.policyCategories.values());
    } catch (error) {
      logger.error('Error getting policy categories:', error);
      return [];
    }
  }

  async storePolicy(policy) {
    try {
      const query = `
        INSERT INTO policies (
          id, name, description, category, version, status, content, rules,
          compliance, enabled, created_by, created_at, updated_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      await this.db.query(query, [
        policy.id,
        policy.name,
        policy.description,
        policy.category,
        policy.version,
        policy.status,
        JSON.stringify(policy.content),
        JSON.stringify(policy.rules),
        JSON.stringify(policy.compliance),
        policy.enabled,
        policy.createdBy,
        policy.createdAt,
        policy.updatedAt,
        JSON.stringify(policy.metadata)
      ]);
    } catch (error) {
      logger.error('Error storing policy:', error);
      throw error;
    }
  }

  async updatePolicyInDatabase(policy) {
    try {
      const query = `
        UPDATE policies 
        SET name = $1, description = $2, category = $3, version = $4, status = $5,
            content = $6, rules = $7, compliance = $8, enabled = $9, updated_at = $10,
            activated_by = $11, activated_at = $12, deactivated_by = $13, deactivated_at = $14,
            deleted_by = $15, deleted_at = $16, metadata = $17
        WHERE id = $18
      `;
      
      await this.db.query(query, [
        policy.name,
        policy.description,
        policy.category,
        policy.version,
        policy.status,
        JSON.stringify(policy.content),
        JSON.stringify(policy.rules),
        JSON.stringify(policy.compliance),
        policy.enabled,
        policy.updatedAt,
        policy.activatedBy || null,
        policy.activatedAt || null,
        policy.deactivatedBy || null,
        policy.deactivatedAt || null,
        policy.deletedBy || null,
        policy.deletedAt || null,
        JSON.stringify(policy.metadata),
        policy.id
      ]);
    } catch (error) {
      logger.error('Error updating policy in database:', error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('Policy Manager closed successfully');
    } catch (error) {
      logger.error('Error closing Policy Manager:', error);
    }
  }
}

module.exports = PolicyManager;

