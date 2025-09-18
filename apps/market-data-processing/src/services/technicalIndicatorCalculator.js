const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class TechnicalIndicatorCalculator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.indicators = new Map();
    this.calculationCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load indicator definitions
      await this.loadIndicatorDefinitions();
      
      this._initialized = true;
      logger.info('TechnicalIndicatorCalculator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TechnicalIndicatorCalculator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('TechnicalIndicatorCalculator closed');
    } catch (error) {
      logger.error('Error closing TechnicalIndicatorCalculator:', error);
    }
  }

  async loadIndicatorDefinitions() {
    try {
      this.indicatorDefinitions = new Map([
        ['sma', {
          name: 'Simple Moving Average',
          description: 'Average price over a specified period',
          parameters: ['period'],
          requiredData: ['close']
        }],
        ['ema', {
          name: 'Exponential Moving Average',
          description: 'Exponentially weighted moving average',
          parameters: ['period'],
          requiredData: ['close']
        }],
        ['rsi', {
          name: 'Relative Strength Index',
          description: 'Momentum oscillator measuring speed and change of price movements',
          parameters: ['period'],
          requiredData: ['close']
        }],
        ['macd', {
          name: 'MACD',
          description: 'Moving Average Convergence Divergence',
          parameters: ['fastPeriod', 'slowPeriod', 'signalPeriod'],
          requiredData: ['close']
        }],
        ['bollinger_bands', {
          name: 'Bollinger Bands',
          description: 'Price channels based on moving average and standard deviation',
          parameters: ['period', 'stdDev'],
          requiredData: ['close']
        }],
        ['stochastic', {
          name: 'Stochastic Oscillator',
          description: 'Momentum indicator comparing closing price to price range',
          parameters: ['kPeriod', 'dPeriod'],
          requiredData: ['high', 'low', 'close']
        }],
        ['williams_r', {
          name: 'Williams %R',
          description: 'Momentum indicator measuring overbought/oversold levels',
          parameters: ['period'],
          requiredData: ['high', 'low', 'close']
        }],
        ['atr', {
          name: 'Average True Range',
          description: 'Volatility indicator measuring price movement',
          parameters: ['period'],
          requiredData: ['high', 'low', 'close']
        }],
        ['adx', {
          name: 'Average Directional Index',
          description: 'Trend strength indicator',
          parameters: ['period'],
          requiredData: ['high', 'low', 'close']
        }],
        ['cci', {
          name: 'Commodity Channel Index',
          description: 'Momentum oscillator identifying cyclical trends',
          parameters: ['period'],
          requiredData: ['high', 'low', 'close']
        }]
      ]);
      
      logger.info('Indicator definitions loaded successfully');
    } catch (error) {
      logger.error('Error loading indicator definitions:', error);
      throw error;
    }
  }

  async calculateIndicator(symbol, indicatorType, parameters, timeRange, userId) {
    try {
      const calculationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting indicator calculation for ${symbol}`, {
        calculationId,
        symbol,
        indicatorType,
        parameters,
        timeRange,
        userId
      });

      // Get market data
      const marketData = await this.getMarketData(symbol, timeRange);
      
      // Calculate indicator
      const indicator = await this.calculateIndicatorValue(
        indicatorType, 
        marketData, 
        parameters
      );
      
      // Store results
      const calculation = {
        id: calculationId,
        symbol,
        indicatorType,
        parameters,
        timeRange,
        indicator,
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeIndicatorCalculation(calculation);
      
      // Cache results
      await this.redis.setex(
        `indicator:${calculationId}`, 
        3600, 
        JSON.stringify(calculation)
      );
      
      this.emit('indicatorCalculated', calculation);
      
      logger.info(`Indicator calculation completed for ${symbol}`, {
        calculationId,
        processingTime: calculation.processingTime
      });
      
      return calculation;
    } catch (error) {
      logger.error('Error calculating indicator:', error);
      this.emit('calculationFailed', error, { symbol, indicatorType, parameters, timeRange, userId });
      throw error;
    }
  }

  async calculateIndicatorValue(indicatorType, marketData, parameters) {
    try {
      const definition = this.indicatorDefinitions.get(indicatorType);
      if (!definition) {
        throw new Error(`Unknown indicator type: ${indicatorType}`);
      }

      // Validate parameters
      this.validateParameters(parameters, definition.parameters);
      
      // Calculate indicator based on type
      switch (indicatorType) {
        case 'sma':
          return this.calculateSMA(marketData, parameters.period);
        case 'ema':
          return this.calculateEMA(marketData, parameters.period);
        case 'rsi':
          return this.calculateRSI(marketData, parameters.period);
        case 'macd':
          return this.calculateMACD(marketData, parameters.fastPeriod, parameters.slowPeriod, parameters.signalPeriod);
        case 'bollinger_bands':
          return this.calculateBollingerBands(marketData, parameters.period, parameters.stdDev);
        case 'stochastic':
          return this.calculateStochastic(marketData, parameters.kPeriod, parameters.dPeriod);
        case 'williams_r':
          return this.calculateWilliamsR(marketData, parameters.period);
        case 'atr':
          return this.calculateATR(marketData, parameters.period);
        case 'adx':
          return this.calculateADX(marketData, parameters.period);
        case 'cci':
          return this.calculateCCI(marketData, parameters.period);
        default:
          throw new Error(`Unsupported indicator type: ${indicatorType}`);
      }
    } catch (error) {
      logger.error('Error calculating indicator value:', error);
      throw error;
    }
  }

  validateParameters(parameters, requiredParameters) {
    for (const param of requiredParameters) {
      if (!(param in parameters)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  calculateSMA(marketData, period) {
    try {
      const closes = marketData.map(candle => candle.close);
      const sma = [];
      
      for (let i = period - 1; i < closes.length; i++) {
        const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
      
      return {
        type: 'sma',
        period,
        values: sma,
        timestamps: marketData.slice(period - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating SMA:', error);
      throw error;
    }
  }

  calculateEMA(marketData, period) {
    try {
      const closes = marketData.map(candle => candle.close);
      const ema = [];
      const multiplier = 2 / (period + 1);
      
      // First EMA is SMA
      const firstSMA = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
      ema.push(firstSMA);
      
      // Calculate subsequent EMAs
      for (let i = period; i < closes.length; i++) {
        const currentEMA = (closes[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
        ema.push(currentEMA);
      }
      
      return {
        type: 'ema',
        period,
        values: ema,
        timestamps: marketData.slice(period - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating EMA:', error);
      throw error;
    }
  }

  calculateRSI(marketData, period) {
    try {
      const closes = marketData.map(candle => candle.close);
      const gains = [];
      const losses = [];
      
      // Calculate price changes
      for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      const rsi = [];
      
      // Calculate RSI
      for (let i = period - 1; i < gains.length; i++) {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
      }
      
      return {
        type: 'rsi',
        period,
        values: rsi,
        timestamps: marketData.slice(period).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating RSI:', error);
      throw error;
    }
  }

  calculateMACD(marketData, fastPeriod, slowPeriod, signalPeriod) {
    try {
      const closes = marketData.map(candle => candle.close);
      
      // Calculate EMAs
      const fastEMA = this.calculateEMA(marketData, fastPeriod);
      const slowEMA = this.calculateEMA(marketData, slowPeriod);
      
      // Calculate MACD line
      const macdLine = [];
      const minLength = Math.min(fastEMA.values.length, slowEMA.values.length);
      
      for (let i = 0; i < minLength; i++) {
        macdLine.push(fastEMA.values[i] - slowEMA.values[i]);
      }
      
      // Calculate signal line (EMA of MACD line)
      const signalLine = this.calculateEMAFromValues(macdLine, signalPeriod);
      
      // Calculate histogram
      const histogram = [];
      const minHistLength = Math.min(macdLine.length, signalLine.values.length);
      
      for (let i = 0; i < minHistLength; i++) {
        histogram.push(macdLine[i] - signalLine.values[i]);
      }
      
      return {
        type: 'macd',
        fastPeriod,
        slowPeriod,
        signalPeriod,
        macdLine,
        signalLine: signalLine.values,
        histogram,
        timestamps: marketData.slice(slowPeriod - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating MACD:', error);
      throw error;
    }
  }

  calculateBollingerBands(marketData, period, stdDev) {
    try {
      const closes = marketData.map(candle => candle.close);
      const sma = this.calculateSMA(marketData, period);
      const upperBand = [];
      const lowerBand = [];
      
      for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = sma.values[i - period + 1];
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        upperBand.push(mean + (stdDev * standardDeviation));
        lowerBand.push(mean - (stdDev * standardDeviation));
      }
      
      return {
        type: 'bollinger_bands',
        period,
        stdDev,
        upperBand,
        middleBand: sma.values,
        lowerBand,
        timestamps: sma.timestamps
      };
    } catch (error) {
      logger.error('Error calculating Bollinger Bands:', error);
      throw error;
    }
  }

  calculateStochastic(marketData, kPeriod, dPeriod) {
    try {
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const closes = marketData.map(candle => candle.close);
      
      const kValues = [];
      const dValues = [];
      
      for (let i = kPeriod - 1; i < closes.length; i++) {
        const highSlice = highs.slice(i - kPeriod + 1, i + 1);
        const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
        
        const highestHigh = Math.max(...highSlice);
        const lowestLow = Math.min(...lowSlice);
        
        const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(k);
      }
      
      // Calculate D line (SMA of K values)
      for (let i = dPeriod - 1; i < kValues.length; i++) {
        const d = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
        dValues.push(d);
      }
      
      return {
        type: 'stochastic',
        kPeriod,
        dPeriod,
        kValues,
        dValues,
        timestamps: marketData.slice(kPeriod - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating Stochastic:', error);
      throw error;
    }
  }

  calculateWilliamsR(marketData, period) {
    try {
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const closes = marketData.map(candle => candle.close);
      
      const williamsR = [];
      
      for (let i = period - 1; i < closes.length; i++) {
        const highSlice = highs.slice(i - period + 1, i + 1);
        const lowSlice = lows.slice(i - period + 1, i + 1);
        
        const highestHigh = Math.max(...highSlice);
        const lowestLow = Math.min(...lowSlice);
        
        const wr = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100;
        williamsR.push(wr);
      }
      
      return {
        type: 'williams_r',
        period,
        values: williamsR,
        timestamps: marketData.slice(period - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating Williams %R:', error);
      throw error;
    }
  }

  calculateATR(marketData, period) {
    try {
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const closes = marketData.map(candle => candle.close);
      
      const trueRanges = [];
      
      for (let i = 1; i < closes.length; i++) {
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
      
      const atr = [];
      
      for (let i = period - 1; i < trueRanges.length; i++) {
        const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        atr.push(avgTR);
      }
      
      return {
        type: 'atr',
        period,
        values: atr,
        timestamps: marketData.slice(period).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating ATR:', error);
      throw error;
    }
  }

  calculateADX(marketData, period) {
    try {
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const closes = marketData.map(candle => candle.close);
      
      const plusDM = [];
      const minusDM = [];
      const trueRanges = [];
      
      for (let i = 1; i < closes.length; i++) {
        const highDiff = highs[i] - highs[i - 1];
        const lowDiff = lows[i - 1] - lows[i];
        
        plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
        minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
        
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
      
      const plusDI = [];
      const minusDI = [];
      const adx = [];
      
      for (let i = period - 1; i < plusDM.length; i++) {
        const avgPlusDM = plusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgMinusDM = minusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        
        const plusDIValue = (avgPlusDM / avgTR) * 100;
        const minusDIValue = (avgMinusDM / avgTR) * 100;
        
        plusDI.push(plusDIValue);
        minusDI.push(minusDIValue);
        
        const dx = Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue) * 100;
        adx.push(dx);
      }
      
      return {
        type: 'adx',
        period,
        plusDI,
        minusDI,
        adx,
        timestamps: marketData.slice(period).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating ADX:', error);
      throw error;
    }
  }

  calculateCCI(marketData, period) {
    try {
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const closes = marketData.map(candle => candle.close);
      
      const typicalPrices = [];
      const cci = [];
      
      for (let i = 0; i < closes.length; i++) {
        typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
      }
      
      for (let i = period - 1; i < typicalPrices.length; i++) {
        const slice = typicalPrices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        const meanDeviation = slice.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
        
        const cciValue = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
        cci.push(cciValue);
      }
      
      return {
        type: 'cci',
        period,
        values: cci,
        timestamps: marketData.slice(period - 1).map(candle => candle.timestamp)
      };
    } catch (error) {
      logger.error('Error calculating CCI:', error);
      throw error;
    }
  }

  calculateEMAFromValues(values, period) {
    try {
      const ema = [];
      const multiplier = 2 / (period + 1);
      
      // First EMA is SMA
      const firstSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      ema.push(firstSMA);
      
      // Calculate subsequent EMAs
      for (let i = period; i < values.length; i++) {
        const currentEMA = (values[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
        ema.push(currentEMA);
      }
      
      return {
        values: ema
      };
    } catch (error) {
      logger.error('Error calculating EMA from values:', error);
      throw error;
    }
  }

  async getIndicators(symbol, indicatorType, timeRange, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `indicators:${symbol}:${indicatorType || 'all'}:${timeRange}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      let query = `
        SELECT * FROM technical_indicators 
        WHERE symbol = $1 AND time_range = $2 AND user_id = $3
      `;
      const params = [symbol, timeRange, userId];
      let paramIndex = 4;

      if (indicatorType) {
        query += ` AND indicator_type = $${paramIndex}`;
        params.push(indicatorType);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result.rows));
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting indicators:', error);
      throw error;
    }
  }

  async getAvailableIndicators() {
    try {
      return Array.from(this.indicatorDefinitions.entries()).map(([key, definition]) => ({
        key,
        ...definition
      }));
    } catch (error) {
      logger.error('Error getting available indicators:', error);
      throw error;
    }
  }

  async getMarketData(symbol, timeRange) {
    try {
      // Mock implementation - in production, this would query the database
      const now = new Date();
      const data = [];
      
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(now.getTime() - (100 - i) * 60000); // 1 minute intervals
        data.push({
          timestamp: timestamp.toISOString(),
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10,
          volume: Math.floor(Math.random() * 1000000)
        });
      }
      
      return data;
    } catch (error) {
      logger.error('Error getting market data:', error);
      throw error;
    }
  }

  async storeIndicatorCalculation(calculation) {
    try {
      const query = `
        INSERT INTO technical_indicators (
          id, symbol, indicator_type, parameters, time_range, user_id, 
          indicator_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        calculation.id,
        calculation.symbol,
        calculation.indicatorType,
        JSON.stringify(calculation.parameters),
        calculation.timeRange,
        calculation.userId,
        JSON.stringify(calculation.indicator),
        calculation.createdAt
      ]);
      
      logger.info(`Indicator calculation stored: ${calculation.id}`);
    } catch (error) {
      logger.error('Error storing indicator calculation:', error);
      throw error;
    }
  }

  async updateIndicators(symbol) {
    try {
      // Update indicators for a specific symbol
      logger.info(`Updating indicators for ${symbol}`);
      
      // This would typically involve recalculating indicators
      // and updating the database
      
    } catch (error) {
      logger.error(`Error updating indicators for ${symbol}:`, error);
      throw error;
    }
  }
}

module.exports = TechnicalIndicatorCalculator;
