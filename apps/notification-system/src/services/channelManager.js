const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ChannelManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.channels = new Map();
    this.channelProviders = new Map();
    this.deliveryStats = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load channels
      await this.loadChannels();
      
      // Load channel providers
      await this.loadChannelProviders();
      
      // Load delivery stats
      await this.loadDeliveryStats();
      
      this._initialized = true;
      logger.info('ChannelManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ChannelManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ChannelManager closed');
    } catch (error) {
      logger.error('Error closing ChannelManager:', error);
    }
  }

  async loadChannels() {
    try {
      const result = await pool.query(`
        SELECT * FROM notification_channels
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const channel of result.rows) {
        this.channels.set(channel.id, {
          ...channel,
          configuration: channel.configuration ? JSON.parse(channel.configuration) : {},
          metadata: channel.metadata ? JSON.parse(channel.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} notification channels`);
    } catch (error) {
      logger.error('Error loading channels:', error);
      throw error;
    }
  }

  async loadChannelProviders() {
    try {
      const result = await pool.query(`
        SELECT * FROM channel_providers
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const provider of result.rows) {
        this.channelProviders.set(provider.id, {
          ...provider,
          configuration: provider.configuration ? JSON.parse(provider.configuration) : {},
          credentials: provider.credentials ? JSON.parse(provider.credentials) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} channel providers`);
    } catch (error) {
      logger.error('Error loading channel providers:', error);
      throw error;
    }
  }

  async loadDeliveryStats() {
    try {
      const result = await pool.query(`
        SELECT 
          channel,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_delivery_time,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_response_time
        FROM notification_deliveries
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY channel
      `);
      
      for (const stat of result.rows) {
        this.deliveryStats.set(stat.channel, {
          ...stat,
          success_rate: stat.total_deliveries > 0 ? 
            (stat.successful_deliveries / stat.total_deliveries) * 100 : 0
        });
      }
      
      logger.info(`Loaded ${result.rows.length} delivery stats`);
    } catch (error) {
      logger.error('Error loading delivery stats:', error);
      throw error;
    }
  }

  async getChannels(userId) {
    try {
      const channels = Array.from(this.channels.values()).map(channel => ({
        ...channel,
        delivery_stats: this.deliveryStats.get(channel.type) || {
          total_deliveries: 0,
          successful_deliveries: 0,
          success_rate: 0,
          avg_delivery_time: 0,
          avg_response_time: 0
        }
      }));
      
      return channels;
    } catch (error) {
      logger.error('Error getting channels:', error);
      throw error;
    }
  }

  async testChannel(channelId, testData, userId) {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }
      
      const testResult = {
        id: nanoid(),
        channel_id: channelId,
        status: 'pending',
        test_data: testData,
        created_by: userId,
        created_at: new Date()
      };
      
      // Test channel based on type
      switch (channel.type) {
        case 'email':
          await this.testEmailChannel(channel, testData, testResult);
          break;
        case 'sms':
          await this.testSmsChannel(channel, testData, testResult);
          break;
        case 'push':
          await this.testPushChannel(channel, testData, testResult);
          break;
        case 'webhook':
          await this.testWebhookChannel(channel, testData, testResult);
          break;
        case 'in_app':
          await this.testInAppChannel(channel, testData, testResult);
          break;
        default:
          throw new Error(`Unknown channel type: ${channel.type}`);
      }
      
      // Store test result
      await this.storeTestResult(testResult);
      
      // Emit event
      this.emit('channelTested', testResult);
      
      logger.info(`Channel tested: ${channelId}`, {
        status: testResult.status,
        duration: testResult.duration
      });
      
      return testResult;
    } catch (error) {
      logger.error('Error testing channel:', error);
      throw error;
    }
  }

  async testEmailChannel(channel, testData, testResult) {
    try {
      const startTime = Date.now();
      
      // Simulate email channel test
      const { to, subject, body } = testData;
      
      if (!to || !subject || !body) {
        throw new Error('Missing required email test data');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error('Invalid email format');
      }
      
      // Simulate email sending
      await this.simulateEmailSending(channel, testData);
      
      testResult.status = 'success';
      testResult.duration = Date.now() - startTime;
      testResult.result = {
        message: 'Email test successful',
        recipient: to,
        subject: subject
      };
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.duration = Date.now() - testResult.created_at.getTime();
      testResult.error = error.message;
    }
  }

  async testSmsChannel(channel, testData, testResult) {
    try {
      const startTime = Date.now();
      
      // Simulate SMS channel test
      const { to, message } = testData;
      
      if (!to || !message) {
        throw new Error('Missing required SMS test data');
      }
      
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(to.replace(/\D/g, ''))) {
        throw new Error('Invalid phone number format');
      }
      
      // Simulate SMS sending
      await this.simulateSmsSending(channel, testData);
      
      testResult.status = 'success';
      testResult.duration = Date.now() - startTime;
      testResult.result = {
        message: 'SMS test successful',
        recipient: to,
        message_length: message.length
      };
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.duration = Date.now() - testResult.created_at.getTime();
      testResult.error = error.message;
    }
  }

  async testPushChannel(channel, testData, testResult) {
    try {
      const startTime = Date.now();
      
      // Simulate push notification channel test
      const { device_token, title, body } = testData;
      
      if (!device_token || !title || !body) {
        throw new Error('Missing required push notification test data');
      }
      
      // Validate device token format
      if (device_token.length < 10) {
        throw new Error('Invalid device token format');
      }
      
      // Simulate push notification sending
      await this.simulatePushSending(channel, testData);
      
      testResult.status = 'success';
      testResult.duration = Date.now() - startTime;
      testResult.result = {
        message: 'Push notification test successful',
        device_token: device_token.substring(0, 10) + '...',
        title: title
      };
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.duration = Date.now() - testResult.created_at.getTime();
      testResult.error = error.message;
    }
  }

  async testWebhookChannel(channel, testData, testResult) {
    try {
      const startTime = Date.now();
      
      // Simulate webhook channel test
      const { url, payload } = testData;
      
      if (!url || !payload) {
        throw new Error('Missing required webhook test data');
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch (error) {
        throw new Error('Invalid webhook URL format');
      }
      
      // Simulate webhook sending
      await this.simulateWebhookSending(channel, testData);
      
      testResult.status = 'success';
      testResult.duration = Date.now() - startTime;
      testResult.result = {
        message: 'Webhook test successful',
        url: url,
        payload_size: JSON.stringify(payload).length
      };
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.duration = Date.now() - testResult.created_at.getTime();
      testResult.error = error.message;
    }
  }

  async testInAppChannel(channel, testData, testResult) {
    try {
      const startTime = Date.now();
      
      // Simulate in-app notification channel test
      const { user_id, title, message } = testData;
      
      if (!user_id || !title || !message) {
        throw new Error('Missing required in-app notification test data');
      }
      
      // Simulate in-app notification sending
      await this.simulateInAppSending(channel, testData);
      
      testResult.status = 'success';
      testResult.duration = Date.now() - startTime;
      testResult.result = {
        message: 'In-app notification test successful',
        user_id: user_id,
        title: title
      };
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.duration = Date.now() - testResult.created_at.getTime();
      testResult.error = error.message;
    }
  }

  async simulateEmailSending(channel, testData) {
    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate potential failure
      if (Math.random() < 0.1) { // 10% failure rate
        throw new Error('Email service temporarily unavailable');
      }
      
      logger.debug(`Simulated email sending to ${testData.to}`);
    } catch (error) {
      logger.error('Error simulating email sending:', error);
      throw error;
    }
  }

  async simulateSmsSending(channel, testData) {
    try {
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate potential failure
      if (Math.random() < 0.05) { // 5% failure rate
        throw new Error('SMS service temporarily unavailable');
      }
      
      logger.debug(`Simulated SMS sending to ${testData.to}`);
    } catch (error) {
      logger.error('Error simulating SMS sending:', error);
      throw error;
    }
  }

  async simulatePushSending(channel, testData) {
    try {
      // Simulate push notification sending delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate potential failure
      if (Math.random() < 0.08) { // 8% failure rate
        throw new Error('Push notification service temporarily unavailable');
      }
      
      logger.debug(`Simulated push notification sending to ${testData.device_token.substring(0, 10)}...`);
    } catch (error) {
      logger.error('Error simulating push sending:', error);
      throw error;
    }
  }

  async simulateWebhookSending(channel, testData) {
    try {
      // Simulate webhook sending delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate potential failure
      if (Math.random() < 0.15) { // 15% failure rate
        throw new Error('Webhook endpoint not responding');
      }
      
      logger.debug(`Simulated webhook sending to ${testData.url}`);
    } catch (error) {
      logger.error('Error simulating webhook sending:', error);
      throw error;
    }
  }

  async simulateInAppSending(channel, testData) {
    try {
      // Simulate in-app notification sending delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate potential failure
      if (Math.random() < 0.02) { // 2% failure rate
        throw new Error('In-app notification service temporarily unavailable');
      }
      
      logger.debug(`Simulated in-app notification sending to user ${testData.user_id}`);
    } catch (error) {
      logger.error('Error simulating in-app sending:', error);
      throw error;
    }
  }

  async storeTestResult(testResult) {
    try {
      await pool.query(`
        INSERT INTO channel_test_results (
          id, channel_id, status, test_data, result, error, duration,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        testResult.id,
        testResult.channel_id,
        testResult.status,
        JSON.stringify(testResult.test_data),
        testResult.result ? JSON.stringify(testResult.result) : null,
        testResult.error,
        testResult.duration,
        testResult.created_by,
        testResult.created_at
      ]);
    } catch (error) {
      logger.error('Error storing test result:', error);
      throw error;
    }
  }

  async getChannelStats(channelId) {
    try {
      const stats = this.deliveryStats.get(channelId) || {
        total_deliveries: 0,
        successful_deliveries: 0,
        success_rate: 0,
        avg_delivery_time: 0,
        avg_response_time: 0
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting channel stats:', error);
      throw error;
    }
  }

  async getChannelPerformance(channelId, timeRange = '24h') {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          channel,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_delivery_time,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_response_time,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deliveries
        FROM notification_deliveries
        WHERE channel = $1 AND created_at >= $2
        GROUP BY channel
      `, [channelId, timeCondition]);
      
      if (result.rows.length === 0) {
        return {
          channel: channelId,
          total_deliveries: 0,
          successful_deliveries: 0,
          failed_deliveries: 0,
          success_rate: 0,
          avg_delivery_time: 0,
          avg_response_time: 0
        };
      }
      
      const stats = result.rows[0];
      return {
        ...stats,
        success_rate: stats.total_deliveries > 0 ? 
          (stats.successful_deliveries / stats.total_deliveries) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting channel performance:', error);
      throw error;
    }
  }

  async updateChannelConfiguration(channelId, configuration, userId) {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }
      
      // Update channel configuration
      const updatedChannel = {
        ...channel,
        configuration: { ...channel.configuration, ...configuration },
        updated_at: new Date()
      };
      
      // Update database
      await pool.query(`
        UPDATE notification_channels
        SET configuration = $1, updated_at = $2
        WHERE id = $3
      `, [JSON.stringify(updatedChannel.configuration), updatedChannel.updated_at, channelId]);
      
      // Update cache
      this.channels.set(channelId, updatedChannel);
      
      // Emit event
      this.emit('channelUpdated', updatedChannel);
      
      logger.info(`Channel configuration updated: ${channelId}`);
      
      return updatedChannel;
    } catch (error) {
      logger.error('Error updating channel configuration:', error);
      throw error;
    }
  }

  async createChannel(name, type, configuration, userId) {
    try {
      const channelId = nanoid();
      const now = new Date();
      
      const channel = {
        id: channelId,
        name,
        type,
        configuration: configuration || {},
        metadata: {},
        priority: 1,
        is_active: true,
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      
      // Store channel
      await pool.query(`
        INSERT INTO notification_channels (
          id, name, type, configuration, metadata, priority, is_active,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        channelId, name, type, JSON.stringify(configuration || {}),
        JSON.stringify({}), 1, true, userId, now, now
      ]);
      
      // Cache channel
      this.channels.set(channelId, channel);
      
      // Emit event
      this.emit('channelCreated', channel);
      
      logger.info(`Channel created: ${channelId}`, { name, type });
      
      return channel;
    } catch (error) {
      logger.error('Error creating channel:', error);
      throw error;
    }
  }

  async deleteChannel(channelId, userId) {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }
      
      // Soft delete
      await pool.query(`
        UPDATE notification_channels
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date(), channelId]);
      
      // Remove from cache
      this.channels.delete(channelId);
      
      // Emit event
      this.emit('channelDeleted', { channelId, deletedAt: new Date() });
      
      logger.info(`Channel deleted: ${channelId}`);
      
      return { success: true, channelId };
    } catch (error) {
      logger.error('Error deleting channel:', error);
      throw error;
    }
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  async getChannelHealth() {
    try {
      const health = {
        total_channels: this.channels.size,
        active_channels: Array.from(this.channels.values()).filter(c => c.is_active).length,
        channel_types: {},
        overall_health: 'healthy'
      };
      
      // Count channels by type
      for (const channel of this.channels.values()) {
        if (channel.is_active) {
          health.channel_types[channel.type] = (health.channel_types[channel.type] || 0) + 1;
        }
      }
      
      // Check overall health based on delivery stats
      const totalDeliveries = Array.from(this.deliveryStats.values())
        .reduce((sum, stat) => sum + stat.total_deliveries, 0);
      const totalSuccessful = Array.from(this.deliveryStats.values())
        .reduce((sum, stat) => sum + stat.successful_deliveries, 0);
      
      const overallSuccessRate = totalDeliveries > 0 ? (totalSuccessful / totalDeliveries) * 100 : 100;
      
      if (overallSuccessRate < 80) {
        health.overall_health = 'unhealthy';
      } else if (overallSuccessRate < 95) {
        health.overall_health = 'degraded';
      }
      
      return health;
    } catch (error) {
      logger.error('Error getting channel health:', error);
      throw error;
    }
  }
}

module.exports = ChannelManager;
