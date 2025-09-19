const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class PortfolioAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.analyticsSessions = new Map();
    this.portfolioMetrics = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadPortfolioMetrics();
      logger.info('Portfolio Analytics Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Portfolio Analytics Service:', error);
      throw error;
    }
  }

  async loadPortfolioMetrics() {
    try {
      const metrics = [
        {
          id: 'portfolio_value',
          name: 'Portfolio Value',
          description: 'Total value of the portfolio',
          type: 'value',
          enabled: true,
          calculation: 'portfolio_value'
        },
        {
          id: 'portfolio_return',
          name: 'Portfolio Return',
          description: 'Total return of the portfolio',
          type: 'return',
          enabled: true,
          calculation: 'portfolio_return'
        },
        {
          id: 'portfolio_volatility',
          name: 'Portfolio Volatility',
          description: 'Volatility of the portfolio',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_volatility'
        },
        {
          id: 'portfolio_beta',
          name: 'Portfolio Beta',
          description: 'Beta of the portfolio relative to benchmark',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_beta'
        },
        {
          id: 'portfolio_alpha',
          name: 'Portfolio Alpha',
          description: 'Alpha of the portfolio relative to benchmark',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_alpha'
        },
        {
          id: 'portfolio_correlation',
          name: 'Portfolio Correlation',
          description: 'Correlation with benchmark',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_correlation'
        },
        {
          id: 'portfolio_tracking_error',
          name: 'Portfolio Tracking Error',
          description: 'Tracking error relative to benchmark',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_tracking_error'
        },
        {
          id: 'portfolio_information_ratio',
          name: 'Portfolio Information Ratio',
          description: 'Information ratio relative to benchmark',
          type: 'risk',
          enabled: true,
          calculation: 'portfolio_information_ratio'
        }
      ];

      for (const metric of metrics) {
        this.portfolioMetrics.set(metric.id, metric);
      }

      logger.info(`Loaded ${metrics.length} portfolio metrics`);
    } catch (error) {
      logger.error('Error loading portfolio metrics:', error);
    }
  }

  async analyzePortfolio(data, user) {
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

      this.analyticsSessions.set(session.id, session);

      // Get portfolio data
      const portfolioData = await this.getPortfolioData(session.portfolio, session.period);
      
      // Get benchmark data if provided
      const benchmarkData = session.benchmark ? 
        await this.getBenchmarkData(session.benchmark, session.period) : null;
      
      // Perform portfolio analysis
      const results = await this.performPortfolioAnalysis(
        portfolioData, 
        benchmarkData, 
        session.metrics
      );
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storePortfolioResults(session);

      // Emit completion event
      this.emit('portfolioAnalysisComplete', {
        sessionId: session.id,
        userId: user.id,
        results: results
      });

      logger.info(`Portfolio analysis completed for user ${user.id}`);

      return {
        sessionId: session.id,
        results: results,
        summary: this.generatePortfolioSummary(results),
        insights: this.generatePortfolioInsights(results)
      };
    } catch (error) {
      logger.error('Portfolio analysis error:', error);
      throw error;
    }
  }

  async performPortfolioAnalysis(portfolioData, benchmarkData, requestedMetrics) {
    try {
      const results = {
        portfolio: {},
        benchmark: benchmarkData ? {} : null,
        comparison: benchmarkData ? {} : null,
        calculatedAt: new Date()
      };

      // Calculate portfolio metrics
      for (const metricId of requestedMetrics) {
        const metric = this.portfolioMetrics.get(metricId);
        if (!metric || !metric.enabled) continue;

        try {
          const value = await this.calculatePortfolioMetric(
            metricId, 
            portfolioData, 
            benchmarkData
          );
          results.portfolio[metricId] = {
            name: metric.name,
            value: value,
            description: metric.description
          };
        } catch (error) {
          logger.error(`Error calculating portfolio metric ${metricId}:`, error);
        }
      }

      // Calculate benchmark metrics if benchmark provided
      if (benchmarkData) {
        for (const metricId of requestedMetrics) {
          const metric = this.portfolioMetrics.get(metricId);
          if (!metric || !metric.enabled) continue;

          try {
            const value = await this.calculatePortfolioMetric(
              metricId, 
              benchmarkData, 
              null
            );
            results.benchmark[metricId] = {
              name: metric.name,
              value: value,
              description: metric.description
            };
          } catch (error) {
            logger.error(`Error calculating benchmark portfolio metric ${metricId}:`, error);
          }
        }

        // Calculate comparison metrics
        results.comparison = this.calculatePortfolioComparison(results.portfolio, results.benchmark);
      }

      return results;
    } catch (error) {
      logger.error('Error performing portfolio analysis:', error);
      throw error;
    }
  }

  async calculatePortfolioMetric(metricId, portfolioData, benchmarkData) {
    try {
      switch (metricId) {
        case 'portfolio_value':
          return this.calculatePortfolioValue(portfolioData);
        case 'portfolio_return':
          return this.calculatePortfolioReturn(portfolioData);
        case 'portfolio_volatility':
          return this.calculatePortfolioVolatility(portfolioData);
        case 'portfolio_beta':
          return this.calculatePortfolioBeta(portfolioData, benchmarkData);
        case 'portfolio_alpha':
          return this.calculatePortfolioAlpha(portfolioData, benchmarkData);
        case 'portfolio_correlation':
          return this.calculatePortfolioCorrelation(portfolioData, benchmarkData);
        case 'portfolio_tracking_error':
          return this.calculatePortfolioTrackingError(portfolioData, benchmarkData);
        case 'portfolio_information_ratio':
          return this.calculatePortfolioInformationRatio(portfolioData, benchmarkData);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error calculating portfolio metric ${metricId}:`, error);
      return null;
    }
  }

  calculatePortfolioValue(portfolioData) {
    if (!portfolioData || !portfolioData.positions) return 0;
    
    return portfolioData.positions.reduce((sum, position) => sum + position.currentValue, 0);
  }

  calculatePortfolioReturn(portfolioData) {
    if (!portfolioData || !portfolioData.returns) return 0;
    
    return portfolioData.returns.reduce((sum, ret) => sum + ret, 0);
  }

  calculatePortfolioVolatility(portfolioData) {
    if (!portfolioData || !portfolioData.returns || portfolioData.returns.length < 2) return 0;
    
    const returns = portfolioData.returns;
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return volatility;
  }

  calculatePortfolioBeta(portfolioData, benchmarkData) {
    if (!portfolioData || !benchmarkData || !portfolioData.returns || !benchmarkData.returns) return 0;
    
    const portfolioReturns = portfolioData.returns;
    const benchmarkReturns = benchmarkData.returns;
    
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    if (benchmarkVariance === 0) return 0;
    
    return covariance / benchmarkVariance;
  }

  calculatePortfolioAlpha(portfolioData, benchmarkData) {
    if (!portfolioData || !benchmarkData || !portfolioData.returns || !benchmarkData.returns) return 0;
    
    const portfolioReturns = portfolioData.returns;
    const benchmarkReturns = benchmarkData.returns;
    
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const portfolioReturn = this.calculatePortfolioReturn(portfolioData);
    const benchmarkReturn = this.calculatePortfolioReturn(benchmarkData);
    const beta = this.calculatePortfolioBeta(portfolioData, benchmarkData);
    const riskFreeRate = 0.02; // 2% risk-free rate
    
    return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  calculatePortfolioCorrelation(portfolioData, benchmarkData) {
    if (!portfolioData || !benchmarkData || !portfolioData.returns || !benchmarkData.returns) return 0;
    
    const portfolioReturns = portfolioData.returns;
    const benchmarkReturns = benchmarkData.returns;
    
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let portfolioVariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      portfolioVariance += portfolioDiff * portfolioDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    const denominator = Math.sqrt(portfolioVariance * benchmarkVariance);
    
    if (denominator === 0) return 0;
    
    return covariance / denominator;
  }

  calculatePortfolioTrackingError(portfolioData, benchmarkData) {
    if (!portfolioData || !benchmarkData || !portfolioData.returns || !benchmarkData.returns) return 0;
    
    const portfolioReturns = portfolioData.returns;
    const benchmarkReturns = benchmarkData.returns;
    
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = portfolioReturns.map((ret, index) => ret - benchmarkReturns[index]);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const variance = excessReturns.reduce((sum, ret) => sum + Math.pow(ret - meanExcessReturn, 2), 0) / (excessReturns.length - 1);
    const trackingError = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return trackingError;
  }

  calculatePortfolioInformationRatio(portfolioData, benchmarkData) {
    if (!portfolioData || !benchmarkData || !portfolioData.returns || !benchmarkData.returns) return 0;
    
    const portfolioReturns = portfolioData.returns;
    const benchmarkReturns = benchmarkData.returns;
    
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = portfolioReturns.map((ret, index) => ret - benchmarkReturns[index]);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const trackingError = this.calculatePortfolioTrackingError(portfolioData, benchmarkData);
    
    if (trackingError === 0) return 0;
    
    return meanExcessReturn / trackingError;
  }

  calculatePortfolioComparison(portfolioMetrics, benchmarkMetrics) {
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

  generatePortfolioSummary(results) {
    const summary = {
      overall: 'neutral',
      strengths: [],
      weaknesses: [],
      keyMetrics: {}
    };
    
    // Analyze key metrics
    if (results.portfolio.portfolio_return) {
      const returnValue = results.portfolio.portfolio_return.value;
      if (returnValue > 0.1) {
        summary.strengths.push('Strong portfolio returns');
        summary.overall = 'positive';
      } else if (returnValue < -0.05) {
        summary.weaknesses.push('Negative portfolio returns');
        summary.overall = 'negative';
      }
    }
    
    if (results.portfolio.portfolio_volatility) {
      const volatility = results.portfolio.portfolio_volatility.value;
      if (volatility < 0.15) {
        summary.strengths.push('Low portfolio volatility');
      } else if (volatility > 0.25) {
        summary.weaknesses.push('High portfolio volatility');
      }
    }
    
    if (results.portfolio.portfolio_beta) {
      const beta = results.portfolio.portfolio_beta.value;
      if (beta > 0.8 && beta < 1.2) {
        summary.strengths.push('Well-balanced portfolio beta');
      } else if (beta > 1.5) {
        summary.weaknesses.push('High portfolio beta');
      } else if (beta < 0.5) {
        summary.weaknesses.push('Low portfolio beta');
      }
    }
    
    // Set key metrics
    summary.keyMetrics = {
      portfolioValue: results.portfolio.portfolio_value?.value || 0,
      portfolioReturn: results.portfolio.portfolio_return?.value || 0,
      portfolioVolatility: results.portfolio.portfolio_volatility?.value || 0,
      portfolioBeta: results.portfolio.portfolio_beta?.value || 0,
      portfolioAlpha: results.portfolio.portfolio_alpha?.value || 0,
      portfolioCorrelation: results.portfolio.portfolio_correlation?.value || 0,
      portfolioTrackingError: results.portfolio.portfolio_tracking_error?.value || 0,
      portfolioInformationRatio: results.portfolio.portfolio_information_ratio?.value || 0
    };
    
    return summary;
  }

  generatePortfolioInsights(results) {
    const insights = [];
    
    // Return insights
    if (results.portfolio.portfolio_return) {
      const returnValue = results.portfolio.portfolio_return.value;
      if (returnValue > 0.1) {
        insights.push({
          type: 'return',
          insight: 'Portfolio shows strong returns',
          value: returnValue,
          recommendation: 'Consider maintaining current strategy'
        });
      } else if (returnValue < -0.05) {
        insights.push({
          type: 'return',
          insight: 'Portfolio shows negative returns',
          value: returnValue,
          recommendation: 'Review and adjust investment strategy'
        });
      }
    }
    
    // Volatility insights
    if (results.portfolio.portfolio_volatility) {
      const volatility = results.portfolio.portfolio_volatility.value;
      if (volatility > 0.25) {
        insights.push({
          type: 'volatility',
          insight: 'Portfolio has high volatility',
          value: volatility,
          recommendation: 'Consider reducing portfolio risk'
        });
      } else if (volatility < 0.1) {
        insights.push({
          type: 'volatility',
          insight: 'Portfolio has low volatility',
          value: volatility,
          recommendation: 'Consider increasing portfolio risk for better returns'
        });
      }
    }
    
    // Beta insights
    if (results.portfolio.portfolio_beta) {
      const beta = results.portfolio.portfolio_beta.value;
      if (beta > 1.5) {
        insights.push({
          type: 'beta',
          insight: 'Portfolio is highly correlated with market',
          value: beta,
          recommendation: 'Consider reducing market exposure'
        });
      } else if (beta < 0.5) {
        insights.push({
          type: 'beta',
          insight: 'Portfolio is lowly correlated with market',
          value: beta,
          recommendation: 'Consider increasing market exposure'
        });
      }
    }
    
    // Alpha insights
    if (results.portfolio.portfolio_alpha) {
      const alpha = results.portfolio.portfolio_alpha.value;
      if (alpha > 0.02) {
        insights.push({
          type: 'alpha',
          insight: 'Portfolio generates positive alpha',
          value: alpha,
          recommendation: 'Current strategy adds value'
        });
      } else if (alpha < -0.02) {
        insights.push({
          type: 'alpha',
          insight: 'Portfolio generates negative alpha',
          value: alpha,
          recommendation: 'Review strategy for value creation'
        });
      }
    }
    
    return insights;
  }

  async getPortfolioSummary(user) {
    try {
      const query = `
        SELECT id, portfolio_data, benchmark_data, period, results, created_at
        FROM portfolio_analyses
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        portfolio: row.portfolio_data,
        benchmark: row.benchmark_data,
        period: row.period,
        results: row.results,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Error fetching portfolio summary:', error);
      throw error;
    }
  }

  async runWeeklyAnalysis() {
    try {
      logger.info('Running weekly portfolio analysis...');
      
      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        try {
          await this.analyzePortfolio({
            portfolio: portfolio,
            benchmark: portfolio.benchmark,
            period: this.getDefaultPeriod(),
            metrics: this.getDefaultMetrics()
          }, { id: portfolio.userId });
        } catch (error) {
          logger.error(`Error analyzing portfolio ${portfolio.id}:`, error);
        }
      }
      
      logger.info('Weekly portfolio analysis completed');
    } catch (error) {
      logger.error('Error running weekly portfolio analysis:', error);
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
    return ['portfolio_value', 'portfolio_return', 'portfolio_volatility', 'portfolio_beta', 'portfolio_alpha'];
  }

  async getPortfolioData(portfolio, period) {
    // Mock implementation - in reality would query portfolio database
    return {
      positions: [
        { symbol: 'AAPL', currentValue: 10000, weight: 0.3 },
        { symbol: 'MSFT', currentValue: 15000, weight: 0.4 },
        { symbol: 'GOOGL', currentValue: 8000, weight: 0.3 }
      ],
      returns: Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02)
    };
  }

  async getBenchmarkData(benchmark, period) {
    // Mock implementation - in reality would query benchmark database
    return {
      returns: Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.015)
    };
  }

  async storePortfolioResults(session) {
    try {
      const query = `
        INSERT INTO portfolio_analyses (
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
      logger.error('Error storing portfolio results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.analyticsSessions.clear();
      logger.info('Portfolio Analytics Service closed successfully');
    } catch (error) {
      logger.error('Error closing Portfolio Analytics Service:', error);
    }
  }
}

module.exports = PortfolioAnalyticsService;

