const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class BenchmarkComparisonService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.comparisonSessions = new Map();
    this.availableBenchmarks = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadAvailableBenchmarks();
      logger.info('Benchmark Comparison Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Benchmark Comparison Service:', error);
      throw error;
    }
  }

  async loadAvailableBenchmarks() {
    try {
      const benchmarks = [
        {
          id: 'sp500',
          name: 'S&P 500',
          description: 'Standard & Poor\'s 500 Index',
          type: 'equity',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: '^GSPC',
            currency: 'USD'
          }
        },
        {
          id: 'nasdaq',
          name: 'NASDAQ Composite',
          description: 'NASDAQ Composite Index',
          type: 'equity',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: '^IXIC',
            currency: 'USD'
          }
        },
        {
          id: 'dow_jones',
          name: 'Dow Jones Industrial Average',
          description: 'Dow Jones Industrial Average',
          type: 'equity',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: '^DJI',
            currency: 'USD'
          }
        },
        {
          id: 'russell_2000',
          name: 'Russell 2000',
          description: 'Russell 2000 Small Cap Index',
          type: 'equity',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: '^RUT',
            currency: 'USD'
          }
        },
        {
          id: 'msci_world',
          name: 'MSCI World',
          description: 'MSCI World Index',
          type: 'equity',
          region: 'global',
          enabled: true,
          parameters: {
            symbol: 'MSCI_WORLD',
            currency: 'USD'
          }
        },
        {
          id: 'msci_em',
          name: 'MSCI Emerging Markets',
          description: 'MSCI Emerging Markets Index',
          type: 'equity',
          region: 'emerging',
          enabled: true,
          parameters: {
            symbol: 'MSCI_EM',
            currency: 'USD'
          }
        },
        {
          id: 'barclays_agg',
          name: 'Barclays Aggregate Bond',
          description: 'Barclays U.S. Aggregate Bond Index',
          type: 'bond',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: 'AGG',
            currency: 'USD'
          }
        },
        {
          id: 'treasury_10y',
          name: '10-Year Treasury',
          description: '10-Year U.S. Treasury Bond',
          type: 'bond',
          region: 'us',
          enabled: true,
          parameters: {
            symbol: '^TNX',
            currency: 'USD'
          }
        }
      ];

      for (const benchmark of benchmarks) {
        this.availableBenchmarks.set(benchmark.id, benchmark);
      }

      logger.info(`Loaded ${benchmarks.length} available benchmarks`);
    } catch (error) {
      logger.error('Error loading available benchmarks:', error);
    }
  }

  async compareWithBenchmark(data, user) {
    try {
      const { portfolio, benchmark, period, metrics } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        portfolio: portfolio,
        benchmark: benchmark,
        period: period || this.getDefaultPeriod(),
        metrics: metrics || this.getDefaultMetrics(),
        status: 'comparing',
        createdAt: new Date(),
        results: null
      };

      this.comparisonSessions.set(session.id, session);

      // Get portfolio returns
      const portfolioReturns = await this.getPortfolioReturns(session.portfolio, session.period);
      
      // Get benchmark returns
      const benchmarkReturns = await this.getBenchmarkReturns(session.benchmark, session.period);
      
      // Perform comparison
      const results = await this.performComparison(
        portfolioReturns, 
        benchmarkReturns, 
        session.metrics
      );
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeComparisonResults(session);

      // Emit completion event
      this.emit('comparisonComplete', {
        sessionId: session.id,
        userId: user.id,
        results: results
      });

      logger.info(`Benchmark comparison completed for user ${user.id}`);

      return {
        sessionId: session.id,
        benchmark: session.benchmark,
        results: results,
        summary: this.generateComparisonSummary(results),
        insights: this.generateComparisonInsights(results)
      };
    } catch (error) {
      logger.error('Benchmark comparison error:', error);
      throw error;
    }
  }

  async performComparison(portfolioReturns, benchmarkReturns, requestedMetrics) {
    try {
      const results = {
        portfolio: {},
        benchmark: {},
        comparison: {},
        calculatedAt: new Date()
      };

      // Calculate portfolio metrics
      for (const metricId of requestedMetrics) {
        try {
          const portfolioValue = await this.calculateMetric(metricId, portfolioReturns);
          const benchmarkValue = await this.calculateMetric(metricId, benchmarkReturns);
          
          results.portfolio[metricId] = portfolioValue;
          results.benchmark[metricId] = benchmarkValue;
          
          // Calculate comparison metrics
          results.comparison[metricId] = {
            difference: portfolioValue - benchmarkValue,
            relativeDifference: benchmarkValue !== 0 ? 
              ((portfolioValue - benchmarkValue) / Math.abs(benchmarkValue)) * 100 : 0,
            outperformance: portfolioValue > benchmarkValue
          };
        } catch (error) {
          logger.error(`Error calculating metric ${metricId}:`, error);
        }
      }

      // Calculate additional comparison metrics
      results.comparison.trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
      results.comparison.informationRatio = this.calculateInformationRatio(portfolioReturns, benchmarkReturns);
      results.comparison.beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
      results.comparison.correlation = this.calculateCorrelation(portfolioReturns, benchmarkReturns);

      return results;
    } catch (error) {
      logger.error('Error performing comparison:', error);
      throw error;
    }
  }

  async calculateMetric(metricId, returns) {
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
        case 'max_drawdown':
          return this.calculateMaxDrawdown(returns);
        case 'calmar_ratio':
          return this.calculateCalmarRatio(returns);
        case 'sortino_ratio':
          return this.calculateSortinoRatio(returns);
        default:
          return 0;
      }
    } catch (error) {
      logger.error(`Error calculating metric ${metricId}:`, error);
      return 0;
    }
  }

  calculateTotalReturn(returns) {
    if (!returns || returns.length === 0) return 0;
    
    return returns.reduce((sum, ret) => sum + ret, 0);
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

  calculateTrackingError(portfolioReturns, benchmarkReturns) {
    if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = portfolioReturns.map((ret, index) => ret - benchmarkReturns[index]);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const variance = excessReturns.reduce((sum, ret) => sum + Math.pow(ret - meanExcessReturn, 2), 0) / (excessReturns.length - 1);
    const trackingError = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return trackingError;
  }

  calculateInformationRatio(portfolioReturns, benchmarkReturns) {
    if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = portfolioReturns.map((ret, index) => ret - benchmarkReturns[index]);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
    
    if (trackingError === 0) return 0;
    
    return meanExcessReturn / trackingError;
  }

  calculateBeta(portfolioReturns, benchmarkReturns) {
    if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length !== benchmarkReturns.length) return 0;
    
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

  calculateCorrelation(portfolioReturns, benchmarkReturns) {
    if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length !== benchmarkReturns.length) return 0;
    
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

  generateComparisonSummary(results) {
    const summary = {
      overall: 'neutral',
      strengths: [],
      weaknesses: [],
      keyMetrics: {}
    };
    
    // Analyze key metrics
    if (results.comparison.annualized_return) {
      const returnDiff = results.comparison.annualized_return.difference;
      if (returnDiff > 0.02) {
        summary.strengths.push('Strong outperformance vs benchmark');
        summary.overall = 'positive';
      } else if (returnDiff < -0.02) {
        summary.weaknesses.push('Underperformance vs benchmark');
        summary.overall = 'negative';
      }
    }
    
    if (results.comparison.sharpe_ratio) {
      const sharpeDiff = results.comparison.sharpe_ratio.difference;
      if (sharpeDiff > 0.1) {
        summary.strengths.push('Better risk-adjusted returns');
      } else if (sharpeDiff < -0.1) {
        summary.weaknesses.push('Worse risk-adjusted returns');
      }
    }
    
    if (results.comparison.max_drawdown) {
      const drawdownDiff = results.comparison.max_drawdown.difference;
      if (drawdownDiff < -0.05) {
        summary.strengths.push('Lower maximum drawdown');
      } else if (drawdownDiff > 0.05) {
        summary.weaknesses.push('Higher maximum drawdown');
      }
    }
    
    // Set key metrics
    summary.keyMetrics = {
      portfolioReturn: results.portfolio.annualized_return || 0,
      benchmarkReturn: results.benchmark.annualized_return || 0,
      excessReturn: results.comparison.annualized_return?.difference || 0,
      trackingError: results.comparison.trackingError || 0,
      informationRatio: results.comparison.informationRatio || 0,
      beta: results.comparison.beta || 0,
      correlation: results.comparison.correlation || 0
    };
    
    return summary;
  }

  generateComparisonInsights(results) {
    const insights = [];
    
    // Return insights
    if (results.comparison.annualized_return) {
      const returnDiff = results.comparison.annualized_return.difference;
      if (returnDiff > 0.02) {
        insights.push({
          type: 'return',
          insight: 'Portfolio significantly outperforms benchmark',
          value: returnDiff,
          recommendation: 'Consider maintaining current strategy'
        });
      } else if (returnDiff < -0.02) {
        insights.push({
          type: 'return',
          insight: 'Portfolio underperforms benchmark',
          value: returnDiff,
          recommendation: 'Review and adjust investment strategy'
        });
      }
    }
    
    // Risk insights
    if (results.comparison.volatility) {
      const volatilityDiff = results.comparison.volatility.difference;
      if (volatilityDiff > 0.05) {
        insights.push({
          type: 'risk',
          insight: 'Portfolio has higher volatility than benchmark',
          value: volatilityDiff,
          recommendation: 'Consider reducing portfolio risk'
        });
      } else if (volatilityDiff < -0.05) {
        insights.push({
          type: 'risk',
          insight: 'Portfolio has lower volatility than benchmark',
          value: volatilityDiff,
          recommendation: 'Consider increasing portfolio risk for better returns'
        });
      }
    }
    
    // Beta insights
    if (results.comparison.beta) {
      const beta = results.comparison.beta;
      if (beta > 1.2) {
        insights.push({
          type: 'beta',
          insight: 'Portfolio is more volatile than benchmark',
          value: beta,
          recommendation: 'Consider reducing portfolio beta'
        });
      } else if (beta < 0.8) {
        insights.push({
          type: 'beta',
          insight: 'Portfolio is less volatile than benchmark',
          value: beta,
          recommendation: 'Consider increasing portfolio beta for better returns'
        });
      }
    }
    
    return insights;
  }

  async getAvailableBenchmarks() {
    try {
      const benchmarks = Array.from(this.availableBenchmarks.values()).map(benchmark => ({
        id: benchmark.id,
        name: benchmark.name,
        description: benchmark.description,
        type: benchmark.type,
        region: benchmark.region,
        enabled: benchmark.enabled
      }));

      return benchmarks;
    } catch (error) {
      logger.error('Error fetching available benchmarks:', error);
      throw error;
    }
  }

  async runDailyComparison() {
    try {
      logger.info('Running daily benchmark comparison...');
      
      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        try {
          await this.compareWithBenchmark({
            portfolio: portfolio,
            benchmark: portfolio.benchmark || 'sp500',
            period: this.getDefaultPeriod(),
            metrics: this.getDefaultMetrics()
          }, { id: portfolio.userId });
        } catch (error) {
          logger.error(`Error comparing portfolio ${portfolio.id}:`, error);
        }
      }
      
      logger.info('Daily benchmark comparison completed');
    } catch (error) {
      logger.error('Error running daily comparison:', error);
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

  async storeComparisonResults(session) {
    try {
      const query = `
        INSERT INTO benchmark_comparisons (
          id, user_id, portfolio_data, benchmark, period, metrics, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        JSON.stringify(session.portfolio),
        session.benchmark,
        JSON.stringify(session.period),
        JSON.stringify(session.metrics),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing comparison results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.comparisonSessions.clear();
      logger.info('Benchmark Comparison Service closed successfully');
    } catch (error) {
      logger.error('Error closing Benchmark Comparison Service:', error);
    }
  }
}

module.exports = BenchmarkComparisonService;

