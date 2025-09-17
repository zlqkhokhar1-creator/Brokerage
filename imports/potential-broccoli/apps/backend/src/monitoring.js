const { logger } = require('./utils/logger');

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Track request metrics
  trackRequest(req, res, next) {
    const startTime = Date.now();
    this.metrics.requests++;

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.metrics.responseTime.push(responseTime);
      
      // Keep only last 1000 response times
      if (this.metrics.responseTime.length > 1000) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
      }

      // Log slow requests
      if (responseTime > 5000) {
        logger.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
      }

      // Log errors
      if (res.statusCode >= 400) {
        this.metrics.errors++;
        logger.error(`HTTP ${res.statusCode}: ${req.method} ${req.path}`);
      }
    });

    next();
  }

  // Track WebSocket connections
  trackWebSocketConnection() {
    this.metrics.activeConnections++;
    logger.info(`WebSocket connection established. Active connections: ${this.metrics.activeConnections}`);
  }

  trackWebSocketDisconnection() {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    logger.info(`WebSocket connection closed. Active connections: ${this.metrics.activeConnections}`);
  }

  // Get current metrics
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      ...this.metrics,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeConnections: this.metrics.activeConnections,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Health check monitoring
class HealthChecker {
  constructor(db) {
    this.db = db;
    this.checks = {
      database: this.checkDatabase.bind(this),
      memory: this.checkMemory.bind(this),
      disk: this.checkDisk.bind(this)
    };
  }

  async checkDatabase() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', message: 'Database connection failed' };
    }
  }

  checkMemory() {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimit = 1024; // 1GB limit

    if (memoryUsageMB > memoryLimit) {
      return { 
        status: 'unhealthy', 
        message: `Memory usage high: ${memoryUsageMB.toFixed(2)}MB` 
      };
    }

    return { 
      status: 'healthy', 
      message: `Memory usage: ${memoryUsageMB.toFixed(2)}MB` 
    };
  }

  checkDisk() {
    // Simple disk space check (in production, use a proper disk monitoring library)
    return { 
      status: 'healthy', 
      message: 'Disk space check not implemented' 
    };
  }

  async runAllChecks() {
    const results = {};
    
    for (const [name, check] of Object.entries(this.checks)) {
      try {
        results[name] = await check();
      } catch (error) {
        logger.error(`Health check failed for ${name}:`, error);
        results[name] = { 
          status: 'unhealthy', 
          message: `Check failed: ${error.message}` 
        };
      }
    }

    const overallStatus = Object.values(results).every(check => check.status === 'healthy')
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

// Alert system
class AlertSystem {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      errorRate: 5, // 5% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 80, // 80% memory usage
      activeConnections: 1000 // 1000 concurrent connections
    };
  }

  checkAlerts(metrics) {
    const alerts = [];

    // Check error rate
    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time
    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High response time detected: ${metrics.averageResponseTime}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'high',
        message: `High memory usage detected: ${memoryUsagePercent.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Check active connections
    if (metrics.activeConnections > this.thresholds.activeConnections) {
      alerts.push({
        type: 'active_connections',
        severity: 'medium',
        message: `High number of active connections: ${metrics.activeConnections}`,
        timestamp: new Date().toISOString()
      });
    }

    // Store alerts
    this.alerts.push(...alerts);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alerts
    alerts.forEach(alert => {
      if (alert.severity === 'high') {
        logger.error(`ALERT: ${alert.message}`);
      } else {
        logger.warn(`ALERT: ${alert.message}`);
      }
    });

    return alerts;
  }

  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  clearAlerts() {
    this.alerts = [];
  }
}

// Create instances
const performanceMonitor = new PerformanceMonitor();
let healthChecker = null;
let alertSystem = new AlertSystem();

// Initialize health checker with database
const initializeHealthChecker = (db) => {
  healthChecker = new HealthChecker(db);
};

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
  performanceMonitor.trackRequest(req, res, next);
};

// Get monitoring data
const getMonitoringData = () => {
  const metrics = performanceMonitor.getMetrics();
  const alerts = alertSystem.getAlerts();
  
  return {
    metrics,
    alerts,
    timestamp: new Date().toISOString()
  };
};

// Run health checks
const runHealthChecks = async () => {
  if (!healthChecker) {
    return { status: 'unhealthy', message: 'Health checker not initialized' };
  }
  
  return await healthChecker.runAllChecks();
};

// Check alerts
const checkAlerts = () => {
  const metrics = performanceMonitor.getMetrics();
  return alertSystem.checkAlerts(metrics);
};

module.exports = {
  performanceMonitor,
  alertSystem,
  initializeHealthChecker,
  monitoringMiddleware,
  getMonitoringData,
  runHealthChecks,
  checkAlerts
};


