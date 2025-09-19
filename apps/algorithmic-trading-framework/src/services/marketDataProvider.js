const { EventEmitter } = require('events');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');

class MarketDataProvider extends EventEmitter {
  constructor() {
    super();
    this.subscriptions = new Map();
    this.redis = null;
    this.isRunning = false;
    this.dataCache = new Map();
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

  async subscribe(symbol, callback) {
    try {
      if (!this.subscriptions.has(symbol)) {
        this.subscriptions.set(symbol, new Set());
      }
      
      this.subscriptions.get(symbol).add(callback);
      
      // Start data feed for this symbol if not already running
      if (this.subscriptions.get(symbol).size === 1) {
        await this.startSymbolFeed(symbol);
      }
      
      logger.info(`Subscribed to market data for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to subscribe to ${symbol}:`, error);
      throw error;
    }
  }

  async unsubscribe(symbol, callback) {
    try {
      if (this.subscriptions.has(symbol)) {
        this.subscriptions.get(symbol).delete(callback);
        
        // Stop data feed if no more subscribers
        if (this.subscriptions.get(symbol).size === 0) {
          this.subscriptions.delete(symbol);
          await this.stopSymbolFeed(symbol);
        }
      }
      
      logger.info(`Unsubscribed from market data for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to unsubscribe from ${symbol}:`, error);
      throw error;
    }
  }

  async startSymbolFeed(symbol) {
    try {
      // In a real implementation, this would connect to a market data feed
      // For now, we'll simulate data updates
      const interval = setInterval(async () => {
        if (!this.subscriptions.has(symbol)) {
          clearInterval(interval);
          return;
        }
        
        try {
          const data = await this.getMarketData(symbol);
          if (data) {
            this.broadcastData(symbol, data);
          }
        } catch (error) {
          logger.error(`Error getting market data for ${symbol}:`, error);
        }
      }, 1000); // Update every second
      
      // Store interval reference for cleanup
      this.symbolIntervals = this.symbolIntervals || new Map();
      this.symbolIntervals.set(symbol, interval);
      
    } catch (error) {
      logger.error(`Failed to start symbol feed for ${symbol}:`, error);
    }
  }

  async stopSymbolFeed(symbol) {
    try {
      if (this.symbolIntervals && this.symbolIntervals.has(symbol)) {
        clearInterval(this.symbolIntervals.get(symbol));
        this.symbolIntervals.delete(symbol);
      }
    } catch (error) {
      logger.error(`Failed to stop symbol feed for ${symbol}:`, error);
    }
  }

  async getMarketData(symbol) {
    try {
      // Check cache first
      const cached = this.dataCache.get(symbol);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < 5000) { // 5 second cache
        return cached.data;
      }
      
      // In a real implementation, this would fetch from a market data API
      // For now, we'll generate simulated data
      const data = this.generateSimulatedData(symbol);
      
      // Cache the data
      this.dataCache.set(symbol, {
        data: data,
        timestamp: now
      });
      
      return data;
    } catch (error) {
      logger.error(`Error getting market data for ${symbol}:`, error);
      return null;
    }
  }

  generateSimulatedData(symbol) {
    try {
      // Get previous data or generate base values
      const previous = this.dataCache.get(symbol);
      const basePrice = previous ? previous.data.close : (100 + Math.random() * 50);
      
      // Generate realistic price movement
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const newPrice = basePrice * (1 + change);
      
      const open = previous ? previous.data.close : newPrice;
      const high = Math.max(open, newPrice) * (1 + Math.random() * 0.01);
      const low = Math.min(open, newPrice) * (1 - Math.random() * 0.01);
      const close = newPrice;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      const data = {
        symbol: symbol,
        timestamp: new Date(),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume,
        bid: parseFloat((close * 0.999).toFixed(2)),
        ask: parseFloat((close * 1.001).toFixed(2)),
        spread: parseFloat((close * 0.002).toFixed(4))
      };
      
      return data;
    } catch (error) {
      logger.error(`Error generating simulated data for ${symbol}:`, error);
      return null;
    }
  }

  broadcastData(symbol, data) {
    try {
      const subscribers = this.subscriptions.get(symbol);
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(data);
          } catch (error) {
            logger.error(`Error in market data callback for ${symbol}:`, error);
          }
        }
      }
      
      // Store in Redis for persistence
      this.storeDataInRedis(symbol, data);
    } catch (error) {
      logger.error(`Error broadcasting data for ${symbol}:`, error);
    }
  }

  async storeDataInRedis(symbol, data) {
    try {
      const key = `market_data:${symbol}`;
      await this.redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
      
      // Also store in time series
      const timeSeriesKey = `market_data_ts:${symbol}`;
      await this.redis.zadd(timeSeriesKey, data.timestamp.getTime(), JSON.stringify(data));
      
      // Keep only last 1000 data points
      await this.redis.zremrangebyrank(timeSeriesKey, 0, -1001);
    } catch (error) {
      logger.error(`Error storing data in Redis for ${symbol}:`, error);
    }
  }

  async getHistoricalData(symbol, timeframe = '1m', limit = 1000) {
    try {
      const timeSeriesKey = `market_data_ts:${symbol}`;
      const data = await this.redis.zrevrange(timeSeriesKey, 0, limit - 1);
      
      return data.map(item => JSON.parse(item)).reverse();
    } catch (error) {
      logger.error(`Error getting historical data for ${symbol}:`, error);
      return [];
    }
  }

  async updateSymbolData(symbol) {
    try {
      const data = await this.getMarketData(symbol);
      if (data) {
        this.broadcastData(symbol, data);
      }
    } catch (error) {
      logger.error(`Error updating symbol data for ${symbol}:`, error);
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
        // Update data for all subscribed symbols
        for (const symbol of this.subscriptions.keys()) {
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

  async getSymbolInfo(symbol) {
    try {
      // In a real implementation, this would fetch from a symbol database
      return {
        symbol: symbol,
        name: `${symbol} Stock`,
        exchange: 'NASDAQ',
        currency: 'USD',
        type: 'EQUITY',
        sector: 'Technology',
        marketCap: 1000000000,
        volume: 1000000,
        lastPrice: 100.00,
        change: 1.50,
        changePercent: 1.52
      };
    } catch (error) {
      logger.error(`Error getting symbol info for ${symbol}:`, error);
      return null;
    }
  }

  async searchSymbols(query) {
    try {
      // In a real implementation, this would search a symbol database
      const mockSymbols = [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' }
      ];
      
      return mockSymbols.filter(s => 
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      logger.error(`Error searching symbols for ${query}:`, error);
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
      
      // Stop all symbol feeds
      if (this.symbolIntervals) {
        for (const [symbol, interval] of this.symbolIntervals) {
          clearInterval(interval);
        }
        this.symbolIntervals.clear();
      }
      
      // Clear subscriptions
      this.subscriptions.clear();
      this.dataCache.clear();
      
      logger.info('Market Data Provider closed successfully');
    } catch (error) {
      logger.error('Error closing Market Data Provider:', error);
    }
  }
}

module.exports = MarketDataProvider;

