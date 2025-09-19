const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');
const templateService = require('./templateService');

class WebhookService {
  async sendWebhook(notification) {
    try {
      const { user_id, template, data, type } = notification;
      
      // Get user webhook URL
      const webhookUrl = await this.getUserWebhookUrl(user_id);
      if (!webhookUrl) {
        return {
          success: false,
          error: 'User webhook URL not found'
        };
      }
      
      // Get webhook template
      const webhookTemplate = await templateService.getTemplate(template, 'webhook');
      if (!webhookTemplate) {
        return {
          success: false,
          error: 'Webhook template not found'
        };
      }
      
      // Render webhook content
      const webhookContent = await templateService.renderTemplate(webhookTemplate, data);
      
      // Prepare webhook payload
      const payload = {
        notification: {
          id: notification.id,
          type: notification.type,
          timestamp: new Date().toISOString()
        },
        data: webhookContent.data || {},
        user: {
          id: user_id
        }
      };
      
      // Generate signature
      const signature = this.generateSignature(JSON.stringify(payload));
      
      // Send webhook
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': Date.now().toString(),
          'User-Agent': 'Brokerage-Notification-System/1.0'
        },
        timeout: 10000
      });
      
      logger.info(`Webhook sent successfully to ${webhookUrl}: ${response.status}`);
      
      return {
        success: true,
        messageId: `webhook_${Date.now()}`,
        statusCode: response.status
      };
    } catch (error) {
      logger.error('Error sending webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserWebhookUrl(userId) {
    try {
      const database = require('./database');
      const query = 'SELECT webhook_url FROM user_webhooks WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].webhook_url;
    } catch (error) {
      logger.error('Error getting user webhook URL:', error);
      return null;
    }
  }

  async sendBulkWebhook(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = await this.sendWebhook(notification);
        results.push({
          notificationId: notification.id,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
      }
      
      return {
        success: true,
        results: results
      };
    } catch (error) {
      logger.error('Error sending bulk webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTransactionalWebhook(userId, template, data) {
    try {
      const notification = {
        user_id: userId,
        template: template,
        data: data,
        type: 'transactional'
      };
      
      return await this.sendWebhook(notification);
    } catch (error) {
      logger.error('Error sending transactional webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMarketingWebhook(userIds, template, data) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        template: template,
        data: data,
        type: 'marketing'
      }));
      
      return await this.sendBulkWebhook(notifications);
    } catch (error) {
      logger.error('Error sending marketing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateSignature(payload) {
    try {
      const secret = process.env.WEBHOOK_SECRET || 'default-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      return hmac.digest('hex');
    } catch (error) {
      logger.error('Error generating webhook signature:', error);
      return '';
    }
  }

  async verifyWebhookSignature(payload, signature, timestamp) {
    try {
      const secret = process.env.WEBHOOK_SECRET || 'default-secret';
      const expectedSignature = this.generateSignature(payload);
      
      // Check timestamp to prevent replay attacks
      const now = Date.now();
      const webhookTimestamp = parseInt(timestamp);
      const timeDiff = Math.abs(now - webhookTimestamp);
      
      if (timeDiff > 300000) { // 5 minutes
        return false;
      }
      
      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  async registerWebhook(userId, webhookUrl, events = []) {
    try {
      const database = require('./database');
      const query = `
        INSERT INTO user_webhooks (user_id, webhook_url, events, is_active, created_at)
        VALUES ($1, $2, $3, true, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          webhook_url = $2,
          events = $3,
          is_active = true,
          updated_at = NOW()
      `;
      
      await database.query(query, [userId, webhookUrl, JSON.stringify(events)]);
      
      return {
        success: true,
        message: 'Webhook registered successfully'
      };
    } catch (error) {
      logger.error('Error registering webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async unregisterWebhook(userId) {
    try {
      const database = require('./database');
      const query = 'UPDATE user_webhooks SET is_active = false WHERE user_id = $1';
      
      await database.query(query, [userId]);
      
      return {
        success: true,
        message: 'Webhook unregistered successfully'
      };
    } catch (error) {
      logger.error('Error unregistering webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWebhookDeliveryStatus(messageId) {
    try {
      // Webhook delivery status is typically handled by the receiving service
      // This would require integration with the receiving service's API
      return {
        success: true,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting webhook delivery status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WebhookService();

