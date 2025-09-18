const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');
const axios = require('axios');

class FundMarketDataService extends EventEmitter {
  constructor() {
    super();
    this.dataProviders = new Map();
    this.marketDataCache = new Map();
    this._initialized = false;
    this.updateInterval = null;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load data providers
      await this.loadDataProviders();
      
      // Start market data updates
      this.startMarketDataUpdates();
      
      this._initialized = true;
      logger.info('FundMarketDataService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundMarketDataService:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      this._initialized = false;
      logger.info('FundMarketDataService closed');
    } catch (error) {
      logger.error('Error closing FundMarketDataService:', error);
    }
  }

  async loadDataProviders() {
    try {
      const result = await pool.query(`
        SELECT * FROM data_providers
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const provider of result.rows) {
        this.dataProviders.set(provider.id, provider);
      }

      logger.info(`Loaded ${result.rows.length} data providers`);
    } catch (error) {
      logger.error('Error loading data providers:', error);
      throw error;
    }
  }

  startMarketDataUpdates() {
    try {
      // Update market data every 5 minutes
      this.updateInterval = setInterval(async () => {
        try {
          await this.updateMarketData();
        } catch (error) {
          logger.error('Error updating market data:', error);
        }
      }, 5 * 60 * 1000);

      logger.info('Started market data updates');
    } catch (error) {
      logger.error('Error starting market data updates:', error);
    }
  }

  async updateMarketData() {
    try {
      // Get all active funds
      const funds = await this.getActiveFunds();
      
      for (const fund of funds) {
        try {
          // Update fund data from primary provider
          await this.updateFundData(fund);
          
          // Update fund performance
          await this.updateFundPerformance(fund.id);
          
          // Update fund holdings
          await this.updateFundHoldings(fund.id);
          
          // Emit real-time update
          this.emit('fundDataUpdated', {
            fund_id: fund.id,
            symbol: fund.symbol,
            updated_at: new Date()
          });
          
        } catch (error) {
          logger.error(`Error updating fund ${fund.symbol}:`, error);
        }
      }

      logger.info(`Updated market data for ${funds.length} funds`);
    } catch (error) {
      logger.error('Error updating market data:', error);
    }
  }

  async getActiveFunds() {
    try {
      const result = await pool.query(`
        SELECT id, symbol, name, fund_family_id
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

  async updateFundData(fund) {
    try {
      // Get primary data provider
      const primaryProvider = this.getPrimaryDataProvider();
      if (!primaryProvider) {
        throw new Error('No primary data provider available');
      }

      // Fetch data from provider
      const marketData = await this.fetchDataFromProvider(primaryProvider, fund.symbol);
      
      if (!marketData) {
        logger.warn(`No market data available for fund ${fund.symbol}`);
        return;
      }

      // Update fund performance
      await this.updateFundPerformanceData(fund.id, marketData);

      // Cache the data
      await this.cacheMarketData(fund.symbol, marketData);

      logger.info(`Updated market data for fund ${fund.symbol}`);
    } catch (error) {
      logger.error(`Error updating fund data for ${fund.symbol}:`, error);
    }
  }

  async fetchDataFromProvider(provider, symbol) {
    try {
      const config = {
        method: 'GET',
        url: `${provider.base_url}/funds/${symbol}`,
        headers: {
          'Authorization': `Bearer ${provider.api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      const response = await axios(config);
      
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`Provider returned status ${response.status}`);
      }
    } catch (error) {
      logger.error(`Error fetching data from provider ${provider.name}:`, error);
      return null;
    }
  }

  async updateFundPerformanceData(fundId, marketData) {
    try {
      const {
        nav,
        change_amount,
        change_percentage,
        total_return_1d,
        total_return_1w,
        total_return_1m,
        total_return_3m,
        total_return_6m,
        total_return_1y,
        total_return_3y,
        total_return_5y,
        total_return_10y,
        total_return_ytd,
        total_return_since_inception,
        assets_under_management,
        shares_outstanding,
        date
      } = marketData;

      await pool.query(`
        INSERT INTO fund_performance (
          fund_id, date, nav, change_amount, change_percentage,
          total_return_1d, total_return_1w, total_return_1m, total_return_3m,
          total_return_6m, total_return_1y, total_return_3y, total_return_5y,
          total_return_10y, total_return_ytd, total_return_since_inception,
          assets_under_management, shares_outstanding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
          total_return_3y = EXCLUDED.total_return_3y,
          total_return_5y = EXCLUDED.total_return_5y,
          total_return_10y = EXCLUDED.total_return_10y,
          total_return_ytd = EXCLUDED.total_return_ytd,
          total_return_since_inception = EXCLUDED.total_return_since_inception,
          assets_under_management = EXCLUDED.assets_under_management,
          shares_outstanding = EXCLUDED.shares_outstanding,
          updated_at = CURRENT_TIMESTAMP
      `, [
        fundId, date, nav, change_amount, change_percentage,
        total_return_1d, total_return_1w, total_return_1m, total_return_3m,
        total_return_6m, total_return_1y, total_return_3y, total_return_5y,
        total_return_10y, total_return_ytd, total_return_since_inception,
        assets_under_management, shares_outstanding
      ]);

      logger.info(`Updated performance data for fund ${fundId}`);
    } catch (error) {
      logger.error(`Error updating performance data for fund ${fundId}:`, error);
      throw error;
    }
  }

  async updateFundHoldings(fundId) {
    try {
      // Get primary data provider
      const primaryProvider = this.getPrimaryDataProvider();
      if (!primaryProvider) {
        throw new Error('No primary data provider available');
      }

      // Fetch holdings data
      const holdingsData = await this.fetchHoldingsFromProvider(primaryProvider, fundId);
      
      if (!holdingsData || !holdingsData.holdings) {
        logger.warn(`No holdings data available for fund ${fundId}`);
        return;
      }

      // Clear existing holdings for this fund
      await pool.query(`
        DELETE FROM fund_holdings 
        WHERE fund_id = $1 AND as_of_date = $2
      `, [fundId, holdingsData.as_of_date]);

      // Insert new holdings
      for (const holding of holdingsData.holdings) {
        await pool.query(`
          INSERT INTO fund_holdings (
            fund_id, holding_symbol, holding_name, asset_type,
            sector, industry, country, market_value, shares_held,
            percentage_of_fund, cost_basis, unrealized_gain_loss, as_of_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          fundId,
          holding.symbol,
          holding.name,
          holding.asset_type,
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

      logger.info(`Updated holdings for fund ${fundId}: ${holdingsData.holdings.length} holdings`);
    } catch (error) {
      logger.error(`Error updating holdings for fund ${fundId}:`, error);
    }
  }

  async fetchHoldingsFromProvider(provider, fundId) {
    try {
      const config = {
        method: 'GET',
        url: `${provider.base_url}/funds/${fundId}/holdings`,
        headers: {
          'Authorization': `Bearer ${provider.api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const response = await axios(config);
      
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`Provider returned status ${response.status}`);
      }
    } catch (error) {
      logger.error(`Error fetching holdings from provider ${provider.name}:`, error);
      return null;
    }
  }

  async cacheMarketData(symbol, data) {
    try {
      const cacheKey = `market_data:${symbol}`;
      const cacheData = {
        ...data,
        cached_at: new Date(),
        ttl: 300 // 5 minutes
      };

      await redisService.setex(cacheKey, 300, JSON.stringify(cacheData));
      this.marketDataCache.set(symbol, cacheData);

      logger.debug(`Cached market data for ${symbol}`);
    } catch (error) {
      logger.error(`Error caching market data for ${symbol}:`, error);
    }
  }

  async getMarketData(symbol) {
    try {
      // Check cache first
      const cacheKey = `market_data:${symbol}`;
      const cachedData = await redisService.get(cacheKey);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        logger.debug(`Retrieved market data for ${symbol} from cache`);
        return data;
      }

      // If not in cache, fetch from database
      const fund = await this.getFundBySymbol(symbol);
      if (!fund) {
        throw new Error(`Fund not found: ${symbol}`);
      }

      const performance = await this.getLatestPerformance(fund.id);
      if (!performance) {
        throw new Error(`No performance data available for ${symbol}`);
      }

      const marketData = {
        symbol: fund.symbol,
        name: fund.name,
        nav: performance.nav,
        change_amount: performance.change_amount,
        change_percentage: performance.change_percentage,
        total_return_1d: performance.total_return_1d,
        total_return_1w: performance.total_return_1w,
        total_return_1m: performance.total_return_1m,
        total_return_3m: performance.total_return_3m,
        total_return_6m: performance.total_return_6m,
        total_return_1y: performance.total_return_1y,
        total_return_3y: performance.total_return_3y,
        total_return_5y: performance.total_return_5y,
        total_return_10y: performance.total_return_10y,
        total_return_ytd: performance.total_return_ytd,
        total_return_since_inception: performance.total_return_since_inception,
        assets_under_management: performance.assets_under_management,
        shares_outstanding: performance.shares_outstanding,
        date: performance.date,
        updated_at: performance.updated_at
      };

      // Cache the data
      await this.cacheMarketData(symbol, marketData);

      return marketData;
    } catch (error) {
      logger.error(`Error getting market data for ${symbol}:`, error);
      throw error;
    }
  }

  async getFundBySymbol(symbol) {
    try {
      const result = await pool.query(`
        SELECT * FROM mutual_funds
        WHERE symbol = $1 AND is_active = true
      `, [symbol.toUpperCase()]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting fund by symbol ${symbol}:`, error);
      return null;
    }
  }

  async getLatestPerformance(fundId) {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_performance
        WHERE fund_id = $1
        ORDER BY date DESC
        LIMIT 1
      `, [fundId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting latest performance for fund ${fundId}:`, error);
      return null;
    }
  }

  async getFundHoldings(fundId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        sort_by = 'percentage_of_fund',
        sort_order = 'DESC'
      } = options;

      const result = await pool.query(`
        SELECT *
        FROM fund_holdings
        WHERE fund_id = $1
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $2 OFFSET $3
      `, [fundId, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error(`Error getting holdings for fund ${fundId}:`, error);
      return [];
    }
  }

  async getFundPerformanceHistory(fundId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end_date = new Date(),
        limit = 1000
      } = options;

      const result = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date DESC
        LIMIT $4
      `, [fundId, start_date, end_date, limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Error getting performance history for fund ${fundId}:`, error);
      return [];
    }
  }

  async getMarketDataStats() {
    try {
      const stats = {
        total_funds: 0,
        active_funds: 0,
        funds_with_data: 0,
        last_update: null,
        data_providers: this.dataProviders.size
      };

      // Get fund counts
      const fundResult = await pool.query(`
        SELECT 
          COUNT(*) as total_funds,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_funds
        FROM mutual_funds
      `);

      if (fundResult.rows.length > 0) {
        stats.total_funds = parseInt(fundResult.rows[0].total_funds);
        stats.active_funds = parseInt(fundResult.rows[0].active_funds);
      }

      // Get funds with recent data
      const dataResult = await pool.query(`
        SELECT COUNT(DISTINCT fund_id) as funds_with_data
        FROM fund_performance
        WHERE date >= CURRENT_DATE - INTERVAL '1 day'
      `);

      if (dataResult.rows.length > 0) {
        stats.funds_with_data = parseInt(dataResult.rows[0].funds_with_data);
      }

      // Get last update time
      const lastUpdateResult = await pool.query(`
        SELECT MAX(updated_at) as last_update
        FROM fund_performance
      `);

      if (lastUpdateResult.rows.length > 0) {
        stats.last_update = lastUpdateResult.rows[0].last_update;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting market data stats:', error);
      return {
        total_funds: 0,
        active_funds: 0,
        funds_with_data: 0,
        last_update: null,
        data_providers: 0
      };
    }
  }

  async getPrimaryDataProvider() {
    try {
      // Get the highest priority active provider
      const result = await pool.query(`
        SELECT * FROM data_providers
        WHERE is_active = true
        ORDER BY priority ASC
        LIMIT 1
      `);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting primary data provider:', error);
      return null;
    }
  }

  async addDataProvider(providerData) {
    try {
      const {
        name,
        base_url,
        api_key,
        priority = 1,
        is_active = true
      } = providerData;

      const result = await pool.query(`
        INSERT INTO data_providers (name, base_url, api_key, priority, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, base_url, api_key, priority, is_active]);

      // Reload providers
      await this.loadDataProviders();

      logger.info(`Added data provider: ${name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding data provider:', error);
      throw error;
    }
  }

  async updateDataProvider(providerId, updates) {
    try {
      const { query: updateQuery, params } = this._buildUpdateQuery('data_providers', providerId, updates);
      const result = await pool.query(updateQuery, params);

      if (result.rows.length === 0) {
        throw new Error('Data provider not found');
      }

      // Reload providers
      await this.loadDataProviders();

      logger.info(`Updated data provider ${providerId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating data provider:', error);
      throw error;
    }
  }

  async deleteDataProvider(providerId) {
    try {
      const result = await pool.query(`
        UPDATE data_providers 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date(), providerId]);

      if (result.rowCount === 0) {
        throw new Error('Data provider not found');
      }

      // Reload providers
      await this.loadDataProviders();

      logger.info(`Deleted data provider ${providerId}`);
      return { message: 'Data provider deleted successfully' };
    } catch (error) {
      logger.error('Error deleting data provider:', error);
      throw error;
    }
  }

  _buildUpdateQuery(table, id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    return {
      query: `UPDATE ${table} SET ${setClause}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
      params: [id, ...values, new Date()]
    };
  }
}

module.exports = FundMarketDataService;
