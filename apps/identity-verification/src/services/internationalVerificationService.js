const axios = require('axios');
const logger = require('../utils/logger');

class InternationalVerificationService {
  constructor() {
    this.providers = {
      jumio: {
        baseURL: process.env.JUMIO_API_URL || 'https://netverify.com/api/v4',
        apiToken: process.env.JUMIO_API_TOKEN,
        apiSecret: process.env.JUMIO_API_SECRET
      },
      onfido: {
        baseURL: process.env.ONFIDO_API_URL || 'https://api.onfido.com/v3',
        apiToken: process.env.ONFIDO_API_TOKEN
      },
      trulioo: {
        baseURL: process.env.TRULIOO_API_URL || 'https://api.globaldatacompany.com',
        apiKey: process.env.TRULIOO_API_KEY
      }
    };
  }

  async verifyInternationally(userId, verificationData) {
    try {
      const { documentType, documentData, country } = verificationData;
      
      // Select appropriate provider based on country and document type
      const provider = this.selectProvider(country, documentType);
      
      if (!provider) {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: ['No suitable verification provider found for this country/document type']
        };
      }
      
      // Verify with selected provider
      const result = await this.verifyWithProvider(provider, verificationData);
      
      return result;
    } catch (error) {
      logger.error('International verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  selectProvider(country, documentType) {
    // Country-specific provider selection
    const countryProviders = {
      'US': 'onfido',
      'CA': 'onfido',
      'GB': 'onfido',
      'AU': 'onfido',
      'DE': 'jumio',
      'FR': 'jumio',
      'ES': 'jumio',
      'IT': 'jumio',
      'NL': 'jumio',
      'BE': 'jumio',
      'AT': 'jumio',
      'CH': 'jumio',
      'SE': 'jumio',
      'NO': 'jumio',
      'DK': 'jumio',
      'FI': 'jumio',
      'IE': 'jumio',
      'PT': 'jumio',
      'LU': 'jumio',
      'MT': 'jumio',
      'CY': 'jumio',
      'EE': 'jumio',
      'LV': 'jumio',
      'LT': 'jumio',
      'SK': 'jumio',
      'SI': 'jumio',
      'CZ': 'jumio',
      'HU': 'jumio',
      'PL': 'jumio',
      'RO': 'jumio',
      'BG': 'jumio',
      'HR': 'jumio',
      'GR': 'jumio',
      'default': 'trulioo'
    };
    
    const providerName = countryProviders[country] || countryProviders['default'];
    return this.providers[providerName];
  }

  async verifyWithProvider(provider, verificationData) {
    try {
      const { documentType, documentData, country } = verificationData;
      
      switch (provider) {
        case this.providers.jumio:
          return await this.verifyWithJumio(verificationData);
        case this.providers.onfido:
          return await this.verifyWithOnfido(verificationData);
        case this.providers.trulioo:
          return await this.verifyWithTrulioo(verificationData);
        default:
          return {
            verified: false,
            confidence: 0,
            extractedData: {},
            errors: ['Unknown verification provider']
          };
      }
    } catch (error) {
      logger.error('Provider verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  async verifyWithJumio(verificationData) {
    try {
      const { documentType, documentData, country } = verificationData;
      
      const requestData = {
        customerInternalReference: verificationData.userId,
        userReference: verificationData.userId,
        workflowId: this.getJumioWorkflowId(documentType),
        document: {
          type: this.mapDocumentTypeToJumio(documentType),
          country: country,
          number: documentData.documentNumber,
          firstName: documentData.firstName,
          lastName: documentData.lastName,
          dateOfBirth: documentData.dateOfBirth
        }
      };
      
      const response = await axios.post(
        `${this.providers.jumio.baseURL}/initiate`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.providers.jumio.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Brokerage-Platform/1.0'
          },
          timeout: 30000
        }
      );
      
      if (response.data.success) {
        return {
          verified: true,
          confidence: response.data.confidence || 0.8,
          extractedData: response.data.extractedData || {},
          errors: []
        };
      } else {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: response.data.errors || ['Jumio verification failed']
        };
      }
    } catch (error) {
      logger.error('Jumio verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  async verifyWithOnfido(verificationData) {
    try {
      const { documentType, documentData, country } = verificationData;
      
      const requestData = {
        applicant_id: verificationData.userId,
        document_id: documentData.documentId,
        check_type: 'document',
        document_type: this.mapDocumentTypeToOnfido(documentType),
        country_code: country
      };
      
      const response = await axios.post(
        `${this.providers.onfido.baseURL}/checks`,
        requestData,
        {
          headers: {
            'Authorization': `Token token=${this.providers.onfido.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Brokerage-Platform/1.0'
          },
          timeout: 30000
        }
      );
      
      if (response.data.result === 'clear') {
        return {
          verified: true,
          confidence: response.data.confidence || 0.8,
          extractedData: response.data.extractedData || {},
          errors: []
        };
      } else {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: [response.data.reason || 'Onfido verification failed']
        };
      }
    } catch (error) {
      logger.error('Onfido verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  async verifyWithTrulioo(verificationData) {
    try {
      const { documentType, documentData, country } = verificationData;
      
      const requestData = {
        AcceptTruliooTermsAndConditions: true,
        CleansedAddress: false,
        ConfigurationName: 'Identity Verification',
        ConsentForDataSources: ['credit_agencies', 'government_database'],
        CountryCode: country,
        DataFields: {
          PersonInfo: {
            FirstGivenName: documentData.firstName,
            FirstSurName: documentData.lastName,
            YearOfBirth: new Date(documentData.dateOfBirth).getFullYear().toString(),
            MonthOfBirth: (new Date(documentData.dateOfBirth).getMonth() + 1).toString(),
            DayOfBirth: new Date(documentData.dateOfBirth).getDate().toString()
          },
          Document: {
            DocumentType: this.mapDocumentTypeToTrulioo(documentType),
            DocumentNumber: documentData.documentNumber
          }
        }
      };
      
      const response = await axios.post(
        `${this.providers.trulioo.baseURL}/verifications/v1/verify`,
        requestData,
        {
          headers: {
            'x-trulioo-api-key': this.providers.trulioo.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Brokerage-Platform/1.0'
          },
          timeout: 30000
        }
      );
      
      if (response.data.Record && response.data.Record.RecordStatus === 'match') {
        return {
          verified: true,
          confidence: response.data.Record.Confidence || 0.8,
          extractedData: response.data.Record.DataFields || {},
          errors: []
        };
      } else {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: ['Trulioo verification failed']
        };
      }
    } catch (error) {
      logger.error('Trulioo verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  getJumioWorkflowId(documentType) {
    const workflows = {
      'passport': '1001',
      'drivers_license': '1002',
      'national_id': '1003',
      'identity_card': '1004'
    };
    return workflows[documentType] || '1001';
  }

  mapDocumentTypeToJumio(documentType) {
    const mapping = {
      'passport': 'PASSPORT',
      'drivers_license': 'DRIVER_LICENSE',
      'national_id': 'ID_CARD',
      'identity_card': 'ID_CARD'
    };
    return mapping[documentType] || 'PASSPORT';
  }

  mapDocumentTypeToOnfido(documentType) {
    const mapping = {
      'passport': 'passport',
      'drivers_license': 'driving_licence',
      'national_id': 'national_identity_card',
      'identity_card': 'national_identity_card'
    };
    return mapping[documentType] || 'passport';
  }

  mapDocumentTypeToTrulioo(documentType) {
    const mapping = {
      'passport': 'Passport',
      'drivers_license': 'DriversLicense',
      'national_id': 'NationalID',
      'identity_card': 'NationalID'
    };
    return mapping[documentType] || 'Passport';
  }
}

module.exports = new InternationalVerificationService();

