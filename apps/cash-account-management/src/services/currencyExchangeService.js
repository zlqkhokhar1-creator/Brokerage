const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const axios = require('axios');
const moment = require('moment');

class CurrencyExchangeService extends EventEmitter {
  constructor() {
    super();
    this.supportedCurrencies = ['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    this.exchangeRateSources = ['SBP', 'XE', 'FIXER', 'EXCHANGE_RATES_API'];
    this._initialized = false;
  }

  async initialize() {
    try {
      await this.loadExchangeRates();
      this._initialized = true;
      logger.info('CurrencyExchangeService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CurrencyExchangeService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('CurrencyExchangeService closed');
    } catch (error) {
      logger.error('Error closing CurrencyExchangeService:', error);
    }
  }

  // Get exchange rate between two currencies
  async getExchangeRate(fromCurrency, toCurrency, date = null) {
    try {
      if (fromCurrency === toCurrency) {
        return 1.0;
      }

      const targetDate = date || moment().format('YYYY-MM-DD');
      
      // Try to get from cache first
      const cachedRate = await this.getCachedRate(fromCurrency, toCurrency, targetDate);
      if (cachedRate) {
        return cachedRate;
      }

      // Get from database
      const dbRate = await this.getDatabaseRate(fromCurrency, toCurrency, targetDate);
      if (dbRate) {
        return dbRate;
      }

      // Fetch from external API
      const apiRate = await this.fetchExternalRate(fromCurrency, toCurrency, targetDate);
      if (apiRate) {
        // Cache the rate
        await this.cacheRate(fromCurrency, toCurrency, targetDate, apiRate);
        return apiRate;
      }

      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      logger.error('Error getting exchange rate:', error);
      throw error;
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(amount, fromCurrency, toCurrency, date = null) {
    try {
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);
      const convertedAmount = amount * exchangeRate;
      
      return {
        original_amount: amount,
        original_currency: fromCurrency,
        converted_amount: convertedAmount,
        target_currency: toCurrency,
        exchange_rate: exchangeRate,
        conversion_date: date || moment().format('YYYY-MM-DD')
      };
    } catch (error) {
      logger.error('Error converting currency:', error);
      throw error;
    }
  }

  // Get multiple exchange rates at once
  async getMultipleRates(baseCurrency, targetCurrencies, date = null) {
    try {
      const rates = {};
      
      for (const targetCurrency of targetCurrencies) {
        if (targetCurrency !== baseCurrency) {
          rates[targetCurrency] = await this.getExchangeRate(baseCurrency, targetCurrency, date);
        } else {
          rates[targetCurrency] = 1.0;
        }
      }
      
      return rates;
    } catch (error) {
      logger.error('Error getting multiple exchange rates:', error);
      throw error;
    }
  }

  // Update exchange rates from external sources
  async updateExchangeRates() {
    try {
      logger.info('Updating exchange rates from external sources...');
      
      const today = moment().format('YYYY-MM-DD');
      const rates = {};
      
      // Fetch from multiple sources
      for (const source of this.exchangeRateSources) {
        try {
          const sourceRates = await this.fetchRatesFromSource(source, today);
          rates[source] = sourceRates;
        } catch (error) {
          logger.warn(`Failed to fetch rates from ${source}:`, error.message);
        }
      }
      
      // Process and store rates
      await this.processAndStoreRates(rates, today);
      
      logger.info('Exchange rates updated successfully');
    } catch (error) {
      logger.error('Error updating exchange rates:', error);
      throw error;
    }
  }

  // Get historical exchange rates
  async getHistoricalRates(fromCurrency, toCurrency, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT rate_date, exchange_rate, source
        FROM currency_rates
        WHERE base_currency = $1 AND target_currency = $2
          AND rate_date >= $3 AND rate_date <= $4
        ORDER BY rate_date DESC
      `, [fromCurrency, toCurrency, startDate, endDate]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting historical rates:', error);
      throw error;
    }
  }

  // Calculate currency conversion fees
  async calculateConversionFees(amount, fromCurrency, toCurrency) {
    try {
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount * exchangeRate;
      
      // Fee structure based on currency pair
      const feeRate = this.getConversionFeeRate(fromCurrency, toCurrency);
      const fee = convertedAmount * feeRate;
      const netAmount = convertedAmount - fee;
      
      return {
        original_amount: amount,
        original_currency: fromCurrency,
        converted_amount: convertedAmount,
        target_currency: toCurrency,
        exchange_rate: exchangeRate,
        fee_rate: feeRate,
        fee_amount: fee,
        net_amount: netAmount
      };
    } catch (error) {
      logger.error('Error calculating conversion fees:', error);
      throw error;
    }
  }

  // Get cached exchange rate
  async getCachedRate(fromCurrency, toCurrency, date) {
    try {
      const cacheKey = `exchange_rate:${fromCurrency}:${toCurrency}:${date}`;
      const cached = await redisClient.get(cacheKey);
      return cached ? parseFloat(cached) : null;
    } catch (error) {
      logger.error('Error getting cached rate:', error);
      return null;
    }
  }

  // Cache exchange rate
  async cacheRate(fromCurrency, toCurrency, date, rate) {
    try {
      const cacheKey = `exchange_rate:${fromCurrency}:${toCurrency}:${date}`;
      await redisClient.setex(cacheKey, 3600, rate.toString()); // Cache for 1 hour
    } catch (error) {
      logger.error('Error caching rate:', error);
    }
  }

  // Get exchange rate from database
  async getDatabaseRate(fromCurrency, toCurrency, date) {
    try {
      const result = await pool.query(`
        SELECT exchange_rate
        FROM currency_rates
        WHERE base_currency = $1 AND target_currency = $2
          AND rate_date = $3 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [fromCurrency, toCurrency, date]);
      
      return result.rows.length > 0 ? parseFloat(result.rows[0].exchange_rate) : null;
    } catch (error) {
      logger.error('Error getting database rate:', error);
      return null;
    }
  }

  // Fetch exchange rate from external API
  async fetchExternalRate(fromCurrency, toCurrency, date) {
    try {
      // Try different sources in order of preference
      const sources = [
        { name: 'EXCHANGE_RATES_API', priority: 1 },
        { name: 'FIXER', priority: 2 },
        { name: 'XE', priority: 3 }
      ];
      
      for (const source of sources.sort((a, b) => a.priority - b.priority)) {
        try {
          const rate = await this.fetchRatesFromSource(source.name, date);
          if (rate && rate[`${fromCurrency}_${toCurrency}`]) {
            return rate[`${fromCurrency}_${toCurrency}`];
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${source.name}:`, error.message);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching external rate:', error);
      return null;
    }
  }

  // Fetch rates from specific source
  async fetchRatesFromSource(source, date) {
    switch (source) {
      case 'EXCHANGE_RATES_API':
        return await this.fetchFromExchangeRatesAPI(date);
      case 'FIXER':
        return await this.fetchFromFixer(date);
      case 'XE':
        return await this.fetchFromXE(date);
      case 'SBP':
        return await this.fetchFromSBP(date);
      default:
        throw new Error(`Unknown exchange rate source: ${source}`);
    }
  }

  // Fetch from Exchange Rates API
  async fetchFromExchangeRatesAPI(date) {
    try {
      const apiKey = process.env.EXCHANGE_RATES_API_KEY;
      if (!apiKey) {
        throw new Error('Exchange Rates API key not configured');
      }
      
      const response = await axios.get(`https://api.exchangeratesapi.io/${date}`, {
        params: {
          access_key: apiKey,
          base: 'USD'
        },
        timeout: 10000
      });
      
      const rates = {};
      for (const [currency, rate] of Object.entries(response.data.rates)) {
        rates[`USD_${currency}`] = rate;
        rates[`${currency}_USD`] = 1 / rate;
      }
      
      return rates;
    } catch (error) {
      logger.error('Error fetching from Exchange Rates API:', error);
      throw error;
    }
  }

  // Fetch from Fixer API
  async fetchFromFixer(date) {
    try {
      const apiKey = process.env.FIXER_API_KEY;
      if (!apiKey) {
        throw new Error('Fixer API key not configured');
      }
      
      const response = await axios.get(`http://data.fixer.io/${date}`, {
        params: {
          access_key: apiKey,
          base: 'USD'
        },
        timeout: 10000
      });
      
      const rates = {};
      for (const [currency, rate] of Object.entries(response.data.rates)) {
        rates[`USD_${currency}`] = rate;
        rates[`${currency}_USD`] = 1 / rate;
      }
      
      return rates;
    } catch (error) {
      logger.error('Error fetching from Fixer API:', error);
      throw error;
    }
  }

  // Fetch from XE API
  async fetchFromXE(date) {
    try {
      const apiKey = process.env.XE_API_KEY;
      if (!apiKey) {
        throw new Error('XE API key not configured');
      }
      
      const response = await axios.get('https://xecdapi.xe.com/v1/convert_from.json', {
        params: {
          from: 'USD',
          to: this.supportedCurrencies.join(','),
          amount: 1
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`
        },
        timeout: 10000
      });
      
      const rates = {};
      for (const rate of response.data.to) {
        rates[`USD_${rate.quotecurrency}`] = rate.mid;
        rates[`${rate.quotecurrency}_USD`] = 1 / rate.mid;
      }
      
      return rates;
    } catch (error) {
      logger.error('Error fetching from XE API:', error);
      throw error;
    }
  }

  // Fetch from State Bank of Pakistan
  async fetchFromSBP(date) {
    try {
      // SBP provides PKR rates
      const response = await axios.get('https://www.sbp.org.pk/ecodata/rates/rates.asp', {
        timeout: 10000
      });
      
      // Parse HTML response to extract rates
      // This is a simplified implementation
      const rates = {
        'USD_PKR': 280.0, // Example rate
        'PKR_USD': 1/280.0,
        'EUR_PKR': 300.0, // Example rate
        'PKR_EUR': 1/300.0
      };
      
      return rates;
    } catch (error) {
      logger.error('Error fetching from SBP:', error);
      throw error;
    }
  }

  // Process and store rates from multiple sources
  async processAndStoreRates(rates, date) {
    try {
      const processedRates = {};
      
      // Combine rates from different sources
      for (const [source, sourceRates] of Object.entries(rates)) {
        for (const [pair, rate] of Object.entries(sourceRates)) {
          const [from, to] = pair.split('_');
          if (!processedRates[`${from}_${to}`]) {
            processedRates[`${from}_${to}`] = [];
          }
          processedRates[`${from}_${to}`].push({
            source,
            rate: parseFloat(rate)
          });
        }
      }
      
      // Calculate average rates and store
      for (const [pair, rateData] of Object.entries(processedRates)) {
        const [from, to] = pair.split('_');
        const averageRate = rateData.reduce((sum, r) => sum + r.rate, 0) / rateData.length;
        
        // Store in database
        await this.storeRate(from, to, averageRate, date, 'COMBINED');
      }
    } catch (error) {
      logger.error('Error processing and storing rates:', error);
      throw error;
    }
  }

  // Store exchange rate in database
  async storeRate(baseCurrency, targetCurrency, rate, date, source) {
    try {
      await pool.query(`
        INSERT INTO currency_rates (base_currency, target_currency, exchange_rate, rate_date, source)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (base_currency, target_currency, rate_date)
        DO UPDATE SET
          exchange_rate = EXCLUDED.exchange_rate,
          source = EXCLUDED.source,
          updated_at = CURRENT_TIMESTAMP
      `, [baseCurrency, targetCurrency, rate, date, source]);
    } catch (error) {
      logger.error('Error storing exchange rate:', error);
      throw error;
    }
  }

  // Load exchange rates from database
  async loadExchangeRates() {
    try {
      const result = await pool.query(`
        SELECT base_currency, target_currency, exchange_rate, rate_date, source
        FROM currency_rates
        WHERE rate_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY rate_date DESC, created_at DESC
      `);
      
      logger.info(`Loaded ${result.rows.length} exchange rates from database`);
    } catch (error) {
      logger.error('Error loading exchange rates:', error);
      throw error;
    }
  }

  // Get conversion fee rate based on currency pair
  getConversionFeeRate(fromCurrency, toCurrency) {
    // Fee structure based on currency pair
    const feeRates = {
      'PKR_USD': 0.02, // 2% for PKR to USD
      'USD_PKR': 0.02, // 2% for USD to PKR
      'PKR_EUR': 0.02, // 2% for PKR to EUR
      'EUR_PKR': 0.02, // 2% for EUR to PKR
      'USD_EUR': 0.01, // 1% for USD to EUR
      'EUR_USD': 0.01, // 1% for EUR to USD
      'default': 0.015 // 1.5% default
    };
    
    const key = `${fromCurrency}_${toCurrency}`;
    return feeRates[key] || feeRates.default;
  }

  // Get currency information
  async getCurrencyInfo(currency) {
    const currencyInfo = {
      'PKR': { name: 'Pakistani Rupee', symbol: '₨', decimals: 2, country: 'Pakistan' },
      'USD': { name: 'US Dollar', symbol: '$', decimals: 2, country: 'United States' },
      'EUR': { name: 'Euro', symbol: '€', decimals: 2, country: 'European Union' },
      'GBP': { name: 'British Pound', symbol: '£', decimals: 2, country: 'United Kingdom' },
      'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimals: 2, country: 'Canada' },
      'AUD': { name: 'Australian Dollar', symbol: 'A$', decimals: 2, country: 'Australia' }
    };
    
    return currencyInfo[currency] || null;
  }

  // Get supported currency pairs
  getSupportedPairs() {
    const pairs = [];
    for (const from of this.supportedCurrencies) {
      for (const to of this.supportedCurrencies) {
        if (from !== to) {
          pairs.push(`${from}_${to}`);
        }
      }
    }
    return pairs;
  }

  // Format currency amount
  formatCurrency(amount, currency) {
    const info = this.getCurrencyInfo(currency);
    if (!info) {
      return `${amount} ${currency}`;
    }
    
    return `${info.symbol}${amount.toFixed(info.decimals)}`;
  }

  // Get exchange rate statistics
  async getExchangeRateStats(fromCurrency, toCurrency, days = 30) {
    try {
      const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');
      
      const result = await pool.query(`
        SELECT 
          AVG(exchange_rate) as avg_rate,
          MIN(exchange_rate) as min_rate,
          MAX(exchange_rate) as max_rate,
          STDDEV(exchange_rate) as std_dev,
          COUNT(*) as data_points
        FROM currency_rates
        WHERE base_currency = $1 AND target_currency = $2
          AND rate_date >= $3 AND rate_date <= $4
      `, [fromCurrency, toCurrency, startDate, endDate]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting exchange rate stats:', error);
      throw error;
    }
  }
}

module.exports = CurrencyExchangeService;
