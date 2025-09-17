const express = require('express');
const { authenticateToken } = require('../middleware');
const socialTradingService = require('../services/socialTradingService');

const router = express.Router();
router.use(authenticateToken);

// --- Profile Management ---

/**
 * @route PUT /social/profile
 * @description Updates the user's public trading profile.
 * @access Private
 */
router.put('/profile', async (req, res, next) => {
  try {
    const profile = await socialTradingService.updateUserProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// --- Following ---

/**
 * @route POST /social/follow/:userId
 * @description Follows another public trader.
 * @access Private
 */
router.post('/follow/:userId', async (req, res, next) => {
  try {
    await socialTradingService.followUser(req.user.id, req.params.userId);
    res.json({ success: true, message: 'Successfully followed user.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /social/follow/:userId
 * @description Unfollows a trader.
 * @access Private
 */
router.delete('/follow/:userId', async (req, res, next) => {
  try {
    await socialTradingService.unfollowUser(req.user.id, req.params.userId);
    res.json({ success: true, message: 'Successfully unfollowed user.' });
  } catch (error) {
    next(error);
  }
});


// --- Copy Trading ---

/**
 * @route POST /social/copy-trading/:userId/subscribe
 * @description Subscribes to copy a trader.
 * @access Private
 */
router.post('/copy-trading/:userId/subscribe', async (req, res, next) => {
    try {
      const subscription = await socialTradingService.subscribeToCopyTrading(req.user.id, req.params.userId, req.body);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  });

module.exports = router;
