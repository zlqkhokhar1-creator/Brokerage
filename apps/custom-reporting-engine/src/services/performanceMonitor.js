const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const os = require('os');
const process = require('process');

class PerformanceMonitor extends EventEmitter {
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
    this.alerts = new Map();
    this.thresholds = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load performance thresholds
      await this.loadPerformanceThresholds();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      this._initialized = true;
      logger.info('PerformanceMonitor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PerformanceMonitor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('PerformanceMonitor closed');
    } catch (error) {
      logger.error('Error closing PerformanceMonitor:', error);
    }
  }

  async loadPerformanceThresholds() {
    try {
      this.thresholds = new Map([
        ['cpu_usage', {
          warning: 70,
          critical: 90,
          unit: 'percent'
        }],
        ['memory_usage', {
          warning: 80,
          critical: 95,
          unit: 'percent'
        }],
        ['disk_usage', {
          warning: 85,
          critical: 95,
          unit: 'percent'
        }],
        ['response_time', {
          warning: 1000,
          critical: 5000,
          unit: 'milliseconds'
        }],
        ['error_rate', {
          warning: 5,
          critical: 10,
          unit: 'percent'
        }],
        ['throughput', {
          warning: 100,
          critical: 50,
          unit: 'requests_per_minute'
        }],
        ['queue_size', {
          warning: 1000,
          critical: 5000,
          unit: 'items'
        }],
        ['database_connections', {
          warning: 80,
          critical: 95,
          unit: 'percent'
        }],
        ['redis_connections', {
          warning: 80,
          critical: 95,
          unit: 'percent'
        }],
        ['report_generation_time', {
          warning: 30000,
          critical: 60000,
          unit: 'milliseconds'
        }],
        ['export_generation_time', {
          warning: 60000,
          critical: 120000,
          unit: 'milliseconds'
        }],
        ['dashboard_rendering_time', {
          warning: 5000,
          critical: 15000,
          unit: 'milliseconds'
        }]
      ]);
      
      logger.info('Performance thresholds loaded successfully');
    } catch (error) {
      logger.error('Error loading performance thresholds:', error);
      throw error;
    }
  }

  startPerformanceMonitoring() {
    // Monitor system metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Error collecting system metrics:', error);
      }
    }, 30000);
    
    // Monitor application metrics every 10 seconds
    setInterval(async () => {
      try {
        await this.collectApplicationMetrics();
      } catch (error) {
        logger.error('Error collecting application metrics:', error);
      }
    }, 10000);
    
    // Check alerts every 60 seconds
    setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        logger.error('Error checking alerts:', error);
      }
    }, 60000);
  }

  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: {
          usage: await this.getCPUUsage(),
          loadAverage: os.loadavg()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        disk: {
          usage: await this.getDiskUsage()
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      };
      
      // Store metrics
      await this.storeMetrics('system', metrics);
      
      // Update current metrics
      this.metrics.set('system', metrics);
      
      this.emit('systemMetricsCollected', metrics);
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  async collectApplicationMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        performance: {
          responseTime: await this.getAverageResponseTime(),
          errorRate: await this.getErrorRate(),
          throughput: await this.getThroughput(),
          queueSize: await this.getQueueSize()
        },
        database: {
          connections: await this.getDatabaseConnections(),
          queryTime: await this.getAverageQueryTime()
        },
        redis: {
          connections: await this.getRedisConnections(),
          memoryUsage: await this.getRedisMemoryUsage()
        }
      };
      
      // Store metrics
      await this.storeMetrics('application', metrics);
      
      // Update current metrics
      this.metrics.set('application', metrics);
      
      this.emit('applicationMetricsCollected', metrics);
    } catch (error) {
      logger.error('Error collecting application metrics:', error);
      throw error;
    }
  }

  async getCPUUsage() {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      return 100 - ~~(100 * totalIdle / totalTick);
    } catch (error) {
      logger.error('Error getting CPU usage:', error);
      return 0;
    }
  }

  async getDiskUsage() {
    try {
      // This is a simplified implementation
      // In production, you'd use a library like 'diskusage'
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      
      return {
        total,
        free,
        used,
        usage: (used / total) * 100
      };
    } catch (error) {
      logger.error('Error getting disk usage:', error);
      return { total: 0, free: 0, used: 0, usage: 0 };
    }
  }

  async getAverageResponseTime() {
    try {
      const query = `
        SELECT AVG(response_time) as avg_response_time
        FROM performance_metrics 
        WHERE metric_type = 'response_time' 
        AND timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.avg_response_time || 0;
    } catch (error) {
      logger.error('Error getting average response time:', error);
      return 0;
    }
  }

  async getErrorRate() {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(*) as total_count
        FROM performance_metrics 
        WHERE metric_type = 'request' 
        AND timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      const errorCount = result.rows[0]?.error_count || 0;
      const totalCount = result.rows[0]?.total_count || 0;
      
      return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error('Error getting error rate:', error);
      return 0;
    }
  }

  async getThroughput() {
    try {
      const query = `
        SELECT COUNT(*) as request_count
        FROM performance_metrics 
        WHERE metric_type = 'request' 
        AND timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.request_count || 0;
    } catch (error) {
      logger.error('Error getting throughput:', error);
      return 0;
    }
  }

  async getQueueSize() {
    try {
      // This would depend on your queue implementation
      // For now, return 0
      return 0;
    } catch (error) {
      logger.error('Error getting queue size:', error);
      return 0;
    }
  }

  async getDatabaseConnections() {
    try {
      const query = `
        SELECT 
          COUNT(*) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity
      `;
      
      const result = await pool.query(query);
      const active = result.rows[0]?.active_connections || 0;
      const max = result.rows[0]?.max_connections || 100;
      
      return {
        active,
        max,
        usage: (active / max) * 100
      };
    } catch (error) {
      logger.error('Error getting database connections:', error);
      return { active: 0, max: 100, usage: 0 };
    }
  }

  async getAverageQueryTime() {
    try {
      const query = `
        SELECT AVG(query_time) as avg_query_time
        FROM performance_metrics 
        WHERE metric_type = 'database_query' 
        AND timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0]?.avg_query_time || 0;
    } catch (error) {
      logger.error('Error getting average query time:', error);
      return 0;
    }
  }

  async getRedisConnections() {
    try {
      const info = await this.redis.info('clients');
      const connectedClients = info.match(/connected_clients:(\d+)/)?.[1] || 0;
      const maxClients = info.match(/maxclients:(\d+)/)?.[1] || 10000;
      
      return {
        active: parseInt(connectedClients),
        max: parseInt(maxClients),
        usage: (parseInt(connectedClients) / parseInt(maxClients)) * 100
      };
    } catch (error) {
      logger.error('Error getting Redis connections:', error);
      return { active: 0, max: 10000, usage: 0 };
    }
  }

  async getRedisMemoryUsage() {
    try {
      const info = await this.redis.info('memory');
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1] || 0;
      const maxMemory = info.match(/maxmemory:(\d+)/)?.[1] || 0;
      
      return {
        used: parseInt(usedMemory),
        max: parseInt(maxMemory),
        usage: maxMemory > 0 ? (parseInt(usedMemory) / parseInt(maxMemory)) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting Redis memory usage:', error);
      return { used: 0, max: 0, usage: 0 };
    }
  }

  async checkAlerts() {
    try {
      const systemMetrics = this.metrics.get('system');
      const applicationMetrics = this.metrics.get('application');
      
      if (!systemMetrics || !applicationMetrics) {
        return;
      }
      
      // Check system alerts
      await this.checkSystemAlerts(systemMetrics);
      
      // Check application alerts
      await this.checkApplicationAlerts(applicationMetrics);
    } catch (error) {
      logger.error('Error checking alerts:', error);
      throw error;
    }
  }

  async checkSystemAlerts(metrics) {
    try {
      // CPU usage alert
      if (metrics.cpu.usage > this.thresholds.get('cpu_usage').critical) {
        await this.createAlert('cpu_usage', 'critical', metrics.cpu.usage, 'CPU usage is critically high');
      } else if (metrics.cpu.usage > this.thresholds.get('cpu_usage').warning) {
        await this.createAlert('cpu_usage', 'warning', metrics.cpu.usage, 'CPU usage is high');
      }
      
      // Memory usage alert
      if (metrics.memory.usage > this.thresholds.get('memory_usage').critical) {
        await this.createAlert('memory_usage', 'critical', metrics.memory.usage, 'Memory usage is critically high');
      } else if (metrics.memory.usage > this.thresholds.get('memory_usage').warning) {
        await this.createAlert('memory_usage', 'warning', metrics.memory.usage, 'Memory usage is high');
      }
      
      // Disk usage alert
      if (metrics.disk.usage > this.thresholds.get('disk_usage').critical) {
        await this.createAlert('disk_usage', 'critical', metrics.disk.usage, 'Disk usage is critically high');
      } else if (metrics.disk.usage > this.thresholds.get('disk_usage').warning) {
        await this.createAlert('disk_usage', 'warning', metrics.disk.usage, 'Disk usage is high');
      }
    } catch (error) {
      logger.error('Error checking system alerts:', error);
      throw error;
    }
  }

  async checkApplicationAlerts(metrics) {
    try {
      // Response time alert
      if (metrics.performance.responseTime > this.thresholds.get('response_time').critical) {
        await this.createAlert('response_time', 'critical', metrics.performance.responseTime, 'Response time is critically high');
      } else if (metrics.performance.responseTime > this.thresholds.get('response_time').warning) {
        await this.createAlert('response_time', 'warning', metrics.performance.responseTime, 'Response time is high');
      }
      
      // Error rate alert
      if (metrics.performance.errorRate > this.thresholds.get('error_rate').critical) {
        await this.createAlert('error_rate', 'critical', metrics.performance.errorRate, 'Error rate is critically high');
      } else if (metrics.performance.errorRate > this.thresholds.get('error_rate').warning) {
        await this.createAlert('error_rate', 'warning', metrics.performance.errorRate, 'Error rate is high');
      }
      
      // Throughput alert
      if (metrics.performance.throughput < this.thresholds.get('throughput').critical) {
        await this.createAlert('throughput', 'critical', metrics.performance.throughput, 'Throughput is critically low');
      } else if (metrics.performance.throughput < this.thresholds.get('throughput').warning) {
        await this.createAlert('throughput', 'warning', metrics.performance.throughput, 'Throughput is low');
      }
      
      // Database connections alert
      if (metrics.database.connections.usage > this.thresholds.get('database_connections').critical) {
        await this.createAlert('database_connections', 'critical', metrics.database.connections.usage, 'Database connections are critically high');
      } else if (metrics.database.connections.usage > this.thresholds.get('database_connections').warning) {
        await this.createAlert('database_connections', 'warning', metrics.database.connections.usage, 'Database connections are high');
      }
      
      // Redis connections alert
      if (metrics.redis.connections.usage > this.thresholds.get('redis_connections').critical) {
        await this.createAlert('redis_connections', 'critical', metrics.redis.connections.usage, 'Redis connections are critically high');
      } else if (metrics.redis.connections.usage > this.thresholds.get('redis_connections').warning) {
        await this.createAlert('redis_connections', 'warning', metrics.redis.connections.usage, 'Redis connections are high');
      }
    } catch (error) {
      logger.error('Error checking application alerts:', error);
      throw error;
    }
  }

  async createAlert(metric, severity, value, message) {
    try {
      const alertId = nanoid();
      const alert = {
        id: alertId,
        metric,
        severity,
        value,
        message,
        timestamp: new Date().toISOString(),
        status: 'active'
      };
      
      // Store alert
      await this.storeAlert(alert);
      
      // Update alerts map
      this.alerts.set(alertId, alert);
      
      this.emit('alertCreated', alert);
      
      logger.warn(`Performance alert created: ${alertId}`, {
        metric,
        severity,
        value,
        message
      });
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async storeMetrics(metricType, metrics) {
    try {
      const query = `
        INSERT INTO performance_metrics (
          id, metric_type, data, timestamp
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(query, [
        nanoid(),
        metricType,
        JSON.stringify(metrics),
        metrics.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing metrics:', error);
      throw error;
    }
  }

  async storeAlert(alert) {
    try {
      const query = `
        INSERT INTO performance_alerts (
          id, metric, severity, value, message, timestamp, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        alert.id,
        alert.metric,
        alert.severity,
        alert.value,
        alert.message,
        alert.timestamp,
        alert.status
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
      throw error;
    }
  }

  async getMetrics(metricType, timeRange = '1 hour') {
    try {
      const query = `
        SELECT * FROM performance_metrics 
        WHERE metric_type = $1 
        AND timestamp >= NOW() - INTERVAL '${timeRange}'
        ORDER BY timestamp DESC
      `;
      
      const result = await pool.query(query, [metricType]);
      
      return result.rows.map(row => ({
        id: row.id,
        metricType: row.metric_type,
        data: row.data,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async getAlerts(status = 'active') {
    try {
      const query = `
        SELECT * FROM performance_alerts 
        WHERE status = $1 
        ORDER BY timestamp DESC
      `;
      
      const result = await pool.query(query, [status]);
      
      return result.rows.map(row => ({
        id: row.id,
        metric: row.metric,
        severity: row.severity,
        value: row.value,
        message: row.message,
        timestamp: row.timestamp,
        status: row.status
      }));
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getPerformanceStats() {
    try {
      const query = `
        SELECT 
          metric_type,
          COUNT(*) as count,
          AVG((data->>'cpu')::numeric) as avg_cpu,
          AVG((data->>'memory')::numeric) as avg_memory,
          AVG((data->>'responseTime')::numeric) as avg_response_time
        FROM performance_metrics 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY metric_type
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting performance stats:', error);
      throw error;
    }
  }

  async getCurrentMetrics() {
    try {
      return {
        system: this.metrics.get('system'),
        application: this.metrics.get('application')
      };
    } catch (error) {
      logger.error('Error getting current metrics:', error);
      throw error;
    }
  }

  async getThresholds() {
    try {
      return Array.from(this.thresholds.entries()).map(([key, config]) => ({
        metric: key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting thresholds:', error);
      throw error;
    }
  }
}

module.exports = PerformanceMonitor;
