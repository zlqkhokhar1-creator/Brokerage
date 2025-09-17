const express = require('express');
const { authenticateToken } = require('../middleware');
const watchlistService = require('../services/watchlistService');

const router = express.Router();
router.use(authenticateToken);

// --- Watchlist Management ---

// GET all watchlists for the user
router.get('/', async (req, res, next) => {
  try {
    const watchlists = await watchlistService.getWatchlists(req.user.id);
    res.json({ success: true, data: watchlists });
  } catch (error) {
    next(error);
  }
});

// POST a new watchlist
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Watchlist name is required.' });
    }
    const newWatchlist = await watchlistService.createWatchlist(req.user.id, name);
    res.status(201).json({ success: true, data: newWatchlist });
  } catch (error) {
    next(error);
  }
});

// DELETE a watchlist
router.delete('/:watchlistId', async (req, res, next) => {
  try {
    await watchlistService.deleteWatchlist(req.user.id, req.params.watchlistId);
    res.json({ success: true, message: 'Watchlist deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// --- Watchlist Item Management ---

// POST a new item to a watchlist
router.post('/:watchlistId/items', async (req, res, next) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required.' });
    }
    const newItem = await watchlistService.addWatchlistItem(req.user.id, req.params.watchlistId, symbol);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    next(error);
  }
});

// DELETE an item from a watchlist
router.delete('/:watchlistId/items/:symbol', async (req, res, next) => {
  try {
    const { watchlistId, symbol } = req.params;
    await watchlistService.removeWatchlistItem(req.user.id, watchlistId, symbol);
    res.json({ success: true, message: 'Watchlist item removed successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
