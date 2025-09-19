const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const axios = require('axios');

class ThirdPartyIntegrations {
  async getIntegrations(req, res) {
    try {
      const { type, status, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM third_party_integrations WHERE 1=1';
      const params = [];
      
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
      }
      
      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await database.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rowCount
        }
      });
    } catch (error) {
      logger.error('Error getting integrations:', error);
      res.status(500).json({ success: false, error: 'Failed to get integrations' });
    }
  }

  async createIntegration(req, res) {
    try {
      const { name, type, provider, configuration, endpoints, authentication } = req.body;
      
      const query = `
        INSERT INTO third_party_integrations 
        (name, type, provider, configuration, endpoints, authentication, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'inactive')
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, type, provider,
        JSON.stringify(configuration),
        JSON.stringify(endpoints),
        JSON.stringify(authentication)
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating integration:', error);
      res.status(500).json({ success: false, error: 'Failed to create integration' });
    }
  }

  async getIntegration(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'SELECT * FROM third_party_integrations WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting integration:', error);
      res.status(500).json({ success: false, error: 'Failed to get integration' });
    }
  }

  async updateIntegration(req, res) {
    try {
      const { id } = req.params;
      const { name, type, provider, configuration, endpoints, authentication } = req.body;
      
      const query = `
        UPDATE third_party_integrations 
        SET name = $1, type = $2, provider = $3, configuration = $4, 
            endpoints = $5, authentication = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, type, provider,
        JSON.stringify(configuration),
        JSON.stringify(endpoints),
        JSON.stringify(authentication),
        id
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating integration:', error);
      res.status(500).json({ success: false, error: 'Failed to update integration' });
    }
  }

  async deleteIntegration(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'DELETE FROM third_party_integrations WHERE id = $1 RETURNING *';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      
      res.json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting integration:', error);
      res.status(500).json({ success: false, error: 'Failed to delete integration' });
    }
  }

  async testIntegration(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'SELECT * FROM third_party_integrations WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      
      const integration = result.rows[0];
      const testResult = await this.performIntegrationTest(integration);
      
      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      logger.error('Error testing integration:', error);
      res.status(500).json({ success: false, error: 'Failed to test integration' });
    }
  }

  async performIntegrationTest(integration) {
    try {
      const { type, provider, configuration, endpoints, authentication } = integration;
      
      switch (type) {
        case 'market_data':
          return await this.testMarketDataIntegration(provider, configuration, endpoints, authentication);
        case 'trading':
          return await this.testTradingIntegration(provider, configuration, endpoints, authentication);
        case 'banking':
          return await this.testBankingIntegration(provider, configuration, endpoints, authentication);
        case 'compliance':
          return await this.testComplianceIntegration(provider, configuration, endpoints, authentication);
        default:
          return {
            success: false,
            error: 'Unsupported integration type'
          };
      }
    } catch (error) {
      logger.error('Error performing integration test:', error);
      return {
        success: false,
        error: 'Integration test failed'
      };
    }
  }

  async testMarketDataIntegration(provider, configuration, endpoints, authentication) {
    try {
      const testEndpoint = endpoints.find(ep => ep.name === 'test');
      if (!testEndpoint) {
        return {
          success: false,
          error: 'Test endpoint not configured'
        };
      }
      
      const headers = await this.buildAuthenticationHeaders(authentication);
      const response = await axios.get(testEndpoint.url, {
        headers,
        timeout: 10000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      logger.error('Market data integration test failed:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'N/A'
      };
    }
  }

  async testTradingIntegration(provider, configuration, endpoints, authentication) {
    try {
      const testEndpoint = endpoints.find(ep => ep.name === 'test');
      if (!testEndpoint) {
        return {
          success: false,
          error: 'Test endpoint not configured'
        };
      }
      
      const headers = await this.buildAuthenticationHeaders(authentication);
      const response = await axios.post(testEndpoint.url, {
        action: 'test',
        timestamp: new Date().toISOString()
      }, {
        headers,
        timeout: 10000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      logger.error('Trading integration test failed:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'N/A'
      };
    }
  }

  async testBankingIntegration(provider, configuration, endpoints, authentication) {
    try {
      const testEndpoint = endpoints.find(ep => ep.name === 'test');
      if (!testEndpoint) {
        return {
          success: false,
          error: 'Test endpoint not configured'
        };
      }
      
      const headers = await this.buildAuthenticationHeaders(authentication);
      const response = await axios.get(testEndpoint.url, {
        headers,
        timeout: 10000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      logger.error('Banking integration test failed:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'N/A'
      };
    }
  }

  async testComplianceIntegration(provider, configuration, endpoints, authentication) {
    try {
      const testEndpoint = endpoints.find(ep => ep.name === 'test');
      if (!testEndpoint) {
        return {
          success: false,
          error: 'Test endpoint not configured'
        };
      }
      
      const headers = await this.buildAuthenticationHeaders(authentication);
      const response = await axios.post(testEndpoint.url, {
        action: 'test',
        timestamp: new Date().toISOString()
      }, {
        headers,
        timeout: 10000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      logger.error('Compliance integration test failed:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'N/A'
      };
    }
  }

  async buildAuthenticationHeaders(authentication) {
    const headers = {};
    
    switch (authentication.type) {
      case 'api_key':
        headers[authentication.header] = authentication.key;
        break;
      case 'bearer_token':
        headers['Authorization'] = `Bearer ${authentication.token}`;
        break;
      case 'basic_auth':
        const credentials = Buffer.from(`${authentication.username}:${authentication.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${authentication.access_token}`;
        break;
      default:
        logger.warn('Unknown authentication type:', authentication.type);
    }
    
    return headers;
  }

  async syncData(req, res) {
    try {
      const { integrationId, dataType, startDate, endDate } = req.body;
      
      const query = 'SELECT * FROM third_party_integrations WHERE id = $1';
      const result = await database.query(query, [integrationId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      
      const integration = result.rows[0];
      const syncResult = await this.performDataSync(integration, dataType, startDate, endDate);
      
      res.json({
        success: true,
        data: syncResult
      });
    } catch (error) {
      logger.error('Error syncing data:', error);
      res.status(500).json({ success: false, error: 'Failed to sync data' });
    }
  }

  async performDataSync(integration, dataType, startDate, endDate) {
    try {
      const { type, provider, configuration, endpoints, authentication } = integration;
      
      const syncEndpoint = endpoints.find(ep => ep.name === 'sync');
      if (!syncEndpoint) {
        return {
          success: false,
          error: 'Sync endpoint not configured'
        };
      }
      
      const headers = await this.buildAuthenticationHeaders(authentication);
      const response = await axios.post(syncEndpoint.url, {
        dataType,
        startDate,
        endDate,
        configuration
      }, {
        headers,
        timeout: 30000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        recordsProcessed: response.data.recordsProcessed || 0
      };
    } catch (error) {
      logger.error('Data sync failed:', error);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'N/A'
      };
    }
  }
}

module.exports = new ThirdPartyIntegrations();

