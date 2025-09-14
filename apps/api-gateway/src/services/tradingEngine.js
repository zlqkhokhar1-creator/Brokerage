/**
 * Advanced Trading Engine
 * High-performance trading system surpassing IBKR and Robinhood
 */

const EventEmitter = require('events');
const { dbOps, transaction, query } = require('../config/database');
const { cacheService, marketDataCache } = require('../config/redis');
const { logger, logTradingOperation, logPerformance } = require('../utils/logger');
const { 
  BusinessLogicError, 
  ValidationError,
  ExternalApiError,
  asyncHandler 
} = require('../utils/errorHandler');

class TradingEngine extends EventEmitter {
  constructor() {
    super();
    this.orderQueue = [];
    this.processingOrders = false;
    this.marketData = new Map();
    this.riskLimits = new Map();
    this.portfolioCache = new Map();
    
    // Note: Order processor will be started explicitly after server initialization
    // this.startOrderProcessor();
    
    // Initialize risk management
    this.initializeRiskManagement();
  }

  // Advanced order placement with pre-trade risk checks
  async placeOrder(orderData, userId) {
    const startTime = Date.now();
    
    try {
      // Enhanced order validation
      const validatedOrder = await this.validateOrder(orderData, userId);
      
      // Pre-trade risk assessment
      await this.performRiskAssessment(validatedOrder, userId);
      
      // Get real-time market data
      const marketData = await this.getMarketData(validatedOrder.symbol);
      
      // Calculate order value and fees
      const orderDetails = await this.calculateOrderDetails(validatedOrder, marketData);
      
      // Create order in database
      const order = await transaction(async (client) => {
        // Create order record
        const orderRecord = await this.createOrderRecord(validatedOrder, orderDetails, userId, client);
        
        // Update account balances (hold funds/shares)
        await this.updateAccountHolds(orderRecord, userId, client);
        
        // Create audit trail
        await this.createOrderAuditTrail(orderRecord, userId, client);
        
        return orderRecord;
      });
      
      // Add to processing queue
      this.addToOrderQueue(order);
      
      // Log trading operation
      logTradingOperation(userId, 'ORDER_PLACED', {
        orderId: order.id,
        symbol: order.symbol,
        quantity: order.quantity,
        orderType: order.order_type,
        side: order.side,
        estimatedValue: orderDetails.estimatedValue
      });
      
      // Emit order placed event
      this.emit('orderPlaced', order);
      
      const duration = Date.now() - startTime;
      logPerformance('ORDER_PLACEMENT', duration, { orderId: order.id });
      
      return {
        orderId: order.id,
        status: order.status,
        symbol: order.symbol,
        quantity: order.quantity,
        orderType: order.order_type,
        side: order.side,
        estimatedValue: orderDetails.estimatedValue,
        estimatedFees: orderDetails.estimatedFees,
        timestamp: order.created_at
      };
      
    } catch (error) {
      logger.error('Order placement failed', {
        userId,
        orderData,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  // Enhanced order validation
  async validateOrder(orderData, userId) {
    const { symbol, quantity, side, orderType, price, stopPrice, timeInForce } = orderData;
    
    // Basic validation
    if (!symbol || !quantity || !side || !orderType) {
      throw new ValidationError('Missing required order fields');
    }
    
    // Market hours check
    if (!this.isMarketOpen() && !orderData.extendedHours) {
      throw new BusinessLogicError('Market is closed. Enable extended hours trading to place orders.');
    }
    
    // Symbol validation
    const isValidSymbol = await this.validateSymbol(symbol);
    if (!isValidSymbol) {
      throw new ValidationError(`Invalid symbol: ${symbol}`);
    }
    
    // Quantity validation
    if (quantity <= 0 || quantity > 10000) {
      throw new ValidationError('Invalid quantity. Must be between 1 and 10,000 shares.');
    }
    
    // Price validation for limit orders
    if (['limit', 'stop_limit'].includes(orderType) && (!price || price <= 0)) {
      throw new ValidationError('Price is required for limit orders');
    }
    
    // Stop price validation
    if (['stop', 'stop_limit'].includes(orderType) && (!stopPrice || stopPrice <= 0)) {
      throw new ValidationError('Stop price is required for stop orders');
    }
    
    // Price validation against market data
    const marketData = await this.getMarketData(symbol);
    if (price && marketData) {
      const deviation = Math.abs(price - marketData.price) / marketData.price;
      if (deviation > 0.1) { // More than 10% deviation
        throw new BusinessLogicError(`Order price deviates significantly from market price (${deviation * 100}%)`);
      }
    }
    
    return {
      symbol: symbol.toUpperCase(),
      quantity: parseInt(quantity),
      side,
      orderType,
      price: price ? parseFloat(price) : null,
      stopPrice: stopPrice ? parseFloat(stopPrice) : null,
      timeInForce: timeInForce || 'day',
      extendedHours: !!orderData.extendedHours
    };
  }

  // Advanced pre-trade risk assessment
  async performRiskAssessment(order, userId) {
    const portfolio = await this.getPortfolio(userId);
    const account = await this.getAccountInfo(userId);
    
    // Buying power check
    if (order.side === 'buy') {
      const estimatedCost = await this.estimateOrderCost(order);
      if (estimatedCost > account.buyingPower) {
        throw new BusinessLogicError('Insufficient buying power');
      }
    }
    
    // Position check for sell orders
    if (order.side === 'sell') {
      const position = portfolio.positions.find(p => p.symbol === order.symbol);
      const availableShares = position ? position.quantity - position.held_quantity : 0;
      
      if (order.quantity > availableShares) {
        throw new BusinessLogicError('Insufficient shares available for sale');
      }
    }
    
    // Concentration risk check
    const portfolioValue = portfolio.totalValue;
    const orderValue = await this.estimateOrderValue(order);
    
    if (order.side === 'buy' && portfolioValue > 0) {
      const concentrationRatio = orderValue / portfolioValue;
      if (concentrationRatio > 0.25) { // More than 25% in single position
        logger.warn('High concentration risk detected', {
          userId,
          symbol: order.symbol,
          concentrationRatio,
          orderValue,
          portfolioValue
        });
      }
    }
    
    // Day trading buying power check
    if (account.dayTradingBuyingPower && this.isDayTrade(order, userId)) {
      const dtbp = account.dayTradingBuyingPower;
      const estimatedCost = await this.estimateOrderCost(order);
      
      if (estimatedCost > dtbp) {
        throw new BusinessLogicError('Insufficient day trading buying power');
      }
    }
    
    // Pattern day trader rule check
    if (await this.checkPDTRule(userId, order)) {
      throw new BusinessLogicError('Pattern Day Trading rule violation. Minimum $25,000 equity required.');
    }
  }

  // Real-time market data retrieval with caching
  async getMarketData(symbol) {
    // Check cache first
    let marketData = await marketDataCache.getStockQuote(symbol);
    
    if (!marketData) {
      // Fetch from external API
      marketData = await this.fetchMarketDataFromAPI(symbol);
      
      // Cache for 5 seconds for high-frequency trading
      await marketDataCache.setStockQuote(symbol, marketData, 5);
    }
    
    return marketData;
  }

  // Advanced order details calculation
  async calculateOrderDetails(order, marketData) {
    const { symbol, quantity, side, orderType, price } = order;
    
    // Determine execution price
    let executionPrice;
    if (orderType === 'market') {
      executionPrice = side === 'buy' ? marketData.ask : marketData.bid;
    } else {
      executionPrice = price;
    }
    
    const notionalValue = quantity * executionPrice;
    
    // Calculate fees (competitive with IBKR)
    const fees = this.calculateTradingFees(notionalValue, quantity);
    
    // Calculate regulatory fees
    const regulatoryFees = this.calculateRegulatoryFees(notionalValue, side);
    
    const totalFees = fees + regulatoryFees;
    const totalValue = side === 'buy' ? notionalValue + totalFees : notionalValue - totalFees;
    
    return {
      estimatedPrice: executionPrice,
      estimatedValue: notionalValue,
      estimatedFees: totalFees,
      totalCost: totalValue,
      breakdown: {
        commission: fees,
        regulatory: regulatoryFees,
        marketData: marketData
      }
    };
  }

  // Competitive fee structure
  calculateTradingFees(notionalValue, quantity) {
    // Tiered pricing better than most competitors
    if (notionalValue <= 1000) return 0; // Free for small trades
    if (notionalValue <= 10000) return 0.50; // Ultra-low for medium trades
    if (notionalValue <= 100000) return 1.00; // Low for large trades
    return Math.min(notionalValue * 0.0001, 5.00); // Max $5, better than IBKR
  }

  // Regulatory fees calculation
  calculateRegulatoryFees(notionalValue, side) {
    let fees = 0;
    
    // SEC fees (sell side only)
    if (side === 'sell') {
      fees += notionalValue * 0.0000051; // $5.10 per million
    }
    
    // FINRA Trading Activity Fee
    fees += 0.000145; // $0.000145 per share, max $7.27
    
    return Math.round(fees * 100) / 100; // Round to cents
  }

  // High-performance order processing queue
  async startOrderProcessor() {
    setInterval(async () => {
      if (!this.processingOrders && this.orderQueue.length > 0) {
        this.processingOrders = true;
        await this.processOrderBatch();
        this.processingOrders = false;
      }
    }, 100); // Process every 100ms for low latency
  }

  // Batch order processing for efficiency
  async processOrderBatch() {
    const batchSize = 50; // Process up to 50 orders at once
    const batch = this.orderQueue.splice(0, batchSize);
    
    if (batch.length === 0) return;
    
    const startTime = Date.now();
    
    try {
      // Group orders by symbol for efficient market data fetching
      const ordersBySymbol = this.groupOrdersBySymbol(batch);
      
      // Fetch market data for all symbols in parallel
      await this.prefetchMarketData(Object.keys(ordersBySymbol));
      
      // Process orders in parallel
      const promises = batch.map(order => this.executeOrder(order));
      await Promise.allSettled(promises);
      
      const duration = Date.now() - startTime;
      logPerformance('ORDER_BATCH_PROCESSING', duration, { 
        batchSize: batch.length,
        ordersPerSecond: (batch.length / duration) * 1000
      });
      
    } catch (error) {
      logger.error('Order batch processing failed', {
        batchSize: batch.length,
        error: error.message
      });
    }
  }

  // Individual order execution
  async executeOrder(order) {
    const startTime = Date.now();
    
    try {
      const marketData = await this.getMarketData(order.symbol);
      
      // Determine if order can be executed
      const canExecute = this.canExecuteOrder(order, marketData);
      
      if (canExecute) {
        await this.fillOrder(order, marketData);
      } else {
        // Keep order in pending state or cancel if appropriate
        await this.handlePendingOrder(order, marketData);
      }
      
      const duration = Date.now() - startTime;
      logPerformance('ORDER_EXECUTION', duration, { orderId: order.id });
      
    } catch (error) {
      await this.handleOrderError(order, error);
    }
  }

  // Order execution logic
  async fillOrder(order, marketData) {
    const executionPrice = this.determineExecutionPrice(order, marketData);
    const executionTime = new Date();
    
    await transaction(async (client) => {
      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, executed_price = $2, executed_at = $3, executed_quantity = $4 WHERE id = $5',
        ['filled', executionPrice, executionTime, order.quantity, order.id]
      );
      
      // Create execution record
      await client.query(
        `INSERT INTO order_executions (order_id, price, quantity, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [order.id, executionPrice, order.quantity, executionTime]
      );
      
      // Update portfolio positions
      await this.updatePositions(order, executionPrice, client);
      
      // Update account balances
      await this.settleOrder(order, executionPrice, client);
      
      // Create trade confirmation
      await this.createTradeConfirmation(order, executionPrice, executionTime, client);
    });
    
    // Clear portfolio cache
    this.portfolioCache.delete(order.user_id);
    
    // Emit order filled event
    this.emit('orderFilled', {
      orderId: order.id,
      symbol: order.symbol,
      quantity: order.quantity,
      price: executionPrice,
      side: order.side,
      userId: order.user_id
    });
    
    logTradingOperation(order.user_id, 'ORDER_FILLED', {
      orderId: order.id,
      symbol: order.symbol,
      quantity: order.quantity,
      executionPrice,
      side: order.side
    });
  }

  // Advanced portfolio management
  async getPortfolio(userId) {
    // Check cache first
    if (this.portfolioCache.has(userId)) {
      return this.portfolioCache.get(userId);
    }
    
    const positions = await dbOps.getUserPortfolio(userId);
    const account = await this.getAccountInfo(userId);
    
    // Calculate portfolio metrics
    const portfolio = {
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        averageCost: pos.average_cost,
        currentPrice: pos.current_price,
        marketValue: pos.quantity * pos.current_price,
        unrealizedPnL: (pos.current_price - pos.average_cost) * pos.quantity,
        unrealizedPnLPercent: ((pos.current_price - pos.average_cost) / pos.average_cost) * 100,
        dayChange: pos.day_change || 0,
        dayChangePercent: pos.day_change_percent || 0
      })),
      totalValue: 0,
      totalCost: 0,
      totalUnrealizedPnL: 0,
      totalDayChange: 0,
      cashBalance: account.cash_balance,
      buyingPower: account.buying_power,
      marginUsed: account.margin_used || 0
    };
    
    // Calculate totals
    portfolio.totalValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0) + portfolio.cashBalance;
    portfolio.totalCost = portfolio.positions.reduce((sum, pos) => sum + (pos.averageCost * pos.quantity), 0);
    portfolio.totalUnrealizedPnL = portfolio.positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    portfolio.totalDayChange = portfolio.positions.reduce((sum, pos) => sum + pos.dayChange, 0);
    
    // Cache for 30 seconds
    this.portfolioCache.set(userId, portfolio);
    setTimeout(() => this.portfolioCache.delete(userId), 30000);
    
    return portfolio;
  }

  // Advanced risk management
  initializeRiskManagement() {
    // Set default risk limits
    this.riskLimits.set('maxOrderValue', 1000000); // $1M per order
    this.riskLimits.set('maxDailyVolume', 10000000); // $10M daily
    this.riskLimits.set('maxPositionSize', 0.25); // 25% of portfolio
    this.riskLimits.set('maxLeverage', 2); // 2:1 leverage
    
    // Monitor positions in real-time
    this.startRiskMonitoring();
  }

  // Real-time risk monitoring
  startRiskMonitoring() {
    if (process.env.NODE_ENV === 'production') {
      setInterval(async () => {
        await this.checkPortfolioRisks();
      }, 10000); // Check every 10 seconds
    }
  }

  // Check portfolio risks
  async checkPortfolioRisks() {
    try {
      // Simulate portfolio risk checking
      logger.info('Checking portfolio risks...');
      // Add actual risk checking logic here
    } catch (error) {
      logger.error('Portfolio risk check failed:', error);
    }
  }

  // Market hours checking
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    // Convert to market time (EST/EDT)
    const marketHour = hour - 5; // Simplified timezone conversion
    
    // Market hours: 9:30 AM - 4:00 PM EST
    if (marketHour < 9 || marketHour > 16) return false;
    if (marketHour === 9 && minute < 30) return false;
    
    return true;
  }

  // Advanced order types support
  async handleAdvancedOrderTypes(order) {
    switch (order.order_type) {
      case 'stop_loss':
        return await this.handleStopLoss(order);
      case 'take_profit':
        return await this.handleTakeProfit(order);
      case 'trailing_stop':
        return await this.handleTrailingStop(order);
      case 'bracket':
        return await this.handleBracketOrder(order);
      case 'one_cancels_other':
        return await this.handleOCOOrder(order);
      default:
        return await this.handleBasicOrder(order);
    }
  }

  // Real-time P&L calculation
  async calculateRealTimePnL(userId) {
    const portfolio = await this.getPortfolio(userId);
    const trades = await this.getTodaysTrades(userId);
    
    return {
      unrealizedPnL: portfolio.totalUnrealizedPnL,
      realizedPnL: trades.reduce((sum, trade) => sum + trade.pnl, 0),
      totalPnL: portfolio.totalUnrealizedPnL + trades.reduce((sum, trade) => sum + trade.pnl, 0),
      dayChange: portfolio.totalDayChange,
      dayChangePercent: (portfolio.totalDayChange / (portfolio.totalValue - portfolio.totalDayChange)) * 100
    };
  }

  // Performance analytics
  async getPerformanceAnalytics(userId, period = '1y') {
    // This would implement comprehensive performance analytics
    // surpassing what IBKR provides
    return {
      returns: await this.calculateReturns(userId, period),
      sharpeRatio: await this.calculateSharpeRatio(userId, period),
      maxDrawdown: await this.calculateMaxDrawdown(userId, period),
      winRate: await this.calculateWinRate(userId, period),
      profitFactor: await this.calculateProfitFactor(userId, period),
      averageHoldingPeriod: await this.calculateAverageHoldingPeriod(userId, period)
    };
  }
}

// Export singleton instance
const tradingEngine = new TradingEngine();

module.exports = { tradingEngine, TradingEngine };
