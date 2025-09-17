const express = require('express');
const { authenticateToken } = require('../middleware');
const goalsService = require('../services/goalsService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /goals
 * @description Gets all of the user's financial goals.
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const goals = await goalsService.getUserGoals(req.user.id);
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /goals
 * @description Creates a new financial goal and investment plan.
 * @access Private
 */
router.post('/', async (req, res, next) => {
  try {
    const newGoal = await goalsService.createFinancialGoal(req.user.id, req.body);
    res.status(201).json({ success: true, data: newGoal });
  } catch (error)
    next(error);
  }
});

module.exports = router;
