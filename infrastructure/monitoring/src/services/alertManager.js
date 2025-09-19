const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const emailService = require('./emailService');
const smsService = require('./smsService');

class AlertManager {
  constructor() {
    this.alertRules = new Map();
    this.alertHistory = [];
    this.maxHistorySize = 10000;
  }

  async createAlert(alert) {
    try {
      // Store alert in database
      await this.storeAlert(alert);
      
      // Store in Redis for quick access
      await redis.set(`alert:${alert.id}`, alert, 3600);
      
      // Add to alert history
      this.alertHistory.unshift(alert);
      if (this.alertHistory.length > this.maxHistorySize) {
        this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
      }
      
      // Send notifications
      await this.sendNotifications(alert);
      
      logger.info('Alert created:', { alertId: alert.id, type: alert.type, severity: alert.severity });
      
      return {
        success: true,
        alertId: alert.id,
        message: 'Alert created successfully'
      };
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async storeAlert(alert) {
    try {
      const query = `
        INSERT INTO alerts (
          id, type, severity, service, title, message, details, 
          timestamp, acknowledged, resolved
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await database.query(query, [
        alert.id,
        alert.type,
        alert.severity,
        alert.service,
        alert.title,
        alert.message,
        JSON.stringify(alert.details),
        alert.timestamp,
        alert.acknowledged,
        alert.resolved
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
      throw error;
    }
  }

  async sendNotifications(alert) {
    try {
      // Get notification rules for this alert type and severity
      const rules = await this.getNotificationRules(alert.type, alert.severity);
      
      for (const rule of rules) {
        try {
          switch (rule.channel) {
            case 'email':
              await this.sendEmailNotification(alert, rule);
              break;
            case 'sms':
              await this.sendSMSNotification(alert, rule);
              break;
            case 'webhook':
              await this.sendWebhookNotification(alert, rule);
              break;
            default:
              logger.warn('Unknown notification channel:', rule.channel);
          }
        } catch (error) {
          logger.error('Error sending notification:', { channel: rule.channel, error: error.message });
        }
      }
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  async getNotificationRules(alertType, severity) {
    try {
      const query = `
        SELECT * FROM notification_rules 
        WHERE (alert_type = $1 OR alert_type = '*') 
        AND (severity = $2 OR severity = '*')
        AND is_active = true
        ORDER BY priority DESC
      `;
      
      const result = await database.query(query, [alertType, severity]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        channel: row.channel,
        recipients: JSON.parse(row.recipients || '[]'),
        template: row.template,
        priority: row.priority,
        cooldown: row.cooldown
      }));
    } catch (error) {
      logger.error('Error getting notification rules:', error);
      return [];
    }
  }

  async sendEmailNotification(alert, rule) {
    try {
      const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
      const body = this.formatAlertMessage(alert, rule.template);
      
      for (const recipient of rule.recipients) {
        await emailService.sendEmail(recipient, subject, body);
      }
      
      logger.info('Email notification sent:', { alertId: alert.id, recipients: rule.recipients.length });
    } catch (error) {
      logger.error('Error sending email notification:', error);
      throw error;
    }
  }

  async sendSMSNotification(alert, rule) {
    try {
      const message = this.formatAlertMessage(alert, rule.template);
      
      for (const recipient of rule.recipients) {
        await smsService.sendSMS(recipient, message);
      }
      
      logger.info('SMS notification sent:', { alertId: alert.id, recipients: rule.recipients.length });
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  async sendWebhookNotification(alert, rule) {
    try {
      const axios = require('axios');
      
      const payload = {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        service: alert.service,
        title: alert.title,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp
      };
      
      for (const recipient of rule.recipients) {
        await axios.post(recipient, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Brokerage-Monitoring/1.0'
          }
        });
      }
      
      logger.info('Webhook notification sent:', { alertId: alert.id, recipients: rule.recipients.length });
    } catch (error) {
      logger.error('Error sending webhook notification:', error);
      throw error;
    }
  }

  formatAlertMessage(alert, template) {
    if (!template) {
      return `${alert.title}\n\n${alert.message}\n\nService: ${alert.service}\nSeverity: ${alert.severity}\nTime: ${alert.timestamp}`;
    }
    
    return template
      .replace('{{title}}', alert.title)
      .replace('{{message}}', alert.message)
      .replace('{{service}}', alert.service)
      .replace('{{severity}}', alert.severity)
      .replace('{{timestamp}}', alert.timestamp)
      .replace('{{details}}', JSON.stringify(alert.details, null, 2));
  }

  async getActiveAlerts() {
    try {
      const query = `
        SELECT * FROM alerts 
        WHERE resolved = false 
        ORDER BY timestamp DESC
      `;
      
      const result = await database.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        service: row.service,
        title: row.title,
        message: row.message,
        details: JSON.parse(row.details || '{}'),
        timestamp: row.timestamp,
        acknowledged: row.acknowledged,
        resolved: row.resolved,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at,
        resolution: row.resolution
      }));
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      throw error;
    }
  }

  async getRecentAlerts(limit = 50) {
    try {
      const query = `
        SELECT * FROM alerts 
        ORDER BY timestamp DESC 
        LIMIT $1
      `;
      
      const result = await database.query(query, [limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        service: row.service,
        title: row.title,
        message: row.message,
        timestamp: row.timestamp,
        acknowledged: row.acknowledged,
        resolved: row.resolved
      }));
    } catch (error) {
      logger.error('Error getting recent alerts:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const query = `
        UPDATE alerts 
        SET acknowledged = true, acknowledged_by = $2, acknowledged_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await database.query(query, [alertId, acknowledgedBy]);
      
      // Update in Redis
      const alert = await redis.get(`alert:${alertId}`);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        await redis.set(`alert:${alertId}`, alert, 3600);
      }
      
      logger.info('Alert acknowledged:', { alertId, acknowledgedBy });
      
      return {
        success: true,
        message: 'Alert acknowledged successfully'
      };
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId, resolvedBy, resolution) {
    try {
      const query = `
        UPDATE alerts 
        SET resolved = true, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP, resolution = $3
        WHERE id = $1
      `;
      
      await database.query(query, [alertId, resolvedBy, resolution]);
      
      // Update in Redis
      const alert = await redis.get(`alert:${alertId}`);
      if (alert) {
        alert.resolved = true;
        alert.resolvedBy = resolvedBy;
        alert.resolvedAt = new Date();
        alert.resolution = resolution;
        await redis.set(`alert:${alertId}`, alert, 3600);
      }
      
      logger.info('Alert resolved:', { alertId, resolvedBy, resolution });
      
      return {
        success: true,
        message: 'Alert resolved successfully'
      };
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  async createNotificationRule(ruleData) {
    try {
      const query = `
        INSERT INTO notification_rules (
          name, alert_type, severity, channel, recipients, template, priority, cooldown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const result = await database.query(query, [
        ruleData.name,
        ruleData.alertType,
        ruleData.severity,
        ruleData.channel,
        JSON.stringify(ruleData.recipients),
        ruleData.template,
        ruleData.priority,
        ruleData.cooldown
      ]);
      
      const ruleId = result.rows[0].id;
      
      logger.info('Notification rule created:', { ruleId, name: ruleData.name });
      
      return {
        success: true,
        ruleId,
        message: 'Notification rule created successfully'
      };
    } catch (error) {
      logger.error('Error creating notification rule:', error);
      throw error;
    }
  }

  async close() {
    try {
      await database.close();
      await redis.close();
      logger.info('Alert manager closed gracefully');
    } catch (error) {
      logger.error('Error closing alert manager:', error);
    }
  }
}

module.exports = new AlertManager();
