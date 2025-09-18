const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class RiskAssessor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.assessments = new Map();
    this.riskFactors = new Map();
    this.riskModels = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load risk factors
      await this.loadRiskFactors();
      
      // Load risk models
      await this.loadRiskModels();
      
      this._initialized = true;
      logger.info('RiskAssessor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RiskAssessor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('RiskAssessor closed');
    } catch (error) {
      logger.error('Error closing RiskAssessor:', error);
    }
  }

  async loadRiskFactors() {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_factors
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const factor of result.rows) {
        this.riskFactors.set(factor.id, {
          ...factor,
          config: factor.config ? JSON.parse(factor.config) : {},
          weights: factor.weights ? JSON.parse(factor.weights) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} risk factors`);
    } catch (error) {
      logger.error('Error loading risk factors:', error);
      throw error;
    }
  }

  async loadRiskModels() {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_models
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const model of result.rows) {
        this.riskModels.set(model.id, {
          ...model,
          config: model.config ? JSON.parse(model.config) : {},
          parameters: model.parameters ? JSON.parse(model.parameters) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} risk models`);
    } catch (error) {
      logger.error('Error loading risk models:', error);
      throw error;
    }
  }

  async assessRisk(userData, assessmentType, userId, assessorId) {
    try {
      const assessmentId = nanoid();
      const now = new Date();
      
      // Validate assessment type
      const model = this.riskModels.get(assessmentType);
      if (!model) {
        throw new Error(`Unknown assessment type: ${assessmentType}`);
      }
      
      // Create assessment record
      const assessment = {
        id: assessmentId,
        user_id: userId,
        assessment_type: assessmentType,
        user_data: userData,
        status: 'pending',
        risk_factors: {},
        risk_score: 0,
        risk_level: 'unknown',
        recommendations: [],
        created_by: assessorId,
        created_at: now,
        updated_at: now,
        completed_at: null
      };
      
      // Store assessment
      await this.storeAssessment(assessment);
      
      // Cache assessment
      this.assessments.set(assessmentId, assessment);
      
      // Process assessment asynchronously
      this.processAssessment(assessmentId);
      
      logger.info(`Risk assessment started: ${assessmentId}`, {
        userId,
        assessmentType,
        userDataKeys: Object.keys(userData)
      });
      
      return assessment;
    } catch (error) {
      logger.error('Error assessing risk:', error);
      throw error;
    }
  }

  async getAssessment(assessmentId, userId) {
    try {
      // Check cache first
      if (this.assessments.has(assessmentId)) {
        return this.assessments.get(assessmentId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM risk_assessments
        WHERE id = $1 AND user_id = $2
      `, [assessmentId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Assessment not found');
      }
      
      const assessment = {
        ...result.rows[0],
        user_data: result.rows[0].user_data ? JSON.parse(result.rows[0].user_data) : {},
        risk_factors: result.rows[0].risk_factors ? JSON.parse(result.rows[0].risk_factors) : {},
        recommendations: result.rows[0].recommendations ? JSON.parse(result.rows[0].recommendations) : []
      };
      
      // Cache assessment
      this.assessments.set(assessmentId, assessment);
      
      return assessment;
    } catch (error) {
      logger.error('Error getting assessment:', error);
      throw error;
    }
  }

  async processAssessment(assessmentId) {
    try {
      const assessment = this.assessments.get(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      
      // Update status to processing
      assessment.status = 'processing';
      assessment.updated_at = new Date();
      
      await this.updateAssessment(assessment);
      
      // Process risk factors
      const riskFactors = await this.assessRiskFactors(assessment);
      
      // Calculate risk score
      const riskScore = await this.calculateRiskScore(riskFactors, assessment.assessment_type);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(riskFactors, riskLevel);
      
      // Update assessment
      assessment.status = 'completed';
      assessment.risk_factors = riskFactors;
      assessment.risk_score = riskScore;
      assessment.risk_level = riskLevel;
      assessment.recommendations = recommendations;
      assessment.completed_at = new Date();
      assessment.updated_at = new Date();
      
      await this.updateAssessment(assessment);
      
      // Emit event
      this.emit('assessmentCompleted', assessment);
      
      logger.info(`Risk assessment completed: ${assessmentId}`, {
        riskScore,
        riskLevel,
        recommendationsCount: recommendations.length
      });
      
    } catch (error) {
      logger.error(`Error processing assessment ${assessmentId}:`, error);
      
      // Update assessment with error
      const assessment = this.assessments.get(assessmentId);
      if (assessment) {
        assessment.status = 'failed';
        assessment.error = error.message;
        assessment.updated_at = new Date();
        await this.updateAssessment(assessment);
      }
    }
  }

  async assessRiskFactors(assessment) {
    try {
      const { user_data, assessment_type } = assessment;
      const riskFactors = {};
      
      // Assess each risk factor
      for (const [factorId, factor] of this.riskFactors) {
        try {
          const factorAssessment = await this.assessRiskFactor(factor, user_data, assessment_type);
          riskFactors[factorId] = factorAssessment;
        } catch (error) {
          logger.error(`Error assessing risk factor ${factorId}:`, error);
          riskFactors[factorId] = {
            factor_id: factorId,
            score: 0,
            level: 'unknown',
            details: { error: error.message }
          };
        }
      }
      
      return riskFactors;
    } catch (error) {
      logger.error('Error assessing risk factors:', error);
      throw error;
    }
  }

  async assessRiskFactor(factor, userData, assessmentType) {
    try {
      const { type, config, weights } = factor;
      
      switch (type) {
        case 'demographic':
          return await this.assessDemographicRisk(factor, userData, config, weights);
        case 'financial':
          return await this.assessFinancialRisk(factor, userData, config, weights);
        case 'behavioral':
          return await this.assessBehavioralRisk(factor, userData, config, weights);
        case 'geographic':
          return await this.assessGeographicRisk(factor, userData, config, weights);
        case 'document':
          return await this.assessDocumentRisk(factor, userData, config, weights);
        case 'identity':
          return await this.assessIdentityRisk(factor, userData, config, weights);
        case 'transaction':
          return await this.assessTransactionRisk(factor, userData, config, weights);
        case 'compliance':
          return await this.assessComplianceRisk(factor, userData, config, weights);
        default:
          return {
            factor_id: factor.id,
            score: 0,
            level: 'unknown',
            details: { error: 'Unknown risk factor type' }
          };
      }
    } catch (error) {
      logger.error('Error assessing risk factor:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessDemographicRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Age risk
      if (userData.age) {
        const ageRisk = this.calculateAgeRisk(userData.age, config.age_risk_ranges);
        score += ageRisk * (weights.age || 0.2);
        details.age_risk = ageRisk;
      }
      
      // Gender risk
      if (userData.gender) {
        const genderRisk = this.calculateGenderRisk(userData.gender, config.gender_risk_factors);
        score += genderRisk * (weights.gender || 0.1);
        details.gender_risk = genderRisk;
      }
      
      // Marital status risk
      if (userData.marital_status) {
        const maritalRisk = this.calculateMaritalStatusRisk(userData.marital_status, config.marital_risk_factors);
        score += maritalRisk * (weights.marital_status || 0.1);
        details.marital_risk = maritalRisk;
      }
      
      // Education risk
      if (userData.education) {
        const educationRisk = this.calculateEducationRisk(userData.education, config.education_risk_factors);
        score += educationRisk * (weights.education || 0.1);
        details.education_risk = educationRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing demographic risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessFinancialRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Income risk
      if (userData.income) {
        const incomeRisk = this.calculateIncomeRisk(userData.income, config.income_risk_ranges);
        score += incomeRisk * (weights.income || 0.3);
        details.income_risk = incomeRisk;
      }
      
      // Employment risk
      if (userData.employment_status) {
        const employmentRisk = this.calculateEmploymentRisk(userData.employment_status, config.employment_risk_factors);
        score += employmentRisk * (weights.employment || 0.2);
        details.employment_risk = employmentRisk;
      }
      
      // Credit score risk
      if (userData.credit_score) {
        const creditRisk = this.calculateCreditScoreRisk(userData.credit_score, config.credit_score_ranges);
        score += creditRisk * (weights.credit_score || 0.3);
        details.credit_risk = creditRisk;
      }
      
      // Debt-to-income ratio risk
      if (userData.debt_to_income_ratio) {
        const debtRisk = this.calculateDebtRisk(userData.debt_to_income_ratio, config.debt_risk_ranges);
        score += debtRisk * (weights.debt_ratio || 0.2);
        details.debt_risk = debtRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing financial risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessBehavioralRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Trading experience risk
      if (userData.trading_experience) {
        const experienceRisk = this.calculateTradingExperienceRisk(userData.trading_experience, config.experience_risk_ranges);
        score += experienceRisk * (weights.trading_experience || 0.3);
        details.experience_risk = experienceRisk;
      }
      
      // Risk tolerance risk
      if (userData.risk_tolerance) {
        const toleranceRisk = this.calculateRiskToleranceRisk(userData.risk_tolerance, config.tolerance_risk_factors);
        score += toleranceRisk * (weights.risk_tolerance || 0.2);
        details.tolerance_risk = toleranceRisk;
      }
      
      // Investment goals risk
      if (userData.investment_goals) {
        const goalsRisk = this.calculateInvestmentGoalsRisk(userData.investment_goals, config.goals_risk_factors);
        score += goalsRisk * (weights.investment_goals || 0.2);
        details.goals_risk = goalsRisk;
      }
      
      // Previous violations risk
      if (userData.previous_violations) {
        const violationsRisk = this.calculateViolationsRisk(userData.previous_violations, config.violations_risk_factors);
        score += violationsRisk * (weights.previous_violations || 0.3);
        details.violations_risk = violationsRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing behavioral risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessGeographicRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Country risk
      if (userData.country) {
        const countryRisk = this.calculateCountryRisk(userData.country, config.country_risk_factors);
        score += countryRisk * (weights.country || 0.4);
        details.country_risk = countryRisk;
      }
      
      // State/Province risk
      if (userData.state) {
        const stateRisk = this.calculateStateRisk(userData.state, config.state_risk_factors);
        score += stateRisk * (weights.state || 0.3);
        details.state_risk = stateRisk;
      }
      
      // City risk
      if (userData.city) {
        const cityRisk = this.calculateCityRisk(userData.city, config.city_risk_factors);
        score += cityRisk * (weights.city || 0.3);
        details.city_risk = cityRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing geographic risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessDocumentRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Document quality risk
      if (userData.document_quality) {
        const qualityRisk = this.calculateDocumentQualityRisk(userData.document_quality, config.quality_risk_factors);
        score += qualityRisk * (weights.document_quality || 0.4);
        details.quality_risk = qualityRisk;
      }
      
      // Document authenticity risk
      if (userData.document_authenticity) {
        const authenticityRisk = this.calculateDocumentAuthenticityRisk(userData.document_authenticity, config.authenticity_risk_factors);
        score += authenticityRisk * (weights.document_authenticity || 0.4);
        details.authenticity_risk = authenticityRisk;
      }
      
      // Document completeness risk
      if (userData.document_completeness) {
        const completenessRisk = this.calculateDocumentCompletenessRisk(userData.document_completeness, config.completeness_risk_factors);
        score += completenessRisk * (weights.document_completeness || 0.2);
        details.completeness_risk = completenessRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing document risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessIdentityRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Identity verification risk
      if (userData.identity_verification) {
        const verificationRisk = this.calculateIdentityVerificationRisk(userData.identity_verification, config.verification_risk_factors);
        score += verificationRisk * (weights.identity_verification || 0.4);
        details.verification_risk = verificationRisk;
      }
      
      // Identity consistency risk
      if (userData.identity_consistency) {
        const consistencyRisk = this.calculateIdentityConsistencyRisk(userData.identity_consistency, config.consistency_risk_factors);
        score += consistencyRisk * (weights.identity_consistency || 0.3);
        details.consistency_risk = consistencyRisk;
      }
      
      // Identity history risk
      if (userData.identity_history) {
        const historyRisk = this.calculateIdentityHistoryRisk(userData.identity_history, config.history_risk_factors);
        score += historyRisk * (weights.identity_history || 0.3);
        details.history_risk = historyRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing identity risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessTransactionRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Transaction frequency risk
      if (userData.transaction_frequency) {
        const frequencyRisk = this.calculateTransactionFrequencyRisk(userData.transaction_frequency, config.frequency_risk_ranges);
        score += frequencyRisk * (weights.transaction_frequency || 0.3);
        details.frequency_risk = frequencyRisk;
      }
      
      // Transaction amount risk
      if (userData.transaction_amount) {
        const amountRisk = this.calculateTransactionAmountRisk(userData.transaction_amount, config.amount_risk_ranges);
        score += amountRisk * (weights.transaction_amount || 0.3);
        details.amount_risk = amountRisk;
      }
      
      // Transaction pattern risk
      if (userData.transaction_pattern) {
        const patternRisk = this.calculateTransactionPatternRisk(userData.transaction_pattern, config.pattern_risk_factors);
        score += patternRisk * (weights.transaction_pattern || 0.4);
        details.pattern_risk = patternRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing transaction risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  async assessComplianceRisk(factor, userData, config, weights) {
    try {
      let score = 0;
      const details = {};
      
      // Regulatory compliance risk
      if (userData.regulatory_compliance) {
        const complianceRisk = this.calculateRegulatoryComplianceRisk(userData.regulatory_compliance, config.compliance_risk_factors);
        score += complianceRisk * (weights.regulatory_compliance || 0.4);
        details.compliance_risk = complianceRisk;
      }
      
      // Sanctions risk
      if (userData.sanctions_check) {
        const sanctionsRisk = this.calculateSanctionsRisk(userData.sanctions_check, config.sanctions_risk_factors);
        score += sanctionsRisk * (weights.sanctions_check || 0.3);
        details.sanctions_risk = sanctionsRisk;
      }
      
      // AML risk
      if (userData.aml_check) {
        const amlRisk = this.calculateAMLRisk(userData.aml_check, config.aml_risk_factors);
        score += amlRisk * (weights.aml_check || 0.3);
        details.aml_risk = amlRisk;
      }
      
      return {
        factor_id: factor.id,
        score: Math.min(score, 1),
        level: this.getRiskLevel(score),
        details
      };
    } catch (error) {
      logger.error('Error assessing compliance risk:', error);
      return {
        factor_id: factor.id,
        score: 0,
        level: 'unknown',
        details: { error: error.message }
      };
    }
  }

  // Risk calculation helper methods
  calculateAgeRisk(age, ageRiskRanges) {
    if (!ageRiskRanges) return 0.5;
    
    for (const range of ageRiskRanges) {
      if (age >= range.min && age <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateGenderRisk(gender, genderRiskFactors) {
    if (!genderRiskFactors) return 0.5;
    
    return genderRiskFactors[gender] || 0.5;
  }

  calculateMaritalStatusRisk(maritalStatus, maritalRiskFactors) {
    if (!maritalRiskFactors) return 0.5;
    
    return maritalRiskFactors[maritalStatus] || 0.5;
  }

  calculateEducationRisk(education, educationRiskFactors) {
    if (!educationRiskFactors) return 0.5;
    
    return educationRiskFactors[education] || 0.5;
  }

  calculateIncomeRisk(income, incomeRiskRanges) {
    if (!incomeRiskRanges) return 0.5;
    
    for (const range of incomeRiskRanges) {
      if (income >= range.min && income <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateEmploymentRisk(employmentStatus, employmentRiskFactors) {
    if (!employmentRiskFactors) return 0.5;
    
    return employmentRiskFactors[employmentStatus] || 0.5;
  }

  calculateCreditScoreRisk(creditScore, creditScoreRanges) {
    if (!creditScoreRanges) return 0.5;
    
    for (const range of creditScoreRanges) {
      if (creditScore >= range.min && creditScore <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateDebtRisk(debtToIncomeRatio, debtRiskRanges) {
    if (!debtRiskRanges) return 0.5;
    
    for (const range of debtRiskRanges) {
      if (debtToIncomeRatio >= range.min && debtToIncomeRatio <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateTradingExperienceRisk(experience, experienceRiskRanges) {
    if (!experienceRiskRanges) return 0.5;
    
    for (const range of experienceRiskRanges) {
      if (experience >= range.min && experience <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateRiskToleranceRisk(tolerance, toleranceRiskFactors) {
    if (!toleranceRiskFactors) return 0.5;
    
    return toleranceRiskFactors[tolerance] || 0.5;
  }

  calculateInvestmentGoalsRisk(goals, goalsRiskFactors) {
    if (!goalsRiskFactors) return 0.5;
    
    let maxRisk = 0;
    for (const goal of goals) {
      const risk = goalsRiskFactors[goal] || 0.5;
      maxRisk = Math.max(maxRisk, risk);
    }
    
    return maxRisk;
  }

  calculateViolationsRisk(violations, violationsRiskFactors) {
    if (!violationsRiskFactors) return 0.5;
    
    let totalRisk = 0;
    for (const violation of violations) {
      totalRisk += violationsRiskFactors[violation.type] || 0.5;
    }
    
    return Math.min(totalRisk, 1);
  }

  calculateCountryRisk(country, countryRiskFactors) {
    if (!countryRiskFactors) return 0.5;
    
    return countryRiskFactors[country] || 0.5;
  }

  calculateStateRisk(state, stateRiskFactors) {
    if (!stateRiskFactors) return 0.5;
    
    return stateRiskFactors[state] || 0.5;
  }

  calculateCityRisk(city, cityRiskFactors) {
    if (!cityRiskFactors) return 0.5;
    
    return cityRiskFactors[city] || 0.5;
  }

  calculateDocumentQualityRisk(quality, qualityRiskFactors) {
    if (!qualityRiskFactors) return 0.5;
    
    return qualityRiskFactors[quality] || 0.5;
  }

  calculateDocumentAuthenticityRisk(authenticity, authenticityRiskFactors) {
    if (!authenticityRiskFactors) return 0.5;
    
    return authenticityRiskFactors[authenticity] || 0.5;
  }

  calculateDocumentCompletenessRisk(completeness, completenessRiskFactors) {
    if (!completenessRiskFactors) return 0.5;
    
    return completenessRiskFactors[completeness] || 0.5;
  }

  calculateIdentityVerificationRisk(verification, verificationRiskFactors) {
    if (!verificationRiskFactors) return 0.5;
    
    return verificationRiskFactors[verification] || 0.5;
  }

  calculateIdentityConsistencyRisk(consistency, consistencyRiskFactors) {
    if (!consistencyRiskFactors) return 0.5;
    
    return consistencyRiskFactors[consistency] || 0.5;
  }

  calculateIdentityHistoryRisk(history, historyRiskFactors) {
    if (!historyRiskFactors) return 0.5;
    
    return historyRiskFactors[history] || 0.5;
  }

  calculateTransactionFrequencyRisk(frequency, frequencyRiskRanges) {
    if (!frequencyRiskRanges) return 0.5;
    
    for (const range of frequencyRiskRanges) {
      if (frequency >= range.min && frequency <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateTransactionAmountRisk(amount, amountRiskRanges) {
    if (!amountRiskRanges) return 0.5;
    
    for (const range of amountRiskRanges) {
      if (amount >= range.min && amount <= range.max) {
        return range.risk_score;
      }
    }
    
    return 0.5;
  }

  calculateTransactionPatternRisk(pattern, patternRiskFactors) {
    if (!patternRiskFactors) return 0.5;
    
    return patternRiskFactors[pattern] || 0.5;
  }

  calculateRegulatoryComplianceRisk(compliance, complianceRiskFactors) {
    if (!complianceRiskFactors) return 0.5;
    
    return complianceRiskFactors[compliance] || 0.5;
  }

  calculateSanctionsRisk(sanctions, sanctionsRiskFactors) {
    if (!sanctionsRiskFactors) return 0.5;
    
    return sanctionsRiskFactors[sanctions] || 0.5;
  }

  calculateAMLRisk(aml, amlRiskFactors) {
    if (!amlRiskFactors) return 0.5;
    
    return amlRiskFactors[aml] || 0.5;
  }

  getRiskLevel(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.4) return 'low';
    return 'very_low';
  }

  async calculateRiskScore(riskFactors, assessmentType) {
    try {
      const model = this.riskModels.get(assessmentType);
      if (!model) {
        throw new Error(`Unknown assessment type: ${assessmentType}`);
      }
      
      const { parameters } = model;
      let totalScore = 0;
      let totalWeight = 0;
      
      for (const [factorId, factor] of Object.entries(riskFactors)) {
        const weight = parameters[factorId] || 1;
        totalScore += factor.score * weight;
        totalWeight += weight;
      }
      
      return totalWeight > 0 ? totalScore / totalWeight : 0;
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 0;
    }
  }

  determineRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'high';
    if (riskScore >= 0.6) return 'medium';
    if (riskScore >= 0.4) return 'low';
    return 'very_low';
  }

  async generateRecommendations(riskFactors, riskLevel) {
    try {
      const recommendations = [];
      
      // Generate recommendations based on risk factors
      for (const [factorId, factor] of Object.entries(riskFactors)) {
        if (factor.level === 'high') {
          recommendations.push({
            factor_id: factorId,
            type: 'risk_reduction',
            priority: 'high',
            description: `Address high risk in ${factorId}`,
            actions: [`Review and improve ${factorId}`, `Consider additional verification for ${factorId}`]
          });
        } else if (factor.level === 'medium') {
          recommendations.push({
            factor_id: factorId,
            type: 'risk_monitoring',
            priority: 'medium',
            description: `Monitor medium risk in ${factorId}`,
            actions: [`Regularly review ${factorId}`, `Set up alerts for ${factorId}`]
          });
        }
      }
      
      // Generate general recommendations based on risk level
      if (riskLevel === 'high') {
        recommendations.push({
          type: 'general',
          priority: 'high',
          description: 'High overall risk detected',
          actions: ['Enhanced due diligence required', 'Manual review recommended', 'Consider additional verification steps']
        });
      } else if (riskLevel === 'medium') {
        recommendations.push({
          type: 'general',
          priority: 'medium',
          description: 'Medium overall risk detected',
          actions: ['Regular monitoring recommended', 'Consider additional verification for specific factors']
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  async storeAssessment(assessment) {
    try {
      await pool.query(`
        INSERT INTO risk_assessments (
          id, user_id, assessment_type, user_data, status, risk_factors,
          risk_score, risk_level, recommendations, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        assessment.id,
        assessment.user_id,
        assessment.assessment_type,
        JSON.stringify(assessment.user_data),
        assessment.status,
        JSON.stringify(assessment.risk_factors),
        assessment.risk_score,
        assessment.risk_level,
        JSON.stringify(assessment.recommendations),
        assessment.created_by,
        assessment.created_at,
        assessment.updated_at,
        assessment.completed_at
      ]);
    } catch (error) {
      logger.error('Error storing assessment:', error);
      throw error;
    }
  }

  async updateAssessment(assessment) {
    try {
      await pool.query(`
        UPDATE risk_assessments
        SET status = $1, risk_factors = $2, risk_score = $3, risk_level = $4,
            recommendations = $5, updated_at = $6, completed_at = $7
        WHERE id = $8
      `, [
        assessment.status,
        JSON.stringify(assessment.risk_factors),
        assessment.risk_score,
        assessment.risk_level,
        JSON.stringify(assessment.recommendations),
        assessment.updated_at,
        assessment.completed_at,
        assessment.id
      ]);
    } catch (error) {
      logger.error('Error updating assessment:', error);
      throw error;
    }
  }

  async processPendingAssessments() {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_assessments
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      for (const assessment of result.rows) {
        const assessmentObj = {
          ...assessment,
          user_data: assessment.user_data ? JSON.parse(assessment.user_data) : {},
          risk_factors: assessment.risk_factors ? JSON.parse(assessment.risk_factors) : {},
          recommendations: assessment.recommendations ? JSON.parse(assessment.recommendations) : []
        };
        
        this.assessments.set(assessment.id, assessmentObj);
        await this.processAssessment(assessment.id);
      }
      
      logger.info(`Processed ${result.rows.length} pending assessments`);
    } catch (error) {
      logger.error('Error processing pending assessments:', error);
    }
  }

  async getAssessmentStats() {
    try {
      const stats = {
        total_assessments: this.assessments.size,
        pending_assessments: Array.from(this.assessments.values()).filter(a => a.status === 'pending').length,
        processing_assessments: Array.from(this.assessments.values()).filter(a => a.status === 'processing').length,
        completed_assessments: Array.from(this.assessments.values()).filter(a => a.status === 'completed').length,
        failed_assessments: Array.from(this.assessments.values()).filter(a => a.status === 'failed').length,
        high_risk_assessments: Array.from(this.assessments.values()).filter(a => a.risk_level === 'high').length,
        medium_risk_assessments: Array.from(this.assessments.values()).filter(a => a.risk_level === 'medium').length,
        low_risk_assessments: Array.from(this.assessments.values()).filter(a => a.risk_level === 'low').length,
        very_low_risk_assessments: Array.from(this.assessments.values()).filter(a => a.risk_level === 'very_low').length,
        total_risk_factors: this.riskFactors.size,
        total_risk_models: this.riskModels.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting assessment stats:', error);
      throw error;
    }
  }
}

module.exports = RiskAssessor;
