const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const templateService = require('./templateService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'user',
          pass: process.env.SMTP_PASS || 'password'
        }
      });
      
      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Error initializing email service:', error);
    }
  }

  async sendEmail(notification) {
    try {
      const { user_id, template, data, type } = notification;
      
      // Get user email
      const userEmail = await this.getUserEmail(user_id);
      if (!userEmail) {
        return {
          success: false,
          error: 'User email not found'
        };
      }
      
      // Get email template
      const emailTemplate = await templateService.getTemplate(template, 'email');
      if (!emailTemplate) {
        return {
          success: false,
          error: 'Email template not found'
        };
      }
      
      // Render email content
      const emailContent = await templateService.renderTemplate(emailTemplate, data);
      
      // Prepare email
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@brokerage.com',
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };
      
      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserEmail(userId) {
    try {
      const database = require('./database');
      const query = 'SELECT email FROM users WHERE id = $1';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].email;
    } catch (error) {
      logger.error('Error getting user email:', error);
      return null;
    }
  }

  async sendBulkEmail(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = await this.sendEmail(notification);
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
      logger.error('Error sending bulk email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTransactionalEmail(userId, template, data) {
    try {
      const notification = {
        user_id: userId,
        template: template,
        data: data,
        type: 'transactional'
      };
      
      return await this.sendEmail(notification);
    } catch (error) {
      logger.error('Error sending transactional email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMarketingEmail(userIds, template, data) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        template: template,
        data: data,
        type: 'marketing'
      }));
      
      return await this.sendBulkEmail(notifications);
    } catch (error) {
      logger.error('Error sending marketing email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateEmailAddress(email) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    } catch (error) {
      logger.error('Error validating email address:', error);
      return false;
    }
  }

  async getEmailDeliveryStatus(messageId) {
    try {
      // This would typically integrate with the email service provider's API
      // For now, we'll return a mock status
      return {
        success: true,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting email delivery status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();

