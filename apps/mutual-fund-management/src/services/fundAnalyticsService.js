const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this._initialized = false;
  }

  async initialize() {
    try {
      await redisService.healthCheck();
      this._initialized = true;
      logger.info('FundAnalyticsService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundAnalyticsService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundAnalyticsService closed');
    } catch (error) {
      logger.error('Error closing FundAnalyticsService:', error);
    }
  }

  async generateAnalyticsReport(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end_date = new Date(),
        include_performance = true,
        include_risk = true,
        include_tax = true,
        include_rebalancing = true
      } = options;

      const report = {
        user_id: userId,
        period: { start_date, end_date },
        generated_at: new Date(),
        sections: {}
      };

      // Performance Analytics
      if (include_performance) {
        report.sections.performance = await this.getPerformanceAnalytics(userId, start_date, end_date);
      }

      // Risk Analytics
      if (include_risk) {
        report.sections.risk = await this.getRiskAnalytics(userId, start_date, end_date);
      }

      // Tax Analytics
      if (include_tax) {
        report.sections.tax = await this.getTaxAnalytics(userId, start_date, end_date);
      }

      // Rebalancing Analytics
      if (include_rebalancing) {
        report.sections.rebalancing = await this.getRebalancingAnalytics(userId, start_date, end_date);
      }

      // Store report
      await this.storeAnalyticsReport(userId, report);

      return report;
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      throw error;
    }
  }

  async getPerformanceAnalytics(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          AVG((basic_metrics->>'annualized_return')::numeric) as avg_return,
          AVG((basic_metrics->>'volatility')::numeric) as avg_volatility,
          AVG((basic_metrics->>'sharpe_ratio')::numeric) as avg_sharpe,
          AVG((basic_metrics->>'max_drawdown')::numeric) as avg_max_drawdown
        FROM performance_metrics
        WHERE fund_id IN (
          SELECT DISTINCT fund_id FROM user_fund_holdings WHERE user_id = $1
        ) AND calculated_at >= $2 AND calculated_at <= $3
      `, [userId, startDate, endDate]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      return {};
    }
  }

  async getRiskAnalytics(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          AVG((risk_metrics->>'var_95')::numeric) as avg_var_95,
          AVG((risk_metrics->>'cvar_95')::numeric) as avg_cvar_95,
          AVG((risk_metrics->>'downside_deviation')::numeric) as avg_downside_deviation
        FROM risk_metrics
        WHERE user_id = $1 AND calculated_at >= $2 AND calculated_at <= $3
      `, [userId, startDate, endDate]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting risk analytics:', error);
      return {};
    }
  }

  async getTaxAnalytics(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          AVG((tax_liability->>'total_tax')::numeric) as avg_tax_liability,
          AVG((tax_liability->>'effective_rate')::numeric) as avg_effective_rate
        FROM tax_calculations
        WHERE user_id = $1 AND calculation_date >= $2 AND calculation_date <= $3
      `, [userId, startDate, endDate]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting tax analytics:', error);
      return {};
    }
  }

  async getRebalancingAnalytics(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_rebalancings,
          AVG(total_trades) as avg_trades_per_rebalancing,
          COUNT(CASE WHEN failed_trades = 0 THEN 1 END) as successful_rebalancings
        FROM rebalancing_records
        WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
      `, [userId, startDate, endDate]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting rebalancing analytics:', error);
      return {};
    }
  }

  async storeAnalyticsReport(userId, report) {
    try {
      await pool.query(`
        INSERT INTO analytics_reports (user_id, report_data, generated_at)
        VALUES ($1, $2, $3)
      `, [userId, JSON.stringify(report), new Date()]);

      logger.info(`Stored analytics report for user ${userId}`);
    } catch (error) {
      logger.error('Error storing analytics report:', error);
      throw error;
    }
  }

  async getAnalyticsStats() {
    try {
      const stats = {
        total_reports: 0,
        active_users: 0,
        average_report_size: 0
      };

      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_reports,
          COUNT(DISTINCT user_id) as active_users,
          AVG(LENGTH(report_data::text)) as average_report_size
        FROM analytics_reports
        WHERE generated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        stats.total_reports = parseInt(row.total_reports);
        stats.active_users = parseInt(row.active_users);
        stats.average_report_size = parseFloat(row.average_report_size) || 0;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting analytics stats:', error);
      return { total_reports: 0, active_users: 0, average_report_size: 0 };
    }
  }
}

module.exports = FundAnalyticsService;