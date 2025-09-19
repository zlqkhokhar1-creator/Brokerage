const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const validator = require('validator');
const crypto = require('crypto');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

class KYCService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.verificationMethods = new Map();
    this.kycStatuses = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadVerificationMethods();
      logger.info('KYC Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KYC Service:', error);
      throw error;
    }
  }

  async loadVerificationMethods() {
    try {
      const methods = [
        {
          id: 'document_verification',
          name: 'Document Verification',
          description: 'Verify identity documents (passport, driver license, etc.)',
          enabled: true,
          required: true
        },
        {
          id: 'address_verification',
          name: 'Address Verification',
          description: 'Verify residential address',
          enabled: true,
          required: true
        },
        {
          id: 'phone_verification',
          name: 'Phone Verification',
          description: 'Verify phone number via SMS',
          enabled: true,
          required: true
        },
        {
          id: 'email_verification',
          name: 'Email Verification',
          description: 'Verify email address',
          enabled: true,
          required: true
        },
        {
          id: 'biometric_verification',
          name: 'Biometric Verification',
          description: 'Verify identity using biometric data',
          enabled: false,
          required: false
        },
        {
          id: 'pep_screening',
          name: 'PEP Screening',
          description: 'Screen for Politically Exposed Persons',
          enabled: true,
          required: true
        },
        {
          id: 'sanctions_screening',
          name: 'Sanctions Screening',
          description: 'Screen against sanctions lists',
          enabled: true,
          required: true
        },
        {
          id: 'adverse_media_screening',
          name: 'Adverse Media Screening',
          description: 'Screen for adverse media coverage',
          enabled: true,
          required: false
        }
      ];

      for (const method of methods) {
        this.verificationMethods.set(method.id, method);
      }

      logger.info(`Loaded ${methods.length} verification methods`);
    } catch (error) {
      logger.error('Error loading verification methods:', error);
    }
  }

  async verifyCustomer(data, user) {
    try {
      const { customerId, customerData, documents, verificationMethods } = data;
      const startTime = Date.now();
      
      const verification = {
        id: uuidv4(),
        customerId,
        userId: user.id,
        status: 'pending',
        methods: verificationMethods || Object.keys(this.verificationMethods),
        results: {},
        score: 0,
        createdAt: new Date(),
        completedAt: null,
        metadata: {}
      };
      
      // Store verification record
      await this.storeVerification(verification);
      this.kycStatuses.set(customerId, verification);
      
      try {
        // Run verification methods
        for (const methodId of verification.methods) {
          const method = this.verificationMethods.get(methodId);
          if (!method || !method.enabled) continue;
          
          try {
            const result = await this.runVerificationMethod(methodId, {
              customerData,
              documents,
              customerId,
              userId: user.id
            });
            
            verification.results[methodId] = result;
          } catch (error) {
            logger.error(`Error running verification method ${methodId}:`, error);
            verification.results[methodId] = {
              status: 'failed',
              error: error.message
            };
          }
        }
        
        // Calculate overall verification score
        verification.score = this.calculateVerificationScore(verification.results);
        
        // Determine overall status
        verification.status = this.determineVerificationStatus(verification.results, verification.score);
        
        // Update verification record
        verification.completedAt = new Date();
        await this.updateVerification(verification);
        
        logger.performance('KYC verification', Date.now() - startTime, {
          customerId,
          methods: verification.methods.length,
          score: verification.score,
          status: verification.status
        });
        
        this.emit('kycStatusChanged', {
          customerId,
          status: verification.status,
          score: verification.score,
          userId: user.id
        });
        
        return verification;
      } catch (error) {
        verification.status = 'failed';
        verification.error = error.message;
        await this.updateVerification(verification);
        throw error;
      }
    } catch (error) {
      logger.error('Error verifying customer:', error);
      throw error;
    }
  }

  async runVerificationMethod(methodId, data) {
    try {
      const { customerData, documents, customerId, userId } = data;
      
      switch (methodId) {
        case 'document_verification':
          return await this.verifyDocuments(documents, customerData);
        case 'address_verification':
          return await this.verifyAddress(customerData.address);
        case 'phone_verification':
          return await this.verifyPhone(customerData.phone);
        case 'email_verification':
          return await this.verifyEmail(customerData.email);
        case 'biometric_verification':
          return await this.verifyBiometrics(customerData.biometrics);
        case 'pep_screening':
          return await this.screenPEP(customerData);
        case 'sanctions_screening':
          return await this.screenSanctions(customerData);
        case 'adverse_media_screening':
          return await this.screenAdverseMedia(customerData);
        default:
          return {
            status: 'skipped',
            reason: 'Unknown verification method'
          };
      }
    } catch (error) {
      logger.error(`Error running verification method ${methodId}:`, error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyDocuments(documents, customerData) {
    try {
      const results = {
        status: 'pending',
        verifiedDocuments: [],
        failedDocuments: [],
        score: 0
      };
      
      for (const doc of documents) {
        try {
          const docResult = await this.verifyDocument(doc, customerData);
          if (docResult.status === 'verified') {
            results.verifiedDocuments.push(docResult);
            results.score += docResult.score;
          } else {
            results.failedDocuments.push(docResult);
          }
        } catch (error) {
          logger.error(`Error verifying document ${doc.type}:`, error);
          results.failedDocuments.push({
            type: doc.type,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // Determine overall document verification status
      if (results.verifiedDocuments.length === 0) {
        results.status = 'failed';
      } else if (results.failedDocuments.length === 0) {
        results.status = 'verified';
      } else {
        results.status = 'partial';
      }
      
      return results;
    } catch (error) {
      logger.error('Error verifying documents:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyDocument(doc, customerData) {
    try {
      const { type, content, metadata } = doc;
      
      // Basic document validation
      if (!content || content.length === 0) {
        return {
          type,
          status: 'failed',
          reason: 'Empty document content'
        };
      }
      
      // Document type specific verification
      switch (type) {
        case 'passport':
          return await this.verifyPassport(content, customerData);
        case 'driver_license':
          return await this.verifyDriverLicense(content, customerData);
        case 'national_id':
          return await this.verifyNationalID(content, customerData);
        case 'utility_bill':
          return await this.verifyUtilityBill(content, customerData);
        case 'bank_statement':
          return await this.verifyBankStatement(content, customerData);
        default:
          return {
            type,
            status: 'failed',
            reason: 'Unsupported document type'
          };
      }
    } catch (error) {
      logger.error(`Error verifying document ${doc.type}:`, error);
      return {
        type: doc.type,
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyPassport(content, customerData) {
    try {
      // Mock passport verification - in reality would use OCR and validation
      const passportData = await this.extractPassportData(content);
      
      // Verify name match
      const nameMatch = this.compareNames(passportData.name, customerData.name);
      
      // Verify date of birth match
      const dobMatch = passportData.dateOfBirth === customerData.dateOfBirth;
      
      // Verify nationality
      const nationalityMatch = passportData.nationality === customerData.nationality;
      
      // Verify document validity
      const isValid = this.isDocumentValid(passportData.issueDate, passportData.expiryDate);
      
      const score = (nameMatch ? 25 : 0) + (dobMatch ? 25 : 0) + (nationalityMatch ? 25 : 0) + (isValid ? 25 : 0);
      
      return {
        type: 'passport',
        status: score >= 75 ? 'verified' : 'failed',
        score,
        details: {
          nameMatch,
          dobMatch,
          nationalityMatch,
          isValid,
          passportData
        }
      };
    } catch (error) {
      logger.error('Error verifying passport:', error);
      return {
        type: 'passport',
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyDriverLicense(content, customerData) {
    try {
      // Mock driver license verification
      const licenseData = await this.extractDriverLicenseData(content);
      
      const nameMatch = this.compareNames(licenseData.name, customerData.name);
      const dobMatch = licenseData.dateOfBirth === customerData.dateOfBirth;
      const addressMatch = this.compareAddresses(licenseData.address, customerData.address);
      const isValid = this.isDocumentValid(licenseData.issueDate, licenseData.expiryDate);
      
      const score = (nameMatch ? 25 : 0) + (dobMatch ? 25 : 0) + (addressMatch ? 25 : 0) + (isValid ? 25 : 0);
      
      return {
        type: 'driver_license',
        status: score >= 75 ? 'verified' : 'failed',
        score,
        details: {
          nameMatch,
          dobMatch,
          addressMatch,
          isValid,
          licenseData
        }
      };
    } catch (error) {
      logger.error('Error verifying driver license:', error);
      return {
        type: 'driver_license',
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyNationalID(content, customerData) {
    try {
      // Mock national ID verification
      const idData = await this.extractNationalIDData(content);
      
      const nameMatch = this.compareNames(idData.name, customerData.name);
      const dobMatch = idData.dateOfBirth === customerData.dateOfBirth;
      const idMatch = idData.idNumber === customerData.idNumber;
      const isValid = this.isDocumentValid(idData.issueDate, idData.expiryDate);
      
      const score = (nameMatch ? 25 : 0) + (dobMatch ? 25 : 0) + (idMatch ? 25 : 0) + (isValid ? 25 : 0);
      
      return {
        type: 'national_id',
        status: score >= 75 ? 'verified' : 'failed',
        score,
        details: {
          nameMatch,
          dobMatch,
          idMatch,
          isValid,
          idData
        }
      };
    } catch (error) {
      logger.error('Error verifying national ID:', error);
      return {
        type: 'national_id',
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyUtilityBill(content, customerData) {
    try {
      // Mock utility bill verification
      const billData = await this.extractUtilityBillData(content);
      
      const addressMatch = this.compareAddresses(billData.address, customerData.address);
      const nameMatch = this.compareNames(billData.name, customerData.name);
      const isRecent = this.isDocumentRecent(billData.date, 90); // Within 90 days
      
      const score = (addressMatch ? 50 : 0) + (nameMatch ? 30 : 0) + (isRecent ? 20 : 0);
      
      return {
        type: 'utility_bill',
        status: score >= 70 ? 'verified' : 'failed',
        score,
        details: {
          addressMatch,
          nameMatch,
          isRecent,
          billData
        }
      };
    } catch (error) {
      logger.error('Error verifying utility bill:', error);
      return {
        type: 'utility_bill',
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyBankStatement(content, customerData) {
    try {
      // Mock bank statement verification
      const statementData = await this.extractBankStatementData(content);
      
      const nameMatch = this.compareNames(statementData.name, customerData.name);
      const addressMatch = this.compareAddresses(statementData.address, customerData.address);
      const isRecent = this.isDocumentRecent(statementData.date, 90);
      
      const score = (nameMatch ? 40 : 0) + (addressMatch ? 40 : 0) + (isRecent ? 20 : 0);
      
      return {
        type: 'bank_statement',
        status: score >= 70 ? 'verified' : 'failed',
        score,
        details: {
          nameMatch,
          addressMatch,
          isRecent,
          statementData
        }
      };
    } catch (error) {
      logger.error('Error verifying bank statement:', error);
      return {
        type: 'bank_statement',
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyAddress(address) {
    try {
      // Mock address verification - in reality would use address validation service
      const isValid = validator.isLength(address.street, { min: 5, max: 100 }) &&
                     validator.isLength(address.city, { min: 2, max: 50 }) &&
                     validator.isLength(address.state, { min: 2, max: 50 }) &&
                     validator.isLength(address.zip, { min: 5, max: 10 });
      
      return {
        status: isValid ? 'verified' : 'failed',
        score: isValid ? 100 : 0,
        details: {
          isValid,
          address
        }
      };
    } catch (error) {
      logger.error('Error verifying address:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyPhone(phone) {
    try {
      // Mock phone verification - in reality would send SMS
      const isValid = validator.isMobilePhone(phone);
      
      return {
        status: isValid ? 'verified' : 'failed',
        score: isValid ? 100 : 0,
        details: {
          isValid,
          phone
        }
      };
    } catch (error) {
      logger.error('Error verifying phone:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyEmail(email) {
    try {
      // Mock email verification - in reality would send verification email
      const isValid = validator.isEmail(email);
      
      return {
        status: isValid ? 'verified' : 'failed',
        score: isValid ? 100 : 0,
        details: {
          isValid,
          email
        }
      };
    } catch (error) {
      logger.error('Error verifying email:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyBiometrics(biometrics) {
    try {
      // Mock biometric verification - in reality would use biometric matching
      const isValid = biometrics && biometrics.fingerprint && biometrics.face;
      
      return {
        status: isValid ? 'verified' : 'failed',
        score: isValid ? 100 : 0,
        details: {
          isValid,
          biometrics
        }
      };
    } catch (error) {
      logger.error('Error verifying biometrics:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async screenPEP(customerData) {
    try {
      // Mock PEP screening - in reality would check against PEP databases
      const isPEP = this.checkPEPDatabase(customerData.name, customerData.dateOfBirth);
      
      return {
        status: isPEP ? 'flagged' : 'verified',
        score: isPEP ? 0 : 100,
        details: {
          isPEP,
          customerData
        }
      };
    } catch (error) {
      logger.error('Error screening PEP:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async screenSanctions(customerData) {
    try {
      // Mock sanctions screening - in reality would check against sanctions lists
      const isSanctioned = this.checkSanctionsDatabase(customerData.name, customerData.dateOfBirth);
      
      return {
        status: isSanctioned ? 'flagged' : 'verified',
        score: isSanctioned ? 0 : 100,
        details: {
          isSanctioned,
          customerData
        }
      };
    } catch (error) {
      logger.error('Error screening sanctions:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async screenAdverseMedia(customerData) {
    try {
      // Mock adverse media screening - in reality would check news databases
      const hasAdverseMedia = this.checkAdverseMediaDatabase(customerData.name, customerData.dateOfBirth);
      
      return {
        status: hasAdverseMedia ? 'flagged' : 'verified',
        score: hasAdverseMedia ? 0 : 100,
        details: {
          hasAdverseMedia,
          customerData
        }
      };
    } catch (error) {
      logger.error('Error screening adverse media:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  // Helper methods
  async extractPassportData(content) {
    // Mock OCR extraction - in reality would use OCR service
    return {
      name: 'John Doe',
      dateOfBirth: '1990-01-01',
      nationality: 'US',
      passportNumber: 'A1234567',
      issueDate: '2020-01-01',
      expiryDate: '2030-01-01'
    };
  }

  async extractDriverLicenseData(content) {
    // Mock OCR extraction
    return {
      name: 'John Doe',
      dateOfBirth: '1990-01-01',
      address: '123 Main St, New York, NY 10001',
      licenseNumber: 'D1234567',
      issueDate: '2020-01-01',
      expiryDate: '2025-01-01'
    };
  }

  async extractNationalIDData(content) {
    // Mock OCR extraction
    return {
      name: 'John Doe',
      dateOfBirth: '1990-01-01',
      idNumber: '123456789',
      issueDate: '2020-01-01',
      expiryDate: '2030-01-01'
    };
  }

  async extractUtilityBillData(content) {
    // Mock OCR extraction
    return {
      name: 'John Doe',
      address: '123 Main St, New York, NY 10001',
      date: '2023-11-01',
      utility: 'Electric'
    };
  }

  async extractBankStatementData(content) {
    // Mock OCR extraction
    return {
      name: 'John Doe',
      address: '123 Main St, New York, NY 10001',
      date: '2023-11-01',
      bank: 'Chase Bank'
    };
  }

  compareNames(name1, name2) {
    // Simple name comparison - in reality would use fuzzy matching
    return name1.toLowerCase().trim() === name2.toLowerCase().trim();
  }

  compareAddresses(address1, address2) {
    // Simple address comparison - in reality would use address normalization
    const addr1 = `${address1.street} ${address1.city} ${address1.state} ${address1.zip}`.toLowerCase().trim();
    const addr2 = `${address2.street} ${address2.city} ${address2.state} ${address2.zip}`.toLowerCase().trim();
    return addr1 === addr2;
  }

  isDocumentValid(issueDate, expiryDate) {
    const now = new Date();
    const issue = new Date(issueDate);
    const expiry = new Date(expiryDate);
    
    return now >= issue && now <= expiry;
  }

  isDocumentRecent(date, days) {
    const docDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - docDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= days;
  }

  checkPEPDatabase(name, dateOfBirth) {
    // Mock PEP database check
    const pepNames = ['John Smith', 'Jane Doe'];
    return pepNames.includes(name);
  }

  checkSanctionsDatabase(name, dateOfBirth) {
    // Mock sanctions database check
    const sanctionedNames = ['Bad Person', 'Criminal Name'];
    return sanctionedNames.includes(name);
  }

  checkAdverseMediaDatabase(name, dateOfBirth) {
    // Mock adverse media database check
    const adverseNames = ['Scandal Person', 'Fraud Name'];
    return adverseNames.includes(name);
  }

  calculateVerificationScore(results) {
    try {
      let totalScore = 0;
      let methodCount = 0;
      
      for (const [methodId, result] of Object.entries(results)) {
        if (result.score !== undefined) {
          totalScore += result.score;
          methodCount++;
        }
      }
      
      return methodCount > 0 ? Math.round(totalScore / methodCount) : 0;
    } catch (error) {
      logger.error('Error calculating verification score:', error);
      return 0;
    }
  }

  determineVerificationStatus(results, score) {
    try {
      // Check for critical failures
      for (const [methodId, result] of Object.entries(results)) {
        if (result.status === 'flagged') {
          return 'flagged';
        }
      }
      
      // Check overall score
      if (score >= 80) {
        return 'verified';
      } else if (score >= 60) {
        return 'partial';
      } else {
        return 'failed';
      }
    } catch (error) {
      logger.error('Error determining verification status:', error);
      return 'failed';
    }
  }

  async getVerificationStatus(customerId, userId) {
    try {
      const query = `
        SELECT * FROM kyc_verifications 
        WHERE customer_id = $1 AND user_id = $2 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [customerId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting verification status for ${customerId}:`, error);
      return null;
    }
  }

  async storeVerification(verification) {
    try {
      const query = `
        INSERT INTO kyc_verifications (
          id, customer_id, user_id, status, methods, results, 
          score, created_at, completed_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        verification.id,
        verification.customerId,
        verification.userId,
        verification.status,
        JSON.stringify(verification.methods),
        JSON.stringify(verification.results),
        verification.score,
        verification.createdAt,
        verification.completedAt,
        JSON.stringify(verification.metadata)
      ]);
    } catch (error) {
      logger.error('Error storing verification:', error);
      throw error;
    }
  }

  async updateVerification(verification) {
    try {
      const query = `
        UPDATE kyc_verifications 
        SET status = $1, results = $2, score = $3, completed_at = $4, error = $5
        WHERE id = $6
      `;
      
      await this.db.query(query, [
        verification.status,
        JSON.stringify(verification.results),
        verification.score,
        verification.completedAt,
        verification.error || null,
        verification.id
      ]);
    } catch (error) {
      logger.error('Error updating verification:', error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('KYC Service closed successfully');
    } catch (error) {
      logger.error('Error closing KYC Service:', error);
    }
  }
}

module.exports = KYCService;

