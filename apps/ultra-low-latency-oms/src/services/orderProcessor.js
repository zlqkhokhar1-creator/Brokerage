const Redis = require('ioredis');
const { performance } = require('perf_hooks');
const { nanoid } = require('nanoid');
const msgpack = require('msgpack-lite');
const { logger } = require('../utils/logger');
const { pool } = require('./database');

class OrderProcessor {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    });
    
    this.orderCache = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Start processing queue
      this.startProcessingQueue();
      
      this._initialized = true;
      logger.info('OrderProcessor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OrderProcessor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('OrderProcessor closed');
    } catch (error) {
      logger.error('Error closing OrderProcessor:', error);
    }
  }

  async processOrder(order) {
    const startTime = performance.now();
    
    try {
      // Validate order
      this.validateOrder(order);
      
      // Generate order ID if not provided
      if (!order.id) {
        order.id = nanoid();
      }
      
      // Set timestamps
      order.createdAt = new Date().toISOString();
      order.updatedAt = new Date().toISOString();
      
      // Store in Redis for fast access
      await this.storeOrderInRedis(order);
      
      // Store in database
      await this.storeOrderInDatabase(order);
      
      // Add to processing queue
      this.addToProcessingQueue(order);
      
      const latency = performance.now() - startTime;
      logger.info('Order processed', {
        orderId: order.id,
        symbol: order.symbol,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return order;
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order processing failed', {
        orderId: order.id,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async updateOrder(order) {
    const startTime = performance.now();
    
    try {
      // Validate order
      this.validateOrder(order);
      
      // Update timestamp
      order.updatedAt = new Date().toISOString();
      
      // Update in Redis
      await this.updateOrderInRedis(order);
      
      // Update in database
      await this.updateOrderInDatabase(order);
      
      const latency = performance.now() - startTime;
      logger.info('Order updated', {
        orderId: order.id,
        symbol: order.symbol,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return order;
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order update failed', {
        orderId: order.id,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async cancelOrder(orderId) {
    const startTime = performance.now();
    
    try {
      // Get existing order
      const existingOrder = await this.getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }
      
      // Update order status
      const cancelledOrder = {
        ...existingOrder,
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      };
      
      // Update in Redis
      await this.updateOrderInRedis(cancelledOrder);
      
      // Update in database
      await this.updateOrderInDatabase(cancelledOrder);
      
      const latency = performance.now() - startTime;
      logger.info('Order cancelled', {
        orderId: order.id,
        symbol: order.symbol,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return cancelledOrder;
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order cancellation failed', {
        orderId: order.id,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async getOrder(orderId) {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (this.orderCache.has(orderId)) {
        const latency = performance.now() - startTime;
        logger.debug('Order retrieved from cache', {
          orderId: order.id,
          latency: `${latency.toFixed(3)}ms`
        });
        return this.orderCache.get(orderId);
      }
      
      // Get from Redis
      const orderData = await this.redis.hgetall(`order:${orderId}`);
      if (Object.keys(orderData).length === 0) {
        return null;
      }
      
      // Parse order data
      const order = this.parseOrderData(orderData);
      
      // Cache order
      this.orderCache.set(orderId, order);
      
      const latency = performance.now() - startTime;
      logger.debug('Order retrieved from Redis', {
        orderId: order.id,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return order;
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Order retrieval failed', {
        orderId: order.id,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async getOrdersByUser(userId, limit = 100, offset = 0) {
    const startTime = performance.now();
    
    try {
      // Get order IDs from Redis
      const orderIds = await this.redis.lrange(`user_orders:${userId}`, offset, offset + limit - 1);
      
      // Get orders
      const orders = await Promise.all(
        orderIds.map(orderId => this.getOrder(orderId))
      );
      
      const latency = performance.now() - startTime;
      logger.debug('User orders retrieved', {
        userId: userId,
        count: orders.length,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return orders.filter(order => order !== null);
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('User orders retrieval failed', {
        userId: userId,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  async getOrdersBySymbol(symbol, limit = 100, offset = 0) {
    const startTime = performance.now();
    
    try {
      // Get order IDs from Redis
      const orderIds = await this.redis.lrange(`symbol_orders:${symbol}`, offset, offset + limit - 1);
      
      // Get orders
      const orders = await Promise.all(
        orderIds.map(orderId => this.getOrder(orderId))
      );
      
      const latency = performance.now() - startTime;
      logger.debug('Symbol orders retrieved', {
        symbol: symbol,
        count: orders.length,
        latency: `${latency.toFixed(3)}ms`
      });
      
      return orders.filter(order => order !== null);
      
    } catch (error) {
      const latency = performance.now() - startTime;
      logger.error('Symbol orders retrieval failed', {
        symbol: symbol,
        error: error.message,
        latency: `${latency.toFixed(3)}ms`
      });
      throw error;
    }
  }

  validateOrder(order) {
    if (!order.symbol || typeof order.symbol !== 'string') {
      throw new Error('Invalid symbol');
    }
    
    if (!order.side || !['buy', 'sell'].includes(order.side)) {
      throw new Error('Invalid side');
    }
    
    if (!order.quantity || order.quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    
    if (!order.orderType || !['market', 'limit', 'stop', 'stop_limit'].includes(order.orderType)) {
      throw new Error('Invalid order type');
    }
    
    if (order.orderType === 'limit' && (!order.price || order.price <= 0)) {
      throw new Error('Invalid price for limit order');
    }
    
    if (order.orderType === 'stop' && (!order.stopPrice || order.stopPrice <= 0)) {
      throw new Error('Invalid stop price for stop order');
    }
    
    if (order.orderType === 'stop_limit' && (!order.price || order.price <= 0 || !order.stopPrice || order.stopPrice <= 0)) {
      throw new Error('Invalid price or stop price for stop-limit order');
    }
  }

  async storeOrderInRedis(order) {
    try {
      const pipeline = this.redis.pipeline();
      
      // Store order data
      pipeline.hset(`order:${order.id}`, this.serializeOrderData(order));
      
      // Add to user orders list
      pipeline.lpush(`user_orders:${order.userId}`, order.id);
      
      // Add to symbol orders list
      pipeline.lpush(`symbol_orders:${order.symbol}`, order.id);
      
      // Set expiration (24 hours)
      pipeline.expire(`order:${order.id}`, 86400);
      
      await pipeline.exec();
      
    } catch (error) {
      logger.error('Failed to store order in Redis:', error);
      throw error;
    }
  }

  async updateOrderInRedis(order) {
    try {
      const pipeline = this.redis.pipeline();
      
      // Update order data
      pipeline.hset(`order:${order.id}`, this.serializeOrderData(order));
      
      // Update cache
      this.orderCache.set(order.id, order);
      
      await pipeline.exec();
      
    } catch (error) {
      logger.error('Failed to update order in Redis:', error);
      throw error;
    }
  }

  async storeOrderInDatabase(order) {
    try {
      const query = `
        INSERT INTO orders (
          id, user_id, symbol, side, quantity, price, order_type, 
          time_in_force, status, stop_price, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        order.id,
        order.userId,
        order.symbol,
        order.side,
        order.quantity,
        order.price,
        order.orderType,
        order.timeInForce,
        order.status,
        order.stopPrice,
        order.createdAt,
        order.updatedAt
      ]);
      
    } catch (error) {
      logger.error('Failed to store order in database:', error);
      throw error;
    }
  }

  async updateOrderInDatabase(order) {
    try {
      const query = `
        UPDATE orders SET
          status = $2,
          updated_at = $3
        WHERE id = $1
      `;
      
      await pool.query(query, [
        order.id,
        order.status,
        order.updatedAt
      ]);
      
    } catch (error) {
      logger.error('Failed to update order in database:', error);
      throw error;
    }
  }

  serializeOrderData(order) {
    return {
      id: order.id,
      userId: order.userId,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity.toString(),
      price: order.price ? order.price.toString() : '',
      orderType: order.orderType,
      timeInForce: order.timeInForce,
      status: order.status,
      stopPrice: order.stopPrice ? order.stopPrice.toString() : '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  parseOrderData(orderData) {
    return {
      id: orderData.id,
      userId: orderData.userId,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: parseFloat(orderData.quantity),
      price: orderData.price ? parseFloat(orderData.price) : null,
      orderType: orderData.orderType,
      timeInForce: orderData.timeInForce,
      status: orderData.status,
      stopPrice: orderData.stopPrice ? parseFloat(orderData.stopPrice) : null,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt
    };
  }

  addToProcessingQueue(order) {
    this.processingQueue.push(order);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.processingQueue.length > 0) {
        const order = this.processingQueue.shift();
        await this.processOrderLogic(order);
      }
    } catch (error) {
      logger.error('Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processOrderLogic(order) {
    try {
      // Order-specific processing logic
      switch (order.orderType) {
        case 'market':
          await this.processMarketOrder(order);
          break;
        case 'limit':
          await this.processLimitOrder(order);
          break;
        case 'stop':
          await this.processStopOrder(order);
          break;
        case 'stop_limit':
          await this.processStopLimitOrder(order);
          break;
        default:
          throw new Error(`Unknown order type: ${order.orderType}`);
      }
    } catch (error) {
      logger.error('Order processing logic failed:', error);
      throw error;
    }
  }

  async processMarketOrder(order) {
    // Market orders are executed immediately
    order.status = 'filled';
    order.updatedAt = new Date().toISOString();
    
    await this.updateOrderInRedis(order);
    await this.updateOrderInDatabase(order);
  }

  async processLimitOrder(order) {
    // Limit orders are placed in the order book
    order.status = 'pending';
    order.updatedAt = new Date().toISOString();
    
    await this.updateOrderInRedis(order);
    await this.updateOrderInDatabase(order);
  }

  async processStopOrder(order) {
    // Stop orders are placed in the order book
    order.status = 'pending';
    order.updatedAt = new Date().toISOString();
    
    await this.updateOrderInRedis(order);
    await this.updateOrderInDatabase(order);
  }

  async processStopLimitOrder(order) {
    // Stop-limit orders are placed in the order book
    order.status = 'pending';
    order.updatedAt = new Date().toISOString();
    
    await this.updateOrderInRedis(order);
    await this.updateOrderInDatabase(order);
  }

  startProcessingQueue() {
    // Process queue every 100ms
    setInterval(() => {
      this.processQueue();
    }, 100);
  }

  async getOrderStatistics() {
    try {
      const stats = {
        totalOrders: await this.redis.get('total_orders') || 0,
        pendingOrders: await this.redis.get('pending_orders') || 0,
        filledOrders: await this.redis.get('filled_orders') || 0,
        cancelledOrders: await this.redis.get('cancelled_orders') || 0,
        cacheSize: this.orderCache.size,
        queueSize: this.processingQueue.length
      };
      
      return stats;
    } catch (error) {
      logger.error('Failed to get order statistics:', error);
      return {};
    }
  }
}

module.exports = OrderProcessor;
