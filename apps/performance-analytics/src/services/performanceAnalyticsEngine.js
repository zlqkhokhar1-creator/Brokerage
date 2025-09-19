const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class PerformanceAnalyticsEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.analysisSessions = new Map();
    this.performanceMetrics = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadPerformanceMetrics();
      logger.info('Performance Analytics Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Performance Analytics Engine:', error);
      throw error;
    }
  }

  async loadPerformanceMetrics() {
    try {
      const metrics = [
        {
          id: 'total_return',
          name: 'Total Return',
          description: 'Total return over the period',
          type: 'return',
          enabled: true,
          calculation: 'total_return'
        },
        {
          id: 'annualized_return',
          name: 'Annualized Return',
          description: 'Annualized return over the period',
          type: 'return',
          enabled: true,
          calculation: 'annualized_return'
        },
        {
          id: 'volatility',
          name: 'Volatility',
          description: 'Standard deviation of returns',
          type: 'risk',
          enabled: true,
          calculation: 'volatility'
        },
        {
          id: 'sharpe_ratio',
          name: 'Sharpe Ratio',
          description: 'Risk-adjusted return measure',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'sharpe_ratio'
        },
        {
          id: 'sortino_ratio',
          name: 'Sortino Ratio',
          description: 'Downside risk-adjusted return measure',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'sortino_ratio'
        },
        {
          id: 'max_drawdown',
          name: 'Maximum Drawdown',
          description: 'Maximum peak-to-trough decline',
          type: 'risk',
          enabled: true,
          calculation: 'max_drawdown'
        },
        {
          id: 'calmar_ratio',
          name: 'Calmar Ratio',
          description: 'Annualized return divided by max drawdown',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'calmar_ratio'
        },
        {
          id: 'information_ratio',
          name: 'Information Ratio',
          description: 'Excess return per unit of tracking error',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'information_ratio'
        }
      ];

      for (const metric of metrics) {
        this.performanceMetrics.set(metric.id, metric);
      }

      logger.info(`Loaded ${metrics.length} performance metrics`);
    } catch (error) {
      logger.error('Error loading performance metrics:', error);
    }
  }

  async analyzePerformance(data, user) {
    try {
      const { portfolio, benchmark, period, metrics } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        portfolio: portfolio,
        benchmark: benchmark,
        period: period || this.getDefaultPeriod(),
        metrics: metrics || this.getDefaultMetrics(),
        status: 'analyzing',
        createdAt: new Date(),
        results: null
      };

      this.analysisSessions.set(session.id, session);

      // Get portfolio returns
      const portfolioReturns = await this.getPortfolioReturns(session.portfolio, session.period);
      
      // Get benchmark returns if provided
      const benchmarkReturns = session.benchmark ? 
        await this.getBenchmarkReturns(session.benchmark, session.period) : null;
      
      // Calculate performance metrics
      const results = await this.calculatePerformanceMetrics(
        portfolioReturns, 
        benchmarkReturns, 
        session.metrics
      );
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeAnalysisResults(session);

      // Emit completion event
      this.emit('analysisComplete', {
        sessionId: session.id,
        userId: user.id,
        results: results
      });

      logger.info(`Performance analysis completed for user ${user.id}`);

      return {
        sessionId: session.id,
        results: results,
        summary: this.generatePerformanceSummary(results),
        recommendations: this.generatePerformanceRecommendations(results)
      };
    } catch (error) {
      logger.error('Performance analysis error:', error);
      throw error;
    }
  }

  async calculatePerformanceMetrics(portfolioReturns, benchmarkReturns, requestedMetrics) {
    try {
      const results = {
        portfolio: {},
        benchmark: benchmarkReturns ? {} : null,
        comparison: benchmarkReturns ? {} : null,
        calculatedAt: new Date()
      };

      // Calculate portfolio metrics
      for (const metricId of requestedMetrics) {
        const metric = this.performanceMetrics.get(metricId);
        if (!metric || !metric.enabled) continue;

        try {
          const value = await this.calculateMetric(metricId, portfolioReturns, benchmarkReturns);
          results.portfolio[metricId] = {
            name: metric.name,
            value: value,
            description: metric.description
          };
        } catch (error) {
          logger.error(`Error calculating metric ${metricId}:`, error);
        }
      }

      // Calculate benchmark metrics if benchmark provided
      if (benchmarkReturns) {
        for (const metricId of requestedMetrics) {
          const metric = this.performanceMetrics.get(metricId);
          if (!metric || !metric.enabled) continue;

          try {
            const value = await this.calculateMetric(metricId, benchmarkReturns, null);
            results.benchmark[metricId] = {
              name: metric.name,
              value: value,
              description: metric.description
            };
          } catch (error) {
            logger.error(`Error calculating benchmark metric ${metricId}:`, error);
          }
        }

        // Calculate comparison metrics
        results.comparison = this.calculateComparisonMetrics(results.portfolio, results.benchmark);
      }

      return results;
    } catch (error) {
      logger.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  async calculateMetric(metricId, returns, benchmarkReturns) {
    try {
      switch (metricId) {
        case 'total_return':
          return this.calculateTotalReturn(returns);
        case 'annualized_return':
          return this.calculateAnnualizedReturn(returns);
        case 'volatility':
          return this.calculateVolatility(returns);
        case 'sharpe_ratio':
          return this.calculateSharpeRatio(returns);
        case 'sortino_ratio':
          return this.calculateSortinoRatio(returns);
        case 'max_drawdown':
          return this.calculateMaxDrawdown(returns);
        case 'calmar_ratio':
          return this.calculateCalmarRatio(returns);
        case 'information_ratio':
          return this.calculateInformationRatio(returns, benchmarkReturns);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error calculating metric ${metricId}:`, error);
      return null;
    }
  }

  calculateTotalReturn(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    return totalReturn;
  }

  calculateAnnualizedReturn(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const totalReturn = this.calculateTotalReturn(returns);
    const periods = returns.length;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / periods) - 1;
    
    return annualizedReturn;
  }

  calculateVolatility(returns) {
    if (!returns || returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return volatility;
  }

  calculateSharpeRatio(returns) {
    if (!returns || returns.length < 2) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const volatility = this.calculateVolatility(returns);
    const riskFreeRate = 0.02; // 2% risk-free rate
    
    if (volatility === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  calculateSortinoRatio(returns) {
    if (!returns || returns.length < 2) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const downsideDeviation = this.calculateDownsideDeviation(returns);
    const riskFreeRate = 0.02; // 2% risk-free rate
    
    if (downsideDeviation === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / downsideDeviation;
  }

  calculateDownsideDeviation(returns) {
    if (!returns || returns.length < 2) return 0;
    
    const targetReturn = 0; // Target return of 0%
    const downsideReturns = returns.filter(ret => ret < targetReturn);
    
    if (downsideReturns.length === 0) return 0;
    
    const mean = downsideReturns.reduce((sum, ret) => sum + ret, 0) / downsideReturns.length;
    const variance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / downsideReturns.length;
    const downsideDeviation = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return downsideDeviation;
  }

  calculateMaxDrawdown(returns) {
    if (!returns || returns.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeReturn = 0;
    
    for (const ret of returns) {
      cumulativeReturn += ret;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = peak - cumulativeReturn;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  calculateCalmarRatio(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    if (maxDrawdown === 0) return 0;
    
    return annualizedReturn / maxDrawdown;
  }

  calculateInformationRatio(returns, benchmarkReturns) {
    if (!returns || !benchmarkReturns || returns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = returns.map((ret, index) => ret - benchmarkReturns[index]);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const trackingError = this.calculateVolatility(excessReturns);
    
    if (trackingError === 0) return 0;
    
    return meanExcessReturn / trackingError;
  }

  calculateComparisonMetrics(portfolioMetrics, benchmarkMetrics) {
    const comparison = {};
    
    for (const [metricId, portfolioMetric] of Object.entries(portfolioMetrics)) {
      const benchmarkMetric = benchmarkMetrics[metricId];
      if (!benchmarkMetric) continue;
      
      const difference = portfolioMetric.value - benchmarkMetric.value;
      const relativeDifference = benchmarkMetric.value !== 0 ? 
        (difference / Math.abs(benchmarkMetric.value)) * 100 : 0;
      
      comparison[metricId] = {
        difference: difference,
        relativeDifference: relativeDifference,
        outperformance: difference > 0
      };
    }
    
    return comparison;
  }

  generatePerformanceSummary(results) {
    const summary = {
      overall: 'neutral',
      strengths: [],
      weaknesses: [],
      keyMetrics: {}
    };
    
    // Analyze key metrics
    if (results.portfolio.sharpe_ratio) {
      const sharpe = results.portfolio.sharpe_ratio.value;
      if (sharpe > 1.0) {
        summary.strengths.push('Strong risk-adjusted returns');
        summary.overall = 'positive';
      } else if (sharpe < 0.5) {
        summary.weaknesses.push('Weak risk-adjusted returns');
        summary.overall = 'negative';
      }
    }
    
    if (results.portfolio.max_drawdown) {
      const maxDrawdown = results.portfolio.max_drawdown.value;
      if (maxDrawdown < 0.1) {
        summary.strengths.push('Low maximum drawdown');
      } else if (maxDrawdown > 0.2) {
        summary.weaknesses.push('High maximum drawdown');
      }
    }
    
    // Set key metrics
    summary.keyMetrics = {
      totalReturn: results.portfolio.total_return?.value || 0,
      annualizedReturn: results.portfolio.annualized_return?.value || 0,
      volatility: results.portfolio.volatility?.value || 0,
      sharpeRatio: results.portfolio.sharpe_ratio?.value || 0
    };
    
    return summary;
  }

  generatePerformanceRecommendations(results) {
    const recommendations = [];
    
    // Sharpe ratio recommendations
    if (results.portfolio.sharpe_ratio && results.portfolio.sharpe_ratio.value < 0.5) {
      recommendations.push({
        type: 'risk_adjustment',
        priority: 'high',
        description: 'Consider improving risk-adjusted returns through better diversification or risk management',
        metric: 'sharpe_ratio',
        currentValue: results.portfolio.sharpe_ratio.value,
        targetValue: 1.0
      });
    }
    
    // Volatility recommendations
    if (results.portfolio.volatility && results.portfolio.volatility.value > 0.2) {
      recommendations.push({
        type: 'risk_reduction',
        priority: 'medium',
        description: 'Consider reducing portfolio volatility through diversification',
        metric: 'volatility',
        currentValue: results.portfolio.volatility.value,
        targetValue: 0.15
      });
    }
    
    // Max drawdown recommendations
    if (results.portfolio.max_drawdown && results.portfolio.max_drawdown.value > 0.15) {
      recommendations.push({
        type: 'drawdown_management',
        priority: 'high',
        description: 'Implement better drawdown management strategies',
        metric: 'max_drawdown',
        currentValue: results.portfolio.max_drawdown.value,
        targetValue: 0.10
      });
    }
    
    return recommendations;
  }

  async getPerformanceMetrics(user) {
    try {
      const query = `
        SELECT id, portfolio_data, benchmark_data, period, metrics, results, created_at
        FROM performance_analyses
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      return result.rows.map(row => ({
        id: row.id,
        portfolio: row.portfolio_data,
        benchmark: row.benchmark_data,
        period: row.period,
        metrics: row.metrics,
        results: row.results,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error fetching performance metrics:', error);
      throw error;
    }
  }

  async runDailyAnalysis() {
    try {
      logger.info('Running daily performance analysis...');
      
      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        try {
          await this.analyzePerformance({
            portfolio: portfolio,
            period: this.getDefaultPeriod(),
            metrics: this.getDefaultMetrics()
          }, { id: portfolio.userId });
        } catch (error) {
          logger.error(`Error analyzing portfolio ${portfolio.id}:`, error);
        }
      }
      
      logger.info('Daily performance analysis completed');
    } catch (error) {
      logger.error('Error running daily analysis:', error);
    }
  }

  async getActivePortfolios() {
    // Mock implementation - in reality would query portfolio database
    return [];
  }

  getDefaultPeriod() {
    return {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      end: new Date()
    };
  }

  getDefaultMetrics() {
    return ['total_return', 'annualized_return', 'volatility', 'sharpe_ratio', 'max_drawdown'];
  }

  async getPortfolioReturns(portfolio, period) {
    // Mock implementation - in reality would query portfolio returns database
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02);
  }

  async getBenchmarkReturns(benchmark, period) {
    // Mock implementation - in reality would query benchmark returns database
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.015);
  }

  async storeAnalysisResults(session) {
    try {
      const query = `
        INSERT INTO performance_analyses (
          id, user_id, portfolio_data, benchmark_data, period, metrics, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        JSON.stringify(session.portfolio),
        JSON.stringify(session.benchmark),
        JSON.stringify(session.period),
        JSON.stringify(session.metrics),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing analysis results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.analysisSessions.clear();
      logger.info('Performance Analytics Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Performance Analytics Engine:', error);
    }
  }
}

module.exports = PerformanceAnalyticsEngine;

