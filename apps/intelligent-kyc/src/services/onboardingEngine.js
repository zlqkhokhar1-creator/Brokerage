const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class OnboardingEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.onboardings = new Map();
    this.onboardingFlows = new Map();
    this.stepTemplates = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load onboarding flows
      await this.loadOnboardingFlows();
      
      // Load step templates
      await this.loadStepTemplates();
      
      this._initialized = true;
      logger.info('OnboardingEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OnboardingEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('OnboardingEngine closed');
    } catch (error) {
      logger.error('Error closing OnboardingEngine:', error);
    }
  }

  async loadOnboardingFlows() {
    try {
      const result = await pool.query(`
        SELECT * FROM onboarding_flows
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const flow of result.rows) {
        this.onboardingFlows.set(flow.id, {
          ...flow,
          steps: flow.steps ? JSON.parse(flow.steps) : [],
          configuration: flow.configuration ? JSON.parse(flow.configuration) : {},
          metadata: flow.metadata ? JSON.parse(flow.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} onboarding flows`);
    } catch (error) {
      logger.error('Error loading onboarding flows:', error);
      throw error;
    }
  }

  async loadStepTemplates() {
    try {
      const result = await pool.query(`
        SELECT * FROM step_templates
        WHERE is_active = true
        ORDER BY order_index ASC
      `);
      
      for (const template of result.rows) {
        this.stepTemplates.set(template.id, {
          ...template,
          configuration: template.configuration ? JSON.parse(template.configuration) : {},
          validation_rules: template.validation_rules ? JSON.parse(template.validation_rules) : {},
          metadata: template.metadata ? JSON.parse(template.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} step templates`);
    } catch (error) {
      logger.error('Error loading step templates:', error);
      throw error;
    }
  }

  async startOnboarding(userId, userType, preferences) {
    try {
      const onboardingId = nanoid();
      const now = new Date();
      
      // Select appropriate onboarding flow
      const flow = this.selectOnboardingFlow(userType, preferences);
      if (!flow) {
        throw new Error(`No onboarding flow found for user type: ${userType}`);
      }
      
      // Create onboarding session
      const onboarding = {
        id: onboardingId,
        user_id: userId,
        user_type: userType,
        flow_id: flow.id,
        status: 'active',
        current_step: 0,
        completed_steps: [],
        step_data: {},
        preferences: preferences || {},
        progress: 0,
        started_at: now,
        updated_at: now,
        completed_at: null
      };
      
      // Store onboarding
      await this.storeOnboarding(onboarding);
      
      // Cache onboarding
      this.onboardings.set(onboardingId, onboarding);
      
      // Emit event
      this.emit('onboardingStarted', onboarding);
      
      logger.info(`Onboarding started: ${onboardingId}`, {
        userId,
        userType,
        flowId: flow.id
      });
      
      return onboarding;
    } catch (error) {
      logger.error('Error starting onboarding:', error);
      throw error;
    }
  }

  async getOnboarding(onboardingId, userId) {
    try {
      // Check cache first
      if (this.onboardings.has(onboardingId)) {
        return this.onboardings.get(onboardingId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM onboardings
        WHERE id = $1 AND user_id = $2
      `, [onboardingId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Onboarding not found');
      }
      
      const onboarding = {
        ...result.rows[0],
        completed_steps: result.rows[0].completed_steps ? JSON.parse(result.rows[0].completed_steps) : [],
        step_data: result.rows[0].step_data ? JSON.parse(result.rows[0].step_data) : {},
        preferences: result.rows[0].preferences ? JSON.parse(result.rows[0].preferences) : {}
      };
      
      // Cache onboarding
      this.onboardings.set(onboardingId, onboarding);
      
      return onboarding;
    } catch (error) {
      logger.error('Error getting onboarding:', error);
      throw error;
    }
  }

  async completeStep(onboardingId, stepId, data, response, userId) {
    try {
      const onboarding = await this.getOnboarding(onboardingId, userId);
      if (!onboarding) {
        throw new Error('Onboarding not found');
      }
      
      if (onboarding.status !== 'active') {
        throw new Error('Onboarding is not active');
      }
      
      // Get step template
      const stepTemplate = this.stepTemplates.get(stepId);
      if (!stepTemplate) {
        throw new Error('Step template not found');
      }
      
      // Validate step data
      this.validateStepData(stepTemplate, data);
      
      // Process step
      const stepResult = await this.processStep(onboarding, stepTemplate, data, response);
      
      // Update onboarding
      const updatedOnboarding = {
        ...onboarding,
        current_step: onboarding.current_step + 1,
        completed_steps: [...onboarding.completed_steps, stepId],
        step_data: {
          ...onboarding.step_data,
          [stepId]: {
            data,
            response,
            result: stepResult,
            completed_at: new Date()
          }
        },
        progress: this.calculateProgress(onboarding, stepId),
        updated_at: new Date()
      };
      
      // Check if onboarding is complete
      if (this.isOnboardingComplete(updatedOnboarding)) {
        updatedOnboarding.status = 'completed';
        updatedOnboarding.completed_at = new Date();
        
        // Emit completion event
        this.emit('onboardingCompleted', updatedOnboarding);
      }
      
      // Update database
      await this.updateOnboarding(updatedOnboarding);
      
      // Update cache
      this.onboardings.set(onboardingId, updatedOnboarding);
      
      // Emit event
      this.emit('stepCompleted', {
        onboardingId,
        stepId,
        result: stepResult
      });
      
      logger.info(`Step completed: ${stepId}`, {
        onboardingId,
        stepId,
        progress: updatedOnboarding.progress
      });
      
      return {
        onboarding: updatedOnboarding,
        stepResult,
        nextStep: this.getNextStep(updatedOnboarding)
      };
    } catch (error) {
      logger.error('Error completing step:', error);
      throw error;
    }
  }

  selectOnboardingFlow(userType, preferences) {
    try {
      // Find flow based on user type and preferences
      for (const flow of this.onboardingFlows.values()) {
        if (flow.user_types.includes(userType)) {
          // Check if flow matches preferences
          if (this.matchesPreferences(flow, preferences)) {
            return flow;
          }
        }
      }
      
      // Fallback to default flow
      for (const flow of this.onboardingFlows.values()) {
        if (flow.is_default) {
          return flow;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error selecting onboarding flow:', error);
      return null;
    }
  }

  matchesPreferences(flow, preferences) {
    try {
      if (!preferences || Object.keys(preferences).length === 0) {
        return true;
      }
      
      const flowPreferences = flow.preferences || {};
      
      for (const [key, value] of Object.entries(preferences)) {
        if (flowPreferences[key] && flowPreferences[key] !== value) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error matching preferences:', error);
      return false;
    }
  }

  validateStepData(stepTemplate, data) {
    try {
      const { validation_rules } = stepTemplate;
      
      if (!validation_rules || Object.keys(validation_rules).length === 0) {
        return;
      }
      
      for (const [field, rules] of Object.entries(validation_rules)) {
        const value = data[field];
        
        if (rules.required && (!value || value === '')) {
          throw new Error(`Field ${field} is required`);
        }
        
        if (value && rules.type) {
          this.validateFieldType(field, value, rules.type);
        }
        
        if (value && rules.min_length && value.length < rules.min_length) {
          throw new Error(`Field ${field} must be at least ${rules.min_length} characters long`);
        }
        
        if (value && rules.max_length && value.length > rules.max_length) {
          throw new Error(`Field ${field} must be no more than ${rules.max_length} characters long`);
        }
        
        if (value && rules.pattern && !new RegExp(rules.pattern).test(value)) {
          throw new Error(`Field ${field} does not match required pattern`);
        }
      }
    } catch (error) {
      logger.error('Error validating step data:', error);
      throw error;
    }
  }

  validateFieldType(field, value, type) {
    try {
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new Error(`Field ${field} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(`Field ${field} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Field ${field} must be a boolean`);
          }
          break;
        case 'email':
          if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error(`Field ${field} must be a valid email`);
          }
          break;
        case 'phone':
          if (typeof value !== 'string' || !/^\+?[1-9]\d{1,14}$/.test(value)) {
            throw new Error(`Field ${field} must be a valid phone number`);
          }
          break;
        case 'date':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            throw new Error(`Field ${field} must be a valid date`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            throw new Error(`Field ${field} must be an array`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`Field ${field} must be an object`);
          }
          break;
      }
    } catch (error) {
      logger.error('Error validating field type:', error);
      throw error;
    }
  }

  async processStep(onboarding, stepTemplate, data, response) {
    try {
      const { type, configuration } = stepTemplate;
      
      let result = {
        status: 'completed',
        data: {},
        metadata: {}
      };
      
      switch (type) {
        case 'personal_info':
          result = await this.processPersonalInfoStep(data, configuration);
          break;
        case 'document_upload':
          result = await this.processDocumentUploadStep(data, configuration);
          break;
        case 'identity_verification':
          result = await this.processIdentityVerificationStep(data, configuration);
          break;
        case 'risk_assessment':
          result = await this.processRiskAssessmentStep(data, configuration);
          break;
        case 'compliance_check':
          result = await this.processComplianceCheckStep(data, configuration);
          break;
        case 'tier_assignment':
          result = await this.processTierAssignmentStep(data, configuration);
          break;
        case 'final_review':
          result = await this.processFinalReviewStep(data, configuration);
          break;
        default:
          result = await this.processGenericStep(data, configuration);
      }
      
      return result;
    } catch (error) {
      logger.error('Error processing step:', error);
      return {
        status: 'failed',
        error: error.message,
        data: {}
      };
    }
  }

  async processPersonalInfoStep(data, configuration) {
    try {
      // Process personal information
      const result = {
        status: 'completed',
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          address: data.address
        },
        metadata: {
          processed_at: new Date(),
          validation_passed: true
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing personal info step:', error);
      throw error;
    }
  }

  async processDocumentUploadStep(data, configuration) {
    try {
      // Process document upload
      const result = {
        status: 'completed',
        data: {
          document_type: data.document_type,
          document_url: data.document_url,
          document_hash: data.document_hash,
          uploaded_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          file_size: data.file_size,
          file_type: data.file_type
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing document upload step:', error);
      throw error;
    }
  }

  async processIdentityVerificationStep(data, configuration) {
    try {
      // Process identity verification
      const result = {
        status: 'completed',
        data: {
          verification_type: data.verification_type,
          verification_data: data.verification_data,
          verified_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          verification_method: data.verification_method
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing identity verification step:', error);
      throw error;
    }
  }

  async processRiskAssessmentStep(data, configuration) {
    try {
      // Process risk assessment
      const result = {
        status: 'completed',
        data: {
          risk_factors: data.risk_factors,
          risk_score: data.risk_score,
          risk_level: data.risk_level,
          assessed_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          assessment_method: data.assessment_method
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing risk assessment step:', error);
      throw error;
    }
  }

  async processComplianceCheckStep(data, configuration) {
    try {
      // Process compliance check
      const result = {
        status: 'completed',
        data: {
          compliance_checks: data.compliance_checks,
          compliance_status: data.compliance_status,
          checked_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          check_method: data.check_method
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing compliance check step:', error);
      throw error;
    }
  }

  async processTierAssignmentStep(data, configuration) {
    try {
      // Process tier assignment
      const result = {
        status: 'completed',
        data: {
          tier: data.tier,
          tier_criteria: data.tier_criteria,
          assigned_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          assignment_method: data.assignment_method
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing tier assignment step:', error);
      throw error;
    }
  }

  async processFinalReviewStep(data, configuration) {
    try {
      // Process final review
      const result = {
        status: 'completed',
        data: {
          review_data: data.review_data,
          approval_status: data.approval_status,
          reviewed_at: new Date()
        },
        metadata: {
          processed_at: new Date(),
          review_method: data.review_method
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing final review step:', error);
      throw error;
    }
  }

  async processGenericStep(data, configuration) {
    try {
      // Process generic step
      const result = {
        status: 'completed',
        data: data,
        metadata: {
          processed_at: new Date(),
          step_type: 'generic'
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing generic step:', error);
      throw error;
    }
  }

  calculateProgress(onboarding, stepId) {
    try {
      const flow = this.onboardingFlows.get(onboarding.flow_id);
      if (!flow) {
        return 0;
      }
      
      const totalSteps = flow.steps.length;
      const completedSteps = onboarding.completed_steps.length + 1; // +1 for current step
      
      return Math.round((completedSteps / totalSteps) * 100);
    } catch (error) {
      logger.error('Error calculating progress:', error);
      return 0;
    }
  }

  isOnboardingComplete(onboarding) {
    try {
      const flow = this.onboardingFlows.get(onboarding.flow_id);
      if (!flow) {
        return false;
      }
      
      return onboarding.completed_steps.length >= flow.steps.length;
    } catch (error) {
      logger.error('Error checking onboarding completion:', error);
      return false;
    }
  }

  getNextStep(onboarding) {
    try {
      const flow = this.onboardingFlows.get(onboarding.flow_id);
      if (!flow) {
        return null;
      }
      
      const nextStepIndex = onboarding.current_step;
      if (nextStepIndex >= flow.steps.length) {
        return null;
      }
      
      const stepId = flow.steps[nextStepIndex];
      const stepTemplate = this.stepTemplates.get(stepId);
      
      return stepTemplate ? {
        id: stepId,
        type: stepTemplate.type,
        title: stepTemplate.title,
        description: stepTemplate.description,
        configuration: stepTemplate.configuration
      } : null;
    } catch (error) {
      logger.error('Error getting next step:', error);
      return null;
    }
  }

  async storeOnboarding(onboarding) {
    try {
      await pool.query(`
        INSERT INTO onboardings (
          id, user_id, user_type, flow_id, status, current_step,
          completed_steps, step_data, preferences, progress,
          started_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        onboarding.id,
        onboarding.user_id,
        onboarding.user_type,
        onboarding.flow_id,
        onboarding.status,
        onboarding.current_step,
        JSON.stringify(onboarding.completed_steps),
        JSON.stringify(onboarding.step_data),
        JSON.stringify(onboarding.preferences),
        onboarding.progress,
        onboarding.started_at,
        onboarding.updated_at,
        onboarding.completed_at
      ]);
    } catch (error) {
      logger.error('Error storing onboarding:', error);
      throw error;
    }
  }

  async updateOnboarding(onboarding) {
    try {
      await pool.query(`
        UPDATE onboardings
        SET status = $1, current_step = $2, completed_steps = $3,
            step_data = $4, progress = $5, updated_at = $6, completed_at = $7
        WHERE id = $8
      `, [
        onboarding.status,
        onboarding.current_step,
        JSON.stringify(onboarding.completed_steps),
        JSON.stringify(onboarding.step_data),
        onboarding.progress,
        onboarding.updated_at,
        onboarding.completed_at,
        onboarding.id
      ]);
    } catch (error) {
      logger.error('Error updating onboarding:', error);
      throw error;
    }
  }

  async getOnboardingStats() {
    try {
      const stats = {
        total_onboardings: this.onboardings.size,
        active_onboardings: Array.from(this.onboardings.values()).filter(o => o.status === 'active').length,
        completed_onboardings: Array.from(this.onboardings.values()).filter(o => o.status === 'completed').length,
        total_flows: this.onboardingFlows.size,
        total_step_templates: this.stepTemplates.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting onboarding stats:', error);
      throw error;
    }
  }
}

module.exports = OnboardingEngine;
