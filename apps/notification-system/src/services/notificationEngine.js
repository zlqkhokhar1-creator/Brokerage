const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const emailService = require('./emailService');
const smsService = require('./smsService');
const pushService = require('./pushService');
const webhookService = require('./webhookService');
const templateService = require('./templateService');
const routingEngine = require('./routingEngine');

class NotificationEngine {
  async sendNotification(req, res) {
    try {
      const { userId, type, channel, template, data, priority, scheduledAt } = req.body;
      
      // Create notification record
      const notification = await this.createNotification({
        userId,
        type,
        channel,
        template,
        data,
        priority: priority || 'medium',
        scheduledAt
      });
      
      // Route notification
      const routingResult = await routingEngine.routeNotification(notification);
      
      if (!routingResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Notification routing failed',
          details: routingResult.error
        });
      }
      
      // Send notification
      const sendResult = await this.sendNotificationToChannel(notification, routingResult.channel);
      
      if (sendResult.success) {
        // Update notification status
        await this.updateNotificationStatus(notification.id, 'sent', sendResult.messageId);
        
        res.json({
          success: true,
          data: {
            notificationId: notification.id,
            status: 'sent',
            channel: routingResult.channel,
            messageId: sendResult.messageId
          }
        });
      } else {
        // Update notification status
        await this.updateNotificationStatus(notification.id, 'failed', null, sendResult.error);
        
        res.status(500).json({
          success: false,
          error: 'Notification sending failed',
          details: sendResult.error
        });
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
      res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
  }

  async getNotifications(req, res) {
    try {
      const { userId, type, status, channel, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];
      
      if (userId) {
        query += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
      }
      
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
      }
      
      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
      
      if (channel) {
        query += ' AND channel = $' + (params.length + 1);
        params.push(channel);
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
      logger.error('Error getting notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to get notifications' });
    }
  }

  async getNotification(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'SELECT * FROM notifications WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting notification:', error);
      res.status(500).json({ success: false, error: 'Failed to get notification' });
    }
  }

  async updateNotificationStatus(notificationId, status, messageId = null, error = null) {
    try {
      const query = `
        UPDATE notifications 
        SET status = $1, message_id = $2, error_message = $3, updated_at = NOW()
        WHERE id = $4
      `;
      
      await database.query(query, [status, messageId, error, notificationId]);
    } catch (error) {
      logger.error('Error updating notification status:', error);
    }
  }

  async createNotification(notificationData) {
    try {
      const query = `
        INSERT INTO notifications 
        (user_id, type, channel, template, data, priority, scheduled_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *
      `;
      
      const result = await database.query(query, [
        notificationData.userId,
        notificationData.type,
        notificationData.channel,
        notificationData.template,
        JSON.stringify(notificationData.data),
        notificationData.priority,
        notificationData.scheduledAt || new Date()
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendNotificationToChannel(notification, channel) {
    try {
      switch (channel) {
        case 'email':
          return await emailService.sendEmail(notification);
        case 'sms':
          return await smsService.sendSMS(notification);
        case 'push':
          return await pushService.sendPush(notification);
        case 'webhook':
          return await webhookService.sendWebhook(notification);
        default:
          return {
            success: false,
            error: 'Unsupported notification channel'
          };
      }
    } catch (error) {
      logger.error('Error sending notification to channel:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processScheduledNotifications() {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE status = 'pending' 
        AND scheduled_at <= NOW()
        ORDER BY priority DESC, created_at ASC
        LIMIT 100
      `;
      
      const result = await database.query(query);
      
      for (const notification of result.rows) {
        try {
          // Route notification
          const routingResult = await routingEngine.routeNotification(notification);
          
          if (routingResult.success) {
            // Send notification
            const sendResult = await this.sendNotificationToChannel(notification, routingResult.channel);
            
            if (sendResult.success) {
              await this.updateNotificationStatus(notification.id, 'sent', sendResult.messageId);
            } else {
              await this.updateNotificationStatus(notification.id, 'failed', null, sendResult.error);
            }
          } else {
            await this.updateNotificationStatus(notification.id, 'failed', null, routingResult.error);
          }
        } catch (error) {
          logger.error(`Error processing notification ${notification.id}:`, error);
          await this.updateNotificationStatus(notification.id, 'failed', null, error.message);
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
    }
  }

  async getNotificationStats(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          channel,
          status,
          COUNT(*) as count
        FROM notifications 
        WHERE 1=1
      `;
      const params = [];
      
      if (userId) {
        query += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
      }
      
      if (startDate) {
        query += ' AND created_at >= $' + (params.length + 1);
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND created_at <= $' + (params.length + 1);
        params.push(endDate);
      }
      
      query += ' GROUP BY channel, status ORDER BY channel, status';
      
      const result = await database.query(query, params);
      
      // Format stats
      const stats = {};
      for (const row of result.rows) {
        if (!stats[row.channel]) {
          stats[row.channel] = {};
        }
        stats[row.channel][row.status] = parseInt(row.count);
      }
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get notification stats' });
    }
  }

  async retryFailedNotifications(req, res) {
    try {
      const { notificationId } = req.params;
      
      const query = 'SELECT * FROM notifications WHERE id = $1 AND status = $2';
      const result = await database.query(query, [notificationId, 'failed']);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Failed notification not found' });
      }
      
      const notification = result.rows[0];
      
      // Route notification
      const routingResult = await routingEngine.routeNotification(notification);
      
      if (!routingResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Notification routing failed',
          details: routingResult.error
        });
      }
      
      // Send notification
      const sendResult = await this.sendNotificationToChannel(notification, routingResult.channel);
      
      if (sendResult.success) {
        await this.updateNotificationStatus(notification.id, 'sent', sendResult.messageId);
        
        res.json({
          success: true,
          data: {
            notificationId: notification.id,
            status: 'sent',
            channel: routingResult.channel,
            messageId: sendResult.messageId
          }
        });
      } else {
        await this.updateNotificationStatus(notification.id, 'failed', null, sendResult.error);
        
        res.status(500).json({
          success: false,
          error: 'Notification retry failed',
          details: sendResult.error
        });
      }
    } catch (error) {
      logger.error('Error retrying notification:', error);
      res.status(500).json({ success: false, error: 'Failed to retry notification' });
    }
  }
}

module.exports = new NotificationEngine();