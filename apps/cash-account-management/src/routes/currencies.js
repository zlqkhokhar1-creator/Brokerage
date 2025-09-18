const express = require('express');
const { query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

const router = express.Router();

// Get exchange rate
router.get('/exchange-rate', auth, [
  query('from').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid from currency'),
  query('to').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid to currency'),
  query('date').optional().isISO8601().withMessage('Invalid date format')
], validation, async (req, res) => {
  try {
    const { from, to, date } = req.query;
    const rate = await req.app.locals.services.currencyExchange.getExchangeRate(from, to, date);
    
    res.json({
      success: true,
      data: {
        from_currency: from,
        to_currency: to,
        exchange_rate: rate,
        date: date || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    logger.error('Error getting exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rate',
      error: error.message
    });
  }
});

// Convert currency
router.post('/convert', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('from_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid from currency'),
  body('to_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid to currency'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], validation, async (req, res) => {
  try {
    const { amount, from_currency, to_currency, date } = req.body;
    const result = await req.app.locals.services.currencyExchange.convertCurrency(amount, from_currency, to_currency, date);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
});

// Get multiple exchange rates
router.post('/exchange-rates', auth, [
  body('base_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid base currency'),
  body('target_currencies').isArray({ min: 1, max: 10 }).withMessage('Invalid target currencies array'),
  body('target_currencies.*').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid target currency'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], validation, async (req, res) => {
  try {
    const { base_currency, target_currencies, date } = req.body;
    const rates = await req.app.locals.services.currencyExchange.getMultipleRates(base_currency, target_currencies, date);
    
    res.json({
      success: true,
      data: {
        base_currency,
        target_currencies,
        rates,
        date: date || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    logger.error('Error getting multiple exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rates',
      error: error.message
    });
  }
});

// Get historical exchange rates
router.get('/historical-rates', auth, [
  query('from').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid from currency'),
  query('to').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid to currency'),
  query('start_date').isISO8601().withMessage('Invalid start date format'),
  query('end_date').isISO8601().withMessage('Invalid end date format')
], validation, async (req, res) => {
  try {
    const { from, to, start_date, end_date } = req.query;
    const rates = await req.app.locals.services.currencyExchange.getHistoricalRates(from, to, start_date, end_date);
    
    res.json({
      success: true,
      data: {
        from_currency: from,
        to_currency: to,
        start_date,
        end_date,
        rates
      }
    });
  } catch (error) {
    logger.error('Error getting historical exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical exchange rates',
      error: error.message
    });
  }
});

// Calculate conversion fees
router.post('/conversion-fees', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('from_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid from currency'),
  body('to_currency').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid to currency')
], validation, async (req, res) => {
  try {
    const { amount, from_currency, to_currency } = req.body;
    const fees = await req.app.locals.services.currencyExchange.calculateConversionFees(amount, from_currency, to_currency);
    
    res.json({
      success: true,
      data: fees
    });
  } catch (error) {
    logger.error('Error calculating conversion fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate conversion fees',
      error: error.message
    });
  }
});

// Get currency information
router.get('/info/:currency', auth, async (req, res) => {
  try {
    const { currency } = req.params;
    const info = await req.app.locals.services.currencyExchange.getCurrencyInfo(currency);
    
    if (!info) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    logger.error('Error getting currency information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get currency information',
      error: error.message
    });
  }
});

// Get supported currencies
router.get('/supported', auth, async (req, res) => {
  try {
    const currencies = ['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    const currencyInfo = {};
    
    for (const currency of currencies) {
      currencyInfo[currency] = await req.app.locals.services.currencyExchange.getCurrencyInfo(currency);
    }
    
    res.json({
      success: true,
      data: {
        currencies,
        currency_info: currencyInfo
      }
    });
  } catch (error) {
    logger.error('Error getting supported currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported currencies',
      error: error.message
    });
  }
});

// Get exchange rate statistics
router.get('/stats', auth, [
  query('from').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid from currency'),
  query('to').isIn(['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid to currency'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Invalid days parameter')
], validation, async (req, res) => {
  try {
    const { from, to, days = 30 } = req.query;
    const stats = await req.app.locals.services.currencyExchange.getExchangeRateStats(from, to, parseInt(days));
    
    res.json({
      success: true,
      data: {
        from_currency: from,
        to_currency: to,
        period_days: parseInt(days),
        statistics: stats
      }
    });
  } catch (error) {
    logger.error('Error getting exchange rate statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rate statistics',
      error: error.message
    });
  }
});

module.exports = router;
