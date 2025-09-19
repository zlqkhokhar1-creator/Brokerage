const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class RiskAlertManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.activeAlerts = new Map();
    this.alertRules = new Map();
    this.alertHistory = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadAlertRules();
      logger.info('Risk Alert Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Risk Alert Manager:', error);
      throw error;
    }
  }

  async loadAlertRules() {
    try {
      const defaultRules = [
        {
          id: 'var95_exceeded',
          name: 'VaR 95% Exceeded',
          description: 'Portfolio VaR 95% exceeds threshold',
          condition: 'var95 > threshold',
          severity: 'high',
          enabled: true,
          threshold: 0.05
        },
        {
          id: 'var99_exceeded',
          name: 'VaR 99% Exceeded',
          description: 'Portfolio VaR 99% exceeds threshold',
          condition: 'var99 > threshold',
          severity: 'critical',
          enabled: true,
          threshold: 0.10
        },
        {
          id: 'cvar95_exceeded',
          name: 'CVaR 95% Exceeded',
          description: 'Portfolio CVaR 95% exceeds threshold',
          condition: 'cvar95 > threshold',
          severity: 'high',
          enabled: true,
          threshold: 0.08
        },
        {
          id: 'max_drawdown_exceeded',
          name: 'Max Drawdown Exceeded',
          description: 'Portfolio max drawdown exceeds threshold',
          condition: 'maxDrawdown > threshold',
          severity: 'high',
          enabled: true,
          threshold: 0.20
        },
        {
          id: 'concentration_risk_high',
          name: 'High Concentration Risk',
          description: 'Portfolio concentration risk is too high',
          condition: 'concentrationRisk > threshold',
          severity: 'medium',
          enabled: true,
          threshold: 30
        },
        {
          id: 'liquidity_risk_high',
          name: 'High Liquidity Risk',
          description: 'Portfolio liquidity risk is too high',
          condition: 'liquidityRisk > threshold',
          severity: 'medium',
          enabled: true,
          threshold: 50
        },
        {
          id: 'risk_score_high',
          name: 'High Risk Score',
          description: 'Portfolio risk score is too high',
          condition: 'riskScore > threshold',
          severity: 'high',
          enabled: true,
          threshold: 70
        },
        {
          id: 'correlation_risk_high',
          name: 'High Correlation Risk',
          description: 'Portfolio correlation risk is too high',
          condition: 'correlationRisk > threshold',
          severity: 'medium',
          enabled: true,
          threshold: 60
        }
      ];

      for (const rule of defaultRules) {
        this.alertRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${defaultRules.length} default alert rules`);
    } catch (error) {
      logger.error('Error loading alert rules:', error);
    }
  }

  async checkAlerts(portfolioId, riskMetrics) {
    try {
      const alerts = [];
      
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;
        
        const alert = await this.evaluateAlertRule(rule, portfolioId, riskMetrics);
        if (alert) {
          alerts.push(alert);
        }
      }
      
      // Process alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
      
      return alerts;
    } catch (error) {
      logger.error('Error checking alerts:', error);
      return [];
    }
  }

  async evaluateAlertRule(rule, portfolioId, riskMetrics) {
    try {
      let shouldTrigger = false;
      let currentValue = 0;
      
      switch (rule.id) {
        case 'var95_exceeded':
          currentValue = riskMetrics.var95;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'var99_exceeded':
          currentValue = riskMetrics.var99;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'cvar95_exceeded':
          currentValue = riskMetrics.cvar95;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'max_drawdown_exceeded':
          currentValue = riskMetrics.maxDrawdown * 100; // Convert to percentage
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'concentration_risk_high':
          currentValue = riskMetrics.concentrationRisk;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'liquidity_risk_high':
          currentValue = riskMetrics.liquidityRisk;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'risk_score_high':
          currentValue = riskMetrics.riskScore;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        case 'correlation_risk_high':
          currentValue = riskMetrics.correlationRisk || 0;
          shouldTrigger = currentValue > rule.threshold;
          break;
          
        default:
          return null;
      }
      
      if (shouldTrigger) {
        // Check if alert already exists and is active
        const existingAlert = await this.getActiveAlert(portfolioId, rule.id);
        if (existingAlert) {
          // Update existing alert
          return await this.updateAlert(existingAlert.id, {
            currentValue,
            lastTriggered: new Date(),
            triggerCount: existingAlert.triggerCount + 1
          });
        } else {
          // Create new alert
          return await this.createAlert(portfolioId, rule, currentValue, riskMetrics);
        }
      } else {
        // Check if alert should be resolved
        const existingAlert = await this.getActiveAlert(portfolioId, rule.id);
        if (existingAlert) {
          return await this.resolveAlert(existingAlert.id, 'Threshold no longer exceeded');
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Error evaluating alert rule ${rule.id}:`, error);
      return null;
    }
  }

  async createAlert(portfolioId, rule, currentValue, riskMetrics) {
    try {
      const alert = {
        id: uuidv4(),
        portfolioId,
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        severity: rule.severity,
        status: 'active',
        currentValue,
        threshold: rule.threshold,
        triggerCount: 1,
        firstTriggered: new Date(),
        lastTriggered: new Date(),
        resolvedAt: null,
        resolution: null,
        riskMetrics: {
          var95: riskMetrics.var95,
          var99: riskMetrics.var99,
          cvar95: riskMetrics.cvar95,
          maxDrawdown: riskMetrics.maxDrawdown,
          riskScore: riskMetrics.riskScore
        },
        createdAt: new Date()
      };
      
      // Store in database
      await this.storeAlert(alert);
      
      // Add to active alerts
      this.activeAlerts.set(alert.id, alert);
      
      logger.risk(portfolioId, `Risk alert triggered: ${rule.name}`, {
        alertId: alert.id,
        ruleId: rule.id,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity
      });
      
      this.emit('alertTriggered', alert);
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      return null;
    }
  }

  async updateAlert(alertId, updates) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        return null;
      }
      
      // Update alert
      Object.assign(alert, updates);
      
      // Update database
      await this.updateAlertInDatabase(alertId, updates);
      
      logger.info(`Alert ${alertId} updated`, updates);
      
      return alert;
    } catch (error) {
      logger.error(`Error updating alert ${alertId}:`, error);
      return null;
    }
  }

  async resolveAlert(alertId, resolution) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        return null;
      }
      
      // Update alert
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolution = resolution;
      
      // Update database
      await this.updateAlertInDatabase(alertId, {
        status: 'resolved',
        resolvedAt: alert.resolvedAt,
        resolution: resolution
      });
      
      // Remove from active alerts
      this.activeAlerts.delete(alertId);
      
      // Add to history
      this.alertHistory.set(alertId, alert);
      
      logger.info(`Alert ${alertId} resolved: ${resolution}`);
      
      this.emit('alertResolved', alert);
      
      return alert;
    } catch (error) {
      logger.error(`Error resolving alert ${alertId}:`, error);
      return null;
    }
  }

  async processAlert(alert) {
    try {
      // Send notifications based on severity
      switch (alert.severity) {
        case 'critical':
          await this.sendCriticalAlert(alert);
          break;
        case 'high':
          await this.sendHighPriorityAlert(alert);
          break;
        case 'medium':
          await this.sendMediumPriorityAlert(alert);
          break;
        case 'low':
          await this.sendLowPriorityAlert(alert);
          break;
      }
      
      // Store alert event
      await this.storeAlertEvent(alert, 'triggered');
      
    } catch (error) {
      logger.error(`Error processing alert ${alert.id}:`, error);
    }
  }

  async sendCriticalAlert(alert) {
    try {
      // Send immediate notifications for critical alerts
      logger.security('Critical risk alert', alert.portfolioId, {
        alertId: alert.id,
        ruleName: alert.ruleName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
      
      // In a real implementation, this would send:
      // - SMS notifications
      // - Email alerts
      // - Push notifications
      // - Webhook calls
      // - Slack/Teams messages
      
    } catch (error) {
      logger.error('Error sending critical alert:', error);
    }
  }

  async sendHighPriorityAlert(alert) {
    try {
      logger.security('High priority risk alert', alert.portfolioId, {
        alertId: alert.id,
        ruleName: alert.ruleName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
      
    } catch (error) {
      logger.error('Error sending high priority alert:', error);
    }
  }

  async sendMediumPriorityAlert(alert) {
    try {
      logger.security('Medium priority risk alert', alert.portfolioId, {
        alertId: alert.id,
        ruleName: alert.ruleName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
      
    } catch (error) {
      logger.error('Error sending medium priority alert:', error);
    }
  }

  async sendLowPriorityAlert(alert) {
    try {
      logger.security('Low priority risk alert', alert.portfolioId, {
        alertId: alert.id,
        ruleName: alert.ruleName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
      
    } catch (error) {
      logger.error('Error sending low priority alert:', error);
    }
  }

  async getAlerts(userId, status = 'active', limit = 100) {
    try {
      const query = `
        SELECT a.*, p.user_id
        FROM risk_alerts a
        JOIN portfolios p ON a.portfolio_id = p.id
        WHERE p.user_id = $1 AND a.status = $2
        ORDER BY a.created_at DESC
        LIMIT $3
      `;
      
      const result = await this.db.query(query, [userId, status, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        portfolioId: row.portfolio_id,
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        description: row.description,
        severity: row.severity,
        status: row.status,
        currentValue: parseFloat(row.current_value),
        threshold: parseFloat(row.threshold),
        triggerCount: row.trigger_count,
        firstTriggered: row.first_triggered,
        lastTriggered: row.last_triggered,
        resolvedAt: row.resolved_at,
        resolution: row.resolution,
        riskMetrics: row.risk_metrics,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error(`Error getting alerts for user ${userId}:`, error);
      return [];
    }
  }

  async acknowledgeAlerts(alertIds, userId) {
    try {
      const acknowledgedAlerts = [];
      
      for (const alertId of alertIds) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
          await this.updateAlert(alertId, {
            status: 'acknowledged',
            acknowledgedAt: new Date(),
            acknowledgedBy: userId
          });
          
          acknowledgedAlerts.push(alert);
          
          await this.storeAlertEvent(alert, 'acknowledged');
        }
      }
      
      logger.info(`${acknowledgedAlerts.length} alerts acknowledged by user ${userId}`);
      
      return {
        acknowledged: acknowledgedAlerts.length,
        alerts: acknowledgedAlerts
      };
    } catch (error) {
      logger.error('Error acknowledging alerts:', error);
      throw error;
    }
  }

  async resolveAlerts(alertIds, resolution, userId) {
    try {
      const resolvedAlerts = [];
      
      for (const alertId of alertIds) {
        const alert = await this.resolveAlert(alertId, resolution);
        if (alert) {
          resolvedAlerts.push(alert);
          
          await this.storeAlertEvent(alert, 'resolved', {
            resolvedBy: userId,
            resolution: resolution
          });
        }
      }
      
      logger.info(`${resolvedAlerts.length} alerts resolved by user ${userId}`);
      
      return {
        resolved: resolvedAlerts.length,
        alerts: resolvedAlerts
      };
    } catch (error) {
      logger.error('Error resolving alerts:', error);
      throw error;
    }
  }

  async getActiveAlert(portfolioId, ruleId) {
    try {
      const query = `
        SELECT * FROM risk_alerts 
        WHERE portfolio_id = $1 AND rule_id = $2 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [portfolioId, ruleId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        portfolioId: row.portfolio_id,
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        description: row.description,
        severity: row.severity,
        status: row.status,
        currentValue: parseFloat(row.current_value),
        threshold: parseFloat(row.threshold),
        triggerCount: row.trigger_count,
        firstTriggered: row.first_triggered,
        lastTriggered: row.last_triggered,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error(`Error getting active alert for portfolio ${portfolioId}, rule ${ruleId}:`, error);
      return null;
    }
  }

  async storeAlert(alert) {
    try {
      const query = `
        INSERT INTO risk_alerts (
          id, portfolio_id, rule_id, rule_name, description, severity, status,
          current_value, threshold, trigger_count, first_triggered, last_triggered,
          risk_metrics, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      await this.db.query(query, [
        alert.id,
        alert.portfolioId,
        alert.ruleId,
        alert.ruleName,
        alert.description,
        alert.severity,
        alert.status,
        alert.currentValue,
        alert.threshold,
        alert.triggerCount,
        alert.firstTriggered,
        alert.lastTriggered,
        JSON.stringify(alert.riskMetrics),
        alert.createdAt
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
      throw error;
    }
  }

  async updateAlertInDatabase(alertId, updates) {
    try {
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [alertId, ...Object.values(updates)];
      
      const query = `
        UPDATE risk_alerts 
        SET ${setClause}
        WHERE id = $1
      `;
      
      await this.db.query(query, values);
    } catch (error) {
      logger.error(`Error updating alert ${alertId} in database:`, error);
      throw error;
    }
  }

  async storeAlertEvent(alert, eventType, metadata = {}) {
    try {
      const query = `
        INSERT INTO risk_alert_events (
          alert_id, event_type, metadata, created_at
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await this.db.query(query, [
        alert.id,
        eventType,
        JSON.stringify(metadata),
        new Date()
      ]);
    } catch (error) {
      logger.error('Error storing alert event:', error);
    }
  }

  async getAlertStatistics(userId, timeframe = '30d') {
    try {
      const days = this.getDaysFromTimeframe(timeframe);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const query = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
          COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_alerts,
          COUNT(*) FILTER (WHERE severity = 'low') as low_alerts,
          AVG(EXTRACT(EPOCH FROM (resolved_at - first_triggered))/3600) as avg_resolution_hours
        FROM risk_alerts a
        JOIN portfolios p ON a.portfolio_id = p.id
        WHERE p.user_id = $1 AND a.created_at >= $2
      `;
      
      const result = await this.db.query(query, [userId, startDate]);
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting alert statistics for user ${userId}:`, error);
      return {
        total_alerts: 0,
        active_alerts: 0,
        resolved_alerts: 0,
        critical_alerts: 0,
        high_alerts: 0,
        medium_alerts: 0,
        low_alerts: 0,
        avg_resolution_hours: 0
      };
    }
  }

  getDaysFromTimeframe(timeframe) {
    const timeframes = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    return timeframes[timeframe] || 30;
  }

  async close() {
    try {
      logger.info('Risk Alert Manager closed successfully');
    } catch (error) {
      logger.error('Error closing Risk Alert Manager:', error);
    }
  }
}

module.exports = RiskAlertManager;

