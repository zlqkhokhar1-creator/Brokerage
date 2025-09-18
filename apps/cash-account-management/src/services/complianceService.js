const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class ComplianceService extends EventEmitter {
  constructor() {
    super();
    this.amlProviders = ['THOMSON_REUTERS', 'DOW_JONES', 'LEXIS_NEXIS', 'REFINITIV'];
    this.kycProviders = ['JUMIO', 'ONFIDO', 'TRULIOO', 'ID_VERIFY'];
    this.sanctionsProviders = ['OFAC', 'EU_SANCTIONS', 'UN_SANCTIONS', 'UK_SANCTIONS'];
    this._initialized = false;
  }

  async initialize() {
    try {
      this._initialized = true;
      logger.info('ComplianceService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ComplianceService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('ComplianceService closed');
    } catch (error) {
      logger.error('Error closing ComplianceService:', error);
    }
  }

  // Perform KYC verification
  async performKYCVerification(userId, kycData) {
    try {
      const { document_type, document_number, document_image, personal_info } = kycData;
      
      // Document verification
      const documentResult = await this.verifyDocument(document_type, document_number, document_image);
      
      // Identity verification
      const identityResult = await this.verifyIdentity(personal_info, documentResult);
      
      // Address verification
      const addressResult = await this.verifyAddress(personal_info.address);
      
      // PEP (Politically Exposed Person) check
      const pepResult = await this.checkPEP(personal_info);
      
      // Sanctions check
      const sanctionsResult = await this.checkSanctions(personal_info);
      
      // Calculate overall KYC score
      const kycScore = this.calculateKYCScore({
        document: documentResult,
        identity: identityResult,
        address: addressResult,
        pep: pepResult,
        sanctions: sanctionsResult
      });
      
      const kycStatus = this.determineKYCStatus(kycScore);
      
      // Store compliance record
      await this.storeComplianceRecord({
        user_id: userId,
        compliance_type: 'KYC',
        check_type: 'FULL_VERIFICATION',
        status: kycStatus,
        risk_level: this.determineRiskLevel(kycScore),
        check_provider: 'COMBINED',
        check_score: kycScore,
        check_details: {
          document: documentResult,
          identity: identityResult,
          address: addressResult,
          pep: pepResult,
          sanctions: sanctionsResult
        }
      });
      
      // Update user account status
      await this.updateUserKYCStatus(userId, kycStatus);
      
      // Emit event
      this.emit('kycCompleted', {
        user_id: userId,
        status: kycStatus,
        score: kycScore
      });
      
      return {
        status: kycStatus,
        score: kycScore,
        details: {
          document: documentResult,
          identity: identityResult,
          address: addressResult,
          pep: pepResult,
          sanctions: sanctionsResult
        }
      };
    } catch (error) {
      logger.error('Error performing KYC verification:', error);
      throw error;
    }
  }

  // Perform AML screening
  async performAMLScreening(userId, transactionData) {
    try {
      const { amount, currency, transaction_type, counterparty } = transactionData;
      
      // Transaction monitoring
      const transactionResult = await this.monitorTransaction(transactionData);
      
      // Customer screening
      const customerResult = await this.screenCustomer(userId, transactionData);
      
      // Counterparty screening
      const counterpartyResult = await this.screenCounterparty(counterparty);
      
      // Risk assessment
      const riskResult = await this.assessRisk(transactionData, {
        transaction: transactionResult,
        customer: customerResult,
        counterparty: counterpartyResult
      });
      
      // Calculate AML score
      const amlScore = this.calculateAMLScore({
        transaction: transactionResult,
        customer: customerResult,
        counterparty: counterpartyResult,
        risk: riskResult
      });
      
      const amlStatus = this.determineAMLStatus(amlScore);
      
      // Store compliance record
      await this.storeComplianceRecord({
        user_id: userId,
        compliance_type: 'AML',
        check_type: 'TRANSACTION_SCREENING',
        status: amlStatus,
        risk_level: this.determineRiskLevel(amlScore),
        check_provider: 'COMBINED',
        check_score: amlScore,
        check_details: {
          transaction: transactionResult,
          customer: customerResult,
          counterparty: counterpartyResult,
          risk: riskResult
        }
      });
      
      // Emit event
      this.emit('amlScreeningCompleted', {
        user_id: userId,
        status: amlStatus,
        score: amlScore
      });
      
      return {
        status: amlStatus,
        score: amlScore,
        details: {
          transaction: transactionResult,
          customer: customerResult,
          counterparty: counterpartyResult,
          risk: riskResult
        }
      };
    } catch (error) {
      logger.error('Error performing AML screening:', error);
      throw error;
    }
  }

  // Verify document
  async verifyDocument(documentType, documentNumber, documentImage) {
    try {
      const providers = ['JUMIO', 'ONFIDO', 'TRULIOO'];
      const results = [];
      
      for (const provider of providers) {
        try {
          const result = await this.verifyDocumentWithProvider(provider, {
            document_type: documentType,
            document_number: documentNumber,
            document_image: documentImage
          });
          results.push({ provider, result });
        } catch (error) {
          logger.warn(`Document verification failed with ${provider}:`, error.message);
        }
      }
      
      // Combine results
      const combinedResult = this.combineDocumentResults(results);
      
      return {
        verified: combinedResult.verified,
        confidence: combinedResult.confidence,
        document_type: documentType,
        document_number: documentNumber,
        providers: results,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error verifying document:', error);
      throw error;
    }
  }

  // Verify identity
  async verifyIdentity(personalInfo, documentResult) {
    try {
      const { first_name, last_name, date_of_birth, nationality } = personalInfo;
      
      // Cross-reference with document data
      const documentMatch = this.matchDocumentData(personalInfo, documentResult);
      
      // Check against government databases
      const governmentCheck = await this.checkGovernmentDatabase(personalInfo);
      
      // Biometric verification (if available)
      const biometricCheck = await this.verifyBiometrics(personalInfo);
      
      const identityScore = this.calculateIdentityScore({
        document_match: documentMatch,
        government_check: governmentCheck,
        biometric_check: biometricCheck
      });
      
      return {
        verified: identityScore > 0.8,
        confidence: identityScore,
        details: {
          document_match: documentMatch,
          government_check: governmentCheck,
          biometric_check: biometricCheck
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error verifying identity:', error);
      throw error;
    }
  }

  // Verify address
  async verifyAddress(address) {
    try {
      const { street, city, state, postal_code, country } = address;
      
      // Address validation
      const addressValidation = await this.validateAddress(address);
      
      // Utility bill verification
      const utilityVerification = await this.verifyUtilityBill(address);
      
      // Government database check
      const governmentCheck = await this.checkAddressInGovernmentDB(address);
      
      const addressScore = this.calculateAddressScore({
        validation: addressValidation,
        utility: utilityVerification,
        government: governmentCheck
      });
      
      return {
        verified: addressScore > 0.7,
        confidence: addressScore,
        details: {
          validation: addressValidation,
          utility: utilityVerification,
          government: governmentCheck
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error verifying address:', error);
      throw error;
    }
  }

  // Check PEP (Politically Exposed Person)
  async checkPEP(personalInfo) {
    try {
      const { first_name, last_name, date_of_birth, nationality } = personalInfo;
      
      const pepResults = [];
      
      // Check multiple PEP databases
      for (const provider of this.amlProviders) {
        try {
          const result = await this.checkPEPWithProvider(provider, personalInfo);
          pepResults.push({ provider, result });
        } catch (error) {
          logger.warn(`PEP check failed with ${provider}:`, error.message);
        }
      }
      
      const combinedResult = this.combinePEPResults(pepResults);
      
      return {
        is_pep: combinedResult.is_pep,
        confidence: combinedResult.confidence,
        details: combinedResult.details,
        providers: pepResults,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error checking PEP:', error);
      throw error;
    }
  }

  // Check sanctions
  async checkSanctions(personalInfo) {
    try {
      const { first_name, last_name, date_of_birth, nationality } = personalInfo;
      
      const sanctionsResults = [];
      
      // Check multiple sanctions lists
      for (const provider of this.sanctionsProviders) {
        try {
          const result = await this.checkSanctionsWithProvider(provider, personalInfo);
          sanctionsResults.push({ provider, result });
        } catch (error) {
          logger.warn(`Sanctions check failed with ${provider}:`, error.message);
        }
      }
      
      const combinedResult = this.combineSanctionsResults(sanctionsResults);
      
      return {
        is_sanctioned: combinedResult.is_sanctioned,
        confidence: combinedResult.confidence,
        details: combinedResult.details,
        providers: sanctionsResults,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error checking sanctions:', error);
      throw error;
    }
  }

  // Monitor transaction for suspicious activity
  async monitorTransaction(transactionData) {
    try {
      const { amount, currency, transaction_type, frequency, patterns } = transactionData;
      
      // Amount-based monitoring
      const amountCheck = this.checkTransactionAmount(amount, currency, transaction_type);
      
      // Frequency monitoring
      const frequencyCheck = this.checkTransactionFrequency(frequency);
      
      // Pattern analysis
      const patternCheck = this.analyzeTransactionPatterns(patterns);
      
      // Geographic monitoring
      const geographicCheck = this.checkGeographicPatterns(transactionData);
      
      const monitoringScore = this.calculateMonitoringScore({
        amount: amountCheck,
        frequency: frequencyCheck,
        patterns: patternCheck,
        geographic: geographicCheck
      });
      
      return {
        suspicious: monitoringScore > 0.7,
        score: monitoringScore,
        details: {
          amount: amountCheck,
          frequency: frequencyCheck,
          patterns: patternCheck,
          geographic: geographicCheck
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error monitoring transaction:', error);
      throw error;
    }
  }

  // Screen customer
  async screenCustomer(userId, transactionData) {
    try {
      // Get customer profile
      const customerProfile = await this.getCustomerProfile(userId);
      
      // Check customer risk level
      const riskLevel = this.assessCustomerRisk(customerProfile);
      
      // Check customer transaction history
      const transactionHistory = await this.getCustomerTransactionHistory(userId);
      
      // Analyze customer behavior
      const behaviorAnalysis = this.analyzeCustomerBehavior(transactionHistory);
      
      const customerScore = this.calculateCustomerScore({
        risk_level: riskLevel,
        behavior: behaviorAnalysis,
        profile: customerProfile
      });
      
      return {
        risk_level: riskLevel,
        score: customerScore,
        details: {
          profile: customerProfile,
          behavior: behaviorAnalysis,
          history: transactionHistory
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error screening customer:', error);
      throw error;
    }
  }

  // Screen counterparty
  async screenCounterparty(counterparty) {
    try {
      if (!counterparty) {
        return { verified: true, score: 0, details: {} };
      }
      
      // Check counterparty in sanctions lists
      const sanctionsCheck = await this.checkSanctions(counterparty);
      
      // Check counterparty in PEP lists
      const pepCheck = await this.checkPEP(counterparty);
      
      // Check counterparty risk profile
      const riskProfile = this.assessCounterpartyRisk(counterparty);
      
      const counterpartyScore = this.calculateCounterpartyScore({
        sanctions: sanctionsCheck,
        pep: pepCheck,
        risk: riskProfile
      });
      
      return {
        verified: counterpartyScore < 0.5,
        score: counterpartyScore,
        details: {
          sanctions: sanctionsCheck,
          pep: pepCheck,
          risk: riskProfile
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error screening counterparty:', error);
      throw error;
    }
  }

  // Assess risk
  async assessRisk(transactionData, screeningResults) {
    try {
      const { amount, currency, transaction_type } = transactionData;
      const { transaction, customer, counterparty } = screeningResults;
      
      // Calculate risk factors
      const riskFactors = {
        amount_risk: this.calculateAmountRisk(amount, currency),
        frequency_risk: this.calculateFrequencyRisk(transactionData),
        geographic_risk: this.calculateGeographicRisk(transactionData),
        customer_risk: customer.score,
        counterparty_risk: counterparty.score,
        transaction_risk: transaction.score
      };
      
      // Calculate overall risk score
      const overallRisk = this.calculateOverallRisk(riskFactors);
      
      return {
        overall_risk: overallRisk,
        risk_level: this.determineRiskLevel(overallRisk),
        factors: riskFactors,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error assessing risk:', error);
      throw error;
    }
  }

  // Store compliance record
  async storeComplianceRecord(recordData) {
    try {
      await pool.query(`
        INSERT INTO compliance_records (
          user_id, compliance_type, check_type, status, risk_level,
          check_provider, check_score, check_details, flags, alerts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        recordData.user_id,
        recordData.compliance_type,
        recordData.check_type,
        recordData.status,
        recordData.risk_level,
        recordData.check_provider,
        recordData.check_score,
        JSON.stringify(recordData.check_details),
        JSON.stringify(recordData.flags || []),
        JSON.stringify(recordData.alerts || [])
      ]);
    } catch (error) {
      logger.error('Error storing compliance record:', error);
      throw error;
    }
  }

  // Update user KYC status
  async updateUserKYCStatus(userId, status) {
    try {
      await pool.query(`
        UPDATE cash_accounts 
        SET kyc_status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2
      `, [status, userId]);
    } catch (error) {
      logger.error('Error updating user KYC status:', error);
      throw error;
    }
  }

  // Calculate KYC score
  calculateKYCScore(results) {
    const weights = {
      document: 0.3,
      identity: 0.3,
      address: 0.2,
      pep: 0.1,
      sanctions: 0.1
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].confidence || 0) * weight;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  // Calculate AML score
  calculateAMLScore(results) {
    const weights = {
      transaction: 0.4,
      customer: 0.3,
      counterparty: 0.2,
      risk: 0.1
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].score || 0) * weight;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  // Determine KYC status
  determineKYCStatus(score) {
    if (score >= 0.8) return 'verified';
    if (score >= 0.6) return 'pending';
    return 'rejected';
  }

  // Determine AML status
  determineAMLStatus(score) {
    if (score >= 0.7) return 'flagged';
    if (score >= 0.4) return 'review';
    return 'cleared';
  }

  // Determine risk level
  determineRiskLevel(score) {
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  // Helper methods for document verification
  async verifyDocumentWithProvider(provider, documentData) {
    // This would integrate with actual document verification providers
    // For now, return mock data
    return {
      verified: true,
      confidence: 0.9,
      document_type: documentData.document_type,
      document_number: documentData.document_number
    };
  }

  combineDocumentResults(results) {
    if (results.length === 0) {
      return { verified: false, confidence: 0 };
    }
    
    const verifiedCount = results.filter(r => r.result.verified).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length;
    
    return {
      verified: verifiedCount > results.length / 2,
      confidence: avgConfidence
    };
  }

  // Helper methods for identity verification
  matchDocumentData(personalInfo, documentResult) {
    // Simple matching logic
    return {
      name_match: true,
      dob_match: true,
      nationality_match: true
    };
  }

  async checkGovernmentDatabase(personalInfo) {
    // Mock government database check
    return {
      verified: true,
      confidence: 0.8
    };
  }

  async verifyBiometrics(personalInfo) {
    // Mock biometric verification
    return {
      verified: false,
      confidence: 0
    };
  }

  calculateIdentityScore(results) {
    const weights = { document_match: 0.4, government_check: 0.4, biometric_check: 0.2 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].confidence || 0) * weight;
    }
    return score;
  }

  // Helper methods for address verification
  async validateAddress(address) {
    // Mock address validation
    return { valid: true, confidence: 0.8 };
  }

  async verifyUtilityBill(address) {
    // Mock utility bill verification
    return { verified: false, confidence: 0 };
  }

  async checkAddressInGovernmentDB(address) {
    // Mock government database check
    return { verified: true, confidence: 0.7 };
  }

  calculateAddressScore(results) {
    const weights = { validation: 0.4, utility: 0.3, government: 0.3 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].confidence || 0) * weight;
    }
    return score;
  }

  // Helper methods for PEP checking
  async checkPEPWithProvider(provider, personalInfo) {
    // Mock PEP check
    return {
      is_pep: false,
      confidence: 0.9,
      details: {}
    };
  }

  combinePEPResults(results) {
    const isPEP = results.some(r => r.result.is_pep);
    const avgConfidence = results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length;
    
    return {
      is_pep: isPEP,
      confidence: avgConfidence,
      details: results
    };
  }

  // Helper methods for sanctions checking
  async checkSanctionsWithProvider(provider, personalInfo) {
    // Mock sanctions check
    return {
      is_sanctioned: false,
      confidence: 0.9,
      details: {}
    };
  }

  combineSanctionsResults(results) {
    const isSanctioned = results.some(r => r.result.is_sanctioned);
    const avgConfidence = results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length;
    
    return {
      is_sanctioned: isSanctioned,
      confidence: avgConfidence,
      details: results
    };
  }

  // Helper methods for transaction monitoring
  checkTransactionAmount(amount, currency, transactionType) {
    // Mock amount checking
    const thresholds = {
      'PKR': { deposit: 1000000, withdrawal: 1000000 },
      'USD': { deposit: 10000, withdrawal: 10000 },
      'EUR': { deposit: 10000, withdrawal: 10000 }
    };
    
    const threshold = thresholds[currency]?.[transactionType] || 10000;
    return {
      exceeds_threshold: amount > threshold,
      threshold: threshold,
      risk_score: amount > threshold ? 0.8 : 0.2
    };
  }

  checkTransactionFrequency(frequency) {
    // Mock frequency checking
    return {
      frequency_risk: frequency > 10 ? 0.8 : 0.2,
      daily_count: frequency
    };
  }

  analyzeTransactionPatterns(patterns) {
    // Mock pattern analysis
    return {
      pattern_risk: 0.3,
      anomalies: []
    };
  }

  checkGeographicPatterns(transactionData) {
    // Mock geographic checking
    return {
      geographic_risk: 0.2,
      country_risk: 'LOW'
    };
  }

  calculateMonitoringScore(results) {
    const weights = { amount: 0.3, frequency: 0.3, patterns: 0.2, geographic: 0.2 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].risk_score || results[key].pattern_risk || results[key].geographic_risk || 0) * weight;
    }
    return score;
  }

  // Helper methods for customer screening
  async getCustomerProfile(userId) {
    // Mock customer profile
    return {
      user_id: userId,
      risk_level: 'LOW',
      account_age: 30,
      transaction_count: 50
    };
  }

  assessCustomerRisk(profile) {
    // Mock customer risk assessment
    return profile.risk_level === 'HIGH' ? 0.8 : 0.2;
  }

  async getCustomerTransactionHistory(userId) {
    // Mock transaction history
    return [];
  }

  analyzeCustomerBehavior(history) {
    // Mock behavior analysis
    return {
      behavior_score: 0.3,
      anomalies: []
    };
  }

  calculateCustomerScore(results) {
    const weights = { risk_level: 0.5, behavior: 0.3, profile: 0.2 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key] || 0) * weight;
    }
    return score;
  }

  // Helper methods for counterparty screening
  assessCounterpartyRisk(counterparty) {
    // Mock counterparty risk assessment
    return 0.2;
  }

  calculateCounterpartyScore(results) {
    const weights = { sanctions: 0.4, pep: 0.3, risk: 0.3 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (results[key].score || 0) * weight;
    }
    return score;
  }

  // Helper methods for risk assessment
  calculateAmountRisk(amount, currency) {
    const thresholds = {
      'PKR': 1000000,
      'USD': 10000,
      'EUR': 10000
    };
    
    const threshold = thresholds[currency] || 10000;
    return amount > threshold ? 0.8 : 0.2;
  }

  calculateFrequencyRisk(transactionData) {
    return transactionData.frequency > 10 ? 0.8 : 0.2;
  }

  calculateGeographicRisk(transactionData) {
    return 0.2; // Mock geographic risk
  }

  calculateOverallRisk(factors) {
    const weights = {
      amount_risk: 0.2,
      frequency_risk: 0.2,
      geographic_risk: 0.1,
      customer_risk: 0.3,
      counterparty_risk: 0.1,
      transaction_risk: 0.1
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (factors[key] || 0) * weight;
    }
    
    return Math.min(1, Math.max(0, score));
  }
}

module.exports = ComplianceService;
