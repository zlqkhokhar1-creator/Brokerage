const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class TierAssigner extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.assignments = new Map();
    this.tiers = new Map();
    this.assignmentRules = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load tiers
      await this.loadTiers();
      
      // Load assignment rules
      await this.loadAssignmentRules();
      
      this._initialized = true;
      logger.info('TierAssigner initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TierAssigner:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('TierAssigner closed');
    } catch (error) {
      logger.error('Error closing TierAssigner:', error);
    }
  }

  async loadTiers() {
    try {
      const result = await pool.query(`
        SELECT * FROM kyc_tiers
        WHERE is_active = true
        ORDER BY level ASC
      `);
      
      for (const tier of result.rows) {
        this.tiers.set(tier.id, {
          ...tier,
          requirements: tier.requirements ? JSON.parse(tier.requirements) : {},
          benefits: tier.benefits ? JSON.parse(tier.benefits) : {},
          restrictions: tier.restrictions ? JSON.parse(tier.restrictions) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} KYC tiers`);
    } catch (error) {
      logger.error('Error loading tiers:', error);
      throw error;
    }
  }

  async loadAssignmentRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM tier_assignment_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const rule of result.rows) {
        this.assignmentRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} tier assignment rules`);
    } catch (error) {
      logger.error('Error loading assignment rules:', error);
      throw error;
    }
  }

  async assignTier(userData, riskAssessment, documentVerification, identityVerification, userId, assignerId) {
    try {
      const assignmentId = nanoid();
      const now = new Date();
      
      // Create assignment record
      const assignment = {
        id: assignmentId,
        user_id: userId,
        user_data: userData,
        risk_assessment: riskAssessment,
        document_verification: documentVerification,
        identity_verification: identityVerification,
        status: 'pending',
        assigned_tier: null,
        assignment_reason: '',
        assignment_data: {},
        created_by: assignerId,
        created_at: now,
        updated_at: now,
        completed_at: null
      };
      
      // Store assignment
      await this.storeAssignment(assignment);
      
      // Cache assignment
      this.assignments.set(assignmentId, assignment);
      
      // Process assignment asynchronously
      this.processAssignment(assignmentId);
      
      logger.info(`Tier assignment started: ${assignmentId}`, {
        userId,
        riskLevel: riskAssessment?.risk_level,
        documentStatus: documentVerification?.status,
        identityStatus: identityVerification?.status
      });
      
      return assignment;
    } catch (error) {
      logger.error('Error assigning tier:', error);
      throw error;
    }
  }

  async getAssignment(assignmentId, userId) {
    try {
      // Check cache first
      if (this.assignments.has(assignmentId)) {
        return this.assignments.get(assignmentId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM tier_assignments
        WHERE id = $1 AND user_id = $2
      `, [assignmentId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Assignment not found');
      }
      
      const assignment = {
        ...result.rows[0],
        user_data: result.rows[0].user_data ? JSON.parse(result.rows[0].user_data) : {},
        risk_assessment: result.rows[0].risk_assessment ? JSON.parse(result.rows[0].risk_assessment) : {},
        document_verification: result.rows[0].document_verification ? JSON.parse(result.rows[0].document_verification) : {},
        identity_verification: result.rows[0].identity_verification ? JSON.parse(result.rows[0].identity_verification) : {},
        assignment_data: result.rows[0].assignment_data ? JSON.parse(result.rows[0].assignment_data) : {}
      };
      
      // Cache assignment
      this.assignments.set(assignmentId, assignment);
      
      return assignment;
    } catch (error) {
      logger.error('Error getting assignment:', error);
      throw error;
    }
  }

  async processAssignment(assignmentId) {
    try {
      const assignment = this.assignments.get(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }
      
      // Update status to processing
      assignment.status = 'processing';
      assignment.updated_at = new Date();
      
      await this.updateAssignment(assignment);
      
      // Determine tier
      const tierAssignment = await this.determineTier(assignment);
      
      // Update assignment
      assignment.status = 'completed';
      assignment.assigned_tier = tierAssignment.tier;
      assignment.assignment_reason = tierAssignment.reason;
      assignment.assignment_data = tierAssignment.data;
      assignment.completed_at = new Date();
      assignment.updated_at = new Date();
      
      await this.updateAssignment(assignment);
      
      // Emit event
      this.emit('assignmentCompleted', assignment);
      
      logger.info(`Tier assignment completed: ${assignmentId}`, {
        assignedTier: tierAssignment.tier,
        reason: tierAssignment.reason
      });
      
    } catch (error) {
      logger.error(`Error processing assignment ${assignmentId}:`, error);
      
      // Update assignment with error
      const assignment = this.assignments.get(assignmentId);
      if (assignment) {
        assignment.status = 'failed';
        assignment.error = error.message;
        assignment.updated_at = new Date();
        await this.updateAssignment(assignment);
      }
    }
  }

  async determineTier(assignment) {
    try {
      const { user_data, risk_assessment, document_verification, identity_verification } = assignment;
      
      // Get all tiers sorted by level
      const sortedTiers = Array.from(this.tiers.values()).sort((a, b) => a.level - b.level);
      
      // Check each tier from highest to lowest
      for (const tier of sortedTiers.reverse()) {
        const canAssign = await this.canAssignTier(tier, user_data, risk_assessment, document_verification, identity_verification);
        
        if (canAssign.eligible) {
          return {
            tier: tier.id,
            reason: canAssign.reason,
            data: {
              tier_name: tier.name,
              tier_level: tier.level,
              requirements_met: canAssign.requirements_met,
              eligibility_score: canAssign.eligibility_score
            }
          };
        }
      }
      
      // If no tier can be assigned, assign the lowest tier
      const lowestTier = sortedTiers[sortedTiers.length - 1];
      return {
        tier: lowestTier.id,
        reason: 'No higher tier requirements met, assigned lowest tier',
        data: {
          tier_name: lowestTier.name,
          tier_level: lowestTier.level,
          requirements_met: [],
          eligibility_score: 0
        }
      };
    } catch (error) {
      logger.error('Error determining tier:', error);
      throw error;
    }
  }

  async canAssignTier(tier, userData, riskAssessment, documentVerification, identityVerification) {
    try {
      const { requirements } = tier;
      const requirementsMet = [];
      let eligibilityScore = 0;
      let totalRequirements = 0;
      
      // Check risk level requirement
      if (requirements.risk_level) {
        totalRequirements++;
        const riskLevel = riskAssessment?.risk_level || 'unknown';
        const riskLevels = ['very_low', 'low', 'medium', 'high'];
        const userRiskIndex = riskLevels.indexOf(riskLevel);
        const requiredRiskIndex = riskLevels.indexOf(requirements.risk_level);
        
        if (userRiskIndex <= requiredRiskIndex) {
          requirementsMet.push('risk_level');
          eligibilityScore += 1;
        }
      }
      
      // Check document verification requirement
      if (requirements.document_verification) {
        totalRequirements++;
        const docStatus = documentVerification?.status || 'unknown';
        if (docStatus === 'verified') {
          requirementsMet.push('document_verification');
          eligibilityScore += 1;
        }
      }
      
      // Check identity verification requirement
      if (requirements.identity_verification) {
        totalRequirements++;
        const identityStatus = identityVerification?.status || 'unknown';
        if (identityStatus === 'verified') {
          requirementsMet.push('identity_verification');
          eligibilityScore += 1;
        }
      }
      
      // Check income requirement
      if (requirements.min_income) {
        totalRequirements++;
        const income = userData?.income || 0;
        if (income >= requirements.min_income) {
          requirementsMet.push('min_income');
          eligibilityScore += 1;
        }
      }
      
      // Check net worth requirement
      if (requirements.min_net_worth) {
        totalRequirements++;
        const netWorth = userData?.net_worth || 0;
        if (netWorth >= requirements.min_net_worth) {
          requirementsMet.push('min_net_worth');
          eligibilityScore += 1;
        }
      }
      
      // Check trading experience requirement
      if (requirements.min_trading_experience) {
        totalRequirements++;
        const experience = userData?.trading_experience || 0;
        if (experience >= requirements.min_trading_experience) {
          requirementsMet.push('min_trading_experience');
          eligibilityScore += 1;
        }
      }
      
      // Check age requirement
      if (requirements.min_age) {
        totalRequirements++;
        const age = userData?.age || 0;
        if (age >= requirements.min_age) {
          requirementsMet.push('min_age');
          eligibilityScore += 1;
        }
      }
      
      // Check employment status requirement
      if (requirements.employment_status) {
        totalRequirements++;
        const employmentStatus = userData?.employment_status || 'unknown';
        if (requirements.employment_status.includes(employmentStatus)) {
          requirementsMet.push('employment_status');
          eligibilityScore += 1;
        }
      }
      
      // Check country requirement
      if (requirements.allowed_countries) {
        totalRequirements++;
        const country = userData?.country || 'unknown';
        if (requirements.allowed_countries.includes(country)) {
          requirementsMet.push('allowed_countries');
          eligibilityScore += 1;
        }
      }
      
      // Check credit score requirement
      if (requirements.min_credit_score) {
        totalRequirements++;
        const creditScore = userData?.credit_score || 0;
        if (creditScore >= requirements.min_credit_score) {
          requirementsMet.push('min_credit_score');
          eligibilityScore += 1;
        }
      }
      
      // Check specific document types requirement
      if (requirements.required_documents) {
        totalRequirements++;
        const documentTypes = documentVerification?.documents?.map(doc => doc.type) || [];
        const hasAllRequiredDocs = requirements.required_documents.every(docType => 
          documentTypes.includes(docType)
        );
        
        if (hasAllRequiredDocs) {
          requirementsMet.push('required_documents');
          eligibilityScore += 1;
        }
      }
      
      // Check specific verification methods requirement
      if (requirements.required_verification_methods) {
        totalRequirements++;
        const verificationMethods = identityVerification?.verification_methods || [];
        const hasAllRequiredMethods = requirements.required_verification_methods.every(method => 
          verificationMethods.includes(method)
        );
        
        if (hasAllRequiredMethods) {
          requirementsMet.push('required_verification_methods');
          eligibilityScore += 1;
        }
      }
      
      // Check compliance requirements
      if (requirements.compliance_checks) {
        totalRequirements++;
        const complianceChecks = userData?.compliance_checks || {};
        const allCompliancePassed = requirements.compliance_checks.every(check => 
          complianceChecks[check] === true
        );
        
        if (allCompliancePassed) {
          requirementsMet.push('compliance_checks');
          eligibilityScore += 1;
        }
      }
      
      // Check minimum eligibility score
      const minEligibilityScore = requirements.min_eligibility_score || 0.8;
      const finalEligibilityScore = totalRequirements > 0 ? eligibilityScore / totalRequirements : 0;
      
      const eligible = finalEligibilityScore >= minEligibilityScore;
      
      return {
        eligible,
        requirements_met: requirementsMet,
        eligibility_score: finalEligibilityScore,
        reason: eligible 
          ? `All requirements met for tier ${tier.name}` 
          : `Requirements not met for tier ${tier.name} (score: ${finalEligibilityScore.toFixed(2)})`
      };
    } catch (error) {
      logger.error('Error checking tier eligibility:', error);
      return {
        eligible: false,
        requirements_met: [],
        eligibility_score: 0,
        reason: 'Error checking tier eligibility'
      };
    }
  }

  async storeAssignment(assignment) {
    try {
      await pool.query(`
        INSERT INTO tier_assignments (
          id, user_id, user_data, risk_assessment, document_verification,
          identity_verification, status, assigned_tier, assignment_reason,
          assignment_data, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        assignment.id,
        assignment.user_id,
        JSON.stringify(assignment.user_data),
        JSON.stringify(assignment.risk_assessment),
        JSON.stringify(assignment.document_verification),
        JSON.stringify(assignment.identity_verification),
        assignment.status,
        assignment.assigned_tier,
        assignment.assignment_reason,
        JSON.stringify(assignment.assignment_data),
        assignment.created_by,
        assignment.created_at,
        assignment.updated_at,
        assignment.completed_at
      ]);
    } catch (error) {
      logger.error('Error storing assignment:', error);
      throw error;
    }
  }

  async updateAssignment(assignment) {
    try {
      await pool.query(`
        UPDATE tier_assignments
        SET status = $1, assigned_tier = $2, assignment_reason = $3,
            assignment_data = $4, updated_at = $5, completed_at = $6
        WHERE id = $7
      `, [
        assignment.status,
        assignment.assigned_tier,
        assignment.assignment_reason,
        JSON.stringify(assignment.assignment_data),
        assignment.updated_at,
        assignment.completed_at,
        assignment.id
      ]);
    } catch (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }
  }

  async processPendingAssignments() {
    try {
      const result = await pool.query(`
        SELECT * FROM tier_assignments
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      for (const assignment of result.rows) {
        const assignmentObj = {
          ...assignment,
          user_data: assignment.user_data ? JSON.parse(assignment.user_data) : {},
          risk_assessment: assignment.risk_assessment ? JSON.parse(assignment.risk_assessment) : {},
          document_verification: assignment.document_verification ? JSON.parse(assignment.document_verification) : {},
          identity_verification: assignment.identity_verification ? JSON.parse(assignment.identity_verification) : {},
          assignment_data: assignment.assignment_data ? JSON.parse(assignment.assignment_data) : {}
        };
        
        this.assignments.set(assignment.id, assignmentObj);
        await this.processAssignment(assignment.id);
      }
      
      logger.info(`Processed ${result.rows.length} pending assignments`);
    } catch (error) {
      logger.error('Error processing pending assignments:', error);
    }
  }

  async getAssignmentStats() {
    try {
      const stats = {
        total_assignments: this.assignments.size,
        pending_assignments: Array.from(this.assignments.values()).filter(a => a.status === 'pending').length,
        processing_assignments: Array.from(this.assignments.values()).filter(a => a.status === 'processing').length,
        completed_assignments: Array.from(this.assignments.values()).filter(a => a.status === 'completed').length,
        failed_assignments: Array.from(this.assignments.values()).filter(a => a.status === 'failed').length,
        total_tiers: this.tiers.size,
        total_assignment_rules: this.assignmentRules.size
      };
      
      // Add tier distribution
      const tierDistribution = {};
      for (const assignment of this.assignments.values()) {
        if (assignment.status === 'completed' && assignment.assigned_tier) {
          tierDistribution[assignment.assigned_tier] = (tierDistribution[assignment.assigned_tier] || 0) + 1;
        }
      }
      stats.tier_distribution = tierDistribution;
      
      return stats;
    } catch (error) {
      logger.error('Error getting assignment stats:', error);
      throw error;
    }
  }
}

module.exports = TierAssigner;
