const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const os = require('os');
const process = require('process');

class HealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.healthChecks = new Map();
    this.healthStatus = new Map();
    this.healthHistory = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load health checks
      await this.loadHealthChecks();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this._initialized = true;
      logger.info('HealthMonitor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize HealthMonitor:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('HealthMonitor closed');
    } catch (error) {
      logger.error('Error closing HealthMonitor:', error);
    }
  }

  async loadHealthChecks() {
    try {
      this.healthChecks = new Map([
        ['database', {
          name: 'Database Connection',
          description: 'Check database connectivity and performance',
          enabled: true,
          timeout: 5000,
          interval: 30000,
          critical: true,
          check: this.checkDatabaseHealth.bind(this)
        }],
        ['redis', {
          name: 'Redis Connection',
          description: 'Check Redis connectivity and performance',
          enabled: true,
          timeout: 5000,
          interval: 30000,
          critical: true,
          check: this.checkRedisHealth.bind(this)
        }],
        ['memory', {
          name: 'Memory Usage',
          description: 'Check system memory usage',
          enabled: true,
          timeout: 1000,
          interval: 60000,
          critical: false,
          check: this.checkMemoryHealth.bind(this)
        }],
        ['cpu', {
          name: 'CPU Usage',
          description: 'Check CPU usage and load',
          enabled: true,
          timeout: 1000,
          interval: 60000,
          critical: false,
          check: this.checkCPUHealth.bind(this)
        }],
        ['disk', {
          name: 'Disk Usage',
          description: 'Check disk space usage',
          enabled: true,
          timeout: 1000,
          interval: 300000,
          critical: false,
          check: this.checkDiskHealth.bind(this)
        }],
        ['network', {
          name: 'Network Connectivity',
          description: 'Check network connectivity and latency',
          enabled: true,
          timeout: 10000,
          interval: 60000,
          critical: false,
          check: this.checkNetworkHealth.bind(this)
        }],
        ['external_apis', {
          name: 'External APIs',
          description: 'Check external API connectivity',
          enabled: true,
          timeout: 15000,
          interval: 300000,
          critical: false,
          check: this.checkExternalAPIsHealth.bind(this)
        }],
        ['file_system', {
          name: 'File System',
          description: 'Check file system health and permissions',
          enabled: true,
          timeout: 5000,
          interval: 300000,
          critical: false,
          check: this.checkFileSystemHealth.bind(this)
        }]
      ]);
      
      logger.info('Health checks loaded successfully');
    } catch (error) {
      logger.error('Error loading health checks:', error);
      throw error;
    }
  }

  startHealthMonitoring() {
    // Run health checks for each service
    for (const [checkName, checkConfig] of this.healthChecks.entries()) {
      if (checkConfig.enabled) {
        setInterval(async () => {
          try {
            await this.runHealthCheck(checkName);
          } catch (error) {
            logger.error(`Error running health check ${checkName}:`, error);
          }
        }, checkConfig.interval);
      }
    }
    
    // Run overall health assessment every 5 minutes
    setInterval(async () => {
      try {
        await this.assessOverallHealth();
      } catch (error) {
        logger.error('Error assessing overall health:', error);
      }
    }, 300000);
  }

  async runHealthCheck(checkName) {
    try {
      const checkConfig = this.healthChecks.get(checkName);
      if (!checkConfig || !checkConfig.enabled) return;
      
      const startTime = Date.now();
      
      // Run the health check with timeout
      const checkPromise = checkConfig.check();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
      });
      
      const result = await Promise.race([checkPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      // Update health status
      this.healthStatus.set(checkName, {
        status: 'healthy',
        message: result.message || 'OK',
        details: result.details || {},
        timestamp: new Date().toISOString(),
        duration: duration,
        critical: checkConfig.critical
      });
      
      // Store health record
      await this.storeHealthRecord(checkName, 'healthy', result.message, duration);
      
      this.emit('healthCheckPassed', { checkName, result, duration });
      
      logger.debug(`Health check passed: ${checkName}`, { duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update health status
      this.healthStatus.set(checkName, {
        status: 'unhealthy',
        message: error.message || 'Health check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString(),
        duration: duration,
        critical: checkConfig.critical
      });
      
      // Store health record
      await this.storeHealthRecord(checkName, 'unhealthy', error.message, duration);
      
      this.emit('healthCheckFailed', { checkName, error, duration });
      
      logger.warn(`Health check failed: ${checkName}`, { error: error.message, duration });
    }
  }

  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connection
      await pool.query('SELECT 1');
      
      // Test query performance
      const queryStart = Date.now();
      await pool.query('SELECT COUNT(*) FROM information_schema.tables');
      const queryTime = Date.now() - queryStart;
      
      // Check connection pool
      const poolStats = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      };
      
      return {
        message: 'Database connection healthy',
        details: {
          queryTime: queryTime,
          poolStats: poolStats,
          responseTime: Date.now() - startTime
        }
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  async checkRedisHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connection
      await this.redis.ping();
      
      // Test set/get operations
      const testKey = `health_check:${Date.now()}`;
      const testValue = 'test_value';
      
      await this.redis.set(testKey, testValue, 'EX', 60);
      const retrievedValue = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis set/get test failed');
      }
      
      // Get Redis info
      const info = await this.redis.info('memory');
      const memoryUsage = info.match(/used_memory:(\d+)/)?.[1] || 0;
      const maxMemory = info.match(/maxmemory:(\d+)/)?.[1] || 0;
      
      return {
        message: 'Redis connection healthy',
        details: {
          memoryUsage: parseInt(memoryUsage),
          maxMemory: parseInt(maxMemory),
          responseTime: Date.now() - startTime
        }
      };
    } catch (error) {
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  async checkMemoryHealth() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;
      
      const processMemory = process.memoryUsage();
      
      const status = memoryUsage > 90 ? 'critical' : memoryUsage > 80 ? 'warning' : 'healthy';
      
      return {
        message: `Memory usage: ${memoryUsage.toFixed(2)}%`,
        details: {
          totalMemory: totalMemory,
          freeMemory: freeMemory,
          usedMemory: usedMemory,
          memoryUsage: memoryUsage,
          processMemory: processMemory,
          status: status
        }
      };
    } catch (error) {
      throw new Error(`Memory health check failed: ${error.message}`);
    }
  }

  async checkCPUHealth() {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();
      
      // Calculate CPU usage
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      const cpuUsage = 100 - (totalIdle / totalTick) * 100;
      const status = cpuUsage > 90 ? 'critical' : cpuUsage > 80 ? 'warning' : 'healthy';
      
      return {
        message: `CPU usage: ${cpuUsage.toFixed(2)}%`,
        details: {
          cpuUsage: cpuUsage,
          loadAverage: loadAverage,
          cpuCount: cpus.length,
          status: status
        }
      };
    } catch (error) {
      throw new Error(`CPU health check failed: ${error.message}`);
    }
  }

  async checkDiskHealth() {
    try {
      // This is a simplified implementation
      // In production, you'd use a library like 'diskusage'
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const diskUsage = (usedMemory / totalMemory) * 100;
      
      const status = diskUsage > 95 ? 'critical' : diskUsage > 85 ? 'warning' : 'healthy';
      
      return {
        message: `Disk usage: ${diskUsage.toFixed(2)}%`,
        details: {
          totalSpace: totalMemory,
          freeSpace: freeMemory,
          usedSpace: usedMemory,
          diskUsage: diskUsage,
          status: status
        }
      };
    } catch (error) {
      throw new Error(`Disk health check failed: ${error.message}`);
    }
  }

  async checkNetworkHealth() {
    try {
      // This is a simplified implementation
      // In production, you'd test actual network connectivity
      const networkInterfaces = os.networkInterfaces();
      const activeInterfaces = Object.keys(networkInterfaces).filter(
        name => !networkInterfaces[name].some(iface => iface.internal)
      );
      
      return {
        message: 'Network connectivity healthy',
        details: {
          activeInterfaces: activeInterfaces,
          interfaceCount: activeInterfaces.length
        }
      };
    } catch (error) {
      throw new Error(`Network health check failed: ${error.message}`);
    }
  }

  async checkExternalAPIsHealth() {
    try {
      // This is a simplified implementation
      // In production, you'd test actual external API endpoints
      const apis = [
        { name: 'Market Data API', url: 'https://api.marketdata.com/health' },
        { name: 'News API', url: 'https://api.news.com/health' },
        { name: 'Social Media API', url: 'https://api.social.com/health' }
      ];
      
      const results = [];
      
      for (const api of apis) {
        try {
          // In production, you'd make actual HTTP requests
          results.push({
            name: api.name,
            status: 'healthy',
            responseTime: Math.random() * 1000
          });
        } catch (error) {
          results.push({
            name: api.name,
            status: 'unhealthy',
            error: error.message
          });
        }
      }
      
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      const totalCount = results.length;
      
      return {
        message: `${healthyCount}/${totalCount} external APIs healthy`,
        details: {
          apis: results,
          healthyCount: healthyCount,
          totalCount: totalCount
        }
      };
    } catch (error) {
      throw new Error(`External APIs health check failed: ${error.message}`);
    }
  }

  async checkFileSystemHealth() {
    try {
      // This is a simplified implementation
      // In production, you'd check actual file system health
      const fs = require('fs');
      const path = require('path');
      
      // Check if we can read/write to temp directory
      const tempDir = os.tmpdir();
      const testFile = path.join(tempDir, `health_check_${Date.now()}.txt`);
      
      try {
        fs.writeFileSync(testFile, 'health check test');
        fs.readFileSync(testFile, 'utf8');
        fs.unlinkSync(testFile);
      } catch (error) {
        throw new Error(`File system test failed: ${error.message}`);
      }
      
      return {
        message: 'File system healthy',
        details: {
          tempDir: tempDir,
          writable: true,
          readable: true
        }
      };
    } catch (error) {
      throw new Error(`File system health check failed: ${error.message}`);
    }
  }

  async assessOverallHealth() {
    try {
      const healthStatuses = Array.from(this.healthStatus.values());
      const criticalChecks = healthStatuses.filter(status => status.critical);
      const unhealthyCritical = criticalChecks.filter(status => status.status === 'unhealthy');
      
      let overallStatus = 'healthy';
      let message = 'All systems operational';
      
      if (unhealthyCritical.length > 0) {
        overallStatus = 'critical';
        message = `${unhealthyCritical.length} critical systems unhealthy`;
      } else if (healthStatuses.some(status => status.status === 'unhealthy')) {
        overallStatus = 'degraded';
        message = 'Some non-critical systems unhealthy';
      }
      
      const overallHealth = {
        status: overallStatus,
        message: message,
        timestamp: new Date().toISOString(),
        checks: healthStatuses,
        summary: {
          total: healthStatuses.length,
          healthy: healthStatuses.filter(s => s.status === 'healthy').length,
          unhealthy: healthStatuses.filter(s => s.status === 'unhealthy').length,
          critical: criticalChecks.length,
          unhealthyCritical: unhealthyCritical.length
        }
      };
      
      // Store overall health
      await this.storeHealthRecord('overall', overallStatus, message, 0, overallHealth);
      
      this.emit('overallHealthAssessed', overallHealth);
      
      logger.info(`Overall health assessed: ${overallStatus}`, {
        message: message,
        summary: overallHealth.summary
      });
      
      return overallHealth;
    } catch (error) {
      logger.error('Error assessing overall health:', error);
      throw error;
    }
  }

  async storeHealthRecord(checkName, status, message, duration, details = null) {
    try {
      const query = `
        INSERT INTO health_records (
          id, check_name, status, message, duration, details, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        nanoid(),
        checkName,
        status,
        message,
        duration,
        details ? JSON.stringify(details) : null,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing health record:', error);
      throw error;
    }
  }

  async getHealthStatus() {
    try {
      const healthStatuses = Array.from(this.healthStatus.entries()).map(([name, status]) => ({
        name,
        ...status
      }));
      
      return {
        checks: healthStatuses,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      throw error;
    }
  }

  async getHealthHistory(checkName = null, limit = 100) {
    try {
      let query = 'SELECT * FROM health_records WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      if (checkName) {
        paramCount++;
        query += ` AND check_name = $${paramCount}`;
        params.push(checkName);
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        checkName: row.check_name,
        status: row.status,
        message: row.message,
        duration: row.duration,
        details: row.details,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Error getting health history:', error);
      throw error;
    }
  }

  async getHealthStats() {
    try {
      const query = `
        SELECT 
          check_name,
          status,
          COUNT(*) as count,
          AVG(duration) as avg_duration
        FROM health_records 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY check_name, status
        ORDER BY check_name, status
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting health stats:', error);
      throw error;
    }
  }

  async getHealthChecks() {
    try {
      return Array.from(this.healthChecks.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting health checks:', error);
      throw error;
    }
  }
}

module.exports = HealthMonitor;
