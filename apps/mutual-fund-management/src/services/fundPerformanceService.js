const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundPerformanceService extends EventEmitter {
  constructor() {
    super();
    this.performanceData = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundPerformanceService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundPerformanceService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundPerformanceService closed');
    } catch (error) {
      logger.error('Error closing FundPerformanceService:', error);
    }
  }

  async getFundPerformance(fundId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        period = '1y'
      } = options;

      // Check cache first
      const cacheKey = `fund_performance:${fundId}:${period}:${startDate || 'all'}:${endDate || 'all'}`;
      const cachedPerformance = await redisService.get(cacheKey);
      if (cachedPerformance) {
        return cachedPerformance;
      }

      // Calculate date range based on period
      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get performance data
      const result = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date ASC
      `, [fundId, dateRange.start, dateRange.end]);

      if (result.rows.length === 0) {
        throw new Error('No performance data found for the specified period');
      }

      const performance = result.rows;

      // Calculate additional metrics
      const enhancedPerformance = this.enhancePerformanceData(performance);

      // Cache the result
      await redisService.set(cacheKey, enhancedPerformance, 1800); // Cache for 30 minutes

      return enhancedPerformance;
    } catch (error) {
      logger.error('Error getting fund performance:', error);
      throw error;
    }
  }

  async getFundComparison(fundIds, options = {}) {
    try {
      const {
        period = '1y',
        metrics = ['total_return', 'volatility', 'sharpe_ratio']
      } = options;

      // Check cache first
      const cacheKey = `fund_comparison:${fundIds.join(',')}:${period}:${metrics.join(',')}`;
      const cachedComparison = await redisService.get(cacheKey);
      if (cachedComparison) {
        return cachedComparison;
      }

      // Calculate date range
      const dateRange = this.calculateDateRange(period);

      // Get performance data for all funds
      const result = await pool.query(`
        SELECT 
          fp.*,
          mf.symbol,
          mf.name,
          ff.name as family_name,
          fc.name as category_name
        FROM fund_performance fp
        JOIN mutual_funds mf ON fp.fund_id = mf.id
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        WHERE fp.fund_id = ANY($1)
          AND fp.date >= $2
          AND fp.date <= $3
        ORDER BY fp.fund_id, fp.date ASC
      `, [fundIds, dateRange.start, dateRange.end]);

      if (result.rows.length === 0) {
        throw new Error('No performance data found for the specified funds and period');
      }

      // Group data by fund
      const fundData = {};
      result.rows.forEach(row => {
        if (!fundData[row.fund_id]) {
          fundData[row.fund_id] = {
            fund_id: row.fund_id,
            symbol: row.symbol,
            name: row.name,
            family_name: row.family_name,
            category_name: row.category_name,
            performance: []
          };
        }
        fundData[row.fund_id].performance.push(row);
      });

      // Calculate comparison metrics
      const comparison = this.calculateComparisonMetrics(fundData, metrics);

      // Cache the result
      await redisService.set(cacheKey, comparison, 1800); // Cache for 30 minutes

      return comparison;
    } catch (error) {
      logger.error('Error getting fund comparison:', error);
      throw error;
    }
  }

  async getPerformanceRankings(categoryId = null, options = {}) {
    try {
      const {
        period = '1y',
        metric = 'total_return_1y',
        limit = 50
      } = options;

      // Check cache first
      const cacheKey = `performance_rankings:${categoryId || 'all'}:${period}:${metric}`;
      const cachedRankings = await redisService.get(cacheKey);
      if (cachedRankings) {
        return cachedRankings;
      }

      // Calculate date range
      const dateRange = this.calculateDateRange(period);

      // Build WHERE clause
      let whereConditions = ['fp.date >= $1', 'fp.date <= $2'];
      let queryParams = [dateRange.start, dateRange.end];
      let paramCount = 2;

      if (categoryId) {
        paramCount++;
        whereConditions.push(`mf.category_id = $${paramCount}`);
        queryParams.push(categoryId);
      }

      const query = `
        SELECT 
          mf.id,
          mf.symbol,
          mf.name,
          ff.name as family_name,
          fc.name as category_name,
          fp.${metric},
          fp.nav,
          fp.assets_under_management,
          fp.sharpe_ratio,
          fp.alpha,
          fp.beta
        FROM fund_performance fp
        JOIN mutual_funds mf ON fp.fund_id = mf.id
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        WHERE ${whereConditions.join(' AND ')}
          AND fp.${metric} IS NOT NULL
        ORDER BY fp.${metric} DESC
        LIMIT $${paramCount + 1}
      `;

      queryParams.push(limit);

      const result = await pool.query(query, queryParams);

      // Add ranking information
      const rankings = result.rows.map((row, index) => ({
        ...row,
        rank: index + 1,
        percentile: ((index + 1) / result.rows.length) * 100
      }));

      // Cache the result
      await redisService.set(cacheKey, rankings, 1800); // Cache for 30 minutes

      return rankings;
    } catch (error) {
      logger.error('Error getting performance rankings:', error);
      throw error;
    }
  }

  async getPerformanceAnalytics(fundId, options = {}) {
    try {
      const {
        period = '1y',
        includeBenchmark = true,
        benchmarkId = null
      } = options;

      // Check cache first
      const cacheKey = `performance_analytics:${fundId}:${period}:${includeBenchmark}:${benchmarkId || 'none'}`;
      const cachedAnalytics = await redisService.get(cacheKey);
      if (cachedAnalytics) {
        return cachedAnalytics;
      }

      // Get fund performance data
      const fundPerformance = await this.getFundPerformance(fundId, { period });

      // Calculate analytics
      const analytics = {
        fund_id: fundId,
        period,
        returns: this.calculateReturns(fundPerformance),
        volatility: this.calculateVolatility(fundPerformance),
        risk_metrics: this.calculateRiskMetrics(fundPerformance),
        drawdown: this.calculateDrawdown(fundPerformance),
        rolling_returns: this.calculateRollingReturns(fundPerformance),
        performance_attribution: this.calculatePerformanceAttribution(fundPerformance)
      };

      // Add benchmark comparison if requested
      if (includeBenchmark) {
        const benchmarkId = benchmarkId || await this.getDefaultBenchmark(fundId);
        if (benchmarkId) {
          const benchmarkPerformance = await this.getFundPerformance(benchmarkId, { period });
          analytics.benchmark_comparison = this.calculateBenchmarkComparison(
            fundPerformance,
            benchmarkPerformance
          );
        }
      }

      // Cache the result
      await redisService.set(cacheKey, analytics, 1800); // Cache for 30 minutes

      return analytics;
    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      throw error;
    }
  }

  async updateFundPerformance(fundId, performanceData) {
    try {
      const {
        date,
        nav,
        change_amount,
        change_percentage,
        total_return_1d,
        total_return_1w,
        total_return_1m,
        total_return_3m,
        total_return_6m,
        total_return_1y,
        total_return_3y,
        total_return_5y,
        total_return_10y,
        total_return_ytd,
        total_return_since_inception,
        assets_under_management,
        shares_outstanding,
        dividend_yield,
        distribution_frequency,
        last_distribution_date,
        last_distribution_amount,
        beta,
        alpha,
        sharpe_ratio,
        standard_deviation,
        r_squared
      } = performanceData;

      // Insert or update performance data
      await pool.query(`
        INSERT INTO fund_performance (
          fund_id, date, nav, change_amount, change_percentage,
          total_return_1d, total_return_1w, total_return_1m, total_return_3m,
          total_return_6m, total_return_1y, total_return_3y, total_return_5y,
          total_return_10y, total_return_ytd, total_return_since_inception,
          assets_under_management, shares_outstanding, dividend_yield,
          distribution_frequency, last_distribution_date, last_distribution_amount,
          beta, alpha, sharpe_ratio, standard_deviation, r_squared
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT (fund_id, date)
        DO UPDATE SET
          nav = EXCLUDED.nav,
          change_amount = EXCLUDED.change_amount,
          change_percentage = EXCLUDED.change_percentage,
          total_return_1d = EXCLUDED.total_return_1d,
          total_return_1w = EXCLUDED.total_return_1w,
          total_return_1m = EXCLUDED.total_return_1m,
          total_return_3m = EXCLUDED.total_return_3m,
          total_return_6m = EXCLUDED.total_return_6m,
          total_return_1y = EXCLUDED.total_return_1y,
          total_return_3y = EXCLUDED.total_return_3y,
          total_return_5y = EXCLUDED.total_return_5y,
          total_return_10y = EXCLUDED.total_return_10y,
          total_return_ytd = EXCLUDED.total_return_ytd,
          total_return_since_inception = EXCLUDED.total_return_since_inception,
          assets_under_management = EXCLUDED.assets_under_management,
          shares_outstanding = EXCLUDED.shares_outstanding,
          dividend_yield = EXCLUDED.dividend_yield,
          distribution_frequency = EXCLUDED.distribution_frequency,
          last_distribution_date = EXCLUDED.last_distribution_date,
          last_distribution_amount = EXCLUDED.last_distribution_amount,
          beta = EXCLUDED.beta,
          alpha = EXCLUDED.alpha,
          sharpe_ratio = EXCLUDED.sharpe_ratio,
          standard_deviation = EXCLUDED.standard_deviation,
          r_squared = EXCLUDED.r_squared
      `, [
        fundId, date, nav, change_amount, change_percentage,
        total_return_1d, total_return_1w, total_return_1m, total_return_3m,
        total_return_6m, total_return_1y, total_return_3y, total_return_5y,
        total_return_10y, total_return_ytd, total_return_since_inception,
        assets_under_management, shares_outstanding, dividend_yield,
        distribution_frequency, last_distribution_date, last_distribution_amount,
        beta, alpha, sharpe_ratio, standard_deviation, r_squared
      ]);

      // Clear cache
      await this.clearPerformanceCache(fundId);

      // Emit event
      this.emit('performanceUpdated', { fundId, date, nav });

      logger.info(`Fund performance updated: ${fundId} for ${date}`);

      return true;
    } catch (error) {
      logger.error('Error updating fund performance:', error);
      throw error;
    }
  }

  calculateDateRange(period, startDate = null, endDate = null) {
    try {
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date();

      switch (period) {
        case '1d':
          start.setDate(end.getDate() - 1);
          break;
        case '1w':
          start.setDate(end.getDate() - 7);
          break;
        case '1m':
          start.setMonth(end.getMonth() - 1);
          break;
        case '3m':
          start.setMonth(end.getMonth() - 3);
          break;
        case '6m':
          start.setMonth(end.getMonth() - 6);
          break;
        case '1y':
          start.setFullYear(end.getFullYear() - 1);
          break;
        case '3y':
          start.setFullYear(end.getFullYear() - 3);
          break;
        case '5y':
          start.setFullYear(end.getFullYear() - 5);
          break;
        case '10y':
          start.setFullYear(end.getFullYear() - 10);
          break;
        case 'ytd':
          start.setMonth(0, 1); // January 1st
          break;
        case 'since_inception':
          start.setFullYear(1900); // Very old date
          break;
        default:
          start.setFullYear(end.getFullYear() - 1);
      }

      return { start, end };
    } catch (error) {
      logger.error('Error calculating date range:', error);
      return { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), end: new Date() };
    }
  }

  enhancePerformanceData(performance) {
    try {
      if (performance.length === 0) {
        return performance;
      }

      // Calculate additional metrics
      const enhanced = performance.map((row, index) => {
        const enhancedRow = { ...row };

        // Calculate cumulative returns
        if (index === 0) {
          enhancedRow.cumulative_return = 0;
        } else {
          const previousNav = performance[index - 1].nav;
          const currentNav = row.nav;
          enhancedRow.cumulative_return = ((currentNav - previousNav) / previousNav) * 100;
        }

        // Calculate volatility (rolling 30-day)
        if (index >= 29) {
          const recentReturns = performance.slice(index - 29, index + 1)
            .map(p => p.total_return_1d || 0);
          enhancedRow.volatility_30d = this.calculateStandardDeviation(recentReturns);
        }

        // Calculate moving averages
        if (index >= 9) {
          const recentNavs = performance.slice(index - 9, index + 1)
            .map(p => p.nav);
          enhancedRow.ma_10d = recentNavs.reduce((sum, nav) => sum + nav, 0) / recentNavs.length;
        }

        if (index >= 29) {
          const recentNavs = performance.slice(index - 29, index + 1)
            .map(p => p.nav);
          enhancedRow.ma_30d = recentNavs.reduce((sum, nav) => sum + nav, 0) / recentNavs.length;
        }

        return enhancedRow;
      });

      return enhanced;
    } catch (error) {
      logger.error('Error enhancing performance data:', error);
      return performance;
    }
  }

  calculateComparisonMetrics(fundData, metrics) {
    try {
      const comparison = {
        funds: [],
        summary: {
          best_performer: null,
          worst_performer: null,
          average_return: 0,
          average_volatility: 0,
          average_sharpe_ratio: 0
        }
      };

      let totalReturn = 0;
      let totalVolatility = 0;
      let totalSharpeRatio = 0;
      let validFunds = 0;

      Object.values(fundData).forEach(fund => {
        const performance = fund.performance;
        if (performance.length === 0) {
          return;
        }

        const latest = performance[performance.length - 1];
        const fundMetrics = {
          fund_id: fund.fund_id,
          symbol: fund.symbol,
          name: fund.name,
          family_name: fund.family_name,
          category_name: fund.category_name,
          total_return: latest.total_return_1y || 0,
          volatility: latest.standard_deviation || 0,
          sharpe_ratio: latest.sharpe_ratio || 0,
          alpha: latest.alpha || 0,
          beta: latest.beta || 0,
          nav: latest.nav || 0,
          assets_under_management: latest.assets_under_management || 0
        };

        comparison.funds.push(fundMetrics);

        if (fundMetrics.total_return !== 0) {
          totalReturn += fundMetrics.total_return;
          totalVolatility += fundMetrics.volatility;
          totalSharpeRatio += fundMetrics.sharpe_ratio;
          validFunds++;
        }
      });

      // Sort funds by total return
      comparison.funds.sort((a, b) => b.total_return - a.total_return);

      // Calculate summary
      if (validFunds > 0) {
        comparison.summary.average_return = totalReturn / validFunds;
        comparison.summary.average_volatility = totalVolatility / validFunds;
        comparison.summary.average_sharpe_ratio = totalSharpeRatio / validFunds;
      }

      if (comparison.funds.length > 0) {
        comparison.summary.best_performer = comparison.funds[0];
        comparison.summary.worst_performer = comparison.funds[comparison.funds.length - 1];
      }

      return comparison;
    } catch (error) {
      logger.error('Error calculating comparison metrics:', error);
      return { funds: [], summary: {} };
    }
  }

  calculateReturns(performance) {
    try {
      if (performance.length === 0) {
        return {};
      }

      const latest = performance[performance.length - 1];
      const first = performance[0];

      return {
        total_return: latest.total_return_since_inception || 0,
        annualized_return: this.calculateAnnualizedReturn(first.nav, latest.nav, performance.length),
        ytd_return: latest.total_return_ytd || 0,
        one_year_return: latest.total_return_1y || 0,
        three_year_return: latest.total_return_3y || 0,
        five_year_return: latest.total_return_5y || 0
      };
    } catch (error) {
      logger.error('Error calculating returns:', error);
      return {};
    }
  }

  calculateVolatility(performance) {
    try {
      if (performance.length < 2) {
        return 0;
      }

      const returns = performance.map(p => p.total_return_1d || 0);
      return this.calculateStandardDeviation(returns);
    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateRiskMetrics(performance) {
    try {
      if (performance.length < 2) {
        return {};
      }

      const latest = performance[performance.length - 1];
      const returns = performance.map(p => p.total_return_1d || 0);

      return {
        sharpe_ratio: latest.sharpe_ratio || 0,
        alpha: latest.alpha || 0,
        beta: latest.beta || 0,
        r_squared: latest.r_squared || 0,
        standard_deviation: latest.standard_deviation || 0,
        var_95: this.calculateVaR(returns, 0.95),
        var_99: this.calculateVaR(returns, 0.99)
      };
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      return {};
    }
  }

  calculateDrawdown(performance) {
    try {
      if (performance.length < 2) {
        return {};
      }

      let maxNav = performance[0].nav;
      let maxDrawdown = 0;
      let currentDrawdown = 0;

      performance.forEach(p => {
        if (p.nav > maxNav) {
          maxNav = p.nav;
          currentDrawdown = 0;
        } else {
          currentDrawdown = ((maxNav - p.nav) / maxNav) * 100;
          if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
          }
        }
      });

      return {
        max_drawdown: maxDrawdown,
        current_drawdown: currentDrawdown
      };
    } catch (error) {
      logger.error('Error calculating drawdown:', error);
      return {};
    }
  }

  calculateRollingReturns(performance) {
    try {
      if (performance.length < 30) {
        return {};
      }

      const rolling30d = [];
      const rolling90d = [];

      for (let i = 29; i < performance.length; i++) {
        const start30 = performance[i - 29];
        const end30 = performance[i];
        const return30d = ((end30.nav - start30.nav) / start30.nav) * 100;
        rolling30d.push(return30d);
      }

      for (let i = 89; i < performance.length; i++) {
        const start90 = performance[i - 89];
        const end90 = performance[i];
        const return90d = ((end90.nav - start90.nav) / start90.nav) * 100;
        rolling90d.push(return90d);
      }

      return {
        rolling_30d: rolling30d,
        rolling_90d: rolling90d
      };
    } catch (error) {
      logger.error('Error calculating rolling returns:', error);
      return {};
    }
  }

  calculatePerformanceAttribution(performance) {
    try {
      // This is a simplified version - in reality, you'd need more detailed data
      return {
        asset_allocation: 0,
        security_selection: 0,
        market_timing: 0,
        other: 0
      };
    } catch (error) {
      logger.error('Error calculating performance attribution:', error);
      return {};
    }
  }

  calculateBenchmarkComparison(fundPerformance, benchmarkPerformance) {
    try {
      if (fundPerformance.length === 0 || benchmarkPerformance.length === 0) {
        return {};
      }

      const fundLatest = fundPerformance[fundPerformance.length - 1];
      const benchmarkLatest = benchmarkPerformance[benchmarkPerformance.length - 1];

      return {
        excess_return: (fundLatest.total_return_1y || 0) - (benchmarkLatest.total_return_1y || 0),
        tracking_error: Math.abs((fundLatest.standard_deviation || 0) - (benchmarkLatest.standard_deviation || 0)),
        information_ratio: this.calculateInformationRatio(fundPerformance, benchmarkPerformance),
        beta: fundLatest.beta || 0,
        alpha: fundLatest.alpha || 0
      };
    } catch (error) {
      logger.error('Error calculating benchmark comparison:', error);
      return {};
    }
  }

  calculateStandardDeviation(values) {
    try {
      if (values.length < 2) {
        return 0;
      }

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating standard deviation:', error);
      return 0;
    }
  }

  calculateAnnualizedReturn(startNav, endNav, days) {
    try {
      if (startNav <= 0 || endNav <= 0 || days <= 0) {
        return 0;
      }

      const returnRate = (endNav - startNav) / startNav;
      const annualizedReturn = Math.pow(1 + returnRate, 365 / days) - 1;
      return annualizedReturn * 100;
    } catch (error) {
      logger.error('Error calculating annualized return:', error);
      return 0;
    }
  }

  calculateVaR(returns, confidence) {
    try {
      if (returns.length < 2) {
        return 0;
      }

      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidence) * sortedReturns.length);
      return sortedReturns[index] || 0;
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      return 0;
    }
  }

  calculateInformationRatio(fundPerformance, benchmarkPerformance) {
    try {
      if (fundPerformance.length < 2 || benchmarkPerformance.length < 2) {
        return 0;
      }

      const fundReturns = fundPerformance.map(p => p.total_return_1d || 0);
      const benchmarkReturns = benchmarkPerformance.map(p => p.total_return_1d || 0);

      const excessReturns = fundReturns.map((fund, index) => 
        fund - (benchmarkReturns[index] || 0)
      );

      const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
      const trackingError = this.calculateStandardDeviation(excessReturns);

      return trackingError > 0 ? meanExcessReturn / trackingError : 0;
    } catch (error) {
      logger.error('Error calculating information ratio:', error);
      return 0;
    }
  }

  async getDefaultBenchmark(fundId) {
    try {
      // Get fund category to determine appropriate benchmark
      const result = await pool.query(`
        SELECT category_id
        FROM mutual_funds
        WHERE id = $1
      `, [fundId]);

      if (result.rows.length === 0) {
        return null;
      }

      const categoryId = result.rows[0].category_id;

      // Find a suitable benchmark fund in the same category
      const benchmarkResult = await pool.query(`
        SELECT id
        FROM mutual_funds
        WHERE category_id = $1
          AND is_active = true
          AND is_tradeable = true
          AND is_index_fund = true
        ORDER BY assets_under_management DESC
        LIMIT 1
      `, [categoryId]);

      return benchmarkResult.rows.length > 0 ? benchmarkResult.rows[0].id : null;
    } catch (error) {
      logger.error('Error getting default benchmark:', error);
      return null;
    }
  }

  async clearPerformanceCache(fundId) {
    try {
      const pattern = `fund_performance:${fundId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing performance cache:', error);
    }
  }
}

module.exports = FundPerformanceService;
