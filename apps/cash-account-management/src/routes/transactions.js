const express = require('express');
const { query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

const router = express.Router();

// Get transaction history
router.get('/', auth, [
  query('type').optional().isIn(['all', 'trading', 'cash', 'deposit', 'withdrawal']).withMessage('Invalid transaction type'),
  query('currency').optional().isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid limit'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset')
], validation, async (req, res) => {
  try {
    const {
      type = 'all',
      currency = null,
      start_date = null,
      end_date = null,
      limit = 100,
      offset = 0
    } = req.query;
    
    const transactions = await req.app.locals.services.cashAccount.getTransactionHistory(req.user.id, {
      type,
      currency,
      start_date,
      end_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
      error: error.message
    });
  }
});

// Get transaction by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would get a specific transaction
    // Implementation depends on your business logic
    res.json({
      success: true,
      data: null
    });
  } catch (error) {
    logger.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error.message
    });
  }
});

module.exports = router;
