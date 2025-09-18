const express = require('express');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

const router = express.Router();

// Perform KYC verification
router.post('/kyc', auth, [
  body('document_type').isIn(['CNIC', 'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID']).withMessage('Invalid document type'),
  body('document_number').isLength({ min: 5, max: 50 }).withMessage('Invalid document number'),
  body('document_image').isBase64().withMessage('Invalid document image'),
  body('personal_info.first_name').isLength({ min: 1, max: 100 }).withMessage('Invalid first name'),
  body('personal_info.last_name').isLength({ min: 1, max: 100 }).withMessage('Invalid last name'),
  body('personal_info.date_of_birth').isISO8601().withMessage('Invalid date of birth'),
  body('personal_info.nationality').isLength({ min: 2, max: 3 }).withMessage('Invalid nationality'),
  body('personal_info.address.street').isLength({ min: 1, max: 200 }).withMessage('Invalid street address'),
  body('personal_info.address.city').isLength({ min: 1, max: 100 }).withMessage('Invalid city'),
  body('personal_info.address.state').isLength({ min: 1, max: 100 }).withMessage('Invalid state'),
  body('personal_info.address.postal_code').isLength({ min: 1, max: 20 }).withMessage('Invalid postal code'),
  body('personal_info.address.country').isLength({ min: 2, max: 3 }).withMessage('Invalid country')
], validation, async (req, res) => {
  try {
    const result = await req.app.locals.services.compliance.performKYCVerification(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'KYC verification completed',
      data: result
    });
  } catch (error) {
    logger.error('Error performing KYC verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform KYC verification',
      error: error.message
    });
  }
});

// Perform AML screening
router.post('/aml-screening', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
  body('transaction_type').isIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']).withMessage('Invalid transaction type'),
  body('counterparty').optional().isObject().withMessage('Invalid counterparty data')
], validation, async (req, res) => {
  try {
    const result = await req.app.locals.services.compliance.performAMLScreening(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'AML screening completed',
      data: result
    });
  } catch (error) {
    logger.error('Error performing AML screening:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform AML screening',
      error: error.message
    });
  }
});

// Get compliance status
router.get('/status', auth, async (req, res) => {
  try {
    // This would get user's compliance status
    // Implementation depends on your business logic
    res.json({
      success: true,
      data: {
        kyc_status: 'pending',
        aml_status: 'cleared',
        compliance_score: 0.8
      }
    });
  } catch (error) {
    logger.error('Error getting compliance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance status',
      error: error.message
    });
  }
});

// Get compliance history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // This would get user's compliance history
    // Implementation depends on your business logic
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    logger.error('Error getting compliance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance history',
      error: error.message
    });
  }
});

module.exports = router;
