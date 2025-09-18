const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class NotificationEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.notifications = new Map();
    this.deliveryQueues = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load active notifications
      await this.loadActiveNotifications();
      
      this._initialized = true;
      logger.info('NotificationEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NotificationEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('NotificationEngine closed');
    } catch (error) {
      logger.error('Error closing NotificationEngine:', error);
    }
  }

  async loadActiveNotifications() {
    try {
      const result = await pool.query(`
        SELECT * FROM notifications
        WHERE status IN ('pending', 'processing', 'scheduled')
        ORDER BY created_at ASC
      `);
      
      for (const notification of result.rows) {
        this.notifications.set(notification.id, {
          ...notification,
          recipients: notification.recipients ? JSON.parse(notification.recipients) : [],
          channels: notification.channels ? JSON.parse(notification.channels) : [],
          message: notification.message ? JSON.parse(notification.message) : {},
          metadata: notification.metadata ? JSON.parse(notification.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} active notifications`);
    } catch (error) {
      logger.error('Error loading active notifications:', error);
      throw error;
    }
  }

  async sendNotification(recipients, message, channels, priority, schedule, userId) {
    try {
      const notificationId = nanoid();
      const now = new Date();
      
      // Create notification
      const notification = {
        id: notificationId,
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        message: typeof message === 'string' ? { text: message } : message,
        channels: Array.isArray(channels) ? channels : [channels],
        priority: priority || 'normal',
        status: 'pending',
        scheduled_at: schedule ? new Date(schedule) : now,
        created_by: userId,
        created_at: now,
        updated_at: now,
        metadata: {}
      };
      
      // Store notification
      await this.storeNotification(notification);
      
      // Add to delivery queue
      await this.addToDeliveryQueue(notification);
      
      // Cache notification
      this.notifications.set(notificationId, notification);
      
      // Emit event
      this.emit('notificationCreated', notification);
      
      logger.info(`Notification created: ${notificationId}`, {
        recipients: notification.recipients.length,
        channels: notification.channels.length,
        priority: notification.priority
      });
      
      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  async getNotification(notificationId, userId) {
    try {
      // Check cache first
      if (this.notifications.has(notificationId)) {
        return this.notifications.get(notificationId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM notifications
        WHERE id = $1 AND created_by = $2
      `, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }
      
      const notification = {
        ...result.rows[0],
        recipients: result.rows[0].recipients ? JSON.parse(result.rows[0].recipients) : [],
        channels: result.rows[0].channels ? JSON.parse(result.rows[0].channels) : [],
        message: result.rows[0].message ? JSON.parse(result.rows[0].message) : {},
        metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : {}
      };
      
      // Cache notification
      this.notifications.set(notificationId, notification);
      
      return notification;
    } catch (error) {
      logger.error('Error getting notification:', error);
      throw error;
    }
  }

  async getNotifications(userId, status, channel, limit) {
    try {
      let query = `
        SELECT * FROM notifications
        WHERE created_by = $1
      `;
      const params = [userId];
      let paramCount = 2;
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (channel) {
        query += ` AND channels::text LIKE $${paramCount}`;
        params.push(`%"${channel}"%`);
        paramCount++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        recipients: row.recipients ? JSON.parse(row.recipients) : [],
        channels: row.channels ? JSON.parse(row.channels) : [],
        message: row.message ? JSON.parse(row.message) : {},
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  async updateNotificationStatus(notificationId, status, metadata = {}) {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      // Update notification
      const updatedNotification = {
        ...notification,
        status,
        metadata: { ...notification.metadata, ...metadata },
        updated_at: new Date()
      };
      
      // Update database
      await pool.query(`
        UPDATE notifications
        SET status = $1, metadata = $2, updated_at = $3
        WHERE id = $4
      `, [status, JSON.stringify(updatedNotification.metadata), updatedNotification.updated_at, notificationId]);
      
      // Update cache
      this.notifications.set(notificationId, updatedNotification);
      
      // Emit event
      this.emit('notificationStatusUpdated', updatedNotification);
      
      logger.info(`Notification status updated: ${notificationId}`, { status });
      
      return updatedNotification;
    } catch (error) {
      logger.error('Error updating notification status:', error);
      throw error;
    }
  }

  async storeNotification(notification) {
    try {
      await pool.query(`
        INSERT INTO notifications (
          id, recipients, message, channels, priority, status, 
          scheduled_at, created_by, created_at, updated_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        notification.id,
        JSON.stringify(notification.recipients),
        JSON.stringify(notification.message),
        JSON.stringify(notification.channels),
        notification.priority,
        notification.status,
        notification.scheduled_at,
        notification.created_by,
        notification.created_at,
        notification.updated_at,
        JSON.stringify(notification.metadata)
      ]);
    } catch (error) {
      logger.error('Error storing notification:', error);
      throw error;
    }
  }

  async addToDeliveryQueue(notification) {
    try {
      const queueName = this.getQueueName(notification.priority);
      
      if (!this.deliveryQueues.has(queueName)) {
        this.deliveryQueues.set(queueName, []);
      }
      
      this.deliveryQueues.get(queueName).push(notification);
      
      // Store in Redis for persistence
      await this.redis.lpush(`notification_queue:${queueName}`, JSON.stringify(notification));
      
      logger.debug(`Notification added to queue: ${queueName}`, {
        notificationId: notification.id,
        priority: notification.priority
      });
    } catch (error) {
      logger.error('Error adding to delivery queue:', error);
      throw error;
    }
  }

  getQueueName(priority) {
    switch (priority) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      case 'normal':
        return 'normal';
      case 'low':
        return 'low';
      default:
        return 'normal';
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
          // Move to failed queue or retry
          await this.handleNotificationError(notification, error);
        }
      }
      
      logger.debug(`Processed ${notifications.length} notifications from queue: ${queueName}`);
    } catch (error) {
      logger.error(`Error processing delivery queue ${queueName}:`, error);
    }
  }

  async processNotification(notification) {
    try {
      // Update status to processing
      await this.updateNotificationStatus(notification.id, 'processing');
      
      // Process each channel
      for (const channel of notification.channels) {
        try {
          await this.deliverToChannel(notification, channel);
        } catch (error) {
          logger.error(`Error delivering to channel ${channel}:`, error);
          // Continue with other channels
        }
      }
      
      // Update status to completed
      await this.updateNotificationStatus(notification.id, 'completed', {
        completed_at: new Date().toISOString()
      });
      
      // Emit event
      this.emit('notificationDelivered', notification);
      
      logger.info(`Notification delivered: ${notification.id}`);
    } catch (error) {
      logger.error(`Error processing notification ${notification.id}:`, error);
      throw error;
    }
  }

  async deliverToChannel(notification, channel) {
    try {
      // This would integrate with actual delivery services
      // For now, we'll simulate delivery
      const deliveryResult = {
        channel,
        status: 'delivered',
        delivered_at: new Date(),
        message_id: nanoid()
      };
      
      // Store delivery result
      await this.storeDeliveryResult(notification.id, deliveryResult);
      
      logger.debug(`Notification delivered to ${channel}`, {
        notificationId: notification.id,
        channel
      });
    } catch (error) {
      logger.error(`Error delivering to channel ${channel}:`, error);
      throw error;
    }
  }

  async storeDeliveryResult(notificationId, deliveryResult) {
    try {
      await pool.query(`
        INSERT INTO notification_deliveries (
          id, notification_id, channel, status, delivered_at, message_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        nanoid(),
        notificationId,
        deliveryResult.channel,
        deliveryResult.status,
        deliveryResult.delivered_at,
        deliveryResult.message_id
      ]);
    } catch (error) {
      logger.error('Error storing delivery result:', error);
      throw error;
    }
  }

  async handleNotificationError(notification, error) {
    try {
      // Update status to failed
      await this.updateNotificationStatus(notification.id, 'failed', {
        error: error.message,
        failed_at: new Date().toISOString()
      });
      
      // Emit event
      this.emit('notificationFailed', { notification, error });
      
      logger.error(`Notification failed: ${notification.id}`, error);
    } catch (updateError) {
      logger.error('Error handling notification error:', updateError);
    }
  }

  async getNotificationStats() {
    try {
      const stats = {
        totalNotifications: this.notifications.size,
        pendingNotifications: Array.from(this.notifications.values()).filter(n => n.status === 'pending').length,
        processingNotifications: Array.from(this.notifications.values()).filter(n => n.status === 'processing').length,
        completedNotifications: Array.from(this.notifications.values()).filter(n => n.status === 'completed').length,
        failedNotifications: Array.from(this.notifications.values()).filter(n => n.status === 'failed').length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }

  async getDeliveryStats(notificationId) {
    try {
      const result = await pool.query(`
        SELECT 
          channel,
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))) as avg_delivery_time
        FROM notification_deliveries
        WHERE notification_id = $1
        GROUP BY channel, status
      `, [notificationId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting delivery stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationEngine;
