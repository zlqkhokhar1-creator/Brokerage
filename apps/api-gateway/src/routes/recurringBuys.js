const express = require('express');
const { authenticateToken } = require('../middleware');
const recurringBuysService = require('../services/recurringBuysService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /recurring-buys
 * @description Gets all of the user's active recurring buy schedules.
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const schedules = await recurringBuysService.getRecurringBuys(req.user.id);
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /recurring-buys
 * @description Creates a new recurring buy schedule.
 * @access Private
 */
router.post('/', async (req, res, next) => {
  try {
    const newSchedule = await recurringBuysService.createRecurringBuy(req.user.id, req.body);
    res.status(201).json({ success: true, data: newSchedule });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /recurring-buys/:scheduleId
 * @description Cancels a recurring buy schedule.
 * @access Private
 */
router.delete('/:scheduleId', async (req, res, next) => {
  try {
    await recurringBuysService.cancelRecurringBuy(req.user.id, req.params.scheduleId);
    res.json({ success: true, message: req.t('schedule_canceled') });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
