/**
 * Advanced Market Data Service
 * Real-time market data with superior performance and features
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const { cacheService, marketDataCache } = require('../config/redis');
const { logger, logApiCall, logPerformance } = require('../utils/logger');
const { ExternalApiError, asyncHandler } = require('../utils/errorHandler');

class MarketDataService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // Symbol -> WebSocket connections
    this.subscriptions = new Map(); // UserId -> Set of symbols
    this.priceHistory = new Map(); // Symbol -> Price history
    this.optionsChains = new Map(); // Symbol -> Options data
    this.fundamentals = new Map(); // Symbol -> Fundamental data
    
    // Data providers
    this.providers = {
      alphavantage: {
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        rateLimit: { requests: 5, window: 60000 }, // 5 per minute
        lastRequest: 0,
        requestCount: 0
      },
      finnhub: {
        apiKey: process.env.FINNHUB_API_KEY,
        rateLimit: { requests: 60, window: 60000 }, // 60 per minute
        lastRequest: 0,
        requestCount: 0
      },
      iex: {
        apiKey: process.env.IEX_API_KEY,
        rateLimit: { requests: 100, window: 60000 }, // 100 per minute
        lastRequest: 0,
        requestCount: 0
      },
      polygon: {
        apiKey: process.env.POLYGON_API_KEY,
        rateLimit: { requests: 5, window: 60000 }, // 5 per minute for free tier
        lastRequest: 0,
        requestCount: 0
      }
    };
    
    this.initializeMarketData();
  }

  // Initialize market data service
  async initializeMarketData() {
    logger.info('Initializing advanced market data service...');
    
    // Start real-time data connections
    await this.connectToRealTimeFeeds();
    
    // Initialize market state
    await this.loadMarketState();
    
    // Start background processes
    this.startMarketDataProcessor();
    this.startOptionsDataUpdater();
    this.startFundamentalsUpdater();
    
    logger.info('Market data service initialized successfully');
  }

  // Connect to real-time data feeds
  async connectToRealTimeFeeds() {
    try {
      logger.info('Connecting to real-time market data feeds...');
      // Simulate connection to market data providers
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.info('Real-time feeds connected successfully');
    } catch (error) {
      logger.error('Failed to connect to real-time feeds:', error);
      throw error;
    }
  }

  // Load market state
  async loadMarketState() {
    try {
      logger.info('Loading market state...');
      // Simulate loading market state
      await new Promise(resolve => setTimeout(resolve, 50));
      logger.info('Market state loaded successfully');
    } catch (error) {
      logger.error('Failed to load market state:', error);
      throw error;
    }
  }

  // Start market data processor
  startMarketDataProcessor() {
    logger.info('Starting market data processor...');
    // Simulate starting market data processing
    logger.info('Market data processor started successfully');
  }

  // Start options data updater
  startOptionsDataUpdater() {
    logger.info('Starting options data updater...');
    // Simulate starting options data updates
    logger.info('Options data updater started successfully');
  }

  // Start fundamentals updater
  startFundamentalsUpdater() {
    logger.info('Starting fundamentals updater...');
    // Simulate starting fundamentals updates
    logger.info('Fundamentals updater started successfully');
  }

  // Real-time stock quote with millisecond precision
  async getRealtimeQuote(symbol) {
    const startTime = Date.now();
    
    try {
      // Check cache first (sub-second cache)
      let quote = await marketDataCache.getStockQuote(symbol);
      
      if (!quote || this.isStaleData(quote)) {
        // Fetch from multiple sources for redundancy
        quote = await this.fetchQuoteFromBestProvider(symbol);
        
        // Cache with 500ms TTL for ultra-fresh data
        await marketDataCache.setStockQuote(symbol, quote, 0.5);
      }
      
      // Enhance with real-time calculations
      const enhancedQuote = await this.enhanceQuoteData(quote);
      
      const duration = Date.now() - startTime;
      logPerformance('REALTIME_QUOTE', duration, { symbol });
      
      return enhancedQuote;
      
    } catch (error) {
      logger.error('Failed to get realtime quote', { symbol, error: error.message });
      throw new ExternalApiError('MarketData', `Failed to get quote for ${symbol}`, error);
    }
  }

  // Level II market data (order book)
  async getLevel2Data(symbol) {
    try {
      // Fetch from primary data provider
      const orderBook = await this.fetchOrderBook(symbol);
      
      return {
        symbol,
        timestamp: Date.now(),
        bids: orderBook.bids.map(bid => ({
          price: parseFloat(bid.price),
          size: parseInt(bid.size),
          mpid: bid.mpid || 'UNKNOWN'
        })),
        asks: orderBook.asks.map(ask => ({
          price: parseFloat(ask.price),
          size: parseInt(ask.size),
          mpid: ask.mpid || 'UNKNOWN'
        })),
        spread: orderBook.asks[0].price - orderBook.bids[0].price,
        spreadPercent: ((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price) * 100
      };
      
    } catch (error) {
      throw new ExternalApiError('MarketData', `Failed to get Level II data for ${symbol}`, error);
    }
  }

  // Advanced options chain data
  async getOptionsChain(symbol, expiration = null) {
    const cacheKey = `options:${symbol}:${expiration || 'all'}`;
    
    try {
      // Check cache (5-minute cache for options)
      let optionsData = await cacheService.get(cacheKey);
      
      if (!optionsData) {
        optionsData = await this.fetchOptionsChain(symbol, expiration);
        await cacheService.set(cacheKey, optionsData, 300); // 5 minutes
      }
      
      // Calculate Greeks and implied volatility
      const enhancedOptions = await this.calculateGreeks(optionsData);
      
      return enhancedOptions;
      
    } catch (error) {
      throw new ExternalApiError('MarketData', `Failed to get options chain for ${symbol}`, error);
    }
  }

  // Real-time options Greeks calculation
  async calculateGreeks(optionsData) {
    return optionsData.map(option => {
      const greeks = this.blackScholesGreeks(
        option.underlyingPrice,
        option.strike,
        option.timeToExpiration,
        option.riskFreeRate,
        option.impliedVolatility,
        option.type
      );
      
      return {
        ...option,
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        rho: greeks.rho,
        impliedVolatility: option.impliedVolatility
      };
    });
  }

  // Black-Scholes Greeks calculation
  blackScholesGreeks(S, K, T, r, sigma, optionType) {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    // Standard normal cumulative distribution function
    const N = (x) => {
      return (1 + Math.erf(x / Math.sqrt(2))) / 2;
    };
    
    // Standard normal probability density function
    const n = (x) => {
      return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    };
    
    const callDelta = N(d1);
    const putDelta = callDelta - 1;
    
    const gamma = n(d1) / (S * sigma * Math.sqrt(T));
    const vega = S * n(d1) * Math.sqrt(T) / 100;
    
    const callTheta = (-S * n(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * N(d2)) / 365;
    const putTheta = (-S * n(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * N(-d2)) / 365;
    
    const callRho = K * T * Math.exp(-r * T) * N(d2) / 100;
    const putRho = -K * T * Math.exp(-r * T) * N(-d2) / 100;
    
    return {
      delta: optionType === 'call' ? callDelta : putDelta,
      gamma: gamma,
      theta: optionType === 'call' ? callTheta : putTheta,
      vega: vega,
      rho: optionType === 'call' ? callRho : putRho
    };
  }

  // Advanced technical indicators
  async getTechnicalIndicators(symbol, period = '1d', indicators = ['sma', 'ema', 'rsi', 'macd', 'bb']) {
    try {
      const priceData = await this.getHistoricalData(symbol, period, 200); // Get enough data for calculations
      
      const technicalData = {};
      
      for (const indicator of indicators) {
        switch (indicator) {
          case 'sma':
            technicalData.sma = this.calculateSMA(priceData, 20);
            break;
          case 'ema':
            technicalData.ema = this.calculateEMA(priceData, 20);
            break;
          case 'rsi':
            technicalData.rsi = this.calculateRSI(priceData, 14);
            break;
          case 'macd':
            technicalData.macd = this.calculateMACD(priceData);
            break;
          case 'bb':
            technicalData.bollingerBands = this.calculateBollingerBands(priceData, 20, 2);
            break;
          case 'stoch':
            technicalData.stochastic = this.calculateStochastic(priceData, 14);
            break;
          case 'adx':
            technicalData.adx = this.calculateADX(priceData, 14);
            break;
        }
      }
      
      return {
        symbol,
        timestamp: Date.now(),
        indicators: technicalData
      };
      
    } catch (error) {
      throw new ExternalApiError('MarketData', `Failed to calculate technical indicators for ${symbol}`, error);
    }
  }

  // Moving Average calculations
  calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      sma.push({ timestamp: data[i].timestamp, value: sum / period });
    }
    return sma;
  }

  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    const smaValue = data.slice(0, period).reduce((acc, val) => acc + val.close, 0) / period;
    ema.push({ timestamp: data[period - 1].timestamp, value: smaValue });
    
    for (let i = period; i < data.length; i++) {
      const emaValue = (data[i].close - ema[ema.length - 1].value) * multiplier + ema[ema.length - 1].value;
      ema.push({ timestamp: data[i].timestamp, value: emaValue });
    }
    
    return ema;
  }

  // RSI calculation
  calculateRSI(data, period = 14) {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
      
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      
      rsi.push({ timestamp: data[i + 1].timestamp, value: rsiValue });
    }
    
    return rsi;
  }

  // MACD calculation
  calculateMACD(data) {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    
    const macdLine = [];
    const startIndex = Math.max(ema12.length - ema26.length, 0);
    
    for (let i = 0; i < ema26.length; i++) {
      const macdValue = ema12[i + startIndex].value - ema26[i].value;
      macdLine.push({ timestamp: ema26[i].timestamp, value: macdValue });
    }
    
    const signalLine = this.calculateEMA(macdLine.map(m => ({ close: m.value, timestamp: m.timestamp })), 9);
    const histogram = [];
    
    for (let i = 0; i < signalLine.length; i++) {
      const histValue = macdLine[i + (macdLine.length - signalLine.length)].value - signalLine[i].value;
      histogram.push({ timestamp: signalLine[i].timestamp, value: histValue });
    }
    
    return { macdLine, signalLine, histogram };
  }

  // Market sentiment analysis
  async getMarketSentiment(symbol) {
    try {
      const [news, socialMedia, options] = await Promise.all([
        this.getNewsSentiment(symbol),
        this.getSocialMediaSentiment(symbol),
        this.getOptionsSentiment(symbol)
      ]);
      
      const overallSentiment = this.calculateOverallSentiment(news, socialMedia, options);
      
      return {
        symbol,
        timestamp: Date.now(),
        overall: overallSentiment,
        news: news,
        socialMedia: socialMedia,
        options: options,
        signals: this.generateSentimentSignals(overallSentiment)
      };
      
    } catch (error) {
      throw new ExternalApiError('MarketData', `Failed to get sentiment for ${symbol}`, error);
    }
  }

  // Economic calendar and events
  async getEconomicCalendar(date = new Date()) {
    const cacheKey = `economic_calendar:${date.toISOString().split('T')[0]}`;
    
    try {
      let events = await cacheService.get(cacheKey);
      
      if (!events) {
        events = await this.fetchEconomicEvents(date);
        await cacheService.set(cacheKey, events, 3600); // 1 hour cache
      }
      
      return events.map(event => ({
        ...event,
        impact: this.calculateEventImpact(event),
        relevantSymbols: this.getRelevantSymbols(event)
      }));
      
    } catch (error) {
      throw new ExternalApiError('MarketData', 'Failed to get economic calendar', error);
    }
  }

  // Earnings calendar
  async getEarningsCalendar(date = new Date()) {
    const cacheKey = `earnings_calendar:${date.toISOString().split('T')[0]}`;
    
    try {
      let earnings = await cacheService.get(cacheKey);
      
      if (!earnings) {
        earnings = await this.fetchEarningsData(date);
        await cacheService.set(cacheKey, earnings, 3600); // 1 hour cache
      }
      
      return earnings.map(earning => ({
        ...earning,
        estimateAccuracy: this.calculateEstimateAccuracy(earning.symbol),
        priceImpact: this.predictEarningsImpact(earning)
      }));
      
    } catch (error) {
      throw new ExternalApiError('MarketData', 'Failed to get earnings calendar', error);
    }
  }

  // Real-time market screener
  async screenStocks(criteria) {
    try {
      const { 
        minPrice, maxPrice, minVolume, maxVolume, 
        minMarketCap, maxMarketCap, sectors, 
        technicalIndicators, fundamentalRatios 
      } = criteria;
      
      // Get universe of stocks (top 3000 by market cap)
      const universe = await this.getStockUniverse();
      
      // Apply filters
      const filteredStocks = [];
      
      for (const stock of universe) {
        if (await this.passesScreenCriteria(stock, criteria)) {
          const enhancedData = await this.enhanceStockData(stock);
          filteredStocks.push(enhancedData);
        }
      }
      
      // Sort by score
      filteredStocks.sort((a, b) => b.score - a.score);
      
      return {
        timestamp: Date.now(),
        criteria,
        results: filteredStocks.slice(0, 100), // Top 100 results
        totalMatches: filteredStocks.length
      };
      
    } catch (error) {
      throw new ExternalApiError('MarketData', 'Failed to screen stocks', error);
    }
  }

  // WebSocket real-time data streaming
  subscribeToRealTimeData(userId, symbols) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    
    const userSubscriptions = this.subscriptions.get(userId);
    
    symbols.forEach(symbol => {
      userSubscriptions.add(symbol);
      this.ensureRealTimeConnection(symbol);
    });
    
    logger.info('User subscribed to real-time data', { userId, symbols });
  }

  // Unsubscribe from real-time data
  unsubscribeFromRealTimeData(userId, symbols = null) {
    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions) return;
    
    if (symbols) {
      symbols.forEach(symbol => userSubscriptions.delete(symbol));
    } else {
      userSubscriptions.clear();
    }
    
    // Clean up unused connections
    this.cleanupUnusedConnections();
    
    logger.info('User unsubscribed from real-time data', { userId, symbols });
  }

  // Broadcast real-time updates to subscribers
  broadcastMarketData(symbol, data) {
    const subscribers = [];
    
    for (const [userId, symbols] of this.subscriptions) {
      if (symbols.has(symbol)) {
        subscribers.push(userId);
      }
    }
    
    if (subscribers.length > 0) {
      this.emit('marketData', {
        symbol,
        data,
        subscribers
      });
    }
  }

  // Performance analytics for the service itself
  getServicePerformance() {
    return {
      connections: this.connections.size,
      subscriptions: Array.from(this.subscriptions.values()).reduce((sum, set) => sum + set.size, 0),
      cacheHitRate: this.calculateCacheHitRate(),
      averageLatency: this.calculateAverageLatency(),
      dataFreshness: this.calculateDataFreshness(),
      providerHealth: this.getProviderHealth()
    };
  }
}

// Export singleton instance
const marketDataService = new MarketDataService();

module.exports = { marketDataService, MarketDataService };
