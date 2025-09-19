const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const RiskCalculator = require('./riskCalculator');

class PortfolioRiskEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.riskCalculator = null;
    this.portfolios = new Map();
    this.riskLimits = new Map();
    this.riskMetrics = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      this.riskCalculator = new RiskCalculator();
      await this.riskCalculator.initialize();
      
      await this.loadRiskLimits();
      logger.info('Portfolio Risk Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Portfolio Risk Engine:', error);
      throw error;
    }
  }

  async calculatePortfolioRisk(portfolioId, positions, marketData, userId) {
    try {
      const startTime = Date.now();
      
      // Calculate individual risk metrics
      const var95 = await this.riskCalculator.calculateVaR(positions, 0.95, 1, 'historical');
      const var99 = await this.riskCalculator.calculateVaR(positions, 0.99, 1, 'historical');
      const cvar95 = await this.riskCalculator.calculateCVaR(positions, 0.95, 1);
      const sharpeRatio = await this.riskCalculator.calculateSharpeRatio(positions);
      const maxDrawdown = await this.riskCalculator.calculateMaxDrawdown(positions);
      const beta = await this.riskCalculator.calculateBeta(positions);
      
      // Calculate portfolio-specific metrics
      const portfolioValue = this.calculatePortfolioValue(positions);
      const concentrationRisk = this.calculateConcentrationRisk(positions);
      const liquidityRisk = this.calculateLiquidityRisk(positions, marketData);
      const volatility = this.calculatePortfolioVolatility(positions, marketData);
      
      // Calculate risk score (0-100, higher is riskier)
      const riskScore = this.calculateRiskScore({
        var95: var95.var,
        var99: var99.var,
        cvar95: cvar95.cvar,
        maxDrawdown,
        concentrationRisk,
        liquidityRisk,
        volatility
      });
      
      const riskMetrics = {
        portfolioId,
        userId,
        timestamp: new Date().toISOString(),
        portfolioValue,
        riskScore,
        var95: var95.var,
        var99: var99.var,
        cvar95: cvar95.cvar,
        sharpeRatio,
        maxDrawdown,
        beta,
        concentrationRisk,
        liquidityRisk,
        volatility,
        details: {
          var95Details: var95.details,
          var99Details: var99.details,
          cvar95Details: cvar95.details,
          calculationTime: Date.now() - startTime
        }
      };
      
      // Store risk metrics
      this.riskMetrics.set(portfolioId, riskMetrics);
      await this.storeRiskMetrics(riskMetrics);
      
      // Check risk limits
      await this.checkRiskLimits(portfolioId, riskMetrics, userId);
      
      logger.performance('Portfolio risk calculation', Date.now() - startTime, {
        portfolioId,
        positionsCount: positions.length
      });
      
      return riskMetrics;
    } catch (error) {
      logger.error('Error calculating portfolio risk:', error);
      throw error;
    }
  }

  async getPortfolioRisk(portfolioId, userId) {
    try {
      // Check cache first
      const cached = this.riskMetrics.get(portfolioId);
      if (cached && cached.userId === userId) {
        return cached;
      }
      
      // Load from database
      const query = `
        SELECT * FROM portfolio_risk_metrics 
        WHERE portfolio_id = $1 AND user_id = $2 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [portfolioId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const riskMetrics = result.rows[0];
      this.riskMetrics.set(portfolioId, riskMetrics);
      
      return riskMetrics;
    } catch (error) {
      logger.error(`Error getting portfolio risk for ${portfolioId}:`, error);
      throw error;
    }
  }

  calculatePortfolioValue(positions) {
    try {
      return positions.reduce((total, position) => {
        return total + (position.quantity * position.price);
      }, 0);
    } catch (error) {
      logger.error('Error calculating portfolio value:', error);
      return 0;
    }
  }

  calculateConcentrationRisk(positions) {
    try {
      if (positions.length === 0) return 0;
      
      const totalValue = this.calculatePortfolioValue(positions);
      if (totalValue === 0) return 0;
      
      // Calculate Herfindahl-Hirschman Index (HHI)
      let hhi = 0;
      
      for (const position of positions) {
        const weight = (position.quantity * position.price) / totalValue;
        hhi += weight * weight;
      }
      
      // Convert HHI to concentration risk score (0-100)
      const maxHhi = 1; // Maximum HHI when all weight is in one position
      const concentrationRisk = (hhi / maxHhi) * 100;
      
      return concentrationRisk;
    } catch (error) {
      logger.error('Error calculating concentration risk:', error);
      return 0;
    }
  }

  calculateLiquidityRisk(positions, marketData) {
    try {
      if (positions.length === 0) return 0;
      
      let totalLiquidityRisk = 0;
      let totalValue = 0;
      
      for (const position of positions) {
        const positionValue = position.quantity * position.price;
        const symbol = position.symbol;
        
        // Get market data for this symbol
        const symbolData = marketData[symbol] || {};
        const volume = symbolData.volume || 0;
        const spread = symbolData.spread || 0;
        
        // Calculate liquidity risk for this position
        const volumeRisk = volume > 0 ? Math.min(100, (positionValue / volume) * 100) : 100;
        const spreadRisk = spread > 0 ? Math.min(100, spread * 100) : 50;
        
        const positionLiquidityRisk = (volumeRisk + spreadRisk) / 2;
        
        totalLiquidityRisk += positionLiquidityRisk * positionValue;
        totalValue += positionValue;
      }
      
      return totalValue > 0 ? totalLiquidityRisk / totalValue : 0;
    } catch (error) {
      logger.error('Error calculating liquidity risk:', error);
      return 0;
    }
  }

  calculatePortfolioVolatility(positions, marketData) {
    try {
      if (positions.length === 0) return 0;
      
      let totalVolatility = 0;
      let totalValue = 0;
      
      for (const position of positions) {
        const positionValue = position.quantity * position.price;
        const symbol = position.symbol;
        
        // Get volatility from market data
        const symbolData = marketData[symbol] || {};
        const volatility = symbolData.volatility || 0.02; // Default 2% if not available
        
        totalVolatility += volatility * positionValue;
        totalValue += positionValue;
      }
      
      return totalValue > 0 ? totalVolatility / totalValue : 0;
    } catch (error) {
      logger.error('Error calculating portfolio volatility:', error);
      return 0;
    }
  }

  calculateRiskScore(metrics) {
    try {
      const weights = {
        var95: 0.25,
        var99: 0.20,
        cvar95: 0.15,
        maxDrawdown: 0.20,
        concentrationRisk: 0.10,
        liquidityRisk: 0.05,
        volatility: 0.05
      };
      
      let riskScore = 0;
      
      // Normalize and weight each metric
      riskScore += this.normalizeRiskMetric(metrics.var95, 0, 0.1) * weights.var95;
      riskScore += this.normalizeRiskMetric(metrics.var99, 0, 0.15) * weights.var99;
      riskScore += this.normalizeRiskMetric(metrics.cvar95, 0, 0.2) * weights.cvar95;
      riskScore += this.normalizeRiskMetric(metrics.maxDrawdown, 0, 0.5) * weights.maxDrawdown;
      riskScore += this.normalizeRiskMetric(metrics.concentrationRisk, 0, 100) * weights.concentrationRisk;
      riskScore += this.normalizeRiskMetric(metrics.liquidityRisk, 0, 100) * weights.liquidityRisk;
      riskScore += this.normalizeRiskMetric(metrics.volatility, 0, 0.5) * weights.volatility;
      
      return Math.min(100, Math.max(0, riskScore * 100));
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 50; // Default medium risk
    }
  }

  normalizeRiskMetric(value, min, max) {
    if (max === min) return 0.5;
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }

  async checkRiskLimits(portfolioId, riskMetrics, userId) {
    try {
      const limits = this.riskLimits.get(portfolioId) || this.getDefaultRiskLimits();
      
      const violations = [];
      
      // Check VaR limits
      if (riskMetrics.var95 > limits.maxVar95) {
        violations.push({
          type: 'var95_exceeded',
          current: riskMetrics.var95,
          limit: limits.maxVar95,
          severity: 'high'
        });
      }
      
      if (riskMetrics.var99 > limits.maxVar99) {
        violations.push({
          type: 'var99_exceeded',
          current: riskMetrics.var99,
          limit: limits.maxVar99,
          severity: 'critical'
        });
      }
      
      // Check CVaR limits
      if (riskMetrics.cvar95 > limits.maxCVaR95) {
        violations.push({
          type: 'cvar95_exceeded',
          current: riskMetrics.cvar95,
          limit: limits.maxCVaR95,
          severity: 'high'
        });
      }
      
      // Check drawdown limits
      if (riskMetrics.maxDrawdown > limits.maxDrawdown) {
        violations.push({
          type: 'max_drawdown_exceeded',
          current: riskMetrics.maxDrawdown,
          limit: limits.maxDrawdown,
          severity: 'high'
        });
      }
      
      // Check concentration limits
      if (riskMetrics.concentrationRisk > limits.maxConcentration) {
        violations.push({
          type: 'concentration_exceeded',
          current: riskMetrics.concentrationRisk,
          limit: limits.maxConcentration,
          severity: 'medium'
        });
      }
      
      // Check liquidity limits
      if (riskMetrics.liquidityRisk > limits.maxLiquidityRisk) {
        violations.push({
          type: 'liquidity_risk_exceeded',
          current: riskMetrics.liquidityRisk,
          limit: limits.maxLiquidityRisk,
          severity: 'medium'
        });
      }
      
      // Check overall risk score
      if (riskMetrics.riskScore > limits.maxRiskScore) {
        violations.push({
          type: 'risk_score_exceeded',
          current: riskMetrics.riskScore,
          limit: limits.maxRiskScore,
          severity: 'high'
        });
      }
      
      if (violations.length > 0) {
        this.emit('riskLimitExceeded', portfolioId, {
          violations,
          riskMetrics,
          timestamp: new Date().toISOString()
        });
        
        // Store violations
        await this.storeRiskViolations(portfolioId, violations, userId);
      } else {
        this.emit('riskLimitRestored', portfolioId, {
          riskMetrics,
          timestamp: new Date().toISOString()
        });
      }
      
      return violations;
    } catch (error) {
      logger.error('Error checking risk limits:', error);
      return [];
    }
  }

  async getRiskLimits(portfolioId, userId) {
    try {
      const limits = this.riskLimits.get(portfolioId);
      if (limits) {
        return limits;
      }
      
      // Load from database
      const query = `
        SELECT * FROM portfolio_risk_limits 
        WHERE portfolio_id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [portfolioId, userId]);
      
      if (result.rows.length > 0) {
        const limits = result.rows[0];
        this.riskLimits.set(portfolioId, limits);
        return limits;
      }
      
      // Return default limits
      return this.getDefaultRiskLimits();
    } catch (error) {
      logger.error(`Error getting risk limits for ${portfolioId}:`, error);
      return this.getDefaultRiskLimits();
    }
  }

  async setRiskLimits(portfolioId, limits, userId) {
    try {
      const query = `
        INSERT INTO portfolio_risk_limits (
          portfolio_id, user_id, max_var95, max_var99, max_cvar95, 
          max_drawdown, max_concentration, max_liquidity_risk, 
          max_risk_score, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (portfolio_id, user_id) 
        DO UPDATE SET 
          max_var95 = $3,
          max_var99 = $4,
          max_cvar95 = $5,
          max_drawdown = $6,
          max_concentration = $7,
          max_liquidity_risk = $8,
          max_risk_score = $9,
          updated_at = $11
      `;
      
      const now = new Date();
      await this.db.query(query, [
        portfolioId,
        userId,
        limits.maxVar95,
        limits.maxVar99,
        limits.maxCVaR95,
        limits.maxDrawdown,
        limits.maxConcentration,
        limits.maxLiquidityRisk,
        limits.maxRiskScore,
        now,
        now
      ]);
      
      // Update cache
      this.riskLimits.set(portfolioId, limits);
      
      logger.info(`Risk limits updated for portfolio ${portfolioId}`, { userId, limits });
      
      return limits;
    } catch (error) {
      logger.error(`Error setting risk limits for ${portfolioId}:`, error);
      throw error;
    }
  }

  async loadRiskLimits() {
    try {
      const query = `
        SELECT * FROM portfolio_risk_limits
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        const limits = {
          maxVar95: row.max_var95,
          maxVar99: row.max_var99,
          maxCVaR95: row.max_cvar95,
          maxDrawdown: row.max_drawdown,
          maxConcentration: row.max_concentration,
          maxLiquidityRisk: row.max_liquidity_risk,
          maxRiskScore: row.max_risk_score
        };
        
        this.riskLimits.set(row.portfolio_id, limits);
      }
      
      logger.info(`Loaded ${result.rows.length} risk limit configurations`);
    } catch (error) {
      logger.error('Error loading risk limits:', error);
    }
  }

  async storeRiskMetrics(riskMetrics) {
    try {
      const query = `
        INSERT INTO portfolio_risk_metrics (
          portfolio_id, user_id, portfolio_value, risk_score, var95, var99, 
          cvar95, sharpe_ratio, max_drawdown, beta, concentration_risk, 
          liquidity_risk, volatility, details, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      await this.db.query(query, [
        riskMetrics.portfolioId,
        riskMetrics.userId,
        riskMetrics.portfolioValue,
        riskMetrics.riskScore,
        riskMetrics.var95,
        riskMetrics.var99,
        riskMetrics.cvar95,
        riskMetrics.sharpeRatio,
        riskMetrics.maxDrawdown,
        riskMetrics.beta,
        riskMetrics.concentrationRisk,
        riskMetrics.liquidityRisk,
        riskMetrics.volatility,
        JSON.stringify(riskMetrics.details),
        riskMetrics.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing risk metrics:', error);
    }
  }

  async storeRiskViolations(portfolioId, violations, userId) {
    try {
      for (const violation of violations) {
        const query = `
          INSERT INTO risk_violations (
            portfolio_id, user_id, violation_type, current_value, limit_value, 
            severity, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await this.db.query(query, [
          portfolioId,
          userId,
          violation.type,
          violation.current,
          violation.limit,
          violation.severity,
          new Date()
        ]);
      }
    } catch (error) {
      logger.error('Error storing risk violations:', error);
    }
  }

  getDefaultRiskLimits() {
    return {
      maxVar95: 0.05, // 5%
      maxVar99: 0.10, // 10%
      maxCVaR95: 0.08, // 8%
      maxDrawdown: 0.20, // 20%
      maxConcentration: 30, // 30%
      maxLiquidityRisk: 50, // 50%
      maxRiskScore: 70 // 70%
    };
  }

  async close() {
    try {
      if (this.riskCalculator) {
        await this.riskCalculator.close();
      }
      logger.info('Portfolio Risk Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Portfolio Risk Engine:', error);
    }
  }
}

module.exports = PortfolioRiskEngine;

