const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class NADRAProvider {
  constructor() {
    this.apiBaseUrl = process.env.NADRA_API_BASE_URL || 'https://api.nadra.gov.pk';
    this.apiKey = process.env.NADRA_API_KEY;
    this.apiSecret = process.env.NADRA_API_SECRET;
    this.timeout = 30000;
  }

  // Verify CNIC with NADRA
  async verifyCNIC(cnicData) {
    try {
      const { cnic, name, father_name, date_of_birth } = cnicData;
      
      // Validate CNIC format
      if (!this.isValidCNIC(cnic)) {
        throw new Error('Invalid CNIC format');
      }

      const requestData = {
        cnic: cnic,
        name: name,
        father_name: father_name,
        date_of_birth: date_of_birth,
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId()
      };

      // Add NADRA signature
      const signature = this.generateSignature(requestData);
      requestData.signature = signature;

      const response = await axios.post(
        `${this.apiBaseUrl}/v1/verify/cnic`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-NADRA-Signature': signature,
            'X-NADRA-Timestamp': requestData.timestamp
          },
          timeout: this.timeout
        }
      );

      return this.processNADRAResponse(response.data);
    } catch (error) {
      logger.error('NADRA CNIC verification failed:', error);
      throw new Error(`NADRA verification failed: ${error.message}`);
    }
  }

  // Verify family tree with NADRA
  async verifyFamilyTree(familyData) {
    try {
      const { cnic, family_members } = familyData;
      
      const requestData = {
        cnic: cnic,
        family_members: family_members,
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData);
      requestData.signature = signature;

      const response = await axios.post(
        `${this.apiBaseUrl}/v1/verify/family-tree`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-NADRA-Signature': signature
          },
          timeout: this.timeout
        }
      );

      return this.processNADRAResponse(response.data);
    } catch (error) {
      logger.error('NADRA family tree verification failed:', error);
      throw new Error(`NADRA family verification failed: ${error.message}`);
    }
  }

  // Verify address with NADRA
  async verifyAddress(addressData) {
    try {
      const { cnic, address } = addressData;
      
      const requestData = {
        cnic: cnic,
        address: address,
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData);
      requestData.signature = signature;

      const response = await axios.post(
        `${this.apiBaseUrl}/v1/verify/address`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-NADRA-Signature': signature
          },
          timeout: this.timeout
        }
      );

      return this.processNADRAResponse(response.data);
    } catch (error) {
      logger.error('NADRA address verification failed:', error);
      throw new Error(`NADRA address verification failed: ${error.message}`);
    }
  }

  // Biometric verification with NADRA
  async verifyBiometrics(biometricData) {
    try {
      const { cnic, biometric_image, biometric_type } = biometricData;
      
      const requestData = {
        cnic: cnic,
        biometric_image: biometric_image,
        biometric_type: biometric_type, // 'fingerprint', 'face', 'iris'
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId()
      };

      const signature = this.generateSignature(requestData);
      requestData.signature = signature;

      const response = await axios.post(
        `${this.apiBaseUrl}/v1/verify/biometrics`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-NADRA-Signature': signature
          },
          timeout: this.timeout
        }
      );

      return this.processNADRAResponse(response.data);
    } catch (error) {
      logger.error('NADRA biometric verification failed:', error);
      throw new Error(`NADRA biometric verification failed: ${error.message}`);
    }
  }

  // Helper methods
  isValidCNIC(cnic) {
    // Pakistani CNIC format: 12345-1234567-1
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    return cnicRegex.test(cnic);
  }

  generateRequestId() {
    return `NADRA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSignature(data) {
    const dataString = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(dataString)
      .digest('hex');
  }

  processNADRAResponse(response) {
    return {
      verified: response.status === 'verified',
      confidence: response.confidence || 0,
      data: {
        name: response.name,
        father_name: response.father_name,
        date_of_birth: response.date_of_birth,
        address: response.address,
        cnic: response.cnic,
        status: response.status
      },
      metadata: {
        provider: 'NADRA',
        verification_id: response.verification_id,
        timestamp: response.timestamp,
        response_time: response.response_time
      }
    };
  }

  // Get verification status
  async getVerificationStatus(verificationId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/v1/verification/${verificationId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      return response.data;
    } catch (error) {
      logger.error('NADRA status check failed:', error);
      throw new Error(`NADRA status check failed: ${error.message}`);
    }
  }
}

module.exports = NADRAProvider;
