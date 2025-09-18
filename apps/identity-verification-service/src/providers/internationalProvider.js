const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class InternationalProvider {
  constructor() {
    this.providers = {
      'US': {
        name: 'US_SSA',
        apiBaseUrl: process.env.US_SSA_API_URL,
        apiKey: process.env.US_SSA_API_KEY
      },
      'UK': {
        name: 'UK_HMPO',
        apiBaseUrl: process.env.UK_HMPO_API_URL,
        apiKey: process.env.UK_HMPO_API_KEY
      },
      'CA': {
        name: 'CA_SIN',
        apiBaseUrl: process.env.CA_SIN_API_URL,
        apiKey: process.env.CA_SIN_API_KEY
      },
      'AU': {
        name: 'AU_DVS',
        apiBaseUrl: process.env.AU_DVS_API_URL,
        apiKey: process.env.AU_DVS_API_KEY
      },
      'EU': {
        name: 'EU_EIDAS',
        apiBaseUrl: process.env.EU_EIDAS_API_URL,
        apiKey: process.env.EU_EIDAS_API_KEY
      }
    };
  }

  // Verify identity for international users
  async verifyIdentity(country, identityData) {
    try {
      const provider = this.providers[country];
      if (!provider) {
        throw new Error(`No identity provider configured for country: ${country}`);
      }

      const requestData = this.prepareRequestData(country, identityData);
      const signature = this.generateSignature(requestData, provider.apiKey);

      const response = await axios.post(
        `${provider.apiBaseUrl}/v1/verify/identity`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Country': country
          },
          timeout: 30000
        }
      );

      return this.processInternationalResponse(response.data, country);
    } catch (error) {
      logger.error(`International verification failed for ${country}:`, error);
      throw new Error(`International verification failed: ${error.message}`);
    }
  }

  // Verify document for international users
  async verifyDocument(country, documentData) {
    try {
      const provider = this.providers[country];
      if (!provider) {
        throw new Error(`No identity provider configured for country: ${country}`);
      }

      const requestData = this.prepareDocumentRequest(country, documentData);
      const signature = this.generateSignature(requestData, provider.apiKey);

      const response = await axios.post(
        `${provider.apiBaseUrl}/v1/verify/document`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Country': country
          },
          timeout: 30000
        }
      );

      return this.processInternationalResponse(response.data, country);
    } catch (error) {
      logger.error(`International document verification failed for ${country}:`, error);
      throw new Error(`International document verification failed: ${error.message}`);
    }
  }

  // Verify address for international users
  async verifyAddress(country, addressData) {
    try {
      const provider = this.providers[country];
      if (!provider) {
        throw new Error(`No identity provider configured for country: ${country}`);
      }

      const requestData = this.prepareAddressRequest(country, addressData);
      const signature = this.generateSignature(requestData, provider.apiKey);

      const response = await axios.post(
        `${provider.apiBaseUrl}/v1/verify/address`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Country': country
          },
          timeout: 30000
        }
      );

      return this.processInternationalResponse(response.data, country);
    } catch (error) {
      logger.error(`International address verification failed for ${country}:`, error);
      throw new Error(`International address verification failed: ${error.message}`);
    }
  }

  // Prepare request data based on country
  prepareRequestData(country, identityData) {
    const baseData = {
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      country: country
    };

    switch (country) {
      case 'US':
        return {
          ...baseData,
          ssn: identityData.ssn,
          name: identityData.name,
          date_of_birth: identityData.date_of_birth,
          address: identityData.address
        };
      
      case 'UK':
        return {
          ...baseData,
          national_insurance_number: identityData.nin,
          name: identityData.name,
          date_of_birth: identityData.date_of_birth,
          address: identityData.address
        };
      
      case 'CA':
        return {
          ...baseData,
          sin: identityData.sin,
          name: identityData.name,
          date_of_birth: identityData.date_of_birth,
          address: identityData.address
        };
      
      case 'AU':
        return {
          ...baseData,
          tfn: identityData.tfn,
          name: identityData.name,
          date_of_birth: identityData.date_of_birth,
          address: identityData.address
        };
      
      case 'EU':
        return {
          ...baseData,
          eidas_id: identityData.eidas_id,
          name: identityData.name,
          date_of_birth: identityData.date_of_birth,
          address: identityData.address
        };
      
      default:
        throw new Error(`Unsupported country: ${country}`);
    }
  }

  // Prepare document request based on country
  prepareDocumentRequest(country, documentData) {
    const baseData = {
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      country: country
    };

    switch (country) {
      case 'US':
        return {
          ...baseData,
          document_type: 'drivers_license',
          document_number: documentData.document_number,
          state: documentData.state,
          name: documentData.name,
          date_of_birth: documentData.date_of_birth
        };
      
      case 'UK':
        return {
          ...baseData,
          document_type: 'passport',
          document_number: documentData.document_number,
          name: documentData.name,
          date_of_birth: documentData.date_of_birth
        };
      
      case 'CA':
        return {
          ...baseData,
          document_type: 'drivers_license',
          document_number: documentData.document_number,
          province: documentData.province,
          name: documentData.name,
          date_of_birth: documentData.date_of_birth
        };
      
      case 'AU':
        return {
          ...baseData,
          document_type: 'drivers_license',
          document_number: documentData.document_number,
          state: documentData.state,
          name: documentData.name,
          date_of_birth: documentData.date_of_birth
        };
      
      case 'EU':
        return {
          ...baseData,
          document_type: 'national_id',
          document_number: documentData.document_number,
          country: documentData.country,
          name: documentData.name,
          date_of_birth: documentData.date_of_birth
        };
      
      default:
        throw new Error(`Unsupported country: ${country}`);
    }
  }

  // Prepare address request based on country
  prepareAddressRequest(country, addressData) {
    return {
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      country: country,
      address: addressData.address,
      postal_code: addressData.postal_code,
      city: addressData.city,
      state: addressData.state,
      country_code: addressData.country_code
    };
  }

  // Process international response
  processInternationalResponse(response, country) {
    return {
      verified: response.status === 'verified',
      confidence: response.confidence || 0,
      data: {
        name: response.name,
        date_of_birth: response.date_of_birth,
        address: response.address,
        document_number: response.document_number,
        status: response.status
      },
      metadata: {
        provider: this.providers[country].name,
        country: country,
        verification_id: response.verification_id,
        timestamp: response.timestamp,
        response_time: response.response_time
      }
    };
  }

  // Generate request ID
  generateRequestId() {
    return `INT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate signature
  generateSignature(data, apiKey) {
    const dataString = JSON.stringify(data);
    return crypto
      .createHmac('sha256', apiKey)
      .update(dataString)
      .digest('hex');
  }

  // Get supported countries
  getSupportedCountries() {
    return Object.keys(this.providers);
  }

  // Check if country is supported
  isCountrySupported(country) {
    return this.providers.hasOwnProperty(country);
  }
}

module.exports = InternationalProvider;
