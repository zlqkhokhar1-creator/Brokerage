const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.monitors = new Map();
    this.alerts = new Map();
    this.metrics = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load monitoring configurations
      await this.loadMonitoringConfigurations();
      
      // Start monitoring
      this.startMonitoring();
      
      this._initialized = true;
      logger.info('MonitoringService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MonitoringService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('MonitoringService closed');
    } catch (error) {
      logger.error('Error closing MonitoringService:', error);
    }
  }

  async loadMonitoringConfigurations() {
    try {
      this.monitors = new Map([
        ['system_health', {
          name: 'System Health',
          description: 'Monitor overall system health',
          enabled: true,
          interval: 30000, // 30 seconds
          thresholds: {
            cpu_usage: { warning: 70, critical: 90 },
            memory_usage: { warning: 80, critical: 95 },
            disk_usage: { warning: 85, critical: 95 }
          },
          check: this.checkSystemHealth.bind(this)
        }],
        ['database_health', {
          name: 'Database Health',
          description: 'Monitor database connectivity and performance',
          enabled: true,
          interval: 60000, // 1 minute
          thresholds: {
            connection_count: { warning: 80, critical: 95 },
            query_time: { warning: 1000, critical: 5000 },
            error_rate: { warning: 5, critical: 10 }
          },
          check: this.checkDatabaseHealth.bind(this)
        }],
        ['redis_health', {
          name: 'Redis Health',
          description: 'Monitor Redis connectivity and performance',
          enabled: true,
          interval: 60000, // 1 minute
          thresholds: {
            memory_usage: { warning: 80, critical: 95 },
            connection_count: { warning: 80, critical: 95 },
            response_time: { warning: 100, critical: 500 }
          },
          check: this.checkRedisHealth.bind(this)
        }],
        ['api_performance', {
          name: 'API Performance',
          description: 'Monitor API response times and error rates',
          enabled: true,
          interval: 30000, // 30 seconds
          thresholds: {
            response_time: { warning: 1000, critical: 5000 },
            error_rate: { warning: 5, critical: 10 },
            throughput: { warning: 100, critical: 50 }
          },
          check: this.checkAPIPerformance.bind(this)
        }],
        ['business_metrics', {
          name: 'Business Metrics',
          description: 'Monitor business-specific metrics',
          enabled: true,
          interval: 300000, // 5 minutes
          thresholds: {
            active_users: { warning: 1000, critical: 500 },
            report_generation_time: { warning: 30000, critical: 60000 },
            export_creation_time: { warning: 60000, critical: 120000 }
          },
          check: this.checkBusinessMetrics.bind(this)
        }]
      ]);
      
      logger.info('Monitoring configurations loaded successfully');
    } catch (error) {
      logger.error('Error loading monitoring configurations:', error);
      throw error;
    }
  }

  startMonitoring() {
    // Start each monitor
    for (const [monitorId, monitor] of this.monitors.entries()) {
      if (monitor.enabled) {
        setInterval(async () => {
          try {
            await this.runMonitor(monitorId);
          } catch (error) {
            logger.error(`Error running monitor ${monitorId}:`, error);
          }
        }, monitor.interval);
      }
    }
    
    // Process alerts every minute
    setInterval(async () => {
      try {
        await this.processAlerts();
      } catch (error) {
        logger.error('Error processing alerts:', error);
      }
    }, 60000);
  }

  async runMonitor(monitorId) {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor || !monitor.enabled) {
        return;
      }
      
      const startTime = Date.now();
      
      // Run the monitor check
      const result = await monitor.check();
      
      const duration = Date.now() - startTime;
      
      // Store metrics
      await this.storeMetrics(monitorId, result, duration);
      
      // Check thresholds and create alerts
      await this.checkThresholds(monitorId, result);
      
      this.emit('monitorCompleted', { monitorId, result, duration });
      
      logger.debug(`Monitor completed: ${monitorId}`, { duration });
    } catch (error) {
      logger.error(`Error running monitor ${monitorId}:`, error);
      
      // Create error alert
      await this.createAlert(monitorId, 'error', {
        message: `Monitor ${monitorId} failed: ${error.message}`,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  async checkSystemHealth() {
    try {
      const os = require('os');
      const process = require('process');
      
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      const cpuUsage = 100 - (totalIdle / totalTick) * 100;
      
      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;
      
      // Disk usage (simplified)
      const diskUsage = (usedMemory / totalMemory) * 100;
      
      // Load average
      const loadAverage = os.loadavg();
      
      return {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        load_average: loadAverage,
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      };
    } catch (error) {
      logger.error('Error checking system health:', error);
      throw error;
    }
  }

  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test connection
      await pool.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      // Get connection pool stats
      const connectionStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Get query performance stats
      const queryStats = await this.getDatabaseQueryStats();
      
      // Get error rate
      const errorRate = await this.getDatabaseErrorRate();
      
      return {
        connection_count: connectionStats.total,
        idle_connections: connectionStats.idle,
        waiting_connections: connectionStats.waiting,
        query_time: responseTime,
        error_rate: errorRate,
        query_stats: queryStats
      };
    } catch (error) {
      logger.error('Error checking database health:', error);
      throw error;
    }
  }

  async checkRedisHealth() {
    try {
      const startTime = Date.now();
      
      // Test connection
      await this.redis.ping();
      
      const responseTime = Date.now() - startTime;
      
      // Get Redis info
      const info = await this.redis.info('memory');
      const stats = await this.redis.info('stats');
      
      // Memory usage
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1] || 0;
      const maxMemory = info.match(/maxmemory:(\d+)/)?.[1] || 0;
      const memoryUsage = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;
      
      // Connection count
      const connectedClients = stats.match(/connected_clients:(\d+)/)?.[1] || 0;
      const maxClients = stats.match(/maxclients:(\d+)/)?.[1] || 10000;
      const connectionUsage = (connectedClients / maxClients) * 100;
      
      return {
        memory_usage: memoryUsage,
        connection_count: connectedClients,
        connection_usage: connectionUsage,
        response_time: responseTime,
        used_memory: parseInt(usedMemory),
        max_memory: parseInt(maxMemory)
      };
    } catch (error) {
      logger.error('Error checking Redis health:', error);
      throw error;
    }
  }

  async checkAPIPerformance() {
    try {
      // Get API performance metrics from the last minute
      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time
        FROM request_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      const stats = result.rows[0];
      
      const errorRate = stats.total_requests > 0 ? (stats.error_count / stats.total_requests) * 100 : 0;
      const throughput = stats.total_requests || 0;
      
      return {
        response_time: stats.avg_response_time || 0,
        max_response_time: stats.max_response_time || 0,
        error_rate: errorRate,
        throughput: throughput,
        total_requests: stats.total_requests || 0,
        error_count: stats.error_count || 0
      };
    } catch (error) {
      logger.error('Error checking API performance:', error);
      throw error;
    }
  }

  async checkBusinessMetrics() {
    try {
      // Active users
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions 
        WHERE last_activity >= NOW() - INTERVAL '15 minutes'
      `;
      const activeUsersResult = await pool.query(activeUsersQuery);
      const activeUsers = activeUsersResult.rows[0]?.count || 0;
      
      // Report generation time
      const reportTimeQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_time
        FROM report_logs 
        WHERE started_at >= NOW() - INTERVAL '1 hour'
      `;
      const reportTimeResult = await pool.query(reportTimeQuery);
      const reportGenerationTime = reportTimeResult.rows[0]?.avg_time || 0;
      
      // Export creation time
      const exportTimeQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_time
        FROM export_logs 
        WHERE started_at >= NOW() - INTERVAL '1 hour'
      `;
      const exportTimeResult = await pool.query(exportTimeQuery);
      const exportCreationTime = exportTimeResult.rows[0]?.avg_time || 0;
      
      return {
        active_users: activeUsers,
        report_generation_time: reportGenerationTime,
        export_creation_time: exportCreationTime
      };
    } catch (error) {
      logger.error('Error checking business metrics:', error);
      throw error;
    }
  }

  async checkThresholds(monitorId, metrics) {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor || !monitor.thresholds) {
        return;
      }
      
      for (const [metricName, thresholds] of Object.entries(monitor.thresholds)) {
        const value = metrics[metricName];
        if (value === undefined || value === null) {
          continue;
        }
        
        let severity = 'ok';
        let message = '';
        
        if (value >= thresholds.critical) {
          severity = 'critical';
          message = `${metricName} is critically high: ${value}%`;
        } else if (value >= thresholds.warning) {
          severity = 'warning';
          message = `${metricName} is high: ${value}%`;
        }
        
        if (severity !== 'ok') {
          await this.createAlert(monitorId, severity, {
            metric: metricName,
            value: value,
            threshold: thresholds[severity],
            message: message,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      logger.error('Error checking thresholds:', error);
      throw error;
    }
  }

  async createAlert(monitorId, severity, data) {
    try {
      const alertId = nanoid();
      const alert = {
        id: alertId,
        monitorId: monitorId,
        severity: severity,
        data: data,
        timestamp: Date.now(),
        status: 'active',
        acknowledged: false
      };
      
      // Store alert
      await this.storeAlert(alert);
      
      // Add to in-memory alerts
      this.alerts.set(alertId, alert);
      
      this.emit('alertCreated', alert);
      
      logger.warn(`Alert created: ${alertId}`, {
        monitorId,
        severity,
        message: data.message
      });
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async storeAlert(alert) {
    try {
      const query = `
        INSERT INTO monitoring_alerts (
          id, monitor_id, severity, data, timestamp, status, acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        alert.id,
        alert.monitorId,
        alert.severity,
        JSON.stringify(alert.data),
        new Date(alert.timestamp).toISOString(),
        alert.status,
        alert.acknowledged
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
      throw error;
    }
  }

  async storeMetrics(monitorId, metrics, duration) {
    try {
      const query = `
        INSERT INTO monitoring_metrics (
          id, monitor_id, metrics, duration, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await pool.query(query, [
        nanoid(),
        monitorId,
        JSON.stringify(metrics),
        duration,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing metrics:', error);
      throw error;
    }
  }

  async processAlerts() {
    try {
      // Get active alerts
      const query = `
        SELECT * FROM monitoring_alerts 
        WHERE status = 'active' 
        ORDER BY timestamp DESC
      `;
      
      const result = await pool.query(query);
      
      for (const alert of result.rows) {
        // Check if alert should be escalated
        const alertAge = Date.now() - new Date(alert.timestamp).getTime();
        const escalationTime = this.getEscalationTime(alert.severity);
        
        if (alertAge > escalationTime) {
          await this.escalateAlert(alert.id);
        }
      }
    } catch (error) {
      logger.error('Error processing alerts:', error);
      throw error;
    }
  }

  getEscalationTime(severity) {
    const escalationTimes = {
      'warning': 15 * 60 * 1000, // 15 minutes
      'critical': 5 * 60 * 1000, // 5 minutes
      'error': 2 * 60 * 1000 // 2 minutes
    };
    
    return escalationTimes[severity] || 30 * 60 * 1000; // Default 30 minutes
  }

  async escalateAlert(alertId) {
    try {
      const query = `
        UPDATE monitoring_alerts 
        SET status = 'escalated', escalated_at = $1
        WHERE id = $2
      `;
      
      await pool.query(query, [new Date().toISOString(), alertId]);
      
      logger.warn(`Alert escalated: ${alertId}`);
    } catch (error) {
      logger.error('Error escalating alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId, userId) {
    try {
      const query = `
        UPDATE monitoring_alerts 
        SET acknowledged = true, acknowledged_by = $1, acknowledged_at = $2
        WHERE id = $3
      `;
      
      await pool.query(query, [userId, new Date().toISOString(), alertId]);
      
      logger.info(`Alert acknowledged: ${alertId} by ${userId}`);
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId, userId) {
    try {
      const query = `
        UPDATE monitoring_alerts 
        SET status = 'resolved', resolved_by = $1, resolved_at = $2
        WHERE id = $3
      `;
      
      await pool.query(query, [userId, new Date().toISOString(), alertId]);
      
      logger.info(`Alert resolved: ${alertId} by ${userId}`);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  async getAlerts(filters = {}, pagination = {}) {
    try {
      let query = 'SELECT * FROM monitoring_alerts WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      // Apply filters
      if (filters.monitorId) {
        paramCount++;
        query += ` AND monitor_id = $${paramCount}`;
        params.push(filters.monitorId);
      }
      
      if (filters.severity) {
        paramCount++;
        query += ` AND severity = $${paramCount}`;
        params.push(filters.severity);
      }
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
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
        monitorId: row.monitor_id,
        severity: row.severity,
        data: row.data,
        timestamp: new Date(row.timestamp).getTime(),
        status: row.status,
        acknowledged: row.acknowledged,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at
      }));
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getMetrics(monitorId, timeRange = '1h') {
    try {
      const query = `
        SELECT * FROM monitoring_metrics 
        WHERE monitor_id = $1 
        AND timestamp >= NOW() - INTERVAL '${timeRange}'
        ORDER BY timestamp ASC
      `;
      
      const result = await pool.query(query, [monitorId]);
      
      return result.rows.map(row => ({
        id: row.id,
        monitorId: row.monitor_id,
        metrics: row.metrics,
        duration: row.duration,
        timestamp: new Date(row.timestamp).getTime()
      }));
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async getMonitoringStats() {
    try {
      const query = `
        SELECT 
          monitor_id,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_alerts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts
        FROM monitoring_alerts 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY monitor_id
        ORDER BY total_alerts DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting monitoring stats:', error);
      throw error;
    }
  }

  async getMonitors() {
    try {
      return Array.from(this.monitors.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting monitors:', error);
      throw error;
    }
  }

  async getDatabaseQueryStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_queries,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_time,
          MAX(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as max_time
        FROM query_logs 
        WHERE started_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting database query stats:', error);
      return { total_queries: 0, avg_time: 0, max_time: 0 };
    }
  }

  async getDatabaseErrorRate() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_queries,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_queries
        FROM query_logs 
        WHERE started_at >= NOW() - INTERVAL '1 minute'
      `;
      
      const result = await pool.query(query);
      const total = result.rows[0]?.total_queries || 0;
      const errors = result.rows[0]?.error_queries || 0;
      
      return total > 0 ? (errors / total) * 100 : 0;
    } catch (error) {
      logger.error('Error getting database error rate:', error);
      return 0;
    }
  }
}

module.exports = MonitoringService;
