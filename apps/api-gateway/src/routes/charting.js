const express = require('express');
const { authenticateToken } = require('../middleware');
const chartingService = require('../services/chartingService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /charting/:symbol
 * @description Gets historical OHLCV data for a symbol, with optional technical indicators.
 * @example /charting/AAPL?timeframe=1Day&indicators=SMA:20,RSI:14
 * @access Private
 */
router.get('/:symbol', async (req, res, next) => {
  try {
    const { timeframe = '1Day', indicators = '' } = req.query;
    const indicatorList = indicators ? indicators.split(',') : [];

    const data = await chartingService.getChartingData(req.params.symbol, timeframe, indicatorList);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
