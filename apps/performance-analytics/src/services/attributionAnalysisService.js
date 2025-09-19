const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class AttributionAnalysisService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.attributionSessions = new Map();
    this.attributionMethods = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadAttributionMethods();
      logger.info('Attribution Analysis Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Attribution Analysis Service:', error);
      throw error;
    }
  }

  async loadAttributionMethods() {
    try {
      const methods = [
        {
          id: 'brinson_model',
          name: 'Brinson Model',
          description: 'Classic Brinson attribution model',
          type: 'multi_factor',
          enabled: true,
          parameters: {
            factors: ['allocation', 'selection', 'interaction']
          }
        },
        {
          id: 'carino_model',
          name: 'Carino Model',
          description: 'Carino smoothing attribution model',
          type: 'multi_factor',
          enabled: true,
          parameters: {
            smoothing: true,
            factors: ['allocation', 'selection', 'interaction']
          }
        },
        {
          id: 'menchero_model',
          name: 'Menchero Model',
          description: 'Menchero smoothing attribution model',
          type: 'multi_factor',
          enabled: true,
          parameters: {
            smoothing: true,
            factors: ['allocation', 'selection', 'interaction']
          }
        },
        {
          id: 'frongello_model',
          name: 'Frongello Model',
          description: 'Frongello smoothing attribution model',
          type: 'multi_factor',
          enabled: true,
          parameters: {
            smoothing: true,
            factors: ['allocation', 'selection', 'interaction']
          }
        }
      ];

      for (const method of methods) {
        this.attributionMethods.set(method.id, method);
      }

      logger.info(`Loaded ${methods.length} attribution methods`);
    } catch (error) {
      logger.error('Error loading attribution methods:', error);
    }
  }

  async performAttributionAnalysis(data, user) {
    try {
      const { portfolio, benchmark, period, method, parameters } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        portfolio: portfolio,
        benchmark: benchmark,
        period: period || this.getDefaultPeriod(),
        method: method || 'brinson_model',
        parameters: parameters || {},
        status: 'analyzing',
        createdAt: new Date(),
        results: null
      };

      this.attributionSessions.set(session.id, session);

      // Get portfolio and benchmark data
      const portfolioData = await this.getPortfolioData(session.portfolio, session.period);
      const benchmarkData = await this.getBenchmarkData(session.benchmark, session.period);
      
      // Perform attribution analysis
      const results = await this.performAttributionMethod(
        session.method, 
        portfolioData, 
        benchmarkData, 
        session.parameters
      );
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeAttributionResults(session);

      // Emit completion event
      this.emit('attributionComplete', {
        sessionId: session.id,
        userId: user.id,
        results: results
      });

      logger.info(`Attribution analysis completed for user ${user.id}`);

      return {
        sessionId: session.id,
        method: session.method,
        results: results,
        summary: this.generateAttributionSummary(results),
        insights: this.generateAttributionInsights(results)
      };
    } catch (error) {
      logger.error('Attribution analysis error:', error);
      throw error;
    }
  }

  async performAttributionMethod(methodId, portfolioData, benchmarkData, parameters) {
    try {
      const method = this.attributionMethods.get(methodId);
      if (!method) {
        throw new Error(`Attribution method ${methodId} not found`);
      }

      switch (methodId) {
        case 'brinson_model':
          return await this.performBrinsonAttribution(portfolioData, benchmarkData, parameters);
        case 'carino_model':
          return await this.performCarinoAttribution(portfolioData, benchmarkData, parameters);
        case 'menchero_model':
          return await this.performMencheroAttribution(portfolioData, benchmarkData, parameters);
        case 'frongello_model':
          return await this.performFrongelloAttribution(portfolioData, benchmarkData, parameters);
        default:
          throw new Error(`Unknown attribution method: ${methodId}`);
      }
    } catch (error) {
      logger.error(`Error performing attribution method ${methodId}:`, error);
      throw error;
    }
  }

  async performBrinsonAttribution(portfolioData, benchmarkData, parameters) {
    try {
      const { factors } = parameters;
      const results = {
        method: 'brinson_model',
        totalReturn: 0,
        benchmarkReturn: 0,
        excessReturn: 0,
        attribution: {},
        calculatedAt: new Date()
      };

      // Calculate total returns
      results.totalReturn = this.calculateTotalReturn(portfolioData.returns);
      results.benchmarkReturn = this.calculateTotalReturn(benchmarkData.returns);
      results.excessReturn = results.totalReturn - results.benchmarkReturn;

      // Calculate attribution factors
      if (factors.includes('allocation')) {
        results.attribution.allocation = this.calculateAllocationEffect(
          portfolioData.weights, 
          benchmarkData.weights, 
          benchmarkData.returns
        );
      }

      if (factors.includes('selection')) {
        results.attribution.selection = this.calculateSelectionEffect(
          portfolioData.weights, 
          portfolioData.returns, 
          benchmarkData.returns
        );
      }

      if (factors.includes('interaction')) {
        results.attribution.interaction = this.calculateInteractionEffect(
          portfolioData.weights, 
          benchmarkData.weights, 
          portfolioData.returns, 
          benchmarkData.returns
        );
      }

      // Calculate total attribution
      results.attribution.total = Object.values(results.attribution).reduce((sum, val) => sum + val, 0);

      return results;
    } catch (error) {
      logger.error('Error performing Brinson attribution:', error);
      throw error;
    }
  }

  async performCarinoAttribution(portfolioData, benchmarkData, parameters) {
    try {
      // Carino model is similar to Brinson but with smoothing
      const brinsonResults = await this.performBrinsonAttribution(portfolioData, benchmarkData, parameters);
      
      // Apply Carino smoothing
      const smoothingFactor = this.calculateCarinoSmoothingFactor(
        portfolioData.returns, 
        benchmarkData.returns
      );
      
      const results = {
        ...brinsonResults,
        method: 'carino_model',
        smoothingFactor: smoothingFactor
      };

      // Apply smoothing to attribution factors
      for (const [factor, value] of Object.entries(results.attribution)) {
        if (factor !== 'total') {
          results.attribution[factor] = value * smoothingFactor;
        }
      }

      return results;
    } catch (error) {
      logger.error('Error performing Carino attribution:', error);
      throw error;
    }
  }

  async performMencheroAttribution(portfolioData, benchmarkData, parameters) {
    try {
      // Menchero model is similar to Brinson but with different smoothing
      const brinsonResults = await this.performBrinsonAttribution(portfolioData, benchmarkData, parameters);
      
      // Apply Menchero smoothing
      const smoothingFactor = this.calculateMencheroSmoothingFactor(
        portfolioData.returns, 
        benchmarkData.returns
      );
      
      const results = {
        ...brinsonResults,
        method: 'menchero_model',
        smoothingFactor: smoothingFactor
      };

      // Apply smoothing to attribution factors
      for (const [factor, value] of Object.entries(results.attribution)) {
        if (factor !== 'total') {
          results.attribution[factor] = value * smoothingFactor;
        }
      }

      return results;
    } catch (error) {
      logger.error('Error performing Menchero attribution:', error);
      throw error;
    }
  }

  async performFrongelloAttribution(portfolioData, benchmarkData, parameters) {
    try {
      // Frongello model is similar to Brinson but with different smoothing
      const brinsonResults = await this.performBrinsonAttribution(portfolioData, benchmarkData, parameters);
      
      // Apply Frongello smoothing
      const smoothingFactor = this.calculateFrongelloSmoothingFactor(
        portfolioData.returns, 
        benchmarkData.returns
      );
      
      const results = {
        ...brinsonResults,
        method: 'frongello_model',
        smoothingFactor: smoothingFactor
      };

      // Apply smoothing to attribution factors
      for (const [factor, value] of Object.entries(results.attribution)) {
        if (factor !== 'total') {
          results.attribution[factor] = value * smoothingFactor;
        }
      }

      return results;
    } catch (error) {
      logger.error('Error performing Frongello attribution:', error);
      throw error;
    }
  }

  calculateAllocationEffect(portfolioWeights, benchmarkWeights, benchmarkReturns) {
    let allocationEffect = 0;
    
    for (let i = 0; i < portfolioWeights.length; i++) {
      const weightDiff = portfolioWeights[i] - benchmarkWeights[i];
      allocationEffect += weightDiff * benchmarkReturns[i];
    }
    
    return allocationEffect;
  }

  calculateSelectionEffect(portfolioWeights, portfolioReturns, benchmarkReturns) {
    let selectionEffect = 0;
    
    for (let i = 0; i < portfolioWeights.length; i++) {
      const returnDiff = portfolioReturns[i] - benchmarkReturns[i];
      selectionEffect += portfolioWeights[i] * returnDiff;
    }
    
    return selectionEffect;
  }

  calculateInteractionEffect(portfolioWeights, benchmarkWeights, portfolioReturns, benchmarkReturns) {
    let interactionEffect = 0;
    
    for (let i = 0; i < portfolioWeights.length; i++) {
      const weightDiff = portfolioWeights[i] - benchmarkWeights[i];
      const returnDiff = portfolioReturns[i] - benchmarkReturns[i];
      interactionEffect += weightDiff * returnDiff;
    }
    
    return interactionEffect;
  }

  calculateCarinoSmoothingFactor(portfolioReturns, benchmarkReturns) {
    // Mock implementation - in reality would use Carino smoothing formula
    const portfolioTotal = this.calculateTotalReturn(portfolioReturns);
    const benchmarkTotal = this.calculateTotalReturn(benchmarkReturns);
    
    if (benchmarkTotal === 0) return 1;
    
    return Math.log(1 + portfolioTotal) / Math.log(1 + benchmarkTotal);
  }

  calculateMencheroSmoothingFactor(portfolioReturns, benchmarkReturns) {
    // Mock implementation - in reality would use Menchero smoothing formula
    const portfolioTotal = this.calculateTotalReturn(portfolioReturns);
    const benchmarkTotal = this.calculateTotalReturn(benchmarkReturns);
    
    if (benchmarkTotal === 0) return 1;
    
    return portfolioTotal / benchmarkTotal;
  }

  calculateFrongelloSmoothingFactor(portfolioReturns, benchmarkReturns) {
    // Mock implementation - in reality would use Frongello smoothing formula
    const portfolioTotal = this.calculateTotalReturn(portfolioReturns);
    const benchmarkTotal = this.calculateTotalReturn(benchmarkReturns);
    
    if (benchmarkTotal === 0) return 1;
    
    return (portfolioTotal - benchmarkTotal) / benchmarkTotal;
  }

  calculateTotalReturn(returns) {
    if (!returns || returns.length === 0) return 0;
    
    return returns.reduce((sum, ret) => sum + ret, 0);
  }

  generateAttributionSummary(results) {
    const summary = {
      totalExcessReturn: results.excessReturn,
      attributionBreakdown: results.attribution,
      topContributor: this.findTopContributor(results.attribution),
      bottomContributor: this.findBottomContributor(results.attribution)
    };
    
    return summary;
  }

  generateAttributionInsights(results) {
    const insights = [];
    
    // Analyze allocation effect
    if (results.attribution.allocation > 0) {
      insights.push({
        type: 'allocation',
        insight: 'Positive allocation effect - good sector/asset class selection',
        value: results.attribution.allocation,
        recommendation: 'Continue current allocation strategy'
      });
    } else if (results.attribution.allocation < 0) {
      insights.push({
        type: 'allocation',
        insight: 'Negative allocation effect - poor sector/asset class selection',
        value: results.attribution.allocation,
        recommendation: 'Review and adjust allocation strategy'
      });
    }
    
    // Analyze selection effect
    if (results.attribution.selection > 0) {
      insights.push({
        type: 'selection',
        insight: 'Positive selection effect - good individual security selection',
        value: results.attribution.selection,
        recommendation: 'Continue current security selection approach'
      });
    } else if (results.attribution.selection < 0) {
      insights.push({
        type: 'selection',
        insight: 'Negative selection effect - poor individual security selection',
        value: results.attribution.selection,
        recommendation: 'Review and improve security selection process'
      });
    }
    
    // Analyze interaction effect
    if (results.attribution.interaction > 0) {
      insights.push({
        type: 'interaction',
        insight: 'Positive interaction effect - good combination of allocation and selection',
        value: results.attribution.interaction,
        recommendation: 'Current strategy is well-coordinated'
      });
    } else if (results.attribution.interaction < 0) {
      insights.push({
        type: 'interaction',
        insight: 'Negative interaction effect - poor combination of allocation and selection',
        value: results.attribution.interaction,
        recommendation: 'Review coordination between allocation and selection'
      });
    }
    
    return insights;
  }

  findTopContributor(attribution) {
    let topFactor = null;
    let maxValue = -Infinity;
    
    for (const [factor, value] of Object.entries(attribution)) {
      if (factor !== 'total' && value > maxValue) {
        maxValue = value;
        topFactor = factor;
      }
    }
    
    return topFactor;
  }

  findBottomContributor(attribution) {
    let bottomFactor = null;
    let minValue = Infinity;
    
    for (const [factor, value] of Object.entries(attribution)) {
      if (factor !== 'total' && value < minValue) {
        minValue = value;
        bottomFactor = factor;
      }
    }
    
    return bottomFactor;
  }

  async getAttributionHistory(user) {
    try {
      const query = `
        SELECT id, method, portfolio_data, benchmark_data, period, results, created_at
        FROM attribution_analyses
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      return result.rows.map(row => ({
        id: row.id,
        method: row.method,
        portfolio: row.portfolio_data,
        benchmark: row.benchmark_data,
        period: row.period,
        results: row.results,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error fetching attribution history:', error);
      throw error;
    }
  }

  async runDailyAttribution() {
    try {
      logger.info('Running daily attribution analysis...');
      
      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        try {
          await this.performAttributionAnalysis({
            portfolio: portfolio,
            benchmark: portfolio.benchmark,
            period: this.getDefaultPeriod(),
            method: 'brinson_model'
          }, { id: portfolio.userId });
        } catch (error) {
          logger.error(`Error analyzing attribution for portfolio ${portfolio.id}:`, error);
        }
      }
      
      logger.info('Daily attribution analysis completed');
    } catch (error) {
      logger.error('Error running daily attribution:', error);
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

  async getPortfolioData(portfolio, period) {
    // Mock implementation - in reality would query portfolio database
    return {
      weights: [0.3, 0.4, 0.3],
      returns: [0.05, 0.03, 0.02]
    };
  }

  async getBenchmarkData(benchmark, period) {
    // Mock implementation - in reality would query benchmark database
    return {
      weights: [0.25, 0.35, 0.4],
      returns: [0.04, 0.025, 0.015]
    };
  }

  async storeAttributionResults(session) {
    try {
      const query = `
        INSERT INTO attribution_analyses (
          id, user_id, method, portfolio_data, benchmark_data, period, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.method,
        JSON.stringify(session.portfolio),
        JSON.stringify(session.benchmark),
        JSON.stringify(session.period),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing attribution results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.attributionSessions.clear();
      logger.info('Attribution Analysis Service closed successfully');
    } catch (error) {
      logger.error('Error closing Attribution Analysis Service:', error);
    }
  }
}

module.exports = AttributionAnalysisService;

