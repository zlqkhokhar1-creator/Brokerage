const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class SecurityMonitor extends EventEmitter {
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
    this.incidents = new Map();
    this.healthChecks = new Map();
    this.performanceData = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load existing alerts
      await this.loadAlerts();
      
      // Load existing incidents
      await this.loadIncidents();
      
      // Initialize health checks
      await this.initializeHealthChecks();
      
      this._initialized = true;
      logger.info('SecurityMonitor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecurityMonitor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('SecurityMonitor closed');
    } catch (error) {
      logger.error('Error closing SecurityMonitor:', error);
    }
  }

  async loadAlerts() {
    try {
      const result = await pool.query(`
        SELECT * FROM security_alerts
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      
      for (const alert of result.rows) {
        this.alerts.set(alert.id, {
          ...alert,
          data: alert.data ? JSON.parse(alert.data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} alerts`);
    } catch (error) {
      logger.error('Error loading alerts:', error);
      throw error;
    }
  }

  async loadIncidents() {
    try {
      const result = await pool.query(`
        SELECT * FROM security_incidents
        WHERE status != 'closed'
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      
      for (const incident of result.rows) {
        this.incidents.set(incident.id, {
          ...incident,
          data: incident.data ? JSON.parse(incident.data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} incidents`);
    } catch (error) {
      logger.error('Error loading incidents:', error);
      throw error;
    }
  }

  async initializeHealthChecks() {
    try {
      const healthChecks = [
        {
          id: 'database',
          name: 'Database Connection',
          check: () => this.checkDatabaseHealth(),
          interval: 30000, // 30 seconds
          timeout: 5000
        },
        {
          id: 'redis',
          name: 'Redis Connection',
          check: () => this.checkRedisHealth(),
          interval: 30000, // 30 seconds
          timeout: 5000
        },
        {
          id: 'memory',
          name: 'Memory Usage',
          check: () => this.checkMemoryHealth(),
          interval: 60000, // 1 minute
          timeout: 5000
        },
        {
          id: 'cpu',
          name: 'CPU Usage',
          check: () => this.checkCPUHealth(),
          interval: 60000, // 1 minute
          timeout: 5000
        },
        {
          id: 'disk',
          name: 'Disk Usage',
          check: () => this.checkDiskHealth(),
          interval: 300000, // 5 minutes
          timeout: 10000
        },
        {
          id: 'network',
          name: 'Network Connectivity',
          check: () => this.checkNetworkHealth(),
          interval: 60000, // 1 minute
          timeout: 10000
        }
      ];
      
      for (const healthCheck of healthChecks) {
        this.healthChecks.set(healthCheck.id, {
          ...healthCheck,
          lastCheck: null,
          status: 'unknown',
          lastError: null
        });
      }
      
      logger.info(`Initialized ${healthChecks.length} health checks`);
    } catch (error) {
      logger.error('Error initializing health checks:', error);
      throw error;
    }
  }

  async monitorAllSystems() {
    try {
      const results = {
        healthChecks: {},
        metrics: {},
        alerts: [],
        incidents: []
      };
      
      // Run health checks
      for (const [id, healthCheck] of this.healthChecks.entries()) {
        try {
          const result = await this.runHealthCheck(healthCheck);
          results.healthChecks[id] = result;
        } catch (error) {
          logger.error(`Health check ${id} failed:`, error);
          results.healthChecks[id] = {
            status: 'error',
            error: error.message
          };
        }
      }
      
      // Collect metrics
      results.metrics = await this.collectMetrics();
      
      // Check for new alerts
      results.alerts = await this.checkForAlerts();
      
      // Check for new incidents
      results.incidents = await this.checkForIncidents();
      
      // Emit monitoring event
      this.emit('monitoringCompleted', results);
      
      return results;
    } catch (error) {
      logger.error('Error monitoring systems:', error);
      throw error;
    }
  }

  async runHealthCheck(healthCheck) {
    try {
      const startTime = Date.now();
      
      // Check if enough time has passed since last check
      if (healthCheck.lastCheck && 
          Date.now() - healthCheck.lastCheck < healthCheck.interval) {
        return {
          status: healthCheck.status,
          lastCheck: healthCheck.lastCheck,
          message: 'Skipped - too soon'
        };
      }
      
      // Run the health check
      const result = await Promise.race([
        healthCheck.check(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      // Update health check status
      healthCheck.status = result.status;
      healthCheck.lastCheck = new Date();
      healthCheck.lastError = null;
      
      // Store result
      this.healthChecks.set(healthCheck.id, healthCheck);
      
      // Log result
      logger.info(`Health check ${healthCheck.name} completed`, {
        status: result.status,
        duration: `${duration}ms`
      });
      
      return {
        ...result,
        duration,
        lastCheck: healthCheck.lastCheck
      };
    } catch (error) {
      logger.error(`Health check ${healthCheck.name} failed:`, error);
      
      // Update health check status
      healthCheck.status = 'error';
      healthCheck.lastCheck = new Date();
      healthCheck.lastError = error.message;
      
      // Store result
      this.healthChecks.set(healthCheck.id, healthCheck);
      
      return {
        status: 'error',
        error: error.message,
        lastCheck: healthCheck.lastCheck
      };
    }
  }

  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test database connection
      const result = await pool.query('SELECT NOW() as current_time');
      const duration = Date.now() - startTime;
      
      if (result.rows.length > 0) {
        return {
          status: 'healthy',
          message: 'Database connection successful',
          duration: `${duration}ms`,
          currentTime: result.rows[0].current_time
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Database query returned no results',
          duration: `${duration}ms`
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkRedisHealth() {
    try {
      const startTime = Date.now();
      
      // Test Redis connection
      const result = await this.redis.ping();
      const duration = Date.now() - startTime;
      
      if (result === 'PONG') {
        return {
          status: 'healthy',
          message: 'Redis connection successful',
          duration: `${duration}ms`
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Redis ping failed',
          duration: `${duration}ms`
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkMemoryHealth() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const externalMem = memUsage.external;
      const rssMem = memUsage.rss;
      
      const usagePercent = (usedMem / totalMem) * 100;
      
      let status = 'healthy';
      let message = 'Memory usage normal';
      
      if (usagePercent > 90) {
        status = 'critical';
        message = 'Memory usage critical';
      } else if (usagePercent > 80) {
        status = 'warning';
        message = 'Memory usage high';
      }
      
      return {
        status,
        message,
        usage: {
          total: totalMem,
          used: usedMem,
          external: externalMem,
          rss: rssMem,
          percent: usagePercent
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Memory check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkCPUHealth() {
    try {
      const startUsage = process.cpuUsage();
      
      // Wait a bit to get CPU usage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endUsage = process.cpuUsage(startUsage);
      const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
      
      let status = 'healthy';
      let message = 'CPU usage normal';
      
      if (cpuPercent > 80) {
        status = 'critical';
        message = 'CPU usage critical';
      } else if (cpuPercent > 60) {
        status = 'warning';
        message = 'CPU usage high';
      }
      
      return {
        status,
        message,
        usage: {
          user: endUsage.user,
          system: endUsage.system,
          total: endUsage.user + endUsage.system,
          percent: cpuPercent
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `CPU check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkDiskHealth() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check disk usage (simplified)
      const stats = fs.statSync(process.cwd());
      const freeSpace = stats.size; // This is a simplified check
      
      let status = 'healthy';
      let message = 'Disk usage normal';
      
      // This is a simplified check - in production, you'd use a proper disk usage library
      if (freeSpace < 1000000000) { // 1GB
        status = 'warning';
        message = 'Disk space low';
      }
      
      return {
        status,
        message,
        usage: {
          freeSpace: freeSpace
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Disk check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkNetworkHealth() {
    try {
      const https = require('https');
      
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const req = https.get('https://www.google.com', (res) => {
          const duration = Date.now() - startTime;
          
          resolve({
            status: 'healthy',
            message: 'Network connectivity successful',
            duration: `${duration}ms`,
            statusCode: res.statusCode
          });
        });
        
        req.on('error', (error) => {
          resolve({
            status: 'unhealthy',
            message: `Network connectivity failed: ${error.message}`,
            error: error.message
          });
        });
        
        req.setTimeout(10000, () => {
          req.destroy();
          resolve({
            status: 'unhealthy',
            message: 'Network connectivity timeout'
          });
        });
      });
    } catch (error) {
      return {
        status: 'error',
        message: `Network check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        },
        application: {
          activeConnections: 0, // This would be tracked by your application
          requestsPerSecond: 0, // This would be tracked by your application
          errorRate: 0, // This would be tracked by your application
          responseTime: 0 // This would be tracked by your application
        },
        database: {
          activeConnections: 0, // This would be tracked by your database pool
          queryCount: 0, // This would be tracked by your database
          slowQueries: 0 // This would be tracked by your database
        },
        redis: {
          connected: false, // This would be checked
          memoryUsage: 0, // This would be retrieved from Redis
          keyCount: 0 // This would be retrieved from Redis
        }
      };
      
      // Store metrics
      this.metrics.set(metrics.timestamp.toISOString(), metrics);
      
      // Store in Redis
      await this.redis.setex(
        `metrics:${metrics.timestamp.toISOString()}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(metrics)
      );
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  async checkForAlerts() {
    try {
      const alerts = [];
      
      // Check health check alerts
      for (const [id, healthCheck] of this.healthChecks.entries()) {
        if (healthCheck.status === 'unhealthy' || healthCheck.status === 'error') {
          const alert = await this.createAlert({
            type: 'health_check',
            severity: 'high',
            title: `Health Check Failed: ${healthCheck.name}`,
            description: `Health check ${healthCheck.name} is ${healthCheck.status}`,
            source: id,
            data: {
              healthCheck: healthCheck,
              lastError: healthCheck.lastError
            }
          });
          
          alerts.push(alert);
        }
      }
      
      // Check metric alerts
      const recentMetrics = Array.from(this.metrics.values()).slice(-10);
      if (recentMetrics.length > 0) {
        const latestMetric = recentMetrics[recentMetrics.length - 1];
        
        // Check memory usage
        if (latestMetric.system.memory.heapUsed / latestMetric.system.memory.heapTotal > 0.9) {
          const alert = await this.createAlert({
            type: 'memory',
            severity: 'critical',
            title: 'High Memory Usage',
            description: `Memory usage is ${((latestMetric.system.memory.heapUsed / latestMetric.system.memory.heapTotal) * 100).toFixed(2)}%`,
            source: 'memory_monitor',
            data: {
              metric: latestMetric.system.memory,
              threshold: 0.9
            }
          });
          
          alerts.push(alert);
        }
      }
      
      return alerts;
    } catch (error) {
      logger.error('Error checking for alerts:', error);
      return [];
    }
  }

  async checkForIncidents() {
    try {
      const incidents = [];
      
      // Check for critical alerts that might indicate incidents
      const criticalAlerts = Array.from(this.alerts.values()).filter(alert => 
        alert.severity === 'critical' && alert.status === 'active'
      );
      
      if (criticalAlerts.length >= 3) {
        const incident = await this.createIncident({
          title: 'Multiple Critical Alerts',
          description: `${criticalAlerts.length} critical alerts detected`,
          severity: 'high',
          category: 'system',
          affectedSystems: criticalAlerts.map(alert => alert.source),
          data: {
            alerts: criticalAlerts
          }
        });
        
        incidents.push(incident);
      }
      
      return incidents;
    } catch (error) {
      logger.error('Error checking for incidents:', error);
      return [];
    }
  }

  async createAlert(alertData) {
    try {
      const alertId = nanoid();
      const alert = {
        id: alertId,
        ...alertData,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO security_alerts (id, type, severity, title, description, source, data, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        alertId, alert.type, alert.severity, alert.title, alert.description,
        alert.source, JSON.stringify(alert.data), alert.status, alert.created_at, alert.updated_at
      ]);
      
      // Store in memory
      this.alerts.set(alertId, alert);
      
      // Store in Redis
      await this.redis.setex(
        `alert:${alertId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(alert)
      );
      
      // Emit event
      this.emit('alertCreated', alert);
      
      logger.info(`Alert created: ${alertId}`, {
        type: alert.type,
        severity: alert.severity,
        title: alert.title
      });
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async createIncident(incidentData) {
    try {
      const incidentId = nanoid();
      const incident = {
        id: incidentId,
        ...incidentData,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO security_incidents (id, title, description, severity, category, affected_systems, data, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        incidentId, incident.title, incident.description, incident.severity,
        incident.category, JSON.stringify(incident.affectedSystems), JSON.stringify(incident.data),
        incident.status, incident.created_at, incident.updated_at
      ]);
      
      // Store in memory
      this.incidents.set(incidentId, incident);
      
      // Store in Redis
      await this.redis.setex(
        `incident:${incidentId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(incident)
      );
      
      // Emit event
      this.emit('incidentCreated', incident);
      
      logger.info(`Incident created: ${incidentId}`, {
        title: incident.title,
        severity: incident.severity,
        category: incident.category
      });
      
      return incident;
    } catch (error) {
      logger.error('Error creating incident:', error);
      throw error;
    }
  }

  async getMetrics(timeRange, metricType) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      let query = `
        SELECT * FROM security_metrics
        WHERE timestamp >= $1
      `;
      const params = [timeCondition];
      let paramCount = 2;
      
      if (metricType) {
        query += ` AND metric_type = $${paramCount}`;
        params.push(metricType);
        paramCount++;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT 1000`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async getAlerts(severity, status, limit, userId) {
    try {
      let query = `
        SELECT * FROM security_alerts
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (severity) {
        query += ` AND severity = $${paramCount}`;
        params.push(severity);
        paramCount++;
      }
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getIncidents(severity, status, limit, userId) {
    try {
      let query = `
        SELECT * FROM security_incidents
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (severity) {
        query += ` AND severity = $${paramCount}`;
        params.push(severity);
        paramCount++;
      }
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting incidents:', error);
      throw error;
    }
  }

  async getHealthStatus() {
    try {
      const status = {
        overall: 'healthy',
        checks: {},
        timestamp: new Date()
      };
      
      let hasUnhealthy = false;
      let hasWarning = false;
      
      for (const [id, healthCheck] of this.healthChecks.entries()) {
        status.checks[id] = {
          name: healthCheck.name,
          status: healthCheck.status,
          lastCheck: healthCheck.lastCheck,
          lastError: healthCheck.lastError
        };
        
        if (healthCheck.status === 'unhealthy' || healthCheck.status === 'error') {
          hasUnhealthy = true;
        } else if (healthCheck.status === 'warning') {
          hasWarning = true;
        }
      }
      
      if (hasUnhealthy) {
        status.overall = 'unhealthy';
      } else if (hasWarning) {
        status.overall = 'warning';
      }
      
      return status;
    } catch (error) {
      logger.error('Error getting health status:', error);
      throw error;
    }
  }

  async getPerformanceData() {
    try {
      const data = {
        timestamp: new Date(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        application: {
          activeConnections: 0, // This would be tracked by your application
          requestsPerSecond: 0, // This would be tracked by your application
          errorRate: 0, // This would be tracked by your application
          responseTime: 0 // This would be tracked by your application
        }
      };
      
      return data;
    } catch (error) {
      logger.error('Error getting performance data:', error);
      throw error;
    }
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  async getMonitoringStats() {
    try {
      const stats = {
        totalAlerts: this.alerts.size,
        activeAlerts: Array.from(this.alerts.values()).filter(a => a.status === 'active').length,
        totalIncidents: this.incidents.size,
        openIncidents: Array.from(this.incidents.values()).filter(i => i.status === 'open').length,
        healthChecks: {},
        metrics: {
          total: this.metrics.size,
          latest: null
        }
      };
      
      // Health check stats
      for (const [id, healthCheck] of this.healthChecks.entries()) {
        stats.healthChecks[id] = {
          name: healthCheck.name,
          status: healthCheck.status,
          lastCheck: healthCheck.lastCheck
        };
      }
      
      // Latest metrics
      if (this.metrics.size > 0) {
        const latestMetric = Array.from(this.metrics.values()).pop();
        stats.metrics.latest = latestMetric.timestamp;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting monitoring stats:', error);
      throw error;
    }
  }
}

module.exports = SecurityMonitor;
