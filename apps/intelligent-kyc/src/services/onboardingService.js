const logger = require('../utils/logger');
const documentVerifier = require('./documentVerifier');
const kycEngine = require('./kycEngine');

class OnboardingService {
  async processOnboarding(userId, onboardingData) {
    try {
      const { personalInfo, documents, preferences } = onboardingData;
      
      // Step 1: Validate personal information
      const personalValidation = await this.validatePersonalInfo(personalInfo);
      if (!personalValidation.valid) {
        return {
          success: false,
          step: 'personal_info',
          errors: personalValidation.errors
        };
      }
      
      // Step 2: Verify documents
      const documentResults = await this.verifyDocuments(documents);
      const allDocumentsVerified = documentResults.every(doc => doc.verified);
      
      if (!allDocumentsVerified) {
        return {
          success: false,
          step: 'document_verification',
          errors: documentResults.flatMap(doc => doc.errors)
        };
      }
      
      // Step 3: Run KYC checks
      const kycResult = await kycEngine.runKYCChecks(userId, {
        personalInfo,
        documents: documentResults
      });
      
      if (!kycResult.approved) {
        return {
          success: false,
          step: 'kyc_verification',
          errors: kycResult.reasons
        };
      }
      
      // Step 4: Complete onboarding
      const onboardingComplete = await this.completeOnboarding(userId, {
        personalInfo,
        documents: documentResults,
        preferences,
        kycResult
      });
      
      return {
        success: true,
        step: 'completed',
        data: onboardingComplete
      };
    } catch (error) {
      logger.error('Error processing onboarding:', error);
      return {
        success: false,
        step: 'error',
        errors: [error.message]
      };
    }
  }

  async validatePersonalInfo(personalInfo) {
    const errors = [];
    
    if (!personalInfo.firstName || personalInfo.firstName.length < 2) {
      errors.push('First name is required and must be at least 2 characters');
    }
    
    if (!personalInfo.lastName || personalInfo.lastName.length < 2) {
      errors.push('Last name is required and must be at least 2 characters');
    }
    
    if (!personalInfo.email || !this.isValidEmail(personalInfo.email)) {
      errors.push('Valid email address is required');
    }
    
    if (!personalInfo.phone || !this.isValidPhone(personalInfo.phone)) {
      errors.push('Valid phone number is required');
    }
    
    if (!personalInfo.dateOfBirth || !this.isValidDate(personalInfo.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }
    
    if (!personalInfo.address || !personalInfo.address.street) {
      errors.push('Complete address is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async verifyDocuments(documents) {
    const results = [];
    
    for (const document of documents) {
      try {
        const result = await documentVerifier.verifyDocument(document);
        results.push({
          type: document.type,
          verified: result.verified,
          confidence: result.confidence,
          extractedData: result.extractedData,
          errors: result.errors
        });
      } catch (error) {
        logger.error('Error verifying document:', error);
        results.push({
          type: document.type,
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: [error.message]
        });
      }
    }
    
    return results;
  }

  async completeOnboarding(userId, onboardingData) {
    try {
      // Save onboarding data to database
      const onboardingRecord = {
        userId,
        personalInfo: onboardingData.personalInfo,
        documents: onboardingData.documents,
        preferences: onboardingData.preferences,
        kycResult: onboardingData.kycResult,
        status: 'completed',
        completedAt: new Date(),
        createdAt: new Date()
      };
      
      // TODO: Save to database
      logger.info('Onboarding completed for user:', userId);
      
      return onboardingRecord;
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      throw error;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}

module.exports = new OnboardingService();

