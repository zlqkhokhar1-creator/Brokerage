const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const WebSocket = require('ws');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.websocketClients = new Map();
    this.notificationQueue = [];
    this.notificationTypes = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load notification types
      await this.loadNotificationTypes();
      
      // Start notification queue processor
      this.startNotificationQueueProcessor();
      
      this._initialized = true;
      logger.info('NotificationService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('NotificationService closed');
    } catch (error) {
      logger.error('Error closing NotificationService:', error);
    }
  }

  async loadNotificationTypes() {
    try {
      this.notificationTypes = new Map([
        ['report_ready', {
          name: 'Report Ready',
          description: 'Sent when a report is successfully generated',
          channels: ['email', 'push', 'in_app'],
          priority: 'medium',
          template: 'report_ready'
        }],
        ['report_scheduled', {
          name: 'Report Scheduled',
          description: 'Sent when a report is scheduled for generation',
          channels: ['email', 'in_app'],
          priority: 'low',
          template: 'report_scheduled'
        }],
        ['report_failed', {
          name: 'Report Failed',
          description: 'Sent when report generation fails',
          channels: ['email', 'push', 'in_app'],
          priority: 'high',
          template: 'report_failed'
        }],
        ['dashboard_shared', {
          name: 'Dashboard Shared',
          description: 'Sent when a dashboard is shared with a user',
          channels: ['email', 'in_app'],
          priority: 'medium',
          template: 'dashboard_shared'
        }],
        ['export_ready', {
          name: 'Export Ready',
          description: 'Sent when a data export is ready for download',
          channels: ['email', 'push', 'in_app'],
          priority: 'medium',
          template: 'export_ready'
        }],
        ['system_maintenance', {
          name: 'System Maintenance',
          description: 'Sent for system maintenance notifications',
          channels: ['email', 'push', 'in_app'],
          priority: 'high',
          template: 'system_maintenance'
        }],
        ['security_alert', {
          name: 'Security Alert',
          description: 'Sent for security-related notifications',
          channels: ['email', 'push', 'in_app', 'sms'],
          priority: 'critical',
          template: 'security_alert'
        }],
        ['feature_update', {
          name: 'Feature Update',
          description: 'Sent for feature updates and announcements',
          channels: ['email', 'in_app'],
          priority: 'low',
          template: 'feature_update'
        }]
      ]);
      
      logger.info('Notification types loaded successfully');
    } catch (error) {
      logger.error('Error loading notification types:', error);
      throw error;
    }
  }

  startNotificationQueueProcessor() {
    setInterval(async () => {
      if (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        try {
          await this.processNotification(notification);
        } catch (error) {
          logger.error('Error processing notification from queue:', error);
          // Re-queue notification for retry
          this.notificationQueue.push(notification);
        }
      }
    }, 1000); // Process every second
  }

  async processNotification(notification) {
    try {
      const notificationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Processing notification: ${notification.type}`, {
        notificationId,
        type: notification.type,
        userId: notification.userId
      });

      // Get notification type configuration
      const notificationType = this.notificationTypes.get(notification.type);
      if (!notificationType) {
        throw new Error(`Unknown notification type: ${notification.type}`);
      }

      // Process each channel
      const results = [];
      for (const channel of notificationType.channels) {
        try {
          const result = await this.sendNotification(notification, channel);
          results.push({ channel, result, success: true });
        } catch (error) {
          logger.error(`Error sending notification via ${channel}:`, error);
          results.push({ channel, error: error.message, success: false });
        }
      }
      
      // Store notification record
      await this.storeNotificationRecord({
        id: notificationId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        channels: notificationType.channels,
        results: results,
        status: results.some(r => r.success) ? 'sent' : 'failed',
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      });
      
      this.emit('notificationProcessed', { notificationId, results });
      
      logger.info(`Notification processed: ${notificationId}`, {
        notificationId,
        processingTime: Date.now() - startTime
      });
      
      return { notificationId, results };
    } catch (error) {
      logger.error('Error processing notification:', error);
      throw error;
    }
  }

  async sendNotification(notification, channel) {
    try {
      switch (channel) {
        case 'email':
          return await this.sendEmailNotification(notification);
        case 'push':
          return await this.sendPushNotification(notification);
        case 'in_app':
          return await this.sendInAppNotification(notification);
        case 'sms':
          return await this.sendSMSNotification(notification);
        default:
          throw new Error(`Unsupported notification channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Error sending ${channel} notification:`, error);
      throw error;
    }
  }

  async sendEmailNotification(notification) {
    try {
      // This would integrate with the EmailService
      // For now, we'll just log the notification
      logger.info('Email notification sent', {
        to: notification.userId,
        subject: notification.title,
        template: notification.type
      });
      
      return { channel: 'email', status: 'sent' };
    } catch (error) {
      logger.error('Error sending email notification:', error);
      throw error;
    }
  }

  async sendPushNotification(notification) {
    try {
      // This would integrate with a push notification service like FCM
      // For now, we'll just log the notification
      logger.info('Push notification sent', {
        to: notification.userId,
        title: notification.title,
        body: notification.message
      });
      
      return { channel: 'push', status: 'sent' };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendInAppNotification(notification) {
    try {
      // Send via WebSocket to connected clients
      const client = this.websocketClients.get(notification.userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: {
            id: nanoid(),
            title: notification.title,
            message: notification.message,
            type: notification.type,
            data: notification.data,
            timestamp: new Date().toISOString()
          }
        }));
        
        return { channel: 'in_app', status: 'sent' };
      } else {
        // Store for later delivery
        await this.storePendingNotification(notification);
        return { channel: 'in_app', status: 'pending' };
      }
    } catch (error) {
      logger.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  async sendSMSNotification(notification) {
    try {
      // This would integrate with an SMS service like Twilio
      // For now, we'll just log the notification
      logger.info('SMS notification sent', {
        to: notification.userId,
        message: notification.message
      });
      
      return { channel: 'sms', status: 'sent' };
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  async queueNotification(notification) {
    try {
      this.notificationQueue.push(notification);
      logger.info(`Notification queued: ${notification.type}`, {
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      logger.error('Error queuing notification:', error);
      throw error;
    }
  }

  async sendReportReadyNotification(userId, reportData) {
    try {
      const notification = {
        userId,
        type: 'report_ready',
        title: 'Report Ready',
        message: `Your ${reportData.reportType} report is ready for download`,
        data: {
          reportId: reportData.reportId,
          reportName: reportData.reportName,
          reportType: reportData.reportType,
          downloadUrl: reportData.downloadUrl
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending report ready notification:', error);
      throw error;
    }
  }

  async sendReportScheduledNotification(userId, scheduleData) {
    try {
      const notification = {
        userId,
        type: 'report_scheduled',
        title: 'Report Scheduled',
        message: `Your ${scheduleData.reportType} report has been scheduled`,
        data: {
          reportId: scheduleData.reportId,
          reportName: scheduleData.reportName,
          reportType: scheduleData.reportType,
          schedule: scheduleData.schedule,
          nextRun: scheduleData.nextRun
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending report scheduled notification:', error);
      throw error;
    }
  }

  async sendReportFailedNotification(userId, errorData) {
    try {
      const notification = {
        userId,
        type: 'report_failed',
        title: 'Report Generation Failed',
        message: `Failed to generate ${errorData.reportType} report: ${errorData.errorMessage}`,
        data: {
          reportId: errorData.reportId,
          reportName: errorData.reportName,
          reportType: errorData.reportType,
          errorMessage: errorData.errorMessage,
          errorCode: errorData.errorCode
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending report failed notification:', error);
      throw error;
    }
  }

  async sendDashboardSharedNotification(userId, dashboardData) {
    try {
      const notification = {
        userId,
        type: 'dashboard_shared',
        title: 'Dashboard Shared',
        message: `${dashboardData.sharedBy} shared a dashboard with you`,
        data: {
          dashboardId: dashboardData.dashboardId,
          dashboardName: dashboardData.dashboardName,
          sharedBy: dashboardData.sharedBy,
          accessLevel: dashboardData.accessLevel,
          dashboardUrl: dashboardData.dashboardUrl
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending dashboard shared notification:', error);
      throw error;
    }
  }

  async sendExportReadyNotification(userId, exportData) {
    try {
      const notification = {
        userId,
        type: 'export_ready',
        title: 'Export Ready',
        message: `Your data export is ready for download`,
        data: {
          exportId: exportData.exportId,
          exportName: exportData.exportName,
          format: exportData.format,
          fileSize: exportData.fileSize,
          downloadUrl: exportData.downloadUrl
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending export ready notification:', error);
      throw error;
    }
  }

  async sendSystemMaintenanceNotification(userId, maintenanceData) {
    try {
      const notification = {
        userId,
        type: 'system_maintenance',
        title: 'System Maintenance',
        message: maintenanceData.message,
        data: {
          startTime: maintenanceData.startTime,
          endTime: maintenanceData.endTime,
          affectedServices: maintenanceData.affectedServices,
          maintenanceUrl: maintenanceData.maintenanceUrl
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending system maintenance notification:', error);
      throw error;
    }
  }

  async sendSecurityAlertNotification(userId, securityData) {
    try {
      const notification = {
        userId,
        type: 'security_alert',
        title: 'Security Alert',
        message: securityData.message,
        data: {
          alertType: securityData.alertType,
          severity: securityData.severity,
          timestamp: securityData.timestamp,
          actionRequired: securityData.actionRequired,
          securityUrl: securityData.securityUrl
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending security alert notification:', error);
      throw error;
    }
  }

  async sendFeatureUpdateNotification(userId, featureData) {
    try {
      const notification = {
        userId,
        type: 'feature_update',
        title: 'Feature Update',
        message: featureData.message,
        data: {
          featureName: featureData.featureName,
          featureDescription: featureData.featureDescription,
          featureUrl: featureData.featureUrl,
          releaseNotes: featureData.releaseNotes
        }
      };
      
      await this.queueNotification(notification);
    } catch (error) {
      logger.error('Error sending feature update notification:', error);
      throw error;
    }
  }

  async addWebSocketClient(userId, ws) {
    try {
      this.websocketClients.set(userId, ws);
      
      // Send pending notifications
      await this.sendPendingNotifications(userId);
      
      logger.info(`WebSocket client added: ${userId}`);
    } catch (error) {
      logger.error('Error adding WebSocket client:', error);
      throw error;
    }
  }

  async removeWebSocketClient(userId) {
    try {
      this.websocketClients.delete(userId);
      logger.info(`WebSocket client removed: ${userId}`);
    } catch (error) {
      logger.error('Error removing WebSocket client:', error);
      throw error;
    }
  }

  async sendPendingNotifications(userId) {
    try {
      const query = `
        SELECT * FROM pending_notifications 
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
      `;
      
      const result = await pool.query(query, [userId]);
      
      for (const notification of result.rows) {
        try {
          await this.sendInAppNotification({
            userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data
          });
          
          // Remove from pending
          await this.removePendingNotification(notification.id);
        } catch (error) {
          logger.error('Error sending pending notification:', error);
        }
      }
    } catch (error) {
      logger.error('Error sending pending notifications:', error);
      throw error;
    }
  }

  async storePendingNotification(notification) {
    try {
      const query = `
        INSERT INTO pending_notifications (
          user_id, type, title, message, data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(query, [
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data),
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing pending notification:', error);
      throw error;
    }
  }

  async removePendingNotification(notificationId) {
    try {
      const query = 'DELETE FROM pending_notifications WHERE id = $1';
      await pool.query(query, [notificationId]);
    } catch (error) {
      logger.error('Error removing pending notification:', error);
      throw error;
    }
  }

  async storeNotificationRecord(notificationRecord) {
    try {
      const query = `
        INSERT INTO notification_records (
          id, user_id, type, title, message, data, channels, results, 
          status, created_at, processing_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(query, [
        notificationRecord.id,
        notificationRecord.userId,
        notificationRecord.type,
        notificationRecord.title,
        notificationRecord.message,
        JSON.stringify(notificationRecord.data),
        JSON.stringify(notificationRecord.channels),
        JSON.stringify(notificationRecord.results),
        notificationRecord.status,
        notificationRecord.createdAt,
        notificationRecord.processingTime
      ]);
      
      logger.info(`Notification record stored: ${notificationRecord.id}`);
    } catch (error) {
      logger.error('Error storing notification record:', error);
      throw error;
    }
  }

  async getNotificationTypes() {
    try {
      return Array.from(this.notificationTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting notification types:', error);
      throw error;
    }
  }

  async getNotificationStats() {
    try {
      const query = `
        SELECT 
          type,
          status,
          COUNT(*) as count,
          AVG(processing_time) as avg_processing_time
        FROM notification_records 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY type, status
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
