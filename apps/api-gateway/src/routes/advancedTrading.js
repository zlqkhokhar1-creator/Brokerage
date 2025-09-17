const express = require('express');
const { authenticateToken } = require('../middleware/security');
const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /api/v1/trading/orderbook/:symbol
 * @description Get real-time order book data for a symbol
 * @access Private
 */
router.get('/orderbook/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    
    // Mock order book data - replace with real market data integration
    const mockOrderBook = {
      symbol: symbol.toUpperCase(),
      bids: Array.from({ length: 10 }, (_, i) => ({
        price: 175.43 - (i + 1) * 0.01,
        size: Math.floor(Math.random() * 10000) + 1000,
        orders: Math.floor(Math.random() * 20) + 1
      })).sort((a, b) => b.price - a.price),
      asks: Array.from({ length: 10 }, (_, i) => ({
        price: 175.43 + (i + 1) * 0.01,
        size: Math.floor(Math.random() * 10000) + 1000,
        orders: Math.floor(Math.random() * 20) + 1
      })).sort((a, b) => a.price - b.price),
      spread: 0.01,
      lastPrice: 175.43,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mockOrderBook
    });
  } catch (error) {
    logger.error('Error fetching order book data:', error);
    next(error);
  }
});

/**
 * @route GET /api/v1/trading/chart/:symbol
 * @description Get historical chart data for a symbol
 * @access Private
 */
router.get('/chart/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1D', indicators = 'sma,rsi' } = req.query;
    
    // Mock chart data - replace with real market data integration
    const generateCandleData = () => {
      const data = [];
      const basePrice = 175.43;
      let currentPrice = basePrice;
      
      for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * 2;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * 0.5;
        const low = Math.min(open, close) - Math.random() * 0.5;
        const volume = Math.floor(Math.random() * 1000000) + 100000;
        
        data.push({
          time: Date.now() - (100 - i) * 60000,
          open,
          high,
          low,
          close,
          volume
        });
        
        currentPrice = close;
      }
      
      return data;
    };

    const candleData = generateCandleData();
    
    // Calculate technical indicators
    const calculateSMA = (data, period) => {
      const sma = [];
      for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
        sma.push({ time: data[i].time, value: sum / period });
      }
      return sma;
    };

    const calculateRSI = (data, period = 14) => {
      const rsi = [];
      const gains = [];
      const losses = [];
      
      for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      for (let i = period - 1; i < gains.length; i++) {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / avgLoss;
        const rsiValue = 100 - (100 / (1 + rs));
        rsi.push({ time: data[i + period - 1].time, value: rsiValue });
      }
      
      return rsi;
    };

    const indicatorsData = {};
    if (indicators.includes('sma')) {
      indicatorsData.sma20 = calculateSMA(candleData, 20);
    }
    if (indicators.includes('rsi')) {
      indicatorsData.rsi = calculateRSI(candleData);
    }

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        timeframe,
        candles: candleData,
        indicators: indicatorsData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching chart data:', error);
    next(error);
  }
});

/**
 * @route GET /api/v1/trading/market-data
 * @description Get market data for all symbols with virtual scrolling support
 * @access Private
 */
router.get('/market-data', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', sortBy = 'change', sortOrder = 'desc', sector = 'all' } = req.query;
    
    // Mock market data - replace with real market data integration
    const generateMarketData = () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'];
      const names = [
        'Apple Inc.', 'Microsoft Corp.', 'Alphabet Inc.', 'Amazon.com Inc.', 'Tesla Inc.',
        'Meta Platforms Inc.', 'NVIDIA Corp.', 'Netflix Inc.', 'Advanced Micro Devices', 'Intel Corp.'
      ];
      const sectors = ['Technology', 'Consumer Discretionary', 'Communication Services', 'Healthcare', 'Financials'];
      
      const data = [];
      
      // Generate main symbols
      symbols.forEach((symbol, index) => {
        const basePrice = 100 + Math.random() * 500;
        const change = (Math.random() - 0.5) * 20;
        const changePercent = (change / basePrice) * 100;
        
        data.push({
          symbol,
          name: names[index],
          price: basePrice,
          change,
          changePercent,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          marketCap: Math.floor(Math.random() * 2000000000000) + 100000000000,
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          isWatched: Math.random() > 0.7
        });
      });

      // Generate additional data for virtual scrolling
      for (let i = 0; i < 1000; i++) {
        const symbol = `STOCK${i.toString().padStart(4, '0')}`;
        const basePrice = 10 + Math.random() * 200;
        const change = (Math.random() - 0.5) * 10;
        const changePercent = (change / basePrice) * 100;
        
        data.push({
          symbol,
          name: `Stock ${i + 1} Inc.`,
          price: basePrice,
          change,
          changePercent,
          volume: Math.floor(Math.random() * 5000000) + 100000,
          marketCap: Math.floor(Math.random() * 100000000000) + 1000000000,
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          isWatched: Math.random() > 0.9
        });
      }

      return data;
    };

    let marketData = generateMarketData();

    // Apply filters
    if (search) {
      marketData = marketData.filter(item => 
        item.symbol.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sector !== 'all') {
      marketData = marketData.filter(item => item.sector === sector);
    }

    // Apply sorting
    marketData.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.changePercent;
          bValue = b.changePercent;
          break;
        case 'volume':
          aValue = a.volume;
          bValue = b.volume;
          break;
        case 'marketCap':
          aValue = a.marketCap;
          bValue = b.marketCap;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = marketData.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: marketData.length,
        totalPages: Math.ceil(marketData.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching market data:', error);
    next(error);
  }
});

/**
 * @route POST /api/v1/trading/position-sizing
 * @description Calculate position sizing for risk management
 * @access Private
 */
router.post('/position-sizing', async (req, res, next) => {
  try {
    const { accountBalance, riskPercentage, entryPrice, stopLoss, takeProfit, calculationMethod } = req.body;
    
    const riskAmount = calculationMethod === 'percentage' 
      ? (accountBalance * riskPercentage) / 100
      : req.body.riskPerTrade || 200;

    const priceRisk = Math.abs(entryPrice - stopLoss);
    const positionSize = Math.floor(riskAmount / priceRisk);
    const dollarAmount = positionSize * entryPrice;
    const rewardRiskRatio = Math.abs(takeProfit - entryPrice) / priceRisk;
    const maxLoss = positionSize * priceRisk;
    const maxGain = positionSize * Math.abs(takeProfit - entryPrice);

    res.json({
      success: true,
      data: {
        positionSize,
        dollarAmount,
        riskAmount,
        stopLossPrice: stopLoss,
        rewardRiskRatio,
        maxLoss,
        maxGain,
        warnings: []
      }
    });
  } catch (error) {
    logger.error('Error calculating position sizing:', error);
    next(error);
  }
});

/**
 * @route GET /api/v1/trading/notifications
 * @description Get user notifications
 * @access Private
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = 'all', limit = 50 } = req.query;

    // Mock notifications - replace with real database query
    const mockNotifications = [
      {
        id: '1',
        type: 'trade',
        title: 'Order Filled',
        message: 'Your buy order for 100 shares of AAPL at $175.43 has been filled.',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/dashboard/trading',
        data: { symbol: 'AAPL', quantity: 100, price: 175.43 }
      },
      {
        id: '2',
        type: 'price_alert',
        title: 'Price Alert Triggered',
        message: 'TSLA has reached your target price of $250.00',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        actionUrl: '/dashboard/markets',
        data: { symbol: 'TSLA', targetPrice: 250.00 }
      }
    ];

    let filteredNotifications = mockNotifications;
    if (type !== 'all') {
      filteredNotifications = mockNotifications.filter(n => n.type === type);
    }

    res.json({
      success: true,
      data: filteredNotifications.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    next(error);
  }
});

/**
 * @route POST /api/v1/trading/notifications/:id/read
 * @description Mark notification as read
 * @access Private
 */
router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mock implementation - replace with real database update
    await new Promise(resolve => setTimeout(resolve, 300));

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    next(error);
  }
});

module.exports = router;
