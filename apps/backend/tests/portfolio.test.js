const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

describe('Portfolio API', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM portfolio_holdings');
    await db.query('DELETE FROM portfolios WHERE user_id > 0');
    await db.query('DELETE FROM user_sessions');
    await db.query('DELETE FROM accounts WHERE user_id > 0');
    await db.query('DELETE FROM users WHERE email LIKE %test%');

    // Create and login a test user
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    userId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await db.query('DELETE FROM portfolio_holdings');
    await db.query('DELETE FROM portfolios WHERE user_id > 0');
    await db.query('DELETE FROM user_sessions');
    await db.query('DELETE FROM accounts WHERE user_id > 0');
    await db.query('DELETE FROM users WHERE email LIKE %test%');
  });

  describe('GET /api/v1/portfolio', () => {
    it('should get user portfolios', async () => {
      const response = await request(app)
        .get('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have default portfolio created during registration
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/portfolio')
        .expect(401);

      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('POST /api/v1/portfolio', () => {
    it('should create a new portfolio', async () => {
      const portfolioData = {
        name: 'Test Portfolio',
        description: 'A test portfolio',
        strategy: 'manual',
        riskLevel: 'moderate',
        targetReturn: 8.5,
        rebalanceFrequency: 'quarterly'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData)
        .expect(201);

      expect(response.body.name).toBe(portfolioData.name);
      expect(response.body.description).toBe(portfolioData.description);
      expect(response.body.strategy).toBe(portfolioData.strategy);
    });

    it('should reject portfolio creation without name', async () => {
      const portfolioData = {
        description: 'A test portfolio without name'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData)
        .expect(400);

      expect(response.body.message).toBe('Portfolio name is required and must be at least 2 characters');
    });
  });

  describe('GET /api/v1/portfolio/:portfolioId', () => {
    let portfolioId;

    beforeEach(async () => {
      // Create a test portfolio
      const portfolioData = {
        name: 'Test Portfolio',
        description: 'A test portfolio'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData);

      portfolioId = response.body.id;
    });

    it('should get portfolio details', async () => {
      const response = await request(app)
        .get(`/api/v1/portfolio/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(portfolioId);
      expect(response.body.name).toBe('Test Portfolio');
      expect(response.body.holdings).toBeDefined();
      expect(Array.isArray(response.body.holdings)).toBe(true);
    });

    it('should reject request for non-existent portfolio', async () => {
      const response = await request(app)
        .get('/api/v1/portfolio/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Portfolio not found');
    });
  });

  describe('PUT /api/v1/portfolio/:portfolioId', () => {
    let portfolioId;

    beforeEach(async () => {
      // Create a test portfolio
      const portfolioData = {
        name: 'Test Portfolio',
        description: 'A test portfolio'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData);

      portfolioId = response.body.id;
    });

    it('should update portfolio', async () => {
      const updateData = {
        name: 'Updated Portfolio',
        description: 'Updated description',
        riskLevel: 'aggressive'
      };

      const response = await request(app)
        .put(`/api/v1/portfolio/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.risk_level).toBe(updateData.riskLevel);
    });

    it('should reject update for non-existent portfolio', async () => {
      const updateData = {
        name: 'Updated Portfolio'
      };

      const response = await request(app)
        .put('/api/v1/portfolio/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('Portfolio not found');
    });
  });

  describe('DELETE /api/v1/portfolio/:portfolioId', () => {
    let portfolioId;

    beforeEach(async () => {
      // Create a test portfolio
      const portfolioData = {
        name: 'Test Portfolio',
        description: 'A test portfolio'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData);

      portfolioId = response.body.id;
    });

    it('should delete portfolio', async () => {
      const response = await request(app)
        .delete(`/api/v1/portfolio/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Portfolio deleted successfully');
    });

    it('should reject delete for non-existent portfolio', async () => {
      const response = await request(app)
        .delete('/api/v1/portfolio/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Portfolio not found');
    });
  });

  describe('GET /api/v1/portfolio/:portfolioId/performance', () => {
    let portfolioId;

    beforeEach(async () => {
      // Create a test portfolio
      const portfolioData = {
        name: 'Test Portfolio',
        description: 'A test portfolio'
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolioData);

      portfolioId = response.body.id;
    });

    it('should get portfolio performance', async () => {
      const response = await request(app)
        .get(`/api/v1/portfolio/${portfolioId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.period).toBeDefined();
      expect(response.body.realizedPnL).toBeDefined();
      expect(response.body.unrealizedPnL).toBeDefined();
      expect(response.body.totalPnL).toBeDefined();
      expect(response.body.currentValue).toBeDefined();
    });

    it('should get portfolio performance for specific period', async () => {
      const response = await request(app)
        .get(`/api/v1/portfolio/${portfolioId}/performance?period=1M`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.period).toBe('1M');
    });
  });
});


