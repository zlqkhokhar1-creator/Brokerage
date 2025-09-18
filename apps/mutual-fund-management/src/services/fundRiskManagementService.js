const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundRiskManagementService extends EventEmitter {
  constructor() {
    super();
    this.riskModels = new Map();
    this.riskThresholds = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load risk models and thresholds
      await this.loadRiskModels();
      await this.loadRiskThresholds();
      
      this._initialized = true;
      logger.info('FundRiskManagementService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundRiskManagementService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundRiskManagementService closed');
    } catch (error) {
      logger.error('Error closing FundRiskManagementService:', error);
    }
  }

  async loadRiskModels() {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_models
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const model of result.rows) {
        this.riskModels.set(model.id, model);
      }

      logger.info(`Loaded ${result.rows.length} risk models`);
    } catch (error) {
      logger.error('Error loading risk models:', error);
      throw error;
    }
  }

  async loadRiskThresholds() {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_thresholds
        WHERE is_active = true
        ORDER BY risk_level ASC
      `);

      for (const threshold of result.rows) {
        this.riskThresholds.set(threshold.risk_level, threshold);
      }

      logger.info(`Loaded ${result.rows.length} risk thresholds`);
    } catch (error) {
      logger.error('Error loading risk thresholds:', error);
      throw error;
    }
  }

  async calculatePortfolioRisk(userId, portfolioData) {
    try {
      const riskMetrics = {};

      // Calculate VaR (Value at Risk)
      riskMetrics.var = await this.calculateVaR(portfolioData);

      // Calculate CVaR (Conditional Value at Risk)
      riskMetrics.cvar = await this.calculateCVaR(portfolioData);

      // Calculate Sharpe Ratio
      riskMetrics.sharpe_ratio = await this.calculateSharpeRatio(portfolioData);

      // Calculate Maximum Drawdown
      riskMetrics.max_drawdown = await this.calculateMaxDrawdown(portfolioData);

      // Calculate Beta
      riskMetrics.beta = await this.calculateBeta(portfolioData);

      // Calculate Alpha
      riskMetrics.alpha = await this.calculateAlpha(portfolioData);

      // Calculate R-squared
      riskMetrics.r_squared = await this.calculateRSquared(portfolioData);

      // Calculate Standard Deviation
      riskMetrics.standard_deviation = await this.calculateStandardDeviation(portfolioData);

      // Calculate Correlation Matrix
      riskMetrics.correlation_matrix = await this.calculateCorrelationMatrix(portfolioData);

      // Calculate Risk Score
      riskMetrics.risk_score = await this.calculateRiskScore(riskMetrics);

      // Store risk metrics
      await this.storeRiskMetrics(userId, riskMetrics);

      return riskMetrics;
    } catch (error) {
      logger.error('Error calculating portfolio risk:', error);
      throw error;
    }
  }

  async calculateVaR(portfolioData, confidenceLevel = 0.95) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0) return 0;

      // Sort returns in ascending order
      const sortedReturns = returns.sort((a, b) => a - b);

      // Calculate VaR using historical simulation
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index] || 0);

      return {
        value: varValue,
        confidence_level: confidenceLevel,
        method: 'historical_simulation',
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      return { value: 0, confidence_level: confidenceLevel, method: 'historical_simulation' };
    }
  }

  async calculateCVaR(portfolioData, confidenceLevel = 0.95) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0) return 0;

      // Sort returns in ascending order
      const sortedReturns = returns.sort((a, b) => a - b);

      // Calculate VaR threshold
      const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varThreshold = sortedReturns[varIndex] || 0;

      // Calculate CVaR as average of returns below VaR threshold
      const tailReturns = sortedReturns.filter(ret => ret <= varThreshold);
      const cvarValue = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length) : 0;

      return {
        value: cvarValue,
        confidence_level: confidenceLevel,
        method: 'historical_simulation',
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      return { value: 0, confidence_level: confidenceLevel, method: 'historical_simulation' };
    }
  }

  async calculateSharpeRatio(portfolioData, riskFreeRate = 0.02) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0) return 0;

      // Calculate average return
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

      // Calculate standard deviation
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      // Calculate Sharpe ratio
      const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

      return {
        value: sharpeRatio,
        risk_free_rate: riskFreeRate,
        average_return: avgReturn,
        standard_deviation: stdDev,
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      return { value: 0, risk_free_rate: riskFreeRate, average_return: 0, standard_deviation: 0 };
    }
  }

  async calculateMaxDrawdown(portfolioData) {
    try {
      const values = portfolioData.values || [];
      if (values.length === 0) return 0;

      let maxDrawdown = 0;
      let peak = values[0];

      for (let i = 1; i < values.length; i++) {
        if (values[i] > peak) {
          peak = values[i];
        } else {
          const drawdown = (peak - values[i]) / peak;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      }

      return {
        value: maxDrawdown,
        peak_value: peak,
        method: 'peak_to_trough',
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return { value: 0, peak_value: 0, method: 'peak_to_trough' };
    }
  }

  async calculateBeta(portfolioData, benchmarkReturns = []) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0 || benchmarkReturns.length === 0) return 1;

      // Calculate covariance and variance
      const avgPortfolioReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const avgBenchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

      let covariance = 0;
      let benchmarkVariance = 0;

      for (let i = 0; i < Math.min(returns.length, benchmarkReturns.length); i++) {
        const portfolioDiff = returns[i] - avgPortfolioReturn;
        const benchmarkDiff = benchmarkReturns[i] - avgBenchmarkReturn;
        
        covariance += portfolioDiff * benchmarkDiff;
        benchmarkVariance += benchmarkDiff * benchmarkDiff;
      }

      const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;

      return {
        value: beta,
        benchmark: 'market_index',
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating beta:', error);
      return { value: 1, benchmark: 'market_index' };
    }
  }

  async calculateAlpha(portfolioData, benchmarkReturns = [], riskFreeRate = 0.02) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0 || benchmarkReturns.length === 0) return 0;

      const avgPortfolioReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const avgBenchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

      // Calculate beta first
      const betaResult = await this.calculateBeta(portfolioData, benchmarkReturns);
      const beta = betaResult.value;

      // Calculate alpha
      const alpha = avgPortfolioReturn - (riskFreeRate + beta * (avgBenchmarkReturn - riskFreeRate));

      return {
        value: alpha,
        risk_free_rate: riskFreeRate,
        beta: beta,
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating alpha:', error);
      return { value: 0, risk_free_rate: riskFreeRate, beta: 1 };
    }
  }

  async calculateRSquared(portfolioData, benchmarkReturns = []) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0 || benchmarkReturns.length === 0) return 0;

      const avgPortfolioReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const avgBenchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

      let ssRes = 0; // Sum of squares of residuals
      let ssTot = 0; // Total sum of squares

      for (let i = 0; i < Math.min(returns.length, benchmarkReturns.length); i++) {
        const portfolioDiff = returns[i] - avgPortfolioReturn;
        const benchmarkDiff = benchmarkReturns[i] - avgBenchmarkReturn;
        
        ssRes += Math.pow(portfolioDiff - benchmarkDiff, 2);
        ssTot += Math.pow(portfolioDiff, 2);
      }

      const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

      return {
        value: rSquared,
        benchmark: 'market_index',
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating R-squared:', error);
      return { value: 0, benchmark: 'market_index' };
    }
  }

  async calculateStandardDeviation(portfolioData) {
    try {
      const returns = portfolioData.returns || [];
      if (returns.length === 0) return 0;

      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      return {
        value: stdDev,
        variance: variance,
        average_return: avgReturn,
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating standard deviation:', error);
      return { value: 0, variance: 0, average_return: 0 };
    }
  }

  async calculateCorrelationMatrix(portfolioData) {
    try {
      const holdings = portfolioData.holdings || [];
      if (holdings.length === 0) return {};

      const correlationMatrix = {};

      for (let i = 0; i < holdings.length; i++) {
        for (let j = 0; j < holdings.length; j++) {
          const key = `${holdings[i].symbol}_${holdings[j].symbol}`;
          const correlation = await this.calculateCorrelation(holdings[i], holdings[j]);
          correlationMatrix[key] = correlation;
        }
      }

      return correlationMatrix;
    } catch (error) {
      logger.error('Error calculating correlation matrix:', error);
      return {};
    }
  }

  async calculateCorrelation(holding1, holding2) {
    try {
      const returns1 = holding1.returns || [];
      const returns2 = holding2.returns || [];

      if (returns1.length === 0 || returns2.length === 0) return 0;

      const minLength = Math.min(returns1.length, returns2.length);
      const avg1 = returns1.slice(0, minLength).reduce((sum, ret) => sum + ret, 0) / minLength;
      const avg2 = returns2.slice(0, minLength).reduce((sum, ret) => sum + ret, 0) / minLength;

      let numerator = 0;
      let sumSq1 = 0;
      let sumSq2 = 0;

      for (let i = 0; i < minLength; i++) {
        const diff1 = returns1[i] - avg1;
        const diff2 = returns2[i] - avg2;
        
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
      }

      const denominator = Math.sqrt(sumSq1 * sumSq2);
      const correlation = denominator > 0 ? numerator / denominator : 0;

      return correlation;
    } catch (error) {
      logger.error('Error calculating correlation:', error);
      return 0;
    }
  }

  async calculateRiskScore(riskMetrics) {
    try {
      let riskScore = 0;

      // VaR contribution (0-30 points)
      const varValue = riskMetrics.var?.value || 0;
      riskScore += Math.min(30, varValue * 100);

      // CVaR contribution (0-25 points)
      const cvarValue = riskMetrics.cvar?.value || 0;
      riskScore += Math.min(25, cvarValue * 100);

      // Sharpe ratio contribution (0-20 points)
      const sharpeRatio = riskMetrics.sharpe_ratio?.value || 0;
      riskScore += Math.max(0, 20 - Math.abs(sharpeRatio) * 10);

      // Max drawdown contribution (0-15 points)
      const maxDrawdown = riskMetrics.max_drawdown?.value || 0;
      riskScore += Math.min(15, maxDrawdown * 100);

      // Beta contribution (0-10 points)
      const beta = riskMetrics.beta?.value || 1;
      riskScore += Math.min(10, Math.abs(beta - 1) * 5);

      // Normalize to 0-100 scale
      const normalizedScore = Math.min(100, Math.max(0, riskScore));

      return {
        value: normalizedScore,
        risk_level: this.getRiskLevel(normalizedScore),
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return { value: 50, risk_level: 'medium', calculated_at: new Date() };
    }
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 80) return 'very_high';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'very_low';
  }

  async storeRiskMetrics(userId, riskMetrics) {
    try {
      await pool.query(`
        INSERT INTO risk_metrics (
          user_id, var_value, cvar_value, sharpe_ratio, max_drawdown,
          beta, alpha, r_squared, standard_deviation, risk_score,
          correlation_matrix, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id, calculated_at::date) 
        DO UPDATE SET
          var_value = EXCLUDED.var_value,
          cvar_value = EXCLUDED.cvar_value,
          sharpe_ratio = EXCLUDED.sharpe_ratio,
          max_drawdown = EXCLUDED.max_drawdown,
          beta = EXCLUDED.beta,
          alpha = EXCLUDED.alpha,
          r_squared = EXCLUDED.r_squared,
          standard_deviation = EXCLUDED.standard_deviation,
          risk_score = EXCLUDED.risk_score,
          correlation_matrix = EXCLUDED.correlation_matrix
      `, [
        userId,
        riskMetrics.var?.value || 0,
        riskMetrics.cvar?.value || 0,
        riskMetrics.sharpe_ratio?.value || 0,
        riskMetrics.max_drawdown?.value || 0,
        riskMetrics.beta?.value || 1,
        riskMetrics.alpha?.value || 0,
        riskMetrics.r_squared?.value || 0,
        riskMetrics.standard_deviation?.value || 0,
        riskMetrics.risk_score?.value || 50,
        JSON.stringify(riskMetrics.correlation_matrix || {}),
        new Date()
      ]);

      logger.info(`Stored risk metrics for user ${userId}`);
    } catch (error) {
      logger.error('Error storing risk metrics:', error);
      throw error;
    }
  }

  async getRiskMetrics(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date = new Date(),
        limit = 100
      } = options;

      const result = await pool.query(`
        SELECT *
        FROM risk_metrics
        WHERE user_id = $1
          AND calculated_at >= $2
          AND calculated_at <= $3
        ORDER BY calculated_at DESC
        LIMIT $4
      `, [userId, start_date, end_date, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting risk metrics:', error);
      return [];
    }
  }

  async getRiskReport(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date = new Date()
      } = options;

      // Get latest risk metrics
      const latestMetrics = await this.getRiskMetrics(userId, { 
        start_date, 
        end_date, 
        limit: 1 
      });

      if (latestMetrics.length === 0) {
        return {
          user_id: userId,
          message: 'No risk metrics available for the specified period',
          generated_at: new Date()
        };
      }

      const metrics = latestMetrics[0];

      // Get risk trends
      const trends = await this.getRiskTrends(userId, start_date, end_date);

      // Get risk alerts
      const alerts = await this.getRiskAlerts(userId);

      return {
        user_id: userId,
        start_date,
        end_date,
        current_metrics: metrics,
        trends: trends,
        alerts: alerts,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error getting risk report:', error);
      throw error;
    }
  }

  async getRiskTrends(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          calculated_at,
          var_value,
          cvar_value,
          sharpe_ratio,
          max_drawdown,
          beta,
          risk_score
        FROM risk_metrics
        WHERE user_id = $1
          AND calculated_at >= $2
          AND calculated_at <= $3
        ORDER BY calculated_at ASC
      `, [userId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting risk trends:', error);
      return [];
    }
  }

  async getRiskAlerts(userId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM risk_alerts
        WHERE user_id = $1
          AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting risk alerts:', error);
      return [];
    }
  }

  async createRiskAlert(userId, alertData) {
    try {
      const {
        alert_type,
        threshold_value,
        current_value,
        message,
        severity = 'medium'
      } = alertData;

      const result = await pool.query(`
        INSERT INTO risk_alerts (
          user_id, alert_type, threshold_value, current_value,
          message, severity, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING *
      `, [userId, alert_type, threshold_value, current_value, message, severity, new Date()]);

      logger.info(`Created risk alert for user ${userId}: ${alert_type}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating risk alert:', error);
      throw error;
    }
  }

  async updateRiskAlert(alertId, updates) {
    try {
      const { query: updateQuery, params } = this._buildUpdateQuery('risk_alerts', alertId, updates);
      const result = await pool.query(updateQuery, params);

      if (result.rows.length === 0) {
        throw new Error('Risk alert not found');
      }

      logger.info(`Updated risk alert ${alertId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating risk alert:', error);
      throw error;
    }
  }

  async deleteRiskAlert(alertId) {
    try {
      const result = await pool.query(`
        UPDATE risk_alerts 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date(), alertId]);

      if (result.rowCount === 0) {
        throw new Error('Risk alert not found');
      }

      logger.info(`Deleted risk alert ${alertId}`);
      return { message: 'Risk alert deleted successfully' };
    } catch (error) {
      logger.error('Error deleting risk alert:', error);
      throw error;
    }
  }

  async getRiskStats() {
    try {
      const stats = {
        total_users: 0,
        high_risk_users: 0,
        average_risk_score: 0,
        total_alerts: 0,
        active_alerts: 0
      };

      // Get user count
      const userResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as total_users
        FROM risk_metrics
        WHERE calculated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (userResult.rows.length > 0) {
        stats.total_users = parseInt(userResult.rows[0].total_users);
      }

      // Get high risk users
      const highRiskResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as high_risk_users
        FROM risk_metrics
        WHERE risk_score >= 70
          AND calculated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (highRiskResult.rows.length > 0) {
        stats.high_risk_users = parseInt(highRiskResult.rows[0].high_risk_users);
      }

      // Get average risk score
      const avgRiskResult = await pool.query(`
        SELECT AVG(risk_score) as average_risk_score
        FROM risk_metrics
        WHERE calculated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (avgRiskResult.rows.length > 0) {
        stats.average_risk_score = parseFloat(avgRiskResult.rows[0].average_risk_score) || 0;
      }

      // Get alert counts
      const alertResult = await pool.query(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_alerts
        FROM risk_alerts
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (alertResult.rows.length > 0) {
        stats.total_alerts = parseInt(alertResult.rows[0].total_alerts);
        stats.active_alerts = parseInt(alertResult.rows[0].active_alerts);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting risk stats:', error);
      return {
        total_users: 0,
        high_risk_users: 0,
        average_risk_score: 0,
        total_alerts: 0,
        active_alerts: 0
      };
    }
  }

  _buildUpdateQuery(table, id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    return {
      query: `UPDATE ${table} SET ${setClause}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
      params: [id, ...values, new Date()]
    };
  }
}

module.exports = FundRiskManagementService;
