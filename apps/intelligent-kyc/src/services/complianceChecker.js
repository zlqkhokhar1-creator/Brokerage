const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ComplianceChecker extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.checks = new Map();
    this.complianceRules = new Map();
    this.regulations = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load compliance rules
      await this.loadComplianceRules();
      
      // Load regulations
      await this.loadRegulations();
      
      this._initialized = true;
      logger.info('ComplianceChecker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ComplianceChecker:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ComplianceChecker closed');
    } catch (error) {
      logger.error('Error closing ComplianceChecker:', error);
    }
  }

  async loadComplianceRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM compliance_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const rule of result.rows) {
        this.complianceRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : {},
          parameters: rule.parameters ? JSON.parse(rule.parameters) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
      throw error;
    }
  }

  async loadRegulations() {
    try {
      const result = await pool.query(`
        SELECT * FROM regulations
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const regulation of result.rows) {
        this.regulations.set(regulation.id, {
          ...regulation,
          requirements: regulation.requirements ? JSON.parse(regulation.requirements) : {},
          penalties: regulation.penalties ? JSON.parse(regulation.penalties) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} regulations`);
    } catch (error) {
      logger.error('Error loading regulations:', error);
      throw error;
    }
  }

  async checkCompliance(userData, riskAssessment, documentVerification, identityVerification, userId, checkerId) {
    try {
      const checkId = nanoid();
      const now = new Date();
      
      // Create compliance check record
      const check = {
        id: checkId,
        user_id: userId,
        user_data: userData,
        risk_assessment: riskAssessment,
        document_verification: documentVerification,
        identity_verification: identityVerification,
        status: 'pending',
        compliance_results: {},
        violations: [],
        recommendations: [],
        created_by: checkerId,
        created_at: now,
        updated_at: now,
        completed_at: null
      };
      
      // Store check
      await this.storeCheck(check);
      
      // Cache check
      this.checks.set(checkId, check);
      
      // Process check asynchronously
      this.processCheck(checkId);
      
      logger.info(`Compliance check started: ${checkId}`, {
        userId,
        riskLevel: riskAssessment?.risk_level,
        documentStatus: documentVerification?.status,
        identityStatus: identityVerification?.status
      });
      
      return check;
    } catch (error) {
      logger.error('Error checking compliance:', error);
      throw error;
    }
  }

  async getCheck(checkId, userId) {
    try {
      // Check cache first
      if (this.checks.has(checkId)) {
        return this.checks.get(checkId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM compliance_checks
        WHERE id = $1 AND user_id = $2
      `, [checkId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Check not found');
      }
      
      const check = {
        ...result.rows[0],
        user_data: result.rows[0].user_data ? JSON.parse(result.rows[0].user_data) : {},
        risk_assessment: result.rows[0].risk_assessment ? JSON.parse(result.rows[0].risk_assessment) : {},
        document_verification: result.rows[0].document_verification ? JSON.parse(result.rows[0].document_verification) : {},
        identity_verification: result.rows[0].identity_verification ? JSON.parse(result.rows[0].identity_verification) : {},
        compliance_results: result.rows[0].compliance_results ? JSON.parse(result.rows[0].compliance_results) : {},
        violations: result.rows[0].violations ? JSON.parse(result.rows[0].violations) : [],
        recommendations: result.rows[0].recommendations ? JSON.parse(result.rows[0].recommendations) : []
      };
      
      // Cache check
      this.checks.set(checkId, check);
      
      return check;
    } catch (error) {
      logger.error('Error getting check:', error);
      throw error;
    }
  }

  async processCheck(checkId) {
    try {
      const check = this.checks.get(checkId);
      if (!check) {
        throw new Error('Check not found');
      }
      
      // Update status to processing
      check.status = 'processing';
      check.updated_at = new Date();
      
      await this.updateCheck(check);
      
      // Process compliance rules
      const complianceResults = await this.processComplianceRules(check);
      
      // Check regulations
      const regulationResults = await this.checkRegulations(check);
      
      // Identify violations
      const violations = await this.identifyViolations(check, complianceResults, regulationResults);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(check, violations);
      
      // Update check
      check.status = 'completed';
      check.compliance_results = { ...complianceResults, ...regulationResults };
      check.violations = violations;
      check.recommendations = recommendations;
      check.completed_at = new Date();
      check.updated_at = new Date();
      
      await this.updateCheck(check);
      
      // Emit event
      this.emit('checkCompleted', check);
      
      logger.info(`Compliance check completed: ${checkId}`, {
        violationsCount: violations.length,
        recommendationsCount: recommendations.length
      });
      
    } catch (error) {
      logger.error(`Error processing check ${checkId}:`, error);
      
      // Update check with error
      const check = this.checks.get(checkId);
      if (check) {
        check.status = 'failed';
        check.error = error.message;
        check.updated_at = new Date();
        await this.updateCheck(check);
      }
    }
  }

  async processComplianceRules(check) {
    try {
      const { user_data, risk_assessment, document_verification, identity_verification } = check;
      const results = {};
      
      // Process each compliance rule
      for (const [ruleId, rule] of this.complianceRules) {
        try {
          const ruleResult = await this.evaluateRule(rule, user_data, risk_assessment, document_verification, identity_verification);
          results[ruleId] = ruleResult;
        } catch (error) {
          logger.error(`Error evaluating rule ${ruleId}:`, error);
          results[ruleId] = {
            rule_id: ruleId,
            status: 'error',
            message: error.message,
            details: {}
          };
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error processing compliance rules:', error);
      throw error;
    }
  }

  async evaluateRule(rule, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { conditions, actions, parameters } = rule;
      
      // Evaluate conditions
      const conditionResults = [];
      for (const condition of conditions) {
        const result = await this.evaluateCondition(condition, userData, riskAssessment, documentVerification, identityVerification);
        conditionResults.push(result);
      }
      
      // Determine if all conditions are met
      const allConditionsMet = conditionResults.every(result => result.met);
      
      // Execute actions if conditions are met
      let actionResults = {};
      if (allConditionsMet) {
        actionResults = await this.executeActions(actions, userData, riskAssessment, documentVerification, identityVerification);
      }
      
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        status: allConditionsMet ? 'passed' : 'failed',
        conditions_met: allConditionsMet,
        condition_results: conditionResults,
        action_results: actionResults,
        details: {
          rule_type: rule.type,
          priority: rule.priority,
          parameters
        }
      };
    } catch (error) {
      logger.error('Error evaluating rule:', error);
      return {
        rule_id: rule.id,
        status: 'error',
        message: error.message,
        details: {}
      };
    }
  }

  async evaluateCondition(condition, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { type, field, operator, value, parameters } = condition;
      
      switch (type) {
        case 'user_data':
          return this.evaluateUserDataCondition(condition, userData);
        case 'risk_assessment':
          return this.evaluateRiskAssessmentCondition(condition, riskAssessment);
        case 'document_verification':
          return this.evaluateDocumentVerificationCondition(condition, documentVerification);
        case 'identity_verification':
          return this.evaluateIdentityVerificationCondition(condition, identityVerification);
        case 'combined':
          return this.evaluateCombinedCondition(condition, userData, riskAssessment, documentVerification, identityVerification);
        default:
          return {
            condition_id: condition.id,
            met: false,
            message: 'Unknown condition type'
          };
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  evaluateUserDataCondition(condition, userData) {
    try {
      const { field, operator, value } = condition;
      const userValue = this.getNestedValue(userData, field);
      
      const met = this.compareValues(userValue, operator, value);
      
      return {
        condition_id: condition.id,
        met,
        message: met ? 'User data condition met' : 'User data condition not met',
        details: {
          field,
          user_value: userValue,
          operator,
          expected_value: value
        }
      };
    } catch (error) {
      logger.error('Error evaluating user data condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  evaluateRiskAssessmentCondition(condition, riskAssessment) {
    try {
      const { field, operator, value } = condition;
      const riskValue = this.getNestedValue(riskAssessment, field);
      
      const met = this.compareValues(riskValue, operator, value);
      
      return {
        condition_id: condition.id,
        met,
        message: met ? 'Risk assessment condition met' : 'Risk assessment condition not met',
        details: {
          field,
          risk_value: riskValue,
          operator,
          expected_value: value
        }
      };
    } catch (error) {
      logger.error('Error evaluating risk assessment condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  evaluateDocumentVerificationCondition(condition, documentVerification) {
    try {
      const { field, operator, value } = condition;
      const docValue = this.getNestedValue(documentVerification, field);
      
      const met = this.compareValues(docValue, operator, value);
      
      return {
        condition_id: condition.id,
        met,
        message: met ? 'Document verification condition met' : 'Document verification condition not met',
        details: {
          field,
          doc_value: docValue,
          operator,
          expected_value: value
        }
      };
    } catch (error) {
      logger.error('Error evaluating document verification condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  evaluateIdentityVerificationCondition(condition, identityVerification) {
    try {
      const { field, operator, value } = condition;
      const identityValue = this.getNestedValue(identityVerification, field);
      
      const met = this.compareValues(identityValue, operator, value);
      
      return {
        condition_id: condition.id,
        met,
        message: met ? 'Identity verification condition met' : 'Identity verification condition not met',
        details: {
          field,
          identity_value: identityValue,
          operator,
          expected_value: value
        }
      };
    } catch (error) {
      logger.error('Error evaluating identity verification condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  evaluateCombinedCondition(condition, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { sub_conditions, logic_operator } = condition;
      const subResults = [];
      
      for (const subCondition of sub_conditions) {
        const result = this.evaluateCondition(subCondition, userData, riskAssessment, documentVerification, identityVerification);
        subResults.push(result);
      }
      
      let met;
      if (logic_operator === 'AND') {
        met = subResults.every(result => result.met);
      } else if (logic_operator === 'OR') {
        met = subResults.some(result => result.met);
      } else {
        met = false;
      }
      
      return {
        condition_id: condition.id,
        met,
        message: met ? 'Combined condition met' : 'Combined condition not met',
        details: {
          logic_operator,
          sub_results: subResults
        }
      };
    } catch (error) {
      logger.error('Error evaluating combined condition:', error);
      return {
        condition_id: condition.id,
        met: false,
        message: error.message
      };
    }
  }

  getNestedValue(obj, path) {
    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    } catch (error) {
      logger.error('Error getting nested value:', error);
      return undefined;
    }
  }

  compareValues(actualValue, operator, expectedValue) {
    try {
      if (actualValue === undefined || actualValue === null) {
        return false;
      }
      
      switch (operator) {
        case 'equals':
          return actualValue === expectedValue;
        case 'not_equals':
          return actualValue !== expectedValue;
        case 'greater_than':
          return Number(actualValue) > Number(expectedValue);
        case 'greater_than_or_equal':
          return Number(actualValue) >= Number(expectedValue);
        case 'less_than':
          return Number(actualValue) < Number(expectedValue);
        case 'less_than_or_equal':
          return Number(actualValue) <= Number(expectedValue);
        case 'contains':
          return String(actualValue).includes(String(expectedValue));
        case 'not_contains':
          return !String(actualValue).includes(String(expectedValue));
        case 'in':
          return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
        case 'not_in':
          return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
        case 'regex':
          return new RegExp(expectedValue).test(String(actualValue));
        case 'not_regex':
          return !new RegExp(expectedValue).test(String(actualValue));
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error comparing values:', error);
      return false;
    }
  }

  async executeActions(actions, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const results = {};
      
      for (const [actionType, actionConfig] of Object.entries(actions)) {
        try {
          const result = await this.executeAction(actionType, actionConfig, userData, riskAssessment, documentVerification, identityVerification);
          results[actionType] = result;
        } catch (error) {
          logger.error(`Error executing action ${actionType}:`, error);
          results[actionType] = {
            status: 'error',
            message: error.message
          };
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error executing actions:', error);
      throw error;
    }
  }

  async executeAction(actionType, actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      switch (actionType) {
        case 'log_violation':
          return await this.logViolation(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        case 'send_alert':
          return await this.sendAlert(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        case 'block_user':
          return await this.blockUser(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        case 'require_additional_verification':
          return await this.requireAdditionalVerification(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        case 'update_risk_score':
          return await this.updateRiskScore(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        case 'create_recommendation':
          return await this.createRecommendation(actionConfig, userData, riskAssessment, documentVerification, identityVerification);
        default:
          return {
            status: 'skipped',
            message: 'Unknown action type'
          };
      }
    } catch (error) {
      logger.error('Error executing action:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async logViolation(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const violation = {
        id: nanoid(),
        type: actionConfig.violation_type || 'compliance_violation',
        severity: actionConfig.severity || 'medium',
        description: actionConfig.description || 'Compliance violation detected',
        user_id: userData.id,
        rule_id: actionConfig.rule_id,
        details: {
          user_data: userData,
          risk_assessment: riskAssessment,
          document_verification: documentVerification,
          identity_verification: identityVerification
        },
        created_at: new Date()
      };
      
      // Store violation
      await this.storeViolation(violation);
      
      return {
        status: 'success',
        violation_id: violation.id,
        message: 'Violation logged successfully'
      };
    } catch (error) {
      logger.error('Error logging violation:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async sendAlert(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      // Simulate sending alert
      const alert = {
        id: nanoid(),
        type: actionConfig.alert_type || 'compliance_alert',
        severity: actionConfig.severity || 'medium',
        message: actionConfig.message || 'Compliance alert triggered',
        user_id: userData.id,
        created_at: new Date()
      };
      
      // In a real implementation, this would send the alert to the appropriate system
      logger.info('Alert sent:', alert);
      
      return {
        status: 'success',
        alert_id: alert.id,
        message: 'Alert sent successfully'
      };
    } catch (error) {
      logger.error('Error sending alert:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async blockUser(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      // Simulate blocking user
      const block = {
        id: nanoid(),
        user_id: userData.id,
        reason: actionConfig.reason || 'Compliance violation',
        blocked_at: new Date(),
        created_by: 'compliance_system'
      };
      
      // In a real implementation, this would block the user in the system
      logger.info('User blocked:', block);
      
      return {
        status: 'success',
        block_id: block.id,
        message: 'User blocked successfully'
      };
    } catch (error) {
      logger.error('Error blocking user:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async requireAdditionalVerification(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      // Simulate requiring additional verification
      const requirement = {
        id: nanoid(),
        user_id: userData.id,
        verification_type: actionConfig.verification_type || 'additional_document',
        reason: actionConfig.reason || 'Compliance requirement',
        required_at: new Date(),
        created_by: 'compliance_system'
      };
      
      // In a real implementation, this would create a verification requirement
      logger.info('Additional verification required:', requirement);
      
      return {
        status: 'success',
        requirement_id: requirement.id,
        message: 'Additional verification required successfully'
      };
    } catch (error) {
      logger.error('Error requiring additional verification:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async updateRiskScore(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      // Simulate updating risk score
      const riskUpdate = {
        id: nanoid(),
        user_id: userData.id,
        adjustment: actionConfig.adjustment || 0.1,
        reason: actionConfig.reason || 'Compliance adjustment',
        updated_at: new Date(),
        created_by: 'compliance_system'
      };
      
      // In a real implementation, this would update the risk score
      logger.info('Risk score updated:', riskUpdate);
      
      return {
        status: 'success',
        update_id: riskUpdate.id,
        message: 'Risk score updated successfully'
      };
    } catch (error) {
      logger.error('Error updating risk score:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async createRecommendation(actionConfig, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      // Simulate creating recommendation
      const recommendation = {
        id: nanoid(),
        user_id: userData.id,
        type: actionConfig.recommendation_type || 'compliance_improvement',
        priority: actionConfig.priority || 'medium',
        description: actionConfig.description || 'Compliance improvement recommended',
        created_at: new Date(),
        created_by: 'compliance_system'
      };
      
      // In a real implementation, this would create a recommendation
      logger.info('Recommendation created:', recommendation);
      
      return {
        status: 'success',
        recommendation_id: recommendation.id,
        message: 'Recommendation created successfully'
      };
    } catch (error) {
      logger.error('Error creating recommendation:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async checkRegulations(check) {
    try {
      const { user_data, risk_assessment, document_verification, identity_verification } = check;
      const results = {};
      
      // Check each regulation
      for (const [regulationId, regulation] of this.regulations) {
        try {
          const regulationResult = await this.checkRegulation(regulation, user_data, risk_assessment, document_verification, identity_verification);
          results[regulationId] = regulationResult;
        } catch (error) {
          logger.error(`Error checking regulation ${regulationId}:`, error);
          results[regulationId] = {
            regulation_id: regulationId,
            status: 'error',
            message: error.message,
            details: {}
          };
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error checking regulations:', error);
      throw error;
    }
  }

  async checkRegulation(regulation, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { requirements, penalties } = regulation;
      const requirementResults = {};
      let allRequirementsMet = true;
      
      // Check each requirement
      for (const [requirementName, requirement] of Object.entries(requirements)) {
        const result = await this.checkRequirement(requirement, userData, riskAssessment, documentVerification, identityVerification);
        requirementResults[requirementName] = result;
        
        if (!result.met) {
          allRequirementsMet = false;
        }
      }
      
      return {
        regulation_id: regulation.id,
        regulation_name: regulation.name,
        status: allRequirementsMet ? 'compliant' : 'non_compliant',
        requirements_met: allRequirementsMet,
        requirement_results: requirementResults,
        penalties: allRequirementsMet ? [] : penalties,
        details: {
          regulation_type: regulation.type,
          jurisdiction: regulation.jurisdiction,
          effective_date: regulation.effective_date
        }
      };
    } catch (error) {
      logger.error('Error checking regulation:', error);
      return {
        regulation_id: regulation.id,
        status: 'error',
        message: error.message,
        details: {}
      };
    }
  }

  async checkRequirement(requirement, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { type, field, operator, value, parameters } = requirement;
      
      let actualValue;
      switch (type) {
        case 'user_data':
          actualValue = this.getNestedValue(userData, field);
          break;
        case 'risk_assessment':
          actualValue = this.getNestedValue(riskAssessment, field);
          break;
        case 'document_verification':
          actualValue = this.getNestedValue(documentVerification, field);
          break;
        case 'identity_verification':
          actualValue = this.getNestedValue(identityVerification, field);
          break;
        default:
          actualValue = undefined;
      }
      
      const met = this.compareValues(actualValue, operator, value);
      
      return {
        requirement_name: requirement.name,
        met,
        message: met ? 'Requirement met' : 'Requirement not met',
        details: {
          type,
          field,
          actual_value: actualValue,
          operator,
          expected_value: value,
          parameters
        }
      };
    } catch (error) {
      logger.error('Error checking requirement:', error);
      return {
        requirement_name: requirement.name,
        met: false,
        message: error.message
      };
    }
  }

  async identifyViolations(check, complianceResults, regulationResults) {
    try {
      const violations = [];
      
      // Check compliance rule violations
      for (const [ruleId, result] of Object.entries(complianceResults)) {
        if (result.status === 'failed') {
          violations.push({
            id: nanoid(),
            type: 'compliance_rule_violation',
            rule_id: ruleId,
            rule_name: result.rule_name,
            severity: 'medium',
            description: `Compliance rule violation: ${result.rule_name}`,
            details: result,
            created_at: new Date()
          });
        }
      }
      
      // Check regulation violations
      for (const [regulationId, result] of Object.entries(regulationResults)) {
        if (result.status === 'non_compliant') {
          violations.push({
            id: nanoid(),
            type: 'regulation_violation',
            regulation_id: regulationId,
            regulation_name: result.regulation_name,
            severity: 'high',
            description: `Regulation violation: ${result.regulation_name}`,
            details: result,
            created_at: new Date()
          });
        }
      }
      
      return violations;
    } catch (error) {
      logger.error('Error identifying violations:', error);
      return [];
    }
  }

  async generateRecommendations(check, violations) {
    try {
      const recommendations = [];
      
      // Generate recommendations based on violations
      for (const violation of violations) {
        if (violation.type === 'compliance_rule_violation') {
          recommendations.push({
            id: nanoid(),
            type: 'compliance_improvement',
            priority: 'medium',
            description: `Address compliance rule violation: ${violation.rule_name}`,
            actions: [
              `Review and update data to meet ${violation.rule_name} requirements`,
              `Consider additional verification for ${violation.rule_name}`
            ],
            violation_id: violation.id,
            created_at: new Date()
          });
        } else if (violation.type === 'regulation_violation') {
          recommendations.push({
            id: nanoid(),
            type: 'regulatory_compliance',
            priority: 'high',
            description: `Address regulation violation: ${violation.regulation_name}`,
            actions: [
              `Immediately review and update data to meet ${violation.regulation_name} requirements`,
              `Consider legal consultation for ${violation.regulation_name}`,
              `Implement additional controls for ${violation.regulation_name}`
            ],
            violation_id: violation.id,
            created_at: new Date()
          });
        }
      }
      
      // Generate general recommendations
      if (violations.length === 0) {
        recommendations.push({
          id: nanoid(),
          type: 'compliance_maintenance',
          priority: 'low',
          description: 'Maintain current compliance status',
          actions: [
            'Continue monitoring compliance status',
            'Regularly review and update compliance procedures'
          ],
          created_at: new Date()
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  async storeCheck(check) {
    try {
      await pool.query(`
        INSERT INTO compliance_checks (
          id, user_id, user_data, risk_assessment, document_verification,
          identity_verification, status, compliance_results, violations,
          recommendations, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        check.id,
        check.user_id,
        JSON.stringify(check.user_data),
        JSON.stringify(check.risk_assessment),
        JSON.stringify(check.document_verification),
        JSON.stringify(check.identity_verification),
        check.status,
        JSON.stringify(check.compliance_results),
        JSON.stringify(check.violations),
        JSON.stringify(check.recommendations),
        check.created_by,
        check.created_at,
        check.updated_at,
        check.completed_at
      ]);
    } catch (error) {
      logger.error('Error storing check:', error);
      throw error;
    }
  }

  async updateCheck(check) {
    try {
      await pool.query(`
        UPDATE compliance_checks
        SET status = $1, compliance_results = $2, violations = $3,
            recommendations = $4, updated_at = $5, completed_at = $6
        WHERE id = $7
      `, [
        check.status,
        JSON.stringify(check.compliance_results),
        JSON.stringify(check.violations),
        JSON.stringify(check.recommendations),
        check.updated_at,
        check.completed_at,
        check.id
      ]);
    } catch (error) {
      logger.error('Error updating check:', error);
      throw error;
    }
  }

  async storeViolation(violation) {
    try {
      await pool.query(`
        INSERT INTO compliance_violations (
          id, type, severity, description, user_id, rule_id, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        violation.id,
        violation.type,
        violation.severity,
        violation.description,
        violation.user_id,
        violation.rule_id,
        JSON.stringify(violation.details),
        violation.created_at
      ]);
    } catch (error) {
      logger.error('Error storing violation:', error);
      throw error;
    }
  }

  async processPendingChecks() {
    try {
      const result = await pool.query(`
        SELECT * FROM compliance_checks
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      for (const check of result.rows) {
        const checkObj = {
          ...check,
          user_data: check.user_data ? JSON.parse(check.user_data) : {},
          risk_assessment: check.risk_assessment ? JSON.parse(check.risk_assessment) : {},
          document_verification: check.document_verification ? JSON.parse(check.document_verification) : {},
          identity_verification: check.identity_verification ? JSON.parse(check.identity_verification) : {},
          compliance_results: check.compliance_results ? JSON.parse(check.compliance_results) : {},
          violations: check.violations ? JSON.parse(check.violations) : [],
          recommendations: check.recommendations ? JSON.parse(check.recommendations) : []
        };
        
        this.checks.set(check.id, checkObj);
        await this.processCheck(check.id);
      }
      
      logger.info(`Processed ${result.rows.length} pending checks`);
    } catch (error) {
      logger.error('Error processing pending checks:', error);
    }
  }

  async getCheckStats() {
    try {
      const stats = {
        total_checks: this.checks.size,
        pending_checks: Array.from(this.checks.values()).filter(c => c.status === 'pending').length,
        processing_checks: Array.from(this.checks.values()).filter(c => c.status === 'processing').length,
        completed_checks: Array.from(this.checks.values()).filter(c => c.status === 'completed').length,
        failed_checks: Array.from(this.checks.values()).filter(c => c.status === 'failed').length,
        total_violations: Array.from(this.checks.values()).reduce((sum, c) => sum + c.violations.length, 0),
        total_recommendations: Array.from(this.checks.values()).reduce((sum, c) => sum + c.recommendations.length, 0),
        total_compliance_rules: this.complianceRules.size,
        total_regulations: this.regulations.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting check stats:', error);
      throw error;
    }
  }
}

module.exports = ComplianceChecker;
