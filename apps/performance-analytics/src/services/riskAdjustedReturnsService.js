const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class RiskAdjustedReturnsService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.riskAdjustedSessions = new Map();
    this.riskMetrics = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadRiskMetrics();
      logger.info('Risk-Adjusted Returns Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Risk-Adjusted Returns Service:', error);
      throw error;
    }
  }

  async loadRiskMetrics() {
    try {
      const metrics = [
        {
          id: 'sharpe_ratio',
          name: 'Sharpe Ratio',
          description: 'Risk-adjusted return measure using total risk',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'sharpe_ratio'
        },
        {
          id: 'sortino_ratio',
          name: 'Sortino Ratio',
          description: 'Risk-adjusted return measure using downside risk',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'sortino_ratio'
        },
        {
          id: 'calmar_ratio',
          name: 'Calmar Ratio',
          description: 'Annualized return divided by maximum drawdown',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'calmar_ratio'
        },
        {
          id: 'sterling_ratio',
          name: 'Sterling Ratio',
          description: 'Annualized return divided by average drawdown',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'sterling_ratio'
        },
        {
          id: 'burke_ratio',
          name: 'Burke Ratio',
          description: 'Annualized return divided by square root of sum of squared drawdowns',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'burke_ratio'
        },
        {
          id: 'kappa_ratio',
          name: 'Kappa Ratio',
          description: 'Risk-adjusted return measure using lower partial moments',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'kappa_ratio'
        },
        {
          id: 'omega_ratio',
          name: 'Omega Ratio',
          description: 'Ratio of gains to losses above a threshold',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'omega_ratio'
        },
        {
          id: 'treynor_ratio',
          name: 'Treynor Ratio',
          description: 'Risk-adjusted return measure using systematic risk',
          type: 'risk_adjusted',
          enabled: true,
          calculation: 'treynor_ratio'
        }
      ];

      for (const metric of metrics) {
        this.riskMetrics.set(metric.id, metric);
      }

      logger.info(`Loaded ${metrics.length} risk-adjusted return metrics`);
    } catch (error) {
      logger.error('Error loading risk metrics:', error);
    }
  }

  async calculateRiskAdjustedReturns(data, user) {
    try {
      const { portfolio, benchmark, period, metrics, riskFreeRate } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        portfolio: portfolio,
        benchmark: benchmark,
        period: period || this.getDefaultPeriod(),
        metrics: metrics || this.getDefaultMetrics(),
        riskFreeRate: riskFreeRate || 0.02,
        status: 'calculating',
        createdAt: new Date(),
        results: null
      };

      this.riskAdjustedSessions.set(session.id, session);

      // Get portfolio returns
      const portfolioReturns = await this.getPortfolioReturns(session.portfolio, session.period);
      
      // Get benchmark returns if provided
      const benchmarkReturns = session.benchmark ? 
        await this.getBenchmarkReturns(session.benchmark, session.period) : null;
      
      // Calculate risk-adjusted returns
      const results = await this.calculateRiskAdjustedMetrics(
        portfolioReturns, 
        benchmarkReturns, 
        session.metrics,
        session.riskFreeRate
      );
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeRiskAdjustedResults(session);

      // Emit completion event
      this.emit('riskAdjustedComplete', {
        sessionId: session.id,
        userId: user.id,
        results: results
      });

      logger.info(`Risk-adjusted returns calculation completed for user ${user.id}`);

      return {
        sessionId: session.id,
        results: results,
        summary: this.generateRiskAdjustedSummary(results),
        insights: this.generateRiskAdjustedInsights(results)
      };
    } catch (error) {
      logger.error('Risk-adjusted returns calculation error:', error);
      throw error;
    }
  }

  async calculateRiskAdjustedMetrics(portfolioReturns, benchmarkReturns, requestedMetrics, riskFreeRate) {
    try {
      const results = {
        portfolio: {},
        benchmark: benchmarkReturns ? {} : null,
        comparison: benchmarkReturns ? {} : null,
        calculatedAt: new Date()
      };

      // Calculate portfolio metrics
      for (const metricId of requestedMetrics) {
        const metric = this.riskMetrics.get(metricId);
        if (!metric || !metric.enabled) continue;

        try {
          const value = await this.calculateRiskAdjustedMetric(
            metricId, 
            portfolioReturns, 
            benchmarkReturns, 
            riskFreeRate
          );
          results.portfolio[metricId] = {
            name: metric.name,
            value: value,
            description: metric.description
          };
        } catch (error) {
          logger.error(`Error calculating risk-adjusted metric ${metricId}:`, error);
        }
      }

      // Calculate benchmark metrics if benchmark provided
      if (benchmarkReturns) {
        for (const metricId of requestedMetrics) {
          const metric = this.riskMetrics.get(metricId);
          if (!metric || !metric.enabled) continue;

          try {
            const value = await this.calculateRiskAdjustedMetric(
              metricId, 
              benchmarkReturns, 
              null, 
              riskFreeRate
            );
            results.benchmark[metricId] = {
              name: metric.name,
              value: value,
              description: metric.description
            };
          } catch (error) {
            logger.error(`Error calculating benchmark risk-adjusted metric ${metricId}:`, error);
          }
        }

        // Calculate comparison metrics
        results.comparison = this.calculateRiskAdjustedComparison(results.portfolio, results.benchmark);
      }

      return results;
    } catch (error) {
      logger.error('Error calculating risk-adjusted metrics:', error);
      throw error;
    }
  }

  async calculateRiskAdjustedMetric(metricId, returns, benchmarkReturns, riskFreeRate) {
    try {
      switch (metricId) {
        case 'sharpe_ratio':
          return this.calculateSharpeRatio(returns, riskFreeRate);
        case 'sortino_ratio':
          return this.calculateSortinoRatio(returns, riskFreeRate);
        case 'calmar_ratio':
          return this.calculateCalmarRatio(returns);
        case 'sterling_ratio':
          return this.calculateSterlingRatio(returns);
        case 'burke_ratio':
          return this.calculateBurkeRatio(returns);
        case 'kappa_ratio':
          return this.calculateKappaRatio(returns, riskFreeRate);
        case 'omega_ratio':
          return this.calculateOmegaRatio(returns, riskFreeRate);
        case 'treynor_ratio':
          return this.calculateTreynorRatio(returns, benchmarkReturns, riskFreeRate);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error calculating risk-adjusted metric ${metricId}:`, error);
      return null;
    }
  }

  calculateSharpeRatio(returns, riskFreeRate) {
    if (!returns || returns.length < 2) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const volatility = this.calculateVolatility(returns);
    
    if (volatility === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  calculateSortinoRatio(returns, riskFreeRate) {
    if (!returns || returns.length < 2) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const downsideDeviation = this.calculateDownsideDeviation(returns);
    
    if (downsideDeviation === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / downsideDeviation;
  }

  calculateCalmarRatio(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    if (maxDrawdown === 0) return 0;
    
    return annualizedReturn / maxDrawdown;
  }

  calculateSterlingRatio(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const averageDrawdown = this.calculateAverageDrawdown(returns);
    
    if (averageDrawdown === 0) return 0;
    
    return annualizedReturn / averageDrawdown;
  }

  calculateBurkeRatio(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const sumSquaredDrawdowns = this.calculateSumSquaredDrawdowns(returns);
    
    if (sumSquaredDrawdowns === 0) return 0;
    
    return annualizedReturn / Math.sqrt(sumSquaredDrawdowns);
  }

  calculateKappaRatio(returns, riskFreeRate, order = 2) {
    if (!returns || returns.length < 2) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const lowerPartialMoment = this.calculateLowerPartialMoment(returns, riskFreeRate, order);
    
    if (lowerPartialMoment === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / Math.pow(lowerPartialMoment, 1 / order);
  }

  calculateOmegaRatio(returns, threshold) {
    if (!returns || returns.length === 0) return 0;
    
    const gains = returns.filter(ret => ret > threshold).reduce((sum, ret) => sum + (ret - threshold), 0);
    const losses = returns.filter(ret => ret < threshold).reduce((sum, ret) => sum + (threshold - ret), 0);
    
    if (losses === 0) return gains > 0 ? Infinity : 0;
    
    return gains / losses;
  }

  calculateTreynorRatio(returns, benchmarkReturns, riskFreeRate) {
    if (!returns || !benchmarkReturns || returns.length !== benchmarkReturns.length) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const beta = this.calculateBeta(returns, benchmarkReturns);
    
    if (beta === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / beta;
  }

  calculateAnnualizedReturn(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
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

  calculateAverageDrawdown(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const drawdowns = this.calculateDrawdowns(returns);
    
    if (drawdowns.length === 0) return 0;
    
    return drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length;
  }

  calculateDrawdowns(returns) {
    if (!returns || returns.length === 0) return [];
    
    const drawdowns = [];
    let peak = 0;
    let cumulativeReturn = 0;
    
    for (const ret of returns) {
      cumulativeReturn += ret;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = peak - cumulativeReturn;
      drawdowns.push(drawdown);
    }
    
    return drawdowns;
  }

  calculateSumSquaredDrawdowns(returns) {
    const drawdowns = this.calculateDrawdowns(returns);
    return drawdowns.reduce((sum, dd) => sum + dd * dd, 0);
  }

  calculateLowerPartialMoment(returns, threshold, order) {
    if (!returns || returns.length === 0) return 0;
    
    const belowThreshold = returns.filter(ret => ret < threshold);
    
    if (belowThreshold.length === 0) return 0;
    
    const moment = belowThreshold.reduce((sum, ret) => sum + Math.pow(threshold - ret, order), 0) / belowThreshold.length;
    
    return moment;
  }

  calculateBeta(returns, benchmarkReturns) {
    if (!returns || !benchmarkReturns || returns.length !== benchmarkReturns.length) return 0;
    
    const returnsMean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < returns.length; i++) {
      const returnsDiff = returns[i] - returnsMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += returnsDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    if (benchmarkVariance === 0) return 0;
    
    return covariance / benchmarkVariance;
  }

  calculateRiskAdjustedComparison(portfolioMetrics, benchmarkMetrics) {
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

  generateRiskAdjustedSummary(results) {
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
        summary.strengths.push('Strong Sharpe ratio');
        summary.overall = 'positive';
      } else if (sharpe < 0.5) {
        summary.weaknesses.push('Weak Sharpe ratio');
        summary.overall = 'negative';
      }
    }
    
    if (results.portfolio.sortino_ratio) {
      const sortino = results.portfolio.sortino_ratio.value;
      if (sortino > 1.5) {
        summary.strengths.push('Strong Sortino ratio');
      } else if (sortino < 0.5) {
        summary.weaknesses.push('Weak Sortino ratio');
      }
    }
    
    if (results.portfolio.calmar_ratio) {
      const calmar = results.portfolio.calmar_ratio.value;
      if (calmar > 1.0) {
        summary.strengths.push('Strong Calmar ratio');
      } else if (calmar < 0.5) {
        summary.weaknesses.push('Weak Calmar ratio');
      }
    }
    
    // Set key metrics
    summary.keyMetrics = {
      sharpeRatio: results.portfolio.sharpe_ratio?.value || 0,
      sortinoRatio: results.portfolio.sortino_ratio?.value || 0,
      calmarRatio: results.portfolio.calmar_ratio?.value || 0,
      sterlingRatio: results.portfolio.sterling_ratio?.value || 0,
      burkeRatio: results.portfolio.burke_ratio?.value || 0,
      kappaRatio: results.portfolio.kappa_ratio?.value || 0,
      omegaRatio: results.portfolio.omega_ratio?.value || 0,
      treynorRatio: results.portfolio.treynor_ratio?.value || 0
    };
    
    return summary;
  }

  generateRiskAdjustedInsights(results) {
    const insights = [];
    
    // Sharpe ratio insights
    if (results.portfolio.sharpe_ratio) {
      const sharpe = results.portfolio.sharpe_ratio.value;
      if (sharpe > 1.0) {
        insights.push({
          type: 'sharpe_ratio',
          insight: 'Excellent risk-adjusted returns',
          value: sharpe,
          recommendation: 'Continue current strategy'
        });
      } else if (sharpe < 0.5) {
        insights.push({
          type: 'sharpe_ratio',
          insight: 'Poor risk-adjusted returns',
          value: sharpe,
          recommendation: 'Improve risk management or return generation'
        });
      }
    }
    
    // Sortino ratio insights
    if (results.portfolio.sortino_ratio) {
      const sortino = results.portfolio.sortino_ratio.value;
      if (sortino > 1.5) {
        insights.push({
          type: 'sortino_ratio',
          insight: 'Excellent downside risk management',
          value: sortino,
          recommendation: 'Current strategy effectively manages downside risk'
        });
      } else if (sortino < 0.5) {
        insights.push({
          type: 'sortino_ratio',
          insight: 'Poor downside risk management',
          value: sortino,
          recommendation: 'Focus on reducing downside volatility'
        });
      }
    }
    
    // Calmar ratio insights
    if (results.portfolio.calmar_ratio) {
      const calmar = results.portfolio.calmar_ratio.value;
      if (calmar > 1.0) {
        insights.push({
          type: 'calmar_ratio',
          insight: 'Strong drawdown-adjusted returns',
          value: calmar,
          recommendation: 'Portfolio effectively manages drawdowns'
        });
      } else if (calmar < 0.5) {
        insights.push({
          type: 'calmar_ratio',
          insight: 'Weak drawdown-adjusted returns',
          value: calmar,
          recommendation: 'Improve drawdown management'
        });
      }
    }
    
    return insights;
  }

  async getRiskAdjustedHistory(user) {
    try {
      const query = `
        SELECT id, portfolio_data, benchmark_data, period, metrics, results, created_at
        FROM risk_adjusted_returns
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
      logger.error('Error fetching risk-adjusted history:', error);
      throw error;
    }
  }

  async runDailyRiskAdjusted() {
    try {
      logger.info('Running daily risk-adjusted returns calculation...');
      
      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        try {
          await this.calculateRiskAdjustedReturns({
            portfolio: portfolio,
            benchmark: portfolio.benchmark,
            period: this.getDefaultPeriod(),
            metrics: this.getDefaultMetrics()
          }, { id: portfolio.userId });
        } catch (error) {
          logger.error(`Error calculating risk-adjusted returns for portfolio ${portfolio.id}:`, error);
        }
      }
      
      logger.info('Daily risk-adjusted returns calculation completed');
    } catch (error) {
      logger.error('Error running daily risk-adjusted calculation:', error);
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
    return ['sharpe_ratio', 'sortino_ratio', 'calmar_ratio', 'sterling_ratio', 'burke_ratio'];
  }

  async getPortfolioReturns(portfolio, period) {
    // Mock implementation - in reality would query portfolio returns database
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02);
  }

  async getBenchmarkReturns(benchmark, period) {
    // Mock implementation - in reality would query benchmark returns database
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.015);
  }

  async storeRiskAdjustedResults(session) {
    try {
      const query = `
        INSERT INTO risk_adjusted_returns (
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
      logger.error('Error storing risk-adjusted results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.riskAdjustedSessions.clear();
      logger.info('Risk-Adjusted Returns Service closed successfully');
    } catch (error) {
      logger.error('Error closing Risk-Adjusted Returns Service:', error);
    }
  }
}

module.exports = RiskAdjustedReturnsService;

