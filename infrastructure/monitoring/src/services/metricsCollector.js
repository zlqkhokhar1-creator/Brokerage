const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const register = require('prom-client').register;

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.collectionInterval = null;
    this.collectionIntervalMs = 60000; // 1 minute
  }

  async startCollection() {
    try {
      // Start periodic metrics collection
      this.collectionInterval = setInterval(async () => {
        await this.collectAllMetrics();
      }, this.collectionIntervalMs);
      
      logger.info('Metrics collection started');
    } catch (error) {
      logger.error('Error starting metrics collection:', error);
    }
  }

  async collectAllMetrics() {
    try {
      // Collect system metrics
      await this.collectSystemMetrics();
      
      // Collect service metrics
      await this.collectServiceMetrics();
      
      // Collect database metrics
      await this.collectDatabaseMetrics();
      
      // Collect Redis metrics
      await this.collectRedisMetrics();
      
      logger.debug('Metrics collection completed');
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  async collectSystemMetrics() {
    try {
      const os = require('os');
      
      const metrics = {
        timestamp: new Date(),
        type: 'system',
        data: {
          cpu: {
            loadAverage: os.loadavg(),
            cpus: os.cpus().length
          },
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
          },
          uptime: os.uptime()
        }
      };
      
      await this.storeMetrics(metrics);
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  async collectServiceMetrics() {
    try {
      const axios = require('axios');
      
      // Get list of services from database
      const query = `
        SELECT name, url, health_check_url FROM monitored_services 
        WHERE is_active = true
      `;
      
      const result = await database.query(query);
      
      for (const service of result.rows) {
        try {
          const startTime = Date.now();
          const response = await axios.get(service.health_check_url, { timeout: 5000 });
          const responseTime = Date.now() - startTime;
          
          const metrics = {
            timestamp: new Date(),
            type: 'service',
            service: service.name,
            data: {
              status: response.data.status,
              responseTime,
              uptime: response.data.uptime || 0,
              memory: response.data.memory || {},
              cpu: response.data.cpu || {}
            }
          };
          
          await this.storeMetrics(metrics);
        } catch (error) {
          const metrics = {
            timestamp: new Date(),
            type: 'service',
            service: service.name,
            data: {
              status: 'error',
              error: error.message,
              responseTime: null
            }
          };
          
          await this.storeMetrics(metrics);
        }
      }
    } catch (error) {
      logger.error('Error collecting service metrics:', error);
    }
  }

  async collectDatabaseMetrics() {
    try {
      const startTime = Date.now();
      
      // Get database connection info
      const connectionQuery = `
        SELECT 
          count(*) as active_connections,
          max(now() - state_change) as max_idle_time
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      
      const connectionResult = await database.query(connectionQuery);
      
      // Get database size
      const sizeQuery = `
        SELECT pg_database_size(current_database()) as database_size
      `;
      
      const sizeResult = await database.query(sizeQuery);
      
      const responseTime = Date.now() - startTime;
      
      const metrics = {
        timestamp: new Date(),
        type: 'database',
        data: {
          activeConnections: parseInt(connectionResult.rows[0].active_connections),
          maxIdleTime: connectionResult.rows[0].max_idle_time,
          databaseSize: parseInt(sizeResult.rows[0].database_size),
          responseTime
        }
      };
      
      await this.storeMetrics(metrics);
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
    }
  }

  async collectRedisMetrics() {
    try {
      const startTime = Date.now();
      
      // Get Redis info
      const info = await redis.client.info();
      const responseTime = Date.now() - startTime;
      
      const metrics = {
        timestamp: new Date(),
        type: 'redis',
        data: {
          connectedClients: this.parseRedisInfo(info, 'connected_clients'),
          usedMemory: this.parseRedisInfo(info, 'used_memory'),
          totalCommandsProcessed: this.parseRedisInfo(info, 'total_commands_processed'),
          keyspaceHits: this.parseRedisInfo(info, 'keyspace_hits'),
          keyspaceMisses: this.parseRedisInfo(info, 'keyspace_misses'),
          responseTime
        }
      };
      
      await this.storeMetrics(metrics);
    } catch (error) {
      logger.error('Error collecting Redis metrics:', error);
    }
  }

  parseRedisInfo(info, key) {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return parseInt(line.split(':')[1]) || 0;
      }
    }
    return 0;
  }

  async storeMetrics(metrics) {
    try {
      const query = `
        INSERT INTO metrics (
          timestamp, type, service, data
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await database.query(query, [
        metrics.timestamp,
        metrics.type,
        metrics.service || null,
        JSON.stringify(metrics.data)
      ]);
      
      // Store in Redis for quick access
      const key = `metrics:${metrics.type}:${metrics.service || 'system'}:${metrics.timestamp.getTime()}`;
      await redis.set(key, metrics, 3600);
    } catch (error) {
      logger.error('Error storing metrics:', error);
    }
  }

  async getAllMetrics() {
    try {
      const query = `
        SELECT * FROM metrics 
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
      `;
      
      const result = await database.query(query);
      
      const metrics = {};
      result.rows.forEach(row => {
        const type = row.type;
        if (!metrics[type]) {
          metrics[type] = [];
        }
        
        metrics[type].push({
          timestamp: row.timestamp,
          service: row.service,
          data: JSON.parse(row.data)
        });
      });
      
      return metrics;
    } catch (error) {
      logger.error('Error getting all metrics:', error);
      throw error;
    }
  }

  async getServiceMetrics(serviceName) {
    try {
      const query = `
        SELECT * FROM metrics 
        WHERE service = $1 
        AND timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
      `;
      
      const result = await database.query(query, [serviceName]);
      
      return result.rows.map(row => ({
        timestamp: row.timestamp,
        type: row.type,
        data: JSON.parse(row.data)
      }));
    } catch (error) {
      logger.error('Error getting service metrics:', error);
      throw error;
    }
  }

  async getPrometheusMetrics() {
    try {
      // Return Prometheus format metrics
      return register.metrics();
    } catch (error) {
      logger.error('Error getting Prometheus metrics:', error);
      throw error;
    }
  }

  async getMetricsSummary() {
    try {
      const query = `
        SELECT 
          type,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_age_seconds
        FROM metrics 
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY type
      `;
      
      const result = await database.query(query);
      
      return result.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
        avgAgeSeconds: parseFloat(row.avg_age_seconds)
      }));
    } catch (error) {
      logger.error('Error getting metrics summary:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.collectionInterval) {
        clearInterval(this.collectionInterval);
      }
      
      await database.close();
      await redis.close();
      
      logger.info('Metrics collector closed gracefully');
    } catch (error) {
      logger.error('Error closing metrics collector:', error);
    }
  }
}

module.exports = new MetricsCollector();
