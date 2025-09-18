const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundNotificationService extends EventEmitter {
  constructor() {
    super();
    this.notifications = new Map();
    this.alerts = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundNotificationService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundNotificationService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundNotificationService closed');
    } catch (error) {
      logger.error('Error closing FundNotificationService:', error);
    }
  }

  async createAlert(userId, alertData) {
    try {
      const {
        fund_id,
        alert_type,
        condition_value,
        condition_operator = '>='
      } = alertData;

      const alertId = nanoid();
      const alert = {
        id: alertId,
        user_id: userId,
        fund_id,
        alert_type,
        condition_value,
        condition_operator,
        is_active: true,
        triggered_at: null,
        last_triggered_at: null,
        trigger_count: 0,
        created_at: new Date()
      };

      await pool.query(`
        INSERT INTO fund_alerts (
          id, user_id, fund_id, alert_type, condition_value,
          condition_operator, is_active, triggered_at, last_triggered_at,
          trigger_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        alert.id,
        alert.user_id,
        alert.fund_id,
        alert.alert_type,
        alert.condition_value,
        alert.condition_operator,
        alert.is_active,
        alert.triggered_at,
        alert.last_triggered_at,
        alert.trigger_count,
        alert.created_at
      ]);

      // Cache the alert
      this.alerts.set(alertId, alert);

      // Emit event
      this.emit('alertCreated', alert);

      logger.info(`Fund alert created: ${alertId}`);

      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async getAlerts(userId, options = {}) {
    try {
      const {
        fund_id = null,
        alert_type = null,
        is_active = null,
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `fund_alerts:${userId}:${fund_id || 'all'}:${alert_type || 'all'}:${is_active || 'all'}`;
      const cachedAlerts = await redisService.get(cacheKey);
      if (cachedAlerts) {
        return cachedAlerts;
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = ['fa.user_id = $1'];
      let queryParams = [userId];
      let paramCount = 1;

      if (fund_id) {
        paramCount++;
        whereConditions.push(`fa.fund_id = $${paramCount}`);
        queryParams.push(fund_id);
      }

      if (alert_type) {
        paramCount++;
        whereConditions.push(`fa.alert_type = $${paramCount}`);
        queryParams.push(alert_type);
      }

      if (is_active !== null) {
        paramCount++;
        whereConditions.push(`fa.is_active = $${paramCount}`);
        queryParams.push(is_active);
      }

      const query = `
        SELECT 
          fa.*,
          mf.symbol,
          mf.name as fund_name
        FROM fund_alerts fa
        JOIN mutual_funds mf ON fa.fund_id = mf.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY fa.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_alerts fa
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      const alerts = {
        alerts: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisService.set(cacheKey, alerts, 1800); // Cache for 30 minutes

      return alerts;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async updateAlert(alertId, userId, updateData) {
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(alertId);
      paramCount++;
      values.push(userId);

      const query = `
        UPDATE fund_alerts
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }

      const updatedAlert = result.rows[0];

      // Update cache
      this.alerts.set(alertId, updatedAlert);

      // Clear user alerts cache
      await this.clearUserAlertsCache(userId);

      // Emit event
      this.emit('alertUpdated', updatedAlert);

      logger.info(`Alert updated: ${alertId}`);

      return updatedAlert;
    } catch (error) {
      logger.error('Error updating alert:', error);
      throw error;
    }
  }

  async deleteAlert(alertId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM fund_alerts
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [alertId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }

      const deletedAlert = result.rows[0];

      // Remove from cache
      this.alerts.delete(alertId);

      // Clear user alerts cache
      await this.clearUserAlertsCache(userId);

      // Emit event
      this.emit('alertDeleted', deletedAlert);

      logger.info(`Alert deleted: ${alertId}`);

      return deletedAlert;
    } catch (error) {
      logger.error('Error deleting alert:', error);
      throw error;
    }
  }

  async processAlerts() {
    try {
      // Get all active alerts
      const result = await pool.query(`
        SELECT fa.*, mf.symbol, mf.name as fund_name
        FROM fund_alerts fa
        JOIN mutual_funds mf ON fa.fund_id = mf.id
        WHERE fa.is_active = true
        ORDER BY fa.created_at ASC
      `);

      let processedCount = 0;
      let triggeredCount = 0;

      for (const alert of result.rows) {
        try {
          const shouldTrigger = await this.checkAlertCondition(alert);
          
          if (shouldTrigger) {
            await this.triggerAlert(alert);
            triggeredCount++;
          }
          
          processedCount++;
        } catch (error) {
          logger.error(`Error processing alert ${alert.id}:`, error);
        }
      }

      logger.info(`Processed ${processedCount} alerts, triggered ${triggeredCount}`);

      return {
        processed: processedCount,
        triggered: triggeredCount
      };
    } catch (error) {
      logger.error('Error processing alerts:', error);
      throw error;
    }
  }

  async checkAlertCondition(alert) {
    try {
      // Get current fund performance data
      const performanceResult = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
        ORDER BY date DESC
        LIMIT 1
      `, [alert.fund_id]);

      if (performanceResult.rows.length === 0) {
        return false;
      }

      const performance = performanceResult.rows[0];
      let currentValue = 0;

      // Get current value based on alert type
      switch (alert.alert_type) {
        case 'price':
          currentValue = performance.nav;
          break;
        case 'performance':
          currentValue = performance.total_return_1y || 0;
          break;
        case 'news':
          // This would check for news events
          return false;
        case 'dividend':
          currentValue = performance.dividend_yield || 0;
          break;
        case 'expense_ratio':
          // Get expense ratio from fund data
          const fundResult = await pool.query(`
            SELECT expense_ratio FROM mutual_funds WHERE id = $1
          `, [alert.fund_id]);
          currentValue = fundResult.rows[0]?.expense_ratio || 0;
          break;
        default:
          return false;
      }

      // Check condition
      const conditionValue = parseFloat(alert.condition_value);
      const operator = alert.condition_operator;

      switch (operator) {
        case '>=':
          return currentValue >= conditionValue;
        case '<=':
          return currentValue <= conditionValue;
        case '>':
          return currentValue > conditionValue;
        case '<':
          return currentValue < conditionValue;
        case '=':
          return Math.abs(currentValue - conditionValue) < 0.01; // Allow small floating point differences
        case '!=':
          return Math.abs(currentValue - conditionValue) >= 0.01;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking alert condition:', error);
      return false;
    }
  }

  async triggerAlert(alert) {
    try {
      // Update alert with trigger information
      await pool.query(`
        UPDATE fund_alerts
        SET triggered_at = CURRENT_TIMESTAMP,
            last_triggered_at = CURRENT_TIMESTAMP,
            trigger_count = trigger_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [alert.id]);

      // Create notification
      const notification = await this.createNotification(alert.user_id, {
        fund_id: alert.fund_id,
        type: alert.alert_type,
        title: this.generateAlertTitle(alert),
        message: this.generateAlertMessage(alert),
        data: {
          alert_id: alert.id,
          condition_value: alert.condition_value,
          condition_operator: alert.condition_operator
        }
      });

      // Emit event
      this.emit('alertTriggered', { alert, notification });

      logger.info(`Alert triggered: ${alert.id}`);

      return notification;
    } catch (error) {
      logger.error('Error triggering alert:', error);
      throw error;
    }
  }

  async createNotification(userId, notificationData) {
    try {
      const {
        fund_id,
        type,
        title,
        message,
        data = {}
      } = notificationData;

      const notificationId = nanoid();
      const notification = {
        id: notificationId,
        user_id: userId,
        fund_id,
        type,
        title,
        message,
        data,
        is_read: false,
        sent_at: new Date()
      };

      await pool.query(`
        INSERT INTO fund_notifications (
          id, user_id, fund_id, type, title, message, data, is_read, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        notification.id,
        notification.user_id,
        notification.fund_id,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data),
        notification.is_read,
        notification.sent_at
      ]);

      // Cache the notification
      this.notifications.set(notificationId, notification);

      // Emit event
      this.emit('notificationCreated', notification);

      logger.info(`Notification created: ${notificationId}`);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async getNotifications(userId, options = {}) {
    try {
      const {
        fund_id = null,
        type = null,
        is_read = null,
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `fund_notifications:${userId}:${fund_id || 'all'}:${type || 'all'}:${is_read || 'all'}`;
      const cachedNotifications = await redisService.get(cacheKey);
      if (cachedNotifications) {
        return cachedNotifications;
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = ['fn.user_id = $1'];
      let queryParams = [userId];
      let paramCount = 1;

      if (fund_id) {
        paramCount++;
        whereConditions.push(`fn.fund_id = $${paramCount}`);
        queryParams.push(fund_id);
      }

      if (type) {
        paramCount++;
        whereConditions.push(`fn.type = $${paramCount}`);
        queryParams.push(type);
      }

      if (is_read !== null) {
        paramCount++;
        whereConditions.push(`fn.is_read = $${paramCount}`);
        queryParams.push(is_read);
      }

      const query = `
        SELECT 
          fn.*,
          mf.symbol,
          mf.name as fund_name
        FROM fund_notifications fn
        LEFT JOIN mutual_funds mf ON fn.fund_id = mf.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY fn.sent_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_notifications fn
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      const notifications = {
        notifications: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisService.set(cacheKey, notifications, 1800); // Cache for 30 minutes

      return notifications;
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE fund_notifications
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      const updatedNotification = result.rows[0];

      // Update cache
      this.notifications.set(notificationId, updatedNotification);

      // Clear user notifications cache
      await this.clearUserNotificationsCache(userId);

      // Emit event
      this.emit('notificationRead', updatedNotification);

      logger.info(`Notification marked as read: ${notificationId}`);

      return updatedNotification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const result = await pool.query(`
        UPDATE fund_notifications
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
        RETURNING *
      `, [userId]);

      // Clear user notifications cache
      await this.clearUserNotificationsCache(userId);

      // Emit event
      this.emit('allNotificationsRead', { userId, count: result.rows.length });

      logger.info(`Marked ${result.rows.length} notifications as read for user ${userId}`);

      return result.rows;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM fund_notifications
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      const deletedNotification = result.rows[0];

      // Remove from cache
      this.notifications.delete(notificationId);

      // Clear user notifications cache
      await this.clearUserNotificationsCache(userId);

      // Emit event
      this.emit('notificationDeleted', deletedNotification);

      logger.info(`Notification deleted: ${notificationId}`);

      return deletedNotification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getNotificationStats(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
          COUNT(CASE WHEN type = 'price' THEN 1 END) as price_notifications,
          COUNT(CASE WHEN type = 'performance' THEN 1 END) as performance_notifications,
          COUNT(CASE WHEN type = 'news' THEN 1 END) as news_notifications,
          COUNT(CASE WHEN type = 'dividend' THEN 1 END) as dividend_notifications,
          COUNT(CASE WHEN type = 'expense_ratio' THEN 1 END) as expense_ratio_notifications
        FROM fund_notifications
        WHERE user_id = $1
      `, [userId]);

      return result.rows[0] || {
        total_notifications: 0,
        unread_notifications: 0,
        price_notifications: 0,
        performance_notifications: 0,
        news_notifications: 0,
        dividend_notifications: 0,
        expense_ratio_notifications: 0
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return {
        total_notifications: 0,
        unread_notifications: 0,
        price_notifications: 0,
        performance_notifications: 0,
        news_notifications: 0,
        dividend_notifications: 0,
        expense_ratio_notifications: 0
      };
    }
  }

  generateAlertTitle(alert) {
    try {
      const fundName = alert.fund_name || alert.symbol;
      
      switch (alert.alert_type) {
        case 'price':
          return `Price Alert: ${fundName}`;
        case 'performance':
          return `Performance Alert: ${fundName}`;
        case 'news':
          return `News Alert: ${fundName}`;
        case 'dividend':
          return `Dividend Alert: ${fundName}`;
        case 'expense_ratio':
          return `Expense Ratio Alert: ${fundName}`;
        default:
          return `Fund Alert: ${fundName}`;
      }
    } catch (error) {
      logger.error('Error generating alert title:', error);
      return 'Fund Alert';
    }
  }

  generateAlertMessage(alert) {
    try {
      const fundName = alert.fund_name || alert.symbol;
      const operator = alert.condition_operator;
      const value = alert.condition_value;
      
      let operatorText = '';
      switch (operator) {
        case '>=':
          operatorText = 'reached or exceeded';
          break;
        case '<=':
          operatorText = 'fell to or below';
          break;
        case '>':
          operatorText = 'exceeded';
          break;
        case '<':
          operatorText = 'fell below';
          break;
        case '=':
          operatorText = 'reached';
          break;
        case '!=':
          operatorText = 'changed from';
          break;
        default:
          operatorText = 'reached';
      }

      switch (alert.alert_type) {
        case 'price':
          return `${fundName} price has ${operatorText} $${value}`;
        case 'performance':
          return `${fundName} performance has ${operatorText} ${value}%`;
        case 'news':
          return `News update available for ${fundName}`;
        case 'dividend':
          return `${fundName} dividend yield has ${operatorText} ${value}%`;
        case 'expense_ratio':
          return `${fundName} expense ratio has ${operatorText} ${value}%`;
        default:
          return `${fundName} has ${operatorText} ${value}`;
      }
    } catch (error) {
      logger.error('Error generating alert message:', error);
      return 'Fund alert triggered';
    }
  }

  async clearUserAlertsCache(userId) {
    try {
      const pattern = `fund_alerts:${userId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing user alerts cache:', error);
    }
  }

  async clearUserNotificationsCache(userId) {
    try {
      const pattern = `fund_notifications:${userId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing user notifications cache:', error);
    }
  }
}

module.exports = FundNotificationService;
