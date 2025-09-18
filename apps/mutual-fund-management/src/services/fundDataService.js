const { EventEmitter } = require('events');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundDataService extends EventEmitter {
  constructor() {
    super();
    this.dataSources = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Initialize data sources
      this.initializeDataSources();
      
      this._initialized = true;
      logger.info('FundDataService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundDataService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundDataService closed');
    } catch (error) {
      logger.error('Error closing FundDataService:', error);
    }
  }

  initializeDataSources() {
    try {
      // Initialize data sources configuration
      this.dataSources.set('alpha_vantage', {
        name: 'Alpha Vantage',
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        rateLimit: 5, // requests per minute
        lastRequest: 0
      });

      this.dataSources.set('yahoo_finance', {
        name: 'Yahoo Finance',
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        rateLimit: 100, // requests per minute
        lastRequest: 0
      });

      this.dataSources.set('finnhub', {
        name: 'Finnhub',
        baseUrl: 'https://finnhub.io/api/v1',
        apiKey: process.env.FINNHUB_API_KEY,
        rateLimit: 60, // requests per minute
        lastRequest: 0
      });

      this.dataSources.set('polygon', {
        name: 'Polygon.io',
        baseUrl: 'https://api.polygon.io/v1',
        apiKey: process.env.POLYGON_API_KEY,
        rateLimit: 5, // requests per minute
        lastRequest: 0
      });

      logger.info('Data sources initialized');
    } catch (error) {
      logger.error('Error initializing data sources:', error);
    }
  }

  async updateFundPerformance() {
    try {
      logger.info('Starting fund performance update...');

      // Get all active funds
      const funds = await this.getActiveFunds();
      let updatedCount = 0;
      let errorCount = 0;

      for (const fund of funds) {
        try {
          const performanceData = await this.fetchFundPerformance(fund);
          if (performanceData) {
            await this.storeFundPerformance(fund.id, performanceData);
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Error updating performance for fund ${fund.symbol}:`, error);
          errorCount++;
        }

        // Rate limiting
        await this.rateLimitDelay();
      }

      logger.info(`Fund performance update completed: ${updatedCount} updated, ${errorCount} errors`);

      // Emit event
      this.emit('fundPerformanceUpdated', { updatedCount, errorCount });

      return { updatedCount, errorCount };
    } catch (error) {
      logger.error('Error updating fund performance:', error);
      throw error;
    }
  }

  async updateFundHoldings() {
    try {
      logger.info('Starting fund holdings update...');

      // Get all active funds
      const funds = await this.getActiveFunds();
      let updatedCount = 0;
      let errorCount = 0;

      for (const fund of funds) {
        try {
          const holdingsData = await this.fetchFundHoldings(fund);
          if (holdingsData && holdingsData.length > 0) {
            await this.storeFundHoldings(fund.id, holdingsData);
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Error updating holdings for fund ${fund.symbol}:`, error);
          errorCount++;
        }

        // Rate limiting
        await this.rateLimitDelay();
      }

      logger.info(`Fund holdings update completed: ${updatedCount} updated, ${errorCount} errors`);

      // Emit event
      this.emit('fundHoldingsUpdated', { updatedCount, errorCount });

      return { updatedCount, errorCount };
    } catch (error) {
      logger.error('Error updating fund holdings:', error);
      throw error;
    }
  }

  async fetchFundPerformance(fund) {
    try {
      // Try multiple data sources
      const dataSources = ['yahoo_finance', 'alpha_vantage', 'finnhub'];
      
      for (const sourceName of dataSources) {
        try {
          const performanceData = await this.fetchFromDataSource(sourceName, 'performance', fund);
          if (performanceData) {
            return performanceData;
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${sourceName} for ${fund.symbol}:`, error.message);
        }
      }

      throw new Error('All data sources failed');
    } catch (error) {
      logger.error(`Error fetching fund performance for ${fund.symbol}:`, error);
      throw error;
    }
  }

  async fetchFundHoldings(fund) {
    try {
      // Try multiple data sources
      const dataSources = ['yahoo_finance', 'alpha_vantage', 'finnhub'];
      
      for (const sourceName of dataSources) {
        try {
          const holdingsData = await this.fetchFromDataSource(sourceName, 'holdings', fund);
          if (holdingsData) {
            return holdingsData;
          }
        } catch (error) {
          logger.warn(`Failed to fetch holdings from ${sourceName} for ${fund.symbol}:`, error.message);
        }
      }

      throw new Error('All data sources failed');
    } catch (error) {
      logger.error(`Error fetching fund holdings for ${fund.symbol}:`, error);
      throw error;
    }
  }

  async fetchFromDataSource(sourceName, dataType, fund) {
    try {
      const source = this.dataSources.get(sourceName);
      if (!source) {
        throw new Error(`Data source ${sourceName} not found`);
      }

      // Check rate limiting
      await this.checkRateLimit(source);

      let data = null;

      switch (sourceName) {
        case 'yahoo_finance':
          data = await this.fetchFromYahooFinance(source, dataType, fund);
          break;
        case 'alpha_vantage':
          data = await this.fetchFromAlphaVantage(source, dataType, fund);
          break;
        case 'finnhub':
          data = await this.fetchFromFinnhub(source, dataType, fund);
          break;
        case 'polygon':
          data = await this.fetchFromPolygon(source, dataType, fund);
          break;
        default:
          throw new Error(`Unknown data source: ${sourceName}`);
      }

      // Update last request time
      source.lastRequest = Date.now();

      return data;
    } catch (error) {
      logger.error(`Error fetching from ${sourceName}:`, error);
      throw error;
    }
  }

  async fetchFromYahooFinance(source, dataType, fund) {
    try {
      const symbol = fund.symbol;
      const url = `${source.baseUrl}/${symbol}`;
      
      const response = await axios.get(url, {
        params: {
          range: '1y',
          interval: '1d',
          includePrePost: false,
          useYfid: true,
          corsDomain: 'finance.yahoo.com'
        },
        timeout: 10000
      });

      if (dataType === 'performance') {
        return this.parseYahooFinancePerformance(response.data, fund);
      } else if (dataType === 'holdings') {
        return this.parseYahooFinanceHoldings(response.data, fund);
      }

      return null;
    } catch (error) {
      logger.error('Error fetching from Yahoo Finance:', error);
      throw error;
    }
  }

  async fetchFromAlphaVantage(source, dataType, fund) {
    try {
      const symbol = fund.symbol;
      const url = `${source.baseUrl}`;
      
      const response = await axios.get(url, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          apikey: source.apiKey,
          outputsize: 'full'
        },
        timeout: 10000
      });

      if (dataType === 'performance') {
        return this.parseAlphaVantagePerformance(response.data, fund);
      }

      return null;
    } catch (error) {
      logger.error('Error fetching from Alpha Vantage:', error);
      throw error;
    }
  }

  async fetchFromFinnhub(source, dataType, fund) {
    try {
      const symbol = fund.symbol;
      const url = `${source.baseUrl}/quote`;
      
      const response = await axios.get(url, {
        params: {
          symbol: symbol,
          token: source.apiKey
        },
        timeout: 10000
      });

      if (dataType === 'performance') {
        return this.parseFinnhubPerformance(response.data, fund);
      }

      return null;
    } catch (error) {
      logger.error('Error fetching from Finnhub:', error);
      throw error;
    }
  }

  async fetchFromPolygon(source, dataType, fund) {
    try {
      const symbol = fund.symbol;
      const url = `${source.baseUrl}/open-close/${symbol}`;
      
      const response = await axios.get(url, {
        params: {
          apikey: source.apiKey
        },
        timeout: 10000
      });

      if (dataType === 'performance') {
        return this.parsePolygonPerformance(response.data, fund);
      }

      return null;
    } catch (error) {
      logger.error('Error fetching from Polygon:', error);
      throw error;
    }
  }

  parseYahooFinancePerformance(data, fund) {
    try {
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;

      if (!timestamps || timestamps.length === 0) {
        return null;
      }

      const latestIndex = timestamps.length - 1;
      const latestTimestamp = timestamps[latestIndex];
      const latestClose = quotes.close[latestIndex];

      if (!latestClose) {
        return null;
      }

      // Calculate performance metrics
      const performance = {
        date: new Date(latestTimestamp * 1000),
        nav: latestClose,
        change_amount: quotes.close[latestIndex] - quotes.open[latestIndex],
        change_percentage: ((quotes.close[latestIndex] - quotes.open[latestIndex]) / quotes.open[latestIndex]) * 100,
        total_return_1d: ((quotes.close[latestIndex] - quotes.open[latestIndex]) / quotes.open[latestIndex]) * 100,
        total_return_1w: this.calculateReturn(quotes.close, latestIndex, 5),
        total_return_1m: this.calculateReturn(quotes.close, latestIndex, 21),
        total_return_3m: this.calculateReturn(quotes.close, latestIndex, 63),
        total_return_6m: this.calculateReturn(quotes.close, latestIndex, 126),
        total_return_1y: this.calculateReturn(quotes.close, latestIndex, 252),
        total_return_ytd: this.calculateYTDReturn(quotes.close, timestamps, latestIndex),
        assets_under_management: meta.marketCap || 0,
        shares_outstanding: meta.sharesOutstanding || 0
      };

      return performance;
    } catch (error) {
      logger.error('Error parsing Yahoo Finance performance:', error);
      return null;
    }
  }

  parseYahooFinanceHoldings(data, fund) {
    try {
      // Yahoo Finance doesn't provide holdings data directly
      // This would need to be fetched from other sources
      return null;
    } catch (error) {
      logger.error('Error parsing Yahoo Finance holdings:', error);
      return null;
    }
  }

  parseAlphaVantagePerformance(data, fund) {
    try {
      if (!data['Time Series (Daily)']) {
        return null;
      }

      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries).sort();
      const latestDate = dates[dates.length - 1];
      const latestData = timeSeries[latestDate];

      if (!latestData) {
        return null;
      }

      const performance = {
        date: new Date(latestDate),
        nav: parseFloat(latestData['4. close']),
        change_amount: parseFloat(latestData['4. close']) - parseFloat(latestData['1. open']),
        change_percentage: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['1. open'])) * 100,
        total_return_1d: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['1. open'])) * 100,
        total_return_1w: this.calculateAlphaVantageReturn(timeSeries, latestDate, 5),
        total_return_1m: this.calculateAlphaVantageReturn(timeSeries, latestDate, 21),
        total_return_3m: this.calculateAlphaVantageReturn(timeSeries, latestDate, 63),
        total_return_6m: this.calculateAlphaVantageReturn(timeSeries, latestDate, 126),
        total_return_1y: this.calculateAlphaVantageReturn(timeSeries, latestDate, 252)
      };

      return performance;
    } catch (error) {
      logger.error('Error parsing Alpha Vantage performance:', error);
      return null;
    }
  }

  parseFinnhubPerformance(data, fund) {
    try {
      if (!data.c) {
        return null;
      }

      const performance = {
        date: new Date(),
        nav: data.c,
        change_amount: data.d,
        change_percentage: data.dp,
        total_return_1d: data.dp,
        assets_under_management: data.marketCap || 0
      };

      return performance;
    } catch (error) {
      logger.error('Error parsing Finnhub performance:', error);
      return null;
    }
  }

  parsePolygonPerformance(data, fund) {
    try {
      if (!data.close) {
        return null;
      }

      const performance = {
        date: new Date(data.from),
        nav: data.close,
        change_amount: data.close - data.open,
        change_percentage: ((data.close - data.open) / data.open) * 100,
        total_return_1d: ((data.close - data.open) / data.open) * 100
      };

      return performance;
    } catch (error) {
      logger.error('Error parsing Polygon performance:', error);
      return null;
    }
  }

  calculateReturn(prices, currentIndex, periods) {
    try {
      if (currentIndex < periods || !prices[currentIndex] || !prices[currentIndex - periods]) {
        return 0;
      }

      const currentPrice = prices[currentIndex];
      const pastPrice = prices[currentIndex - periods];
      
      if (!currentPrice || !pastPrice) {
        return 0;
      }

      return ((currentPrice - pastPrice) / pastPrice) * 100;
    } catch (error) {
      logger.error('Error calculating return:', error);
      return 0;
    }
  }

  calculateYTDReturn(prices, timestamps, currentIndex) {
    try {
      const currentDate = new Date(timestamps[currentIndex] * 1000);
      const currentYear = currentDate.getFullYear();
      
      // Find the first trading day of the current year
      let ytdIndex = -1;
      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        if (date.getFullYear() === currentYear) {
          ytdIndex = i;
          break;
        }
      }

      if (ytdIndex === -1 || !prices[ytdIndex] || !prices[currentIndex]) {
        return 0;
      }

      return ((prices[currentIndex] - prices[ytdIndex]) / prices[ytdIndex]) * 100;
    } catch (error) {
      logger.error('Error calculating YTD return:', error);
      return 0;
    }
  }

  calculateAlphaVantageReturn(timeSeries, currentDate, periods) {
    try {
      const dates = Object.keys(timeSeries).sort();
      const currentIndex = dates.indexOf(currentDate);
      
      if (currentIndex < periods) {
        return 0;
      }

      const currentPrice = parseFloat(timeSeries[currentDate]['4. close']);
      const pastDate = dates[currentIndex - periods];
      const pastPrice = parseFloat(timeSeries[pastDate]['4. close']);

      if (!currentPrice || !pastPrice) {
        return 0;
      }

      return ((currentPrice - pastPrice) / pastPrice) * 100;
    } catch (error) {
      logger.error('Error calculating Alpha Vantage return:', error);
      return 0;
    }
  }

  async storeFundPerformance(fundId, performanceData) {
    try {
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

      // Clear cache
      await this.clearFundPerformanceCache(fundId);

      logger.debug(`Fund performance stored for fund ${fundId}`);
    } catch (error) {
      logger.error('Error storing fund performance:', error);
      throw error;
    }
  }

  async storeFundHoldings(fundId, holdingsData) {
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
        for (const holding of holdingsData) {
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
            holding.as_of_date
          ]);
        }

        // Commit transaction
        await pool.query('COMMIT');

        // Clear cache
        await this.clearFundHoldingsCache(fundId);

        logger.debug(`Fund holdings stored for fund ${fundId}`);
      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error storing fund holdings:', error);
      throw error;
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

  async checkRateLimit(source) {
    try {
      const now = Date.now();
      const timeSinceLastRequest = now - source.lastRequest;
      const minInterval = (60 * 1000) / source.rateLimit; // Convert to milliseconds

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
      // Add a small delay between requests to be respectful to data sources
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Error in rate limit delay:', error);
    }
  }

  async clearFundPerformanceCache(fundId) {
    try {
      const pattern = `fund_performance:${fundId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing fund performance cache:', error);
    }
  }

  async clearFundHoldingsCache(fundId) {
    try {
      const pattern = `fund_holdings:${fundId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing fund holdings cache:', error);
    }
  }

  async cleanupOldData() {
    try {
      logger.info('Starting old data cleanup...');

      // Clean up old performance data (keep last 2 years)
      const performanceResult = await pool.query(`
        DELETE FROM fund_performance
        WHERE date < CURRENT_DATE - INTERVAL '2 years'
      `);

      // Clean up old holdings data (keep last 1 year)
      const holdingsResult = await pool.query(`
        DELETE FROM fund_holdings
        WHERE as_of_date < CURRENT_DATE - INTERVAL '1 year'
      `);

      logger.info(`Old data cleanup completed: ${performanceResult.rowCount} performance records, ${holdingsResult.rowCount} holdings records deleted`);

      return {
        performance_deleted: performanceResult.rowCount,
        holdings_deleted: holdingsResult.rowCount
      };
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  async getDataServiceStats() {
    try {
      const stats = {
        data_sources: this.dataSources.size,
        active_funds: 0,
        last_update: null,
        update_frequency: '5 minutes'
      };

      // Get active funds count
      const fundsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM mutual_funds
        WHERE is_active = true
      `);

      stats.active_funds = parseInt(fundsResult.rows[0].count);

      // Get last update time
      const lastUpdateResult = await pool.query(`
        SELECT MAX(date) as last_update
        FROM fund_performance
      `);

      stats.last_update = lastUpdateResult.rows[0].last_update;

      return stats;
    } catch (error) {
      logger.error('Error getting data service stats:', error);
      return {
        data_sources: 0,
        active_funds: 0,
        last_update: null,
        update_frequency: '5 minutes'
      };
    }
  }
}

module.exports = FundDataService;
