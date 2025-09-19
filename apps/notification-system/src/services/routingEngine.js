const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class RoutingEngine {
  async routeNotification(notification) {
    try {
      const { user_id, type, channel, priority } = notification;
      
      // Get user preferences
      const userPreferences = await this.getUserPreferences(user_id);
      
      // Determine optimal channel
      const optimalChannel = await this.determineOptimalChannel(notification, userPreferences);
      
      if (!optimalChannel) {
        return {
          success: false,
          error: 'No suitable channel found for notification'
        };
      }
      
      // Check channel availability
      const channelAvailable = await this.checkChannelAvailability(optimalChannel, user_id);
      
      if (!channelAvailable) {
        return {
          success: false,
          error: `Channel ${optimalChannel} is not available for user`
        };
      }
      
      // Apply routing rules
      const routingResult = await this.applyRoutingRules(notification, optimalChannel);
      
      if (!routingResult.success) {
        return routingResult;
      }
      
      return {
        success: true,
        channel: optimalChannel,
        routingRules: routingResult.rules
      };
    } catch (error) {
      logger.error('Error routing notification:', error);
      return {
        success: false,
        error: 'Notification routing failed'
      };
    }
  }

  async getUserPreferences(userId) {
    try {
      const query = 'SELECT * FROM user_notification_preferences WHERE user_id = $1';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default preferences
        return {
          email: true,
          sms: false,
          push: true,
          webhook: false,
          quiet_hours: {
            start: '22:00',
            end: '08:00'
          },
          timezone: 'UTC'
        };
      }
      
      const preferences = result.rows[0];
      return {
        email: preferences.email_enabled,
        sms: preferences.sms_enabled,
        push: preferences.push_enabled,
        webhook: preferences.webhook_enabled,
        quiet_hours: preferences.quiet_hours,
        timezone: preferences.timezone
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return {
        email: true,
        sms: false,
        push: true,
        webhook: false,
        quiet_hours: {
          start: '22:00',
          end: '08:00'
        },
        timezone: 'UTC'
      };
    }
  }

  async determineOptimalChannel(notification, userPreferences) {
    try {
      const { type, priority, channel } = notification;
      
      // If channel is specified, use it if available
      if (channel && userPreferences[channel]) {
        return channel;
      }
      
      // Determine channel based on type and priority
      const channelPriority = this.getChannelPriority(type, priority);
      
      // Sort channels by priority and user preference
      const availableChannels = Object.keys(userPreferences).filter(
        ch => userPreferences[ch] && ch !== 'quiet_hours' && ch !== 'timezone'
      );
      
      if (availableChannels.length === 0) {
        return null;
      }
      
      // Sort by priority
      availableChannels.sort((a, b) => {
        const priorityA = channelPriority[a] || 0;
        const priorityB = channelPriority[b] || 0;
        return priorityB - priorityA;
      });
      
      return availableChannels[0];
    } catch (error) {
      logger.error('Error determining optimal channel:', error);
      return null;
    }
  }

  getChannelPriority(type, priority) {
    const priorities = {
      'email': 1,
      'sms': 3,
      'push': 2,
      'webhook': 4
    };
    
    // Adjust priority based on notification type
    switch (type) {
      case 'urgent':
        priorities.sms = 5;
        priorities.push = 4;
        break;
      case 'transactional':
        priorities.email = 3;
        priorities.push = 2;
        break;
      case 'marketing':
        priorities.email = 2;
        priorities.push = 1;
        break;
    }
    
    return priorities;
  }

  async checkChannelAvailability(channel, userId) {
    try {
      switch (channel) {
        case 'email':
          return await this.checkEmailAvailability(userId);
        case 'sms':
          return await this.checkSMSAvailability(userId);
        case 'push':
          return await this.checkPushAvailability(userId);
        case 'webhook':
          return await this.checkWebhookAvailability(userId);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking channel availability:', error);
      return false;
    }
  }

  async checkEmailAvailability(userId) {
    try {
      const query = 'SELECT email FROM users WHERE id = $1 AND email IS NOT NULL';
      const result = await database.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking email availability:', error);
      return false;
    }
  }

  async checkSMSAvailability(userId) {
    try {
      const query = 'SELECT phone FROM users WHERE id = $1 AND phone IS NOT NULL';
      const result = await database.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking SMS availability:', error);
      return false;
    }
  }

  async checkPushAvailability(userId) {
    try {
      const query = 'SELECT COUNT(*) FROM user_fcm_tokens WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking push availability:', error);
      return false;
    }
  }

  async checkWebhookAvailability(userId) {
    try {
      const query = 'SELECT COUNT(*) FROM user_webhooks WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking webhook availability:', error);
      return false;
    }
  }

  async applyRoutingRules(notification, channel) {
    try {
      const { user_id, type, priority } = notification;
      
      // Check quiet hours
      const inQuietHours = await this.checkQuietHours(user_id);
      if (inQuietHours && priority !== 'urgent') {
        return {
          success: false,
          error: 'Notification blocked due to quiet hours'
        };
      }
      
      // Check rate limiting
      const rateLimited = await this.checkRateLimit(user_id, channel, type);
      if (rateLimited) {
        return {
          success: false,
          error: 'Notification rate limit exceeded'
        };
      }
      
      // Check channel-specific rules
      const channelRules = await this.getChannelRules(channel, type);
      if (!channelRules.allowed) {
        return {
          success: false,
          error: channelRules.reason
        };
      }
      
      return {
        success: true,
        rules: channelRules
      };
    } catch (error) {
      logger.error('Error applying routing rules:', error);
      return {
        success: false,
        error: 'Routing rules application failed'
      };
    }
  }

  async checkQuietHours(userId) {
    try {
      const query = 'SELECT quiet_hours, timezone FROM user_notification_preferences WHERE user_id = $1';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const { quiet_hours, timezone } = result.rows[0];
      if (!quiet_hours) {
        return false;
      }
      
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'UTC' }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      const startTime = this.parseTime(quiet_hours.start);
      const endTime = this.parseTime(quiet_hours.end);
      
      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        return currentTime >= startTime || currentTime <= endTime;
      }
    } catch (error) {
      logger.error('Error checking quiet hours:', error);
      return false;
    }
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async checkRateLimit(userId, channel, type) {
    try {
      const key = `rate_limit:${userId}:${channel}:${type}`;
      const limit = this.getRateLimit(channel, type);
      const window = 3600; // 1 hour
      
      const current = await redis.get(key) || 0;
      if (parseInt(current) >= limit) {
        return true;
      }
      
      await redis.set(key, parseInt(current) + 1, window);
      return false;
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return false;
    }
  }

  getRateLimit(channel, type) {
    const limits = {
      'email': {
        'urgent': 10,
        'transactional': 50,
        'marketing': 5
      },
      'sms': {
        'urgent': 5,
        'transactional': 10,
        'marketing': 2
      },
      'push': {
        'urgent': 20,
        'transactional': 100,
        'marketing': 10
      },
      'webhook': {
        'urgent': 50,
        'transactional': 200,
        'marketing': 20
      }
    };
    
    return limits[channel]?.[type] || 10;
  }

  async getChannelRules(channel, type) {
    try {
      const query = 'SELECT * FROM channel_rules WHERE channel = $1 AND type = $2 AND is_active = true';
      const result = await database.query(query, [channel, type]);
      
      if (result.rows.length === 0) {
        return {
          allowed: true,
          rules: []
        };
      }
      
      const rules = result.rows[0];
      return {
        allowed: rules.allowed,
        reason: rules.reason,
        rules: rules.rules
      };
    } catch (error) {
      logger.error('Error getting channel rules:', error);
      return {
        allowed: true,
        rules: []
      };
    }
  }
}

module.exports = new RoutingEngine();

