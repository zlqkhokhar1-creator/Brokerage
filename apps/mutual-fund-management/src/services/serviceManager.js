const { logger } = require('../utils/logger');
const FundCatalogService = require('./fundCatalogService');
const FundTradingService = require('./fundTradingService');
const FundResearchService = require('./fundResearchService');
const FundScreeningService = require('./fundScreeningService');
const FundPerformanceService = require('./fundPerformanceService');
const FundHoldingsService = require('./fundHoldingsService');
const FundTaxService = require('./fundTaxService');
const FundRebalancingService = require('./fundRebalancingService');
const FundAnalyticsService = require('./fundAnalyticsService');
const FundComplianceService = require('./fundComplianceService');
const FundRiskManagementService = require('./fundRiskManagementService');
const FundMarketDataService = require('./fundMarketDataService');
const FundTaxOptimizationService = require('./fundTaxOptimizationService');
const FundPerformanceAnalyticsService = require('./fundPerformanceAnalyticsService');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Mutual Fund Management Services...');

      // Initialize all services
      const serviceClasses = [
        { name: 'catalog', class: FundCatalogService },
        { name: 'trading', class: FundTradingService },
        { name: 'research', class: FundResearchService },
        { name: 'screening', class: FundScreeningService },
        { name: 'performance', class: FundPerformanceService },
        { name: 'holdings', class: FundHoldingsService },
        { name: 'tax', class: FundTaxService },
        { name: 'rebalancing', class: FundRebalancingService },
        { name: 'analytics', class: FundAnalyticsService },
        { name: 'compliance', class: FundComplianceService },
        { name: 'riskManagement', class: FundRiskManagementService },
        { name: 'marketData', class: FundMarketDataService },
        { name: 'taxOptimization', class: FundTaxOptimizationService },
        { name: 'performanceAnalytics', class: FundPerformanceAnalyticsService }
      ];

      for (const { name, class: ServiceClass } of serviceClasses) {
        try {
          const service = new ServiceClass();
          await service.initialize();
          this.services.set(name, service);
          logger.info(`Initialized ${name} service`);
        } catch (error) {
          logger.error(`Failed to initialize ${name} service:`, error);
          throw error;
        }
      }

      this._initialized = true;
      logger.info('All Mutual Fund Management Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('Closing Mutual Fund Management Services...');

      for (const [name, service] of this.services) {
        try {
          await service.close();
          logger.info(`Closed ${name} service`);
        } catch (error) {
          logger.error(`Error closing ${name} service:`, error);
        }
      }

      this.services.clear();
      this._initialized = false;
      logger.info('All services closed');
    } catch (error) {
      logger.error('Error closing services:', error);
    }
  }

  getService(name) {
    if (!this._initialized) {
      throw new Error('ServiceManager not initialized');
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    return service;
  }

  getCatalogService() {
    return this.getService('catalog');
  }

  getTradingService() {
    return this.getService('trading');
  }

  getResearchService() {
    return this.getService('research');
  }

  getScreeningService() {
    return this.getService('screening');
  }

  getPerformanceService() {
    return this.getService('performance');
  }

  getHoldingsService() {
    return this.getService('holdings');
  }

  getTaxService() {
    return this.getService('tax');
  }

  getRebalancingService() {
    return this.getService('rebalancing');
  }

  getAnalyticsService() {
    return this.getService('analytics');
  }

  getComplianceService() {
    return this.getService('compliance');
  }

  getRiskManagementService() {
    return this.getService('riskManagement');
  }

  getMarketDataService() {
    return this.getService('marketData');
  }

  getTaxOptimizationService() {
    return this.getService('taxOptimization');
  }

  getPerformanceAnalyticsService() {
    return this.getService('performanceAnalytics');
  }

  async getHealthStatus() {
    try {
      const status = {
        initialized: this._initialized,
        services: {},
        overall_health: 'healthy'
      };

      for (const [name, service] of this.services) {
        try {
          // Check if service has health check method
          if (typeof service.healthCheck === 'function') {
            const health = await service.healthCheck();
            status.services[name] = health;
          } else {
            status.services[name] = { status: 'unknown' };
          }
        } catch (error) {
          status.services[name] = { status: 'unhealthy', error: error.message };
          status.overall_health = 'degraded';
        }
      }

      return status;
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        initialized: this._initialized,
        services: {},
        overall_health: 'unhealthy',
        error: error.message
      };
    }
  }

  async getServiceStats() {
    try {
      const stats = {
        total_services: this.services.size,
        initialized_services: 0,
        service_stats: {}
      };

      for (const [name, service] of this.services) {
        try {
          if (typeof service.getStats === 'function') {
            const serviceStats = await service.getStats();
            stats.service_stats[name] = serviceStats;
            stats.initialized_services++;
          }
        } catch (error) {
          logger.error(`Error getting stats for ${name} service:`, error);
          stats.service_stats[name] = { error: error.message };
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting service stats:', error);
      return {
        total_services: this.services.size,
        initialized_services: 0,
        service_stats: {},
        error: error.message
      };
    }
  }
}

module.exports = ServiceManager;
