const logger = require('../utils/logger');
const admin = require('firebase-admin');
const templateService = require('./templateService');

class PushService {
  constructor() {
    this.initializeFirebase();
  }

  async initializeFirebase() {
    try {
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
            projectId: process.env.FIREBASE_PROJECT_ID
          });
          logger.info('Push service initialized with Firebase');
        } else {
          logger.warn('Firebase credentials not provided, push service will use mock mode');
        }
      }
    } catch (error) {
      logger.error('Error initializing push service:', error);
    }
  }

  async sendPush(notification) {
    try {
      const { user_id, template, data, type } = notification;
      
      // Get user FCM tokens
      const userTokens = await this.getUserFCMTokens(user_id);
      if (!userTokens || userTokens.length === 0) {
        return {
          success: false,
          error: 'User FCM tokens not found'
        };
      }
      
      // Get push template
      const pushTemplate = await templateService.getTemplate(template, 'push');
      if (!pushTemplate) {
        return {
          success: false,
          error: 'Push template not found'
        };
      }
      
      // Render push content
      const pushContent = await templateService.renderTemplate(pushTemplate, data);
      
      // Prepare push message
      const message = {
        notification: {
          title: pushContent.title,
          body: pushContent.body
        },
        data: pushContent.data || {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B6B'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };
      
      // Send push notification
      if (admin.apps.length > 0) {
        const result = await admin.messaging().sendToDevice(userTokens, message);
        
        logger.info(`Push notification sent successfully: ${result.successCount} successful, ${result.failureCount} failed`);
        
        return {
          success: result.successCount > 0,
          messageId: result.responses[0]?.messageId || `push_${Date.now()}`,
          successCount: result.successCount,
          failureCount: result.failureCount
        };
      } else {
        // Mock mode for development
        logger.info(`Mock push notification sent to ${userTokens.length} devices: ${pushContent.title}`);
        
        return {
          success: true,
          messageId: `mock_push_${Date.now()}`,
          successCount: userTokens.length,
          failureCount: 0
        };
      }
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserFCMTokens(userId) {
    try {
      const database = require('./database');
      const query = 'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      
      return result.rows.map(row => row.fcm_token);
    } catch (error) {
      logger.error('Error getting user FCM tokens:', error);
      return [];
    }
  }

  async sendBulkPush(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = await this.sendPush(notification);
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
      logger.error('Error sending bulk push:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTransactionalPush(userId, template, data) {
    try {
      const notification = {
        user_id: userId,
        template: template,
        data: data,
        type: 'transactional'
      };
      
      return await this.sendPush(notification);
    } catch (error) {
      logger.error('Error sending transactional push:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMarketingPush(userIds, template, data) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        template: template,
        data: data,
        type: 'marketing'
      }));
      
      return await this.sendBulkPush(notifications);
    } catch (error) {
      logger.error('Error sending marketing push:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async registerFCMToken(userId, token) {
    try {
      const database = require('./database');
      const query = `
        INSERT INTO user_fcm_tokens (user_id, fcm_token, is_active, created_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (user_id, fcm_token) DO UPDATE SET
          is_active = true,
          updated_at = NOW()
      `;
      
      await database.query(query, [userId, token]);
      
      return {
        success: true,
        message: 'FCM token registered successfully'
      };
    } catch (error) {
      logger.error('Error registering FCM token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async unregisterFCMToken(userId, token) {
    try {
      const database = require('./database');
      const query = 'UPDATE user_fcm_tokens SET is_active = false WHERE user_id = $1 AND fcm_token = $2';
      
      await database.query(query, [userId, token]);
      
      return {
        success: true,
        message: 'FCM token unregistered successfully'
      };
    } catch (error) {
      logger.error('Error unregistering FCM token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPushDeliveryStatus(messageId) {
    try {
      // Firebase doesn't provide delivery status for individual messages
      // This would typically be handled by the client app
      return {
        success: true,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting push delivery status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PushService();

