const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class MarketDataProcessor extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.processingSessions = new Map();
    this.availableSymbols = new Map();
    this.dataCache = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadAvailableSymbols();
      logger.info('Market Data Processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Market Data Processor:', error);
      throw error;
    }
  }

  async loadAvailableSymbols() {
    try {
      const symbols = [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'equity' },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', type: 'etf' },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf' },
        { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE', type: 'etf' },
        { symbol: 'GLD', name: 'SPDR Gold Trust', exchange: 'NYSE', type: 'etf' },
        { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', exchange: 'NASDAQ', type: 'etf' },
        { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE', type: 'etf' },
        { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', exchange: 'NYSE', type: 'etf' }
      ];

      for (const symbol of symbols) {
        this.availableSymbols.set(symbol.symbol, symbol);
      }

      logger.info(`Loaded ${symbols.length} available symbols`);
    } catch (error) {
      logger.error('Error loading available symbols:', error);
    }
  }

  async processMarketData(data, user) {
    try {
      const { symbol, dataType, rawData, processingOptions } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        symbol: symbol,
        dataType: dataType || 'price',
        rawData: rawData,
        processingOptions: processingOptions || {},
        status: 'processing',
        createdAt: new Date(),
        results: null
      };

      this.processingSessions.set(session.id, session);

      // Validate symbol
      if (!this.availableSymbols.has(symbol)) {
        throw new Error(`Symbol ${symbol} not found`);
      }

      // Process market data based on type
      const results = await this.processDataByType(session);
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeProcessingResults(session);

      // Emit completion event
      this.emit('dataProcessed', {
        sessionId: session.id,
        userId: user.id,
        symbol: symbol,
        results: results
      });

      logger.info(`Market data processing completed for symbol ${symbol}`);

      return {
        sessionId: session.id,
        symbol: symbol,
        results: results,
        summary: this.generateProcessingSummary(results)
      };
    } catch (error) {
      logger.error('Market data processing error:', error);
      throw error;
    }
  }

  async processDataByType(session) {
    try {
      const { dataType, rawData, processingOptions } = session;
      
      switch (dataType) {
        case 'price':
          return await this.processPriceData(rawData, processingOptions);
        case 'volume':
          return await this.processVolumeData(rawData, processingOptions);
        case 'ohlc':
          return await this.processOHLCData(rawData, processingOptions);
        case 'tick':
          return await this.processTickData(rawData, processingOptions);
        case 'orderbook':
          return await this.processOrderBookData(rawData, processingOptions);
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
    } catch (error) {
      logger.error(`Error processing data type ${session.dataType}:`, error);
      throw error;
    }
  }

  async processPriceData(rawData, options) {
    try {
      const results = {
        type: 'price',
        processed: [],
        statistics: {},
        anomalies: [],
        processedAt: new Date()
      };

      // Process price data
      for (const dataPoint of rawData) {
        const processed = {
          timestamp: new Date(dataPoint.timestamp),
          price: parseFloat(dataPoint.price),
          volume: parseInt(dataPoint.volume) || 0,
          bid: parseFloat(dataPoint.bid) || null,
          ask: parseFloat(dataPoint.ask) || null,
          spread: null
        };

        // Calculate spread if bid and ask available
        if (processed.bid && processed.ask) {
          processed.spread = processed.ask - processed.bid;
        }

        results.processed.push(processed);
      }

      // Calculate statistics
      results.statistics = this.calculatePriceStatistics(results.processed);

      // Detect anomalies
      results.anomalies = this.detectPriceAnomalies(results.processed, options);

      return results;
    } catch (error) {
      logger.error('Error processing price data:', error);
      throw error;
    }
  }

  async processVolumeData(rawData, options) {
    try {
      const results = {
        type: 'volume',
        processed: [],
        statistics: {},
        anomalies: [],
        processedAt: new Date()
      };

      // Process volume data
      for (const dataPoint of rawData) {
        const processed = {
          timestamp: new Date(dataPoint.timestamp),
          volume: parseInt(dataPoint.volume),
          price: parseFloat(dataPoint.price) || null,
          value: null
        };

        // Calculate value if price available
        if (processed.price) {
          processed.value = processed.volume * processed.price;
        }

        results.processed.push(processed);
      }

      // Calculate statistics
      results.statistics = this.calculateVolumeStatistics(results.processed);

      // Detect anomalies
      results.anomalies = this.detectVolumeAnomalies(results.processed, options);

      return results;
    } catch (error) {
      logger.error('Error processing volume data:', error);
      throw error;
    }
  }

  async processOHLCData(rawData, options) {
    try {
      const results = {
        type: 'ohlc',
        processed: [],
        statistics: {},
        anomalies: [],
        processedAt: new Date()
      };

      // Process OHLC data
      for (const dataPoint of rawData) {
        const processed = {
          timestamp: new Date(dataPoint.timestamp),
          open: parseFloat(dataPoint.open),
          high: parseFloat(dataPoint.high),
          low: parseFloat(dataPoint.low),
          close: parseFloat(dataPoint.close),
          volume: parseInt(dataPoint.volume) || 0,
          range: null,
          body: null,
          upperShadow: null,
          lowerShadow: null
        };

        // Calculate OHLC metrics
        processed.range = processed.high - processed.low;
        processed.body = Math.abs(processed.close - processed.open);
        processed.upperShadow = processed.high - Math.max(processed.open, processed.close);
        processed.lowerShadow = Math.min(processed.open, processed.close) - processed.low;

        results.processed.push(processed);
      }

      // Calculate statistics
      results.statistics = this.calculateOHLCStatistics(results.processed);

      // Detect anomalies
      results.anomalies = this.detectOHLCAnomalies(results.processed, options);

      return results;
    } catch (error) {
      logger.error('Error processing OHLC data:', error);
      throw error;
    }
  }

  async processTickData(rawData, options) {
    try {
      const results = {
        type: 'tick',
        processed: [],
        statistics: {},
        anomalies: [],
        processedAt: new Date()
      };

      // Process tick data
      for (const dataPoint of rawData) {
        const processed = {
          timestamp: new Date(dataPoint.timestamp),
          price: parseFloat(dataPoint.price),
          volume: parseInt(dataPoint.volume) || 0,
          side: dataPoint.side || 'unknown',
          tradeId: dataPoint.tradeId || null
        };

        results.processed.push(processed);
      }

      // Calculate statistics
      results.statistics = this.calculateTickStatistics(results.processed);

      // Detect anomalies
      results.anomalies = this.detectTickAnomalies(results.processed, options);

      return results;
    } catch (error) {
      logger.error('Error processing tick data:', error);
      throw error;
    }
  }

  async processOrderBookData(rawData, options) {
    try {
      const results = {
        type: 'orderbook',
        processed: [],
        statistics: {},
        anomalies: [],
        processedAt: new Date()
      };

      // Process order book data
      for (const dataPoint of rawData) {
        const processed = {
          timestamp: new Date(dataPoint.timestamp),
          bids: dataPoint.bids || [],
          asks: dataPoint.asks || [],
          bestBid: null,
          bestAsk: null,
          spread: null,
          midPrice: null
        };

        // Calculate order book metrics
        if (processed.bids.length > 0) {
          processed.bestBid = Math.max(...processed.bids.map(bid => bid.price));
        }
        if (processed.asks.length > 0) {
          processed.bestAsk = Math.min(...processed.asks.map(ask => ask.price));
        }
        if (processed.bestBid && processed.bestAsk) {
          processed.spread = processed.bestAsk - processed.bestBid;
          processed.midPrice = (processed.bestBid + processed.bestAsk) / 2;
        }

        results.processed.push(processed);
      }

      // Calculate statistics
      results.statistics = this.calculateOrderBookStatistics(results.processed);

      // Detect anomalies
      results.anomalies = this.detectOrderBookAnomalies(results.processed, options);

      return results;
    } catch (error) {
      logger.error('Error processing order book data:', error);
      throw error;
    }
  }

  calculatePriceStatistics(data) {
    if (data.length === 0) return {};

    const prices = data.map(d => d.price);
    const volumes = data.map(d => d.volume);

    return {
      count: data.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
      priceVolatility: this.calculateVolatility(prices),
      volumeVolatility: this.calculateVolatility(volumes)
    };
  }

  calculateVolumeStatistics(data) {
    if (data.length === 0) return {};

    const volumes = data.map(d => d.volume);
    const values = data.map(d => d.value).filter(v => v !== null);

    return {
      count: data.length,
      minVolume: Math.min(...volumes),
      maxVolume: Math.max(...volumes),
      avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      totalValue: values.reduce((sum, val) => sum + val, 0),
      avgValue: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
      volumeVolatility: this.calculateVolatility(volumes)
    };
  }

  calculateOHLCStatistics(data) {
    if (data.length === 0) return {};

    const opens = data.map(d => d.open);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const ranges = data.map(d => d.range);

    return {
      count: data.length,
      minOpen: Math.min(...opens),
      maxOpen: Math.max(...opens),
      minHigh: Math.min(...highs),
      maxHigh: Math.max(...highs),
      minLow: Math.min(...lows),
      maxLow: Math.max(...lows),
      minClose: Math.min(...closes),
      maxClose: Math.max(...closes),
      avgRange: ranges.reduce((sum, range) => sum + range, 0) / ranges.length,
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
    };
  }

  calculateTickStatistics(data) {
    if (data.length === 0) return {};

    const prices = data.map(d => d.price);
    const volumes = data.map(d => d.volume);
    const sides = data.map(d => d.side);

    const buyTicks = sides.filter(s => s === 'buy').length;
    const sellTicks = sides.filter(s => s === 'sell').length;

    return {
      count: data.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
      buyTicks: buyTicks,
      sellTicks: sellTicks,
      buyRatio: buyTicks / data.length,
      sellRatio: sellTicks / data.length
    };
  }

  calculateOrderBookStatistics(data) {
    if (data.length === 0) return {};

    const spreads = data.map(d => d.spread).filter(s => s !== null);
    const midPrices = data.map(d => d.midPrice).filter(m => m !== null);

    return {
      count: data.length,
      avgSpread: spreads.length > 0 ? spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length : 0,
      minSpread: spreads.length > 0 ? Math.min(...spreads) : 0,
      maxSpread: spreads.length > 0 ? Math.max(...spreads) : 0,
      avgMidPrice: midPrices.length > 0 ? midPrices.reduce((sum, price) => sum + price, 0) / midPrices.length : 0,
      spreadVolatility: spreads.length > 0 ? this.calculateVolatility(spreads) : 0
    };
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  detectPriceAnomalies(data, options) {
    const anomalies = [];
    const { threshold = 3 } = options;
    
    if (data.length < 2) return anomalies;
    
    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const stdDev = this.calculateVolatility(prices);
    
    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs((prices[i] - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index: i,
          timestamp: data[i].timestamp,
          value: prices[i],
          zScore: zScore,
          type: 'price_anomaly'
        });
      }
    }
    
    return anomalies;
  }

  detectVolumeAnomalies(data, options) {
    const anomalies = [];
    const { threshold = 3 } = options;
    
    if (data.length < 2) return anomalies;
    
    const volumes = data.map(d => d.volume);
    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const stdDev = this.calculateVolatility(volumes);
    
    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs((volumes[i] - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index: i,
          timestamp: data[i].timestamp,
          value: volumes[i],
          zScore: zScore,
          type: 'volume_anomaly'
        });
      }
    }
    
    return anomalies;
  }

  detectOHLCAnomalies(data, options) {
    const anomalies = [];
    const { threshold = 3 } = options;
    
    if (data.length < 2) return anomalies;
    
    // Check for invalid OHLC relationships
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      if (point.high < point.low || point.high < point.open || point.high < point.close ||
          point.low > point.open || point.low > point.close) {
        anomalies.push({
          index: i,
          timestamp: point.timestamp,
          type: 'invalid_ohlc',
          description: 'Invalid OHLC relationship'
        });
      }
    }
    
    return anomalies;
  }

  detectTickAnomalies(data, options) {
    const anomalies = [];
    const { threshold = 3 } = options;
    
    if (data.length < 2) return anomalies;
    
    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const stdDev = this.calculateVolatility(prices);
    
    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs((prices[i] - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index: i,
          timestamp: data[i].timestamp,
          value: prices[i],
          zScore: zScore,
          type: 'tick_anomaly'
        });
      }
    }
    
    return anomalies;
  }

  detectOrderBookAnomalies(data, options) {
    const anomalies = [];
    const { threshold = 3 } = options;
    
    if (data.length < 2) return anomalies;
    
    const spreads = data.map(d => d.spread).filter(s => s !== null);
    if (spreads.length < 2) return anomalies;
    
    const mean = spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length;
    const stdDev = this.calculateVolatility(spreads);
    
    for (let i = 0; i < data.length; i++) {
      if (data[i].spread !== null) {
        const zScore = Math.abs((data[i].spread - mean) / stdDev);
        if (zScore > threshold) {
          anomalies.push({
            index: i,
            timestamp: data[i].timestamp,
            value: data[i].spread,
            zScore: zScore,
            type: 'spread_anomaly'
          });
        }
      }
    }
    
    return anomalies;
  }

  generateProcessingSummary(results) {
    return {
      type: results.type,
      count: results.processed.length,
      anomalies: results.anomalies.length,
      statistics: results.statistics,
      processedAt: results.processedAt
    };
  }

  async getAvailableSymbols(user) {
    try {
      const symbols = Array.from(this.availableSymbols.values()).map(symbol => ({
        symbol: symbol.symbol,
        name: symbol.name,
        exchange: symbol.exchange,
        type: symbol.type
      }));

      return symbols;
    } catch (error) {
      logger.error('Error fetching available symbols:', error);
      throw error;
    }
  }

  async getMarketDataHistory(symbol, period, user) {
    try {
      // Check cache first
      const cacheKey = `market_data_${symbol}_${period.start.getTime()}_${period.end.getTime()}_${period.interval}`;
      const cached = this.dataCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.data;
      }

      // Mock implementation - in reality would query market data database
      const history = this.generateMockMarketData(symbol, period);
      
      // Cache the result
      this.dataCache.set(cacheKey, {
        data: history,
        timestamp: Date.now()
      });

      return history;
    } catch (error) {
      logger.error('Error fetching market data history:', error);
      throw error;
    }
  }

  generateMockMarketData(symbol, period) {
    const data = [];
    const start = period.start.getTime();
    const end = period.end.getTime();
    const interval = this.getIntervalMs(period.interval);
    
    for (let time = start; time <= end; time += interval) {
      data.push({
        timestamp: new Date(time),
        open: 100 + Math.random() * 20,
        high: 100 + Math.random() * 20,
        low: 100 + Math.random() * 20,
        close: 100 + Math.random() * 20,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return data;
  }

  getIntervalMs(interval) {
    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return intervals[interval] || intervals['1d'];
  }

  async processRealTimeData() {
    try {
      logger.info('Processing real-time market data...');
      
      // Get active symbols
      const activeSymbols = Array.from(this.availableSymbols.keys());
      
      for (const symbol of activeSymbols) {
        try {
          // Mock real-time data processing
          const realTimeData = this.generateMockRealTimeData(symbol);
          
          // Process the data
          await this.processMarketData({
            symbol: symbol,
            dataType: 'price',
            rawData: realTimeData
          }, { id: 'system' });
          
        } catch (error) {
          logger.error(`Error processing real-time data for ${symbol}:`, error);
        }
      }
      
      logger.info('Real-time market data processing completed');
    } catch (error) {
      logger.error('Error processing real-time data:', error);
    }
  }

  generateMockRealTimeData(symbol) {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      data.push({
        timestamp: new Date(now.getTime() - i * 1000),
        price: 100 + Math.random() * 20,
        volume: Math.floor(Math.random() * 1000),
        bid: 100 + Math.random() * 20 - 0.1,
        ask: 100 + Math.random() * 20 + 0.1
      });
    }
    
    return data;
  }

  async storeProcessingResults(session) {
    try {
      const query = `
        INSERT INTO market_data_processing (
          id, user_id, symbol, data_type, raw_data, processing_options, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.symbol,
        session.dataType,
        JSON.stringify(session.rawData),
        JSON.stringify(session.processingOptions),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing processing results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.processingSessions.clear();
      this.dataCache.clear();
      logger.info('Market Data Processor closed successfully');
    } catch (error) {
      logger.error('Error closing Market Data Processor:', error);
    }
  }
}

module.exports = MarketDataProcessor;

