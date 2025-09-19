const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class DataValidationService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.validationSessions = new Map();
    this.validationRules = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadValidationRules();
      logger.info('Data Validation Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Data Validation Service:', error);
      throw error;
    }
  }

  async loadValidationRules() {
    try {
      const rules = [
        {
          id: 'price_validation',
          name: 'Price Validation',
          description: 'Validate price data for accuracy and consistency',
          type: 'price',
          enabled: true,
          parameters: {
            minPrice: 0.01,
            maxPrice: 1000000,
            maxPriceChange: 0.5, // 50% max change
            requiredFields: ['price', 'timestamp']
          }
        },
        {
          id: 'volume_validation',
          name: 'Volume Validation',
          description: 'Validate volume data for accuracy and consistency',
          type: 'volume',
          enabled: true,
          parameters: {
            minVolume: 0,
            maxVolume: 1000000000,
            requiredFields: ['volume', 'timestamp']
          }
        },
        {
          id: 'ohlc_validation',
          name: 'OHLC Validation',
          description: 'Validate OHLC data for accuracy and consistency',
          type: 'ohlc',
          enabled: true,
          parameters: {
            minPrice: 0.01,
            maxPrice: 1000000,
            maxPriceChange: 0.5,
            requiredFields: ['open', 'high', 'low', 'close', 'timestamp']
          }
        },
        {
          id: 'timestamp_validation',
          name: 'Timestamp Validation',
          description: 'Validate timestamp data for accuracy and consistency',
          type: 'timestamp',
          enabled: true,
          parameters: {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            minAge: 0,
            requiredFields: ['timestamp']
          }
        },
        {
          id: 'data_completeness',
          name: 'Data Completeness',
          description: 'Validate data completeness and missing values',
          type: 'completeness',
          enabled: true,
          parameters: {
            maxMissingPercentage: 5, // 5% max missing
            requiredFields: ['timestamp', 'price']
          }
        },
        {
          id: 'data_consistency',
          name: 'Data Consistency',
          description: 'Validate data consistency across records',
          type: 'consistency',
          enabled: true,
          parameters: {
            maxGap: 24 * 60 * 60 * 1000, // 24 hours
            maxDuplicates: 0,
            requiredFields: ['timestamp']
          }
        }
      ];

      for (const rule of rules) {
        this.validationRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${rules.length} validation rules`);
    } catch (error) {
      logger.error('Error loading validation rules:', error);
    }
  }

  async validateMarketData(data, user) {
    try {
      const { symbol, dataType, data: marketData, rules, options } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        symbol: symbol,
        dataType: dataType || 'price',
        data: marketData,
        rules: rules || this.getDefaultRules(dataType),
        options: options || {},
        status: 'validating',
        createdAt: new Date(),
        results: null
      };

      this.validationSessions.set(session.id, session);

      // Validate data based on rules
      const results = await this.validateDataByRules(session);
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeValidationResults(session);

      logger.info(`Market data validation completed for symbol ${symbol}`);

      return {
        sessionId: session.id,
        symbol: symbol,
        dataType: dataType,
        results: results,
        summary: this.generateValidationSummary(results)
      };
    } catch (error) {
      logger.error('Market data validation error:', error);
      throw error;
    }
  }

  async validateDataByRules(session) {
    try {
      const { data, rules, dataType } = session;
      const results = {
        symbol: session.symbol,
        dataType: dataType,
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: 0,
        validationResults: {},
        errors: [],
        warnings: [],
        validatedAt: new Date()
      };

      // Validate each rule
      for (const ruleId of rules) {
        const rule = this.validationRules.get(ruleId);
        if (!rule || !rule.enabled) continue;

        try {
          const ruleResult = await this.validateByRule(rule, data, session.options);
          results.validationResults[ruleId] = ruleResult;
          
          if (ruleResult.errors && ruleResult.errors.length > 0) {
            results.errors.push(...ruleResult.errors);
          }
          if (ruleResult.warnings && ruleResult.warnings.length > 0) {
            results.warnings.push(...ruleResult.warnings);
          }
        } catch (error) {
          logger.error(`Error validating rule ${ruleId}:`, error);
          results.errors.push({
            rule: ruleId,
            error: error.message,
            type: 'validation_error'
          });
        }
      }

      // Calculate valid/invalid records
      results.validRecords = data.length - results.errors.length;
      results.invalidRecords = results.errors.length;

      return results;
    } catch (error) {
      logger.error('Error validating data by rules:', error);
      throw error;
    }
  }

  async validateByRule(rule, data, options) {
    try {
      const { id, type, parameters } = rule;
      
      switch (type) {
        case 'price':
          return await this.validatePriceData(data, parameters);
        case 'volume':
          return await this.validateVolumeData(data, parameters);
        case 'ohlc':
          return await this.validateOHLCData(data, parameters);
        case 'timestamp':
          return await this.validateTimestampData(data, parameters);
        case 'completeness':
          return await this.validateDataCompleteness(data, parameters);
        case 'consistency':
          return await this.validateDataConsistency(data, parameters);
        default:
          throw new Error(`Unknown validation rule type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error validating rule ${rule.id}:`, error);
      throw error;
    }
  }

  async validatePriceData(data, parameters) {
    try {
      const { minPrice, maxPrice, maxPriceChange, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        
        // Check required fields
        for (const field of requiredFields) {
          if (!(field in record)) {
            errors.push({
              record: i,
              field: field,
              error: `Missing required field: ${field}`,
              type: 'missing_field'
            });
          }
        }
        
        // Check price range
        if (record.price !== undefined) {
          if (record.price < minPrice) {
            errors.push({
              record: i,
              field: 'price',
              error: `Price ${record.price} below minimum ${minPrice}`,
              type: 'price_range'
            });
          }
          if (record.price > maxPrice) {
            errors.push({
              record: i,
              field: 'price',
              error: `Price ${record.price} above maximum ${maxPrice}`,
              type: 'price_range'
            });
          }
        }
        
        // Check price change
        if (i > 0 && record.price !== undefined && data[i - 1].price !== undefined) {
          const priceChange = Math.abs(record.price - data[i - 1].price) / data[i - 1].price;
          if (priceChange > maxPriceChange) {
            warnings.push({
              record: i,
              field: 'price',
              warning: `Large price change: ${(priceChange * 100).toFixed(2)}%`,
              type: 'price_change'
            });
          }
        }
      }
      
      return {
        rule: 'price_validation',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating price data:', error);
      throw error;
    }
  }

  async validateVolumeData(data, parameters) {
    try {
      const { minVolume, maxVolume, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        
        // Check required fields
        for (const field of requiredFields) {
          if (!(field in record)) {
            errors.push({
              record: i,
              field: field,
              error: `Missing required field: ${field}`,
              type: 'missing_field'
            });
          }
        }
        
        // Check volume range
        if (record.volume !== undefined) {
          if (record.volume < minVolume) {
            errors.push({
              record: i,
              field: 'volume',
              error: `Volume ${record.volume} below minimum ${minVolume}`,
              type: 'volume_range'
            });
          }
          if (record.volume > maxVolume) {
            errors.push({
              record: i,
              field: 'volume',
              error: `Volume ${record.volume} above maximum ${maxVolume}`,
              type: 'volume_range'
            });
          }
        }
      }
      
      return {
        rule: 'volume_validation',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating volume data:', error);
      throw error;
    }
  }

  async validateOHLCData(data, parameters) {
    try {
      const { minPrice, maxPrice, maxPriceChange, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        
        // Check required fields
        for (const field of requiredFields) {
          if (!(field in record)) {
            errors.push({
              record: i,
              field: field,
              error: `Missing required field: ${field}`,
              type: 'missing_field'
            });
          }
        }
        
        // Check OHLC relationships
        if (record.open !== undefined && record.high !== undefined && 
            record.low !== undefined && record.close !== undefined) {
          
          if (record.high < record.low) {
            errors.push({
              record: i,
              field: 'high',
              error: `High ${record.high} is less than low ${record.low}`,
              type: 'ohlc_relationship'
            });
          }
          
          if (record.high < record.open) {
            errors.push({
              record: i,
              field: 'high',
              error: `High ${record.high} is less than open ${record.open}`,
              type: 'ohlc_relationship'
            });
          }
          
          if (record.high < record.close) {
            errors.push({
              record: i,
              field: 'high',
              error: `High ${record.high} is less than close ${record.close}`,
              type: 'ohlc_relationship'
            });
          }
          
          if (record.low > record.open) {
            errors.push({
              record: i,
              field: 'low',
              error: `Low ${record.low} is greater than open ${record.open}`,
              type: 'ohlc_relationship'
            });
          }
          
          if (record.low > record.close) {
            errors.push({
              record: i,
              field: 'low',
              error: `Low ${record.low} is greater than close ${record.close}`,
              type: 'ohlc_relationship'
            });
          }
        }
        
        // Check price ranges
        const prices = [record.open, record.high, record.low, record.close];
        for (const price of prices) {
          if (price !== undefined) {
            if (price < minPrice) {
              errors.push({
                record: i,
                field: 'price',
                error: `Price ${price} below minimum ${minPrice}`,
                type: 'price_range'
              });
            }
            if (price > maxPrice) {
              errors.push({
                record: i,
                field: 'price',
                error: `Price ${price} above maximum ${maxPrice}`,
                type: 'price_range'
              });
            }
          }
        }
      }
      
      return {
        rule: 'ohlc_validation',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating OHLC data:', error);
      throw error;
    }
  }

  async validateTimestampData(data, parameters) {
    try {
      const { maxAge, minAge, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        
        // Check required fields
        for (const field of requiredFields) {
          if (!(field in record)) {
            errors.push({
              record: i,
              field: field,
              error: `Missing required field: ${field}`,
              type: 'missing_field'
            });
          }
        }
        
        // Check timestamp validity
        if (record.timestamp !== undefined) {
          const timestamp = new Date(record.timestamp);
          const now = new Date();
          const age = now.getTime() - timestamp.getTime();
          
          if (isNaN(timestamp.getTime())) {
            errors.push({
              record: i,
              field: 'timestamp',
              error: `Invalid timestamp: ${record.timestamp}`,
              type: 'invalid_timestamp'
            });
          } else if (age > maxAge) {
            errors.push({
              record: i,
              field: 'timestamp',
              error: `Timestamp too old: ${age}ms > ${maxAge}ms`,
              type: 'timestamp_age'
            });
          } else if (age < minAge) {
            errors.push({
              record: i,
              field: 'timestamp',
              error: `Timestamp too new: ${age}ms < ${minAge}ms`,
              type: 'timestamp_age'
            });
          }
        }
      }
      
      return {
        rule: 'timestamp_validation',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating timestamp data:', error);
      throw error;
    }
  }

  async validateDataCompleteness(data, parameters) {
    try {
      const { maxMissingPercentage, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      // Check each required field
      for (const field of requiredFields) {
        const missingCount = data.filter(record => !(field in record) || record[field] === null || record[field] === undefined).length;
        const missingPercentage = (missingCount / data.length) * 100;
        
        if (missingPercentage > maxMissingPercentage) {
          errors.push({
            field: field,
            error: `Too many missing values: ${missingPercentage.toFixed(2)}% > ${maxMissingPercentage}%`,
            type: 'completeness'
          });
        } else if (missingPercentage > 0) {
          warnings.push({
            field: field,
            warning: `Some missing values: ${missingPercentage.toFixed(2)}%`,
            type: 'completeness'
          });
        }
      }
      
      return {
        rule: 'data_completeness',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating data completeness:', error);
      throw error;
    }
  }

  async validateDataConsistency(data, parameters) {
    try {
      const { maxGap, maxDuplicates, requiredFields } = parameters;
      const errors = [];
      const warnings = [];
      
      // Check for duplicates
      const timestamps = data.map(record => record.timestamp).filter(ts => ts !== undefined);
      const uniqueTimestamps = new Set(timestamps);
      
      if (timestamps.length - uniqueTimestamps.size > maxDuplicates) {
        errors.push({
          error: `Too many duplicate timestamps: ${timestamps.length - uniqueTimestamps.size} > ${maxDuplicates}`,
          type: 'duplicates'
        });
      }
      
      // Check for gaps
      if (timestamps.length > 1) {
        const sortedTimestamps = timestamps.sort((a, b) => new Date(a) - new Date(b));
        
        for (let i = 1; i < sortedTimestamps.length; i++) {
          const gap = new Date(sortedTimestamps[i]) - new Date(sortedTimestamps[i - 1]);
          if (gap > maxGap) {
            warnings.push({
              warning: `Large time gap: ${gap}ms > ${maxGap}ms`,
              type: 'time_gap'
            });
          }
        }
      }
      
      return {
        rule: 'data_consistency',
        errors: errors,
        warnings: warnings,
        validRecords: data.length - errors.length
      };
    } catch (error) {
      logger.error('Error validating data consistency:', error);
      throw error;
    }
  }

  generateValidationSummary(results) {
    return {
      symbol: results.symbol,
      dataType: results.dataType,
      totalRecords: results.totalRecords,
      validRecords: results.validRecords,
      invalidRecords: results.invalidRecords,
      errorCount: results.errors.length,
      warningCount: results.warnings.length,
      validationScore: (results.validRecords / results.totalRecords) * 100,
      validatedAt: results.validatedAt
    };
  }

  async getValidationReports(user) {
    try {
      const query = `
        SELECT id, symbol, data_type, results, created_at
        FROM data_validation
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        dataType: row.data_type,
        results: row.results,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error fetching validation reports:', error);
      throw error;
    }
  }

  async runDailyValidation() {
    try {
      logger.info('Running daily data validation...');
      
      // Get active symbols
      const activeSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      
      for (const symbol of activeSymbols) {
        try {
          // Mock validation
          const mockData = this.generateMockMarketData(symbol);
          const rules = this.getDefaultRules('price');
          
          await this.validateMarketData({
            symbol: symbol,
            dataType: 'price',
            data: mockData,
            rules: rules
          }, { id: 'system' });
          
        } catch (error) {
          logger.error(`Error validating data for ${symbol}:`, error);
        }
      }
      
      logger.info('Daily data validation completed');
    } catch (error) {
      logger.error('Error running daily validation:', error);
    }
  }

  generateMockMarketData(symbol) {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      data.push({
        timestamp: new Date(now.getTime() - i * 60 * 1000),
        price: 100 + Math.random() * 20,
        volume: Math.floor(Math.random() * 1000)
      });
    }
    
    return data.reverse();
  }

  getDefaultRules(dataType) {
    const rules = ['timestamp_validation', 'data_completeness', 'data_consistency'];
    
    switch (dataType) {
      case 'price':
        rules.push('price_validation');
        break;
      case 'volume':
        rules.push('volume_validation');
        break;
      case 'ohlc':
        rules.push('ohlc_validation');
        break;
      default:
        rules.push('price_validation');
    }
    
    return rules;
  }

  async storeValidationResults(session) {
    try {
      const query = `
        INSERT INTO data_validation (
          id, user_id, symbol, data_type, data, rules, options, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.symbol,
        session.dataType,
        JSON.stringify(session.data),
        JSON.stringify(session.rules),
        JSON.stringify(session.options),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing validation results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.validationSessions.clear();
      logger.info('Data Validation Service closed successfully');
    } catch (error) {
      logger.error('Error closing Data Validation Service:', error);
    }
  }
}

module.exports = DataValidationService;

