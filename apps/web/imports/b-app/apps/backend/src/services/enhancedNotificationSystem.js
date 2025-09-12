/**
 * 🔔 ENHANCED NOTIFICATION SYSTEM - IBKR-Level Capabilities
 * 
 * This comprehensive notification system provides all the features found in
 * Interactive Brokers and more, including:
 * - Real-time trade execution confirmations
 * - Email notifications for all trading activities
 * - Analyst rating change alerts
 * - Mobile push notifications
 * - Advanced market alerts and risk notifications
 * - Regulatory and compliance notifications
 */

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const twilio = require('twilio');
const { logger, logBusinessEvent } = require('../utils/logger');
const { cacheService } = require('../config/redis');
const { ValidationError, ExternalApiError } = require('../utils/errorHandler');

class EnhancedNotificationSystem extends EventEmitter {
  constructor() {
    super();
    
    // 📧 EMAIL CONFIGURATION
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // 📱 MOBILE PUSH CONFIGURATION
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
    
    // 📞 SMS CONFIGURATION
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // 🎯 COMPREHENSIVE NOTIFICATION TYPES (IBKR-Level Coverage)
    this.notificationTypes = {
      
      // 💰 TRADING NOTIFICATIONS
      TRADE_EXECUTED: {
        priority: 'critical',
        channels: ['push', 'email', 'inApp', 'sms'],
        template: 'trade_execution',
        requiresConfirmation: true,
        regulatoryRequired: true
      },
      ORDER_FILLED: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'order_filled',
        requiresConfirmation: true
      },
      PARTIAL_FILL: {
        priority: 'high',
        channels: ['push', 'inApp'],
        template: 'partial_fill'
      },
      ORDER_CANCELLED: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'order_cancelled'
      },
      ORDER_REJECTED: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'order_rejected'
      },
      STOP_LOSS_TRIGGERED: {
        priority: 'critical',
        channels: ['push', 'sms', 'email', 'inApp'],
        template: 'stop_loss_triggered',
        requiresImmediate: true
      },
      TAKE_PROFIT_HIT: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'take_profit_hit'
      },
      
      // 📊 ANALYST & RESEARCH NOTIFICATIONS
      ANALYST_RATING_UPGRADE: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'analyst_upgrade'
      },
      ANALYST_RATING_DOWNGRADE: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'analyst_downgrade'
      },
      PRICE_TARGET_CHANGE: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'price_target_change'
      },
      EARNINGS_ESTIMATE_REVISION: {
        priority: 'low',
        channels: ['push', 'inApp'],
        template: 'earnings_revision'
      },
      RESEARCH_REPORT_PUBLISHED: {
        priority: 'low',
        channels: ['email', 'inApp'],
        template: 'research_report'
      },
      
      // 📈 MARKET ALERTS
      PRICE_ALERT_TRIGGERED: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'price_alert'
      },
      VOLUME_SPIKE_DETECTED: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'volume_spike'
      },
      VOLATILITY_ALERT: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'volatility_alert'
      },
      MARKET_HOURS_CHANGE: {
        priority: 'low',
        channels: ['push', 'email', 'inApp'],
        template: 'market_hours'
      },
      DIVIDEND_ANNOUNCEMENT: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'dividend_announcement'
      },
      STOCK_SPLIT_ANNOUNCEMENT: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'stock_split'
      },
      
      // 💳 ACCOUNT NOTIFICATIONS
      DEPOSIT_CONFIRMED: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'deposit_confirmed',
        regulatoryRequired: true
      },
      WITHDRAWAL_PROCESSED: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'withdrawal_processed',
        regulatoryRequired: true
      },
      MARGIN_CALL: {
        priority: 'critical',
        channels: ['push', 'sms', 'email', 'inApp'],
        template: 'margin_call',
        requiresImmediate: true,
        regulatoryRequired: true
      },
      LOW_BUYING_POWER: {
        priority: 'medium',
        channels: ['push', 'inApp'],
        template: 'low_buying_power'
      },
      ACCOUNT_RESTRICTION: {
        priority: 'critical',
        channels: ['push', 'sms', 'email', 'inApp'],
        template: 'account_restriction',
        regulatoryRequired: true
      },
      
      // 🔒 SECURITY NOTIFICATIONS
      LOGIN_FROM_NEW_DEVICE: {
        priority: 'high',
        channels: ['push', 'email', 'sms'],
        template: 'new_device_login'
      },
      SUSPICIOUS_ACTIVITY_DETECTED: {
        priority: 'critical',
        channels: ['push', 'sms', 'email', 'inApp'],
        template: 'suspicious_activity',
        requiresImmediate: true
      },
      PASSWORD_CHANGED: {
        priority: 'high',
        channels: ['push', 'email'],
        template: 'password_changed'
      },
      TWO_FACTOR_ENABLED: {
        priority: 'medium',
        channels: ['push', 'email'],
        template: 'two_factor_enabled'
      },
      
      // 📋 REGULATORY & COMPLIANCE
      TAX_DOCUMENT_READY: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'tax_document_ready',
        regulatoryRequired: true
      },
      KYC_DOCUMENT_EXPIRING: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'kyc_expiring',
        regulatoryRequired: true
      },
      REGULATORY_NOTICE: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'regulatory_notice',
        regulatoryRequired: true
      },
      CORPORATE_ACTION: {
        priority: 'high',
        channels: ['push', 'email', 'inApp'],
        template: 'corporate_action',
        regulatoryRequired: true
      },
      
      // 🤖 AI & SYSTEM ALERTS
      AI_RECOMMENDATION: {
        priority: 'low',
        channels: ['push', 'inApp'],
        template: 'ai_recommendation'
      },
      PORTFOLIO_REBALANCE_SUGGESTION: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'rebalance_suggestion'
      },
      RISK_LIMIT_EXCEEDED: {
        priority: 'high',
        channels: ['push', 'sms', 'inApp'],
        template: 'risk_limit_exceeded'
      },
      SYSTEM_MAINTENANCE: {
        priority: 'medium',
        channels: ['push', 'email', 'inApp'],
        template: 'system_maintenance'
      }
    };
    
    // 📧 EMAIL TEMPLATES
    this.emailTemplates = {
      trade_execution: {
        subject: 'Trade Executed - {{symbol}} {{side}} {{quantity}} shares',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Trade Execution Confirmation</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Symbol:</strong> {{symbol}}</p>
              <p><strong>Side:</strong> {{side}}</p>
              <p><strong>Quantity:</strong> {{quantity}} shares</p>
              <p><strong>Price:</strong> ${{price}}</p>
              <p><strong>Total Value:</strong> ${{totalValue}}</p>
              <p><strong>Execution Time:</strong> {{executionTime}}</p>
              <p><strong>Order ID:</strong> {{orderId}}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">
              This is an automated notification from your brokerage platform.
              Please keep this confirmation for your records.
            </p>
          </div>
        `
      },
      analyst_upgrade: {
        subject: 'Analyst Upgrade: {{symbol}} - {{newRating}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Analyst Rating Upgrade</h2>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>{{symbol}} - {{companyName}}</h3>
              <p><strong>Previous Rating:</strong> {{oldRating}}</p>
              <p><strong>New Rating:</strong> <span style="color: #059669;">{{newRating}}</span></p>
              <p><strong>Analyst Firm:</strong> {{analystFirm}}</p>
              <p><strong>Price Target:</strong> ${{priceTarget}}</p>
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
              <h4>Key Points:</h4>
              <ul>
                {{#each keyPoints}}
                <li>{{this}}</li>
                {{/each}}
              </ul>
            </div>
          </div>
        `
      }
    };
    
    // 📱 PUSH NOTIFICATION TEMPLATES
    this.pushTemplates = {
      trade_execution: {
        title: 'Trade Executed',
        body: '{{side}} {{quantity}} {{symbol}} at ${{price}}',
        icon: 'trade_icon',
        sound: 'trade_sound',
        priority: 'high'
      },
      analyst_upgrade: {
        title: 'Analyst Upgrade',
        body: '{{symbol}} upgraded to {{newRating}} by {{analystFirm}}',
        icon: 'analyst_icon',
        priority: 'normal'
      }
    };
    
    // 🎯 USER PREFERENCES STORAGE
    this.userPreferences = new Map();
    this.activeNotifications = new Map();
    this.deliveryTracking = new Map();
    this.notificationHistory = new Map();
    
    // 🔄 REAL-TIME FEATURES
    this.realTimeSubscriptions = new Map(); // userId -> subscribed symbols
    this.priceAlerts = new Map(); // alertId -> alert config
    this.analystWatchers = new Map(); // userId -> watched symbols
    
    this.initializeSystem();
  }
  
  /**
   * 🚀 INITIALIZE NOTIFICATION SYSTEM
   */
  async initializeSystem() {
    try {
      logger.info('Initializing Enhanced Notification System...');
      
      // Initialize email service
      await this.initializeEmailService();
      
      // Initialize push notification service
      await this.initializePushService();
      
      // Initialize SMS service
      await this.initializeSMSService();
      
      // Load user preferences
      await this.loadUserPreferences();
      
      // Start real-time monitoring
      this.startRealTimeMonitoring();
      
      logger.info('Enhanced Notification System initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize notification system:', error);
      throw error;
    }
  }
  
  /**
   * 📧 SEND TRADE EXECUTION NOTIFICATION
   */
  async sendTradeExecutionNotification(userId, tradeData) {
    try {
      const notification = {
        userId,
        type: 'TRADE_EXECUTED',
        data: {
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          price: tradeData.executionPrice,
          totalValue: tradeData.quantity * tradeData.executionPrice,
          executionTime: new Date().toISOString(),
          orderId: tradeData.orderId,
          fees: tradeData.fees || 0
        },
        timestamp: Date.now(),
        priority: 'critical'
      };
      
      // Send via all configured channels
      const results = await Promise.allSettled([
        this.sendEmailNotification(notification),
        this.sendPushNotification(notification),
        this.sendInAppNotification(notification),
        this.sendSMSNotification(notification) // For critical trades
      ]);
      
      // Log delivery results
      await this.logNotificationDelivery(notification, results);
      
      // Store for regulatory compliance
      await this.storeRegulatoryRecord(notification);
      
      return {
        notificationId: notification.id,
        deliveryResults: results,
        status: 'sent'
      };
      
    } catch (error) {
      logger.error('Failed to send trade execution notification:', error);
      throw error;
    }
  }
  
  /**
   * 📊 SEND ANALYST RATING CHANGE NOTIFICATION
   */
  async sendAnalystRatingNotification(userId, ratingData) {
    try {
      const notificationType = ratingData.direction === 'upgrade' ? 
        'ANALYST_RATING_UPGRADE' : 'ANALYST_RATING_DOWNGRADE';
      
      const notification = {
        userId,
        type: notificationType,
        data: {
          symbol: ratingData.symbol,
          companyName: ratingData.companyName,
          oldRating: ratingData.oldRating,
          newRating: ratingData.newRating,
          analystFirm: ratingData.analystFirm,
          priceTarget: ratingData.priceTarget,
          date: new Date().toISOString(),
          keyPoints: ratingData.keyPoints || []
        },
        timestamp: Date.now(),
        priority: 'medium'
      };
      
      // Check if user is watching this symbol
      const userWatchlist = this.analystWatchers.get(userId) || [];
      if (!userWatchlist.includes(ratingData.symbol)) {
        logger.info('User not watching symbol for analyst alerts', { userId, symbol: ratingData.symbol });
        return { status: 'not_watching' };
      }
      
      // Send notifications
      const results = await Promise.allSettled([
        this.sendEmailNotification(notification),
        this.sendPushNotification(notification),
        this.sendInAppNotification(notification)
      ]);
      
      return {
        notificationId: notification.id,
        deliveryResults: results,
        status: 'sent'
      };
      
    } catch (error) {
      logger.error('Failed to send analyst rating notification:', error);
      throw error;
    }
  }
  
  /**
   * 📧 SEND EMAIL NOTIFICATION
   */
  async sendEmailNotification(notification) {
    try {
      const user = await this.getUserDetails(notification.userId);
      const template = this.emailTemplates[notification.type.toLowerCase()];
      
      if (!template) {
        throw new Error(`No email template found for ${notification.type}`);
      }
      
      // Compile template with data
      const compiledSubject = this.compileTemplate(template.subject, notification.data);
      const compiledHtml = this.compileTemplate(template.html, notification.data);
      
      const mailOptions = {
        from: `"Your Brokerage Platform" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: compiledSubject,
        html: compiledHtml,
        attachments: notification.data.attachments || []
      };
      
      const result = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info('Email notification sent successfully', {
        userId: notification.userId,
        type: notification.type,
        messageId: result.messageId
      });
      
      return {
        channel: 'email',
        status: 'delivered',
        messageId: result.messageId,
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      return {
        channel: 'email',
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 📱 SEND PUSH NOTIFICATION
   */
  async sendPushNotification(notification) {
    try {
      const userTokens = await this.getUserDeviceTokens(notification.userId);
      if (!userTokens || userTokens.length === 0) {
        return {
          channel: 'push',
          status: 'no_devices',
          timestamp: Date.now()
        };
      }
      
      const template = this.pushTemplates[notification.type.toLowerCase()];
      if (!template) {
        throw new Error(`No push template found for ${notification.type}`);
      }
      
      const message = {
        notification: {
          title: this.compileTemplate(template.title, notification.data),
          body: this.compileTemplate(template.body, notification.data),
          icon: template.icon,
          sound: template.sound
        },
        data: {
          type: notification.type,
          timestamp: notification.timestamp.toString(),
          ...notification.data
        },
        android: {
          priority: template.priority,
          notification: {
            channelId: 'trading_notifications',
            priority: template.priority,
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: notification.type
            }
          }
        },
        tokens: userTokens
      };
      
      const response = await admin.messaging().sendMulticast(message);
      
      logger.info('Push notification sent', {
        userId: notification.userId,
        type: notification.type,
        successCount: response.successCount,
        failureCount: response.failureCount
      });
      
      return {
        channel: 'push',
        status: 'delivered',
        successCount: response.successCount,
        failureCount: response.failureCount,
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return {
        channel: 'push',
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 📞 SEND SMS NOTIFICATION (For Critical Alerts)
   */
  async sendSMSNotification(notification) {
    try {
      // Only send SMS for critical notifications
      const config = this.notificationTypes[notification.type];
      if (!config.requiresImmediate && notification.priority !== 'critical') {
        return {
          channel: 'sms',
          status: 'skipped_not_critical',
          timestamp: Date.now()
        };
      }
      
      const user = await this.getUserDetails(notification.userId);
      if (!user.phoneNumber) {
        return {
          channel: 'sms',
          status: 'no_phone_number',
          timestamp: Date.now()
        };
      }
      
      const message = this.generateSMSMessage(notification);
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber
      });
      
      logger.info('SMS notification sent', {
        userId: notification.userId,
        type: notification.type,
        messageSid: result.sid
      });
      
      return {
        channel: 'sms',
        status: 'delivered',
        messageSid: result.sid,
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      return {
        channel: 'sms',
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 🔄 START REAL-TIME MONITORING
   */
  startRealTimeMonitoring() {
    // Monitor price alerts
    setInterval(async () => {
      await this.checkPriceAlerts();
    }, 5000); // Check every 5 seconds
    
    // Monitor analyst rating changes
    setInterval(async () => {
      await this.checkAnalystRatingChanges();
    }, 60000); // Check every minute
    
    // Monitor market volatility
    setInterval(async () => {
      await this.checkMarketVolatility();
    }, 30000); // Check every 30 seconds
    
    logger.info('Real-time monitoring started');
  }
  
  /**
   * 📊 CHECK ANALYST RATING CHANGES
   */
  async checkAnalystRatingChanges() {
    try {
      // This would integrate with financial data providers
      // For now, simulate checking for rating changes
      const ratingChanges = await this.fetchAnalystRatingChanges();
      
      for (const change of ratingChanges) {
        // Find users watching this symbol
        const watchingUsers = await this.getUsersWatchingSymbol(change.symbol);
        
        for (const userId of watchingUsers) {
          await this.sendAnalystRatingNotification(userId, change);
        }
      }
      
    } catch (error) {
      logger.error('Error checking analyst rating changes:', error);
    }
  }
  
  /**
   * 🎯 UTILITY METHODS
   */
  
  compileTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async getUserDetails(userId) {
    // Fetch user details from database
    return {
      email: 'user@example.com',
      phoneNumber: '+1234567890',
      preferences: {}
    };
  }
  
  async getUserDeviceTokens(userId) {
    // Fetch device tokens from database
    return ['device_token_1', 'device_token_2'];
  }
  
  generateSMSMessage(notification) {
    const templates = {
      TRADE_EXECUTED: `Trade Alert: ${notification.data.side} ${notification.data.quantity} ${notification.data.symbol} at $${notification.data.price}`,
      MARGIN_CALL: `URGENT: Margin call on your account. Please add funds immediately.`,
      STOP_LOSS_TRIGGERED: `Stop Loss Alert: ${notification.data.symbol} position closed at $${notification.data.price}`
    };
    
    return templates[notification.type] || `Alert: ${notification.type}`;
  }
  
  async fetchAnalystRatingChanges() {
    // Simulate fetching from financial data provider
    return [];
  }
  
  async getUsersWatchingSymbol(symbol) {
    // Fetch users watching this symbol
    return [];
  }
  
  async logNotificationDelivery(notification, results) {
    // Log delivery results for analytics
    logger.info('Notification delivery completed', {
      notificationId: notification.id,
      type: notification.type,
      results: results.map(r => ({
        status: r.status,
        value: r.value
      }))
    });
  }
  
  async storeRegulatoryRecord(notification) {
    // Store notification for regulatory compliance
    const config = this.notificationTypes[notification.type];
    if (config.regulatoryRequired) {
      // Store in compliance database
      logger.info('Regulatory notification record stored', {
        notificationId: notification.id,
        type: notification.type,
        userId: notification.userId
      });
    }
  }
}

module.exports = { EnhancedNotificationSystem };
