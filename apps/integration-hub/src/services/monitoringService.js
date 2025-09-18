const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load alerts
      await this.loadAlerts();
      
      // Load health checks
      await this.loadHealthChecks();
      
      this._initialized = true;
      logger.info('MonitoringService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MonitoringService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MonitoringService closed');
    } catch (error) {
      logger.error('Error closing MonitoringService:', error);
    }
  }

  async loadAlerts() {
    try {
      const result = await pool.query(`
        SELECT * FROM monitoring_alerts
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      
      for (const alert of result.rows) {
        this.alerts.set(alert.id, {
          ...alert,
          config: alert.config ? JSON.parse(alert.config) : {},
          conditions: alert.conditions ? JSON.parse(alert.conditions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} monitoring alerts`);
    } catch (error) {
      logger.error('Error loading alerts:', error);
      throw error;
    }
  }

  async loadHealthChecks() {
    try {
      const result = await pool.query(`
        SELECT * FROM health_checks
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const healthCheck of result.rows) {
        this.healthChecks.set(healthCheck.id, {
          ...healthCheck,
          config: healthCheck.config ? JSON.parse(healthCheck.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} health checks`);
    } catch (error) {
      logger.error('Error loading health checks:', error);
      throw error;
    }
  }

  async monitorAllIntegrations() {
    try {
      const integrations = await this.getActiveIntegrations();
      const results = {
        totalIntegrations: integrations.length,
        healthyIntegrations: 0,
        unhealthyIntegrations: 0,
        alerts: []
      };
      
      for (const integration of integrations) {
        try {
          const healthStatus = await this.checkIntegrationHealth(integration);
          
          if (healthStatus.healthy) {
            results.healthyIntegrations++;
          } else {
            results.unhealthyIntegrations++;
            
            // Check for alerts
            const integrationAlerts = await this.checkIntegrationAlerts(integration, healthStatus);
            results.alerts.push(...integrationAlerts);
          }
        } catch (error) {
          logger.error(`Error monitoring integration ${integration.id}:`, error);
          results.unhealthyIntegrations++;
        }
      }
      
      // Store metrics
      await this.storeMetrics('integration_health', {
        total: results.totalIntegrations,
        healthy: results.healthyIntegrations,
        unhealthy: results.unhealthyIntegrations,
        timestamp: new Date()
      });
      
      // Process alerts
      for (const alert of results.alerts) {
        await this.processAlert(alert);
      }
      
      logger.info('Integration monitoring completed', {
        total: results.totalIntegrations,
        healthy: results.healthyIntegrations,
        unhealthy: results.unhealthyIntegrations,
        alerts: results.alerts.length
      });
      
      return results;
    } catch (error) {
      logger.error('Error monitoring integrations:', error);
      throw error;
    }
  }

  async getActiveIntegrations() {
    try {
      const result = await pool.query(`
        SELECT * FROM integrations
        WHERE is_active = true AND status = 'active'
        ORDER BY created_at ASC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting active integrations:', error);
      return [];
    }
  }

  async checkIntegrationHealth(integration) {
    try {
      const { id, type, configuration } = integration;
      const healthStatus = {
        integrationId: id,
        healthy: true,
        checks: [],
        timestamp: new Date()
      };
      
      // Check integration-specific health
      switch (type) {
        case 'api':
          await this.checkApiIntegrationHealth(integration, healthStatus);
          break;
        case 'webhook':
          await this.checkWebhookIntegrationHealth(integration, healthStatus);
          break;
        case 'database':
          await this.checkDatabaseIntegrationHealth(integration, healthStatus);
          break;
        case 'file':
          await this.checkFileIntegrationHealth(integration, healthStatus);
          break;
        default:
          healthStatus.healthy = false;
          healthStatus.checks.push({
            name: 'type_check',
            status: 'failed',
            message: `Unknown integration type: ${type}`
          });
      }
      
      // Check overall health
      healthStatus.healthy = healthStatus.checks.every(check => check.status === 'passed');
      
      // Store health status
      await this.storeHealthStatus(healthStatus);
      
      return healthStatus;
    } catch (error) {
      logger.error(`Error checking integration health ${integration.id}:`, error);
      return {
        integrationId: integration.id,
        healthy: false,
        checks: [{
          name: 'error_check',
          status: 'failed',
          message: error.message
        }],
        timestamp: new Date()
      };
    }
  }

  async checkApiIntegrationHealth(integration, healthStatus) {
    try {
      const { configuration } = integration;
      const { baseUrl, timeout = 30000 } = configuration;
      
      if (!baseUrl) {
        healthStatus.checks.push({
          name: 'api_url_check',
          status: 'failed',
          message: 'Base URL not configured'
        });
        return;
      }
      
      // Check API connectivity
      const axios = require('axios');
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${baseUrl}/health`, {
          timeout: timeout,
          validateStatus: () => true
        });
        
        const duration = Date.now() - startTime;
        
        if (response.status >= 200 && response.status < 300) {
          healthStatus.checks.push({
            name: 'api_connectivity',
            status: 'passed',
            message: `API responded with status ${response.status}`,
            duration: duration
          });
        } else {
          healthStatus.checks.push({
            name: 'api_connectivity',
            status: 'failed',
            message: `API responded with status ${response.status}`,
            duration: duration
          });
        }
      } catch (error) {
        healthStatus.checks.push({
          name: 'api_connectivity',
          status: 'failed',
          message: `API connection failed: ${error.message}`
        });
      }
    } catch (error) {
      logger.error('Error checking API integration health:', error);
    }
  }

  async checkWebhookIntegrationHealth(integration, healthStatus) {
    try {
      const { configuration } = integration;
      const { webhookUrl, timeout = 30000 } = configuration;
      
      if (!webhookUrl) {
        healthStatus.checks.push({
          name: 'webhook_url_check',
          status: 'failed',
          message: 'Webhook URL not configured'
        });
        return;
      }
      
      // Check webhook endpoint
      const axios = require('axios');
      const startTime = Date.now();
      
      try {
        const response = await axios.get(webhookUrl, {
          timeout: timeout,
          validateStatus: () => true
        });
        
        const duration = Date.now() - startTime;
        
        if (response.status >= 200 && response.status < 300) {
          healthStatus.checks.push({
            name: 'webhook_connectivity',
            status: 'passed',
            message: `Webhook responded with status ${response.status}`,
            duration: duration
          });
        } else {
          healthStatus.checks.push({
            name: 'webhook_connectivity',
            status: 'failed',
            message: `Webhook responded with status ${response.status}`,
            duration: duration
          });
        }
      } catch (error) {
        healthStatus.checks.push({
          name: 'webhook_connectivity',
          status: 'failed',
          message: `Webhook connection failed: ${error.message}`
        });
      }
    } catch (error) {
      logger.error('Error checking webhook integration health:', error);
    }
  }

  async checkDatabaseIntegrationHealth(integration, healthStatus) {
    try {
      const { configuration } = integration;
      const { connectionString, timeout = 30000 } = configuration;
      
      if (!connectionString) {
        healthStatus.checks.push({
          name: 'database_connection_check',
          status: 'failed',
          message: 'Connection string not configured'
        });
        return;
      }
      
      // Check database connectivity
      const startTime = Date.now();
      
      try {
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
        
        const duration = Date.now() - startTime;
        
        healthStatus.checks.push({
          name: 'database_connectivity',
          status: 'passed',
          message: 'Database connection successful',
          duration: duration
        });
      } catch (error) {
        healthStatus.checks.push({
          name: 'database_connectivity',
          status: 'failed',
          message: `Database connection failed: ${error.message}`
        });
      }
    } catch (error) {
      logger.error('Error checking database integration health:', error);
    }
  }

  async checkFileIntegrationHealth(integration, healthStatus) {
    try {
      const { configuration } = integration;
      const { filePath, timeout = 30000 } = configuration;
      
      if (!filePath) {
        healthStatus.checks.push({
          name: 'file_path_check',
          status: 'failed',
          message: 'File path not configured'
        });
        return;
      }
      
      // Check file accessibility
      const fs = require('fs').promises;
      const startTime = Date.now();
      
      try {
        await fs.access(filePath, fs.constants.F_OK);
        const stats = await fs.stat(filePath);
        
        const duration = Date.now() - startTime;
        
        healthStatus.checks.push({
          name: 'file_accessibility',
          status: 'passed',
          message: `File accessible, size: ${stats.size} bytes`,
          duration: duration
        });
      } catch (error) {
        healthStatus.checks.push({
          name: 'file_accessibility',
          status: 'failed',
          message: `File access failed: ${error.message}`
        });
      }
    } catch (error) {
      logger.error('Error checking file integration health:', error);
    }
  }

  async checkIntegrationAlerts(integration, healthStatus) {
    try {
      const alerts = [];
      
      for (const [alertId, alert] of this.alerts.entries()) {
        if (alert.integration_id === integration.id && alert.is_active) {
          const alertResult = await this.evaluateAlert(alert, healthStatus);
          if (alertResult.triggered) {
            alerts.push(alertResult);
          }
        }
      }
      
      return alerts;
    } catch (error) {
      logger.error('Error checking integration alerts:', error);
      return [];
    }
  }

  async evaluateAlert(alert, healthStatus) {
    try {
      const { conditions, config } = alert;
      const alertResult = {
        alertId: alert.id,
        integrationId: healthStatus.integrationId,
        triggered: false,
        severity: alert.severity,
        message: alert.message,
        timestamp: new Date()
      };
      
      for (const condition of conditions) {
        const conditionResult = this.evaluateCondition(condition, healthStatus);
        if (conditionResult) {
          alertResult.triggered = true;
          alertResult.condition = condition;
          break;
        }
      }
      
      return alertResult;
    } catch (error) {
      logger.error('Error evaluating alert:', error);
      return {
        alertId: alert.id,
        integrationId: healthStatus.integrationId,
        triggered: false,
        error: error.message
      };
    }
  }

  evaluateCondition(condition, healthStatus) {
    try {
      const { type, field, operator, value } = condition;
      
      let fieldValue;
      switch (field) {
        case 'healthy':
          fieldValue = healthStatus.healthy;
          break;
        case 'check_count':
          fieldValue = healthStatus.checks.length;
          break;
        case 'failed_checks':
          fieldValue = healthStatus.checks.filter(c => c.status === 'failed').length;
          break;
        case 'duration':
          fieldValue = healthStatus.checks.reduce((sum, c) => sum + (c.duration || 0), 0);
          break;
        default:
          fieldValue = this.getNestedValue(healthStatus, field);
      }
      
      switch (type) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'greater_than_or_equal':
          return fieldValue >= value;
        case 'less_than_or_equal':
          return fieldValue <= value;
        case 'contains':
          return fieldValue && fieldValue.toString().includes(value);
        case 'not_contains':
          return !fieldValue || !fieldValue.toString().includes(value);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async processAlert(alert) {
    try {
      // Store alert
      await this.storeAlert(alert);
      
      // Send notification
      await this.sendAlertNotification(alert);
      
      // Emit event
      this.emit('alertTriggered', alert);
      
      logger.info(`Alert triggered: ${alert.alertId}`, {
        integrationId: alert.integrationId,
        severity: alert.severity
      });
    } catch (error) {
      logger.error('Error processing alert:', error);
    }
  }

  async storeAlert(alert) {
    try {
      await pool.query(`
        INSERT INTO alert_instances (id, alert_id, integration_id, severity, message, condition, triggered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        nanoid(), alert.alertId, alert.integrationId, alert.severity,
        alert.message, JSON.stringify(alert.condition), alert.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
    }
  }

  async sendAlertNotification(alert) {
    try {
      // This would integrate with notification services
      logger.info(`Alert notification sent: ${alert.alertId}`, {
        integrationId: alert.integrationId,
        severity: alert.severity,
        message: alert.message
      });
    } catch (error) {
      logger.error('Error sending alert notification:', error);
    }
  }

  async storeHealthStatus(healthStatus) {
    try {
      await pool.query(`
        INSERT INTO health_status (id, integration_id, healthy, checks, timestamp)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        nanoid(), healthStatus.integrationId, healthStatus.healthy,
        JSON.stringify(healthStatus.checks), healthStatus.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing health status:', error);
    }
  }

  async storeMetrics(metricType, data) {
    try {
      await pool.query(`
        INSERT INTO monitoring_metrics (id, metric_type, data, timestamp)
        VALUES ($1, $2, $3, $4)
      `, [
        nanoid(), metricType, JSON.stringify(data), new Date()
      ]);
    } catch (error) {
      logger.error('Error storing metrics:', error);
    }
  }

  async getMetrics(timeRange, metricType, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      let query = `
        SELECT * FROM monitoring_metrics
        WHERE timestamp >= $1
      `;
      const params = [timeCondition];
      let paramCount = 2;
      
      if (metricType) {
        query += ` AND metric_type = $${paramCount}`;
        params.push(metricType);
        paramCount++;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT 1000`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async getAlerts(severity, status, limit, userId) {
    try {
      let query = `
        SELECT * FROM alert_instances
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (severity) {
        query += ` AND severity = $${paramCount}`;
        params.push(severity);
        paramCount++;
      }
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY triggered_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  getNestedValue(obj, path) {
    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    } catch (error) {
      logger.error('Error getting nested value:', error);
      return null;
    }
  }

  async getMonitoringStats() {
    try {
      const stats = {
        totalAlerts: this.alerts.size,
        activeAlerts: Array.from(this.alerts.values()).filter(a => a.is_active).length,
        totalHealthChecks: this.healthChecks.size,
        activeHealthChecks: Array.from(this.healthChecks.values()).filter(h => h.is_active).length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting monitoring stats:', error);
      throw error;
    }
  }
}

module.exports = MonitoringService;
