const { EventEmitter } = require('events');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.integrations = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Initialize integrations
      this.initializeIntegrations();
      
      this._initialized = true;
      logger.info('FundIntegrationService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundIntegrationService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundIntegrationService closed');
    } catch (error) {
      logger.error('Error closing FundIntegrationService:', error);
    }
  }

  initializeIntegrations() {
    try {
      // Initialize third-party integrations
      this.integrations.set('brokerage_api', {
        name: 'Brokerage API',
        baseUrl: process.env.BROKERAGE_API_URL || 'https://api.brokerage.com',
        apiKey: process.env.BROKERAGE_API_KEY,
        rateLimit: 100, // requests per minute
        lastRequest: 0
      });

      this.integrations.set('market_data_provider', {
        name: 'Market Data Provider',
        baseUrl: process.env.MARKET_DATA_URL || 'https://api.marketdata.com',
        apiKey: process.env.MARKET_DATA_API_KEY,
        rateLimit: 60,
        lastRequest: 0
      });

      this.integrations.set('news_provider', {
        name: 'News Provider',
        baseUrl: process.env.NEWS_API_URL || 'https://api.news.com',
        apiKey: process.env.NEWS_API_KEY,
        rateLimit: 30,
        lastRequest: 0
      });

      this.integrations.set('regulatory_api', {
        name: 'Regulatory API',
        baseUrl: process.env.REGULATORY_API_URL || 'https://api.regulatory.com',
        apiKey: process.env.REGULATORY_API_KEY,
        rateLimit: 10,
        lastRequest: 0
      });

      this.integrations.set('tax_service', {
        name: 'Tax Service',
        baseUrl: process.env.TAX_SERVICE_URL || 'https://api.taxservice.com',
        apiKey: process.env.TAX_SERVICE_API_KEY,
        rateLimit: 20,
        lastRequest: 0
      });

      logger.info('Integrations initialized');
    } catch (error) {
      logger.error('Error initializing integrations:', error);
    }
  }

  async syncFundData() {
    try {
      logger.info('Starting fund data synchronization...');

      // Sync fund catalog
      await this.syncFundCatalog();

      // Sync fund performance
      await this.syncFundPerformance();

      // Sync fund holdings
      await this.syncFundHoldings();

      // Sync fund news
      await this.syncFundNews();

      logger.info('Fund data synchronization completed');
    } catch (error) {
      logger.error('Error syncing fund data:', error);
      throw error;
    }
  }

  async syncFundCatalog() {
    try {
      const integration = this.integrations.get('brokerage_api');
      if (!integration) {
        throw new Error('Brokerage API integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Fetch fund catalog from brokerage API
      const response = await axios.get(`${integration.baseUrl}/funds/catalog`, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const fundData = response.data;

      // Process and store fund data
      for (const fund of fundData.funds) {
        await this.processFundData(fund);
      }

      // Update last request time
      integration.lastRequest = Date.now();

      logger.info(`Synced ${fundData.funds.length} funds from brokerage API`);
    } catch (error) {
      logger.error('Error syncing fund catalog:', error);
      throw error;
    }
  }

  async syncFundPerformance() {
    try {
      const integration = this.integrations.get('market_data_provider');
      if (!integration) {
        throw new Error('Market data provider integration not configured');
      }

      // Get all active funds
      const funds = await this.getActiveFunds();

      for (const fund of funds) {
        try {
          // Check rate limiting
          await this.checkRateLimit(integration);

          // Fetch performance data
          const response = await axios.get(`${integration.baseUrl}/funds/${fund.symbol}/performance`, {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          const performanceData = response.data;

          // Process and store performance data
          await this.processPerformanceData(fund.id, performanceData);

          // Rate limiting delay
          await this.rateLimitDelay();
        } catch (error) {
          logger.warn(`Error syncing performance for fund ${fund.symbol}:`, error.message);
        }
      }

      logger.info(`Synced performance data for ${funds.length} funds`);
    } catch (error) {
      logger.error('Error syncing fund performance:', error);
      throw error;
    }
  }

  async syncFundHoldings() {
    try {
      const integration = this.integrations.get('brokerage_api');
      if (!integration) {
        throw new Error('Brokerage API integration not configured');
      }

      // Get all active funds
      const funds = await this.getActiveFunds();

      for (const fund of funds) {
        try {
          // Check rate limiting
          await this.checkRateLimit(integration);

          // Fetch holdings data
          const response = await axios.get(`${integration.baseUrl}/funds/${fund.symbol}/holdings`, {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });

          const holdingsData = response.data;

          // Process and store holdings data
          await this.processHoldingsData(fund.id, holdingsData);

          // Rate limiting delay
          await this.rateLimitDelay();
        } catch (error) {
          logger.warn(`Error syncing holdings for fund ${fund.symbol}:`, error.message);
        }
      }

      logger.info(`Synced holdings data for ${funds.length} funds`);
    } catch (error) {
      logger.error('Error syncing fund holdings:', error);
      throw error;
    }
  }

  async syncFundNews() {
    try {
      const integration = this.integrations.get('news_provider');
      if (!integration) {
        throw new Error('News provider integration not configured');
      }

      // Get all active funds
      const funds = await this.getActiveFunds();

      for (const fund of funds) {
        try {
          // Check rate limiting
          await this.checkRateLimit(integration);

          // Fetch news data
          const response = await axios.get(`${integration.baseUrl}/news/funds/${fund.symbol}`, {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          const newsData = response.data;

          // Process and store news data
          await this.processNewsData(fund.id, newsData);

          // Rate limiting delay
          await this.rateLimitDelay();
        } catch (error) {
          logger.warn(`Error syncing news for fund ${fund.symbol}:`, error.message);
        }
      }

      logger.info(`Synced news data for ${funds.length} funds`);
    } catch (error) {
      logger.error('Error syncing fund news:', error);
      throw error;
    }
  }

  async processFundData(fundData) {
    try {
      // Check if fund already exists
      const existingFund = await pool.query(`
        SELECT id FROM mutual_funds WHERE symbol = $1
      `, [fundData.symbol]);

      if (existingFund.rows.length > 0) {
        // Update existing fund
        await pool.query(`
          UPDATE mutual_funds
          SET name = $1, expense_ratio = $2, management_fee = $3,
              minimum_investment = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
          WHERE symbol = $6
        `, [
          fundData.name,
          fundData.expense_ratio,
          fundData.management_fee,
          fundData.minimum_investment,
          fundData.is_active,
          fundData.symbol
        ]);
      } else {
        // Create new fund
        await pool.query(`
          INSERT INTO mutual_funds (
            symbol, name, fund_family_id, category_id, expense_ratio,
            management_fee, minimum_investment, is_active, is_tradeable
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          fundData.symbol,
          fundData.name,
          fundData.fund_family_id,
          fundData.category_id,
          fundData.expense_ratio,
          fundData.management_fee,
          fundData.minimum_investment,
          fundData.is_active,
          fundData.is_tradeable
        ]);
      }

      logger.debug(`Processed fund data for ${fundData.symbol}`);
    } catch (error) {
      logger.error('Error processing fund data:', error);
      throw error;
    }
  }

  async processPerformanceData(fundId, performanceData) {
    try {
      // Store performance data
      await pool.query(`
        INSERT INTO fund_performance (
          fund_id, date, nav, change_amount, change_percentage,
          total_return_1d, total_return_1w, total_return_1m, total_return_3m,
          total_return_6m, total_return_1y, total_return_ytd,
          assets_under_management, shares_outstanding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (fund_id, date)
        DO UPDATE SET
          nav = EXCLUDED.nav,
          change_amount = EXCLUDED.change_amount,
          change_percentage = EXCLUDED.change_percentage,
          total_return_1d = EXCLUDED.total_return_1d,
          total_return_1w = EXCLUDED.total_return_1w,
          total_return_1m = EXCLUDED.total_return_1m,
          total_return_3m = EXCLUDED.total_return_3m,
          total_return_6m = EXCLUDED.total_return_6m,
          total_return_1y = EXCLUDED.total_return_1y,
          total_return_ytd = EXCLUDED.total_return_ytd,
          assets_under_management = EXCLUDED.assets_under_management,
          shares_outstanding = EXCLUDED.shares_outstanding
      `, [
        fundId,
        performanceData.date,
        performanceData.nav,
        performanceData.change_amount,
        performanceData.change_percentage,
        performanceData.total_return_1d,
        performanceData.total_return_1w,
        performanceData.total_return_1m,
        performanceData.total_return_3m,
        performanceData.total_return_6m,
        performanceData.total_return_1y,
        performanceData.total_return_ytd,
        performanceData.assets_under_management,
        performanceData.shares_outstanding
      ]);

      logger.debug(`Processed performance data for fund ${fundId}`);
    } catch (error) {
      logger.error('Error processing performance data:', error);
      throw error;
    }
  }

  async processHoldingsData(fundId, holdingsData) {
    try {
      // Start transaction
      await pool.query('BEGIN');

      try {
        // Delete existing holdings for this fund
        await pool.query(`
          DELETE FROM fund_holdings
          WHERE fund_id = $1
        `, [fundId]);

        // Insert new holdings
        for (const holding of holdingsData.holdings) {
          await pool.query(`
            INSERT INTO fund_holdings (
              fund_id, holding_symbol, holding_name, sector, industry, country,
              market_value, shares_held, percentage_of_fund, cost_basis,
              unrealized_gain_loss, as_of_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            fundId,
            holding.holding_symbol,
            holding.holding_name,
            holding.sector,
            holding.industry,
            holding.country,
            holding.market_value,
            holding.shares_held,
            holding.percentage_of_fund,
            holding.cost_basis,
            holding.unrealized_gain_loss,
            holdingsData.as_of_date
          ]);
        }

        // Commit transaction
        await pool.query('COMMIT');

        logger.debug(`Processed holdings data for fund ${fundId}`);
      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error processing holdings data:', error);
      throw error;
    }
  }

  async processNewsData(fundId, newsData) {
    try {
      // Store news data (this would go to a news table)
      for (const news of newsData.articles) {
        await pool.query(`
          INSERT INTO fund_news (
            fund_id, title, content, source, published_at, url
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (fund_id, url)
          DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            source = EXCLUDED.source,
            published_at = EXCLUDED.published_at
        `, [
          fundId,
          news.title,
          news.content,
          news.source,
          news.published_at,
          news.url
        ]);
      }

      logger.debug(`Processed news data for fund ${fundId}`);
    } catch (error) {
      logger.error('Error processing news data:', error);
      throw error;
    }
  }

  async executeTrade(tradeData) {
    try {
      const integration = this.integrations.get('brokerage_api');
      if (!integration) {
        throw new Error('Brokerage API integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Execute trade through brokerage API
      const response = await axios.post(`${integration.baseUrl}/trades/execute`, tradeData, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const tradeResult = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      logger.info(`Trade executed: ${tradeResult.trade_id}`);

      return tradeResult;
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  async getAccountBalance(userId) {
    try {
      const integration = this.integrations.get('brokerage_api');
      if (!integration) {
        throw new Error('Brokerage API integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Get account balance from brokerage API
      const response = await axios.get(`${integration.baseUrl}/accounts/${userId}/balance`, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const balanceData = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      return balanceData;
    } catch (error) {
      logger.error('Error getting account balance:', error);
      throw error;
    }
  }

  async getMarketData(symbols) {
    try {
      const integration = this.integrations.get('market_data_provider');
      if (!integration) {
        throw new Error('Market data provider integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Get market data
      const response = await axios.get(`${integration.baseUrl}/market-data`, {
        params: { symbols: symbols.join(',') },
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const marketData = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      return marketData;
    } catch (error) {
      logger.error('Error getting market data:', error);
      throw error;
    }
  }

  async getNews(symbols, limit = 10) {
    try {
      const integration = this.integrations.get('news_provider');
      if (!integration) {
        throw new Error('News provider integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Get news data
      const response = await axios.get(`${integration.baseUrl}/news`, {
        params: { 
          symbols: symbols.join(','),
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const newsData = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      return newsData;
    } catch (error) {
      logger.error('Error getting news:', error);
      throw error;
    }
  }

  async getRegulatoryData(fundId) {
    try {
      const integration = this.integrations.get('regulatory_api');
      if (!integration) {
        throw new Error('Regulatory API integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Get regulatory data
      const response = await axios.get(`${integration.baseUrl}/funds/${fundId}/regulatory`, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const regulatoryData = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      return regulatoryData;
    } catch (error) {
      logger.error('Error getting regulatory data:', error);
      throw error;
    }
  }

  async getTaxData(userId, year) {
    try {
      const integration = this.integrations.get('tax_service');
      if (!integration) {
        throw new Error('Tax service integration not configured');
      }

      // Check rate limiting
      await this.checkRateLimit(integration);

      // Get tax data
      const response = await axios.get(`${integration.baseUrl}/tax/${userId}/${year}`, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      const taxData = response.data;

      // Update last request time
      integration.lastRequest = Date.now();

      return taxData;
    } catch (error) {
      logger.error('Error getting tax data:', error);
      throw error;
    }
  }

  async checkRateLimit(integration) {
    try {
      const now = Date.now();
      const timeSinceLastRequest = now - integration.lastRequest;
      const minInterval = (60 * 1000) / integration.rateLimit; // Convert to milliseconds

      if (timeSinceLastRequest < minInterval) {
        const delay = minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      logger.error('Error checking rate limit:', error);
    }
  }

  async rateLimitDelay() {
    try {
      // Add a small delay between requests to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Error in rate limit delay:', error);
    }
  }

  async getActiveFunds() {
    try {
      const result = await pool.query(`
        SELECT id, symbol, name
        FROM mutual_funds
        WHERE is_active = true AND is_tradeable = true
        ORDER BY symbol
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting active funds:', error);
      return [];
    }
  }

  async getIntegrationStatus() {
    try {
      const status = {
        integrations: [],
        last_sync: null,
        sync_frequency: '5 minutes'
      };

      // Check status of each integration
      for (const [key, integration] of this.integrations) {
        const integrationStatus = {
          name: integration.name,
          base_url: integration.base_url,
          rate_limit: integration.rate_limit,
          last_request: integration.last_request,
          status: 'active'
        };

        // Test integration health
        try {
          await this.testIntegrationHealth(integration);
          integrationStatus.status = 'healthy';
        } catch (error) {
          integrationStatus.status = 'unhealthy';
          integrationStatus.error = error.message;
        }

        status.integrations.push(integrationStatus);
      }

      // Get last sync time
      const lastSyncResult = await pool.query(`
        SELECT MAX(updated_at) as last_sync
        FROM mutual_funds
      `);

      status.last_sync = lastSyncResult.rows[0].last_sync;

      return status;
    } catch (error) {
      logger.error('Error getting integration status:', error);
      return {
        integrations: [],
        last_sync: null,
        sync_frequency: '5 minutes'
      };
    }
  }

  async testIntegrationHealth(integration) {
    try {
      // Test integration health with a simple request
      const response = await axios.get(`${integration.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${integration.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return response.status === 200;
    } catch (error) {
      logger.error(`Health check failed for ${integration.name}:`, error);
      throw error;
    }
  }

  async handleWebhook(webhookData) {
    try {
      const { type, data } = webhookData;

      switch (type) {
        case 'fund_update':
          await this.handleFundUpdateWebhook(data);
          break;
        case 'performance_update':
          await this.handlePerformanceUpdateWebhook(data);
          break;
        case 'holdings_update':
          await this.handleHoldingsUpdateWebhook(data);
          break;
        case 'news_update':
          await this.handleNewsUpdateWebhook(data);
          break;
        case 'trade_execution':
          await this.handleTradeExecutionWebhook(data);
          break;
        default:
          logger.warn(`Unknown webhook type: ${type}`);
      }

      logger.info(`Webhook processed: ${type}`);
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handleFundUpdateWebhook(data) {
    try {
      await this.processFundData(data);
      this.emit('fundUpdated', data);
    } catch (error) {
      logger.error('Error handling fund update webhook:', error);
      throw error;
    }
  }

  async handlePerformanceUpdateWebhook(data) {
    try {
      await this.processPerformanceData(data.fund_id, data.performance);
      this.emit('performanceUpdated', data);
    } catch (error) {
      logger.error('Error handling performance update webhook:', error);
      throw error;
    }
  }

  async handleHoldingsUpdateWebhook(data) {
    try {
      await this.processHoldingsData(data.fund_id, data.holdings);
      this.emit('holdingsUpdated', data);
    } catch (error) {
      logger.error('Error handling holdings update webhook:', error);
      throw error;
    }
  }

  async handleNewsUpdateWebhook(data) {
    try {
      await this.processNewsData(data.fund_id, data.news);
      this.emit('newsUpdated', data);
    } catch (error) {
      logger.error('Error handling news update webhook:', error);
      throw error;
    }
  }

  async handleTradeExecutionWebhook(data) {
    try {
      // Update trade status in database
      await pool.query(`
        UPDATE fund_trades
        SET status = $1, execution_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [data.status, data.execution_id, data.trade_id]);

      this.emit('tradeExecuted', data);
    } catch (error) {
      logger.error('Error handling trade execution webhook:', error);
      throw error;
    }
  }

  async getIntegrationStats() {
    try {
      const stats = {
        total_integrations: this.integrations.size,
        active_integrations: 0,
        total_requests: 0,
        error_rate: 0
      };

      // Calculate stats for each integration
      for (const [key, integration] of this.integrations) {
        try {
          await this.testIntegrationHealth(integration);
          stats.active_integrations++;
        } catch (error) {
          // Integration is not healthy
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting integration stats:', error);
      return {
        total_integrations: 0,
        active_integrations: 0,
        total_requests: 0,
        error_rate: 0
      };
    }
  }
}

module.exports = FundIntegrationService;
