const { EventEmitter } = require('events');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');

class MarketDataProvider extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.isRunning = false;
    this.dataCache = new Map();
    this.subscriptions = new Map();
    this.lastUpdate = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.isRunning = true;
      this.startDataUpdateLoop();
      logger.info('Market Data Provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Market Data Provider:', error);
      throw error;
    }
  }

  async getRealTimeData(portfolioId) {
    try {
      // In a real implementation, this would fetch real market data
      // For now, we'll return simulated data
      const symbols = await this.getPortfolioSymbols(portfolioId);
      const marketData = {};
      
      for (const symbol of symbols) {
        marketData[symbol] = await this.getSymbolData(symbol);
      }
      
      return marketData;
    } catch (error) {
      logger.error(`Error getting real-time data for portfolio ${portfolioId}:`, error);
      return {};
    }
  }

  async getSymbolData(symbol) {
    try {
      // Check cache first
      const cached = this.dataCache.get(symbol);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < 5000) { // 5 second cache
        return cached.data;
      }
      
      // Generate simulated data
      const data = this.generateSimulatedData(symbol);
      
      // Cache the data
      this.dataCache.set(symbol, {
        data: data,
        timestamp: now
      });
      
      return data;
    } catch (error) {
      logger.error(`Error getting symbol data for ${symbol}:`, error);
      return null;
    }
  }

  generateSimulatedData(symbol) {
    try {
      // Get previous data or generate base values
      const previous = this.dataCache.get(symbol);
      const basePrice = previous ? previous.data.price : (100 + Math.random() * 50);
      
      // Generate realistic price movement
      const volatility = this.getSymbolVolatility(symbol);
      const change = (Math.random() - 0.5) * volatility;
      const newPrice = basePrice * (1 + change);
      
      const data = {
        symbol: symbol,
        price: parseFloat(newPrice.toFixed(2)),
        change: parseFloat((newPrice - basePrice).toFixed(2)),
        changePercent: parseFloat(((newPrice - basePrice) / basePrice * 100).toFixed(2)),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        bid: parseFloat((newPrice * 0.999).toFixed(2)),
        ask: parseFloat((newPrice * 1.001).toFixed(2)),
        spread: parseFloat((newPrice * 0.002).toFixed(4)),
        volatility: volatility,
        timestamp: new Date().toISOString()
      };
      
      return data;
    } catch (error) {
      logger.error(`Error generating simulated data for ${symbol}:`, error);
      return null;
    }
  }

  getSymbolVolatility(symbol) {
    // Different symbols have different volatility characteristics
    const volatilityMap = {
      'AAPL': 0.02,
      'GOOGL': 0.025,
      'MSFT': 0.018,
      'TSLA': 0.05,
      'AMZN': 0.03,
      'META': 0.04,
      'NVDA': 0.06
    };
    
    return volatilityMap[symbol] || 0.02; // Default 2% volatility
  }

  async getPortfolioSymbols(portfolioId) {
    try {
      // In a real implementation, this would query the database
      // For now, return mock symbols
      return ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    } catch (error) {
      logger.error(`Error getting portfolio symbols for ${portfolioId}:`, error);
      return [];
    }
  }

  startDataUpdateLoop() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    const loop = async () => {
      if (!this.isRunning) return;
      
      try {
        // Update data for all cached symbols
        for (const symbol of this.dataCache.keys()) {
          await this.updateSymbolData(symbol);
        }
      } catch (error) {
        logger.error('Error in data update loop:', error);
      }
      
      // Run every 5 seconds
      setTimeout(loop, 5000);
    };
    
    loop();
  }

  async updateSymbolData(symbol) {
    try {
      const data = await this.getSymbolData(symbol);
      if (data) {
        // Store in Redis for persistence
        await this.storeDataInRedis(symbol, data);
        
        // Emit update event
        this.emit('dataUpdate', { symbol, data });
      }
    } catch (error) {
      logger.error(`Error updating symbol data for ${symbol}:`, error);
    }
  }

  async storeDataInRedis(symbol, data) {
    try {
      const key = `market_data:${symbol}`;
      await this.redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
      
      // Also store in time series
      const timeSeriesKey = `market_data_ts:${symbol}`;
      await this.redis.zadd(timeSeriesKey, Date.now(), JSON.stringify(data));
      
      // Keep only last 1000 data points
      await this.redis.zremrangebyrank(timeSeriesKey, 0, -1001);
    } catch (error) {
      logger.error(`Error storing data in Redis for ${symbol}:`, error);
    }
  }

  async getHistoricalData(symbol, timeframe = '1d', limit = 1000) {
    try {
      const timeSeriesKey = `market_data_ts:${symbol}`;
      const data = await this.redis.zrevrange(timeSeriesKey, 0, limit - 1);
      
      return data.map(item => JSON.parse(item)).reverse();
    } catch (error) {
      logger.error(`Error getting historical data for ${symbol}:`, error);
      return [];
    }
  }

  async getMarketStatus() {
    try {
      // In a real implementation, this would check actual market hours
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Simple market hours check (9:30 AM - 4:00 PM EST, Monday-Friday)
      const isMarketOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;
      
      return {
        isOpen: isMarketOpen,
        nextOpen: this.getNextMarketOpen(),
        nextClose: this.getNextMarketClose(),
        timezone: 'EST'
      };
    } catch (error) {
      logger.error('Error getting market status:', error);
      return {
        isOpen: false,
        nextOpen: null,
        nextClose: null,
        timezone: 'EST'
      };
    }
  }

  getNextMarketOpen() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);
    return tomorrow;
  }

  getNextMarketClose() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(16, 0, 0, 0);
    
    if (now < today) {
      return today;
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  }

  async close() {
    try {
      this.isRunning = false;
      this.dataCache.clear();
      logger.info('Market Data Provider closed successfully');
    } catch (error) {
      logger.error('Error closing Market Data Provider:', error);
    }
  }
}

module.exports = MarketDataProvider;

