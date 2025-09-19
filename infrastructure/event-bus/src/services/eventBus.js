const logger = require('../utils/logger');
const redis = require('./redis');
const database = require('./database');
const { v4: uuidv4 } = require('uuid');

class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 10000;
  }

  async publishEvent(eventType, data, targetServices = [], priority = 'normal') {
    try {
      const event = {
        id: uuidv4(),
        type: eventType,
        data,
        targetServices,
        priority,
        timestamp: new Date(),
        status: 'published'
      };

      // Store event in database
      await this.storeEvent(event);

      // Store in Redis for quick access
      await redis.set(`event:${event.id}`, event, 3600);

      // Add to event history
      this.eventHistory.unshift(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
      }

      // Notify subscribers
      await this.notifySubscribers(event);

      logger.info('Event published:', { eventType, eventId: event.id, targetServices });

      return {
        success: true,
        eventId: event.id,
        message: 'Event published successfully'
      };
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  async subscribeToEvents(serviceName, eventTypes, callbackUrl) {
    try {
      const subscription = {
        id: uuidv4(),
        serviceName,
        eventTypes: Array.isArray(eventTypes) ? eventTypes : [eventTypes],
        callbackUrl,
        createdAt: new Date(),
        isActive: true
      };

      // Store subscription in database
      await this.storeSubscription(subscription);

      // Add to in-memory subscribers
      this.subscribers.set(subscription.id, subscription);

      logger.info('Service subscribed to events:', { serviceName, eventTypes, subscriptionId: subscription.id });

      return {
        success: true,
        subscriptionId: subscription.id,
        message: 'Successfully subscribed to events'
      };
    } catch (error) {
      logger.error('Error subscribing to events:', error);
      throw error;
    }
  }

  async unsubscribeFromEvents(subscriptionId) {
    try {
      // Remove from in-memory subscribers
      this.subscribers.delete(subscriptionId);

      // Update subscription in database
      await this.updateSubscriptionStatus(subscriptionId, false);

      logger.info('Service unsubscribed from events:', { subscriptionId });

      return {
        success: true,
        message: 'Successfully unsubscribed from events'
      };
    } catch (error) {
      logger.error('Error unsubscribing from events:', error);
      throw error;
    }
  }

  async notifySubscribers(event) {
    try {
      const promises = [];

      for (const [subscriptionId, subscription] of this.subscribers) {
        if (!subscription.isActive) continue;

        // Check if subscription matches event type
        if (subscription.eventTypes.includes(event.type) || subscription.eventTypes.includes('*')) {
          // Check if event targets specific services
          if (event.targetServices.length === 0 || event.targetServices.includes(subscription.serviceName)) {
            promises.push(this.notifySubscriber(subscription, event));
          }
        }
      }

      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error notifying subscribers:', error);
    }
  }

  async notifySubscriber(subscription, event) {
    try {
      const axios = require('axios');
      
      const payload = {
        eventId: event.id,
        eventType: event.type,
        data: event.data,
        timestamp: event.timestamp
      };

      await axios.post(subscription.callbackUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Brokerage-EventBus/1.0'
        }
      });

      logger.debug('Event delivered to subscriber:', { 
        subscriptionId: subscription.id, 
        serviceName: subscription.serviceName,
        eventType: event.type 
      });
    } catch (error) {
      logger.error('Error delivering event to subscriber:', {
        subscriptionId: subscription.id,
        serviceName: subscription.serviceName,
        error: error.message
      });
    }
  }

  async registerService(serviceName, serviceUrl, healthCheckUrl, capabilities = []) {
    try {
      const service = {
        id: uuidv4(),
        name: serviceName,
        url: serviceUrl,
        healthCheckUrl,
        capabilities,
        status: 'active',
        lastHeartbeat: new Date(),
        createdAt: new Date()
      };

      // Store service in database
      await this.storeService(service);

      // Store in Redis
      await redis.set(`service:${serviceName}`, service, 300); // 5 minutes TTL

      logger.info('Service registered:', { serviceName, serviceUrl });

      return {
        success: true,
        serviceId: service.id,
        message: 'Service registered successfully'
      };
    } catch (error) {
      logger.error('Error registering service:', error);
      throw error;
    }
  }

  async getRegisteredServices() {
    try {
      const query = `
        SELECT * FROM service_registry 
        WHERE status = 'active' 
        ORDER BY last_heartbeat DESC
      `;
      
      const result = await database.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        healthCheckUrl: row.health_check_url,
        capabilities: JSON.parse(row.capabilities || '[]'),
        status: row.status,
        lastHeartbeat: row.last_heartbeat,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting registered services:', error);
      throw error;
    }
  }

  async storeEvent(event) {
    try {
      const query = `
        INSERT INTO events (
          id, type, data, target_services, priority, timestamp, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await database.query(query, [
        event.id,
        event.type,
        JSON.stringify(event.data),
        JSON.stringify(event.targetServices),
        event.priority,
        event.timestamp,
        event.status
      ]);
    } catch (error) {
      logger.error('Error storing event:', error);
      throw error;
    }
  }

  async storeSubscription(subscription) {
    try {
      const query = `
        INSERT INTO event_subscriptions (
          id, service_name, event_types, callback_url, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await database.query(query, [
        subscription.id,
        subscription.serviceName,
        JSON.stringify(subscription.eventTypes),
        subscription.callbackUrl,
        subscription.createdAt,
        subscription.isActive
      ]);
    } catch (error) {
      logger.error('Error storing subscription:', error);
      throw error;
    }
  }

  async updateSubscriptionStatus(subscriptionId, isActive) {
    try {
      const query = `
        UPDATE event_subscriptions 
        SET is_active = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await database.query(query, [subscriptionId, isActive]);
    } catch (error) {
      logger.error('Error updating subscription status:', error);
      throw error;
    }
  }

  async storeService(service) {
    try {
      const query = `
        INSERT INTO service_registry (
          id, name, url, health_check_url, capabilities, status, last_heartbeat, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await database.query(query, [
        service.id,
        service.name,
        service.url,
        service.healthCheckUrl,
        JSON.stringify(service.capabilities),
        service.status,
        service.lastHeartbeat,
        service.createdAt
      ]);
    } catch (error) {
      logger.error('Error storing service:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Check database connection
      await database.query('SELECT 1');
      
      // Check Redis connection
      await redis.healthCheck();
      
      return { status: 'healthy', service: 'event-bus' };
    } catch (error) {
      logger.error('Event bus health check failed:', error);
      return { status: 'unhealthy', service: 'event-bus', error: error.message };
    }
  }

  async close() {
    try {
      await database.close();
      await redis.close();
      logger.info('Event bus closed gracefully');
    } catch (error) {
      logger.error('Error closing event bus:', error);
    }
  }
}

module.exports = new EventBus();

