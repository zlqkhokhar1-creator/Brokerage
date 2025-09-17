const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Generates mock candlestick data for demonstration
 * In production, this would fetch from market data providers
 */
const generateCandlestickData = (symbol, period = '1D', days = 30) => {
  const data = [];
  const basePrice = 150 + Math.random() * 100; // Random base price between 150-250
  let currentPrice = basePrice;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Generate realistic OHLC data
    const volatility = 0.02; // 2% daily volatility
    const trend = Math.sin(i / 10) * 0.01; // Slight trending pattern

    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility * open + trend * open;
    const high = Math.max(open, close) + Math.random() * volatility * open * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * open * 0.5;

    // Generate volume (realistic ranges)
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: volume
    });

    currentPrice = close;
  }

  return data;
};

/**
 * Calculates technical indicators
 */
const calculateTechnicalIndicators = (data, indicators = ['sma', 'ema', 'rsi', 'macd']) => {
  const result = { ...data };

  if (indicators.includes('sma')) {
    // Simple Moving Average (20-period)
    result.sma20 = calculateSMA(data.map(d => d.close), 20);
  }

  if (indicators.includes('ema')) {
    // Exponential Moving Average (20-period)
    result.ema20 = calculateEMA(data.map(d => d.close), 20);
  }

  if (indicators.includes('rsi')) {
    // Relative Strength Index (14-period)
    result.rsi = calculateRSI(data.map(d => d.close), 14);
  }

  if (indicators.includes('macd')) {
    // MACD (12, 26, 9)
    const macdData = calculateMACD(data.map(d => d.close), 12, 26, 9);
    result.macd = macdData.macd;
    result.signal = macdData.signal;
    result.histogram = macdData.histogram;
  }

  if (indicators.includes('bollinger')) {
    // Bollinger Bands (20-period, 2 SD)
    const bbData = calculateBollingerBands(data.map(d => d.close), 20, 2);
    result.bbUpper = bbData.upper;
    result.bbMiddle = bbData.middle;
    result.bbLower = bbData.lower;
  }

  return result;
};

// Technical indicator calculation functions
const calculateSMA = (prices, period) => {
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

const calculateEMA = (prices, period) => {
  const ema = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
  ema.push(sum / period);

  // Calculate subsequent EMAs
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }

  return ema;
};

const calculateRSI = (prices, period = 14) => {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

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

  return rsi;
};

const calculateMACD = (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // MACD line
  const macd = [];
  const startIndex = slowPeriod - fastPeriod;
  for (let i = 0; i < slowEMA.length; i++) {
    macd.push(fastEMA[i + startIndex] - slowEMA[i]);
  }

  // Signal line (EMA of MACD)
  const signal = calculateEMA(macd, signalPeriod);

  // Histogram
  const histogram = [];
  const signalStartIndex = signalPeriod - 1;
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[i + signalStartIndex] - signal[i]);
  }

  return { macd, signal, histogram };
};

const calculateBollingerBands = (prices, period = 20, standardDeviations = 2) => {
  const sma = calculateSMA(prices, period);
  const upper = [];
  const lower = [];
  const middle = [...sma];

  for (let i = 0; i < sma.length; i++) {
    const slice = prices.slice(i, i + period);
    const mean = sma[i];
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(mean + (standardDeviations * stdDev));
    lower.push(mean - (standardDeviations * stdDev));
  }

  return { upper, lower, middle };
};

/**
 * Generates volume profile data
 */
const generateVolumeProfile = (data, priceRange = 50) => {
  const minPrice = Math.min(...data.map(d => d.low));
  const maxPrice = Math.max(...data.map(d => d.high));
  const priceStep = (maxPrice - minPrice) / priceRange;

  const volumeProfile = [];

  for (let i = 0; i < priceRange; i++) {
    const priceLevel = minPrice + (i * priceStep);
    let volume = 0;

    data.forEach(candle => {
      if (candle.low <= priceLevel && candle.high >= priceLevel) {
        // Price level is within this candle's range
        const candleRange = candle.high - candle.low;
        if (candleRange > 0) {
          // Distribute volume across the candle's range
          volume += candle.volume * (priceStep / candleRange);
        } else {
          // Handle case where high === low (unlikely but possible)
          volume += candle.volume;
        }
      }
    });

    volumeProfile.push({
      price: Math.round(priceLevel * 100) / 100,
      volume: Math.round(volume),
      percentage: 0 // Will be calculated after all volumes are summed
    });
  }

  // Calculate percentages
  const totalVolume = volumeProfile.reduce((sum, level) => sum + level.volume, 0);
  volumeProfile.forEach(level => {
    level.percentage = Math.round((level.volume / totalVolume) * 100 * 100) / 100;
  });

  return volumeProfile.sort((a, b) => b.volume - a.volume);
};

/**
 * Generates order book data
 */
const generateOrderBook = (symbol, depth = 20) => {
  const basePrice = 175.43;
  const spread = 0.01; // $0.01 spread

  const bids = [];
  const asks = [];

  for (let i = 0; i < depth; i++) {
    // Generate bid orders (below current price)
    const bidPrice = basePrice - (i + 1) * spread - Math.random() * spread;
    const bidVolume = Math.floor(Math.random() * 1000) + 100;
    bids.push({
      price: Math.round(bidPrice * 100) / 100,
      volume: bidVolume,
      total: Math.round(bidPrice * bidVolume * 100) / 100
    });

    // Generate ask orders (above current price)
    const askPrice = basePrice + (i + 1) * spread + Math.random() * spread;
    const askVolume = Math.floor(Math.random() * 1000) + 100;
    asks.push({
      price: Math.round(askPrice * 100) / 100,
      volume: askVolume,
      total: Math.round(askPrice * askVolume * 100) / 100
    });
  }

  return {
    bids: bids.sort((a, b) => b.price - a.price), // Sort bids descending
    asks: asks.sort((a, b) => a.price - b.price), // Sort asks ascending
    spread: spread,
    lastUpdate: new Date().toISOString()
  };
};

/**
 * Service methods
 */
const chartDataService = {
  /**
   * Get candlestick data with optional technical indicators
   */
  async getCandlestickData(symbol, period = '1D', days = 30, indicators = []) {
    try {
      logger.info('Generating candlestick data', { symbol, period, days, indicators });

      const data = generateCandlestickData(symbol, period, days);

      if (indicators.length > 0) {
        return calculateTechnicalIndicators(data, indicators);
      }

      return data;
    } catch (error) {
      logger.error('Failed to generate candlestick data', { symbol, error: error.message });
      throw new Error('Failed to generate candlestick data');
    }
  },

  /**
   * Get volume profile data
   */
  async getVolumeProfile(symbol, period = '1D', days = 30, priceRange = 50) {
    try {
      logger.info('Generating volume profile', { symbol, period, days, priceRange });

      const data = generateCandlestickData(symbol, period, days);
      return generateVolumeProfile(data, priceRange);
    } catch (error) {
      logger.error('Failed to generate volume profile', { symbol, error: error.message });
      throw new Error('Failed to generate volume profile');
    }
  },

  /**
   * Get order book data
   */
  async getOrderBook(symbol, depth = 20) {
    try {
      logger.info('Generating order book', { symbol, depth });
      return generateOrderBook(symbol, depth);
    } catch (error) {
      logger.error('Failed to generate order book', { symbol, error: error.message });
      throw new Error('Failed to generate order book');
    }
  },

  /**
   * Get technical indicators data
   */
  async getTechnicalIndicators(symbol, indicators = ['sma', 'rsi', 'macd'], period = '1D', days = 30) {
    try {
      logger.info('Generating technical indicators', { symbol, indicators, period, days });

      const data = generateCandlestickData(symbol, period, days);
      return calculateTechnicalIndicators(data, indicators);
    } catch (error) {
      logger.error('Failed to generate technical indicators', { symbol, error: error.message });
      throw new Error('Failed to generate technical indicators');
    }
  }
};

module.exports = chartDataService;