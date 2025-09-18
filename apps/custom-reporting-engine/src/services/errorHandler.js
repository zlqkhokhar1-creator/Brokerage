const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ErrorHandler extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.errorTypes = new Map();
    this.errorPatterns = new Map();
    this.retryStrategies = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load error types and patterns
      await this.loadErrorTypes();
      await this.loadErrorPatterns();
      await this.loadRetryStrategies();
      
      this._initialized = true;
      logger.info('ErrorHandler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ErrorHandler:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ErrorHandler closed');
    } catch (error) {
      logger.error('Error closing ErrorHandler:', error);
    }
  }

  async loadErrorTypes() {
    try {
      this.errorTypes = new Map([
        ['validation_error', {
          name: 'Validation Error',
          description: 'Input validation failed',
          severity: 'low',
          retryable: false,
          category: 'client'
        }],
        ['authentication_error', {
          name: 'Authentication Error',
          description: 'User authentication failed',
          severity: 'medium',
          retryable: false,
          category: 'security'
        }],
        ['authorization_error', {
          name: 'Authorization Error',
          description: 'User authorization failed',
          severity: 'medium',
          retryable: false,
          category: 'security'
        }],
        ['database_error', {
          name: 'Database Error',
          description: 'Database operation failed',
          severity: 'high',
          retryable: true,
          category: 'infrastructure'
        }],
        ['redis_error', {
          name: 'Redis Error',
          description: 'Redis operation failed',
          severity: 'medium',
          retryable: true,
          category: 'infrastructure'
        }],
        ['external_api_error', {
          name: 'External API Error',
          description: 'External API call failed',
          severity: 'medium',
          retryable: true,
          category: 'external'
        }],
        ['file_system_error', {
          name: 'File System Error',
          description: 'File system operation failed',
          severity: 'high',
          retryable: true,
          category: 'infrastructure'
        }],
        ['network_error', {
          name: 'Network Error',
          description: 'Network operation failed',
          severity: 'medium',
          retryable: true,
          category: 'infrastructure'
        }],
        ['timeout_error', {
          name: 'Timeout Error',
          description: 'Operation timed out',
          severity: 'medium',
          retryable: true,
          category: 'performance'
        }],
        ['rate_limit_error', {
          name: 'Rate Limit Error',
          description: 'Rate limit exceeded',
          severity: 'low',
          retryable: true,
          category: 'client'
        }],
        ['configuration_error', {
          name: 'Configuration Error',
          description: 'Configuration is invalid',
          severity: 'high',
          retryable: false,
          category: 'system'
        }],
        ['resource_not_found', {
          name: 'Resource Not Found',
          description: 'Requested resource does not exist',
          severity: 'low',
          retryable: false,
          category: 'client'
        }],
        ['service_unavailable', {
          name: 'Service Unavailable',
          description: 'Service is temporarily unavailable',
          severity: 'high',
          retryable: true,
          category: 'infrastructure'
        }],
        ['internal_error', {
          name: 'Internal Error',
          description: 'Internal system error',
          severity: 'critical',
          retryable: false,
          category: 'system'
        }]
      ]);
      
      logger.info('Error types loaded successfully');
    } catch (error) {
      logger.error('Error loading error types:', error);
      throw error;
    }
  }

  async loadErrorPatterns() {
    try {
      this.errorPatterns = new Map([
        ['database_connection', {
          pattern: /connection.*refused|ECONNREFUSED/i,
          type: 'database_error',
          action: 'retry'
        }],
        ['database_timeout', {
          pattern: /timeout.*database|ETIMEDOUT/i,
          type: 'timeout_error',
          action: 'retry'
        }],
        ['redis_connection', {
          pattern: /redis.*connection.*refused|ECONNREFUSED/i,
          type: 'redis_error',
          action: 'retry'
        }],
        ['validation_failed', {
          pattern: /validation.*failed|invalid.*input/i,
          type: 'validation_error',
          action: 'reject'
        }],
        ['authentication_failed', {
          pattern: /unauthorized|authentication.*failed/i,
          type: 'authentication_error',
          action: 'reject'
        }],
        ['authorization_failed', {
          pattern: /forbidden|access.*denied/i,
          type: 'authorization_error',
          action: 'reject'
        }],
        ['rate_limit_exceeded', {
          pattern: /rate.*limit|too.*many.*requests/i,
          type: 'rate_limit_error',
          action: 'retry'
        }],
        ['file_not_found', {
          pattern: /file.*not.*found|ENOENT/i,
          type: 'resource_not_found',
          action: 'reject'
        }],
        ['network_timeout', {
          pattern: /network.*timeout|ETIMEDOUT/i,
          type: 'timeout_error',
          action: 'retry'
        }],
        ['service_unavailable', {
          pattern: /service.*unavailable|503/i,
          type: 'service_unavailable',
          action: 'retry'
        }]
      ]);
      
      logger.info('Error patterns loaded successfully');
    } catch (error) {
      logger.error('Error loading error patterns:', error);
      throw error;
    }
  }

  async loadRetryStrategies() {
    try {
      this.retryStrategies = new Map([
        ['exponential_backoff', {
          name: 'Exponential Backoff',
          description: 'Exponential backoff retry strategy',
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          multiplier: 2
        }],
        ['linear_backoff', {
          name: 'Linear Backoff',
          description: 'Linear backoff retry strategy',
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 5000,
          multiplier: 1
        }],
        ['fixed_delay', {
          name: 'Fixed Delay',
          description: 'Fixed delay retry strategy',
          maxRetries: 3,
          baseDelay: 2000,
          maxDelay: 2000,
          multiplier: 1
        }],
        ['immediate', {
          name: 'Immediate',
          description: 'Immediate retry strategy',
          maxRetries: 1,
          baseDelay: 0,
          maxDelay: 0,
          multiplier: 1
        }]
      ]);
      
      logger.info('Retry strategies loaded successfully');
    } catch (error) {
      logger.error('Error loading retry strategies:', error);
      throw error;
    }
  }

  async handleError(error, context = {}) {
    try {
      const errorId = nanoid();
      const timestamp = new Date().toISOString();
      
      // Analyze error
      const errorAnalysis = await this.analyzeError(error);
      
      // Create error record
      const errorRecord = {
        id: errorId,
        type: errorAnalysis.type,
        message: error.message,
        stack: error.stack,
        context: context,
        severity: errorAnalysis.severity,
        retryable: errorAnalysis.retryable,
        category: errorAnalysis.category,
        timestamp: timestamp,
        resolved: false
      };
      
      // Store error
      await this.storeError(errorRecord);
      
      // Determine action
      const action = await this.determineAction(errorAnalysis, context);
      
      // Execute action
      const result = await this.executeAction(action, errorRecord, context);
      
      this.emit('errorHandled', { errorId, errorRecord, action, result });
      
      logger.error(`Error handled: ${errorId}`, {
        type: errorAnalysis.type,
        severity: errorAnalysis.severity,
        action: action.type
      });
      
      return { errorId, errorRecord, action, result };
    } catch (error) {
      logger.error('Error in handleError:', error);
      throw error;
    }
  }

  async analyzeError(error) {
    try {
      const errorMessage = error.message || '';
      const errorStack = error.stack || '';
      
      // Check error patterns
      for (const [patternName, patternConfig] of this.errorPatterns.entries()) {
        if (patternConfig.pattern.test(errorMessage) || patternConfig.pattern.test(errorStack)) {
          const errorType = this.errorTypes.get(patternConfig.type);
          if (errorType) {
            return {
              type: patternConfig.type,
              severity: errorType.severity,
              retryable: errorType.retryable,
              category: errorType.category,
              pattern: patternName
            };
          }
        }
      }
      
      // Default to internal error
      const defaultErrorType = this.errorTypes.get('internal_error');
      return {
        type: 'internal_error',
        severity: defaultErrorType.severity,
        retryable: defaultErrorType.retryable,
        category: defaultErrorType.category,
        pattern: 'unknown'
      };
    } catch (error) {
      logger.error('Error analyzing error:', error);
      throw error;
    }
  }

  async determineAction(errorAnalysis, context) {
    try {
      const { type, retryable, severity } = errorAnalysis;
      
      if (retryable && context.retryCount < 3) {
        return {
          type: 'retry',
          strategy: this.getRetryStrategy(type),
          delay: this.calculateRetryDelay(type, context.retryCount || 0)
        };
      }
      
      if (severity === 'critical') {
        return {
          type: 'alert',
          channels: ['email', 'slack', 'pagerduty'],
          priority: 'high'
        };
      }
      
      if (severity === 'high') {
        return {
          type: 'alert',
          channels: ['email', 'slack'],
          priority: 'medium'
        };
      }
      
      return {
        type: 'log',
        level: 'error'
      };
    } catch (error) {
      logger.error('Error determining action:', error);
      throw error;
    }
  }

  async executeAction(action, errorRecord, context) {
    try {
      switch (action.type) {
        case 'retry':
          return await this.executeRetry(action, errorRecord, context);
        case 'alert':
          return await this.executeAlert(action, errorRecord, context);
        case 'log':
          return await this.executeLog(action, errorRecord, context);
        default:
          return { success: false, message: 'Unknown action type' };
      }
    } catch (error) {
      logger.error('Error executing action:', error);
      throw error;
    }
  }

  async executeRetry(action, errorRecord, context) {
    try {
      const { strategy, delay } = action;
      
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Update retry count
      const retryCount = (context.retryCount || 0) + 1;
      
      return {
        success: true,
        action: 'retry',
        retryCount,
        delay,
        strategy: strategy.name
      };
    } catch (error) {
      logger.error('Error executing retry:', error);
      throw error;
    }
  }

  async executeAlert(action, errorRecord, context) {
    try {
      const { channels, priority } = action;
      
      // Send alerts to specified channels
      for (const channel of channels) {
        await this.sendAlert(channel, errorRecord, priority);
      }
      
      return {
        success: true,
        action: 'alert',
        channels,
        priority
      };
    } catch (error) {
      logger.error('Error executing alert:', error);
      throw error;
    }
  }

  async executeLog(action, errorRecord, context) {
    try {
      const { level } = action;
      
      // Log error
      logger[level](`Error logged: ${errorRecord.id}`, {
        type: errorRecord.type,
        message: errorRecord.message,
        severity: errorRecord.severity
      });
      
      return {
        success: true,
        action: 'log',
        level
      };
    } catch (error) {
      logger.error('Error executing log:', error);
      throw error;
    }
  }

  async sendAlert(channel, errorRecord, priority) {
    try {
      // This would integrate with actual alerting services
      logger.warn(`Alert sent via ${channel}`, {
        errorId: errorRecord.id,
        type: errorRecord.type,
        severity: errorRecord.severity,
        priority
      });
    } catch (error) {
      logger.error('Error sending alert:', error);
      throw error;
    }
  }

  getRetryStrategy(errorType) {
    try {
      const strategies = {
        'database_error': 'exponential_backoff',
        'redis_error': 'exponential_backoff',
        'external_api_error': 'linear_backoff',
        'network_error': 'exponential_backoff',
        'timeout_error': 'exponential_backoff',
        'rate_limit_error': 'fixed_delay',
        'service_unavailable': 'exponential_backoff'
      };
      
      const strategyName = strategies[errorType] || 'exponential_backoff';
      return this.retryStrategies.get(strategyName);
    } catch (error) {
      logger.error('Error getting retry strategy:', error);
      throw error;
    }
  }

  calculateRetryDelay(errorType, retryCount) {
    try {
      const strategy = this.getRetryStrategy(errorType);
      const { baseDelay, maxDelay, multiplier } = strategy;
      
      const delay = Math.min(baseDelay * Math.pow(multiplier, retryCount), maxDelay);
      return delay;
    } catch (error) {
      logger.error('Error calculating retry delay:', error);
      throw error;
    }
  }

  async storeError(errorRecord) {
    try {
      const query = `
        INSERT INTO error_logs (
          id, type, message, stack, context, severity, retryable, 
          category, timestamp, resolved
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await pool.query(query, [
        errorRecord.id,
        errorRecord.type,
        errorRecord.message,
        errorRecord.stack,
        JSON.stringify(errorRecord.context),
        errorRecord.severity,
        errorRecord.retryable,
        errorRecord.category,
        errorRecord.timestamp,
        errorRecord.resolved
      ]);
      
      logger.info(`Error stored: ${errorRecord.id}`);
    } catch (error) {
      logger.error('Error storing error:', error);
      throw error;
    }
  }

  async getErrors(filters = {}, pagination = {}) {
    try {
      let query = 'SELECT * FROM error_logs WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      // Apply filters
      if (filters.type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(filters.type);
      }
      
      if (filters.severity) {
        paramCount++;
        query += ` AND severity = $${paramCount}`;
        params.push(filters.severity);
      }
      
      if (filters.category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(filters.category);
      }
      
      if (filters.resolved !== undefined) {
        paramCount++;
        query += ` AND resolved = $${paramCount}`;
        params.push(filters.resolved);
      }
      
      if (filters.startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.endDate);
      }
      
      // Apply sorting
      query += ' ORDER BY timestamp DESC';
      
      // Apply pagination
      if (pagination.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(pagination.limit);
        
        if (pagination.offset) {
          paramCount++;
          query += ` OFFSET $${paramCount}`;
          params.push(pagination.offset);
        }
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        message: row.message,
        stack: row.stack,
        context: row.context,
        severity: row.severity,
        retryable: row.retryable,
        category: row.category,
        timestamp: row.timestamp,
        resolved: row.resolved
      }));
    } catch (error) {
      logger.error('Error getting errors:', error);
      throw error;
    }
  }

  async resolveError(errorId) {
    try {
      const query = 'UPDATE error_logs SET resolved = true WHERE id = $1';
      await pool.query(query, [errorId]);
      
      logger.info(`Error resolved: ${errorId}`);
    } catch (error) {
      logger.error('Error resolving error:', error);
      throw error;
    }
  }

  async getErrorStats() {
    try {
      const query = `
        SELECT 
          type,
          severity,
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count
        FROM error_logs 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY type, severity, category
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting error stats:', error);
      throw error;
    }
  }

  async getErrorTypes() {
    try {
      return Array.from(this.errorTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting error types:', error);
      throw error;
    }
  }

  async getRetryStrategies() {
    try {
      return Array.from(this.retryStrategies.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting retry strategies:', error);
      throw error;
    }
  }
}

module.exports = ErrorHandler;
