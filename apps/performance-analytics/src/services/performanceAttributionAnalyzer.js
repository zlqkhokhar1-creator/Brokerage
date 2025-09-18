const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class PerformanceAttributionAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.attributionCache = new Map();
    this.analysisQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load attribution models
      await this.loadAttributionModels();
      
      this._initialized = true;
      logger.info('PerformanceAttributionAnalyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PerformanceAttributionAnalyzer:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('PerformanceAttributionAnalyzer closed');
    } catch (error) {
      logger.error('Error closing PerformanceAttributionAnalyzer:', error);
    }
  }

  async loadAttributionModels() {
    try {
      // Load Brinson-Fachler model
      this.attributionModels = {
        brinson: {
          name: 'Brinson-Fachler Model',
          description: 'Multi-factor attribution model',
          factors: ['allocation', 'selection', 'interaction']
        },
        carino: {
          name: 'Carino Model',
          description: 'Geometric attribution model',
          factors: ['allocation', 'selection', 'interaction']
        },
        menchero: {
          name: 'Menchero Model',
          description: 'Arithmetic attribution model',
          factors: ['allocation', 'selection', 'interaction']
        }
      };
      
      logger.info('Attribution models loaded successfully');
    } catch (error) {
      logger.error('Error loading attribution models:', error);
      throw error;
    }
  }

  async analyzeAttribution(portfolioId, timeRange, attributionType, userId) {
    try {
      const analysisId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting attribution analysis for portfolio ${portfolioId}`, {
        analysisId,
        portfolioId,
        timeRange,
        attributionType,
        userId
      });

      // Get portfolio data
      const portfolioData = await this.getPortfolioData(portfolioId, timeRange);
      const benchmarkData = await this.getBenchmarkData(portfolioId, timeRange);
      
      // Perform attribution analysis
      const attribution = await this.calculateAttribution(
        portfolioData, 
        benchmarkData, 
        attributionType
      );
      
      // Store results
      const analysis = {
        id: analysisId,
        portfolioId,
        timeRange,
        attributionType,
        userId,
        attribution,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeAttributionAnalysis(analysis);
      
      // Cache results
      await this.redis.setex(
        `attribution:${analysisId}`, 
        3600, 
        JSON.stringify(analysis)
      );
      
      this.emit('analysisCompleted', analysis);
      
      logger.info(`Attribution analysis completed for portfolio ${portfolioId}`, {
        analysisId,
        processingTime: analysis.processingTime
      });
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing attribution:', error);
      this.emit('analysisFailed', error, { portfolioId, timeRange, attributionType, userId });
      throw error;
    }
  }

  async calculateAttribution(portfolioData, benchmarkData, attributionType) {
    try {
      const model = this.attributionModels[attributionType];
      if (!model) {
        throw new Error(`Unknown attribution type: ${attributionType}`);
      }

      const attribution = {
        model: model.name,
        timeRange: portfolioData.timeRange,
        totalReturn: portfolioData.totalReturn,
        benchmarkReturn: benchmarkData.totalReturn,
        activeReturn: portfolioData.totalReturn - benchmarkData.totalReturn,
        factors: {}
      };

      // Calculate allocation effect
      attribution.factors.allocation = this.calculateAllocationEffect(
        portfolioData, 
        benchmarkData
      );

      // Calculate selection effect
      attribution.factors.selection = this.calculateSelectionEffect(
        portfolioData, 
        benchmarkData
      );

      // Calculate interaction effect
      attribution.factors.interaction = this.calculateInteractionEffect(
        portfolioData, 
        benchmarkData
      );

      // Calculate sector-level attribution
      attribution.sectors = this.calculateSectorAttribution(
        portfolioData, 
        benchmarkData
      );

      // Calculate security-level attribution
      attribution.securities = this.calculateSecurityAttribution(
        portfolioData, 
        benchmarkData
      );

      // Calculate risk attribution
      attribution.risk = this.calculateRiskAttribution(
        portfolioData, 
        benchmarkData
      );

      return attribution;
    } catch (error) {
      logger.error('Error calculating attribution:', error);
      throw error;
    }
  }

  calculateAllocationEffect(portfolioData, benchmarkData) {
    try {
      const allocationEffect = {};
      let totalAllocationEffect = 0;

      for (const sector in portfolioData.sectors) {
        const portfolioWeight = portfolioData.sectors[sector].weight;
        const benchmarkWeight = benchmarkData.sectors[sector]?.weight || 0;
        const benchmarkReturn = benchmarkData.sectors[sector]?.return || 0;
        
        const sectorAllocationEffect = (portfolioWeight - benchmarkWeight) * benchmarkReturn;
        allocationEffect[sector] = sectorAllocationEffect;
        totalAllocationEffect += sectorAllocationEffect;
      }

      return {
        total: totalAllocationEffect,
        bySector: allocationEffect
      };
    } catch (error) {
      logger.error('Error calculating allocation effect:', error);
      throw error;
    }
  }

  calculateSelectionEffect(portfolioData, benchmarkData) {
    try {
      const selectionEffect = {};
      let totalSelectionEffect = 0;

      for (const sector in portfolioData.sectors) {
        const portfolioWeight = portfolioData.sectors[sector].weight;
        const portfolioReturn = portfolioData.sectors[sector].return;
        const benchmarkReturn = benchmarkData.sectors[sector]?.return || 0;
        
        const sectorSelectionEffect = portfolioWeight * (portfolioReturn - benchmarkReturn);
        selectionEffect[sector] = sectorSelectionEffect;
        totalSelectionEffect += sectorSelectionEffect;
      }

      return {
        total: totalSelectionEffect,
        bySector: selectionEffect
      };
    } catch (error) {
      logger.error('Error calculating selection effect:', error);
      throw error;
    }
  }

  calculateInteractionEffect(portfolioData, benchmarkData) {
    try {
      const interactionEffect = {};
      let totalInteractionEffect = 0;

      for (const sector in portfolioData.sectors) {
        const portfolioWeight = portfolioData.sectors[sector].weight;
        const benchmarkWeight = benchmarkData.sectors[sector]?.weight || 0;
        const portfolioReturn = portfolioData.sectors[sector].return;
        const benchmarkReturn = benchmarkData.sectors[sector]?.return || 0;
        
        const sectorInteractionEffect = (portfolioWeight - benchmarkWeight) * (portfolioReturn - benchmarkReturn);
        interactionEffect[sector] = sectorInteractionEffect;
        totalInteractionEffect += sectorInteractionEffect;
      }

      return {
        total: totalInteractionEffect,
        bySector: interactionEffect
      };
    } catch (error) {
      logger.error('Error calculating interaction effect:', error);
      throw error;
    }
  }

  calculateSectorAttribution(portfolioData, benchmarkData) {
    try {
      const sectorAttribution = {};

      for (const sector in portfolioData.sectors) {
        const portfolioSector = portfolioData.sectors[sector];
        const benchmarkSector = benchmarkData.sectors[sector] || { weight: 0, return: 0 };
        
        sectorAttribution[sector] = {
          portfolioWeight: portfolioSector.weight,
          benchmarkWeight: benchmarkSector.weight,
          portfolioReturn: portfolioSector.return,
          benchmarkReturn: benchmarkSector.return,
          allocationEffect: (portfolioSector.weight - benchmarkSector.weight) * benchmarkSector.return,
          selectionEffect: portfolioSector.weight * (portfolioSector.return - benchmarkSector.return),
          interactionEffect: (portfolioSector.weight - benchmarkSector.weight) * (portfolioSector.return - benchmarkSector.return)
        };
      }

      return sectorAttribution;
    } catch (error) {
      logger.error('Error calculating sector attribution:', error);
      throw error;
    }
  }

  calculateSecurityAttribution(portfolioData, benchmarkData) {
    try {
      const securityAttribution = {};

      for (const security in portfolioData.securities) {
        const portfolioSecurity = portfolioData.securities[security];
        const benchmarkSecurity = benchmarkData.securities[security] || { weight: 0, return: 0 };
        
        securityAttribution[security] = {
          portfolioWeight: portfolioSecurity.weight,
          benchmarkWeight: benchmarkSecurity.weight,
          portfolioReturn: portfolioSecurity.return,
          benchmarkReturn: benchmarkSecurity.return,
          allocationEffect: (portfolioSecurity.weight - benchmarkSecurity.weight) * benchmarkSecurity.return,
          selectionEffect: portfolioSecurity.weight * (portfolioSecurity.return - benchmarkSecurity.return),
          interactionEffect: (portfolioSecurity.weight - benchmarkSecurity.weight) * (portfolioSecurity.return - benchmarkSecurity.return)
        };
      }

      return securityAttribution;
    } catch (error) {
      logger.error('Error calculating security attribution:', error);
      throw error;
    }
  }

  calculateRiskAttribution(portfolioData, benchmarkData) {
    try {
      const riskAttribution = {
        portfolioRisk: this.calculatePortfolioRisk(portfolioData),
        benchmarkRisk: this.calculatePortfolioRisk(benchmarkData),
        riskContribution: {}
      };

      // Calculate risk contribution by sector
      for (const sector in portfolioData.sectors) {
        const sectorRisk = this.calculateSectorRisk(portfolioData.sectors[sector]);
        riskAttribution.riskContribution[sector] = sectorRisk;
      }

      return riskAttribution;
    } catch (error) {
      logger.error('Error calculating risk attribution:', error);
      throw error;
    }
  }

  calculatePortfolioRisk(portfolioData) {
    try {
      // Calculate portfolio variance
      let portfolioVariance = 0;
      const weights = Object.values(portfolioData.sectors).map(s => s.weight);
      const returns = Object.values(portfolioData.sectors).map(s => s.return);
      
      // Simple variance calculation (in production, use proper covariance matrix)
      for (let i = 0; i < weights.length; i++) {
        portfolioVariance += Math.pow(weights[i] * returns[i], 2);
      }
      
      return Math.sqrt(portfolioVariance);
    } catch (error) {
      logger.error('Error calculating portfolio risk:', error);
      throw error;
    }
  }

  calculateSectorRisk(sectorData) {
    try {
      // Calculate sector risk contribution
      return Math.abs(sectorData.weight * sectorData.return);
    } catch (error) {
      logger.error('Error calculating sector risk:', error);
      throw error;
    }
  }

  async getAttribution(portfolioId, timeRange, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `attribution:${portfolioId}:${timeRange}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const query = `
        SELECT * FROM performance_attribution 
        WHERE portfolio_id = $1 AND time_range = $2 AND user_id = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [portfolioId, timeRange, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('No attribution data found');
      }

      const attribution = result.rows[0];
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(attribution));
      
      return attribution;
    } catch (error) {
      logger.error('Error getting attribution:', error);
      throw error;
    }
  }

  async getPortfolioData(portfolioId, timeRange) {
    try {
      // Mock implementation - in production, this would query the database
      return {
        portfolioId,
        timeRange,
        totalReturn: 0.15,
        sectors: {
          'Technology': { weight: 0.3, return: 0.20 },
          'Healthcare': { weight: 0.25, return: 0.12 },
          'Financial': { weight: 0.20, return: 0.08 },
          'Consumer': { weight: 0.15, return: 0.10 },
          'Industrial': { weight: 0.10, return: 0.05 }
        },
        securities: {
          'AAPL': { weight: 0.15, return: 0.25 },
          'MSFT': { weight: 0.10, return: 0.18 },
          'GOOGL': { weight: 0.05, return: 0.22 }
        }
      };
    } catch (error) {
      logger.error('Error getting portfolio data:', error);
      throw error;
    }
  }

  async getBenchmarkData(portfolioId, timeRange) {
    try {
      // Mock implementation - in production, this would query the database
      return {
        portfolioId,
        timeRange,
        totalReturn: 0.12,
        sectors: {
          'Technology': { weight: 0.25, return: 0.15 },
          'Healthcare': { weight: 0.20, return: 0.10 },
          'Financial': { weight: 0.20, return: 0.08 },
          'Consumer': { weight: 0.20, return: 0.09 },
          'Industrial': { weight: 0.15, return: 0.06 }
        },
        securities: {
          'AAPL': { weight: 0.10, return: 0.15 },
          'MSFT': { weight: 0.08, return: 0.12 },
          'GOOGL': { weight: 0.05, return: 0.18 }
        }
      };
    } catch (error) {
      logger.error('Error getting benchmark data:', error);
      throw error;
    }
  }

  async storeAttributionAnalysis(analysis) {
    try {
      const query = `
        INSERT INTO performance_attribution (
          id, portfolio_id, time_range, attribution_type, user_id, 
          attribution_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        analysis.id,
        analysis.portfolioId,
        analysis.timeRange,
        analysis.attributionType,
        analysis.userId,
        JSON.stringify(analysis.attribution),
        analysis.createdAt
      ]);
      
      logger.info(`Attribution analysis stored: ${analysis.id}`);
    } catch (error) {
      logger.error('Error storing attribution analysis:', error);
      throw error;
    }
  }

  async updateMetrics(portfolioId) {
    try {
      // Update performance metrics for a specific portfolio
      logger.info(`Updating metrics for portfolio ${portfolioId}`);
      
      // This would typically involve recalculating attribution metrics
      // and updating the database
      
    } catch (error) {
      logger.error(`Error updating metrics for portfolio ${portfolioId}:`, error);
      throw error;
    }
  }
}

module.exports = PerformanceAttributionAnalyzer;
