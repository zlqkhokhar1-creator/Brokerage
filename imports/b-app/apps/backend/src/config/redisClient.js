/**
 * Redis Client Factory with Exponential Backoff and Circuit Breaker
 */

const Redis = require('redis');
const { logger } = require('../utils/logger');

class RedisClientFactory {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 10;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 30000; // 30 seconds
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenTime = null;
    this.circuitBreakerResetTime = 60000; // 1 minute
  }

  /**
   * Create Redis client with configuration
   */
  createClient() {
    const config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= this.maxRetries) {
            logger.error('Redis: Maximum reconnection attempts reached');
            return false;
          }
          
          const delay = Math.min(
            this.baseDelay * Math.pow(2, retries), 
            this.maxDelay
          );
          
          logger.info(`Redis: Reconnecting in ${delay}ms (attempt ${retries + 1}/${this.maxRetries})`);
          return delay;
        },
        connectTimeout: 10000,
        commandTimeout: 5000,
        tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined
      },
      retry_delayOnFailover: 100,
      retry_delayOnClusterDown: 300,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000
    };

    this.client = Redis.createClient(config);
    this.setupEventHandlers();
    
    return this.client;
  }

  /**
   * Setup event handlers for the Redis client
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis: Client connected');
      this.connectionAttempts = 0;
      this.isConnected = true;
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenTime = null;
    });

    this.client.on('ready', () => {
      logger.info('Redis: Client ready for commands');
    });

    this.client.on('error', (err) => {
      logger.error('Redis: Client error', { 
        error: err.message, 
        stack: err.stack,
        connectionAttempts: this.connectionAttempts 
      });
      
      this.isConnected = false;
      this.connectionAttempts++;
      
      // Open circuit breaker after threshold
      if (this.connectionAttempts >= this.circuitBreakerThreshold) {
        this.openCircuitBreaker();
      }
    });

    this.client.on('end', () => {
      logger.info('Redis: Client connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis: Client reconnecting...');
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis: Client disconnected');
      this.isConnected = false;
    });
  }

  /**
   * Open circuit breaker
   */
  openCircuitBreaker() {
    if (!this.circuitBreakerOpen) {
      logger.warn('Redis: Circuit breaker opened due to repeated failures');
      this.circuitBreakerOpen = true;
      this.circuitBreakerOpenTime = Date.now();
    }
  }

  /**
   * Check if circuit breaker should be reset
   */
  shouldResetCircuitBreaker() {
    if (!this.circuitBreakerOpen) return false;
    
    const now = Date.now();
    const timeOpen = now - this.circuitBreakerOpenTime;
    
    if (timeOpen >= this.circuitBreakerResetTime) {
      logger.info('Redis: Circuit breaker reset timeout reached, attempting to reset');
      return true;
    }
    
    return false;
  }

  /**
   * Initialize connection with retry logic
   */
  async connect() {
    if (!this.client) {
      this.createClient();
    }

    // Check circuit breaker
    if (this.circuitBreakerOpen && !this.shouldResetCircuitBreaker()) {
      throw new Error('Redis circuit breaker is open');
    }

    try {
      await this.client.connect();
      
      if (this.circuitBreakerOpen) {
        logger.info('Redis: Circuit breaker reset - connection restored');
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenTime = null;
        this.connectionAttempts = 0;
      }
      
    } catch (error) {
      logger.error('Redis: Connection failed', { error: error.message });
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.circuitBreakerThreshold) {
        this.openCircuitBreaker();
      }
      
      throw error;
    }
  }

  /**
   * Get the Redis client (create and connect if needed)
   */
  async getClient() {
    if (!this.client) {
      this.createClient();
    }

    if (!this.isConnected) {
      await this.connect();
    }

    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return { 
          status: 'unhealthy', 
          error: 'Not connected',
          circuitBreakerOpen: this.circuitBreakerOpen
        };
      }

      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      return { 
        status: 'healthy', 
        responseTime,
        connectionAttempts: this.connectionAttempts,
        circuitBreakerOpen: this.circuitBreakerOpen
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        connectionAttempts: this.connectionAttempts,
        circuitBreakerOpen: this.circuitBreakerOpen
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.client && this.isConnected) {
      logger.info('Redis: Shutting down client...');
      await this.client.quit();
      logger.info('Redis: Client shutdown complete');
    }
  }
}

// Create singleton instance
const redisFactory = new RedisClientFactory();

// Export factory and convenience methods
module.exports = {
  redisFactory,
  
  // Convenience method to get client
  getRedisClient: () => redisFactory.getClient(),
  
  // Health check
  redisHealthCheck: () => redisFactory.healthCheck(),
  
  // Shutdown
  shutdownRedis: () => redisFactory.shutdown()
};