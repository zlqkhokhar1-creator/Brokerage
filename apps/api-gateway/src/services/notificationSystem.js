/**
 * Advanced Notification & Alert System
 * Real-time, intelligent notifications with multi-channel delivery
 */

const EventEmitter = require('events');
const { logger, logBusinessEvent } = require('../utils/logger');
const { cacheService } = require('../config/redis');
const { ValidationError, ExternalApiError } = require('../utils/errorHandler');

class NotificationSystem extends EventEmitter {
  constructor() {
    super();
    
    // Notification channels
    this.channels = {
      push: { enabled: true, provider: 'firebase' },
      email: { enabled: true, provider: 'sendgrid' },
      sms: { enabled: true, provider: 'twilio' },
      webhook: { enabled: true },
      inApp: { enabled: true }
    };
    
    // Alert types and priorities
    this.alertTypes = {
      // Trading alerts
      PRICE_ALERT: { priority: 'medium', channels: ['push', 'inApp'] },
      ORDER_FILLED: { priority: 'high', channels: ['push', 'email', 'inApp'] },
      ORDER_REJECTED: { priority: 'high', channels: ['push', 'inApp'] },
      STOP_LOSS_TRIGGERED: { priority: 'critical', channels: ['push', 'sms', 'email', 'inApp'] },
      
      // Account alerts
      MARGIN_CALL: { priority: 'critical', channels: ['push', 'sms', 'email', 'inApp'] },
      LOW_BALANCE: { priority: 'medium', channels: ['push', 'inApp'] },
      DEPOSIT_CONFIRMED: { priority: 'medium', channels: ['push', 'email', 'inApp'] },
      WITHDRAWAL_PROCESSED: { priority: 'medium', channels: ['push', 'email', 'inApp'] },
      
      // Security alerts
      LOGIN_DETECTED: { priority: 'medium', channels: ['push', 'email'] },
      SUSPICIOUS_ACTIVITY: { priority: 'critical', channels: ['push', 'sms', 'email', 'inApp'] },
      PASSWORD_CHANGED: { priority: 'high', channels: ['push', 'email', 'inApp'] },
      DEVICE_REGISTERED: { priority: 'medium', channels: ['push', 'email'] },
      
      // Market alerts
      MARKET_VOLATILITY: { priority: 'medium', channels: ['push', 'inApp'] },
      EARNINGS_REMINDER: { priority: 'low', channels: ['push', 'inApp'] },
      NEWS_ALERT: { priority: 'low', channels: ['push', 'inApp'] },
      ECONOMIC_EVENT: { priority: 'medium', channels: ['push', 'inApp'] },
      
      // Compliance alerts
      KYC_REQUIRED: { priority: 'high', channels: ['push', 'email', 'inApp'] },
      DOCUMENT_EXPIRING: { priority: 'medium', channels: ['push', 'email', 'inApp'] },
      COMPLIANCE_VIOLATION: { priority: 'critical', channels: ['push', 'sms', 'email', 'inApp'] },
      
      // Risk alerts
      POSITION_LIMIT_EXCEEDED: { priority: 'high', channels: ['push', 'sms', 'inApp'] },
      CONCENTRATION_RISK: { priority: 'medium', channels: ['push', 'inApp'] },
      VOLATILITY_WARNING: { priority: 'medium', channels: ['push', 'inApp'] },
      
      // System alerts
      MAINTENANCE_SCHEDULED: { priority: 'low', channels: ['push', 'email', 'inApp'] },
      SERVICE_DISRUPTION: { priority: 'high', channels: ['push', 'sms', 'email', 'inApp'] },
      SYSTEM_RESTORED: { priority: 'medium', channels: ['push', 'inApp'] }
    };
    
    // User preferences storage
    this.userPreferences = new Map(); // userId -> preferences
    this.activeAlerts = new Map(); // alertId -> alert data
    this.alertHistory = new Map(); // userId -> alert history
    
    // Delivery tracking
    this.deliveryTracking = new Map(); // notificationId -> delivery status
    this.failedDeliveries = [];
    
    // Smart notification features
    this.quietHours = new Map(); // userId -> quiet hours config
    this.frequencyLimits = new Map(); // userId -> frequency limits
    this.intelligentGrouping = true;
    
    this.initializeNotificationSystem();
  }

  // Initialize notification system
  async initializeNotificationSystem() {
    logger.info('Initializing advanced notification system...');
    
    // Load user preferences
    await this.loadUserPreferences();
    
    // Initialize notification channels
    await this.initializeChannels();
    
    // Start background notification processing
    this.startNotificationProcessor();
    
    logger.info('Notification system initialized successfully');
  }

  // Load user preferences
  async loadUserPreferences() {
    try {
      logger.info('Loading user notification preferences...');
      // Simulate loading user preferences
      await new Promise(resolve => setTimeout(resolve, 50));
      logger.info('User preferences loaded successfully');
    } catch (error) {
      logger.error('Failed to load user preferences:', error);
      throw error;
    }
  }

  // Initialize notification channels
  async initializeChannels() {
    try {
      logger.info('Initializing notification channels...');
      // Simulate channel initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      logger.info('Notification channels initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize channels:', error);
      throw error;
    }
  }

  // Start notification processor
  startNotificationProcessor() {
    logger.info('Starting notification processor...');
    // Simulate starting notification processing
    logger.info('Notification processor started successfully');
  }

  // Send notification
  async sendNotification(userId, alertType, data, options = {}) {
    try {
      const notificationId = this.generateNotificationId();
      const timestamp = Date.now();
      
      // Get alert configuration
      const alertConfig = this.alertTypes[alertType];
      if (!alertConfig) {
        throw new ValidationError(`Unknown alert type: ${alertType}`);
      }
      
      // Get user preferences
      const userPrefs = await this.getUserPreferences(userId);
      
      // Check if user has disabled this alert type
      if (!userPrefs.enabledAlerts.includes(alertType)) {
        logger.info('Alert disabled by user preferences', { userId, alertType });
        return { notificationId, status: 'disabled_by_user' };
      }
      
      // Check quiet hours
      if (await this.isQuietHours(userId, alertConfig.priority)) {
        logger.info('Notification suppressed due to quiet hours', { userId, alertType });
        return { notificationId, status: 'quiet_hours' };
      }
      
      // Check frequency limits
      if (await this.exceedsFrequencyLimit(userId, alertType)) {
        logger.info('Notification suppressed due to frequency limit', { userId, alertType });
        return { notificationId, status: 'frequency_limited' };
      }
      
      const notification = {
        notificationId,
        userId,
        alertType,
        priority: alertConfig.priority,
        data,
        timestamp,
        channels: this.determineChannels(alertConfig, userPrefs, options),
        deliveryStatus: {},
        attempts: 0,
        maxAttempts: options.maxAttempts || 3
      };
      
      // Personalize notification content
      const personalizedContent = await this.personalizeContent(notification);
      notification.content = personalizedContent;
      
      // Store notification
      this.activeAlerts.set(notificationId, notification);
      
      // Deliver via selected channels
      const deliveryResults = await this.deliverNotification(notification);
      
      // Track delivery
      await this.trackDelivery(notificationId, deliveryResults);
      
      // Log notification event
      logBusinessEvent('NOTIFICATION_SENT', {
        userId,
        alertType,
        priority: alertConfig.priority,
        channels: notification.channels,
        deliveryResults
      });
      
      return {
        notificationId,
        status: 'sent',
        deliveryResults
      };
      
    } catch (error) {
      logger.error('Failed to send notification', { userId, alertType, error: error.message });
      throw error;
    }
  }

  // Send bulk notifications
  async sendBulkNotification(userIds, alertType, data, options = {}) {
    try {
      const batchId = this.generateBatchId();
      const results = [];
      
      // Process in batches to avoid overwhelming the system
      const batchSize = options.batchSize || 100;
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(userId =>
          this.sendNotification(userId, alertType, data, { ...options, batchId })
            .catch(error => ({ userId, error: error.message }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < userIds.length) {
          await this.sleep(100);
        }
      }
      
      logBusinessEvent('BULK_NOTIFICATION_SENT', {
        batchId,
        alertType,
        totalUsers: userIds.length,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      });
      
      return {
        batchId,
        totalSent: userIds.length,
        results
      };
      
    } catch (error) {
      logger.error('Bulk notification failed', { userIds: userIds.length, alertType, error: error.message });
      throw error;
    }
  }

  // Create price alert
  async createPriceAlert(userId, symbol, condition, targetPrice, options = {}) {
    try {
      const alertId = this.generateAlertId();
      
      const priceAlert = {
        alertId,
        userId,
        type: 'PRICE_ALERT',
        symbol,
        condition, // 'above', 'below', 'crosses_above', 'crosses_below'
        targetPrice,
        currentPrice: await this.getCurrentPrice(symbol),
        isActive: true,
        createdAt: Date.now(),
        triggeredAt: null,
        expiresAt: options.expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notificationPreferences: options.notificationPreferences || {}
      };
      
      // Store alert
      await this.storePriceAlert(priceAlert);
      
      // Start monitoring
      this.startPriceMonitoring(priceAlert);
      
      logBusinessEvent('PRICE_ALERT_CREATED', {
        userId,
        alertId,
        symbol,
        condition,
        targetPrice
      });
      
      return priceAlert;
      
    } catch (error) {
      logger.error('Failed to create price alert', { userId, symbol, condition, targetPrice, error: error.message });
      throw error;
    }
  }

  // Smart notification grouping
  async groupNotifications(userId, notifications) {
    try {
      if (!this.intelligentGrouping || notifications.length < 2) {
        return notifications;
      }
      
      const groups = new Map();
      
      for (const notification of notifications) {
        const groupKey = this.getGroupingKey(notification);
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        
        groups.get(groupKey).push(notification);
      }
      
      const groupedNotifications = [];
      
      for (const [groupKey, groupNotifications] of groups) {
        if (groupNotifications.length > 1) {
          // Create grouped notification
          const groupedNotification = {
            notificationId: this.generateNotificationId(),
            userId,
            alertType: 'GROUPED_NOTIFICATIONS',
            priority: this.getHighestPriority(groupNotifications),
            data: {
              groupKey,
              count: groupNotifications.length,
              notifications: groupNotifications.map(n => ({
                alertType: n.alertType,
                data: n.data,
                timestamp: n.timestamp
              }))
            },
            timestamp: Date.now(),
            isGrouped: true
          };
          
          groupedNotifications.push(groupedNotification);
        } else {
          groupedNotifications.push(groupNotifications[0]);
        }
      }
      
      return groupedNotifications;
      
    } catch (error) {
      logger.error('Failed to group notifications', { userId, error: error.message });
      return notifications;
    }
  }

  // Intelligent notification timing
  async optimizeDeliveryTiming(userId, notification) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const currentTime = new Date();
      
      // Critical notifications are always sent immediately
      if (notification.priority === 'critical') {
        return { deliverAt: Date.now(), reason: 'critical_priority' };
      }
      
      // Check user's typical activity patterns
      const activityPattern = await this.getUserActivityPattern(userId);
      const optimalHours = activityPattern.mostActiveHours || [9, 10, 11, 14, 15, 16, 17];
      
      const currentHour = currentTime.getHours();
      
      // If current hour is optimal, send immediately
      if (optimalHours.includes(currentHour)) {
        return { deliverAt: Date.now(), reason: 'optimal_time' };
      }
      
      // Find next optimal time
      const nextOptimalHour = optimalHours.find(hour => hour > currentHour) || optimalHours[0];
      const deliveryTime = new Date(currentTime);
      
      if (nextOptimalHour <= currentHour) {
        // Next day
        deliveryTime.setDate(deliveryTime.getDate() + 1);
      }
      
      deliveryTime.setHours(nextOptimalHour, 0, 0, 0);
      
      // Don't delay high priority notifications more than 2 hours
      if (notification.priority === 'high' && deliveryTime.getTime() - Date.now() > 2 * 60 * 60 * 1000) {
        return { deliverAt: Date.now(), reason: 'high_priority_override' };
      }
      
      return {
        deliverAt: deliveryTime.getTime(),
        reason: 'optimized_timing',
        originalTime: Date.now(),
        delay: deliveryTime.getTime() - Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to optimize delivery timing', { userId, error: error.message });
      return { deliverAt: Date.now(), reason: 'error_fallback' };
    }
  }

  // Push notification delivery
  async deliverPushNotification(notification) {
    try {
      const userDevices = await this.getUserDevices(notification.userId);
      const results = [];
      
      for (const device of userDevices) {
        try {
          const pushPayload = {
            to: device.token,
            title: notification.content.title,
            body: notification.content.body,
            data: {
              alertType: notification.alertType,
              notificationId: notification.notificationId,
              ...notification.data
            },
            priority: this.getPushPriority(notification.priority),
            sound: this.getPushSound(notification.alertType)
          };
          
          const response = await this.sendPushToFirebase(pushPayload);
          
          results.push({
            device: device.id,
            status: 'success',
            messageId: response.messageId
          });
          
        } catch (error) {
          results.push({
            device: device.id,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      return {
        channel: 'push',
        status: results.every(r => r.status === 'success') ? 'success' : 'partial',
        results
      };
      
    } catch (error) {
      logger.error('Push notification delivery failed', { 
        userId: notification.userId, 
        notificationId: notification.notificationId, 
        error: error.message 
      });
      
      return {
        channel: 'push',
        status: 'failed',
        error: error.message
      };
    }
  }

  // Email notification delivery
  async deliverEmailNotification(notification) {
    try {
      const userEmail = await this.getUserEmail(notification.userId);
      
      const emailPayload = {
        to: userEmail,
        subject: notification.content.emailSubject || notification.content.title,
        html: await this.generateEmailTemplate(notification),
        from: process.env.FROM_EMAIL || 'notifications@brokerage.com',
        replyTo: process.env.SUPPORT_EMAIL || 'support@brokerage.com'
      };
      
      const response = await this.sendEmailViaSendGrid(emailPayload);
      
      return {
        channel: 'email',
        status: 'success',
        messageId: response.messageId
      };
      
    } catch (error) {
      logger.error('Email notification delivery failed', { 
        userId: notification.userId, 
        notificationId: notification.notificationId, 
        error: error.message 
      });
      
      return {
        channel: 'email',
        status: 'failed',
        error: error.message
      };
    }
  }

  // SMS notification delivery
  async deliverSMSNotification(notification) {
    try {
      const userPhone = await this.getUserPhone(notification.userId);
      
      if (!userPhone) {
        return {
          channel: 'sms',
          status: 'failed',
          error: 'No phone number on file'
        };
      }
      
      const smsPayload = {
        to: userPhone,
        body: notification.content.smsBody || notification.content.body,
        from: process.env.TWILIO_PHONE_NUMBER
      };
      
      const response = await this.sendSMSViaTwilio(smsPayload);
      
      return {
        channel: 'sms',
        status: 'success',
        messageId: response.sid
      };
      
    } catch (error) {
      logger.error('SMS notification delivery failed', { 
        userId: notification.userId, 
        notificationId: notification.notificationId, 
        error: error.message 
      });
      
      return {
        channel: 'sms',
        status: 'failed',
        error: error.message
      };
    }
  }

  // In-app notification delivery
  async deliverInAppNotification(notification) {
    try {
      // Store in-app notification in database/cache
      await this.storeInAppNotification(notification);
      
      // Emit real-time event to connected clients
      this.emit('inAppNotification', {
        userId: notification.userId,
        notification: {
          id: notification.notificationId,
          type: notification.alertType,
          title: notification.content.title,
          body: notification.content.body,
          data: notification.data,
          timestamp: notification.timestamp,
          priority: notification.priority
        }
      });
      
      return {
        channel: 'inApp',
        status: 'success'
      };
      
    } catch (error) {
      logger.error('In-app notification delivery failed', { 
        userId: notification.userId, 
        notificationId: notification.notificationId, 
        error: error.message 
      });
      
      return {
        channel: 'inApp',
        status: 'failed',
        error: error.message
      };
    }
  }

  // Get notification history
  async getNotificationHistory(userId, limit = 50, offset = 0, filters = {}) {
    try {
      const history = await this.getStoredNotifications(userId, limit, offset, filters);
      
      return {
        notifications: history.notifications,
        total: history.total,
        hasMore: offset + limit < history.total,
        filters
      };
      
    } catch (error) {
      logger.error('Failed to get notification history', { userId, error: error.message });
      throw error;
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedPrefs = { ...currentPrefs, ...preferences };
      
      // Validate preferences
      await this.validatePreferences(updatedPrefs);
      
      // Store updated preferences
      await this.storeUserPreferences(userId, updatedPrefs);
      
      // Update cache
      this.userPreferences.set(userId, updatedPrefs);
      
      logBusinessEvent('NOTIFICATION_PREFERENCES_UPDATED', {
        userId,
        changes: Object.keys(preferences)
      });
      
      return updatedPrefs;
      
    } catch (error) {
      logger.error('Failed to update user preferences', { userId, preferences, error: error.message });
      throw error;
    }
  }

  // Get notification analytics
  async getNotificationAnalytics(userId, timeframe = '30d') {
    try {
      const analytics = await this.calculateNotificationAnalytics(userId, timeframe);
      
      return {
        userId,
        timeframe,
        summary: {
          totalSent: analytics.totalSent,
          totalOpened: analytics.totalOpened,
          openRate: analytics.totalSent > 0 ? (analytics.totalOpened / analytics.totalSent * 100) : 0,
          avgDeliveryTime: analytics.avgDeliveryTime
        },
        byChannel: analytics.byChannel,
        byAlertType: analytics.byAlertType,
        trends: analytics.trends,
        generatedAt: Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to get notification analytics', { userId, timeframe, error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const notificationSystem = new NotificationSystem();

module.exports = { notificationSystem, NotificationSystem };
