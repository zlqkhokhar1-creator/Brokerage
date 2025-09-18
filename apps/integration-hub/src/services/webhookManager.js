const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class WebhookManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.webhooks = new Map();
    this.webhookQueue = [];
    this.retryQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load webhooks
      await this.loadWebhooks();
      
      // Start processing queues
      this.startQueueProcessing();
      
      this._initialized = true;
      logger.info('WebhookManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebhookManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('WebhookManager closed');
    } catch (error) {
      logger.error('Error closing WebhookManager:', error);
    }
  }

  async loadWebhooks() {
    try {
      const result = await pool.query(`
        SELECT * FROM webhooks
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const webhook of result.rows) {
        this.webhooks.set(webhook.id, {
          ...webhook,
          events: webhook.events ? JSON.parse(webhook.events) : [],
          headers: webhook.headers ? JSON.parse(webhook.headers) : {},
          config: webhook.config ? JSON.parse(webhook.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} webhooks`);
    } catch (error) {
      logger.error('Error loading webhooks:', error);
      throw error;
    }
  }

  startQueueProcessing() {
    // Process webhook queue every 5 seconds
    setInterval(() => {
      this.processWebhookQueue();
    }, 5000);
    
    // Process retry queue every 30 seconds
    setInterval(() => {
      this.processRetryQueue();
    }, 30000);
  }

  async createWebhook(name, url, events, secret, headers, createdBy) {
    try {
      const webhookId = nanoid();
      const webhook = {
        id: webhookId,
        name,
        url,
        events: events || [],
        secret: secret || this.generateSecret(),
        headers: headers || {},
        config: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        },
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO webhooks (id, name, url, events, secret, headers, config, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        webhookId, name, url, JSON.stringify(events), webhook.secret,
        JSON.stringify(headers), JSON.stringify(webhook.config), true, createdBy,
        webhook.created_at, webhook.updated_at
      ]);
      
      // Store in memory
      this.webhooks.set(webhookId, webhook);
      
      // Store in Redis
      await this.redis.setex(
        `webhook:${webhookId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(webhook)
      );
      
      logger.info(`Webhook created: ${webhookId}`, { name, url, events: events.length });
      
      // Emit event
      this.emit('webhookCreated', webhook);
      
      return webhook;
    } catch (error) {
      logger.error('Error creating webhook:', error);
      throw error;
    }
  }

  async getWebhook(webhookId, userId) {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) {
        return null;
      }
      
      // Check if user has access to this webhook
      if (webhook.created_by !== userId) {
        throw new Error('Access denied');
      }
      
      return webhook;
    } catch (error) {
      logger.error('Error getting webhook:', error);
      throw error;
    }
  }

  async updateWebhook(webhookId, updates, updatedBy) {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }
      
      // Update webhook
      Object.assign(webhook, updates, {
        updated_by: updatedBy,
        updated_at: new Date()
      });
      
      // Update database
      await pool.query(`
        UPDATE webhooks
        SET name = $1, url = $2, events = $3, secret = $4, headers = $5, config = $6,
            is_active = $7, updated_by = $8, updated_at = $9
        WHERE id = $10
      `, [
        webhook.name, webhook.url, JSON.stringify(webhook.events), webhook.secret,
        JSON.stringify(webhook.headers), JSON.stringify(webhook.config), webhook.is_active,
        updatedBy, webhook.updated_at, webhookId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `webhook:${webhookId}`,
        24 * 60 * 60,
        JSON.stringify(webhook)
      );
      
      logger.info(`Webhook updated: ${webhookId}`, { updatedBy, updates: Object.keys(updates) });
      
      // Emit event
      this.emit('webhookUpdated', webhook);
      
      return webhook;
    } catch (error) {
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId, deletedBy) {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }
      
      // Soft delete
      webhook.is_active = false;
      webhook.deleted_by = deletedBy;
      webhook.deleted_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE webhooks
        SET is_active = false, deleted_by = $1, deleted_at = $2, updated_at = $3
        WHERE id = $4
      `, [deletedBy, webhook.deleted_at, new Date(), webhookId]);
      
      // Remove from memory
      this.webhooks.delete(webhookId);
      
      // Remove from Redis
      await this.redis.del(`webhook:${webhookId}`);
      
      logger.info(`Webhook deleted: ${webhookId}`, { deletedBy });
      
      // Emit event
      this.emit('webhookDeleted', webhook);
      
      return true;
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }

  async triggerWebhook(eventType, data, source = null) {
    try {
      const matchingWebhooks = Array.from(this.webhooks.values()).filter(webhook => 
        webhook.is_active && webhook.events.includes(eventType)
      );
      
      if (matchingWebhooks.length === 0) {
        logger.info(`No webhooks found for event: ${eventType}`);
        return;
      }
      
      for (const webhook of matchingWebhooks) {
        await this.queueWebhook(webhook, eventType, data, source);
      }
      
      logger.info(`Webhooks triggered for event: ${eventType}`, {
        webhookCount: matchingWebhooks.length
      });
    } catch (error) {
      logger.error('Error triggering webhook:', error);
    }
  }

  async queueWebhook(webhook, eventType, data, source) {
    try {
      const webhookPayload = {
        id: nanoid(),
        webhook_id: webhook.id,
        event_type: eventType,
        data: data,
        source: source,
        timestamp: new Date(),
        retry_count: 0,
        status: 'pending'
      };
      
      // Add to queue
      this.webhookQueue.push(webhookPayload);
      
      // Store in database
      await pool.query(`
        INSERT INTO webhook_deliveries (id, webhook_id, event_type, data, source, timestamp, retry_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        webhookPayload.id, webhook.id, eventType, JSON.stringify(data),
        source, webhookPayload.timestamp, 0, 'pending'
      ]);
      
      // Store in Redis
      await this.redis.setex(
        `webhook_delivery:${webhookPayload.id}`,
        24 * 60 * 60,
        JSON.stringify(webhookPayload)
      );
      
      logger.info(`Webhook queued: ${webhookPayload.id}`, {
        webhookId: webhook.id,
        eventType
      });
    } catch (error) {
      logger.error('Error queuing webhook:', error);
    }
  }

  async processWebhookQueue() {
    try {
      if (this.webhookQueue.length === 0) {
        return;
      }
      
      const webhookPayload = this.webhookQueue.shift();
      await this.deliverWebhook(webhookPayload);
    } catch (error) {
      logger.error('Error processing webhook queue:', error);
    }
  }

  async deliverWebhook(webhookPayload) {
    try {
      const webhook = this.webhooks.get(webhookPayload.webhook_id);
      if (!webhook) {
        logger.warn(`Webhook not found: ${webhookPayload.webhook_id}`);
        return;
      }
      
      const payload = {
        event: webhookPayload.event_type,
        data: webhookPayload.data,
        timestamp: webhookPayload.timestamp,
        source: webhookPayload.source
      };
      
      // Generate signature
      const signature = this.generateSignature(webhook.secret, JSON.stringify(payload));
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Integration-Hub/1.0.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': webhookPayload.event_type,
        'X-Webhook-Delivery': webhookPayload.id,
        ...webhook.headers
      };
      
      // Make request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.config.timeout,
        validateStatus: () => true // Don't throw on HTTP error status
      });
      
      // Update delivery status
      await this.updateDeliveryStatus(webhookPayload.id, {
        status: response.status >= 200 && response.status < 300 ? 'delivered' : 'failed',
        response_status: response.status,
        response_headers: response.headers,
        response_body: response.data,
        delivered_at: new Date()
      });
      
      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook delivered successfully: ${webhookPayload.id}`, {
          webhookId: webhook.id,
          status: response.status
        });
        
        // Emit event
        this.emit('webhookDelivered', webhookPayload);
      } else {
        logger.warn(`Webhook delivery failed: ${webhookPayload.id}`, {
          webhookId: webhook.id,
          status: response.status,
          response: response.data
        });
        
        // Add to retry queue if retries remaining
        if (webhookPayload.retry_count < webhook.config.retries) {
          await this.addToRetryQueue(webhookPayload);
        } else {
          await this.updateDeliveryStatus(webhookPayload.id, {
            status: 'failed',
            failed_at: new Date()
          });
        }
      }
    } catch (error) {
      logger.error(`Error delivering webhook: ${webhookPayload.id}`, error);
      
      // Update delivery status
      await this.updateDeliveryStatus(webhookPayload.id, {
        status: 'failed',
        error: error.message,
        failed_at: new Date()
      });
      
      // Add to retry queue if retries remaining
      const webhook = this.webhooks.get(webhookPayload.webhook_id);
      if (webhook && webhookPayload.retry_count < webhook.config.retries) {
        await this.addToRetryQueue(webhookPayload);
      }
    }
  }

  async addToRetryQueue(webhookPayload) {
    try {
      webhookPayload.retry_count++;
      webhookPayload.retry_at = new Date(Date.now() + webhookPayload.retry_count * 1000);
      
      this.retryQueue.push(webhookPayload);
      
      // Update database
      await pool.query(`
        UPDATE webhook_deliveries
        SET retry_count = $1, retry_at = $2, status = $3
        WHERE id = $4
      `, [webhookPayload.retry_count, webhookPayload.retry_at, 'retrying', webhookPayload.id]);
      
      logger.info(`Webhook added to retry queue: ${webhookPayload.id}`, {
        retryCount: webhookPayload.retry_count
      });
    } catch (error) {
      logger.error('Error adding to retry queue:', error);
    }
  }

  async processRetryQueue() {
    try {
      if (this.retryQueue.length === 0) {
        return;
      }
      
      const now = new Date();
      const readyWebhooks = this.retryQueue.filter(w => w.retry_at <= now);
      
      for (const webhookPayload of readyWebhooks) {
        const index = this.retryQueue.indexOf(webhookPayload);
        this.retryQueue.splice(index, 1);
        await this.deliverWebhook(webhookPayload);
      }
    } catch (error) {
      logger.error('Error processing retry queue:', error);
    }
  }

  async updateDeliveryStatus(deliveryId, updates) {
    try {
      // Update database
      await pool.query(`
        UPDATE webhook_deliveries
        SET status = $1, response_status = $2, response_headers = $3, response_body = $4,
            delivered_at = $5, failed_at = $6, error = $7, updated_at = $8
        WHERE id = $9
      `, [
        updates.status, updates.response_status, JSON.stringify(updates.response_headers),
        JSON.stringify(updates.response_body), updates.delivered_at, updates.failed_at,
        updates.error, new Date(), deliveryId
      ]);
    } catch (error) {
      logger.error('Error updating delivery status:', error);
    }
  }

  async testWebhook(webhookId, testData, userId) {
    try {
      const webhook = await this.getWebhook(webhookId, userId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }
      
      const testPayload = {
        id: nanoid(),
        webhook_id: webhook.id,
        event_type: 'test',
        data: testData,
        source: 'test',
        timestamp: new Date(),
        retry_count: 0,
        status: 'pending'
      };
      
      // Test delivery
      await this.deliverWebhook(testPayload);
      
      return {
        success: true,
        message: 'Test webhook sent successfully',
        deliveryId: testPayload.id
      };
    } catch (error) {
      logger.error('Error testing webhook:', error);
      throw error;
    }
  }

  async processPendingWebhooks() {
    try {
      // Get pending webhooks from database
      const result = await pool.query(`
        SELECT * FROM webhook_deliveries
        WHERE status = 'pending' OR status = 'retrying'
        ORDER BY timestamp ASC
        LIMIT 100
      `);
      
      for (const delivery of result.rows) {
        const webhookPayload = {
          id: delivery.id,
          webhook_id: delivery.webhook_id,
          event_type: delivery.event_type,
          data: JSON.parse(delivery.data),
          source: delivery.source,
          timestamp: delivery.timestamp,
          retry_count: delivery.retry_count,
          status: delivery.status
        };
        
        await this.deliverWebhook(webhookPayload);
      }
    } catch (error) {
      logger.error('Error processing pending webhooks:', error);
    }
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateSignature(secret, payload) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  async getWebhookStats() {
    try {
      const stats = {
        totalWebhooks: this.webhooks.size,
        activeWebhooks: Array.from(this.webhooks.values()).filter(w => w.is_active).length,
        queueSize: this.webhookQueue.length,
        retryQueueSize: this.retryQueue.length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      throw error;
    }
  }
}

module.exports = WebhookManager;
