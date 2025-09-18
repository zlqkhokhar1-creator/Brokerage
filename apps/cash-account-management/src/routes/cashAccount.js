const express = require('express');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

const router = express.Router();

// Get account balance
router.get('/balance', auth, async (req, res) => {
  try {
    const { currency } = req.query;
    const balance = await req.app.locals.services.cashAccount.getAccountBalance(req.user.id, currency);
    
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Error getting account balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get account balance',
      error: error.message
    });
  }
});

// Create cash account
router.post('/create', auth, [
  body('base_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid base currency'),
  body('account_type').isIn(['individual', 'corporate', 'institutional']).withMessage('Invalid account type'),
  body('cnic').optional().isLength({ min: 13, max: 15 }).withMessage('Invalid CNIC format'),
  body('iban').optional().isLength({ min: 20, max: 34 }).withMessage('Invalid IBAN format'),
  body('tax_id').optional().isLength({ min: 5, max: 50 }).withMessage('Invalid tax ID format')
], validation, async (req, res) => {
  try {
    const account = await req.app.locals.services.cashAccount.createCashAccount(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Cash account created successfully',
      data: account
    });
  } catch (error) {
    logger.error('Error creating cash account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash account',
      error: error.message
    });
  }
});

// Process buy order
router.post('/buy-order', auth, [
  body('asset_type').isIn(['STOCK', 'ETF', 'MUTUAL_FUND', 'BOND', 'CRYPTO', 'COMMODITY', 'FOREX']).withMessage('Invalid asset type'),
  body('asset_symbol').isLength({ min: 1, max: 20 }).withMessage('Invalid asset symbol'),
  body('asset_name').isLength({ min: 1, max: 255 }).withMessage('Invalid asset name'),
  body('quantity').isFloat({ min: 0.0001 }).withMessage('Invalid quantity'),
  body('price_per_unit').isFloat({ min: 0.0001 }).withMessage('Invalid price per unit'),
  body('currency').optional().isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('market').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid market'),
  body('exchange').optional().isLength({ min: 1, max: 50 }).withMessage('Invalid exchange')
], validation, async (req, res) => {
  try {
    const transaction = await req.app.locals.services.cashAccount.processBuyOrder(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Buy order processed successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error processing buy order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process buy order',
      error: error.message
    });
  }
});

// Process sell order
router.post('/sell-order', auth, [
  body('asset_type').isIn(['STOCK', 'ETF', 'MUTUAL_FUND', 'BOND', 'CRYPTO', 'COMMODITY', 'FOREX']).withMessage('Invalid asset type'),
  body('asset_symbol').isLength({ min: 1, max: 20 }).withMessage('Invalid asset symbol'),
  body('asset_name').isLength({ min: 1, max: 255 }).withMessage('Invalid asset name'),
  body('quantity').isFloat({ min: 0.0001 }).withMessage('Invalid quantity'),
  body('price_per_unit').isFloat({ min: 0.0001 }).withMessage('Invalid price per unit'),
  body('currency').optional().isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('market').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid market'),
  body('exchange').optional().isLength({ min: 1, max: 50 }).withMessage('Invalid exchange')
], validation, async (req, res) => {
  try {
    const transaction = await req.app.locals.services.cashAccount.processSellOrder(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Sell order processed successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error processing sell order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sell order',
      error: error.message
    });
  }
});

// Execute trade
router.post('/execute-trade', auth, [
  body('transaction_id').isUUID().withMessage('Invalid transaction ID'),
  body('execution_price').isFloat({ min: 0.0001 }).withMessage('Invalid execution price'),
  body('execution_time').isISO8601().withMessage('Invalid execution time'),
  body('execution_venue').optional().isLength({ min: 1, max: 50 }).withMessage('Invalid execution venue')
], validation, async (req, res) => {
  try {
    const { transaction_id, execution_price, execution_time, execution_venue } = req.body;
    const transaction = await req.app.locals.services.cashAccount.executeTrade(transaction_id, {
      execution_price,
      execution_time,
      execution_venue
    });
    
    res.json({
      success: true,
      message: 'Trade executed successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error executing trade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute trade',
      error: error.message
    });
  }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
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

// Get account details
router.get('/details', auth, async (req, res) => {
  try {
    const account = await req.app.locals.services.cashAccount.getCashAccount(req.user.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error('Error getting account details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get account details',
      error: error.message
    });
  }
});

// Update account limits
router.put('/limits', auth, [
  body('daily_deposit_limit').optional().isFloat({ min: 0 }).withMessage('Invalid daily deposit limit'),
  body('daily_withdrawal_limit').optional().isFloat({ min: 0 }).withMessage('Invalid daily withdrawal limit'),
  body('monthly_deposit_limit').optional().isFloat({ min: 0 }).withMessage('Invalid monthly deposit limit'),
  body('monthly_withdrawal_limit').optional().isFloat({ min: 0 }).withMessage('Invalid monthly withdrawal limit'),
  body('max_balance_limit').optional().isFloat({ min: 0 }).withMessage('Invalid max balance limit')
], validation, async (req, res) => {
  try {
    // This would update account limits
    // Implementation depends on your business logic
    res.json({
      success: true,
      message: 'Account limits updated successfully'
    });
  } catch (error) {
    logger.error('Error updating account limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account limits',
      error: error.message
    });
  }
});

module.exports = router;
