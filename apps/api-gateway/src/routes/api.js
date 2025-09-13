/**
 * API Routes - Enterprise Brokerage Platform
 * Advanced trading, risk management, and compliance endpoints
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { logBusinessOperation } = require('../utils/logger');

// Define validation schemas inline
const schemas = {
  prepareSlideOrder: Joi.object({
    orderData: Joi.object({
      symbol: Joi.string().required(),
      side: Joi.string().valid('BUY', 'SELL').required(),
      quantity: Joi.number().positive().required(),
      orderType: Joi.string().valid('MARKET', 'LIMIT').required(),
      price: Joi.number().positive().when('orderType', { is: 'LIMIT', then: Joi.required() }),
      timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK').default('GTC')
    }).required(),
    options: Joi.object({
      riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
      biometricRequired: Joi.boolean().default(false),
      deviceVerificationRequired: Joi.boolean().default(true)
    }).default({})
  }),
  
  executeSlideOrder: Joi.object({
    slideToken: Joi.string().required(),
    slideData: Joi.object({
      path: Joi.array().items(Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        timestamp: Joi.number().required()
      })).required(),
      velocityPoints: Joi.array().items(Joi.number()).required(),
      startTime: Joi.number().required(),
      endTime: Joi.number().required(),
      distance: Joi.number().required(),
      duration: Joi.number().required(),
      velocity: Joi.number().required()
    }).required()
  }),

  placeOrder: Joi.object({
    symbol: Joi.string().required(),
    side: Joi.string().valid('BUY', 'SELL').required(),
    quantity: Joi.number().positive().required(),
    orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT').required(),
    price: Joi.number().positive().when('orderType', { 
      is: Joi.string().valid('LIMIT', 'STOP_LIMIT'), 
      then: Joi.required() 
    }),
    stopPrice: Joi.number().positive().when('orderType', { 
      is: Joi.string().valid('STOP', 'STOP_LIMIT'), 
      then: Joi.required() 
    }),
    timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK').default('GTC')
  }),

  portfolioQuery: Joi.object({
    includePositions: Joi.boolean().default(true),
    includePendingOrders: Joi.boolean().default(true),
    includeHistory: Joi.boolean().default(false)
  })
};

// Simple validation middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  next();
};

// Import services
const { tradingEngine } = require('../services/tradingEngine');
const { marketDataService } = require('../services/marketDataService');
const { riskManagementSystem } = require('../services/riskManagementSystem');
const { complianceSystem } = require('../services/complianceSystem');
const { orderManagementSystem } = require('../services/orderManagementSystem');
const { notificationSystem } = require('../services/notificationSystem');
const { slideToExecuteService } = require('../services/slideToExecuteService');

// =============================================
// SLIDE-TO-EXECUTE ENDPOINTS
// =============================================

// Prepare order for slide execution
router.post('/orders/slide/prepare', validate(schemas.prepareSlideOrder), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { orderData, options = {} } = req.body;
    
    // Add request metadata
    options.userAgent = req.get('User-Agent');
    options.ipAddress = req.ip;
    options.deviceFingerprint = req.headers['x-device-fingerprint'];
    
    const slidePreparation = await slideToExecuteService.prepareSlideOrder(userId, orderData, options);
    
    res.json({
      success: true,
      data: slidePreparation
    });
    
  } catch (error) {
    next(error);
  }
});

// Execute order via slide
router.post('/orders/slide/execute', validate(schemas.executeSlideOrder), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { slideToken, slideData } = req.body;
    
    // Add security metadata
    slideData.sessionToken = req.sessionID;
    slideData.timestamp = Date.now();
    slideData.userAgent = req.get('User-Agent');
    slideData.ipAddress = req.ip;
    
    const executionResult = await slideToExecuteService.executeSlideOrder(userId, slideToken, slideData);
    
    res.json({
      success: true,
      data: executionResult
    });
    
  } catch (error) {
    next(error);
  }
});

// Cancel slide order
router.delete('/orders/slide/:slideToken', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { slideToken } = req.params;
    const { reason = 'USER_CANCELLED' } = req.body;
    
    const cancellationResult = await slideToExecuteService.cancelSlideOrder(userId, slideToken, reason);
    
    res.json({
      success: true,
      data: cancellationResult
    });
    
  } catch (error) {
    next(error);
  }
});

// Get slide analytics
router.get('/orders/slide/analytics', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const analytics = slideToExecuteService.getSlideAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// TRADING ENDPOINTS
// =============================================

// Submit order with comprehensive checks
router.post('/orders', validate(schemas.placeOrder), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const orderData = req.body;
    
    // Risk management pre-check
    const riskCheck = await riskManagementSystem.preOrderRiskCheck(userId, orderData);
    if (!riskCheck.approved) {
      return res.status(400).json({
        success: false,
        error: 'Order rejected by risk management',
        details: riskCheck
      });
    }
    
    // Compliance checks
    if (orderData.securityType === 'OPTION') {
      const suitabilityCheck = await complianceSystem.assessOptionsSuitability(userId, orderData);
      if (!suitabilityCheck.suitable) {
        return res.status(400).json({
          success: false,
          error: 'Order rejected due to suitability requirements',
          details: suitabilityCheck
        });
      }
    }
    
    // PDT compliance check
    const pdtCheck = await complianceSystem.checkPDTCompliance(userId, orderData);
    if (!pdtCheck.compliant) {
      return res.status(400).json({
        success: false,
        error: 'Order violates Pattern Day Trading rules',
        details: pdtCheck
      });
    }
    
    // Submit order through OMS
    const result = await orderManagementSystem.submitOrder(userId, orderData);
    
    // Send notification
    await notificationSystem.sendNotification(userId, 'ORDER_FILLED', {
      orderId: result.orderId,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity
    });
    
    logBusinessOperation('ORDER_SUBMITTED', {
      orderId: result.orderId,
      symbol: orderData.symbol,
      latency: result.latency
    }, userId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.delete('/orders/:orderId', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;
    
    const result = await orderManagementSystem.cancelOrder(userId, orderId);
    
    await notificationSystem.sendNotification(userId, 'ORDER_CANCELLED', {
      orderId,
      status: result.status
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    next(error);
  }
});

// Modify order
router.put('/orders/:orderId', validate(schemas.placeOrder), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;
    const modifications = req.body;
    
    const result = await orderManagementSystem.modifyOrder(userId, orderId, modifications);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    next(error);
  }
});

// Get order status
router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderStatus = orderManagementSystem.getOrderStatus(orderId);
    
    if (!orderStatus) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: orderStatus
    });
    
  } catch (error) {
    next(error);
  }
});

// Get order history
router.get('/orders', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { limit = 50, offset = 0 } = req.query;
    
    const orders = await orderManagementSystem.getOrderHistory(userId, parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: orders
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// MARKET DATA ENDPOINTS
// =============================================

// Get real-time quote
router.get('/market/quote/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const quote = await marketDataService.getRealtimeQuote(symbol);
    
    res.json({
      success: true,
      data: quote
    });
    
  } catch (error) {
    next(error);
  }
});

// Get Level II market data
router.get('/market/level2/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const level2Data = await marketDataService.getLevel2Data(symbol);
    
    res.json({
      success: true,
      data: level2Data
    });
    
  } catch (error) {
    next(error);
  }
});

// Get options chain
router.get('/market/options/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { expiration } = req.query;
    
    const optionsChain = await marketDataService.getOptionsChain(symbol, expiration);
    
    res.json({
      success: true,
      data: optionsChain
    });
    
  } catch (error) {
    next(error);
  }
});

// Get technical indicators
router.get('/market/technicals/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { period = '1d', indicators } = req.query;
    
    const indicatorList = indicators ? indicators.split(',') : ['sma', 'ema', 'rsi', 'macd'];
    const technicalData = await marketDataService.getTechnicalIndicators(symbol, period, indicatorList);
    
    res.json({
      success: true,
      data: technicalData
    });
    
  } catch (error) {
    next(error);
  }
});

// Get market sentiment
router.get('/market/sentiment/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const sentiment = await marketDataService.getMarketSentiment(symbol);
    
    res.json({
      success: true,
      data: sentiment
    });
    
  } catch (error) {
    next(error);
  }
});

// Stock screener
router.post('/market/screen', async (req, res, next) => {
  try {
    const criteria = req.body;
    const screenResults = await marketDataService.screenStocks(criteria);
    
    res.json({
      success: true,
      data: screenResults
    });
    
  } catch (error) {
    next(error);
  }
});

// Economic calendar
router.get('/market/economic-calendar', async (req, res, next) => {
  try {
    const { date } = req.query;
    const calendarDate = date ? new Date(date) : new Date();
    
    const events = await marketDataService.getEconomicCalendar(calendarDate);
    
    res.json({
      success: true,
      data: events
    });
    
  } catch (error) {
    next(error);
  }
});

// Earnings calendar
router.get('/market/earnings', async (req, res, next) => {
  try {
    const { date } = req.query;
    const calendarDate = date ? new Date(date) : new Date();
    
    const earnings = await marketDataService.getEarningsCalendar(calendarDate);
    
    res.json({
      success: true,
      data: earnings
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// RISK MANAGEMENT ENDPOINTS
// =============================================

// Get portfolio risk analysis
router.get('/risk/portfolio', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const portfolioRisk = await riskManagementSystem.analyzePortfolioRisk(userId);
    
    res.json({
      success: true,
      data: portfolioRisk
    });
    
  } catch (error) {
    next(error);
  }
});

// Get position risk
router.get('/risk/position/:positionId', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { positionId } = req.params;
    
    const positionRisk = await riskManagementSystem.monitorPositionRisk(userId, positionId);
    
    res.json({
      success: true,
      data: positionRisk
    });
    
  } catch (error) {
    next(error);
  }
});

// Perform stress test
router.post('/risk/stress-test', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { scenarios } = req.body;
    
    const stressResults = await riskManagementSystem.performStressTest(userId, scenarios);
    
    res.json({
      success: true,
      data: stressResults
    });
    
  } catch (error) {
    next(error);
  }
});

// Calculate optimal position size
router.post('/risk/position-size', async (req, res, next) => {
  try {
    const { symbol, riskTolerance } = req.body;
    const { userId } = req.user;
    
    // Get account equity
    const accountState = await riskManagementSystem.getAccountState(userId);
    const marketData = await marketDataService.getRealtimeQuote(symbol);
    
    const positionSize = riskManagementSystem.calculateOptimalPositionSize(
      accountState.totalEquity,
      symbol,
      marketData,
      riskTolerance
    );
    
    res.json({
      success: true,
      data: positionSize
    });
    
  } catch (error) {
    next(error);
  }
});

// Generate risk report
router.get('/risk/report', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { type = 'comprehensive' } = req.query;
    
    const riskReport = await riskManagementSystem.generateRiskReport(userId, type);
    
    res.json({
      success: true,
      data: riskReport
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// NOTIFICATION ENDPOINTS
// =============================================

// Create price alert
router.post('/alerts/price', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { symbol, condition, targetPrice, options } = req.body;
    
    const alert = await notificationSystem.createPriceAlert(userId, symbol, condition, targetPrice, options);
    
    res.json({
      success: true,
      data: alert
    });
    
  } catch (error) {
    next(error);
  }
});

// Get notification history
router.get('/notifications', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { limit = 50, offset = 0, type, priority } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    
    const notifications = await notificationSystem.getNotificationHistory(userId, parseInt(limit), parseInt(offset), filters);
    
    res.json({
      success: true,
      data: notifications
    });
    
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/notifications/preferences', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const preferences = req.body;
    
    const updatedPreferences = await notificationSystem.updateUserPreferences(userId, preferences);
    
    res.json({
      success: true,
      data: updatedPreferences
    });
    
  } catch (error) {
    next(error);
  }
});

// Get notification analytics
router.get('/notifications/analytics', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { timeframe = '30d' } = req.query;
    
    const analytics = await notificationSystem.getNotificationAnalytics(userId, timeframe);
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// COMPLIANCE ENDPOINTS
// =============================================

// Submit KYC documentation
router.post('/compliance/kyc', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const kycData = req.body;
    
    const verification = await complianceSystem.performKYCVerification(userId, kycData);
    
    // Send notification about KYC status
    await notificationSystem.sendNotification(userId, 'KYC_REQUIRED', {
      status: verification.status,
      riskLevel: verification.riskLevel
    });
    
    res.json({
      success: true,
      data: verification
    });
    
  } catch (error) {
    next(error);
  }
});

// Get compliance dashboard (admin only)
router.get('/compliance/dashboard', async (req, res, next) => {
  try {
    // Only for admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    const dashboard = await complianceSystem.getComplianceDashboard();
    
    res.json({
      success: true,
      data: dashboard
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// PORTFOLIO ENDPOINTS
// =============================================

// Get portfolio overview
router.get('/portfolio', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const portfolio = await tradingEngine.getPortfolio(userId);
    
    res.json({
      success: true,
      data: portfolio
    });
    
  } catch (error) {
    next(error);
  }
});

// Get positions
router.get('/portfolio/positions', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const positions = await tradingEngine.getPositions(userId);
    
    res.json({
      success: true,
      data: positions
    });
    
  } catch (error) {
    next(error);
  }
});

// Get portfolio performance
router.get('/portfolio/performance', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { timeframe = '1y' } = req.query;
    
    const performance = await tradingEngine.getPortfolioPerformance(userId, timeframe);
    
    res.json({
      success: true,
      data: performance
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// ACCOUNT ENDPOINTS
// =============================================

// Get account information
router.get('/account', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const account = await tradingEngine.getAccountInfo(userId);
    
    res.json({
      success: true,
      data: account
    });
    
  } catch (error) {
    next(error);
  }
});

// Get trading statistics
router.get('/account/stats', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { timeframe = '1y' } = req.query;
    
    const stats = await tradingEngine.getTradingStatistics(userId, timeframe);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    next(error);
  }
});

// =============================================
// SYSTEM STATUS ENDPOINTS
// =============================================

// Get system performance metrics
router.get('/system/performance', async (req, res, next) => {
  try {
    // Only for admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    const metrics = {
      orderManagement: orderManagementSystem.getPerformanceMetrics(),
      marketData: marketDataService.getServicePerformance(),
      tradingEngine: tradingEngine.getEngineStatus()
    };
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
