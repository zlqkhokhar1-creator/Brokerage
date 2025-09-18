const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DataQualityMonitor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.qualityRules = new Map();
    this.qualityMetrics = new Map();
    this.alerts = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load quality rules
      await this.loadQualityRules();
      
      this._initialized = true;
      logger.info('DataQualityMonitor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataQualityMonitor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DataQualityMonitor closed');
    } catch (error) {
      logger.error('Error closing DataQualityMonitor:', error);
    }
  }

  async loadQualityRules() {
    try {
      this.qualityRules = new Map([
        ['price_range', {
          name: 'Price Range Check',
          description: 'Validates price is within reasonable range',
          type: 'range',
          parameters: { min: 0, max: 10000 },
          severity: 'high'
        }],
        ['volume_consistency', {
          name: 'Volume Consistency Check',
          description: 'Validates volume is consistent with historical data',
          type: 'statistical',
          parameters: { threshold: 3 }, // 3 standard deviations
          severity: 'medium'
        }],
        ['timestamp_validity', {
          name: 'Timestamp Validity Check',
          description: 'Validates timestamp is reasonable',
          type: 'temporal',
          parameters: { maxAge: 300 }, // 5 minutes
          severity: 'high'
        }],
        ['data_completeness', {
          name: 'Data Completeness Check',
          description: 'Validates all required fields are present',
          type: 'completeness',
          parameters: { requiredFields: ['symbol', 'price', 'timestamp'] },
          severity: 'high'
        }],
        ['price_jump', {
          name: 'Price Jump Check',
          description: 'Detects unusual price movements',
          type: 'anomaly',
          parameters: { threshold: 0.1 }, // 10% change
          severity: 'medium'
        }],
        ['duplicate_data', {
          name: 'Duplicate Data Check',
          description: 'Detects duplicate data entries',
          type: 'duplicate',
          parameters: { timeWindow: 60 }, // 60 seconds
          severity: 'low'
        }]
      ]);
      
      logger.info('Quality rules loaded successfully');
    } catch (error) {
      logger.error('Error loading quality rules:', error);
      throw error;
    }
  }

  async validateData(data, validationRules, userId) {
    try {
      const validationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting data validation`, {
        validationId,
        dataType: data.type,
        userId
      });

      const results = {
        id: validationId,
        data,
        rules: validationRules,
        userId,
        results: {},
        overallScore: 0,
        passed: true,
        createdAt: new Date().toISOString(),
        processingTime: 0
      };

      // Run validation rules
      for (const ruleName of validationRules) {
        const rule = this.qualityRules.get(ruleName);
        if (!rule) {
          logger.warn(`Unknown validation rule: ${ruleName}`);
          continue;
        }

        try {
          const ruleResult = await this.runValidationRule(rule, data);
          results.results[ruleName] = ruleResult;
          
          if (!ruleResult.passed) {
            results.passed = false;
          }
        } catch (error) {
          logger.error(`Error running validation rule ${ruleName}:`, error);
          results.results[ruleName] = {
            passed: false,
            error: error.message,
            severity: 'high'
          };
          results.passed = false;
        }
      }

      // Calculate overall score
      results.overallScore = this.calculateOverallScore(results.results);
      results.processingTime = Date.now() - startTime;

      // Store validation results
      await this.storeValidationResults(results);

      // Generate alerts if needed
      if (!results.passed) {
        await this.generateQualityAlert(results);
      }

      this.emit('validationCompleted', results);

      logger.info(`Data validation completed`, {
        validationId,
        passed: results.passed,
        overallScore: results.overallScore,
        processingTime: results.processingTime
      });

      return results;
    } catch (error) {
      logger.error('Error validating data:', error);
      throw error;
    }
  }

  async runValidationRule(rule, data) {
    try {
      const result = {
        ruleName: rule.name,
        passed: true,
        message: '',
        severity: rule.severity,
        details: {}
      };

      switch (rule.type) {
        case 'range':
          result.passed = this.validateRange(data, rule.parameters);
          result.message = result.passed ? 'Range validation passed' : 'Value outside acceptable range';
          break;

        case 'statistical':
          result.passed = await this.validateStatistical(data, rule.parameters);
          result.message = result.passed ? 'Statistical validation passed' : 'Value outside statistical norms';
          break;

        case 'temporal':
          result.passed = this.validateTemporal(data, rule.parameters);
          result.message = result.passed ? 'Temporal validation passed' : 'Timestamp validation failed';
          break;

        case 'completeness':
          result.passed = this.validateCompleteness(data, rule.parameters);
          result.message = result.passed ? 'Completeness validation passed' : 'Missing required fields';
          break;

        case 'anomaly':
          result.passed = await this.validateAnomaly(data, rule.parameters);
          result.message = result.passed ? 'Anomaly validation passed' : 'Anomalous data detected';
          break;

        case 'duplicate':
          result.passed = await this.validateDuplicate(data, rule.parameters);
          result.message = result.passed ? 'Duplicate validation passed' : 'Duplicate data detected';
          break;

        default:
          throw new Error(`Unknown validation rule type: ${rule.type}`);
      }

      return result;
    } catch (error) {
      logger.error('Error running validation rule:', error);
      throw error;
    }
  }

  validateRange(data, parameters) {
    try {
      const { min, max } = parameters;
      const price = data.price || data.close;
      
      if (price === undefined) {
        return false;
      }
      
      return price >= min && price <= max;
    } catch (error) {
      logger.error('Error validating range:', error);
      return false;
    }
  }

  async validateStatistical(data, parameters) {
    try {
      const { threshold } = parameters;
      const symbol = data.symbol;
      
      // Get historical data for comparison
      const historicalData = await this.getHistoricalData(symbol, 100); // Last 100 data points
      
      if (historicalData.length < 10) {
        return true; // Not enough data for statistical validation
      }
      
      const prices = historicalData.map(d => d.price || d.close);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      
      const currentPrice = data.price || data.close;
      const zScore = Math.abs(currentPrice - mean) / stdDev;
      
      return zScore <= threshold;
    } catch (error) {
      logger.error('Error validating statistical:', error);
      return false;
    }
  }

  validateTemporal(data, parameters) {
    try {
      const { maxAge } = parameters;
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const age = (now - timestamp) / 1000; // Age in seconds
      
      return age <= maxAge;
    } catch (error) {
      logger.error('Error validating temporal:', error);
      return false;
    }
  }

  validateCompleteness(data, parameters) {
    try {
      const { requiredFields } = parameters;
      
      for (const field of requiredFields) {
        if (!(field in data) || data[field] === null || data[field] === undefined) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error validating completeness:', error);
      return false;
    }
  }

  async validateAnomaly(data, parameters) {
    try {
      const { threshold } = parameters;
      const symbol = data.symbol;
      
      // Get recent data for comparison
      const recentData = await this.getHistoricalData(symbol, 10); // Last 10 data points
      
      if (recentData.length < 2) {
        return true; // Not enough data for anomaly detection
      }
      
      const currentPrice = data.price || data.close;
      const previousPrice = recentData[recentData.length - 1].price || recentData[recentData.length - 1].close;
      
      const priceChange = Math.abs(currentPrice - previousPrice) / previousPrice;
      
      return priceChange <= threshold;
    } catch (error) {
      logger.error('Error validating anomaly:', error);
      return false;
    }
  }

  async validateDuplicate(data, parameters) {
    try {
      const { timeWindow } = parameters;
      const symbol = data.symbol;
      const timestamp = new Date(data.timestamp);
      
      // Check for duplicate data within time window
      const query = `
        SELECT COUNT(*) as count FROM market_data 
        WHERE symbol = $1 AND data_type = $2 
        AND created_at >= $3 AND created_at <= $4
      `;
      
      const startTime = new Date(timestamp.getTime() - timeWindow * 1000);
      const endTime = new Date(timestamp.getTime() + timeWindow * 1000);
      
      const result = await pool.query(query, [
        symbol,
        data.type || 'price',
        startTime.toISOString(),
        endTime.toISOString()
      ]);
      
      return result.rows[0].count === '0';
    } catch (error) {
      logger.error('Error validating duplicate:', error);
      return false;
    }
  }

  calculateOverallScore(results) {
    try {
      const scores = Object.values(results).map(result => {
        if (result.passed) {
          return 100;
        } else {
          switch (result.severity) {
            case 'high': return 0;
            case 'medium': return 50;
            case 'low': return 75;
            default: return 0;
          }
        }
      });
      
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
    } catch (error) {
      logger.error('Error calculating overall score:', error);
      return 0;
    }
  }

  async generateQualityAlert(validationResults) {
    try {
      const alertId = nanoid();
      const alert = {
        id: alertId,
        type: 'data_quality',
        severity: this.getHighestSeverity(validationResults.results),
        message: 'Data quality validation failed',
        details: validationResults,
        symbol: validationResults.data.symbol,
        userId: validationResults.userId,
        createdAt: new Date().toISOString()
      };

      // Store alert
      await this.storeQualityAlert(alert);
      
      // Add to active alerts
      this.alerts.set(alertId, alert);
      
      this.emit('qualityAlert', alert);
      
      logger.warn(`Quality alert generated: ${alertId}`, {
        alertId,
        severity: alert.severity,
        symbol: alert.symbol
      });
      
    } catch (error) {
      logger.error('Error generating quality alert:', error);
      throw error;
    }
  }

  getHighestSeverity(results) {
    const severities = Object.values(results).map(result => result.severity);
    
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    if (severities.includes('low')) return 'low';
    
    return 'low';
  }

  async getQualityMetrics(symbol, timeRange, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `quality_metrics:${symbol}:${timeRange}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const query = `
        SELECT * FROM data_quality_metrics 
        WHERE symbol = $1 AND time_range = $2 AND user_id = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [symbol, timeRange, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('No quality metrics found');
      }

      const metrics = result.rows[0];
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(metrics));
      
      return metrics;
    } catch (error) {
      logger.error('Error getting quality metrics:', error);
      throw error;
    }
  }

  async getQualityAlerts(severity, status, limit, userId) {
    try {
      let query = `
        SELECT * FROM data_quality_alerts 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting quality alerts:', error);
      throw error;
    }
  }

  async getHistoricalData(symbol, limit) {
    try {
      const query = `
        SELECT * FROM market_data 
        WHERE symbol = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await pool.query(query, [symbol, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting historical data:', error);
      return [];
    }
  }

  async storeValidationResults(results) {
    try {
      const query = `
        INSERT INTO data_quality_metrics (
          id, data, rules, user_id, results, overall_score, passed, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        results.id,
        JSON.stringify(results.data),
        JSON.stringify(Object.keys(results.results)),
        results.userId,
        JSON.stringify(results.results),
        results.overallScore,
        results.passed,
        results.createdAt
      ]);
      
      logger.info(`Validation results stored: ${results.id}`);
    } catch (error) {
      logger.error('Error storing validation results:', error);
      throw error;
    }
  }

  async storeQualityAlert(alert) {
    try {
      const query = `
        INSERT INTO data_quality_alerts (
          id, type, severity, message, details, symbol, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        alert.id,
        alert.type,
        alert.severity,
        alert.message,
        JSON.stringify(alert.details),
        alert.symbol,
        alert.userId,
        alert.createdAt
      ]);
      
      logger.info(`Quality alert stored: ${alert.id}`);
    } catch (error) {
      logger.error('Error storing quality alert:', error);
      throw error;
    }
  }

  async monitorStream(streamId) {
    try {
      // Monitor data quality for a specific stream
      logger.info(`Monitoring data quality for stream ${streamId}`);
      
      // This would typically involve checking recent data
      // and running quality checks
      
    } catch (error) {
      logger.error(`Error monitoring stream ${streamId}:`, error);
      throw error;
    }
  }
}

module.exports = DataQualityMonitor;
