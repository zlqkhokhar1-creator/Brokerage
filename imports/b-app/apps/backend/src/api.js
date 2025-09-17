const express = require('express');
const authRoutes = require('./auth');
const portfolioRoutes = require('./portfolio');
const tradingRoutes = require('./trading');
const kycRoutes = require('./kyc');
const paymentRoutes = require('./payments');
const aiRecommendationsRoutes = require('./aiRecommendations');
const socialTradingRoutes = require('./socialTrading');
const advancedOrdersRoutes = require('./advancedOrders');
const internationalMarketsRoutes = require('./internationalMarkets');
const { router: marketDataRoutes } = require('./marketData');
const { rateLimit } = require('./middleware');

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimit(15 * 60 * 1000, 1000)); // 1000 requests per 15 minutes

router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Brokerage Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      portfolio: '/api/v1/portfolio',
      trading: '/api/v1/trading',
      kyc: '/api/v1/kyc',
      marketData: '/api/v1/market-data',
      payments: '/api/v1/payments',
      aiRecommendations: '/api/v1/ai-recommendations',
      socialTrading: '/api/v1/social-trading',
      advancedOrders: '/api/v1/advanced-orders',
      internationalMarkets: '/api/v1/international-markets'
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/trading', tradingRoutes);
router.use('/kyc', kycRoutes);
router.use('/payments', paymentRoutes);
router.use('/ai-recommendations', aiRecommendationsRoutes);
router.use('/social-trading', socialTradingRoutes);
router.use('/advanced-orders', advancedOrdersRoutes);
router.use('/international-markets', internationalMarketsRoutes);
router.use('/market-data', marketDataRoutes);

module.exports = router;
