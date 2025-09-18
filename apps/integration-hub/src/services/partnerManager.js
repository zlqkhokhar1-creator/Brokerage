const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const crypto = require('crypto');

class PartnerManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.partners = new Map();
    this.credentials = new Map();
    this.connections = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load partners
      await this.loadPartners();
      
      // Load credentials
      await this.loadCredentials();
      
      this._initialized = true;
      logger.info('PartnerManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PartnerManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('PartnerManager closed');
    } catch (error) {
      logger.error('Error closing PartnerManager:', error);
    }
  }

  async loadPartners() {
    try {
      const result = await pool.query(`
        SELECT * FROM partners
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const partner of result.rows) {
        this.partners.set(partner.id, {
          ...partner,
          configuration: partner.configuration ? JSON.parse(partner.configuration) : {},
          metadata: partner.metadata ? JSON.parse(partner.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} partners`);
    } catch (error) {
      logger.error('Error loading partners:', error);
      throw error;
    }
  }

  async loadCredentials() {
    try {
      const result = await pool.query(`
        SELECT * FROM partner_credentials
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const credential of result.rows) {
        this.credentials.set(credential.partner_id, {
          ...credential,
          credentials: this.decryptCredentials(credential.encrypted_credentials)
        });
      }
      
      logger.info(`Loaded ${result.rows.length} partner credentials`);
    } catch (error) {
      logger.error('Error loading credentials:', error);
      throw error;
    }
  }

  async createPartner(name, type, configuration, credentials, userId) {
    try {
      const partnerId = nanoid();
      const now = new Date();
      
      // Create partner
      const partner = {
        id: partnerId,
        name,
        type,
        configuration: configuration || {},
        metadata: {},
        status: 'active',
        is_active: true,
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      
      // Store partner
      await pool.query(`
        INSERT INTO partners (id, name, type, configuration, metadata, status, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        partnerId, name, type, JSON.stringify(configuration || {}),
        JSON.stringify({}), 'active', true, userId, now, now
      ]);
      
      // Store credentials if provided
      if (credentials) {
        await this.storeCredentials(partnerId, credentials, userId);
      }
      
      // Cache partner
      this.partners.set(partnerId, partner);
      
      // Emit event
      this.emit('partnerCreated', partner);
      
      logger.info(`Partner created: ${partnerId}`, { name, type });
      
      return partner;
    } catch (error) {
      logger.error('Error creating partner:', error);
      throw error;
    }
  }

  async getPartner(partnerId, userId) {
    try {
      // Check cache first
      if (this.partners.has(partnerId)) {
        return this.partners.get(partnerId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM partners
        WHERE id = $1 AND is_active = true
      `, [partnerId]);
      
      if (result.rows.length === 0) {
        throw new Error('Partner not found');
      }
      
      const partner = {
        ...result.rows[0],
        configuration: result.rows[0].configuration ? JSON.parse(result.rows[0].configuration) : {},
        metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : {}
      };
      
      // Cache partner
      this.partners.set(partnerId, partner);
      
      return partner;
    } catch (error) {
      logger.error('Error getting partner:', error);
      throw error;
    }
  }

  async updatePartner(partnerId, updates, userId) {
    try {
      const partner = await this.getPartner(partnerId, userId);
      if (!partner) {
        throw new Error('Partner not found');
      }
      
      const updatedPartner = {
        ...partner,
        ...updates,
        updated_at: new Date()
      };
      
      // Update database
      await pool.query(`
        UPDATE partners
        SET name = $1, type = $2, configuration = $3, metadata = $4, status = $5, updated_at = $6
        WHERE id = $7
      `, [
        updatedPartner.name, updatedPartner.type,
        JSON.stringify(updatedPartner.configuration),
        JSON.stringify(updatedPartner.metadata),
        updatedPartner.status, updatedPartner.updated_at, partnerId
      ]);
      
      // Update cache
      this.partners.set(partnerId, updatedPartner);
      
      // Emit event
      this.emit('partnerUpdated', updatedPartner);
      
      logger.info(`Partner updated: ${partnerId}`, { updates });
      
      return updatedPartner;
    } catch (error) {
      logger.error('Error updating partner:', error);
      throw error;
    }
  }

  async deletePartner(partnerId, userId) {
    try {
      const partner = await this.getPartner(partnerId, userId);
      if (!partner) {
        throw new Error('Partner not found');
      }
      
      // Soft delete
      await pool.query(`
        UPDATE partners
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date(), partnerId]);
      
      // Remove from cache
      this.partners.delete(partnerId);
      this.credentials.delete(partnerId);
      this.connections.delete(partnerId);
      
      // Emit event
      this.emit('partnerDeleted', { partnerId, deletedAt: new Date() });
      
      logger.info(`Partner deleted: ${partnerId}`);
      
      return { success: true, partnerId };
    } catch (error) {
      logger.error('Error deleting partner:', error);
      throw error;
    }
  }

  async storeCredentials(partnerId, credentials, userId) {
    try {
      const encryptedCredentials = this.encryptCredentials(credentials);
      const now = new Date();
      
      // Store credentials
      await pool.query(`
        INSERT INTO partner_credentials (id, partner_id, encrypted_credentials, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (partner_id) DO UPDATE SET
        encrypted_credentials = $3, updated_at = $7
      `, [
        nanoid(), partnerId, encryptedCredentials, true, userId, now, now
      ]);
      
      // Cache credentials
      this.credentials.set(partnerId, {
        partner_id: partnerId,
        credentials: credentials,
        is_active: true,
        created_by: userId,
        created_at: now,
        updated_at: now
      });
      
      logger.info(`Credentials stored for partner: ${partnerId}`);
    } catch (error) {
      logger.error('Error storing credentials:', error);
      throw error;
    }
  }

  async getCredentials(partnerId, userId) {
    try {
      // Check cache first
      if (this.credentials.has(partnerId)) {
        return this.credentials.get(partnerId).credentials;
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT encrypted_credentials FROM partner_credentials
        WHERE partner_id = $1 AND is_active = true
      `, [partnerId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const credentials = this.decryptCredentials(result.rows[0].encrypted_credentials);
      
      // Cache credentials
      this.credentials.set(partnerId, {
        partner_id: partnerId,
        credentials: credentials,
        is_active: true
      });
      
      return credentials;
    } catch (error) {
      logger.error('Error getting credentials:', error);
      throw error;
    }
  }

  async testConnection(partnerId, userId) {
    try {
      const partner = await this.getPartner(partnerId, userId);
      const credentials = await this.getCredentials(partnerId, userId);
      
      if (!partner) {
        throw new Error('Partner not found');
      }
      
      const connectionResult = {
        partnerId,
        success: false,
        latency: 0,
        error: null,
        timestamp: new Date()
      };
      
      const startTime = Date.now();
      
      try {
        switch (partner.type) {
          case 'api':
            await this.testApiConnection(partner, credentials);
            break;
          case 'webhook':
            await this.testWebhookConnection(partner, credentials);
            break;
          case 'database':
            await this.testDatabaseConnection(partner, credentials);
            break;
          case 'file':
            await this.testFileConnection(partner, credentials);
            break;
          default:
            throw new Error(`Unknown partner type: ${partner.type}`);
        }
        
        connectionResult.success = true;
        connectionResult.latency = Date.now() - startTime;
        
        // Store connection
        this.connections.set(partnerId, {
          ...connectionResult,
          lastTested: new Date()
        });
        
        logger.info(`Connection test successful for partner: ${partnerId}`, {
          latency: connectionResult.latency
        });
        
      } catch (error) {
        connectionResult.error = error.message;
        connectionResult.latency = Date.now() - startTime;
        
        logger.error(`Connection test failed for partner: ${partnerId}`, error);
      }
      
      return connectionResult;
    } catch (error) {
      logger.error('Error testing connection:', error);
      throw error;
    }
  }

  async testApiConnection(partner, credentials) {
    try {
      const { configuration } = partner;
      const { baseUrl, timeout = 30000 } = configuration;
      
      if (!baseUrl) {
        throw new Error('Base URL not configured');
      }
      
      const axios = require('axios');
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: timeout,
        validateStatus: () => true
      });
      
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      logger.error('Error testing API connection:', error);
      throw error;
    }
  }

  async testWebhookConnection(partner, credentials) {
    try {
      const { configuration } = partner;
      const { webhookUrl, timeout = 30000 } = configuration;
      
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      const axios = require('axios');
      const response = await axios.get(webhookUrl, {
        timeout: timeout,
        validateStatus: () => true
      });
      
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } catch (error) {
      logger.error('Error testing webhook connection:', error);
      throw error;
    }
  }

  async testDatabaseConnection(partner, credentials) {
    try {
      const { configuration } = partner;
      const { connectionString, timeout = 30000 } = configuration;
      
      if (!connectionString) {
        throw new Error('Connection string not configured');
      }
      
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: connectionString,
        max: 1,
        idleTimeoutMillis: timeout
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      return true;
    } catch (error) {
      logger.error('Error testing database connection:', error);
      throw error;
    }
  }

  async testFileConnection(partner, credentials) {
    try {
      const { configuration } = partner;
      const { filePath } = configuration;
      
      if (!filePath) {
        throw new Error('File path not configured');
      }
      
      const fs = require('fs').promises;
      await fs.access(filePath, fs.constants.F_OK);
      
      return true;
    } catch (error) {
      logger.error('Error testing file connection:', error);
      throw error;
    }
  }

  async getPartnerStats() {
    try {
      const stats = {
        totalPartners: this.partners.size,
        activePartners: Array.from(this.partners.values()).filter(p => p.is_active).length,
        totalConnections: this.connections.size,
        activeConnections: Array.from(this.connections.values()).filter(c => c.success).length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting partner stats:', error);
      throw error;
    }
  }

  encryptCredentials(credentials) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      logger.error('Error encrypting credentials:', error);
      throw error;
    }
  }

  decryptCredentials(encryptedCredentials) {
    try {
      const { encrypted, iv, authTag } = JSON.parse(encryptedCredentials);
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting credentials:', error);
      throw error;
    }
  }
}

module.exports = PartnerManager;
