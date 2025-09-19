const axios = require('axios');
const logger = require('../utils/logger');

class NADRAService {
  constructor() {
    this.baseURL = process.env.NADRA_API_URL || 'https://api.nadra.gov.pk';
    this.apiKey = process.env.NADRA_API_KEY;
    this.timeout = 30000; // 30 seconds
  }

  async verifyWithNADRA(userId, verificationData) {
    try {
      const { cnic, name, dateOfBirth } = verificationData;
      
      // Validate input
      const validation = this.validateNADRAInput(verificationData);
      if (!validation.valid) {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: validation.errors
        };
      }
      
      // Prepare NADRA API request
      const requestData = {
        cnic: cnic.replace(/-/g, ''), // Remove dashes for API
        name: name.toUpperCase(),
        dateOfBirth: this.formatDateForNADRA(dateOfBirth)
      };
      
      // Call NADRA API
      const response = await this.callNADRAAPI(requestData);
      
      if (response.success) {
        return {
          verified: true,
          confidence: response.confidence || 0.9,
          extractedData: response.data || {},
          errors: []
        };
      } else {
        return {
          verified: false,
          confidence: 0,
          extractedData: {},
          errors: response.errors || ['NADRA verification failed']
        };
      }
    } catch (error) {
      logger.error('NADRA verification error:', error);
      return {
        verified: false,
        confidence: 0,
        extractedData: {},
        errors: [error.message]
      };
    }
  }

  async callNADRAAPI(requestData) {
    try {
      const config = {
        method: 'POST',
        url: `${this.baseURL}/verify`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Brokerage-Platform/1.0'
        },
        data: requestData,
        timeout: this.timeout
      };
      
      const response = await axios(config);
      
      if (response.status === 200) {
        return {
          success: true,
          confidence: response.data.confidence,
          data: response.data
        };
      } else {
        return {
          success: false,
          errors: ['NADRA API returned non-200 status']
        };
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        logger.error('NADRA API timeout:', error);
        return {
          success: false,
          errors: ['NADRA API timeout']
        };
      } else if (error.response) {
        logger.error('NADRA API error response:', error.response.data);
        return {
          success: false,
          errors: [error.response.data.message || 'NADRA API error']
        };
      } else {
        logger.error('NADRA API request error:', error);
        return {
          success: false,
          errors: ['NADRA API request failed']
        };
      }
    }
  }

  validateNADRAInput(data) {
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

  formatDateForNADRA(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  async getNADRAStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'Brokerage-Platform/1.0'
        },
        timeout: 10000
      });
      
      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'unknown',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.error('NADRA status check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

module.exports = new NADRAService();

