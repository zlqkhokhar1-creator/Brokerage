const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.trackers = new Map();
    this.workflows = new Map();
    this.milestones = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load workflows
      await this.loadWorkflows();
      
      // Load milestones
      await this.loadMilestones();
      
      this._initialized = true;
      logger.info('ProgressTracker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ProgressTracker:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ProgressTracker closed');
    } catch (error) {
      logger.error('Error closing ProgressTracker:', error);
    }
  }

  async loadWorkflows() {
    try {
      const result = await pool.query(`
        SELECT * FROM kyc_workflows
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const workflow of result.rows) {
        this.workflows.set(workflow.id, {
          ...workflow,
          steps: workflow.steps ? JSON.parse(workflow.steps) : [],
          conditions: workflow.conditions ? JSON.parse(workflow.conditions) : {},
          metadata: workflow.metadata ? JSON.parse(workflow.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} KYC workflows`);
    } catch (error) {
      logger.error('Error loading workflows:', error);
      throw error;
    }
  }

  async loadMilestones() {
    try {
      const result = await pool.query(`
        SELECT * FROM kyc_milestones
        WHERE is_active = true
        ORDER BY order_index ASC
      `);
      
      for (const milestone of result.rows) {
        this.milestones.set(milestone.id, {
          ...milestone,
          requirements: milestone.requirements ? JSON.parse(milestone.requirements) : {},
          actions: milestone.actions ? JSON.parse(milestone.actions) : {},
          metadata: milestone.metadata ? JSON.parse(milestone.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} KYC milestones`);
    } catch (error) {
      logger.error('Error loading milestones:', error);
      throw error;
    }
  }

  async startTracking(userId, workflowId, userData, trackerId) {
    try {
      const trackerId = nanoid();
      const now = new Date();
      
      // Validate workflow
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Unknown workflow: ${workflowId}`);
      }
      
      // Create tracker record
      const tracker = {
        id: trackerId,
        user_id: userId,
        workflow_id: workflowId,
        user_data: userData,
        status: 'active',
        current_step: 0,
        completed_steps: [],
        milestones: [],
        progress_percentage: 0,
        estimated_completion: null,
        started_at: now,
        updated_at: now,
        completed_at: null,
        created_by: trackerId
      };
      
      // Store tracker
      await this.storeTracker(tracker);
      
      // Cache tracker
      this.trackers.set(trackerId, tracker);
      
      // Start workflow
      this.startWorkflow(trackerId);
      
      logger.info(`Progress tracking started: ${trackerId}`, {
        userId,
        workflowId,
        workflowName: workflow.name
      });
      
      return tracker;
    } catch (error) {
      logger.error('Error starting tracking:', error);
      throw error;
    }
  }

  async getTracker(trackerId, userId) {
    try {
      // Check cache first
      if (this.trackers.has(trackerId)) {
        return this.trackers.get(trackerId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM progress_trackers
        WHERE id = $1 AND user_id = $2
      `, [trackerId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Tracker not found');
      }
      
      const tracker = {
        ...result.rows[0],
        user_data: result.rows[0].user_data ? JSON.parse(result.rows[0].user_data) : {},
        completed_steps: result.rows[0].completed_steps ? JSON.parse(result.rows[0].completed_steps) : [],
        milestones: result.rows[0].milestones ? JSON.parse(result.rows[0].milestones) : []
      };
      
      // Cache tracker
      this.trackers.set(trackerId, tracker);
      
      return tracker;
    } catch (error) {
      logger.error('Error getting tracker:', error);
      throw error;
    }
  }

  async startWorkflow(trackerId) {
    try {
      const tracker = this.trackers.get(trackerId);
      if (!tracker) {
        throw new Error('Tracker not found');
      }
      
      const workflow = this.workflows.get(tracker.workflow_id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      // Process first step
      await this.processStep(trackerId, 0);
      
    } catch (error) {
      logger.error(`Error starting workflow ${trackerId}:`, error);
      
      // Update tracker with error
      const tracker = this.trackers.get(trackerId);
      if (tracker) {
        tracker.status = 'failed';
        tracker.error = error.message;
        tracker.updated_at = new Date();
        await this.updateTracker(tracker);
      }
    }
  }

  async processStep(trackerId, stepIndex) {
    try {
      const tracker = this.trackers.get(trackerId);
      if (!tracker) {
        throw new Error('Tracker not found');
      }
      
      const workflow = this.workflows.get(tracker.workflow_id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      const step = workflow.steps[stepIndex];
      if (!step) {
        // Workflow completed
        tracker.status = 'completed';
        tracker.progress_percentage = 100;
        tracker.completed_at = new Date();
        tracker.updated_at = new Date();
        
        await this.updateTracker(tracker);
        
        // Emit completion event
        this.emit('workflowCompleted', tracker);
        
        logger.info(`Workflow completed: ${trackerId}`);
        return;
      }
      
      // Update current step
      tracker.current_step = stepIndex;
      tracker.updated_at = new Date();
      
      // Process step
      const stepResult = await this.executeStep(step, tracker);
      
      if (stepResult.success) {
        // Mark step as completed
        tracker.completed_steps.push({
          step_index: stepIndex,
          step_name: step.name,
          completed_at: new Date(),
          result: stepResult
        });
        
        // Update progress
        tracker.progress_percentage = Math.round((tracker.completed_steps.length / workflow.steps.length) * 100);
        
        // Check for milestones
        await this.checkMilestones(tracker);
        
        // Process next step
        await this.processStep(trackerId, stepIndex + 1);
      } else {
        // Step failed
        tracker.status = 'failed';
        tracker.error = stepResult.error;
        tracker.updated_at = new Date();
        
        await this.updateTracker(tracker);
        
        // Emit failure event
        this.emit('workflowFailed', tracker);
        
        logger.error(`Workflow failed at step ${stepIndex}: ${stepResult.error}`);
      }
      
    } catch (error) {
      logger.error(`Error processing step ${stepIndex} for tracker ${trackerId}:`, error);
      
      // Update tracker with error
      const tracker = this.trackers.get(trackerId);
      if (tracker) {
        tracker.status = 'failed';
        tracker.error = error.message;
        tracker.updated_at = new Date();
        await this.updateTracker(tracker);
      }
    }
  }

  async executeStep(step, tracker) {
    try {
      const { type, name, config, conditions } = step;
      
      // Check conditions
      if (conditions && !this.checkConditions(conditions, tracker)) {
        return {
          success: false,
          error: 'Step conditions not met',
          details: { conditions }
        };
      }
      
      // Execute step based on type
      let result;
      switch (type) {
        case 'document_verification':
          result = await this.executeDocumentVerificationStep(step, tracker);
          break;
        case 'identity_verification':
          result = await this.executeIdentityVerificationStep(step, tracker);
          break;
        case 'risk_assessment':
          result = await this.executeRiskAssessmentStep(step, tracker);
          break;
        case 'compliance_check':
          result = await this.executeComplianceCheckStep(step, tracker);
          break;
        case 'tier_assignment':
          result = await this.executeTierAssignmentStep(step, tracker);
          break;
        case 'approval':
          result = await this.executeApprovalStep(step, tracker);
          break;
        case 'notification':
          result = await this.executeNotificationStep(step, tracker);
          break;
        case 'data_collection':
          result = await this.executeDataCollectionStep(step, tracker);
          break;
        case 'validation':
          result = await this.executeValidationStep(step, tracker);
          break;
        case 'external_check':
          result = await this.executeExternalCheckStep(step, tracker);
          break;
        default:
          result = {
            success: false,
            error: `Unknown step type: ${type}`,
            details: { step_type: type }
          };
      }
      
      return result;
    } catch (error) {
      logger.error('Error executing step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeDocumentVerificationStep(step, tracker) {
    try {
      const { config } = step;
      const { document_types, verification_methods } = config;
      
      // Simulate document verification
      const result = {
        success: true,
        document_types: document_types || [],
        verification_methods: verification_methods || [],
        verified_documents: [],
        verification_status: 'completed',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing document verification step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeIdentityVerificationStep(step, tracker) {
    try {
      const { config } = step;
      const { verification_methods, identity_providers } = config;
      
      // Simulate identity verification
      const result = {
        success: true,
        verification_methods: verification_methods || [],
        identity_providers: identity_providers || [],
        verification_status: 'completed',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing identity verification step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeRiskAssessmentStep(step, tracker) {
    try {
      const { config } = step;
      const { risk_factors, assessment_methods } = config;
      
      // Simulate risk assessment
      const result = {
        success: true,
        risk_factors: risk_factors || [],
        assessment_methods: assessment_methods || [],
        risk_score: Math.random() * 0.4 + 0.3, // 30-70%
        risk_level: 'medium',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing risk assessment step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeComplianceCheckStep(step, tracker) {
    try {
      const { config } = step;
      const { compliance_rules, regulations } = config;
      
      // Simulate compliance check
      const result = {
        success: true,
        compliance_rules: compliance_rules || [],
        regulations: regulations || [],
        compliance_status: 'compliant',
        violations: [],
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing compliance check step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeTierAssignmentStep(step, tracker) {
    try {
      const { config } = step;
      const { tier_criteria, assignment_rules } = config;
      
      // Simulate tier assignment
      const result = {
        success: true,
        tier_criteria: tier_criteria || [],
        assignment_rules: assignment_rules || [],
        assigned_tier: 'standard',
        assignment_reason: 'Standard tier criteria met',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing tier assignment step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeApprovalStep(step, tracker) {
    try {
      const { config } = step;
      const { approval_criteria, approvers } = config;
      
      // Simulate approval
      const result = {
        success: true,
        approval_criteria: approval_criteria || [],
        approvers: approvers || [],
        approval_status: 'approved',
        approved_by: 'system',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing approval step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeNotificationStep(step, tracker) {
    try {
      const { config } = step;
      const { notification_channels, message_template } = config;
      
      // Simulate notification
      const result = {
        success: true,
        notification_channels: notification_channels || [],
        message_template: message_template || '',
        notification_sent: true,
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing notification step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeDataCollectionStep(step, tracker) {
    try {
      const { config } = step;
      const { data_fields, validation_rules } = config;
      
      // Simulate data collection
      const result = {
        success: true,
        data_fields: data_fields || [],
        validation_rules: validation_rules || [],
        data_collected: true,
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing data collection step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeValidationStep(step, tracker) {
    try {
      const { config } = step;
      const { validation_rules, data_sources } = config;
      
      // Simulate validation
      const result = {
        success: true,
        validation_rules: validation_rules || [],
        data_sources: data_sources || [],
        validation_status: 'passed',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing validation step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  async executeExternalCheckStep(step, tracker) {
    try {
      const { config } = step;
      const { external_services, check_types } = config;
      
      // Simulate external check
      const result = {
        success: true,
        external_services: external_services || [],
        check_types: check_types || [],
        external_check_status: 'completed',
        details: {
          step_name: step.name,
          config
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error executing external check step:', error);
      return {
        success: false,
        error: error.message,
        details: { step_name: step.name }
      };
    }
  }

  checkConditions(conditions, tracker) {
    try {
      const { user_data } = tracker;
      
      for (const condition of conditions) {
        const { field, operator, value } = condition;
        const actualValue = this.getNestedValue(user_data, field);
        
        if (!this.compareValues(actualValue, operator, value)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking conditions:', error);
      return false;
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
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error comparing values:', error);
      return false;
    }
  }

  async checkMilestones(tracker) {
    try {
      const { user_id, workflow_id, completed_steps, progress_percentage } = tracker;
      
      // Check each milestone
      for (const [milestoneId, milestone] of this.milestones) {
        if (tracker.milestones.some(m => m.milestone_id === milestoneId)) {
          continue; // Already achieved
        }
        
        const achieved = await this.checkMilestoneAchievement(milestone, tracker);
        
        if (achieved) {
          const milestoneRecord = {
            milestone_id: milestoneId,
            milestone_name: milestone.name,
            achieved_at: new Date(),
            progress_percentage: progress_percentage,
            details: {
              requirements: milestone.requirements,
              actions: milestone.actions
            }
          };
          
          tracker.milestones.push(milestoneRecord);
          
          // Emit milestone event
          this.emit('milestoneAchieved', {
            tracker,
            milestone: milestoneRecord
          });
          
          logger.info(`Milestone achieved: ${milestone.name}`, {
            trackerId: tracker.id,
            userId: user_id,
            milestoneId
          });
        }
      }
    } catch (error) {
      logger.error('Error checking milestones:', error);
    }
  }

  async checkMilestoneAchievement(milestone, tracker) {
    try {
      const { requirements } = milestone;
      const { user_data, completed_steps, progress_percentage } = tracker;
      
      // Check progress percentage requirement
      if (requirements.min_progress_percentage && progress_percentage < requirements.min_progress_percentage) {
        return false;
      }
      
      // Check completed steps requirement
      if (requirements.required_steps) {
        const requiredSteps = requirements.required_steps;
        const hasAllRequiredSteps = requiredSteps.every(stepName => 
          completed_steps.some(step => step.step_name === stepName)
        );
        
        if (!hasAllRequiredSteps) {
          return false;
        }
      }
      
      // Check user data requirements
      if (requirements.user_data_fields) {
        for (const field of requirements.user_data_fields) {
          const value = this.getNestedValue(user_data, field);
          if (value === undefined || value === null || value === '') {
            return false;
          }
        }
      }
      
      // Check custom conditions
      if (requirements.custom_conditions) {
        for (const condition of requirements.custom_conditions) {
          const { field, operator, value } = condition;
          const actualValue = this.getNestedValue(user_data, field);
          
          if (!this.compareValues(actualValue, operator, value)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking milestone achievement:', error);
      return false;
    }
  }

  async storeTracker(tracker) {
    try {
      await pool.query(`
        INSERT INTO progress_trackers (
          id, user_id, workflow_id, user_data, status, current_step,
          completed_steps, milestones, progress_percentage, estimated_completion,
          started_at, updated_at, completed_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        tracker.id,
        tracker.user_id,
        tracker.workflow_id,
        JSON.stringify(tracker.user_data),
        tracker.status,
        tracker.current_step,
        JSON.stringify(tracker.completed_steps),
        JSON.stringify(tracker.milestones),
        tracker.progress_percentage,
        tracker.estimated_completion,
        tracker.started_at,
        tracker.updated_at,
        tracker.completed_at,
        tracker.created_by
      ]);
    } catch (error) {
      logger.error('Error storing tracker:', error);
      throw error;
    }
  }

  async updateTracker(tracker) {
    try {
      await pool.query(`
        UPDATE progress_trackers
        SET status = $1, current_step = $2, completed_steps = $3, milestones = $4,
            progress_percentage = $5, estimated_completion = $6, updated_at = $7, completed_at = $8
        WHERE id = $9
      `, [
        tracker.status,
        tracker.current_step,
        JSON.stringify(tracker.completed_steps),
        JSON.stringify(tracker.milestones),
        tracker.progress_percentage,
        tracker.estimated_completion,
        tracker.updated_at,
        tracker.completed_at,
        tracker.id
      ]);
    } catch (error) {
      logger.error('Error updating tracker:', error);
      throw error;
    }
  }

  async processPendingTrackers() {
    try {
      const result = await pool.query(`
        SELECT * FROM progress_trackers
        WHERE status = 'active'
        ORDER BY started_at ASC
        LIMIT 10
      `);
      
      for (const tracker of result.rows) {
        const trackerObj = {
          ...tracker,
          user_data: tracker.user_data ? JSON.parse(tracker.user_data) : {},
          completed_steps: tracker.completed_steps ? JSON.parse(tracker.completed_steps) : [],
          milestones: tracker.milestones ? JSON.parse(tracker.milestones) : []
        };
        
        this.trackers.set(tracker.id, trackerObj);
        await this.processStep(tracker.id, tracker.current_step);
      }
      
      logger.info(`Processed ${result.rows.length} pending trackers`);
    } catch (error) {
      logger.error('Error processing pending trackers:', error);
    }
  }

  async getTrackerStats() {
    try {
      const stats = {
        total_trackers: this.trackers.size,
        active_trackers: Array.from(this.trackers.values()).filter(t => t.status === 'active').length,
        completed_trackers: Array.from(this.trackers.values()).filter(t => t.status === 'completed').length,
        failed_trackers: Array.from(this.trackers.values()).filter(t => t.status === 'failed').length,
        total_workflows: this.workflows.size,
        total_milestones: this.milestones.size
      };
      
      // Add progress distribution
      const progressDistribution = {
        '0-25%': 0,
        '26-50%': 0,
        '51-75%': 0,
        '76-100%': 0
      };
      
      for (const tracker of this.trackers.values()) {
        if (tracker.status === 'active') {
          const progress = tracker.progress_percentage;
          if (progress <= 25) {
            progressDistribution['0-25%']++;
          } else if (progress <= 50) {
            progressDistribution['26-50%']++;
          } else if (progress <= 75) {
            progressDistribution['51-75%']++;
          } else {
            progressDistribution['76-100%']++;
          }
        }
      }
      
      stats.progress_distribution = progressDistribution;
      
      return stats;
    } catch (error) {
      logger.error('Error getting tracker stats:', error);
      throw error;
    }
  }
}

module.exports = ProgressTracker;
