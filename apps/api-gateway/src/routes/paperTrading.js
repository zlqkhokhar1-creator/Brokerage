const express = require('express');
const { authenticateToken } = require('../middleware');
const paperTradingService = require('../services/paperTradingService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /paper/account
 * @description Gets the user's paper trading account details.
 * @access Private
 */
router.get('/account', async (req, res, next) => {
  try {
    const account = await paperTradingService.getPaperAccount(req.user.id);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /paper/trade
 * @description Places a simulated trade.
 * @access Private
 */
router.post('/trade', async (req, res, next) => {
  try {
    const { symbol, side, quantity } = req.body;
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ success: false, error: 'Symbol, side, and quantity are required.' });
    }
    const result = await paperTradingService.placePaperTrade(req.user.id, { symbol, side, quantity });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /paper/reset
 * @description Resets the paper trading account to its default state.
 * @access Private
 */
router.post('/reset', async (req, res, next) => {
  try {
    const account = await paperTradingService.resetPaperAccount(req.user.id);
    res.json({ success: true, message: 'Paper trading account has been reset.', data: account });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
