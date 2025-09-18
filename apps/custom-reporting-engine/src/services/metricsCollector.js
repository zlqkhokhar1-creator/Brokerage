const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.metrics = new Map();
    this.metricTypes = new Map();
    this.aggregationRules = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load metric types and aggregation rules
      await this.loadMetricTypes();
      await this.loadAggregationRules();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this._initialized = true;
      logger.info('MetricsCollector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MetricsCollector:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MetricsCollector closed');
    } catch (error) {
      logger.error('Error closing MetricsCollector:', error);
    }
  }

  async loadMetricTypes() {
    try {
      this.metricTypes = new Map([
        ['counter', {
          name: 'Counter',
          description: 'Incremental counter metric',
          aggregation: ['sum', 'rate'],
          storage: 'redis',
          retention: 86400 // 24 hours
        }],
        ['gauge', {
          name: 'Gauge',
          description: 'Current value metric',
          aggregation: ['avg', 'min', 'max', 'last'],
          storage: 'redis',
          retention: 86400
        }],
        ['histogram', {
          name: 'Histogram',
          description: 'Distribution of values',
          aggregation: ['count', 'sum', 'avg', 'min', 'max', 'p50', 'p95', 'p99'],
          storage: 'redis',
          retention: 86400
        }],
        ['timer', {
          name: 'Timer',
          description: 'Duration measurement',
          aggregation: ['count', 'sum', 'avg', 'min', 'max', 'p50', 'p95', 'p99'],
          storage: 'redis',
          retention: 86400
        }],
        ['rate', {
          name: 'Rate',
          description: 'Rate of change metric',
          aggregation: ['avg', 'min', 'max'],
          storage: 'redis',
          retention: 86400
        }]
      ]);
      
      logger.info('Metric types loaded successfully');
    } catch (error) {
      logger.error('Error loading metric types:', error);
      throw error;
    }
  }

  async loadAggregationRules() {
    try {
      this.aggregationRules = new Map([
        ['sum', {
          name: 'Sum',
          description: 'Sum of all values',
          function: this.aggregateSum.bind(this)
        }],
        ['avg', {
          name: 'Average',
          description: 'Average of all values',
          function: this.aggregateAverage.bind(this)
        }],
        ['min', {
          name: 'Minimum',
          description: 'Minimum value',
          function: this.aggregateMin.bind(this)
        }],
        ['max', {
          name: 'Maximum',
          description: 'Maximum value',
          function: this.aggregateMax.bind(this)
        }],
        ['count', {
          name: 'Count',
          description: 'Number of values',
          function: this.aggregateCount.bind(this)
        }],
        ['last', {
          name: 'Last',
          description: 'Last value',
          function: this.aggregateLast.bind(this)
        }],
        ['rate', {
          name: 'Rate',
          description: 'Rate of change',
          function: this.aggregateRate.bind(this)
        }],
        ['p50', {
          name: '50th Percentile',
          description: '50th percentile value',
          function: this.aggregatePercentile.bind(this, 50)
        }],
        ['p95', {
          name: '95th Percentile',
          description: '95th percentile value',
          function: this.aggregatePercentile.bind(this, 95)
        }],
        ['p99', {
          name: '99th Percentile',
          description: '99th percentile value',
          function: this.aggregatePercentile.bind(this, 99)
        }]
      ]);
      
      logger.info('Aggregation rules loaded successfully');
    } catch (error) {
      logger.error('Error loading aggregation rules:', error);
      throw error;
    }
  }

  startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Error collecting system metrics:', error);
      }
    }, 30000);
    
    // Aggregate metrics every 5 minutes
    setInterval(async () => {
      try {
        await this.aggregateMetrics();
      } catch (error) {
        logger.error('Error aggregating metrics:', error);
      }
    }, 300000);
    
    // Clean up old metrics every hour
    setInterval(async () => {
      try {
        await this.cleanupOldMetrics();
      } catch (error) {
        logger.error('Error cleaning up old metrics:', error);
      }
    }, 3600000);
  }

  async collectSystemMetrics() {
    try {
      const timestamp = Date.now();
      
      // Collect various system metrics
      await this.collectProcessMetrics(timestamp);
      await this.collectDatabaseMetrics(timestamp);
      await this.collectRedisMetrics(timestamp);
      await this.collectApplicationMetrics(timestamp);
      
      this.emit('metricsCollected', { timestamp });
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  async collectProcessMetrics(timestamp) {
    try {
      const process = require('process');
      const os = require('os');
      
      // CPU usage
      const cpuUsage = process.cpuUsage();
      await this.recordMetric('process.cpu.user', 'gauge', cpuUsage.user, timestamp);
      await this.recordMetric('process.cpu.system', 'gauge', cpuUsage.system, timestamp);
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      await this.recordMetric('process.memory.rss', 'gauge', memoryUsage.rss, timestamp);
      await this.recordMetric('process.memory.heapTotal', 'gauge', memoryUsage.heapTotal, timestamp);
      await this.recordMetric('process.memory.heapUsed', 'gauge', memoryUsage.heapUsed, timestamp);
      await this.recordMetric('process.memory.external', 'gauge', memoryUsage.external, timestamp);
      
      // Uptime
      await this.recordMetric('process.uptime', 'gauge', process.uptime(), timestamp);
      
      // System load
      const loadAvg = os.loadavg();
      await this.recordMetric('system.load.1m', 'gauge', loadAvg[0], timestamp);
      await this.recordMetric('system.load.5m', 'gauge', loadAvg[1], timestamp);
      await this.recordMetric('system.load.15m', 'gauge', loadAvg[2], timestamp);
      
      // System memory
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      await this.recordMetric('system.memory.total', 'gauge', totalMemory, timestamp);
      await this.recordMetric('system.memory.free', 'gauge', freeMemory, timestamp);
      await this.recordMetric('system.memory.used', 'gauge', usedMemory, timestamp);
      await this.recordMetric('system.memory.usage', 'gauge', (usedMemory / totalMemory) * 100, timestamp);
    } catch (error) {
      logger.error('Error collecting process metrics:', error);
      throw error;
    }
  }

  async collectDatabaseMetrics(timestamp) {
    try {
      // Database connection pool metrics
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      await this.recordMetric('database.connections.total', 'gauge', poolStats.total, timestamp);
      await this.recordMetric('database.connections.idle', 'gauge', poolStats.idle, timestamp);
      await this.recordMetric('database.connections.waiting', 'gauge', poolStats.waiting, timestamp);
      
      // Database query metrics
      const queryStats = await this.getDatabaseQueryStats();
      await this.recordMetric('database.queries.count', 'counter', queryStats.count, timestamp);
      await this.recordMetric('database.queries.avg_time', 'gauge', queryStats.avgTime, timestamp);
      await this.recordMetric('database.queries.max_time', 'gauge', queryStats.maxTime, timestamp);
      
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
      throw error;
    }
  }

  async collectRedisMetrics(timestamp) {
    try {
      // Redis info
      const info = await this.redis.info('memory');
      const stats = await this.redis.info('stats');
      
      // Memory metrics
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1] || 0;
      const maxMemory = info.match(/maxmemory:(\d+)/)?.[1] || 0;
      const memoryUsage = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;
      
      await this.recordMetric('redis.memory.used', 'gauge', parseInt(usedMemory), timestamp);
      await this.recordMetric('redis.memory.max', 'gauge', parseInt(maxMemory), timestamp);
      await this.recordMetric('redis.memory.usage', 'gauge', memoryUsage, timestamp);
      
      // Connection metrics
      const connectedClients = stats.match(/connected_clients:(\d+)/)?.[1] || 0;
      const totalCommandsProcessed = stats.match(/total_commands_processed:(\d+)/)?.[1] || 0;
      
      await this.recordMetric('redis.connections.clients', 'gauge', parseInt(connectedClients), timestamp);
      await this.recordMetric('redis.commands.total', 'counter', parseInt(totalCommandsProcessed), timestamp);
      
    } catch (error) {
      logger.error('Error collecting Redis metrics:', error);
      throw error;
    }
  }

  async collectApplicationMetrics(timestamp) {
    try {
      // Application-specific metrics
      const appMetrics = {
        activeUsers: await this.getActiveUsersCount(),
        reportsGenerated: await this.getReportsGeneratedCount(),
        dashboardsCreated: await this.getDashboardsCreatedCount(),
        exportsCreated: await this.getExportsCreatedCount(),
        errorsCount: await this.getErrorsCount(),
        requestsCount: await this.getRequestsCount()
      };
      
      for (const [metricName, value] of Object.entries(appMetrics)) {
        await this.recordMetric(`app.${metricName}`, 'gauge', value, timestamp);
      }
      
    } catch (error) {
      logger.error('Error collecting application metrics:', error);
      throw error;
    }
  }

  async recordMetric(name, type, value, timestamp = null) {
    try {
      const metricType = this.metricTypes.get(type);
      if (!metricType) {
        throw new Error(`Unknown metric type: ${type}`);
      }
      
      const metricData = {
        name,
        type,
        value: parseFloat(value),
        timestamp: timestamp || Date.now(),
        tags: {}
      };
      
      // Store in Redis
      const key = `metric:${name}:${timestamp}`;
      await this.redis.setex(key, metricType.retention, JSON.stringify(metricData));
      
      // Update in-memory metrics
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      this.metrics.get(name).push(metricData);
      
      // Keep only recent metrics in memory
      const recentMetrics = this.metrics.get(name).slice(-1000);
      this.metrics.set(name, recentMetrics);
      
      this.emit('metricRecorded', { name, type, value, timestamp });
      
    } catch (error) {
      logger.error('Error recording metric:', error);
      throw error;
    }
  }

  async getMetric(name, timeRange = '1h') {
    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const cutoffTime = Date.now() - timeRangeMs;
      
      // Get from Redis
      const pattern = `metric:${name}:*`;
      const keys = await this.redis.keys(pattern);
      
      const metrics = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const metric = JSON.parse(data);
          if (metric.timestamp >= cutoffTime) {
            metrics.push(metric);
          }
        }
      }
      
      return metrics.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('Error getting metric:', error);
      throw error;
    }
  }

  async getAggregatedMetric(name, aggregation, timeRange = '1h') {
    try {
      const metrics = await this.getMetric(name, timeRange);
      const values = metrics.map(m => m.value);
      
      if (values.length === 0) {
        return null;
      }
      
      const aggregationRule = this.aggregationRules.get(aggregation);
      if (!aggregationRule) {
        throw new Error(`Unknown aggregation: ${aggregation}`);
      }
      
      return aggregationRule.function(values);
    } catch (error) {
      logger.error('Error getting aggregated metric:', error);
      throw error;
    }
  }

  async aggregateMetrics() {
    try {
      const metricNames = Array.from(this.metrics.keys());
      
      for (const metricName of metricNames) {
        const metricType = this.metrics.get(metricName)[0]?.type;
        if (!metricType) continue;
        
        const metricTypeConfig = this.metricTypes.get(metricType);
        if (!metricTypeConfig) continue;
        
        // Aggregate each supported aggregation
        for (const aggregation of metricTypeConfig.aggregation) {
          const aggregatedValue = await this.getAggregatedMetric(metricName, aggregation, '5m');
          if (aggregatedValue !== null) {
            await this.recordMetric(`${metricName}.${aggregation}`, 'gauge', aggregatedValue);
          }
        }
      }
      
      logger.info('Metrics aggregated successfully');
    } catch (error) {
      logger.error('Error aggregating metrics:', error);
      throw error;
    }
  }

  async cleanupOldMetrics() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      const pattern = 'metric:*';
      const keys = await this.redis.keys(pattern);
      
      let deletedCount = 0;
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const metric = JSON.parse(data);
          if (metric.timestamp < cutoffTime) {
            await this.redis.del(key);
            deletedCount++;
          }
        }
      }
      
      logger.info(`Cleaned up ${deletedCount} old metrics`);
    } catch (error) {
      logger.error('Error cleaning up old metrics:', error);
      throw error;
    }
  }

  // Aggregation functions
  aggregateSum(values) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  aggregateAverage(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  aggregateMin(values) {
    return Math.min(...values);
  }

  aggregateMax(values) {
    return Math.max(...values);
  }

  aggregateCount(values) {
    return values.length;
  }

  aggregateLast(values) {
    return values[values.length - 1];
  }

  aggregateRate(values) {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / values.length;
  }

  aggregatePercentile(percentile, values) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time range format: ${timeRange}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
  }

  async getDatabaseQueryStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_time,
          MAX(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as max_time
        FROM query_logs 
        WHERE started_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return {
        count: result.rows[0]?.count || 0,
        avgTime: result.rows[0]?.avg_time || 0,
        maxTime: result.rows[0]?.max_time || 0
      };
    } catch (error) {
      logger.error('Error getting database query stats:', error);
      return { count: 0, avgTime: 0, maxTime: 0 };
    }
  }

  async getActiveUsersCount() {
    try {
      const query = `
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions 
        WHERE last_activity >= NOW() - INTERVAL '15 minutes'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting active users count:', error);
      return 0;
    }
  }

  async getReportsGeneratedCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM reports 
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting reports generated count:', error);
      return 0;
    }
  }

  async getDashboardsCreatedCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM dashboards 
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting dashboards created count:', error);
      return 0;
    }
  }

  async getExportsCreatedCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM exports 
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting exports created count:', error);
      return 0;
    }
  }

  async getErrorsCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM error_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting errors count:', error);
      return 0;
    }
  }

  async getRequestsCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM request_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting requests count:', error);
      return 0;
    }
  }

  async getMetricsSummary() {
    try {
      const summary = {};
      const metricNames = Array.from(this.metrics.keys());
      
      for (const metricName of metricNames) {
        const metrics = this.metrics.get(metricName);
        if (metrics.length === 0) continue;
        
        const values = metrics.map(m => m.value);
        summary[metricName] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          last: values[values.length - 1]
        };
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting metrics summary:', error);
      throw error;
    }
  }

  async getMetricTypes() {
    try {
      return Array.from(this.metricTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting metric types:', error);
      throw error;
    }
  }

  async getAggregationRules() {
    try {
      return Array.from(this.aggregationRules.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting aggregation rules:', error);
      throw error;
    }
  }
}

module.exports = MetricsCollector;
