const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

// Handle webhook from payment gateway
router.post('/:gateway', async (req, res) => {
  try {
    const { gateway } = req.params;
    const webhookData = {
      headers: req.headers,
      body: req.body,
      query: req.query
    };
    
    const result = await req.app.locals.services.paymentGateway.handleWebhook(gateway, webhookData);
    
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

module.exports = router;
