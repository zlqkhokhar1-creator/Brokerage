const logger = require('../utils/logger');
const twilio = require('twilio');
const templateService = require('./templateService');

class SMSService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        this.client = twilio(accountSid, authToken);
        logger.info('SMS service initialized with Twilio');
      } else {
        logger.warn('Twilio credentials not provided, SMS service will use mock mode');
      }
    } catch (error) {
      logger.error('Error initializing SMS service:', error);
    }
  }

  async sendSMS(notification) {
    try {
      const { user_id, template, data, type } = notification;
      
      // Get user phone number
      const userPhone = await this.getUserPhone(user_id);
      if (!userPhone) {
        return {
          success: false,
          error: 'User phone number not found'
        };
      }
      
      // Get SMS template
      const smsTemplate = await templateService.getTemplate(template, 'sms');
      if (!smsTemplate) {
        return {
          success: false,
          error: 'SMS template not found'
        };
      }
      
      // Render SMS content
      const smsContent = await templateService.renderTemplate(smsTemplate, data);
      
      // Send SMS
      if (this.client) {
        const result = await this.client.messages.create({
          body: smsContent.text,
          from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
          to: userPhone
        });
        
        logger.info(`SMS sent successfully: ${result.sid}`);
        
        return {
          success: true,
          messageId: result.sid
        };
      } else {
        // Mock mode for development
        logger.info(`Mock SMS sent to ${userPhone}: ${smsContent.text}`);
        
        return {
          success: true,
          messageId: `mock_${Date.now()}`
        };
      }
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserPhone(userId) {
    try {
      const database = require('./database');
      const query = 'SELECT phone FROM users WHERE id = $1';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].phone;
    } catch (error) {
      logger.error('Error getting user phone:', error);
      return null;
    }
  }

  async sendBulkSMS(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = await this.sendSMS(notification);
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
      logger.error('Error sending bulk SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTransactionalSMS(userId, template, data) {
    try {
      const notification = {
        user_id: userId,
        template: template,
        data: data,
        type: 'transactional'
      };
      
      return await this.sendSMS(notification);
    } catch (error) {
      logger.error('Error sending transactional SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMarketingSMS(userIds, template, data) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        template: template,
        data: data,
        type: 'marketing'
      }));
      
      return await this.sendBulkSMS(notifications);
    } catch (error) {
      logger.error('Error sending marketing SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validatePhoneNumber(phone) {
    try {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(phone);
    } catch (error) {
      logger.error('Error validating phone number:', error);
      return false;
    }
  }

  async getSMSDeliveryStatus(messageId) {
    try {
      if (this.client) {
        const message = await this.client.messages(messageId).fetch();
        
        return {
          success: true,
          status: message.status,
          deliveredAt: message.dateSent
        };
      } else {
        // Mock status for development
        return {
          success: true,
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Error getting SMS delivery status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SMSService();

