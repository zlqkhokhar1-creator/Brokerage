/**
 * High-Performance Order Management System (OMS)
 * Ultra-low latency order processing with advanced execution algorithms
 */

const EventEmitter = require('events');
const { logger, logPerformance, logBusinessEvent } = require('../utils/logger');
const { cacheService } = require('../config/redis');
const { riskManagementSystem } = require('./riskManagementSystem');
const { tradingEngine } = require('./tradingEngine');
const { marketDataService } = require('./marketDataService');
const { OrderValidationError, ExecutionError, RiskViolationError } = require('../utils/errorHandler');

class OrderManagementSystem extends EventEmitter {
  constructor() {
    super();
    
    // Order queues by priority
    this.orderQueues = {
      market: [], // Market orders - highest priority
      limit: [], // Limit orders
      stop: [], // Stop orders
      algo: [] // Algorithmic orders
    };
    
    // Order tracking
    this.orders = new Map(); // orderId -> order data
    this.executions = new Map(); // executionId -> execution data
    this.orderBooks = new Map(); // symbol -> order book
    
    // Performance metrics
    this.metrics = {
      ordersProcessed: 0,
      averageLatency: 0,
      executionRate: 0,
      rejectionRate: 0,
      fillRate: 0
    };
    
    // Execution algorithms - will be initialized later
    this.algorithms = {};
    
    // Smart order routing
    this.venues = new Map(); // venue -> connection status
    this.routingRules = new Map(); // symbol -> routing preferences
    
    this.initializeOMS();
  }

  // Initialize Order Management System
  async initializeOMS() {
    logger.info('Initializing high-performance Order Management System...');
    
    // Initialize execution algorithms
    this.algorithms = {
      TWAP: this.executeTWAP ? this.executeTWAP.bind(this) : () => Promise.resolve({}),
      VWAP: this.executeVWAP ? this.executeVWAP.bind(this) : () => Promise.resolve({}),
      POV: this.executePOV ? this.executePOV.bind(this) : () => Promise.resolve({}), // Participation of Volume
      IS: this.executeImplementationShortfall ? this.executeImplementationShortfall.bind(this) : () => Promise.resolve({}),
      ICEBERG: this.executeIceberg ? this.executeIceberg.bind(this) : () => Promise.resolve({}),
      SNIPER: this.executeSniper ? this.executeSniper.bind(this) : () => Promise.resolve({})
    };
    
    // Connect to trading venues
    await this.connectToVenues();
    
    // Initialize smart order routing
    await this.initializeSmartRouting();
    
    // Note: Order processing engines will be started explicitly after server initialization
    // this.startOrderProcessing();
    
    logger.info('Order Management System initialized successfully');
  }

  // Connect to trading venues
  async connectToVenues() {
    try {
      logger.info('Connecting to trading venues...');
      // Simulate connection to trading venues
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.info('Trading venues connected successfully');
    } catch (error) {
      logger.error('Failed to connect to trading venues:', error);
      throw error;
    }
  }

  // Initialize smart order routing
  async initializeSmartRouting() {
    try {
      logger.info('Initializing smart order routing...');
      // Simulate smart routing initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      logger.info('Smart order routing initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize smart routing:', error);
      throw error;
    }
  }

  // Submit new order
  async submitOrder(userId, orderData) {
    const startTime = process.hrtime.bigint();
    
    try {
      // Generate unique order ID
      const orderId = this.generateOrderId();
      
      const order = {
        orderId,
        userId,
        symbol: orderData.symbol,
        side: orderData.side, // BUY or SELL
        quantity: orderData.quantity,
        orderType: orderData.orderType, // MARKET, LIMIT, STOP, STOP_LIMIT
        price: orderData.price,
        timeInForce: orderData.timeInForce || 'DAY', // DAY, GTC, IOC, FOK
        algorithm: orderData.algorithm, // Optional execution algorithm
        status: 'PENDING_VALIDATION',
        timestamp: Date.now(),
        submittedAt: new Date().toISOString(),
        fills: [],
        totalFilled: 0,
        avgFillPrice: 0,
        leaves: orderData.quantity,
        lastUpdateTime: Date.now()
      };

      // Store order
      this.orders.set(orderId, order);

      // 1. Order validation
      await this.validateOrder(order);
      order.status = 'VALIDATED';

      // 2. Risk checks
      const riskCheck = await riskManagementSystem.preOrderRiskCheck(userId, order);
      if (!riskCheck.approved) {
        order.status = 'REJECTED';
        order.rejectReason = 'RISK_VIOLATION';
        order.riskDetails = riskCheck;
        throw new RiskViolationError('Order rejected by risk management', riskCheck);
      }
      order.status = 'RISK_APPROVED';

      // 3. Route order based on type and market conditions
      if (order.algorithm && this.algorithms[order.algorithm]) {
        // Algorithmic execution
        order.status = 'PENDING_ALGO_EXECUTION';
        await this.executeAlgorithmicOrder(order);
      } else {
        // Direct execution
        order.status = 'PENDING_EXECUTION';
        await this.routeOrder(order);
      }

      // Calculate and log latency
      const endTime = process.hrtime.bigint();
      const latencyNs = Number(endTime - startTime);
      const latencyMs = latencyNs / 1000000;

      logPerformance('ORDER_SUBMISSION', latencyMs, {
        orderId,
        userId,
        symbol: order.symbol,
        orderType: order.orderType
      });

      // Emit order event
      this.emit('orderSubmitted', order);

      return {
        orderId,
        status: order.status,
        timestamp: order.timestamp,
        latency: latencyMs
      };

    } catch (error) {
      const order = this.orders.get(orderId);
      if (order) {
        order.status = 'REJECTED';
        order.rejectReason = error.message;
        order.rejectedAt = new Date().toISOString();
      }

      logger.error('Order submission failed', { userId, orderData, error: error.message });
      throw error;
    }
  }

  // Cancel existing order
  async cancelOrder(userId, orderId) {
    const startTime = process.hrtime.bigint();
    
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new OrderValidationError('Order not found');
      }

      if (order.userId !== userId) {
        throw new OrderValidationError('Unauthorized order cancellation');
      }

      if (!['PENDING_EXECUTION', 'PARTIALLY_FILLED', 'PENDING_ALGO_EXECUTION'].includes(order.status)) {
        throw new OrderValidationError(`Cannot cancel order in status: ${order.status}`);
      }

      // Update order status
      order.status = 'PENDING_CANCEL';
      order.cancelRequestTime = Date.now();

      // Send cancel requests to all venues
      const cancelResults = await this.sendCancelRequests(order);

      // Update final status
      if (cancelResults.every(result => result.success)) {
        order.status = 'CANCELLED';
        order.cancelledAt = new Date().toISOString();
      } else {
        order.status = 'CANCEL_REJECTED';
        order.cancelRejectReason = 'Partial cancel failure';
      }

      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1000000;

      logPerformance('ORDER_CANCELLATION', latencyMs, {
        orderId,
        userId,
        success: order.status === 'CANCELLED'
      });

      this.emit('orderCancelled', order);

      return {
        orderId,
        status: order.status,
        latency: latencyMs
      };

    } catch (error) {
      logger.error('Order cancellation failed', { userId, orderId, error: error.message });
      throw error;
    }
  }

  // Modify existing order
  async modifyOrder(userId, orderId, modifications) {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new OrderValidationError('Order not found');
      }

      if (order.userId !== userId) {
        throw new OrderValidationError('Unauthorized order modification');
      }

      // Cancel original order
      await this.cancelOrder(userId, orderId);

      // Submit new order with modifications
      const newOrderData = {
        ...order,
        ...modifications,
        originalOrderId: orderId
      };

      return await this.submitOrder(userId, newOrderData);

    } catch (error) {
      logger.error('Order modification failed', { userId, orderId, modifications, error: error.message });
      throw error;
    }
  }

  // Smart Order Routing (SOR)
  async routeOrder(order) {
    try {
      const startTime = Date.now();
      
      // Get market data for routing decision
      const marketData = await marketDataService.getRealtimeQuote(order.symbol);
      const orderBook = await marketDataService.getLevel2Data(order.symbol);
      
      // Determine optimal routing strategy
      const routingStrategy = await this.determineRoutingStrategy(order, marketData, orderBook);
      
      // Execute routing strategy
      const routingResults = await this.executeRoutingStrategy(order, routingStrategy);
      
      const routingLatency = Date.now() - startTime;
      
      logPerformance('SMART_ORDER_ROUTING', routingLatency, {
        orderId: order.orderId,
        symbol: order.symbol,
        strategy: routingStrategy.name,
        venues: routingStrategy.venues.length
      });
      
      return routingResults;
      
    } catch (error) {
      logger.error('Order routing failed', { orderId: order.orderId, error: error.message });
      throw new ExecutionError('Smart order routing failed', error);
    }
  }

  // TWAP (Time-Weighted Average Price) Algorithm
  async executeTWAP(order, params) {
    try {
      const {
        duration = 3600000, // 1 hour default
        sliceCount = 60, // 60 slices
        priceLimit = null
      } = params;

      const sliceSize = Math.floor(order.quantity / sliceCount);
      const sliceInterval = duration / sliceCount;
      
      let executedQuantity = 0;
      let totalValue = 0;
      
      for (let i = 0; i < sliceCount; i++) {
        const currentSliceSize = (i === sliceCount - 1) 
          ? order.quantity - executedQuantity 
          : sliceSize;
          
        if (currentSliceSize <= 0) break;
        
        // Create child order
        const childOrder = {
          ...order,
          orderId: `${order.orderId}_TWAP_${i}`,
          quantity: currentSliceSize,
          parentOrderId: order.orderId,
          algorithm: 'TWAP_SLICE'
        };
        
        // Execute child order
        const execution = await this.executeChildOrder(childOrder, priceLimit);
        
        if (execution.filled > 0) {
          executedQuantity += execution.filled;
          totalValue += execution.filled * execution.avgPrice;
          
          // Update parent order
          order.totalFilled = executedQuantity;
          order.avgFillPrice = totalValue / executedQuantity;
          order.leaves = order.quantity - executedQuantity;
          order.lastUpdateTime = Date.now();
          
          this.emit('orderFill', {
            orderId: order.orderId,
            fillQuantity: execution.filled,
            fillPrice: execution.avgPrice,
            totalFilled: executedQuantity,
            leaves: order.leaves
          });
        }
        
        // Wait for next slice (unless this is the last one)
        if (i < sliceCount - 1) {
          await this.sleep(sliceInterval);
        }
      }
      
      // Update final order status
      if (executedQuantity === order.quantity) {
        order.status = 'FILLED';
      } else if (executedQuantity > 0) {
        order.status = 'PARTIALLY_FILLED';
      } else {
        order.status = 'UNFILLED';
      }
      
      return {
        algorithm: 'TWAP',
        executedQuantity,
        avgPrice: totalValue / executedQuantity,
        slicesExecuted: sliceCount,
        totalDuration: duration
      };
      
    } catch (error) {
      logger.error('TWAP execution failed', { orderId: order.orderId, error: error.message });
      throw error;
    }
  }

  // VWAP (Volume-Weighted Average Price) Algorithm
  async executeVWAP(order, params) {
    try {
      const {
        duration = 3600000, // 1 hour
        volumeTarget = 0.1, // 10% of expected volume
        priceLimit = null
      } = params;

      // Get historical volume profile
      const volumeProfile = await this.getVolumeProfile(order.symbol, duration);
      
      const startTime = Date.now();
      let executedQuantity = 0;
      let totalValue = 0;
      
      while (executedQuantity < order.quantity && (Date.now() - startTime) < duration) {
        // Calculate participation rate based on current volume
        const currentVolume = await this.getCurrentVolume(order.symbol);
        const expectedVolume = this.getExpectedVolume(volumeProfile, Date.now() - startTime, duration);
        
        const participationRate = Math.min(volumeTarget, currentVolume / expectedVolume);
        const targetQuantity = Math.min(
          order.quantity - executedQuantity,
          currentVolume * participationRate
        );
        
        if (targetQuantity > 0) {
          const childOrder = {
            ...order,
            orderId: `${order.orderId}_VWAP_${Date.now()}`,
            quantity: Math.floor(targetQuantity),
            parentOrderId: order.orderId,
            algorithm: 'VWAP_SLICE'
          };
          
          const execution = await this.executeChildOrder(childOrder, priceLimit);
          
          if (execution.filled > 0) {
            executedQuantity += execution.filled;
            totalValue += execution.filled * execution.avgPrice;
            
            order.totalFilled = executedQuantity;
            order.avgFillPrice = totalValue / executedQuantity;
            order.leaves = order.quantity - executedQuantity;
            order.lastUpdateTime = Date.now();
          }
        }
        
        // Wait before next iteration
        await this.sleep(5000); // 5 seconds
      }
      
      return {
        algorithm: 'VWAP',
        executedQuantity,
        avgPrice: totalValue / executedQuantity,
        participationRate: volumeTarget,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error('VWAP execution failed', { orderId: order.orderId, error: error.message });
      throw error;
    }
  }

  // Implementation Shortfall Algorithm
  async executeImplementationShortfall(order, params) {
    try {
      const {
        riskAversion = 0.5,
        priceImpactModel = 'linear',
        maxDuration = 1800000 // 30 minutes
      } = params;

      const startTime = Date.now();
      const startPrice = await this.getCurrentPrice(order.symbol);
      
      let executedQuantity = 0;
      let totalValue = 0;
      let marketImpact = 0;
      
      while (executedQuantity < order.quantity && (Date.now() - startTime) < maxDuration) {
        // Calculate optimal execution rate
        const remainingQuantity = order.quantity - executedQuantity;
        const remainingTime = maxDuration - (Date.now() - startTime);
        
        const optimalRate = this.calculateOptimalExecutionRate(
          remainingQuantity,
          remainingTime,
          riskAversion,
          order.symbol
        );
        
        const executionQuantity = Math.min(remainingQuantity, optimalRate * 10000); // 10 second slice
        
        if (executionQuantity > 0) {
          const childOrder = {
            ...order,
            orderId: `${order.orderId}_IS_${Date.now()}`,
            quantity: Math.floor(executionQuantity),
            parentOrderId: order.orderId,
            algorithm: 'IS_SLICE'
          };
          
          const execution = await this.executeChildOrder(childOrder);
          
          if (execution.filled > 0) {
            executedQuantity += execution.filled;
            totalValue += execution.filled * execution.avgPrice;
            marketImpact += Math.abs(execution.avgPrice - startPrice) * execution.filled;
          }
        }
        
        await this.sleep(10000); // 10 seconds
      }
      
      const implementationShortfall = marketImpact + (order.quantity - executedQuantity) * 
        (await this.getCurrentPrice(order.symbol) - startPrice);
      
      return {
        algorithm: 'Implementation Shortfall',
        executedQuantity,
        avgPrice: totalValue / executedQuantity,
        implementationShortfall,
        marketImpact,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error('Implementation Shortfall execution failed', { orderId: order.orderId, error: error.message });
      throw error;
    }
  }

  // Iceberg Algorithm
  async executeIceberg(order, params) {
    try {
      const {
        icebergSize = Math.floor(order.quantity * 0.1), // 10% of total
        priceVariance = 0.01, // 1% price variance
        refreshRate = 30000 // 30 seconds
      } = params;

      let executedQuantity = 0;
      let totalValue = 0;
      let currentIcebergQuantity = 0;
      
      while (executedQuantity < order.quantity) {
        // Determine next iceberg slice size
        const remainingQuantity = order.quantity - executedQuantity;
        const sliceSize = Math.min(icebergSize, remainingQuantity);
        
        // Create visible order
        const currentPrice = await this.getCurrentPrice(order.symbol);
        const orderPrice = order.orderType === 'MARKET' ? null : 
          this.calculateIcebergPrice(currentPrice, order.side, priceVariance);
        
        const childOrder = {
          ...order,
          orderId: `${order.orderId}_ICE_${Date.now()}`,
          quantity: sliceSize,
          price: orderPrice,
          parentOrderId: order.orderId,
          algorithm: 'ICEBERG_SLICE'
        };
        
        // Execute current slice
        const execution = await this.executeChildOrder(childOrder);
        
        if (execution.filled > 0) {
          executedQuantity += execution.filled;
          totalValue += execution.filled * execution.avgPrice;
          
          order.totalFilled = executedQuantity;
          order.avgFillPrice = totalValue / executedQuantity;
          order.leaves = order.quantity - executedQuantity;
        }
        
        // If slice not fully filled, wait and refresh
        if (execution.filled < sliceSize && executedQuantity < order.quantity) {
          await this.sleep(refreshRate);
        }
      }
      
      return {
        algorithm: 'Iceberg',
        executedQuantity,
        avgPrice: totalValue / executedQuantity,
        icebergSize,
        slicesUsed: Math.ceil(order.quantity / icebergSize)
      };
      
    } catch (error) {
      logger.error('Iceberg execution failed', { orderId: order.orderId, error: error.message });
      throw error;
    }
  }

  // Get order status
  getOrderStatus(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      status: order.status,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      totalFilled: order.totalFilled,
      avgFillPrice: order.avgFillPrice,
      leaves: order.leaves,
      fills: order.fills,
      submittedAt: order.submittedAt,
      lastUpdateTime: order.lastUpdateTime
    };
  }

  // Get order history for user
  async getOrderHistory(userId, limit = 100, offset = 0) {
    try {
      const userOrders = Array.from(this.orders.values())
        .filter(order => order.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(offset, offset + limit);

      return userOrders.map(order => this.getOrderStatus(order.orderId));

    } catch (error) {
      logger.error('Failed to get order history', { userId, error: error.message });
      throw error;
    }
  }

  // Get system performance metrics
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      activeOrders: this.getActiveOrderCount(),
      queueDepths: {
        market: this.orderQueues.market.length,
        limit: this.orderQueues.limit.length,
        stop: this.orderQueues.stop.length,
        algo: this.orderQueues.algo.length
      },
      venueStatus: Object.fromEntries(this.venues),
      timestamp: Date.now()
    };
  }

  // Start order processing engines
  startOrderProcessing() {
    // Process market orders (highest priority)
    setInterval(() => this.processOrderQueue('market'), 100); // Every 100ms
    
    // Process limit orders
    setInterval(() => this.processOrderQueue('limit'), 500); // Every 500ms
    
    // Process stop orders
    setInterval(() => this.processOrderQueue('stop'), 1000); // Every second
    
    // Process algorithmic orders
    setInterval(() => this.processOrderQueue('algo'), 5000); // Every 5 seconds

    logger.info('Order processing engines started');
  }
}

// Export singleton instance
const orderManagementSystem = new OrderManagementSystem();

module.exports = { orderManagementSystem, OrderManagementSystem };
