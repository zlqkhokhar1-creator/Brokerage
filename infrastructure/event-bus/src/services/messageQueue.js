const logger = require('../utils/logger');
const redis = require('./redis');
const database = require('./database');
const { v4: uuidv4 } = require('uuid');

class MessageQueue {
  constructor() {
    this.queues = new Map();
    this.consumers = new Map();
  }

  async sendMessage(queueName, message, priority = 'normal', delay = 0) {
    try {
      const queueMessage = {
        id: uuidv4(),
        queueName,
        message,
        priority,
        delay,
        status: 'pending',
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + delay * 1000)
      };

      // Store message in database
      await this.storeMessage(queueMessage);

      // Add to Redis queue
      await this.addToQueue(queueName, queueMessage);

      logger.info('Message sent to queue:', { queueName, messageId: queueMessage.id, priority });

      return {
        success: true,
        messageId: queueMessage.id,
        message: 'Message sent to queue successfully'
      };
    } catch (error) {
      logger.error('Error sending message to queue:', error);
      throw error;
    }
  }

  async getMessages(queueName, limit = 10, offset = 0) {
    try {
      const query = `
        SELECT * FROM queue_messages 
        WHERE queue_name = $1 
        ORDER BY priority DESC, created_at ASC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await database.query(query, [queueName, limit, offset]);
      
      return result.rows.map(row => ({
        id: row.id,
        queueName: row.queue_name,
        message: JSON.parse(row.message),
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        processedAt: row.processed_at
      }));
    } catch (error) {
      logger.error('Error getting messages from queue:', error);
      throw error;
    }
  }

  async consumeMessage(queueName, consumerId, timeout = 30000) {
    try {
      // Get next message from queue
      const message = await this.getNextMessage(queueName);
      
      if (!message) {
        return null;
      }

      // Mark message as being processed
      await this.markMessageAsProcessing(message.id, consumerId);

      logger.info('Message consumed:', { queueName, messageId: message.id, consumerId });

      return message;
    } catch (error) {
      logger.error('Error consuming message from queue:', error);
      throw error;
    }
  }

  async acknowledgeMessage(messageId, consumerId, success = true) {
    try {
      const status = success ? 'completed' : 'failed';
      await this.updateMessageStatus(messageId, status, consumerId);

      logger.info('Message acknowledged:', { messageId, consumerId, success });

      return {
        success: true,
        message: 'Message acknowledged successfully'
      };
    } catch (error) {
      logger.error('Error acknowledging message:', error);
      throw error;
    }
  }

  async registerConsumer(queueName, consumerId, callbackUrl) {
    try {
      const consumer = {
        id: consumerId,
        queueName,
        callbackUrl,
        isActive: true,
        lastHeartbeat: new Date(),
        createdAt: new Date()
      };

      // Store consumer in database
      await this.storeConsumer(consumer);

      // Add to in-memory consumers
      if (!this.consumers.has(queueName)) {
        this.consumers.set(queueName, new Map());
      }
      this.consumers.get(queueName).set(consumerId, consumer);

      logger.info('Consumer registered:', { queueName, consumerId });

      return {
        success: true,
        message: 'Consumer registered successfully'
      };
    } catch (error) {
      logger.error('Error registering consumer:', error);
      throw error;
    }
  }

  async unregisterConsumer(queueName, consumerId) {
    try {
      // Remove from in-memory consumers
      if (this.consumers.has(queueName)) {
        this.consumers.get(queueName).delete(consumerId);
      }

      // Update consumer status in database
      await this.updateConsumerStatus(consumerId, false);

      logger.info('Consumer unregistered:', { queueName, consumerId });

      return {
        success: true,
        message: 'Consumer unregistered successfully'
      };
    } catch (error) {
      logger.error('Error unregistering consumer:', error);
      throw error;
    }
  }

  async getNextMessage(queueName) {
    try {
      // Try to get message from Redis first
      const redisMessage = await redis.get(`queue:${queueName}:next`);
      if (redisMessage) {
        return redisMessage;
      }

      // Fallback to database
      const query = `
        SELECT * FROM queue_messages 
        WHERE queue_name = $1 
        AND status = 'pending' 
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `;
      
      const result = await database.query(query, [queueName]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        queueName: row.queue_name,
        message: JSON.parse(row.message),
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        scheduledFor: row.scheduled_for
      };
    } catch (error) {
      logger.error('Error getting next message from queue:', error);
      throw error;
    }
  }

  async addToQueue(queueName, message) {
    try {
      // Add to Redis queue
      await redis.set(`queue:${queueName}:${message.id}`, message, 3600);
      
      // Add to priority queue
      const priority = this.getPriorityValue(message.priority);
      await redis.zadd(`queue:${queueName}:priority`, priority, message.id);
    } catch (error) {
      logger.error('Error adding message to queue:', error);
      throw error;
    }
  }

  getPriorityValue(priority) {
    const priorities = {
      'low': 1,
      'normal': 2,
      'high': 3,
      'urgent': 4
    };
    return priorities[priority] || 2;
  }

  async markMessageAsProcessing(messageId, consumerId) {
    try {
      const query = `
        UPDATE queue_messages 
        SET status = 'processing', consumer_id = $2, processing_started_at = NOW()
        WHERE id = $1
      `;
      
      await database.query(query, [messageId, consumerId]);
    } catch (error) {
      logger.error('Error marking message as processing:', error);
      throw error;
    }
  }

  async updateMessageStatus(messageId, status, consumerId) {
    try {
      const query = `
        UPDATE queue_messages 
        SET status = $2, consumer_id = $3, processed_at = NOW()
        WHERE id = $1
      `;
      
      await database.query(query, [messageId, status, consumerId]);
    } catch (error) {
      logger.error('Error updating message status:', error);
      throw error;
    }
  }

  async storeMessage(message) {
    try {
      const query = `
        INSERT INTO queue_messages (
          id, queue_name, message, priority, delay, status, created_at, scheduled_for
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await database.query(query, [
        message.id,
        message.queueName,
        JSON.stringify(message.message),
        message.priority,
        message.delay,
        message.status,
        message.createdAt,
        message.scheduledFor
      ]);
    } catch (error) {
      logger.error('Error storing message:', error);
      throw error;
    }
  }

  async storeConsumer(consumer) {
    try {
      const query = `
        INSERT INTO queue_consumers (
          id, queue_name, callback_url, is_active, last_heartbeat, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await database.query(query, [
        consumer.id,
        consumer.queueName,
        consumer.callbackUrl,
        consumer.isActive,
        consumer.lastHeartbeat,
        consumer.createdAt
      ]);
    } catch (error) {
      logger.error('Error storing consumer:', error);
      throw error;
    }
  }

  async updateConsumerStatus(consumerId, isActive) {
    try {
      const query = `
        UPDATE queue_consumers 
        SET is_active = $2, last_heartbeat = NOW()
        WHERE id = $1
      `;
      
      await database.query(query, [consumerId, isActive]);
    } catch (error) {
      logger.error('Error updating consumer status:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Check database connection
      await database.query('SELECT 1');
      
      // Check Redis connection
      await redis.healthCheck();
      
      return { status: 'healthy', service: 'message-queue' };
    } catch (error) {
      logger.error('Message queue health check failed:', error);
      return { status: 'unhealthy', service: 'message-queue', error: error.message };
    }
  }

  async close() {
    try {
      await database.close();
      await redis.close();
      logger.info('Message queue closed gracefully');
    } catch (error) {
      logger.error('Error closing message queue:', error);
    }
  }
}

module.exports = new MessageQueue();

