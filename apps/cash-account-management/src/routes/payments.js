const express = require('express');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

const router = express.Router();

// Process deposit
router.post('/deposit', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('payment_method').isIn(['RAAST', 'BANK_TRANSFER', 'WIRE', 'ACH', 'CARD', 'DIGITAL_WALLET']).withMessage('Invalid payment method'),
  body('payment_provider').isLength({ min: 1, max: 50 }).withMessage('Invalid payment provider'),
  body('bank_account_id').optional().isUUID().withMessage('Invalid bank account ID'),
  body('digital_wallet_id').optional().isUUID().withMessage('Invalid digital wallet ID'),
  body('external_reference').optional().isLength({ min: 1, max: 100 }).withMessage('Invalid external reference')
], validation, async (req, res) => {
  try {
    const transaction = await req.app.locals.services.cashAccount.processDeposit(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Deposit processed successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error processing deposit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deposit',
      error: error.message
    });
  }
});

// Process withdrawal
router.post('/withdraw', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('payment_method').isIn(['RAAST', 'BANK_TRANSFER', 'WIRE', 'ACH', 'CARD', 'DIGITAL_WALLET']).withMessage('Invalid payment method'),
  body('payment_provider').isLength({ min: 1, max: 50 }).withMessage('Invalid payment provider'),
  body('bank_account_id').optional().isUUID().withMessage('Invalid bank account ID'),
  body('digital_wallet_id').optional().isUUID().withMessage('Invalid digital wallet ID')
], validation, async (req, res) => {
  try {
    const transaction = await req.app.locals.services.cashAccount.processWithdrawal(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Withdrawal processed successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
});

// Get supported payment methods
router.get('/methods', auth, async (req, res) => {
  try {
    const { country, currency } = req.query;
    
    if (!country || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Country and currency are required'
      });
    }
    
    const methods = await req.app.locals.services.paymentGateway.getSupportedPaymentMethods(country, currency);
    
    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    logger.error('Error getting supported payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported payment methods',
      error: error.message
    });
  }
});

// Add bank account
router.post('/bank-accounts', auth, [
  body('bank_name').isLength({ min: 1, max: 100 }).withMessage('Invalid bank name'),
  body('bank_code').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid bank code'),
  body('bank_country').isLength({ min: 2, max: 3 }).withMessage('Invalid bank country'),
  body('bank_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid bank currency'),
  body('account_holder_name').isLength({ min: 1, max: 100 }).withMessage('Invalid account holder name'),
  body('account_number').isLength({ min: 1, max: 50 }).withMessage('Invalid account number'),
  body('account_type').isIn(['checking', 'savings', 'current', 'business']).withMessage('Invalid account type'),
  body('iban').optional().isLength({ min: 20, max: 34 }).withMessage('Invalid IBAN format'),
  body('swift_code').optional().isLength({ min: 8, max: 11 }).withMessage('Invalid SWIFT code'),
  body('routing_number').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid routing number'),
  body('sort_code').optional().isLength({ min: 6, max: 10 }).withMessage('Invalid sort code'),
  body('cnic').optional().isLength({ min: 13, max: 15 }).withMessage('Invalid CNIC format'),
  body('branch_code').optional().isLength({ min: 1, max: 10 }).withMessage('Invalid branch code'),
  body('branch_name').optional().isLength({ min: 1, max: 100 }).withMessage('Invalid branch name')
], validation, async (req, res) => {
  try {
    // This would add a bank account
    // Implementation depends on your business logic
    res.status(201).json({
      success: true,
      message: 'Bank account added successfully'
    });
  } catch (error) {
    logger.error('Error adding bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bank account',
      error: error.message
    });
  }
});

// Add digital wallet
router.post('/digital-wallets', auth, [
  body('wallet_provider').isIn(['JAZZCASH', 'EASYPAISA', 'PAYPAL', 'STRIPE', 'WISE']).withMessage('Invalid wallet provider'),
  body('wallet_type').isIn(['MOBILE', 'DIGITAL', 'CRYPTO']).withMessage('Invalid wallet type'),
  body('wallet_id').isLength({ min: 1, max: 100 }).withMessage('Invalid wallet ID'),
  body('wallet_name').optional().isLength({ min: 1, max: 100 }).withMessage('Invalid wallet name')
], validation, async (req, res) => {
  try {
    // This would add a digital wallet
    // Implementation depends on your business logic
    res.status(201).json({
      success: true,
      message: 'Digital wallet added successfully'
    });
  } catch (error) {
    logger.error('Error adding digital wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add digital wallet',
      error: error.message
    });
  }
});

// Get bank accounts
router.get('/bank-accounts', auth, async (req, res) => {
  try {
    // This would get user's bank accounts
    // Implementation depends on your business logic
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    logger.error('Error getting bank accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bank accounts',
      error: error.message
    });
  }
});

// Get digital wallets
router.get('/digital-wallets', auth, async (req, res) => {
  try {
    // This would get user's digital wallets
    // Implementation depends on your business logic
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    logger.error('Error getting digital wallets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get digital wallets',
      error: error.message
    });
  }
});

// Verify bank account
router.post('/bank-accounts/:id/verify', auth, [
  body('verification_method').isIn(['MANUAL', 'AUTOMATED', 'THIRD_PARTY']).withMessage('Invalid verification method'),
  body('verification_code').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid verification code')
], validation, async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_method, verification_code } = req.body;
    
    // This would verify the bank account
    // Implementation depends on your business logic
    res.json({
      success: true,
      message: 'Bank account verification initiated'
    });
  } catch (error) {
    logger.error('Error verifying bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bank account',
      error: error.message
    });
  }
});

// Verify digital wallet
router.post('/digital-wallets/:id/verify', auth, [
  body('verification_method').isIn(['MANUAL', 'AUTOMATED', 'THIRD_PARTY']).withMessage('Invalid verification method'),
  body('verification_code').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid verification code')
], validation, async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_method, verification_code } = req.body;
    
    // This would verify the digital wallet
    // Implementation depends on your business logic
    res.json({
      success: true,
      message: 'Digital wallet verification initiated'
    });
  } catch (error) {
    logger.error('Error verifying digital wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify digital wallet',
      error: error.message
    });
  }
});

// Delete bank account
router.delete('/bank-accounts/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would delete the bank account
    // Implementation depends on your business logic
    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error.message
    });
  }
});

// Delete digital wallet
router.delete('/digital-wallets/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would delete the digital wallet
    // Implementation depends on your business logic
    res.json({
      success: true,
      message: 'Digital wallet deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting digital wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete digital wallet',
      error: error.message
    });
  }
});

module.exports = router;
