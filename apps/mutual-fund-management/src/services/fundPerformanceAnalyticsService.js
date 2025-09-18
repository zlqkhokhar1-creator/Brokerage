const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundPerformanceAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.analyticsCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundPerformanceAnalyticsService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundPerformanceAnalyticsService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundPerformanceAnalyticsService closed');
    } catch (error) {
      logger.error('Error closing FundPerformanceAnalyticsService:', error);
    }
  }

  async calculatePerformanceMetrics(fundId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end_date = new Date(),
        benchmark_id = null
      } = options;

      // Get fund performance data
      const performanceData = await this.getFundPerformanceData(fundId, start_date, end_date);
      
      if (!performanceData || performanceData.length === 0) {
        throw new Error('No performance data available for the specified period');
      }

      // Calculate basic metrics
      const basicMetrics = await this.calculateBasicMetrics(performanceData);
      
      // Calculate risk metrics
      const riskMetrics = await this.calculateRiskMetrics(performanceData);
      
      // Calculate benchmark comparison
      const benchmarkComparison = benchmark_id ? 
        await this.calculateBenchmarkComparison(fundId, benchmark_id, start_date, end_date) :
        null;

      // Calculate attribution analysis
      const attributionAnalysis = await this.calculateAttributionAnalysis(fundId, start_date, end_date);

      // Calculate factor analysis
      const factorAnalysis = await this.calculateFactorAnalysis(fundId, start_date, end_date);

      // Calculate peer comparison
      const peerComparison = await this.calculatePeerComparison(fundId, start_date, end_date);

      const metrics = {
        fund_id: fundId,
        period: { start_date, end_date },
        basic_metrics: basicMetrics,
        risk_metrics: riskMetrics,
        benchmark_comparison: benchmarkComparison,
        attribution_analysis: attributionAnalysis,
        factor_analysis: factorAnalysis,
        peer_comparison: peerComparison,
        calculated_at: new Date()
      };

      // Store metrics
      await this.storePerformanceMetrics(fundId, metrics);

      return metrics;
    } catch (error) {
      logger.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  async calculateBasicMetrics(performanceData) {
    try {
      const metrics = {
        total_return: 0,
        annualized_return: 0,
        volatility: 0,
        sharpe_ratio: 0,
        max_drawdown: 0,
        calmar_ratio: 0,
        sortino_ratio: 0,
        information_ratio: 0,
        tracking_error: 0,
        beta: 1,
        alpha: 0,
        r_squared: 0
      };

      if (performanceData.length === 0) return metrics;

      // Calculate returns
      const returns = this.calculateReturns(performanceData);
      
      // Total return
      metrics.total_return = this.calculateTotalReturn(performanceData);
      
      // Annualized return
      metrics.annualized_return = this.calculateAnnualizedReturn(returns);
      
      // Volatility (standard deviation)
      metrics.volatility = this.calculateVolatility(returns);
      
      // Sharpe ratio
      metrics.sharpe_ratio = this.calculateSharpeRatio(returns);
      
      // Maximum drawdown
      metrics.max_drawdown = this.calculateMaxDrawdown(performanceData);
      
      // Calmar ratio
      metrics.calmar_ratio = this.calculateCalmarRatio(metrics.annualized_return, metrics.max_drawdown);
      
      // Sortino ratio
      metrics.sortino_ratio = this.calculateSortinoRatio(returns);
      
      // Information ratio
      metrics.information_ratio = this.calculateInformationRatio(returns);
      
      // Tracking error
      metrics.tracking_error = this.calculateTrackingError(returns);
      
      // Beta
      metrics.beta = this.calculateBeta(returns);
      
      // Alpha
      metrics.alpha = this.calculateAlpha(returns, metrics.beta);
      
      // R-squared
      metrics.r_squared = this.calculateRSquared(returns);

      return metrics;
    } catch (error) {
      logger.error('Error calculating basic metrics:', error);
      return {};
    }
  }

  async calculateRiskMetrics(performanceData) {
    try {
      const metrics = {
        var_95: 0,
        var_99: 0,
        cvar_95: 0,
        cvar_99: 0,
        downside_deviation: 0,
        upside_capture: 0,
        downside_capture: 0,
        tail_ratio: 0,
        common_sense_ratio: 0
      };

      if (performanceData.length === 0) return metrics;

      const returns = this.calculateReturns(performanceData);
      
      // VaR calculations
      metrics.var_95 = this.calculateVaR(returns, 0.95);
      metrics.var_99 = this.calculateVaR(returns, 0.99);
      
      // CVaR calculations
      metrics.cvar_95 = this.calculateCVaR(returns, 0.95);
      metrics.cvar_99 = this.calculateCVaR(returns, 0.99);
      
      // Downside deviation
      metrics.downside_deviation = this.calculateDownsideDeviation(returns);
      
      // Upside/downside capture
      const captureRatios = this.calculateCaptureRatios(returns);
      metrics.upside_capture = captureRatios.upside;
      metrics.downside_capture = captureRatios.downside;
      
      // Tail ratio
      metrics.tail_ratio = this.calculateTailRatio(returns);
      
      // Common sense ratio
      metrics.common_sense_ratio = this.calculateCommonSenseRatio(returns);

      return metrics;
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      return {};
    }
  }

  async calculateBenchmarkComparison(fundId, benchmarkId, startDate, endDate) {
    try {
      // Get benchmark performance data
      const benchmarkData = await this.getBenchmarkPerformanceData(benchmarkId, startDate, endDate);
      
      if (!benchmarkData || benchmarkData.length === 0) {
        return null;
      }

      // Get fund performance data
      const fundData = await this.getFundPerformanceData(fundId, startDate, endDate);
      
      if (!fundData || fundData.length === 0) {
        return null;
      }

      const comparison = {
        benchmark_id: benchmarkId,
        excess_return: 0,
        tracking_error: 0,
        information_ratio: 0,
        beta: 1,
        alpha: 0,
        r_squared: 0,
        correlation: 0,
        outperformance_periods: 0,
        underperformance_periods: 0
      };

      // Calculate fund and benchmark returns
      const fundReturns = this.calculateReturns(fundData);
      const benchmarkReturns = this.calculateReturns(benchmarkData);
      
      // Align returns by date
      const alignedReturns = this.alignReturnsByDate(fundReturns, benchmarkReturns);
      
      if (alignedReturns.fund.length === 0) return comparison;

      // Excess return
      comparison.excess_return = this.calculateExcessReturn(alignedReturns.fund, alignedReturns.benchmark);
      
      // Tracking error
      comparison.tracking_error = this.calculateTrackingError(alignedReturns.fund, alignedReturns.benchmark);
      
      // Information ratio
      comparison.information_ratio = this.calculateInformationRatio(alignedReturns.fund, alignedReturns.benchmark);
      
      // Beta
      comparison.beta = this.calculateBeta(alignedReturns.fund, alignedReturns.benchmark);
      
      // Alpha
      comparison.alpha = this.calculateAlpha(alignedReturns.fund, alignedReturns.benchmark, comparison.beta);
      
      // R-squared
      comparison.r_squared = this.calculateRSquared(alignedReturns.fund, alignedReturns.benchmark);
      
      // Correlation
      comparison.correlation = this.calculateCorrelation(alignedReturns.fund, alignedReturns.benchmark);
      
      // Outperformance periods
      const performanceComparison = this.calculatePerformancePeriods(alignedReturns.fund, alignedReturns.benchmark);
      comparison.outperformance_periods = performanceComparison.outperformance;
      comparison.underperformance_periods = performanceComparison.underperformance;

      return comparison;
    } catch (error) {
      logger.error('Error calculating benchmark comparison:', error);
      return null;
    }
  }

  async calculateAttributionAnalysis(fundId, startDate, endDate) {
    try {
      // Get fund holdings
      const holdings = await this.getFundHoldings(fundId, startDate, endDate);
      
      if (!holdings || holdings.length === 0) {
        return null;
      }

      const attribution = {
        total_attribution: 0,
        allocation_effect: 0,
        selection_effect: 0,
        interaction_effect: 0,
        sector_attribution: {},
        security_attribution: []
      };

      // Calculate sector attribution
      const sectorAttribution = this.calculateSectorAttribution(holdings);
      attribution.sector_attribution = sectorAttribution;
      
      // Calculate security attribution
      const securityAttribution = this.calculateSecurityAttribution(holdings);
      attribution.security_attribution = securityAttribution;
      
      // Calculate total attribution
      attribution.total_attribution = Object.values(sectorAttribution).reduce((sum, val) => sum + val, 0);
      
      // Calculate allocation and selection effects
      const effects = this.calculateAllocationSelectionEffects(holdings);
      attribution.allocation_effect = effects.allocation;
      attribution.selection_effect = effects.selection;
      attribution.interaction_effect = effects.interaction;

      return attribution;
    } catch (error) {
      logger.error('Error calculating attribution analysis:', error);
      return null;
    }
  }

  async calculateFactorAnalysis(fundId, startDate, endDate) {
    try {
      // Get fund performance data
      const fundData = await this.getFundPerformanceData(fundId, startDate, endDate);
      
      if (!fundData || fundData.length === 0) {
        return null;
      }

      const factorAnalysis = {
        market_factor: 0,
        size_factor: 0,
        value_factor: 0,
        momentum_factor: 0,
        quality_factor: 0,
        low_volatility_factor: 0,
        r_squared: 0,
        adjusted_r_squared: 0,
        f_statistic: 0,
        p_value: 0
      };

      // Calculate fund returns
      const fundReturns = this.calculateReturns(fundData);
      
      // Get factor data
      const factorData = await this.getFactorData(startDate, endDate);
      
      if (!factorData || factorData.length === 0) {
        return factorAnalysis;
      }

      // Perform factor regression
      const regression = this.performFactorRegression(fundReturns, factorData);
      
      factorAnalysis.market_factor = regression.market;
      factorAnalysis.size_factor = regression.size;
      factorAnalysis.value_factor = regression.value;
      factorAnalysis.momentum_factor = regression.momentum;
      factorAnalysis.quality_factor = regression.quality;
      factorAnalysis.low_volatility_factor = regression.low_volatility;
      factorAnalysis.r_squared = regression.r_squared;
      factorAnalysis.adjusted_r_squared = regression.adjusted_r_squared;
      factorAnalysis.f_statistic = regression.f_statistic;
      factorAnalysis.p_value = regression.p_value;

      return factorAnalysis;
    } catch (error) {
      logger.error('Error calculating factor analysis:', error);
      return null;
    }
  }

  async calculatePeerComparison(fundId, startDate, endDate) {
    try {
      // Get fund category
      const fund = await this.getFundById(fundId);
      if (!fund) return null;

      // Get peer funds in the same category
      const peerFunds = await this.getPeerFunds(fund.category_id, startDate, endDate);
      
      if (!peerFunds || peerFunds.length === 0) {
        return null;
      }

      const comparison = {
        category_id: fund.category_id,
        category_name: fund.category_name,
        peer_count: peerFunds.length,
        percentile_rank: 0,
        quartile_rank: 0,
        peer_average_return: 0,
        peer_median_return: 0,
        peer_average_volatility: 0,
        peer_median_volatility: 0,
        peer_average_sharpe: 0,
        peer_median_sharpe: 0
      };

      // Calculate fund performance
      const fundPerformance = await this.calculatePerformanceMetrics(fundId, { start_date: startDate, end_date: endDate });
      
      // Calculate peer performance metrics
      const peerMetrics = await this.calculatePeerMetrics(peerFunds, startDate, endDate);
      
      // Calculate percentile rank
      comparison.percentile_rank = this.calculatePercentileRank(
        fundPerformance.basic_metrics.annualized_return,
        peerMetrics.returns
      );
      
      // Calculate quartile rank
      comparison.quartile_rank = this.calculateQuartileRank(comparison.percentile_rank);
      
      // Set peer averages
      comparison.peer_average_return = peerMetrics.average_return;
      comparison.peer_median_return = peerMetrics.median_return;
      comparison.peer_average_volatility = peerMetrics.average_volatility;
      comparison.peer_median_volatility = peerMetrics.median_volatility;
      comparison.peer_average_sharpe = peerMetrics.average_sharpe;
      comparison.peer_median_sharpe = peerMetrics.median_sharpe;

      return comparison;
    } catch (error) {
      logger.error('Error calculating peer comparison:', error);
      return null;
    }
  }

  // Helper methods for calculations
  calculateReturns(performanceData) {
    try {
      const returns = [];
      
      for (let i = 1; i < performanceData.length; i++) {
        const current = performanceData[i];
        const previous = performanceData[i - 1];
        
        if (previous.nav > 0) {
          const returnValue = (current.nav - previous.nav) / previous.nav;
          returns.push(returnValue);
        }
      }
      
      return returns;
    } catch (error) {
      logger.error('Error calculating returns:', error);
      return [];
    }
  }

  calculateTotalReturn(performanceData) {
    try {
      if (performanceData.length < 2) return 0;
      
      const first = performanceData[0];
      const last = performanceData[performanceData.length - 1];
      
      return (last.nav - first.nav) / first.nav;
    } catch (error) {
      logger.error('Error calculating total return:', error);
      return 0;
    }
  }

  calculateAnnualizedReturn(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
      const periods = returns.length;
      const years = periods / 252; // Assuming 252 trading days per year
      
      return Math.pow(1 + totalReturn, 1 / years) - 1;
    } catch (error) {
      logger.error('Error calculating annualized return:', error);
      return 0;
    }
  }

  calculateVolatility(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const volatility = this.calculateVolatility(returns);
      
      return volatility > 0 ? (mean - riskFreeRate / 252) / volatility : 0;
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  calculateMaxDrawdown(performanceData) {
    try {
      if (performanceData.length === 0) return 0;
      
      let maxDrawdown = 0;
      let peak = performanceData[0].nav;
      
      for (let i = 1; i < performanceData.length; i++) {
        const current = performanceData[i].nav;
        
        if (current > peak) {
          peak = current;
        } else {
          const drawdown = (peak - current) / peak;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      }
      
      return maxDrawdown;
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  calculateCalmarRatio(annualizedReturn, maxDrawdown) {
    try {
      return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    } catch (error) {
      logger.error('Error calculating Calmar ratio:', error);
      return 0;
    }
  }

  calculateSortinoRatio(returns, targetReturn = 0) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const downsideReturns = returns.filter(ret => ret < targetReturn);
      
      if (downsideReturns.length === 0) return 0;
      
      const downsideVariance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - targetReturn, 2), 0) / downsideReturns.length;
      const downsideDeviation = Math.sqrt(downsideVariance);
      
      return downsideDeviation > 0 ? (mean - targetReturn) / downsideDeviation : 0;
    } catch (error) {
      logger.error('Error calculating Sortino ratio:', error);
      return 0;
    }
  }

  calculateInformationRatio(fundReturns, benchmarkReturns = null) {
    try {
      if (fundReturns.length === 0) return 0;
      
      if (!benchmarkReturns) {
        // Calculate as Sharpe ratio with zero benchmark
        return this.calculateSharpeRatio(fundReturns);
      }
      
      if (fundReturns.length !== benchmarkReturns.length) return 0;
      
      const excessReturns = fundReturns.map((ret, i) => ret - benchmarkReturns[i]);
      const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
      const trackingError = this.calculateTrackingError(fundReturns, benchmarkReturns);
      
      return trackingError > 0 ? meanExcessReturn / trackingError : 0;
    } catch (error) {
      logger.error('Error calculating information ratio:', error);
      return 0;
    }
  }

  calculateTrackingError(fundReturns, benchmarkReturns = null) {
    try {
      if (!benchmarkReturns) {
        return this.calculateVolatility(fundReturns);
      }
      
      if (fundReturns.length !== benchmarkReturns.length) return 0;
      
      const excessReturns = fundReturns.map((ret, i) => ret - benchmarkReturns[i]);
      return this.calculateVolatility(excessReturns);
    } catch (error) {
      logger.error('Error calculating tracking error:', error);
      return 0;
    }
  }

  calculateBeta(fundReturns, benchmarkReturns = null) {
    try {
      if (!benchmarkReturns || fundReturns.length !== benchmarkReturns.length) return 1;
      
      const fundMean = fundReturns.reduce((sum, ret) => sum + ret, 0) / fundReturns.length;
      const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
      
      let covariance = 0;
      let benchmarkVariance = 0;
      
      for (let i = 0; i < fundReturns.length; i++) {
        const fundDiff = fundReturns[i] - fundMean;
        const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
        
        covariance += fundDiff * benchmarkDiff;
        benchmarkVariance += benchmarkDiff * benchmarkDiff;
      }
      
      return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
    } catch (error) {
      logger.error('Error calculating beta:', error);
      return 1;
    }
  }

  calculateAlpha(fundReturns, benchmarkReturns = null, beta = 1) {
    try {
      if (!benchmarkReturns || fundReturns.length !== benchmarkReturns.length) return 0;
      
      const fundMean = fundReturns.reduce((sum, ret) => sum + ret, 0) / fundReturns.length;
      const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
      
      return fundMean - (beta * benchmarkMean);
    } catch (error) {
      logger.error('Error calculating alpha:', error);
      return 0;
    }
  }

  calculateRSquared(fundReturns, benchmarkReturns = null) {
    try {
      if (!benchmarkReturns || fundReturns.length !== benchmarkReturns.length) return 0;
      
      const fundMean = fundReturns.reduce((sum, ret) => sum + ret, 0) / fundReturns.length;
      const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
      
      let ssRes = 0; // Sum of squares of residuals
      let ssTot = 0; // Total sum of squares
      
      for (let i = 0; i < fundReturns.length; i++) {
        const fundDiff = fundReturns[i] - fundMean;
        const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
        
        ssRes += Math.pow(fundDiff - benchmarkDiff, 2);
        ssTot += Math.pow(fundDiff, 2);
      }
      
      return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    } catch (error) {
      logger.error('Error calculating R-squared:', error);
      return 0;
    }
  }

  calculateVaR(returns, confidenceLevel) {
    try {
      if (returns.length === 0) return 0;
      
      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      
      return Math.abs(sortedReturns[index] || 0);
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      return 0;
    }
  }

  calculateCVaR(returns, confidenceLevel) {
    try {
      if (returns.length === 0) return 0;
      
      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const threshold = sortedReturns[index] || 0;
      
      const tailReturns = sortedReturns.filter(ret => ret <= threshold);
      return tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length) : 0;
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      return 0;
    }
  }

  calculateDownsideDeviation(returns, targetReturn = 0) {
    try {
      if (returns.length === 0) return 0;
      
      const downsideReturns = returns.filter(ret => ret < targetReturn);
      if (downsideReturns.length === 0) return 0;
      
      const variance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - targetReturn, 2), 0) / downsideReturns.length;
      return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    } catch (error) {
      logger.error('Error calculating downside deviation:', error);
      return 0;
    }
  }

  calculateCaptureRatios(returns) {
    try {
      // This is a simplified calculation
      // In practice, you'd need benchmark data
      return {
        upside: 1.0,
        downside: 1.0
      };
    } catch (error) {
      logger.error('Error calculating capture ratios:', error);
      return { upside: 1.0, downside: 1.0 };
    }
  }

  calculateTailRatio(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const var95 = this.calculateVaR(returns, 0.95);
      const var99 = this.calculateVaR(returns, 0.99);
      
      return var99 > 0 ? var95 / var99 : 0;
    } catch (error) {
      logger.error('Error calculating tail ratio:', error);
      return 0;
    }
  }

  calculateCommonSenseRatio(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const positiveReturns = returns.filter(ret => ret > 0);
      const negativeReturns = returns.filter(ret => ret < 0);
      
      if (negativeReturns.length === 0) return 0;
      
      const avgPositive = positiveReturns.length > 0 ? 
        positiveReturns.reduce((sum, ret) => sum + ret, 0) / positiveReturns.length : 0;
      const avgNegative = negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length;
      
      return avgNegative !== 0 ? avgPositive / Math.abs(avgNegative) : 0;
    } catch (error) {
      logger.error('Error calculating common sense ratio:', error);
      return 0;
    }
  }

  // Database helper methods
  async getFundPerformanceData(fundId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date ASC
      `, [fundId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting fund performance data:', error);
      return [];
    }
  }

  async getBenchmarkPerformanceData(benchmarkId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM benchmark_performance
        WHERE benchmark_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date ASC
      `, [benchmarkId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting benchmark performance data:', error);
      return [];
    }
  }

  async getFundHoldings(fundId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_holdings
        WHERE fund_id = $1
          AND as_of_date >= $2
          AND as_of_date <= $3
        ORDER BY as_of_date DESC
      `, [fundId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting fund holdings:', error);
      return [];
    }
  }

  async getFactorData(startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM factor_data
        WHERE date >= $1
          AND date <= $2
        ORDER BY date ASC
      `, [startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting factor data:', error);
      return [];
    }
  }

  async getFundById(fundId) {
    try {
      const result = await pool.query(`
        SELECT mf.*, fc.name as category_name
        FROM mutual_funds mf
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        WHERE mf.id = $1
      `, [fundId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting fund by ID:', error);
      return null;
    }
  }

  async getPeerFunds(categoryId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT mf.id, mf.symbol, mf.name
        FROM mutual_funds mf
        WHERE mf.category_id = $1
          AND mf.is_active = true
          AND mf.is_tradeable = true
        ORDER BY mf.symbol
      `, [categoryId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting peer funds:', error);
      return [];
    }
  }

  async calculatePeerMetrics(peerFunds, startDate, endDate) {
    try {
      const metrics = {
        returns: [],
        volatilities: [],
        sharpes: [],
        average_return: 0,
        median_return: 0,
        average_volatility: 0,
        median_volatility: 0,
        average_sharpe: 0,
        median_sharpe: 0
      };

      for (const fund of peerFunds) {
        try {
          const performance = await this.calculatePerformanceMetrics(fund.id, { start_date: startDate, end_date: endDate });
          
          if (performance && performance.basic_metrics) {
            metrics.returns.push(performance.basic_metrics.annualized_return);
            metrics.volatilities.push(performance.basic_metrics.volatility);
            metrics.sharpes.push(performance.basic_metrics.sharpe_ratio);
          }
        } catch (error) {
          logger.error(`Error calculating metrics for peer fund ${fund.symbol}:`, error);
        }
      }

      // Calculate averages and medians
      if (metrics.returns.length > 0) {
        metrics.average_return = metrics.returns.reduce((sum, ret) => sum + ret, 0) / metrics.returns.length;
        metrics.median_return = this.calculateMedian(metrics.returns);
      }

      if (metrics.volatilities.length > 0) {
        metrics.average_volatility = metrics.volatilities.reduce((sum, vol) => sum + vol, 0) / metrics.volatilities.length;
        metrics.median_volatility = this.calculateMedian(metrics.volatilities);
      }

      if (metrics.sharpes.length > 0) {
        metrics.average_sharpe = metrics.sharpes.reduce((sum, sharpe) => sum + sharpe, 0) / metrics.sharpes.length;
        metrics.median_sharpe = this.calculateMedian(metrics.sharpes);
      }

      return metrics;
    } catch (error) {
      logger.error('Error calculating peer metrics:', error);
      return {
        returns: [],
        volatilities: [],
        sharpes: [],
        average_return: 0,
        median_return: 0,
        average_volatility: 0,
        median_volatility: 0,
        average_sharpe: 0,
        median_sharpe: 0
      };
    }
  }

  calculateMedian(values) {
    try {
      if (values.length === 0) return 0;
      
      const sorted = values.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      
      return sorted.length % 2 === 0 ? 
        (sorted[mid - 1] + sorted[mid]) / 2 : 
        sorted[mid];
    } catch (error) {
      logger.error('Error calculating median:', error);
      return 0;
    }
  }

  calculatePercentileRank(value, values) {
    try {
      if (values.length === 0) return 0;
      
      const sorted = values.sort((a, b) => a - b);
      const rank = sorted.findIndex(v => v >= value);
      
      return rank === -1 ? 100 : (rank / sorted.length) * 100;
    } catch (error) {
      logger.error('Error calculating percentile rank:', error);
      return 0;
    }
  }

  calculateQuartileRank(percentileRank) {
    try {
      if (percentileRank >= 75) return 1;
      if (percentileRank >= 50) return 2;
      if (percentileRank >= 25) return 3;
      return 4;
    } catch (error) {
      logger.error('Error calculating quartile rank:', error);
      return 4;
    }
  }

  async storePerformanceMetrics(fundId, metrics) {
    try {
      await pool.query(`
        INSERT INTO performance_metrics (
          fund_id, period_start, period_end, basic_metrics, risk_metrics,
          benchmark_comparison, attribution_analysis, factor_analysis,
          peer_comparison, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (fund_id, period_start, period_end) 
        DO UPDATE SET
          basic_metrics = EXCLUDED.basic_metrics,
          risk_metrics = EXCLUDED.risk_metrics,
          benchmark_comparison = EXCLUDED.benchmark_comparison,
          attribution_analysis = EXCLUDED.attribution_analysis,
          factor_analysis = EXCLUDED.factor_analysis,
          peer_comparison = EXCLUDED.peer_comparison,
          calculated_at = EXCLUDED.calculated_at
      `, [
        fundId,
        metrics.period.start_date,
        metrics.period.end_date,
        JSON.stringify(metrics.basic_metrics),
        JSON.stringify(metrics.risk_metrics),
        JSON.stringify(metrics.benchmark_comparison),
        JSON.stringify(metrics.attribution_analysis),
        JSON.stringify(metrics.factor_analysis),
        JSON.stringify(metrics.peer_comparison),
        metrics.calculated_at
      ]);

      logger.info(`Stored performance metrics for fund ${fundId}`);
    } catch (error) {
      logger.error('Error storing performance metrics:', error);
      throw error;
    }
  }

  async getPerformanceReport(fundId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end_date = new Date(),
        include_benchmark = true,
        include_attribution = true,
        include_factors = true,
        include_peers = true
      } = options;

      // Calculate performance metrics
      const metrics = await this.calculatePerformanceMetrics(fundId, {
        start_date,
        end_date,
        benchmark_id: include_benchmark ? 'market_index' : null
      });

      // Get fund information
      const fund = await this.getFundById(fundId);
      if (!fund) {
        throw new Error('Fund not found');
      }

      return {
        fund: {
          id: fund.id,
          symbol: fund.symbol,
          name: fund.name,
          category: fund.category_name
        },
        period: { start_date, end_date },
        metrics: metrics,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  async getPerformanceStats() {
    try {
      const stats = {
        total_funds: 0,
        funds_with_metrics: 0,
        average_performance: 0,
        best_performing_fund: null,
        worst_performing_fund: null
      };

      // Get fund counts
      const fundResult = await pool.query(`
        SELECT 
          COUNT(*) as total_funds,
          COUNT(DISTINCT fund_id) as funds_with_metrics
        FROM mutual_funds mf
        LEFT JOIN performance_metrics pm ON mf.id = pm.fund_id
        WHERE mf.is_active = true
      `);

      if (fundResult.rows.length > 0) {
        stats.total_funds = parseInt(fundResult.rows[0].total_funds);
        stats.funds_with_metrics = parseInt(fundResult.rows[0].funds_with_metrics);
      }

      // Get average performance
      const avgResult = await pool.query(`
        SELECT AVG((basic_metrics->>'annualized_return')::numeric) as average_performance
        FROM performance_metrics
        WHERE calculated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (avgResult.rows.length > 0) {
        stats.average_performance = parseFloat(avgResult.rows[0].average_performance) || 0;
      }

      // Get best and worst performing funds
      const performanceResult = await pool.query(`
        SELECT 
          mf.symbol,
          mf.name,
          (pm.basic_metrics->>'annualized_return')::numeric as annualized_return
        FROM performance_metrics pm
        JOIN mutual_funds mf ON pm.fund_id = mf.id
        WHERE pm.calculated_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY (pm.basic_metrics->>'annualized_return')::numeric DESC
        LIMIT 1
      `);

      if (performanceResult.rows.length > 0) {
        stats.best_performing_fund = performanceResult.rows[0];
      }

      const worstResult = await pool.query(`
        SELECT 
          mf.symbol,
          mf.name,
          (pm.basic_metrics->>'annualized_return')::numeric as annualized_return
        FROM performance_metrics pm
        JOIN mutual_funds mf ON pm.fund_id = mf.id
        WHERE pm.calculated_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY (pm.basic_metrics->>'annualized_return')::numeric ASC
        LIMIT 1
      `);

      if (worstResult.rows.length > 0) {
        stats.worst_performing_fund = worstResult.rows[0];
      }

      return stats;
    } catch (error) {
      logger.error('Error getting performance stats:', error);
      return {
        total_funds: 0,
        funds_with_metrics: 0,
        average_performance: 0,
        best_performing_fund: null,
        worst_performing_fund: null
      };
    }
  }
}

module.exports = FundPerformanceAnalyticsService;
