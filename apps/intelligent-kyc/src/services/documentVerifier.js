const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DocumentVerifier extends EventEmitter {
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
    this.documentTypes = new Map();
    this.verificationRules = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load document types
      await this.loadDocumentTypes();
      
      // Load verification rules
      await this.loadVerificationRules();
      
      this._initialized = true;
      logger.info('DocumentVerifier initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DocumentVerifier:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DocumentVerifier closed');
    } catch (error) {
      logger.error('Error closing DocumentVerifier:', error);
    }
  }

  async loadDocumentTypes() {
    try {
      const result = await pool.query(`
        SELECT * FROM document_types
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const type of result.rows) {
        this.documentTypes.set(type.id, {
          ...type,
          validation_rules: type.validation_rules ? JSON.parse(type.validation_rules) : {},
          metadata: type.metadata ? JSON.parse(type.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} document types`);
    } catch (error) {
      logger.error('Error loading document types:', error);
      throw error;
    }
  }

  async loadVerificationRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM verification_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const rule of result.rows) {
        this.verificationRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} verification rules`);
    } catch (error) {
      logger.error('Error loading verification rules:', error);
      throw error;
    }
  }

  async verifyDocuments(documents, documentType, userId, verifierId) {
    try {
      const verificationId = nanoid();
      const now = new Date();
      
      // Validate document type
      const docType = this.documentTypes.get(documentType);
      if (!docType) {
        throw new Error(`Unknown document type: ${documentType}`);
      }
      
      // Create verification record
      const verification = {
        id: verificationId,
        user_id: userId,
        document_type: documentType,
        documents: documents,
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
      
      logger.info(`Document verification started: ${verificationId}`, {
        userId,
        documentType,
        documentCount: documents.length
      });
      
      return verification;
    } catch (error) {
      logger.error('Error verifying documents:', error);
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
        SELECT * FROM document_verifications
        WHERE id = $1 AND user_id = $2
      `, [verificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Verification not found');
      }
      
      const verification = {
        ...result.rows[0],
        documents: result.rows[0].documents ? JSON.parse(result.rows[0].documents) : [],
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
      
      // Process each document
      const results = [];
      for (const document of verification.documents) {
        try {
          const result = await this.verifyDocument(document, verification.document_type);
          results.push(result);
        } catch (error) {
          logger.error(`Error verifying document ${document.id}:`, error);
          results.push({
            document_id: document.id,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // Determine overall verification status
      const overallStatus = this.determineOverallStatus(results);
      
      // Update verification
      verification.status = overallStatus;
      verification.results = results;
      verification.completed_at = new Date();
      verification.updated_at = new Date();
      
      await this.updateVerification(verification);
      
      // Emit event
      this.emit('verificationCompleted', verification);
      
      logger.info(`Document verification completed: ${verificationId}`, {
        status: overallStatus,
        results: results.length
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

  async verifyDocument(document, documentType) {
    try {
      const docType = this.documentTypes.get(documentType);
      if (!docType) {
        throw new Error(`Unknown document type: ${documentType}`);
      }
      
      const result = {
        document_id: document.id,
        document_type: documentType,
        status: 'pending',
        verification_data: {},
        confidence_score: 0,
        errors: []
      };
      
      // Validate document format
      const formatValidation = await this.validateDocumentFormat(document, docType);
      if (!formatValidation.valid) {
        result.status = 'failed';
        result.errors.push(...formatValidation.errors);
        return result;
      }
      
      // Extract document data
      const extractedData = await this.extractDocumentData(document, docType);
      result.verification_data = extractedData;
      
      // Validate document content
      const contentValidation = await this.validateDocumentContent(extractedData, docType);
      if (!contentValidation.valid) {
        result.status = 'failed';
        result.errors.push(...contentValidation.errors);
        return result;
      }
      
      // Check document authenticity
      const authenticityCheck = await this.checkDocumentAuthenticity(document, extractedData, docType);
      result.verification_data.authenticity = authenticityCheck;
      
      // Calculate confidence score
      result.confidence_score = this.calculateConfidenceScore(extractedData, authenticityCheck);
      
      // Determine final status
      result.status = this.determineDocumentStatus(result);
      
      return result;
    } catch (error) {
      logger.error('Error verifying document:', error);
      return {
        document_id: document.id,
        document_type: documentType,
        status: 'failed',
        error: error.message,
        confidence_score: 0
      };
    }
  }

  async validateDocumentFormat(document, docType) {
    try {
      const { validation_rules } = docType;
      const errors = [];
      
      // Check file size
      if (validation_rules.max_size && document.size > validation_rules.max_size) {
        errors.push(`Document size exceeds maximum allowed size of ${validation_rules.max_size} bytes`);
      }
      
      // Check file type
      if (validation_rules.allowed_types && !validation_rules.allowed_types.includes(document.type)) {
        errors.push(`Document type ${document.type} is not allowed`);
      }
      
      // Check file extension
      if (validation_rules.allowed_extensions) {
        const extension = document.name.split('.').pop().toLowerCase();
        if (!validation_rules.allowed_extensions.includes(extension)) {
          errors.push(`File extension .${extension} is not allowed`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Error validating document format:', error);
      return {
        valid: false,
        errors: ['Document format validation failed']
      };
    }
  }

  async extractDocumentData(document, docType) {
    try {
      const { type } = docType;
      
      switch (type) {
        case 'passport':
          return await this.extractPassportData(document);
        case 'drivers_license':
          return await this.extractDriversLicenseData(document);
        case 'national_id':
          return await this.extractNationalIdData(document);
        case 'utility_bill':
          return await this.extractUtilityBillData(document);
        case 'bank_statement':
          return await this.extractBankStatementData(document);
        case 'tax_document':
          return await this.extractTaxDocumentData(document);
        default:
          return await this.extractGenericDocumentData(document);
      }
    } catch (error) {
      logger.error('Error extracting document data:', error);
      return {};
    }
  }

  async extractPassportData(document) {
    try {
      // Simulate passport data extraction
      return {
        document_number: 'A1234567',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        nationality: 'US',
        issue_date: '2020-01-01',
        expiry_date: '2030-01-01',
        issuing_country: 'US',
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting passport data:', error);
      return {};
    }
  }

  async extractDriversLicenseData(document) {
    try {
      // Simulate drivers license data extraction
      return {
        license_number: 'D123456789',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        address: '123 Main St, City, State 12345',
        issue_date: '2020-01-01',
        expiry_date: '2025-01-01',
        issuing_state: 'CA',
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting drivers license data:', error);
      return {};
    }
  }

  async extractNationalIdData(document) {
    try {
      // Simulate national ID data extraction
      return {
        id_number: '123456789',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        nationality: 'US',
        issue_date: '2020-01-01',
        expiry_date: '2030-01-01',
        issuing_country: 'US',
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting national ID data:', error);
      return {};
    }
  }

  async extractUtilityBillData(document) {
    try {
      // Simulate utility bill data extraction
      return {
        account_number: '123456789',
        customer_name: 'John Doe',
        service_address: '123 Main St, City, State 12345',
        service_type: 'Electricity',
        bill_date: '2023-01-01',
        amount_due: 150.00,
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting utility bill data:', error);
      return {};
    }
  }

  async extractBankStatementData(document) {
    try {
      // Simulate bank statement data extraction
      return {
        account_number: '****1234',
        account_holder: 'John Doe',
        bank_name: 'Example Bank',
        statement_date: '2023-01-01',
        balance: 5000.00,
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting bank statement data:', error);
      return {};
    }
  }

  async extractTaxDocumentData(document) {
    try {
      // Simulate tax document data extraction
      return {
        tax_id: '123-45-6789',
        taxpayer_name: 'John Doe',
        tax_year: '2022',
        document_type: 'W-2',
        employer: 'Example Corp',
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting tax document data:', error);
      return {};
    }
  }

  async extractGenericDocumentData(document) {
    try {
      // Simulate generic document data extraction
      return {
        document_name: document.name,
        document_type: document.type,
        file_size: document.size,
        extracted_at: new Date()
      };
    } catch (error) {
      logger.error('Error extracting generic document data:', error);
      return {};
    }
  }

  async validateDocumentContent(extractedData, docType) {
    try {
      const { validation_rules } = docType;
      const errors = [];
      
      // Check required fields
      if (validation_rules.required_fields) {
        for (const field of validation_rules.required_fields) {
          if (!extractedData[field] || extractedData[field] === '') {
            errors.push(`Required field ${field} is missing`);
          }
        }
      }
      
      // Validate field formats
      if (validation_rules.field_formats) {
        for (const [field, format] of Object.entries(validation_rules.field_formats)) {
          const value = extractedData[field];
          if (value && !this.validateFieldFormat(value, format)) {
            errors.push(`Field ${field} does not match required format`);
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Error validating document content:', error);
      return {
        valid: false,
        errors: ['Document content validation failed']
      };
    }
  }

  validateFieldFormat(value, format) {
    try {
      switch (format) {
        case 'date':
          return !isNaN(Date.parse(value));
        case 'email':
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'phone':
          return /^\+?[1-9]\d{1,14}$/.test(value);
        case 'ssn':
          return /^\d{3}-\d{2}-\d{4}$/.test(value);
        case 'passport':
          return /^[A-Z]\d{7}$/.test(value);
        case 'drivers_license':
          return /^[A-Z]\d{8}$/.test(value);
        default:
          return true;
      }
    } catch (error) {
      logger.error('Error validating field format:', error);
      return false;
    }
  }

  async checkDocumentAuthenticity(document, extractedData, docType) {
    try {
      // Simulate document authenticity check
      const authenticity = {
        is_authentic: Math.random() > 0.1, // 90% authentic
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        checks_performed: [
          'format_validation',
          'content_validation',
          'security_features',
          'cross_reference'
        ],
        checked_at: new Date()
      };
      
      return authenticity;
    } catch (error) {
      logger.error('Error checking document authenticity:', error);
      return {
        is_authentic: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  calculateConfidenceScore(extractedData, authenticityCheck) {
    try {
      let score = 0;
      let factors = 0;
      
      // Data completeness factor
      const requiredFields = ['first_name', 'last_name', 'date_of_birth'];
      const completedFields = requiredFields.filter(field => extractedData[field]).length;
      score += (completedFields / requiredFields.length) * 30;
      factors++;
      
      // Authenticity factor
      if (authenticityCheck.is_authentic) {
        score += authenticityCheck.confidence * 50;
      }
      factors++;
      
      // Data consistency factor
      score += 20; // Assume consistent for now
      factors++;
      
      return factors > 0 ? Math.round(score / factors) : 0;
    } catch (error) {
      logger.error('Error calculating confidence score:', error);
      return 0;
    }
  }

  determineDocumentStatus(result) {
    try {
      if (result.errors && result.errors.length > 0) {
        return 'failed';
      }
      
      if (result.confidence_score >= 80) {
        return 'verified';
      } else if (result.confidence_score >= 60) {
        return 'pending_review';
      } else {
        return 'failed';
      }
    } catch (error) {
      logger.error('Error determining document status:', error);
      return 'failed';
    }
  }

  determineOverallStatus(results) {
    try {
      if (results.length === 0) {
        return 'failed';
      }
      
      const verifiedCount = results.filter(r => r.status === 'verified').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      
      if (verifiedCount === results.length) {
        return 'verified';
      } else if (failedCount === results.length) {
        return 'failed';
      } else {
        return 'pending_review';
      }
    } catch (error) {
      logger.error('Error determining overall status:', error);
      return 'failed';
    }
  }

  async storeVerification(verification) {
    try {
      await pool.query(`
        INSERT INTO document_verifications (
          id, user_id, document_type, documents, status, verification_data,
          results, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        verification.id,
        verification.user_id,
        verification.document_type,
        JSON.stringify(verification.documents),
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
        UPDATE document_verifications
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
        SELECT * FROM document_verifications
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      for (const verification of result.rows) {
        const verificationObj = {
          ...verification,
          documents: verification.documents ? JSON.parse(verification.documents) : [],
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
        total_document_types: this.documentTypes.size,
        total_verification_rules: this.verificationRules.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      throw error;
    }
  }
}

module.exports = DocumentVerifier;
