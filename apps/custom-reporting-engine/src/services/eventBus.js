const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.subscribers = new Map();
    this.eventTypes = new Map();
    this.eventHistory = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load event types
      await this.loadEventTypes();
      
      // Start event processing
      this.startEventProcessing();
      
      this._initialized = true;
      logger.info('EventBus initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EventBus:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('EventBus closed');
    } catch (error) {
      logger.error('Error closing EventBus:', error);
    }
  }

  async loadEventTypes() {
    try {
      this.eventTypes = new Map([
        ['report_created', {
          name: 'Report Created',
          description: 'Triggered when a new report is created',
          category: 'reports',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['report_updated', {
          name: 'Report Updated',
          description: 'Triggered when a report is updated',
          category: 'reports',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['report_deleted', {
          name: 'Report Deleted',
          description: 'Triggered when a report is deleted',
          category: 'reports',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['report_shared', {
          name: 'Report Shared',
          description: 'Triggered when a report is shared',
          category: 'reports',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['report_exported', {
          name: 'Report Exported',
          description: 'Triggered when a report is exported',
          category: 'reports',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['dashboard_created', {
          name: 'Dashboard Created',
          description: 'Triggered when a new dashboard is created',
          category: 'dashboards',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['dashboard_updated', {
          name: 'Dashboard Updated',
          description: 'Triggered when a dashboard is updated',
          category: 'dashboards',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['dashboard_deleted', {
          name: 'Dashboard Deleted',
          description: 'Triggered when a dashboard is deleted',
          category: 'dashboards',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['dashboard_shared', {
          name: 'Dashboard Shared',
          description: 'Triggered when a dashboard is shared',
          category: 'dashboards',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['template_created', {
          name: 'Template Created',
          description: 'Triggered when a new template is created',
          category: 'templates',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['template_updated', {
          name: 'Template Updated',
          description: 'Triggered when a template is updated',
          category: 'templates',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['template_deleted', {
          name: 'Template Deleted',
          description: 'Triggered when a template is deleted',
          category: 'templates',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['schedule_created', {
          name: 'Schedule Created',
          description: 'Triggered when a new schedule is created',
          category: 'schedules',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['schedule_updated', {
          name: 'Schedule Updated',
          description: 'Triggered when a schedule is updated',
          category: 'schedules',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['schedule_deleted', {
          name: 'Schedule Deleted',
          description: 'Triggered when a schedule is deleted',
          category: 'schedules',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }],
        ['export_created', {
          name: 'Export Created',
          description: 'Triggered when a new export is created',
          category: 'exports',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['export_downloaded', {
          name: 'Export Downloaded',
          description: 'Triggered when an export is downloaded',
          category: 'exports',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['user_login', {
          name: 'User Login',
          description: 'Triggered when a user logs in',
          category: 'authentication',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['user_logout', {
          name: 'User Logout',
          description: 'Triggered when a user logs out',
          category: 'authentication',
          priority: 'low',
          retryable: true,
          maxRetries: 3
        }],
        ['permission_granted', {
          name: 'Permission Granted',
          description: 'Triggered when a permission is granted',
          category: 'permissions',
          priority: 'high',
          retryable: true,
          maxRetries: 3
        }],
        ['permission_revoked', {
          name: 'Permission Revoked',
          description: 'Triggered when a permission is revoked',
          category: 'permissions',
          priority: 'high',
          retryable: true,
          maxRetries: 3
        }],
        ['system_error', {
          name: 'System Error',
          description: 'Triggered when a system error occurs',
          category: 'system',
          priority: 'critical',
          retryable: true,
          maxRetries: 5
        }],
        ['security_alert', {
          name: 'Security Alert',
          description: 'Triggered when a security alert is generated',
          category: 'security',
          priority: 'critical',
          retryable: true,
          maxRetries: 5
        }],
        ['performance_alert', {
          name: 'Performance Alert',
          description: 'Triggered when a performance alert is generated',
          category: 'performance',
          priority: 'high',
          retryable: true,
          maxRetries: 3
        }],
        ['configuration_changed', {
          name: 'Configuration Changed',
          description: 'Triggered when a configuration is changed',
          category: 'system',
          priority: 'medium',
          retryable: true,
          maxRetries: 3
        }]
      ]);
      
      logger.info('Event types loaded successfully');
    } catch (error) {
      logger.error('Error loading event types:', error);
      throw error;
    }
  }

  startEventProcessing() {
    // Process events every second
    setInterval(async () => {
      try {
        await this.processEvents();
      } catch (error) {
        logger.error('Error processing events:', error);
      }
    }, 1000);
  }

  async emitEvent(eventType, data, metadata = {}) {
    try {
      const eventId = nanoid();
      const timestamp = new Date().toISOString();
      
      const event = {
        id: eventId,
        type: eventType,
        data: data,
        metadata: metadata,
        timestamp: timestamp,
        status: 'pending',
        retryCount: 0
      };
      
      // Store event
      await this.storeEvent(event);
      
      // Publish to Redis
      await this.publishEvent(event);
      
      // Add to history
      this.eventHistory.push(event);
      
      // Keep only recent events in memory
      if (this.eventHistory.length > 1000) {
        this.eventHistory = this.eventHistory.slice(-1000);
      }
      
      this.emit('eventEmitted', event);
      
      logger.info(`Event emitted: ${eventType}`, { eventId });
      
      return event;
    } catch (error) {
      logger.error('Error emitting event:', error);
      throw error;
    }
  }

  async subscribe(eventType, subscriber, handler) {
    try {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Map());
      }
      
      const subscriberId = nanoid();
      this.subscribers.get(eventType).set(subscriberId, {
        id: subscriberId,
        subscriber: subscriber,
        handler: handler,
        createdAt: new Date().toISOString()
      });
      
      logger.info(`Subscriber added: ${subscriber} for event ${eventType}`, { subscriberId });
      
      return subscriberId;
    } catch (error) {
      logger.error('Error subscribing to event:', error);
      throw error;
    }
  }

  async unsubscribe(eventType, subscriberId) {
    try {
      if (this.subscribers.has(eventType)) {
        this.subscribers.get(eventType).delete(subscriberId);
        logger.info(`Subscriber removed: ${subscriberId} for event ${eventType}`);
      }
    } catch (error) {
      logger.error('Error unsubscribing from event:', error);
      throw error;
    }
  }

  async processEvents() {
    try {
      // Get pending events from Redis
      const events = await this.getPendingEvents();
      
      for (const event of events) {
        try {
          await this.processEvent(event);
        } catch (error) {
          logger.error(`Error processing event ${event.id}:`, error);
          await this.handleEventError(event, error);
        }
      }
    } catch (error) {
      logger.error('Error processing events:', error);
      throw error;
    }
  }

  async processEvent(event) {
    try {
      const eventType = this.eventTypes.get(event.type);
      if (!eventType) {
        throw new Error(`Unknown event type: ${event.type}`);
      }
      
      // Get subscribers for this event type
      const subscribers = this.subscribers.get(event.type) || new Map();
      
      if (subscribers.size === 0) {
        logger.debug(`No subscribers for event type: ${event.type}`);
        return;
      }
      
      // Process event for each subscriber
      const promises = [];
      for (const [subscriberId, subscriber] of subscribers.entries()) {
        promises.push(this.processEventForSubscriber(event, subscriber));
      }
      
      await Promise.allSettled(promises);
      
      // Update event status
      await this.updateEventStatus(event.id, 'processed');
      
      logger.debug(`Event processed: ${event.id}`);
    } catch (error) {
      logger.error(`Error processing event ${event.id}:`, error);
      throw error;
    }
  }

  async processEventForSubscriber(event, subscriber) {
    try {
      const startTime = Date.now();
      
      // Call subscriber handler
      await subscriber.handler(event);
      
      const duration = Date.now() - startTime;
      
      logger.debug(`Event processed for subscriber: ${subscriber.id}`, {
        eventId: event.id,
        duration: duration
      });
    } catch (error) {
      logger.error(`Error processing event for subscriber ${subscriber.id}:`, error);
      throw error;
    }
  }

  async handleEventError(event, error) {
    try {
      const eventType = this.eventTypes.get(event.type);
      if (!eventType) return;
      
      event.retryCount = (event.retryCount || 0) + 1;
      
      if (event.retryCount >= eventType.maxRetries) {
        // Max retries exceeded, mark as failed
        await this.updateEventStatus(event.id, 'failed', error.message);
        logger.error(`Event failed after ${event.retryCount} retries: ${event.id}`, {
          error: error.message
        });
      } else {
        // Retry event
        await this.updateEventStatus(event.id, 'pending');
        await this.publishEvent(event);
        logger.warn(`Event retry ${event.retryCount}/${eventType.maxRetries}: ${event.id}`);
      }
    } catch (error) {
      logger.error('Error handling event error:', error);
      throw error;
    }
  }

  async publishEvent(event) {
    try {
      const channel = `events:${event.type}`;
      await this.redis.publish(channel, JSON.stringify(event));
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  async getPendingEvents() {
    try {
      const query = `
        SELECT * FROM events 
        WHERE status = 'pending' 
        ORDER BY timestamp ASC 
        LIMIT 100
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        data: row.data,
        metadata: row.metadata,
        timestamp: row.timestamp,
        status: row.status,
        retryCount: row.retry_count
      }));
    } catch (error) {
      logger.error('Error getting pending events:', error);
      throw error;
    }
  }

  async storeEvent(event) {
    try {
      const query = `
        INSERT INTO events (
          id, type, data, metadata, timestamp, status, retry_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        event.id,
        event.type,
        JSON.stringify(event.data),
        JSON.stringify(event.metadata),
        event.timestamp,
        event.status,
        event.retryCount
      ]);
    } catch (error) {
      logger.error('Error storing event:', error);
      throw error;
    }
  }

  async updateEventStatus(eventId, status, error = null) {
    try {
      const query = `
        UPDATE events 
        SET status = $1, error = $2, updated_at = $3
        WHERE id = $4
      `;
      
      await pool.query(query, [
        status,
        error,
        new Date().toISOString(),
        eventId
      ]);
    } catch (error) {
      logger.error('Error updating event status:', error);
      throw error;
    }
  }

  async getEventHistory(eventType = null, limit = 100) {
    try {
      let query = 'SELECT * FROM events WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      if (eventType) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(eventType);
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        data: row.data,
        metadata: row.metadata,
        timestamp: row.timestamp,
        status: row.status,
        retryCount: row.retry_count,
        error: row.error
      }));
    } catch (error) {
      logger.error('Error getting event history:', error);
      throw error;
    }
  }

  async getEventStats() {
    try {
      const query = `
        SELECT 
          type,
          status,
          COUNT(*) as count,
          AVG(retry_count) as avg_retries
        FROM events 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY type, status
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  async getEventTypes() {
    try {
      return Array.from(this.eventTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting event types:', error);
      throw error;
    }
  }

  async getSubscribers(eventType = null) {
    try {
      if (eventType) {
        const subscribers = this.subscribers.get(eventType) || new Map();
        return Array.from(subscribers.values());
      }
      
      const allSubscribers = {};
      for (const [type, subscribers] of this.subscribers.entries()) {
        allSubscribers[type] = Array.from(subscribers.values());
      }
      
      return allSubscribers;
    } catch (error) {
      logger.error('Error getting subscribers:', error);
      throw error;
    }
  }

  async clearEventHistory(olderThan = '7 days') {
    try {
      const query = `
        DELETE FROM events 
        WHERE timestamp < NOW() - INTERVAL '${olderThan}'
      `;
      
      const result = await pool.query(query);
      
      logger.info(`Cleared ${result.rowCount} old events`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error clearing event history:', error);
      throw error;
    }
  }

  async getEventMetrics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
          COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_events,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
          AVG(retry_count) as avg_retries
        FROM events 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting event metrics:', error);
      throw error;
    }
  }
}

module.exports = EventBus;
