const marketDataService = require('./marketDataService');
const { SMA, EMA, RSI } = require('technicalindicators');

/**
 * Gets historical data for a symbol, enriched with technical indicators.
 * @param {string} symbol - The stock symbol.
 * @param {string} timeframe - The timeframe for the data (e.g., '1Day').
 * @param {Array<string>} indicators - A list of indicators to calculate (e.g., ['SMA:20', 'RSI:14']).
 * @returns {Promise<object>} An object containing the OHLCV data and the calculated indicators.
 */
const getChartingData = async (symbol, timeframe, indicators = []) => {
  const bars = await marketDataService.getHistoricalPrices(symbol, timeframe);

  const chartData = {
    ohlcv: bars.map(b => ({
      timestamp: b.Timestamp,
      open: b.OpenPrice,
      high: b.HighPrice,
      low: b.LowPrice,
      close: b.ClosePrice,
      volume: b.Volume
    })),
    indicators: {}
  };

  const closePrices = chartData.ohlcv.map(d => d.close);

  // Calculate requested indicators
  for (const ind of indicators) {
    const [name, period] = ind.split(':');
    const periodNum = parseInt(period);

    switch (name.toUpperCase()) {
      case 'SMA':
        chartData.indicators[`SMA${period}`] = SMA.calculate({ period: periodNum, values: closePrices });
        break;
      case 'EMA':
        chartData.indicators[`EMA${period}`] = EMA.calculate({ period: periodNum, values: closePrices });
        break;
      case 'RSI':
        chartData.indicators[`RSI${period}`] = RSI.calculate({ period: periodNum, values: closePrices });
        break;
    }
  }

  return chartData;
};

module.exports = {
  getChartingData,
};
