const logger = require('../utils/logger');
const nadraService = require('./nadraService');
const internationalVerificationService = require('./internationalVerificationService');

class IdentityVerifier {
  async verifyIdentity(userId, identityData) {
    try {
      const { documentType, documentData, country, verificationLevel } = identityData;
      
      let result = {
        verified: false,
        confidence: 0,
        verificationMethod: '',
        extractedData: {},
        errors: []
      };
      
      // Determine verification method based on country and document type
      if (country === 'PK' && documentType === 'cnic') {
        // Use NADRA for Pakistani CNIC
        result = await nadraService.verifyWithNADRA(userId, {
          cnic: documentData.cnic,
          name: documentData.name,
          dateOfBirth: documentData.dateOfBirth
        });
        result.verificationMethod = 'NADRA';
      } else {
        // Use international verification for other countries/documents
        result = await internationalVerificationService.verifyInternationally(userId, {
          documentType,
          documentData,
          country
        });
        result.verificationMethod = 'International';
      }
      
      // Store verification result
      await this.storeVerificationResult(userId, result);
      
      return result;
    } catch (error) {
      logger.error('Error verifying identity:', error);
      return {
        verified: false,
        confidence: 0,
        verificationMethod: 'Error',
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  async getVerificationStatus(userId) {
    try {
      // Get verification status from database
      const query = `
        SELECT * FROM identity_verifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          status: 'not_verified',
          message: 'No verification found'
        };
      }
      
      const verification = result.rows[0];
      return {
        status: verification.status,
        verified: verification.verified,
        confidence: verification.confidence_score,
        verificationMethod: verification.verification_method,
        verifiedAt: verification.verified_at,
        createdAt: verification.created_at
      };
    } catch (error) {
      logger.error('Error getting verification status:', error);
      throw error;
    }
  }

  async storeVerificationResult(userId, result) {
    try {
      const query = `
        INSERT INTO identity_verifications (
          user_id, 
          verification_method, 
          status, 
          verified, 
          confidence_score, 
          extracted_data, 
          errors
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await database.query(query, [
        userId,
        result.verificationMethod,
        result.verified ? 'verified' : 'failed',
        result.verified,
        result.confidence,
        JSON.stringify(result.extractedData),
        JSON.stringify(result.errors)
      ]);
      
      logger.info('Verification result stored for user:', userId);
    } catch (error) {
      logger.error('Error storing verification result:', error);
      throw error;
    }
  }

  async validateDocumentFormat(documentType, documentData) {
    const validators = {
      cnic: this.validateCNIC,
      passport: this.validatePassport,
      drivers_license: this.validateDriversLicense,
      national_id: this.validateNationalID
    };
    
    const validator = validators[documentType];
    if (!validator) {
      return { valid: false, errors: ['Unsupported document type'] };
    }
    
    return validator(documentData);
  }

  validateCNIC(data) {
    const errors = [];
    
    if (!data.cnic || !/^\d{5}-\d{7}-\d{1}$/.test(data.cnic)) {
      errors.push('Invalid CNIC format. Expected: XXXXX-XXXXXXX-X');
    }
    
    if (!data.name || data.name.length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.dateOfBirth || !this.isValidDate(data.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validatePassport(data) {
    const errors = [];
    
    if (!data.passportNumber || data.passportNumber.length < 6) {
      errors.push('Passport number is required and must be at least 6 characters');
    }
    
    if (!data.name || data.name.length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.dateOfBirth || !this.isValidDate(data.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }
    
    if (!data.nationality || data.nationality.length < 2) {
      errors.push('Nationality is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateDriversLicense(data) {
    const errors = [];
    
    if (!data.licenseNumber || data.licenseNumber.length < 6) {
      errors.push('License number is required and must be at least 6 characters');
    }
    
    if (!data.name || data.name.length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.dateOfBirth || !this.isValidDate(data.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateNationalID(data) {
    const errors = [];
    
    if (!data.idNumber || data.idNumber.length < 6) {
      errors.push('ID number is required and must be at least 6 characters');
    }
    
    if (!data.name || data.name.length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.dateOfBirth || !this.isValidDate(data.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}

module.exports = new IdentityVerifier();

