const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DeliveryOptimizer extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.optimizationRules = new Map();
    this.deliveryQueues = new Map();
    this.performanceMetrics = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load optimization rules
      await this.loadOptimizationRules();
      
      // Load performance metrics
      await this.loadPerformanceMetrics();
      
      this._initialized = true;
      logger.info('DeliveryOptimizer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DeliveryOptimizer:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DeliveryOptimizer closed');
    } catch (error) {
      logger.error('Error closing DeliveryOptimizer:', error);
    }
  }

  async loadOptimizationRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM delivery_optimization_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const rule of result.rows) {
        this.optimizationRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} optimization rules`);
    } catch (error) {
      logger.error('Error loading optimization rules:', error);
      throw error;
    }
  }

  async loadPerformanceMetrics() {
    try {
      const result = await pool.query(`
        SELECT * FROM delivery_performance_metrics
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
      `);
      
      for (const metric of result.rows) {
        this.performanceMetrics.set(metric.id, {
          ...metric,
          data: metric.data ? JSON.parse(metric.data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} performance metrics`);
    } catch (error) {
      logger.error('Error loading performance metrics:', error);
      throw error;
    }
  }

  async optimizeDelivery(notificationId, optimizationType, parameters, userId) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      const optimizationResult = {
        id: nanoid(),
        notificationId,
        optimizationType,
        parameters,
        status: 'pending',
        created_by: userId,
        created_at: new Date()
      };
      
      // Apply optimization based on type
      switch (optimizationType) {
        case 'timing':
          await this.optimizeTiming(notification, parameters, optimizationResult);
          break;
        case 'channel_selection':
          await this.optimizeChannelSelection(notification, parameters, optimizationResult);
          break;
        case 'personalization':
          await this.optimizePersonalization(notification, parameters, optimizationResult);
          break;
        case 'batch_processing':
          await this.optimizeBatchProcessing(notification, parameters, optimizationResult);
          break;
        case 'retry_strategy':
          await this.optimizeRetryStrategy(notification, parameters, optimizationResult);
          break;
        default:
          throw new Error(`Unknown optimization type: ${optimizationType}`);
      }
      
      // Store optimization result
      await this.storeOptimizationResult(optimizationResult);
      
      // Emit event
      this.emit('deliveryOptimized', optimizationResult);
      
      logger.info(`Delivery optimized: ${notificationId}`, {
        optimizationType,
        status: optimizationResult.status
      });
      
      return optimizationResult;
    } catch (error) {
      logger.error('Error optimizing delivery:', error);
      throw error;
    }
  }

  async optimizeTiming(notification, parameters, optimizationResult) {
    try {
      const { timezone, businessHours, userPreferences } = parameters;
      
      // Calculate optimal delivery time
      const optimalTime = this.calculateOptimalDeliveryTime(
        notification,
        timezone,
        businessHours,
        userPreferences
      );
      
      // Update notification schedule
      await this.updateNotificationSchedule(notification.id, optimalTime);
      
      optimizationResult.status = 'completed';
      optimizationResult.result = {
        optimalTime,
        timezone,
        businessHours
      };
      
      logger.info(`Timing optimized for notification ${notification.id}`, {
        optimalTime,
        timezone
      });
    } catch (error) {
      logger.error('Error optimizing timing:', error);
      optimizationResult.status = 'failed';
      optimizationResult.error = error.message;
    }
  }

  async optimizeChannelSelection(notification, parameters, optimizationResult) {
    try {
      const { userPreferences, channelPerformance, costConstraints } = parameters;
      
      // Analyze channel performance
      const channelScores = await this.analyzeChannelPerformance(
        notification.recipients,
        notification.channels,
        channelPerformance
      );
      
      // Select optimal channels
      const optimalChannels = this.selectOptimalChannels(
        channelScores,
        userPreferences,
        costConstraints
      );
      
      // Update notification channels
      await this.updateNotificationChannels(notification.id, optimalChannels);
      
      optimizationResult.status = 'completed';
      optimizationResult.result = {
        optimalChannels,
        channelScores
      };
      
      logger.info(`Channel selection optimized for notification ${notification.id}`, {
        optimalChannels
      });
    } catch (error) {
      logger.error('Error optimizing channel selection:', error);
      optimizationResult.status = 'failed';
      optimizationResult.error = error.message;
    }
  }

  async optimizePersonalization(notification, parameters, optimizationResult) {
    try {
      const { userProfiles, personalizationRules, contentVariants } = parameters;
      
      // Generate personalized content for each recipient
      const personalizedContent = await this.generatePersonalizedContent(
        notification,
        userProfiles,
        personalizationRules,
        contentVariants
      );
      
      // Update notification with personalized content
      await this.updateNotificationContent(notification.id, personalizedContent);
      
      optimizationResult.status = 'completed';
      optimizationResult.result = {
        personalizedContent: personalizedContent.length
      };
      
      logger.info(`Personalization optimized for notification ${notification.id}`, {
        personalizedCount: personalizedContent.length
      });
    } catch (error) {
      logger.error('Error optimizing personalization:', error);
      optimizationResult.status = 'failed';
      optimizationResult.error = error.message;
    }
  }

  async optimizeBatchProcessing(notification, parameters, optimizationResult) {
    try {
      const { batchSize, batchDelay, groupingCriteria } = parameters;
      
      // Group notifications for batch processing
      const batches = await this.groupNotificationsForBatch(
        notification,
        batchSize,
        groupingCriteria
      );
      
      // Schedule batch processing
      await this.scheduleBatchProcessing(batches, batchDelay);
      
      optimizationResult.status = 'completed';
      optimizationResult.result = {
        batches: batches.length,
        totalNotifications: batches.reduce((sum, batch) => sum + batch.notifications.length, 0)
      };
      
      logger.info(`Batch processing optimized for notification ${notification.id}`, {
        batches: batches.length
      });
    } catch (error) {
      logger.error('Error optimizing batch processing:', error);
      optimizationResult.status = 'failed';
      optimizationResult.error = error.message;
    }
  }

  async optimizeRetryStrategy(notification, parameters, optimizationResult) {
    try {
      const { maxRetries, retryDelay, backoffStrategy } = parameters;
      
      // Configure retry strategy
      const retryConfig = this.configureRetryStrategy(
        maxRetries,
        retryDelay,
        backoffStrategy
      );
      
      // Update notification retry configuration
      await this.updateNotificationRetryConfig(notification.id, retryConfig);
      
      optimizationResult.status = 'completed';
      optimizationResult.result = {
        retryConfig
      };
      
      logger.info(`Retry strategy optimized for notification ${notification.id}`, {
        maxRetries,
        backoffStrategy
      });
    } catch (error) {
      logger.error('Error optimizing retry strategy:', error);
      optimizationResult.status = 'failed';
      optimizationResult.error = error.message;
    }
  }

  calculateOptimalDeliveryTime(notification, timezone, businessHours, userPreferences) {
    try {
      const now = new Date();
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      
      // Get user's preferred delivery time
      const preferredTime = userPreferences?.preferredDeliveryTime || '09:00';
      const [preferredHour, preferredMinute] = preferredTime.split(':').map(Number);
      
      // Calculate next optimal delivery time
      let optimalTime = new Date(userTime);
      optimalTime.setHours(preferredHour, preferredMinute, 0, 0);
      
      // If the time has passed today, schedule for tomorrow
      if (optimalTime <= userTime) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
      
      // Check business hours
      if (businessHours) {
        const { start, end } = businessHours;
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        
        const businessStart = new Date(optimalTime);
        businessStart.setHours(startHour, startMinute, 0, 0);
        
        const businessEnd = new Date(optimalTime);
        businessEnd.setHours(endHour, endMinute, 0, 0);
        
        if (optimalTime < businessStart) {
          optimalTime = businessStart;
        } else if (optimalTime > businessEnd) {
          optimalTime.setDate(optimalTime.getDate() + 1);
          optimalTime.setHours(startHour, startMinute, 0, 0);
        }
      }
      
      return optimalTime;
    } catch (error) {
      logger.error('Error calculating optimal delivery time:', error);
      return new Date(Date.now() + 60 * 60 * 1000); // Default to 1 hour from now
    }
  }

  async analyzeChannelPerformance(recipients, channels, channelPerformance) {
    try {
      const channelScores = {};
      
      for (const channel of channels) {
        const performance = channelPerformance[channel] || {};
        const score = this.calculateChannelScore(performance);
        channelScores[channel] = {
          score,
          performance,
          estimatedDeliveryTime: performance.avgDeliveryTime || 0,
          successRate: performance.successRate || 0,
          cost: performance.cost || 0
        };
      }
      
      return channelScores;
    } catch (error) {
      logger.error('Error analyzing channel performance:', error);
      return {};
    }
  }

  calculateChannelScore(performance) {
    try {
      const weights = {
        successRate: 0.4,
        deliveryTime: 0.3,
        cost: 0.2,
        userPreference: 0.1
      };
      
      const successRateScore = (performance.successRate || 0) * 100;
      const deliveryTimeScore = Math.max(0, 100 - (performance.avgDeliveryTime || 0) / 1000);
      const costScore = Math.max(0, 100 - (performance.cost || 0) * 100);
      const userPreferenceScore = (performance.userPreference || 0) * 100;
      
      const score = (
        successRateScore * weights.successRate +
        deliveryTimeScore * weights.deliveryTime +
        costScore * weights.cost +
        userPreferenceScore * weights.userPreference
      );
      
      return Math.round(score);
    } catch (error) {
      logger.error('Error calculating channel score:', error);
      return 0;
    }
  }

  selectOptimalChannels(channelScores, userPreferences, costConstraints) {
    try {
      const sortedChannels = Object.entries(channelScores)
        .sort(([, a], [, b]) => b.score - a.score);
      
      let optimalChannels = [];
      let totalCost = 0;
      
      for (const [channel, scores] of sortedChannels) {
        if (costConstraints && totalCost + scores.cost > costConstraints.maxCost) {
          continue;
        }
        
        if (scores.score >= (userPreferences?.minChannelScore || 50)) {
          optimalChannels.push(channel);
          totalCost += scores.cost;
        }
      }
      
      return optimalChannels;
    } catch (error) {
      logger.error('Error selecting optimal channels:', error);
      return [];
    }
  }

  async generatePersonalizedContent(notification, userProfiles, personalizationRules, contentVariants) {
    try {
      const personalizedContent = [];
      
      for (const recipient of notification.recipients) {
        const userProfile = userProfiles[recipient] || {};
        const personalizedMessage = this.personalizeMessage(
          notification.message,
          userProfile,
          personalizationRules,
          contentVariants
        );
        
        personalizedContent.push({
          recipient,
          message: personalizedMessage,
          personalizationApplied: Object.keys(personalizedMessage).length
        });
      }
      
      return personalizedContent;
    } catch (error) {
      logger.error('Error generating personalized content:', error);
      return [];
    }
  }

  personalizeMessage(message, userProfile, personalizationRules, contentVariants) {
    try {
      let personalizedMessage = { ...message };
      
      // Apply personalization rules
      for (const rule of personalizationRules) {
        if (this.evaluatePersonalizationRule(rule, userProfile)) {
          personalizedMessage = this.applyPersonalizationRule(personalizedMessage, rule);
        }
      }
      
      // Apply content variants
      if (contentVariants && contentVariants.length > 0) {
        const variant = this.selectContentVariant(contentVariants, userProfile);
        personalizedMessage = { ...personalizedMessage, ...variant };
      }
      
      return personalizedMessage;
    } catch (error) {
      logger.error('Error personalizing message:', error);
      return message;
    }
  }

  evaluatePersonalizationRule(rule, userProfile) {
    try {
      const { condition, field, operator, value } = rule;
      
      let fieldValue;
      switch (field) {
        case 'age':
          fieldValue = userProfile.age;
          break;
        case 'location':
          fieldValue = userProfile.location;
          break;
        case 'preferences':
          fieldValue = userProfile.preferences;
          break;
        case 'behavior':
          fieldValue = userProfile.behavior;
          break;
        default:
          fieldValue = userProfile[field];
      }
      
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'contains':
          return fieldValue && fieldValue.toString().includes(value);
        case 'not_contains':
          return !fieldValue || !fieldValue.toString().includes(value);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating personalization rule:', error);
      return false;
    }
  }

  applyPersonalizationRule(message, rule) {
    try {
      const { action, field, value } = rule;
      
      switch (action) {
        case 'replace':
          message[field] = value;
          break;
        case 'append':
          message[field] = (message[field] || '') + value;
          break;
        case 'prepend':
          message[field] = value + (message[field] || '');
          break;
        case 'modify':
          if (typeof message[field] === 'string') {
            message[field] = message[field].replace(/\{\{(\w+)\}\}/g, (match, key) => {
              return value[key] || match;
            });
          }
          break;
      }
      
      return message;
    } catch (error) {
      logger.error('Error applying personalization rule:', error);
      return message;
    }
  }

  selectContentVariant(contentVariants, userProfile) {
    try {
      // Simple variant selection based on user profile
      const variantIndex = userProfile.age ? userProfile.age % contentVariants.length : 0;
      return contentVariants[variantIndex] || {};
    } catch (error) {
      logger.error('Error selecting content variant:', error);
      return {};
    }
  }

  async groupNotificationsForBatch(notification, batchSize, groupingCriteria) {
    try {
      const batches = [];
      const recipients = notification.recipients;
      
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batchRecipients = recipients.slice(i, i + batchSize);
        const batch = {
          id: nanoid(),
          notifications: batchRecipients.map(recipient => ({
            ...notification,
            id: nanoid(),
            recipients: [recipient]
          })),
          groupingCriteria,
          created_at: new Date()
        };
        batches.push(batch);
      }
      
      return batches;
    } catch (error) {
      logger.error('Error grouping notifications for batch:', error);
      return [];
    }
  }

  async scheduleBatchProcessing(batches, batchDelay) {
    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const delay = i * batchDelay;
        
        setTimeout(async () => {
          await this.processBatch(batch);
        }, delay);
      }
      
      logger.info(`Scheduled ${batches.length} batches for processing`);
    } catch (error) {
      logger.error('Error scheduling batch processing:', error);
    }
  }

  async processBatch(batch) {
    try {
      logger.info(`Processing batch ${batch.id} with ${batch.notifications.length} notifications`);
      
      for (const notification of batch.notifications) {
        // Process each notification in the batch
        await this.processNotification(notification);
      }
      
      logger.info(`Batch ${batch.id} processed successfully`);
    } catch (error) {
      logger.error(`Error processing batch ${batch.id}:`, error);
    }
  }

  configureRetryStrategy(maxRetries, retryDelay, backoffStrategy) {
    try {
      const retryConfig = {
        maxRetries: maxRetries || 3,
        retryDelay: retryDelay || 60000, // 1 minute
        backoffStrategy: backoffStrategy || 'exponential',
        retryDelays: []
      };
      
      // Calculate retry delays based on strategy
      for (let i = 0; i < retryConfig.maxRetries; i++) {
        let delay;
        switch (backoffStrategy) {
          case 'exponential':
            delay = retryConfig.retryDelay * Math.pow(2, i);
            break;
          case 'linear':
            delay = retryConfig.retryDelay * (i + 1);
            break;
          case 'fixed':
            delay = retryConfig.retryDelay;
            break;
          default:
            delay = retryConfig.retryDelay;
        }
        retryConfig.retryDelays.push(delay);
      }
      
      return retryConfig;
    } catch (error) {
      logger.error('Error configuring retry strategy:', error);
      return {
        maxRetries: 3,
        retryDelay: 60000,
        backoffStrategy: 'exponential',
        retryDelays: [60000, 120000, 240000]
      };
    }
  }

  async getNotification(notificationId) {
    try {
      const result = await pool.query(`
        SELECT * FROM notifications WHERE id = $1
      `, [notificationId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const notification = result.rows[0];
      return {
        ...notification,
        recipients: notification.recipients ? JSON.parse(notification.recipients) : [],
        channels: notification.channels ? JSON.parse(notification.channels) : [],
        message: notification.message ? JSON.parse(notification.message) : {},
        metadata: notification.metadata ? JSON.parse(notification.metadata) : {}
      };
    } catch (error) {
      logger.error('Error getting notification:', error);
      return null;
    }
  }

  async storeOptimizationResult(optimizationResult) {
    try {
      await pool.query(`
        INSERT INTO delivery_optimizations (
          id, notification_id, optimization_type, parameters, status, result, error,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        optimizationResult.id,
        optimizationResult.notificationId,
        optimizationResult.optimizationType,
        JSON.stringify(optimizationResult.parameters),
        optimizationResult.status,
        optimizationResult.result ? JSON.stringify(optimizationResult.result) : null,
        optimizationResult.error,
        optimizationResult.created_by,
        optimizationResult.created_at
      ]);
    } catch (error) {
      logger.error('Error storing optimization result:', error);
      throw error;
    }
  }

  async updateNotificationSchedule(notificationId, scheduledAt) {
    try {
      await pool.query(`
        UPDATE notifications
        SET scheduled_at = $1, updated_at = $2
        WHERE id = $3
      `, [scheduledAt, new Date(), notificationId]);
    } catch (error) {
      logger.error('Error updating notification schedule:', error);
      throw error;
    }
  }

  async updateNotificationChannels(notificationId, channels) {
    try {
      await pool.query(`
        UPDATE notifications
        SET channels = $1, updated_at = $2
        WHERE id = $3
      `, [JSON.stringify(channels), new Date(), notificationId]);
    } catch (error) {
      logger.error('Error updating notification channels:', error);
      throw error;
    }
  }

  async updateNotificationContent(notificationId, personalizedContent) {
    try {
      await pool.query(`
        UPDATE notifications
        SET personalized_content = $1, updated_at = $2
        WHERE id = $3
      `, [JSON.stringify(personalizedContent), new Date(), notificationId]);
    } catch (error) {
      logger.error('Error updating notification content:', error);
      throw error;
    }
  }

  async updateNotificationRetryConfig(notificationId, retryConfig) {
    try {
      await pool.query(`
        UPDATE notifications
        SET retry_config = $1, updated_at = $2
        WHERE id = $3
      `, [JSON.stringify(retryConfig), new Date(), notificationId]);
    } catch (error) {
      logger.error('Error updating notification retry config:', error);
      throw error;
    }
  }

  async processAllQueues() {
    try {
      const queueNames = ['urgent', 'high', 'normal', 'low'];
      
      for (const queueName of queueNames) {
        await this.processDeliveryQueue(queueName);
      }
      
      logger.info('All delivery queues processed');
    } catch (error) {
      logger.error('Error processing all queues:', error);
    }
  }

  async processDeliveryQueue(queueName) {
    try {
      const queue = this.deliveryQueues.get(queueName) || [];
      const notifications = queue.splice(0, 10); // Process up to 10 notifications at a time
      
      for (const notification of notifications) {
        try {
          await this.processNotification(notification);
        } catch (error) {
          logger.error(`Error processing notification ${notification.id}:`, error);
        }
      }
      
      logger.debug(`Processed ${notifications.length} notifications from queue: ${queueName}`);
    } catch (error) {
      logger.error(`Error processing delivery queue ${queueName}:`, error);
    }
  }

  async processNotification(notification) {
    try {
      // This would integrate with actual notification processing
      logger.debug(`Processing notification: ${notification.id}`);
    } catch (error) {
      logger.error(`Error processing notification ${notification.id}:`, error);
    }
  }

  async optimizeAllDeliveries() {
    try {
      // Get notifications that need optimization
      const result = await pool.query(`
        SELECT * FROM notifications
        WHERE status = 'pending' AND scheduled_at <= NOW()
        ORDER BY priority DESC, created_at ASC
        LIMIT 100
      `);
      
      for (const notification of result.rows) {
        try {
          await this.optimizeDelivery(notification.id, 'timing', {}, 'system');
        } catch (error) {
          logger.error(`Error optimizing delivery for notification ${notification.id}:`, error);
        }
      }
      
      logger.info(`Optimized ${result.rows.length} deliveries`);
    } catch (error) {
      logger.error('Error optimizing all deliveries:', error);
    }
  }

  async getDeliveryStatus(notificationId, userId) {
    try {
      const result = await pool.query(`
        SELECT 
          n.*,
          do.status as optimization_status,
          do.result as optimization_result,
          do.error as optimization_error
        FROM notifications n
        LEFT JOIN delivery_optimizations do ON n.id = do.notification_id
        WHERE n.id = $1 AND n.created_by = $2
      `, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }
      
      const notification = result.rows[0];
      return {
        ...notification,
        recipients: notification.recipients ? JSON.parse(notification.recipients) : [],
        channels: notification.channels ? JSON.parse(notification.channels) : [],
        message: notification.message ? JSON.parse(notification.message) : {},
        metadata: notification.metadata ? JSON.parse(notification.metadata) : {},
        optimizationResult: notification.optimization_result ? JSON.parse(notification.optimization_result) : null
      };
    } catch (error) {
      logger.error('Error getting delivery status:', error);
      throw error;
    }
  }
}

module.exports = DeliveryOptimizer;
