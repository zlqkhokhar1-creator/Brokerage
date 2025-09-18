const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const axios = require('axios');

class MarketDataIngestionEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.dataStreams = new Map();
    this.dataSources = new Map();
    this.ingestionQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load data sources
      await this.loadDataSources();
      
      // Start ingestion queue processor
      this.startQueueProcessor();
      
      this._initialized = true;
      logger.info('MarketDataIngestionEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MarketDataIngestionEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Stop all data streams
      for (const [streamId, stream] of this.dataStreams) {
        await this.stopDataStream(streamId);
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('MarketDataIngestionEngine closed');
    } catch (error) {
      logger.error('Error closing MarketDataIngestionEngine:', error);
    }
  }

  async loadDataSources() {
    try {
      this.dataSources = new Map([
        ['alpha_vantage', {
          name: 'Alpha Vantage',
          baseUrl: 'https://www.alphavantage.co/query',
          apiKey: process.env.ALPHA_VANTAGE_API_KEY,
          rateLimit: 5, // requests per minute
          lastRequest: 0
        }],
        ['yahoo_finance', {
          name: 'Yahoo Finance',
          baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
          rateLimit: 100, // requests per minute
          lastRequest: 0
        }],
        ['iex_cloud', {
          name: 'IEX Cloud',
          baseUrl: 'https://cloud.iexapis.com/stable',
          apiKey: process.env.IEX_CLOUD_API_KEY,
          rateLimit: 50, // requests per minute
          lastRequest: 0
        }],
        ['polygon', {
          name: 'Polygon.io',
          baseUrl: 'https://api.polygon.io',
          apiKey: process.env.POLYGON_API_KEY,
          rateLimit: 5, // requests per minute
          lastRequest: 0
        }]
      ]);
      
      logger.info('Data sources loaded successfully');
    } catch (error) {
      logger.error('Error loading data sources:', error);
      throw error;
    }
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (this.ingestionQueue.length > 0) {
        const item = this.ingestionQueue.shift();
        try {
          await this.processIngestionItem(item);
        } catch (error) {
          logger.error('Error processing ingestion item:', error);
        }
      }
    }, 100); // Process every 100ms
  }

  async processIngestionItem(item) {
    try {
      const { symbol, dataType, source, data, userId } = item;
      
      // Validate data
      const validatedData = await this.validateData(data, dataType);
      
      // Store data
      await this.storeMarketData(symbol, dataType, source, validatedData, userId);
      
      // Update cache
      await this.updateCache(symbol, dataType, validatedData);
      
      // Emit event
      this.emit('dataIngested', { symbol, dataType, source, data: validatedData });
      
    } catch (error) {
      logger.error('Error processing ingestion item:', error);
      throw error;
    }
  }

  async ingestData(symbol, dataType, source, data, userId) {
    try {
      const ingestionId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting data ingestion for ${symbol}`, {
        ingestionId,
        symbol,
        dataType,
        source,
        userId
      });

      // Add to queue for processing
      this.ingestionQueue.push({
        id: ingestionId,
        symbol,
        dataType,
        source,
        data,
        userId,
        timestamp: new Date().toISOString()
      });

      // If real-time data, process immediately
      if (dataType === 'realtime') {
        await this.processIngestionItem({
          symbol,
          dataType,
          source,
          data,
          userId
        });
      }

      const result = {
        id: ingestionId,
        symbol,
        dataType,
        source,
        status: 'queued',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info(`Data ingestion queued for ${symbol}`, {
        ingestionId,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      logger.error('Error ingesting data:', error);
      throw error;
    }
  }

  async validateData(data, dataType) {
    try {
      const validationRules = {
        'price': {
          required: ['symbol', 'price', 'timestamp'],
          types: {
            symbol: 'string',
            price: 'number',
            timestamp: 'string'
          }
        },
        'quote': {
          required: ['symbol', 'bid', 'ask', 'timestamp'],
          types: {
            symbol: 'string',
            bid: 'number',
            ask: 'number',
            timestamp: 'string'
          }
        },
        'trade': {
          required: ['symbol', 'price', 'size', 'timestamp'],
          types: {
            symbol: 'string',
            price: 'number',
            size: 'number',
            timestamp: 'string'
          }
        },
        'ohlc': {
          required: ['symbol', 'open', 'high', 'low', 'close', 'volume', 'timestamp'],
          types: {
            symbol: 'string',
            open: 'number',
            high: 'number',
            low: 'number',
            close: 'number',
            volume: 'number',
            timestamp: 'string'
          }
        }
      };

      const rules = validationRules[dataType];
      if (!rules) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Check required fields
      for (const field of rules.required) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Check field types
      for (const [field, expectedType] of Object.entries(rules.types)) {
        if (data[field] !== undefined) {
          const actualType = typeof data[field];
          if (actualType !== expectedType) {
            throw new Error(`Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }

      return data;
    } catch (error) {
      logger.error('Error validating data:', error);
      throw error;
    }
  }

  async storeMarketData(symbol, dataType, source, data, userId) {
    try {
      const query = `
        INSERT INTO market_data (
          id, symbol, data_type, source, data, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const id = nanoid();
      await pool.query(query, [
        id,
        symbol,
        dataType,
        source,
        JSON.stringify(data),
        userId,
        new Date().toISOString()
      ]);
      
      logger.info(`Market data stored: ${symbol} - ${dataType}`);
    } catch (error) {
      logger.error('Error storing market data:', error);
      throw error;
    }
  }

  async updateCache(symbol, dataType, data) {
    try {
      const cacheKey = `market_data:${symbol}:${dataType}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 minutes TTL
    } catch (error) {
      logger.error('Error updating cache:', error);
      throw error;
    }
  }

  async getDataStreams(symbol, dataType, status, userId) {
    try {
      let query = `
        SELECT * FROM data_streams 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (symbol) {
        query += ` AND symbol = $${paramIndex}`;
        params.push(symbol);
        paramIndex++;
      }

      if (dataType) {
        query += ` AND data_type = $${paramIndex}`;
        params.push(dataType);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting data streams:', error);
      throw error;
    }
  }

  async startDataStream(streamId, userId) {
    try {
      // Get stream configuration
      const query = `
        SELECT * FROM data_streams 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [streamId, userId]);
      if (result.rows.length === 0) {
        throw new Error('Data stream not found');
      }

      const stream = result.rows[0];
      
      // Start the stream
      const streamInstance = {
        id: streamId,
        symbol: stream.symbol,
        dataType: stream.data_type,
        source: stream.source,
        status: 'running',
        startedAt: new Date().toISOString()
      };

      this.dataStreams.set(streamId, streamInstance);
      
      // Update database
      await pool.query(
        'UPDATE data_streams SET status = $1, started_at = $2 WHERE id = $3',
        ['running', streamInstance.startedAt, streamId]
      );

      this.emit('dataStreamStarted', streamInstance);
      
      logger.info(`Data stream started: ${streamId}`);
      return streamInstance;
    } catch (error) {
      logger.error('Error starting data stream:', error);
      throw error;
    }
  }

  async stopDataStream(streamId) {
    try {
      const stream = this.dataStreams.get(streamId);
      if (!stream) {
        throw new Error('Data stream not found');
      }

      // Stop the stream
      stream.status = 'stopped';
      stream.stoppedAt = new Date().toISOString();
      
      // Update database
      await pool.query(
        'UPDATE data_streams SET status = $1, stopped_at = $2 WHERE id = $3',
        ['stopped', stream.stoppedAt, streamId]
      );

      this.dataStreams.delete(streamId);
      this.emit('dataStreamStopped', stream);
      
      logger.info(`Data stream stopped: ${streamId}`);
      return stream;
    } catch (error) {
      logger.error('Error stopping data stream:', error);
      throw error;
    }
  }

  async fetchDataFromSource(symbol, dataType, source, parameters = {}) {
    try {
      const sourceConfig = this.dataSources.get(source);
      if (!sourceConfig) {
        throw new Error(`Unknown data source: ${source}`);
      }

      // Check rate limit
      const now = Date.now();
      const timeSinceLastRequest = now - sourceConfig.lastRequest;
      const minInterval = 60000 / sourceConfig.rateLimit; // Convert to milliseconds

      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Make API request
      const url = this.buildApiUrl(sourceConfig, symbol, dataType, parameters);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'BrokerageSystem/1.0'
        }
      });

      sourceConfig.lastRequest = Date.now();

      // Parse response based on source
      return this.parseApiResponse(response.data, source, dataType);
    } catch (error) {
      logger.error('Error fetching data from source:', error);
      throw error;
    }
  }

  buildApiUrl(sourceConfig, symbol, dataType, parameters) {
    const { baseUrl, apiKey } = sourceConfig;
    
    switch (sourceConfig.name) {
      case 'Alpha Vantage':
        return `${baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apiKey}`;
      
      case 'Yahoo Finance':
        return `${baseUrl}/${symbol}?range=1d&interval=1m`;
      
      case 'IEX Cloud':
        return `${baseUrl}/stock/${symbol}/quote?token=${apiKey}`;
      
      case 'Polygon.io':
        return `${baseUrl}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${apiKey}`;
      
      default:
        throw new Error(`Unknown source: ${sourceConfig.name}`);
    }
  }

  parseApiResponse(data, source, dataType) {
    try {
      switch (source) {
        case 'alpha_vantage':
          return this.parseAlphaVantageResponse(data, dataType);
        case 'yahoo_finance':
          return this.parseYahooFinanceResponse(data, dataType);
        case 'iex_cloud':
          return this.parseIEXCloudResponse(data, dataType);
        case 'polygon':
          return this.parsePolygonResponse(data, dataType);
        default:
          throw new Error(`Unknown source: ${source}`);
      }
    } catch (error) {
      logger.error('Error parsing API response:', error);
      throw error;
    }
  }

  parseAlphaVantageResponse(data, dataType) {
    // Parse Alpha Vantage response format
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error(data['Note']);
    }

    const timeSeries = data['Time Series (1min)'];
    if (!timeSeries) {
      throw new Error('No time series data found');
    }

    const latest = Object.keys(timeSeries)[0];
    const latestData = timeSeries[latest];
    
    return {
      symbol: data['Meta Data']['2. Symbol'],
      open: parseFloat(latestData['1. open']),
      high: parseFloat(latestData['2. high']),
      low: parseFloat(latestData['3. low']),
      close: parseFloat(latestData['4. close']),
      volume: parseInt(latestData['5. volume']),
      timestamp: latest
    };
  }

  parseYahooFinanceResponse(data, dataType) {
    // Parse Yahoo Finance response format
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    return {
      symbol: meta.symbol,
      open: quote.open[quote.open.length - 1],
      high: quote.high[quote.high.length - 1],
      low: quote.low[quote.low.length - 1],
      close: quote.close[quote.close.length - 1],
      volume: quote.volume[quote.volume.length - 1],
      timestamp: new Date(result.timestamp[result.timestamp.length - 1] * 1000).toISOString()
    };
  }

  parseIEXCloudResponse(data, dataType) {
    // Parse IEX Cloud response format
    return {
      symbol: data.symbol,
      price: data.latestPrice,
      bid: data.iexBidPrice,
      ask: data.iexAskPrice,
      volume: data.volume,
      timestamp: new Date(data.latestUpdate).toISOString()
    };
  }

  parsePolygonResponse(data, dataType) {
    // Parse Polygon.io response format
    const result = data.results[0];
    
    return {
      symbol: data.ticker,
      open: result.o,
      high: result.h,
      low: result.l,
      close: result.c,
      volume: result.v,
      timestamp: new Date(result.t).toISOString()
    };
  }
}

module.exports = MarketDataIngestionEngine;
