const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class IdentityVerifier extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.verifications = new Map();
    this.identityProviders = new Map();
    this.verificationMethods = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load identity providers
      await this.loadIdentityProviders();
      
      // Load verification methods
      await this.loadVerificationMethods();
      
      this._initialized = true;
      logger.info('IdentityVerifier initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IdentityVerifier:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('IdentityVerifier closed');
    } catch (error) {
      logger.error('Error closing IdentityVerifier:', error);
    }
  }

  async loadIdentityProviders() {
    try {
      const result = await pool.query(`
        SELECT * FROM identity_providers
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const provider of result.rows) {
        this.identityProviders.set(provider.id, {
          ...provider,
          config: provider.config ? JSON.parse(provider.config) : {},
          capabilities: provider.capabilities ? JSON.parse(provider.capabilities) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} identity providers`);
    } catch (error) {
      logger.error('Error loading identity providers:', error);
      throw error;
    }
  }

  async loadVerificationMethods() {
    try {
      const result = await pool.query(`
        SELECT * FROM verification_methods
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const method of result.rows) {
        this.verificationMethods.set(method.id, {
          ...method,
          config: method.config ? JSON.parse(method.config) : {},
          requirements: method.requirements ? JSON.parse(method.requirements) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} verification methods`);
    } catch (error) {
      logger.error('Error loading verification methods:', error);
      throw error;
    }
  }

  async verifyIdentity(identityData, verificationMethod, userId, verifierId) {
    try {
      const verificationId = nanoid();
      const now = new Date();
      
      // Validate verification method
      const method = this.verificationMethods.get(verificationMethod);
      if (!method) {
        throw new Error(`Unknown verification method: ${verificationMethod}`);
      }
      
      // Create verification record
      const verification = {
        id: verificationId,
        user_id: userId,
        verification_method: verificationMethod,
        identity_data: identityData,
        status: 'pending',
        verification_data: {},
        results: {},
        created_by: verifierId,
        created_at: now,
        updated_at: now,
        completed_at: null
      };
      
      // Store verification
      await this.storeVerification(verification);
      
      // Cache verification
      this.verifications.set(verificationId, verification);
      
      // Process verification asynchronously
      this.processVerification(verificationId);
      
      logger.info(`Identity verification started: ${verificationId}`, {
        userId,
        verificationMethod,
        identityDataKeys: Object.keys(identityData)
      });
      
      return verification;
    } catch (error) {
      logger.error('Error verifying identity:', error);
      throw error;
    }
  }

  async getVerification(verificationId, userId) {
    try {
      // Check cache first
      if (this.verifications.has(verificationId)) {
        return this.verifications.get(verificationId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM identity_verifications
        WHERE id = $1 AND user_id = $2
      `, [verificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Verification not found');
      }
      
      const verification = {
        ...result.rows[0],
        identity_data: result.rows[0].identity_data ? JSON.parse(result.rows[0].identity_data) : {},
        verification_data: result.rows[0].verification_data ? JSON.parse(result.rows[0].verification_data) : {},
        results: result.rows[0].results ? JSON.parse(result.rows[0].results) : {}
      };
      
      // Cache verification
      this.verifications.set(verificationId, verification);
      
      return verification;
    } catch (error) {
      logger.error('Error getting verification:', error);
      throw error;
    }
  }

  async processVerification(verificationId) {
    try {
      const verification = this.verifications.get(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }
      
      // Update status to processing
      verification.status = 'processing';
      verification.updated_at = new Date();
      
      await this.updateVerification(verification);
      
      // Process verification based on method
      const result = await this.processVerificationMethod(verification);
      
      // Update verification
      verification.status = result.status;
      verification.verification_data = result.verification_data;
      verification.results = result.results;
      verification.completed_at = new Date();
      verification.updated_at = new Date();
      
      await this.updateVerification(verification);
      
      // Emit event
      this.emit('verificationCompleted', verification);
      
      logger.info(`Identity verification completed: ${verificationId}`, {
        status: result.status,
        method: verification.verification_method
      });
      
    } catch (error) {
      logger.error(`Error processing verification ${verificationId}:`, error);
      
      // Update verification with error
      const verification = this.verifications.get(verificationId);
      if (verification) {
        verification.status = 'failed';
        verification.error = error.message;
        verification.updated_at = new Date();
        await this.updateVerification(verification);
      }
    }
  }

  async processVerificationMethod(verification) {
    try {
      const { verification_method } = verification;
      const method = this.verificationMethods.get(verification_method);
      
      switch (verification_method) {
        case 'biometric_verification':
          return await this.processBiometricVerification(verification, method);
        case 'knowledge_based_verification':
          return await this.processKnowledgeBasedVerification(verification, method);
        case 'document_verification':
          return await this.processDocumentVerification(verification, method);
        case 'address_verification':
          return await this.processAddressVerification(verification, method);
        case 'phone_verification':
          return await this.processPhoneVerification(verification, method);
        case 'email_verification':
          return await this.processEmailVerification(verification, method);
        case 'social_verification':
          return await this.processSocialVerification(verification, method);
        case 'government_verification':
          return await this.processGovernmentVerification(verification, method);
        default:
          throw new Error(`Unknown verification method: ${verification_method}`);
      }
    } catch (error) {
      logger.error('Error processing verification method:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processBiometricVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { biometric_data } = identity_data;
      
      if (!biometric_data) {
        throw new Error('Biometric data is required');
      }
      
      // Simulate biometric verification
      const result = {
        status: 'verified',
        verification_data: {
          biometric_type: biometric_data.type,
          confidence_score: Math.random() * 0.3 + 0.7, // 70-100%
          verification_method: 'biometric',
          verified_at: new Date()
        },
        results: {
          match_score: Math.random() * 0.2 + 0.8, // 80-100%
          liveness_detected: true,
          quality_score: Math.random() * 0.2 + 0.8 // 80-100%
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing biometric verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processKnowledgeBasedVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { kba_answers } = identity_data;
      
      if (!kba_answers || !Array.isArray(kba_answers)) {
        throw new Error('Knowledge-based answers are required');
      }
      
      // Simulate knowledge-based verification
      const correctAnswers = kba_answers.filter(answer => answer.is_correct).length;
      const totalAnswers = kba_answers.length;
      const accuracy = correctAnswers / totalAnswers;
      
      const result = {
        status: accuracy >= 0.8 ? 'verified' : 'failed',
        verification_data: {
          verification_method: 'knowledge_based',
          accuracy_score: accuracy,
          total_questions: totalAnswers,
          correct_answers: correctAnswers,
          verified_at: new Date()
        },
        results: {
          accuracy: accuracy,
          passed: accuracy >= 0.8,
          questions_answered: totalAnswers
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing knowledge-based verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processDocumentVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { document_data } = identity_data;
      
      if (!document_data) {
        throw new Error('Document data is required');
      }
      
      // Simulate document verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'document',
          document_type: document_data.type,
          document_number: document_data.number,
          verified_at: new Date()
        },
        results: {
          document_valid: true,
          authenticity_score: Math.random() * 0.2 + 0.8, // 80-100%
          data_extracted: true
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing document verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processAddressVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { address_data } = identity_data;
      
      if (!address_data) {
        throw new Error('Address data is required');
      }
      
      // Simulate address verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'address',
          address_verified: true,
          verified_at: new Date()
        },
        results: {
          address_valid: true,
          delivery_confirmed: true,
          address_score: Math.random() * 0.2 + 0.8 // 80-100%
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing address verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processPhoneVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { phone_data } = identity_data;
      
      if (!phone_data) {
        throw new Error('Phone data is required');
      }
      
      // Simulate phone verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'phone',
          phone_number: phone_data.number,
          verified_at: new Date()
        },
        results: {
          phone_valid: true,
          carrier_verified: true,
          line_type: 'mobile'
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing phone verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processEmailVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { email_data } = identity_data;
      
      if (!email_data) {
        throw new Error('Email data is required');
      }
      
      // Simulate email verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'email',
          email_address: email_data.address,
          verified_at: new Date()
        },
        results: {
          email_valid: true,
          domain_verified: true,
          deliverable: true
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing email verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processSocialVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { social_data } = identity_data;
      
      if (!social_data) {
        throw new Error('Social data is required');
      }
      
      // Simulate social verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'social',
          social_platform: social_data.platform,
          verified_at: new Date()
        },
        results: {
          social_valid: true,
          profile_verified: true,
          account_age: Math.floor(Math.random() * 5) + 1 // 1-5 years
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing social verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async processGovernmentVerification(verification, method) {
    try {
      const { identity_data } = verification;
      const { government_data } = identity_data;
      
      if (!government_data) {
        throw new Error('Government data is required');
      }
      
      // Simulate government verification
      const result = {
        status: 'verified',
        verification_data: {
          verification_method: 'government',
          government_id: government_data.id,
          verified_at: new Date()
        },
        results: {
          government_valid: true,
          id_verified: true,
          status_active: true
        }
      };
      
      return result;
    } catch (error) {
      logger.error('Error processing government verification:', error);
      return {
        status: 'failed',
        verification_data: {},
        results: { error: error.message }
      };
    }
  }

  async storeVerification(verification) {
    try {
      await pool.query(`
        INSERT INTO identity_verifications (
          id, user_id, verification_method, identity_data, status,
          verification_data, results, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        verification.id,
        verification.user_id,
        verification.verification_method,
        JSON.stringify(verification.identity_data),
        verification.status,
        JSON.stringify(verification.verification_data),
        JSON.stringify(verification.results),
        verification.created_by,
        verification.created_at,
        verification.updated_at,
        verification.completed_at
      ]);
    } catch (error) {
      logger.error('Error storing verification:', error);
      throw error;
    }
  }

  async updateVerification(verification) {
    try {
      await pool.query(`
        UPDATE identity_verifications
        SET status = $1, verification_data = $2, results = $3,
            updated_at = $4, completed_at = $5
        WHERE id = $6
      `, [
        verification.status,
        JSON.stringify(verification.verification_data),
        JSON.stringify(verification.results),
        verification.updated_at,
        verification.completed_at,
        verification.id
      ]);
    } catch (error) {
      logger.error('Error updating verification:', error);
      throw error;
    }
  }

  async processPendingVerifications() {
    try {
      const result = await pool.query(`
        SELECT * FROM identity_verifications
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      for (const verification of result.rows) {
        const verificationObj = {
          ...verification,
          identity_data: verification.identity_data ? JSON.parse(verification.identity_data) : {},
          verification_data: verification.verification_data ? JSON.parse(verification.verification_data) : {},
          results: verification.results ? JSON.parse(verification.results) : {}
        };
        
        this.verifications.set(verification.id, verificationObj);
        await this.processVerification(verification.id);
      }
      
      logger.info(`Processed ${result.rows.length} pending verifications`);
    } catch (error) {
      logger.error('Error processing pending verifications:', error);
    }
  }

  async getVerificationStats() {
    try {
      const stats = {
        total_verifications: this.verifications.size,
        pending_verifications: Array.from(this.verifications.values()).filter(v => v.status === 'pending').length,
        processing_verifications: Array.from(this.verifications.values()).filter(v => v.status === 'processing').length,
        verified_verifications: Array.from(this.verifications.values()).filter(v => v.status === 'verified').length,
        failed_verifications: Array.from(this.verifications.values()).filter(v => v.status === 'failed').length,
        total_identity_providers: this.identityProviders.size,
        total_verification_methods: this.verificationMethods.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      throw error;
    }
  }
}

module.exports = IdentityVerifier;
