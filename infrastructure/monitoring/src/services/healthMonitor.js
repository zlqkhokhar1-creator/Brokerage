const axios = require('axios');
const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const alertManager = require('./alertManager');

class HealthMonitor {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.monitoringInterval = null;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  async startMonitoring() {
    try {
      // Load services from database
      await this.loadServices();
      
      // Start periodic health checks
      this.monitoringInterval = setInterval(async () => {
        await this.performHealthChecks();
      }, this.healthCheckInterval);
      
      logger.info('Health monitoring started');
    } catch (error) {
      logger.error('Error starting health monitoring:', error);
    }
  }

  async loadServices() {
    try {
      const query = `
        SELECT * FROM monitored_services 
        WHERE is_active = true
      `;
      
      const result = await database.query(query);
      
      this.services.clear();
      result.rows.forEach(row => {
        this.services.set(row.name, {
          id: row.id,
          name: row.name,
          url: row.url,
          healthCheckUrl: row.health_check_url,
          type: row.type,
          critical: row.critical,
          timeout: row.timeout || 5000,
          retryCount: row.retry_count || 3,
          lastCheck: null,
          status: 'unknown',
          responseTime: null,
          error: null
        });
      });
      
      logger.info(`Loaded ${this.services.size} services for monitoring`);
    } catch (error) {
      logger.error('Error loading services:', error);
    }
  }

  async performHealthChecks() {
    try {
      const promises = Array.from(this.services.values()).map(service => 
        this.checkServiceHealth(service)
      );
      
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error performing health checks:', error);
    }
  }

  async checkServiceHealth(service) {
    try {
      const startTime = Date.now();
      
      const response = await axios.get(service.healthCheckUrl, {
        timeout: service.timeout,
        headers: {
          'User-Agent': 'Brokerage-Monitoring/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200 && response.data.status === 'healthy';
      
      // Update service status
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.responseTime = responseTime;
      service.lastCheck = new Date();
      service.error = null;
      
      // Store health check result
      await this.storeHealthCheckResult(service, isHealthy, responseTime);
      
      // Check if status changed
      if (service.previousStatus && service.previousStatus !== service.status) {
        await this.handleStatusChange(service);
      }
      
      service.previousStatus = service.status;
      
      logger.debug(`Health check completed for ${service.name}: ${service.status} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - Date.now();
      
      // Update service status
      service.status = 'unhealthy';
      service.responseTime = responseTime;
      service.lastCheck = new Date();
      service.error = error.message;
      
      // Store health check result
      await this.storeHealthCheckResult(service, false, responseTime, error.message);
      
      // Check if status changed
      if (service.previousStatus && service.previousStatus !== service.status) {
        await this.handleStatusChange(service);
      }
      
      service.previousStatus = service.status;
      
      logger.warn(`Health check failed for ${service.name}: ${error.message}`);
    }
  }

  async handleStatusChange(service) {
    try {
      const alert = {
        id: `health-${service.name}-${Date.now()}`,
        type: 'health_check',
        severity: service.critical ? 'critical' : 'warning',
        service: service.name,
        title: `Service ${service.status}`,
        message: `Service ${service.name} is now ${service.status}`,
        details: {
          previousStatus: service.previousStatus,
          currentStatus: service.status,
          responseTime: service.responseTime,
          error: service.error
        },
        timestamp: new Date(),
        acknowledged: false,
        resolved: false
      };
      
      await alertManager.createAlert(alert);
      
      logger.info(`Status change alert created for ${service.name}: ${service.previousStatus} -> ${service.status}`);
    } catch (error) {
      logger.error('Error handling status change:', error);
    }
  }

  async storeHealthCheckResult(service, isHealthy, responseTime, error = null) {
    try {
      const query = `
        INSERT INTO health_check_results (
          service_id, is_healthy, response_time, error_message, checked_at
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await database.query(query, [
        service.id,
        isHealthy,
        responseTime,
        error,
        new Date()
      ]);
    } catch (error) {
      logger.error('Error storing health check result:', error);
    }
  }

  async getAllServicesHealth() {
    try {
      const services = Array.from(this.services.values()).map(service => ({
        name: service.name,
        type: service.type,
        status: service.status,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck,
        error: service.error,
        critical: service.critical
      }));
      
      return {
        services,
        summary: {
          total: services.length,
          healthy: services.filter(s => s.status === 'healthy').length,
          unhealthy: services.filter(s => s.status === 'unhealthy').length,
          critical: services.filter(s => s.critical && s.status === 'unhealthy').length
        }
      };
    } catch (error) {
      logger.error('Error getting all services health:', error);
      throw error;
    }
  }

  async getServiceHealth(serviceName) {
    try {
      const service = this.services.get(serviceName);
      if (!service) {
        throw new Error('Service not found');
      }
      
      return {
        name: service.name,
        type: service.type,
        status: service.status,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck,
        error: service.error,
        critical: service.critical
      };
    } catch (error) {
      logger.error('Error getting service health:', error);
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      const services = Array.from(this.services.values());
      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const totalServices = services.length;
      const criticalUnhealthy = services.filter(s => s.critical && s.status === 'unhealthy').length;
      
      const overallStatus = criticalUnhealthy > 0 ? 'critical' : 
                           healthyServices === totalServices ? 'healthy' : 'degraded';
      
      return {
        status: overallStatus,
        services: {
          total: totalServices,
          healthy: healthyServices,
          unhealthy: totalServices - healthyServices,
          critical: criticalUnhealthy
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  async getDashboardOverview() {
    try {
      const systemHealth = await this.getSystemHealth();
      const recentAlerts = await alertManager.getRecentAlerts(10);
      const metrics = await this.getSystemMetrics();
      
      return {
        systemHealth,
        recentAlerts,
        metrics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  async getServicesStatus() {
    try {
      const services = Array.from(this.services.values()).map(service => ({
        name: service.name,
        type: service.type,
        status: service.status,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck,
        critical: service.critical
      }));
      
      return services;
    } catch (error) {
      logger.error('Error getting services status:', error);
      throw error;
    }
  }

  async getSystemMetrics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN is_healthy = true THEN 1 END) as healthy_checks,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time
        FROM health_check_results 
        WHERE checked_at > NOW() - INTERVAL '1 hour'
      `;
      
      const result = await database.query(query);
      const row = result.rows[0];
      
      return {
        totalChecks: parseInt(row.total_checks),
        healthyChecks: parseInt(row.healthy_checks),
        avgResponseTime: parseFloat(row.avg_response_time) || 0,
        maxResponseTime: parseFloat(row.max_response_time) || 0,
        uptime: row.healthy_checks / row.total_checks * 100
      };
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      return {
        totalChecks: 0,
        healthyChecks: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        uptime: 0
      };
    }
  }

  async addService(serviceData) {
    try {
      const query = `
        INSERT INTO monitored_services (
          name, url, health_check_url, type, critical, timeout, retry_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const result = await database.query(query, [
        serviceData.name,
        serviceData.url,
        serviceData.healthCheckUrl,
        serviceData.type,
        serviceData.critical,
        serviceData.timeout,
        serviceData.retryCount
      ]);
      
      const serviceId = result.rows[0].id;
      
      // Add to in-memory services
      this.services.set(serviceData.name, {
        id: serviceId,
        name: serviceData.name,
        url: serviceData.url,
        healthCheckUrl: serviceData.healthCheckUrl,
        type: serviceData.type,
        critical: serviceData.critical,
        timeout: serviceData.timeout,
        retryCount: serviceData.retryCount,
        lastCheck: null,
        status: 'unknown',
        responseTime: null,
        error: null
      });
      
      logger.info(`Service added to monitoring: ${serviceData.name}`);
      
      return {
        success: true,
        serviceId,
        message: 'Service added to monitoring successfully'
      };
    } catch (error) {
      logger.error('Error adding service:', error);
      throw error;
    }
  }

  async removeService(serviceName) {
    try {
      const query = `
        UPDATE monitored_services 
        SET is_active = false 
        WHERE name = $1
      `;
      
      await database.query(query, [serviceName]);
      
      // Remove from in-memory services
      this.services.delete(serviceName);
      
      logger.info(`Service removed from monitoring: ${serviceName}`);
      
      return {
        success: true,
        message: 'Service removed from monitoring successfully'
      };
    } catch (error) {
      logger.error('Error removing service:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      await database.close();
      await redis.close();
      
      logger.info('Health monitor closed gracefully');
    } catch (error) {
      logger.error('Error closing health monitor:', error);
    }
  }
}

module.exports = new HealthMonitor();
