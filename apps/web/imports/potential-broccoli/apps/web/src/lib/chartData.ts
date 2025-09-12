import { ChartData } from './charts/AdvancedChart';

// Generate comprehensive OHLC data with technical indicators
export const generateEnhancedChartData = (currentPrice: number, days: number = 90): ChartData[] => {
  const data: ChartData[] = [];
  let price = currentPrice * (0.85 + Math.random() * 0.3); // Start from a varied base
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    
    // Generate daily price movement
    const volatility = 0.02 + Math.random() * 0.03; // 2-5% daily volatility
    const trend = Math.sin(i / 10) * 0.01; // Add some trending behavior
    const randomChange = (Math.random() - 0.5) * volatility;
    const totalChange = trend + randomChange;
    
    // Calculate OHLC
    const open = price;
    const change = price * totalChange;
    const close = Math.max(price + change, currentPrice * 0.5); // Prevent unrealistic lows
    
    // Generate high and low based on volatility
    const dayRange = Math.abs(close - open) + (price * (0.005 + Math.random() * 0.02));
    const high = Math.max(open, close) + (dayRange * Math.random() * 0.6);
    const low = Math.min(open, close) - (dayRange * Math.random() * 0.6);
    
    // Generate volume with some correlation to price movement
    const baseVolume = 15000000 + Math.random() * 35000000;
    const volumeMultiplier = 1 + Math.abs(totalChange) * 10; // Higher volume on bigger moves
    const volume = Math.floor(baseVolume * volumeMultiplier);
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
    
    price = close; // Next day starts with previous close
  }
  
  // Ensure the last data point matches current price
  if (data.length > 0) {
    data[data.length - 1].close = currentPrice;
    data[data.length - 1].high = Math.max(data[data.length - 1].high, currentPrice);
    data[data.length - 1].low = Math.min(data[data.length - 1].low, currentPrice);
  }
  
  // Calculate technical indicators
  return calculateTechnicalIndicators(data);
};

// Calculate various technical indicators
const calculateTechnicalIndicators = (data: ChartData[]): ChartData[] => {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  // RSI calculation
  const rsi = calculateRSI(closes, 14);
  
  // MACD calculation  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((val, i) => val - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((val, i) => val - signalLine[i]);
  
  // Bollinger Bands calculation
  const sma20 = calculateSMA(closes, 20);
  const bollingerBands = calculateBollingerBands(closes, sma20, 20, 2);
  
  // Moving Averages
  const sma50 = calculateSMA(closes, 50);
  const ema20 = calculateEMA(closes, 20);
  
  // Merge indicators with original data
  return data.map((item, index) => ({
    ...item,
    rsi: rsi[index] || 50,
    macd: macdLine[index] || 0,
    signal: signalLine[index] || 0,
    histogram: histogram[index] || 0,
    bb_upper: bollingerBands.upper[index] || item.close * 1.02,
    bb_middle: bollingerBands.middle[index] || item.close,
    bb_lower: bollingerBands.lower[index] || item.close * 0.98,
    sma: sma50[index] || item.close,
    ema: ema20[index] || item.close
  }));
};

// Simple Moving Average
const calculateSMA = (data: number[], period: number): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]); // Use current price for initial values
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
};

// Exponential Moving Average
const calculateEMA = (data: number[], period: number): number[] => {
  const result: number[] = [data[0]];
  const multiplier = 2 / (period + 1);
  
  for (let i = 1; i < data.length; i++) {
    const ema = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
    result.push(ema);
  }
  
  return result;
};

// RSI Calculation
const calculateRSI = (data: number[], period: number = 14): number[] => {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Fill initial values
  for (let i = 0; i < period; i++) {
    result.push(50); // Neutral RSI for initial values
  }
  
  // Calculate RSI
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
    }
  }
  
  return result;
};

// Bollinger Bands Calculation
const calculateBollingerBands = (
  data: number[], 
  sma: number[], 
  period: number = 20, 
  stdDev: number = 2
) => {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Use price-based bands for initial values
      upper.push(data[i] * 1.02);
      middle.push(data[i]);
      lower.push(data[i] * 0.98);
    } else {
      const periodData = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      
      // Calculate standard deviation
      const variance = periodData.reduce((sum, price) => {
        return sum + Math.pow(price - mean, 2);
      }, 0) / period;
      
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(mean + (standardDeviation * stdDev));
      middle.push(mean);
      lower.push(mean - (standardDeviation * stdDev));
    }
  }
  
  return { upper, middle, lower };
};

// Generate data for different timeframes
export const generateTimeframeData = (baseData: ChartData[], timeframe: string): ChartData[] => {
  switch (timeframe) {
    case '1D':
      // Return hourly data for 1 day (24 points)
      return generateIntraday(baseData[baseData.length - 1], 24);
    case '1W':
      // Return last 7 days
      return baseData.slice(-7);
    case '1M':
      // Return last 30 days
      return baseData.slice(-30);
    case '3M':
      // Return last 90 days
      return baseData.slice(-90);
    case '1Y':
      // Return weekly data for 1 year (52 points)
      return convertToWeekly(baseData).slice(-52);
    case '5Y':
      // Return monthly data for 5 years (60 points)
      return convertToMonthly(baseData).slice(-60);
    default:
      return baseData;
  }
};

// Generate intraday data from a daily candle
const generateIntraday = (dailyData: ChartData, hours: number): ChartData[] => {
  const data: ChartData[] = [];
  const hourlyVolume = Math.floor(dailyData.volume / hours);
  const priceRange = dailyData.high - dailyData.low;
  
  let currentPrice = dailyData.open;
  
  for (let i = 0; i < hours; i++) {
    const progress = i / (hours - 1);
    
    // Interpolate towards close price with some randomness
    const targetPrice = dailyData.open + (dailyData.close - dailyData.open) * progress;
    const randomness = (Math.random() - 0.5) * priceRange * 0.1;
    
    const open = currentPrice;
    const close = targetPrice + randomness;
    const high = Math.max(open, close) + (Math.random() * priceRange * 0.05);
    const low = Math.min(open, close) - (Math.random() * priceRange * 0.05);
    
    // Ensure we stay within daily bounds
    const boundedHigh = Math.min(high, dailyData.high);
    const boundedLow = Math.max(low, dailyData.low);
    
    const timestamp = dailyData.timestamp + (i * 60 * 60 * 1000); // Add hours in ms
    
    data.push({
      date: new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(boundedHigh.toFixed(2)),
      low: Number(boundedLow.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: hourlyVolume + Math.floor(Math.random() * hourlyVolume * 0.5)
    });
    
    currentPrice = close;
  }
  
  // Ensure last hour matches daily close
  if (data.length > 0) {
    data[data.length - 1].close = dailyData.close;
  }
  
  return calculateTechnicalIndicators(data);
};

// Convert daily data to weekly
const convertToWeekly = (dailyData: ChartData[]): ChartData[] => {
  const weeklyData: ChartData[] = [];
  
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekData = dailyData.slice(i, Math.min(i + 7, dailyData.length));
    if (weekData.length === 0) continue;
    
    const weeklyCandle: ChartData = {
      date: weekData[0].date,
      timestamp: weekData[0].timestamp,
      open: weekData[0].open,
      high: Math.max(...weekData.map(d => d.high)),
      low: Math.min(...weekData.map(d => d.low)),
      close: weekData[weekData.length - 1].close,
      volume: weekData.reduce((sum, d) => sum + d.volume, 0)
    };
    
    weeklyData.push(weeklyCandle);
  }
  
  return calculateTechnicalIndicators(weeklyData);
};

// Convert daily data to monthly
const convertToMonthly = (dailyData: ChartData[]): ChartData[] => {
  const monthlyData: ChartData[] = [];
  
  for (let i = 0; i < dailyData.length; i += 30) {
    const monthData = dailyData.slice(i, Math.min(i + 30, dailyData.length));
    if (monthData.length === 0) continue;
    
    const monthlyCandle: ChartData = {
      date: new Date(monthData[0].timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      }),
      timestamp: monthData[0].timestamp,
      open: monthData[0].open,
      high: Math.max(...monthData.map(d => d.high)),
      low: Math.min(...monthData.map(d => d.low)),
      close: monthData[monthData.length - 1].close,
      volume: monthData.reduce((sum, d) => sum + d.volume, 0)
    };
    
    monthlyData.push(monthlyCandle);
  }
  
  return calculateTechnicalIndicators(monthlyData);
};