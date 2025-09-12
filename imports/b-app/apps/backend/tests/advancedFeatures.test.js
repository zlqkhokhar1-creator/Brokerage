/**
 * Advanced Features Test Suite
 * Tests for new AI, analytics, education, and advanced trading features
 */

const request = require('supertest');
const app = require('../src/app');

describe('Advanced Features API', () => {
  let server;
  let authToken = 'mock-jwt-token'; // Mock token for testing

  beforeAll(async () => {
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  // Helper function to make authenticated requests
  const authRequest = (method, path) => {
    return request(app)[method](path)
      .set('Authorization', `Bearer ${authToken}`);
  };

  describe('AI Analytics Module', () => {
    test('GET /api/v1/advanced/ai-analytics/weekly-insights', async () => {
      const response = await authRequest('get', '/api/v1/advanced/ai-analytics/weekly-insights');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('portfolioPerformance');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('GET /api/v1/advanced/ai-analytics/morning-briefing', async () => {
      const response = await authRequest('get', '/api/v1/advanced/ai-analytics/morning-briefing');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('greeting');
      expect(response.body.data).toHaveProperty('marketSummary');
      expect(response.body.data).toHaveProperty('portfolioUpdates');
    });

    test('POST /api/v1/advanced/ai-analytics/cash-flow-prediction', async () => {
      const requestData = {
        portfolioId: 'test-portfolio-123',
        timeHorizon: '1Y'
      };

      const response = await authRequest('post', '/api/v1/advanced/ai-analytics/cash-flow-prediction')
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPredictedCashFlow');
      expect(response.body.data).toHaveProperty('monthlyBreakdown');
      expect(response.body.data).toHaveProperty('confidence');
    });

    test('GET /api/v1/advanced/ai-analytics/personalized-news', async () => {
      const response = await authRequest('get', '/api/v1/advanced/ai-analytics/personalized-news?limit=10');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('articles');
      expect(Array.isArray(response.body.data.articles)).toBe(true);
    });
  });

  describe('Education Module', () => {
    test('GET /api/v1/advanced/education/tutorials', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/tutorials');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('recommended');
    });

    test('GET /api/v1/advanced/education/learning-path', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/learning-path');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pathId');
      expect(response.body.data).toHaveProperty('modules');
      expect(response.body.data).toHaveProperty('progress');
    });

    test('GET /api/v1/advanced/education/gamified-modules', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/gamified-modules');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userLevel');
      expect(response.body.data).toHaveProperty('badges');
      expect(response.body.data).toHaveProperty('modules');
    });

    test('GET /api/v1/advanced/education/coach-feedback', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/coach-feedback');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('GET /api/v1/advanced/education/glossary', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/glossary?search=option');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('terms');
    });

    test('GET /api/v1/advanced/education/webinars', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/webinars');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('upcoming');
      expect(response.body.data).toHaveProperty('recorded');
    });

    test('GET /api/v1/advanced/education/quizzes', async () => {
      const response = await authRequest('get', '/api/v1/advanced/education/quizzes');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('topics');
    });
  });

  describe('Portfolio Analytics Module', () => {
    const testPortfolioId = 'test-portfolio-123';

    test('GET /api/v1/advanced/portfolio-analytics/performance-attribution/:portfolioId', async () => {
      const response = await authRequest('get', `/api/v1/advanced/portfolio-analytics/performance-attribution/${testPortfolioId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalReturn');
      expect(response.body.data).toHaveProperty('attribution');
    });

    test('GET /api/v1/advanced/portfolio-analytics/factor-exposure/:portfolioId', async () => {
      const response = await authRequest('get', `/api/v1/advanced/portfolio-analytics/factor-exposure/${testPortfolioId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('styleFactors');
      expect(response.body.data).toHaveProperty('macroFactors');
    });

    test('GET /api/v1/advanced/portfolio-analytics/currency-hedging/:portfolioId', async () => {
      const response = await authRequest('get', `/api/v1/advanced/portfolio-analytics/currency-hedging/${testPortfolioId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCurrencyExposure');
      expect(response.body.data).toHaveProperty('hedgingRecommendations');
    });

    test('POST /api/v1/advanced/portfolio-analytics/tax-impact-preview/:portfolioId', async () => {
      const requestData = {
        proposedTrades: [
          {
            symbol: 'AAPL',
            side: 'SELL',
            quantity: 100,
            orderType: 'MARKET'
          }
        ]
      };

      const response = await authRequest('post', `/api/v1/advanced/portfolio-analytics/tax-impact-preview/${testPortfolioId}`)
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalTaxLiability');
    });

    test('GET /api/v1/advanced/portfolio-analytics/benchmarks', async () => {
      const response = await authRequest('get', '/api/v1/advanced/portfolio-analytics/benchmarks');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('custom');
      expect(response.body.data).toHaveProperty('standard');
    });

    test('POST /api/v1/advanced/portfolio-analytics/retirement-planning', async () => {
      const requestData = {
        retirementAge: 65,
        currentAge: 35,
        targetAmount: 1000000,
        currentSavings: 50000,
        monthlyContribution: 2000,
        assumptions: {
          returnRate: 0.07,
          inflationRate: 0.03
        }
      };

      const response = await authRequest('post', '/api/v1/advanced/portfolio-analytics/retirement-planning')
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projectedRetirementValue');
      expect(response.body.data).toHaveProperty('probabilityOfSuccess');
    });
  });

  describe('Security & Compliance Module', () => {
    test('GET /api/v1/advanced/security-compliance/documents', async () => {
      const response = await authRequest('get', '/api/v1/advanced/security-compliance/documents');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('documents');
      expect(response.body.data).toHaveProperty('categories');
    });

    test('GET /api/v1/advanced/security-compliance/privacy-controls', async () => {
      const response = await authRequest('get', '/api/v1/advanced/security-compliance/privacy-controls');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profileVisibility');
      expect(response.body.data).toHaveProperty('portfolioSharing');
    });

    test('PUT /api/v1/advanced/security-compliance/privacy-controls', async () => {
      const requestData = {
        profileVisibility: 'private',
        portfolioSharing: 'none',
        tradeSharing: 'none'
      };

      const response = await authRequest('put', '/api/v1/advanced/security-compliance/privacy-controls')
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('updatedControls');
    });

    test('GET /api/v1/advanced/security-compliance/audit-logs', async () => {
      const response = await authRequest('get', '/api/v1/advanced/security-compliance/audit-logs?limit=10');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('totalCount');
    });

    test('GET /api/v1/advanced/security-compliance/dashboard', async () => {
      const response = await authRequest('get', '/api/v1/advanced/security-compliance/dashboard');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('securityScore');
      expect(response.body.data).toHaveProperty('riskLevel');
    });
  });

  describe('Social Collaboration Module', () => {
    test('GET /api/v1/advanced/social-collaboration/research-workspaces', async () => {
      const response = await authRequest('get', '/api/v1/advanced/social-collaboration/research-workspaces');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('owned');
      expect(response.body.data).toHaveProperty('collaborated');
    });

    test('GET /api/v1/advanced/social-collaboration/group-analysis', async () => {
      const response = await authRequest('get', '/api/v1/advanced/social-collaboration/group-analysis');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('upcoming');
      expect(response.body.data).toHaveProperty('live');
    });

    test('GET /api/v1/advanced/social-collaboration/expert-qa', async () => {
      const response = await authRequest('get', '/api/v1/advanced/social-collaboration/expert-qa');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('upcoming');
      expect(response.body.data).toHaveProperty('experts');
    });

    test('GET /api/v1/advanced/social-collaboration/trading-competitions', async () => {
      const response = await authRequest('get', '/api/v1/advanced/social-collaboration/trading-competitions');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('upcoming');
    });

    test('GET /api/v1/advanced/social-collaboration/community/discussions', async () => {
      const response = await authRequest('get', '/api/v1/advanced/social-collaboration/community/discussions');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trending');
      expect(response.body.data).toHaveProperty('latest');
    });
  });

  describe('Advanced Trading Module', () => {
    const testSymbol = 'AAPL';

    test('GET /api/v1/advanced/advanced-trading/volume-profile/:symbol', async () => {
      const response = await authRequest('get', `/api/v1/advanced/advanced-trading/volume-profile/${testSymbol}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pointOfControl');
      expect(response.body.data).toHaveProperty('valueAreaHigh');
      expect(response.body.data).toHaveProperty('valueAreaLow');
    });

    test('GET /api/v1/advanced/advanced-trading/volume-profile/:symbol/multi-timeframe', async () => {
      const response = await authRequest('get', `/api/v1/advanced/advanced-trading/volume-profile/${testSymbol}/multi-timeframe?timeframes=1H,4H,1D`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('individual');
      expect(response.body.data).toHaveProperty('consolidated');
    });

    test('POST /api/v1/advanced/advanced-trading/paper-trading/accounts', async () => {
      const requestData = {
        initialBalance: 100000,
        accountType: 'margin',
        simulationMode: 'realistic',
        features: ['options', 'international']
      };

      const response = await authRequest('post', '/api/v1/advanced/advanced-trading/paper-trading/accounts')
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accountId');
      expect(response.body.data).toHaveProperty('initialBalance');
      expect(response.body.data.initialBalance).toBe(100000);
    });

    test('GET /api/v1/advanced/advanced-trading/paper-trading/leaderboard', async () => {
      const response = await authRequest('get', '/api/v1/advanced/advanced-trading/paper-trading/leaderboard');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rankings');
      expect(response.body.data).toHaveProperty('totalParticipants');
    });

    test('GET /api/v1/advanced/advanced-trading/technical-analysis/:symbol', async () => {
      const response = await authRequest('get', `/api/v1/advanced/advanced-trading/technical-analysis/${testSymbol}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('technicalIndicators');
      expect(response.body.data).toHaveProperty('signals');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('POST /api/v1/advanced/advanced-trading/haptic-feedback/configure', async () => {
      const requestData = {
        deviceInfo: { type: 'mobile', platform: 'iOS', version: '15.0' },
        preferences: {
          tradeExecution: 'medium',
          priceAlerts: 'light',
          errors: 'strong'
        }
      };

      const response = await authRequest('post', '/api/v1/advanced/advanced-trading/haptic-feedback/configure')
        .send(requestData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configurationId');
      expect(response.body.data).toHaveProperty('deviceSupported');
    });
  });

  describe('API Validation', () => {
    test('Should return 400 for invalid cash flow prediction request', async () => {
      const invalidData = {
        portfolioId: '', // Invalid: empty string
        timeHorizon: 'INVALID' // Invalid: not in allowed values
      };

      const response = await authRequest('post', '/api/v1/advanced/ai-analytics/cash-flow-prediction')
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('portfolioId');
    });

    test('Should return 400 for invalid paper trade order', async () => {
      const accountId = 'test-account';
      const invalidOrder = {
        symbol: '', // Invalid: empty string
        side: 'INVALID', // Invalid: not BUY or SELL
        quantity: -100, // Invalid: negative quantity
        orderType: 'LIMIT'
        // Missing required price for LIMIT order
      };

      const response = await authRequest('post', `/api/v1/advanced/advanced-trading/paper-trading/accounts/${accountId}/trades`)
        .send(invalidOrder);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should return 400 for invalid privacy controls update', async () => {
      const invalidControls = {
        profileVisibility: 'INVALID', // Invalid: not in allowed values
        portfolioSharing: 'INVALID'
      };

      const response = await authRequest('put', '/api/v1/advanced/security-compliance/privacy-controls')
        .send(invalidControls);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

// Mock middleware for authentication in tests
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user'
  };
  next();
};

module.exports = {
  mockAuthMiddleware
};