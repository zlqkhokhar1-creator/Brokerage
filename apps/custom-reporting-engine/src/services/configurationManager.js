const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

class ConfigurationManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.configurations = new Map();
    this.configSchemas = new Map();
    this.configHistory = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load configuration schemas
      await this.loadConfigurationSchemas();
      
      // Load configurations
      await this.loadConfigurations();
      
      this._initialized = true;
      logger.info('ConfigurationManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ConfigurationManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ConfigurationManager closed');
    } catch (error) {
      logger.error('Error closing ConfigurationManager:', error);
    }
  }

  async loadConfigurationSchemas() {
    try {
      this.configSchemas = new Map([
        ['report_generation', {
          name: 'Report Generation',
          description: 'Configuration for report generation settings',
          properties: {
            maxConcurrentReports: {
              type: 'number',
              default: 10,
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of concurrent report generations'
            },
            defaultFormat: {
              type: 'string',
              default: 'pdf',
              enum: ['pdf', 'excel', 'csv', 'json'],
              description: 'Default report format'
            },
            timeout: {
              type: 'number',
              default: 300000,
              minimum: 1000,
              maximum: 3600000,
              description: 'Report generation timeout in milliseconds'
            },
            enableCaching: {
              type: 'boolean',
              default: true,
              description: 'Enable report caching'
            },
            cacheTTL: {
              type: 'number',
              default: 3600,
              minimum: 60,
              maximum: 86400,
              description: 'Cache TTL in seconds'
            }
          }
        }],
        ['dashboard_settings', {
          name: 'Dashboard Settings',
          description: 'Configuration for dashboard settings',
          properties: {
            maxWidgets: {
              type: 'number',
              default: 50,
              minimum: 1,
              maximum: 200,
              description: 'Maximum number of widgets per dashboard'
            },
            refreshInterval: {
              type: 'number',
              default: 30000,
              minimum: 5000,
              maximum: 300000,
              description: 'Default refresh interval in milliseconds'
            },
            enableRealTime: {
              type: 'boolean',
              default: true,
              description: 'Enable real-time updates'
            },
            maxDataPoints: {
              type: 'number',
              default: 1000,
              minimum: 100,
              maximum: 10000,
              description: 'Maximum data points per widget'
            }
          }
        }],
        ['export_settings', {
          name: 'Export Settings',
          description: 'Configuration for export settings',
          properties: {
            maxFileSize: {
              type: 'number',
              default: 104857600,
              minimum: 1048576,
              maximum: 1073741824,
              description: 'Maximum export file size in bytes'
            },
            supportedFormats: {
              type: 'array',
              default: ['excel', 'csv', 'pdf', 'json'],
              items: {
                type: 'string',
                enum: ['excel', 'csv', 'pdf', 'json', 'xml', 'html']
              },
              description: 'Supported export formats'
            },
            compressionEnabled: {
              type: 'boolean',
              default: true,
              description: 'Enable file compression'
            },
            retentionDays: {
              type: 'number',
              default: 30,
              minimum: 1,
              maximum: 365,
              description: 'Export file retention in days'
            }
          }
        }],
        ['notification_settings', {
          name: 'Notification Settings',
          description: 'Configuration for notification settings',
          properties: {
            enableEmail: {
              type: 'boolean',
              default: true,
              description: 'Enable email notifications'
            },
            enablePush: {
              type: 'boolean',
              default: true,
              description: 'Enable push notifications'
            },
            enableSMS: {
              type: 'boolean',
              default: false,
              description: 'Enable SMS notifications'
            },
            maxRetries: {
              type: 'number',
              default: 3,
              minimum: 1,
              maximum: 10,
              description: 'Maximum notification retry attempts'
            },
            retryDelay: {
              type: 'number',
              default: 5000,
              minimum: 1000,
              maximum: 60000,
              description: 'Retry delay in milliseconds'
            }
          }
        }],
        ['security_settings', {
          name: 'Security Settings',
          description: 'Configuration for security settings',
          properties: {
            enableMFA: {
              type: 'boolean',
              default: true,
              description: 'Enable multi-factor authentication'
            },
            sessionTimeout: {
              type: 'number',
              default: 480,
              minimum: 15,
              maximum: 1440,
              description: 'Session timeout in minutes'
            },
            maxLoginAttempts: {
              type: 'number',
              default: 5,
              minimum: 3,
              maximum: 20,
              description: 'Maximum login attempts before lockout'
            },
            lockoutDuration: {
              type: 'number',
              default: 30,
              minimum: 5,
              maximum: 1440,
              description: 'Account lockout duration in minutes'
            },
            requireHTTPS: {
              type: 'boolean',
              default: true,
              description: 'Require HTTPS for all connections'
            }
          }
        }],
        ['performance_settings', {
          name: 'Performance Settings',
          description: 'Configuration for performance settings',
          properties: {
            enableCaching: {
              type: 'boolean',
              default: true,
              description: 'Enable system-wide caching'
            },
            cacheSize: {
              type: 'number',
              default: 1000,
              minimum: 100,
              maximum: 10000,
              description: 'Maximum cache size in MB'
            },
            enableCompression: {
              type: 'boolean',
              default: true,
              description: 'Enable response compression'
            },
            maxConcurrentRequests: {
              type: 'number',
              default: 1000,
              minimum: 100,
              maximum: 10000,
              description: 'Maximum concurrent requests'
            },
            requestTimeout: {
              type: 'number',
              default: 30000,
              minimum: 5000,
              maximum: 300000,
              description: 'Request timeout in milliseconds'
            }
          }
        }]
      ]);
      
      logger.info('Configuration schemas loaded successfully');
    } catch (error) {
      logger.error('Error loading configuration schemas:', error);
      throw error;
    }
  }

  async loadConfigurations() {
    try {
      const query = 'SELECT * FROM configurations WHERE active = true';
      const result = await pool.query(query);
      
      for (const row of result.rows) {
        this.configurations.set(row.name, {
          id: row.id,
          name: row.name,
          value: row.value,
          schema: row.schema,
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      logger.info('Configurations loaded successfully');
    } catch (error) {
      logger.error('Error loading configurations:', error);
      throw error;
    }
  }

  async getConfiguration(name, defaultValue = null) {
    try {
      // Check in-memory cache first
      if (this.configurations.has(name)) {
        return this.configurations.get(name).value;
      }
      
      // Check Redis cache
      const cacheKey = `config:${name}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const config = JSON.parse(cached);
        this.configurations.set(name, config);
        return config.value;
      }
      
      // Load from database
      const query = 'SELECT * FROM configurations WHERE name = $1 AND active = true';
      const result = await pool.query(query, [name]);
      
      if (result.rows.length === 0) {
        return defaultValue;
      }
      
      const config = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        value: result.rows[0].value,
        schema: result.rows[0].schema,
        version: result.rows[0].version,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };
      
      // Cache in memory and Redis
      this.configurations.set(name, config);
      await this.redis.setex(cacheKey, 3600, JSON.stringify(config));
      
      return config.value;
    } catch (error) {
      logger.error('Error getting configuration:', error);
      throw error;
    }
  }

  async setConfiguration(name, value, schema = null) {
    try {
      // Validate against schema if provided
      if (schema) {
        const validationResult = await this.validateConfiguration(value, schema);
        if (!validationResult.valid) {
          throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
        }
      }
      
      const configId = nanoid();
      const timestamp = new Date().toISOString();
      
      // Store in database
      const query = `
        INSERT INTO configurations (id, name, value, schema, version, created_at, updated_at, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          value = EXCLUDED.value,
          schema = EXCLUDED.schema,
          version = EXCLUDED.version + 1,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        configId,
        name,
        JSON.stringify(value),
        schema,
        1,
        timestamp,
        timestamp,
        true
      ]);
      
      // Update in-memory cache
      const config = {
        id: configId,
        name,
        value,
        schema,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      this.configurations.set(name, config);
      
      // Cache in Redis
      const cacheKey = `config:${name}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(config));
      
      // Store in history
      await this.storeConfigurationHistory(name, value, schema, 'set');
      
      this.emit('configurationChanged', { name, value, schema });
      
      logger.info(`Configuration set: ${name}`);
      
      return config;
    } catch (error) {
      logger.error('Error setting configuration:', error);
      throw error;
    }
  }

  async updateConfiguration(name, value, schema = null) {
    try {
      // Get current configuration
      const currentConfig = await this.getConfiguration(name);
      if (!currentConfig) {
        throw new Error(`Configuration not found: ${name}`);
      }
      
      // Validate against schema if provided
      if (schema) {
        const validationResult = await this.validateConfiguration(value, schema);
        if (!validationResult.valid) {
          throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
        }
      }
      
      const timestamp = new Date().toISOString();
      
      // Update in database
      const query = `
        UPDATE configurations 
        SET value = $1, schema = $2, version = version + 1, updated_at = $3
        WHERE name = $4 AND active = true
      `;
      
      await pool.query(query, [
        JSON.stringify(value),
        schema,
        timestamp,
        name
      ]);
      
      // Update in-memory cache
      const config = this.configurations.get(name);
      config.value = value;
      config.schema = schema;
      config.version += 1;
      config.updatedAt = timestamp;
      
      this.configurations.set(name, config);
      
      // Cache in Redis
      const cacheKey = `config:${name}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(config));
      
      // Store in history
      await this.storeConfigurationHistory(name, value, schema, 'update');
      
      this.emit('configurationChanged', { name, value, schema });
      
      logger.info(`Configuration updated: ${name}`);
      
      return config;
    } catch (error) {
      logger.error('Error updating configuration:', error);
      throw error;
    }
  }

  async deleteConfiguration(name) {
    try {
      // Soft delete in database
      const query = 'UPDATE configurations SET active = false WHERE name = $1';
      await pool.query(query, [name]);
      
      // Remove from in-memory cache
      this.configurations.delete(name);
      
      // Remove from Redis cache
      const cacheKey = `config:${name}`;
      await this.redis.del(cacheKey);
      
      // Store in history
      await this.storeConfigurationHistory(name, null, null, 'delete');
      
      this.emit('configurationDeleted', { name });
      
      logger.info(`Configuration deleted: ${name}`);
    } catch (error) {
      logger.error('Error deleting configuration:', error);
      throw error;
    }
  }

  async validateConfiguration(value, schema) {
    try {
      const errors = [];
      
      if (!schema || !schema.properties) {
        return { valid: true, errors: [] };
      }
      
      for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        const propertyValue = value[propertyName];
        
        // Check required properties
        if (propertySchema.required && propertyValue === undefined) {
          errors.push(`Property '${propertyName}' is required`);
          continue;
        }
        
        // Skip validation if property is not provided and not required
        if (propertyValue === undefined) {
          continue;
        }
        
        // Type validation
        if (propertySchema.type) {
          const isValidType = this.validateType(propertyValue, propertySchema.type);
          if (!isValidType) {
            errors.push(`Property '${propertyName}' must be of type ${propertySchema.type}`);
            continue;
          }
        }
        
        // Enum validation
        if (propertySchema.enum && !propertySchema.enum.includes(propertyValue)) {
          errors.push(`Property '${propertyName}' must be one of: ${propertySchema.enum.join(', ')}`);
          continue;
        }
        
        // Range validation for numbers
        if (propertySchema.type === 'number') {
          if (propertySchema.minimum !== undefined && propertyValue < propertySchema.minimum) {
            errors.push(`Property '${propertyName}' must be at least ${propertySchema.minimum}`);
          }
          if (propertySchema.maximum !== undefined && propertyValue > propertySchema.maximum) {
            errors.push(`Property '${propertyName}' must be at most ${propertySchema.maximum}`);
          }
        }
        
        // String length validation
        if (propertySchema.type === 'string') {
          if (propertySchema.minLength !== undefined && propertyValue.length < propertySchema.minLength) {
            errors.push(`Property '${propertyName}' must be at least ${propertySchema.minLength} characters long`);
          }
          if (propertySchema.maxLength !== undefined && propertyValue.length > propertySchema.maxLength) {
            errors.push(`Property '${propertyName}' must be at most ${propertySchema.maxLength} characters long`);
          }
        }
        
        // Array validation
        if (propertySchema.type === 'array') {
          if (!Array.isArray(propertyValue)) {
            errors.push(`Property '${propertyName}' must be an array`);
            continue;
          }
          
          if (propertySchema.minItems !== undefined && propertyValue.length < propertySchema.minItems) {
            errors.push(`Property '${propertyName}' must have at least ${propertySchema.minItems} items`);
          }
          if (propertySchema.maxItems !== undefined && propertyValue.length > propertySchema.maxItems) {
            errors.push(`Property '${propertyName}' must have at most ${propertySchema.maxItems} items`);
          }
          
          // Validate array items
          if (propertySchema.items) {
            for (let i = 0; i < propertyValue.length; i++) {
              const itemValue = propertyValue[i];
              if (propertySchema.items.type) {
                const isValidItemType = this.validateType(itemValue, propertySchema.items.type);
                if (!isValidItemType) {
                  errors.push(`Property '${propertyName}[${i}]' must be of type ${propertySchema.items.type}`);
                }
              }
              if (propertySchema.items.enum && !propertySchema.items.enum.includes(itemValue)) {
                errors.push(`Property '${propertyName}[${i}]' must be one of: ${propertySchema.items.enum.join(', ')}`);
              }
            }
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Error validating configuration:', error);
      throw error;
    }
  }

  validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  async storeConfigurationHistory(name, value, schema, action) {
    try {
      const query = `
        INSERT INTO configuration_history (
          id, name, value, schema, action, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(query, [
        nanoid(),
        name,
        value ? JSON.stringify(value) : null,
        schema,
        action,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing configuration history:', error);
      throw error;
    }
  }

  async getConfigurationHistory(name, limit = 100) {
    try {
      const query = `
        SELECT * FROM configuration_history 
        WHERE name = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      
      const result = await pool.query(query, [name, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        value: row.value,
        schema: row.schema,
        action: row.action,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Error getting configuration history:', error);
      throw error;
    }
  }

  async getConfigurationSchemas() {
    try {
      return Array.from(this.configSchemas.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting configuration schemas:', error);
      throw error;
    }
  }

  async getAllConfigurations() {
    try {
      return Array.from(this.configurations.entries()).map(([name, config]) => ({
        name,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting all configurations:', error);
      throw error;
    }
  }

  async exportConfigurations() {
    try {
      const configurations = await this.getAllConfigurations();
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        configurations: configurations.reduce((acc, config) => {
          acc[config.name] = config.value;
          return acc;
        }, {})
      };
      
      return exportData;
    } catch (error) {
      logger.error('Error exporting configurations:', error);
      throw error;
    }
  }

  async importConfigurations(importData, overwrite = false) {
    try {
      if (!importData.configurations) {
        throw new Error('Invalid import data: missing configurations');
      }
      
      const imported = [];
      const errors = [];
      
      for (const [name, value] of Object.entries(importData.configurations)) {
        try {
          const existingConfig = await this.getConfiguration(name);
          
          if (existingConfig && !overwrite) {
            errors.push(`Configuration '${name}' already exists and overwrite is disabled`);
            continue;
          }
          
          await this.setConfiguration(name, value);
          imported.push(name);
        } catch (error) {
          errors.push(`Failed to import configuration '${name}': ${error.message}`);
        }
      }
      
      return {
        imported,
        errors,
        total: Object.keys(importData.configurations).length
      };
    } catch (error) {
      logger.error('Error importing configurations:', error);
      throw error;
    }
  }

  async resetConfiguration(name) {
    try {
      const schema = this.configSchemas.get(name);
      if (!schema) {
        throw new Error(`Configuration schema not found: ${name}`);
      }
      
      // Reset to default values
      const defaultValue = {};
      for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        if (propertySchema.default !== undefined) {
          defaultValue[propertyName] = propertySchema.default;
        }
      }
      
      await this.setConfiguration(name, defaultValue, schema);
      
      logger.info(`Configuration reset to defaults: ${name}`);
    } catch (error) {
      logger.error('Error resetting configuration:', error);
      throw error;
    }
  }

  async getConfigurationStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_configurations,
          COUNT(CASE WHEN active = true THEN 1 END) as active_configurations,
          COUNT(CASE WHEN active = false THEN 1 END) as inactive_configurations
        FROM configurations
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting configuration stats:', error);
      throw error;
    }
  }
}

module.exports = ConfigurationManager;
