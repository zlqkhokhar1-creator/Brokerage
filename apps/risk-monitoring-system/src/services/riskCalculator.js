const { EventEmitter } = require('events');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const math = require('mathjs');

class RiskCalculator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.marketData = new Map();
    this.correlationMatrix = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Initialize correlation matrix
      await this.initializeCorrelationMatrix();
      
      // Start market data updates
      this.startMarketDataUpdates();
      
      this._initialized = true;
      logger.info('RiskCalculator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RiskCalculator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('RiskCalculator closed');
    } catch (error) {
      logger.error('Error closing RiskCalculator:', error);
    }
  }

  async calculateVaR(positions, confidenceLevel = 0.95, timeHorizon = 1, method = 'historical') {
    try {
      if (!this._initialized) {
        throw new Error('RiskCalculator not initialized');
      }

      logger.info('Calculating VaR', { 
        confidenceLevel, 
        timeHorizon, 
        method,
        positionCount: positions.length 
      });

      let varResult;

      switch (method) {
        case 'historical':
          varResult = await this.calculateHistoricalVaR(positions, confidenceLevel, timeHorizon);
          break;
        case 'parametric':
          varResult = await this.calculateParametricVaR(positions, confidenceLevel, timeHorizon);
          break;
        case 'monte_carlo':
          varResult = await this.calculateMonteCarloVaR(positions, confidenceLevel, timeHorizon);
          break;
        default:
          throw new Error(`Unknown VaR method: ${method}`);
      }

      logger.info('VaR calculated successfully', { 
        var: varResult.var,
        confidenceLevel,
        method 
      });

      return varResult;

    } catch (error) {
      logger.error('Error calculating VaR:', error);
      throw error;
    }
  }

  async calculateHistoricalVaR(positions, confidenceLevel, timeHorizon) {
    try {
      // Get historical returns for all positions
      const returns = await this.getHistoricalReturns(positions, timeHorizon);
      
      if (returns.length === 0) {
        throw new Error('No historical returns available');
      }

      // Calculate portfolio returns
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Sort returns
      const sortedReturns = portfolioReturns.sort((a, b) => a - b);
      
      // Calculate VaR
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index]);
      
      // Calculate additional metrics
      const meanReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const volatility = this.calculateVolatility(portfolioReturns);
      const skewness = this.calculateSkewness(portfolioReturns);
      const kurtosis = this.calculateKurtosis(portfolioReturns);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'historical',
        meanReturn,
        volatility,
        skewness,
        kurtosis,
        sampleSize: portfolioReturns.length,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating historical VaR:', error);
      throw error;
    }
  }

  async calculateParametricVaR(positions, confidenceLevel, timeHorizon) {
    try {
      // Calculate portfolio statistics
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      
      // Calculate VaR using normal distribution assumption
      const zScore = this.getZScore(confidenceLevel);
      const varValue = Math.abs(portfolioStats.meanReturn + zScore * portfolioStats.volatility);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'parametric',
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        zScore,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating parametric VaR:', error);
      throw error;
    }
  }

  async calculateMonteCarloVaR(positions, confidenceLevel, timeHorizon, simulations = 10000) {
    try {
      // Get portfolio statistics
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      
      // Generate random returns using Monte Carlo simulation
      const simulatedReturns = this.generateMonteCarloReturns(
        portfolioStats.meanReturn,
        portfolioStats.volatility,
        simulations
      );
      
      // Sort returns
      const sortedReturns = simulatedReturns.sort((a, b) => a - b);
      
      // Calculate VaR
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const varValue = Math.abs(sortedReturns[index]);
      
      return {
        var: varValue,
        confidenceLevel,
        timeHorizon,
        method: 'monte_carlo',
        simulations,
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating Monte Carlo VaR:', error);
      throw error;
    }
  }

  async calculateCVaR(positions, confidenceLevel = 0.95, timeHorizon = 1) {
    try {
      logger.info('Calculating CVaR', { confidenceLevel, timeHorizon });

      // Calculate VaR first
      const varResult = await this.calculateVaR(positions, confidenceLevel, timeHorizon, 'historical');
      
      // Get historical returns
      const returns = await this.getHistoricalReturns(positions, timeHorizon);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Filter returns that are worse than VaR
      const tailReturns = portfolioReturns.filter(r => r <= -varResult.var);
      
      // Calculate CVaR (expected value of tail returns)
      const cvar = tailReturns.length > 0 
        ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length)
        : varResult.var;
      
      return {
        cvar,
        var: varResult.var,
        confidenceLevel,
        timeHorizon,
        tailReturns: tailReturns.length,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      throw error;
    }
  }

  async calculatePortfolioStatistics(positions) {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      const meanReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const volatility = this.calculateVolatility(portfolioReturns);
      
      return {
        meanReturn,
        volatility,
        sampleSize: portfolioReturns.length
      };

    } catch (error) {
      logger.error('Error calculating portfolio statistics:', error);
      throw error;
    }
  }

  async getHistoricalReturns(positions, timeHorizon) {
    try {
      // Mock historical returns - in production, this would fetch from database
      const returns = [];
      const days = 252; // One year of trading days
      
      for (let i = 0; i < days; i++) {
        const dayReturns = {};
        
        for (const position of positions) {
          // Generate random returns based on position characteristics
          const volatility = position.volatility || 0.2;
          const meanReturn = position.meanReturn || 0.001;
          const returnValue = this.generateRandomReturn(meanReturn, volatility);
          dayReturns[position.symbol] = returnValue;
        }
        
        returns.push(dayReturns);
      }
      
      return returns;

    } catch (error) {
      logger.error('Error getting historical returns:', error);
      return [];
    }
  }

  calculatePortfolioReturns(positions, returns) {
    try {
      const portfolioReturns = [];
      
      for (const dayReturns of returns) {
        let portfolioReturn = 0;
        let totalWeight = 0;
        
        for (const position of positions) {
          const weight = position.weight || (1 / positions.length);
          const symbolReturn = dayReturns[position.symbol] || 0;
          portfolioReturn += weight * symbolReturn;
          totalWeight += weight;
        }
        
        if (totalWeight > 0) {
          portfolioReturn /= totalWeight;
        }
        
        portfolioReturns.push(portfolioReturn);
      }
      
      return portfolioReturns;

    } catch (error) {
      logger.error('Error calculating portfolio returns:', error);
      return [];
    }
  }

  calculateVolatility(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance);

    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateSkewness(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev === 0) return 0;
      
      const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
      
      return skewness;

    } catch (error) {
      logger.error('Error calculating skewness:', error);
      return 0;
    }
  }

  calculateKurtosis(returns) {
    try {
      if (returns.length === 0) return 0;
      
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev === 0) return 0;
      
      const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
      
      return kurtosis;

    } catch (error) {
      logger.error('Error calculating kurtosis:', error);
      return 0;
    }
  }

  getZScore(confidenceLevel) {
    // Z-scores for common confidence levels
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326,
      0.999: 3.090
    };
    
    return zScores[confidenceLevel] || 1.645;
  }

  generateRandomReturn(mean, volatility) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return mean + volatility * z0;
  }

  generateMonteCarloReturns(mean, volatility, simulations) {
    const returns = [];
    
    for (let i = 0; i < simulations; i++) {
      const returnValue = this.generateRandomReturn(mean, volatility);
      returns.push(returnValue);
    }
    
    return returns;
  }

  async calculateSharpeRatio(positions, riskFreeRate = 0.02) {
    try {
      const portfolioStats = await this.calculatePortfolioStatistics(positions);
      const excessReturn = portfolioStats.meanReturn - riskFreeRate;
      
      return {
        sharpeRatio: portfolioStats.volatility > 0 ? excessReturn / portfolioStats.volatility : 0,
        meanReturn: portfolioStats.meanReturn,
        volatility: portfolioStats.volatility,
        riskFreeRate,
        excessReturn
      };

    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      throw error;
    }
  }

  async calculateMaximumDrawdown(positions) {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      let maxDrawdown = 0;
      let peak = 0;
      let currentValue = 1;
      
      for (const returnValue of portfolioReturns) {
        currentValue *= (1 + returnValue);
        
        if (currentValue > peak) {
          peak = currentValue;
        }
        
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
      
      return {
        maxDrawdown,
        peak,
        currentValue,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating maximum drawdown:', error);
      throw error;
    }
  }

  async calculateBeta(positions, marketIndex = 'SPY') {
    try {
      const returns = await this.getHistoricalReturns(positions, 1);
      const portfolioReturns = this.calculatePortfolioReturns(positions, returns);
      
      // Mock market returns
      const marketReturns = portfolioReturns.map(() => this.generateRandomReturn(0.0008, 0.15));
      
      // Calculate covariance and variance
      const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
      
      let covariance = 0;
      let marketVariance = 0;
      
      for (let i = 0; i < portfolioReturns.length; i++) {
        covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
        marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
      }
      
      covariance /= portfolioReturns.length;
      marketVariance /= portfolioReturns.length;
      
      const beta = marketVariance > 0 ? covariance / marketVariance : 0;
      
      return {
        beta,
        covariance,
        marketVariance,
        portfolioMean,
        marketMean,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating beta:', error);
      throw error;
    }
  }

  // Production-ready comprehensive risk analysis
  async calculateComprehensiveRisk(portfolio, options = {}) {
    try {
      const {
        confidenceLevel = 0.95,
        timeHorizon = 1,
        includeStressTests = true,
        includeScenarioAnalysis = true
      } = options;

      logger.info('Calculating comprehensive portfolio risk', { 
        portfolioId: portfolio.id,
        confidenceLevel,
        timeHorizon 
      });

      // Get current market data
      const marketData = await this.getMarketData(portfolio.positions.map(p => p.symbol));
      
      // Calculate individual position risks
      const positionRisks = await this.calculatePositionRisks(portfolio.positions, marketData);
      
      // Calculate portfolio-level metrics
      const portfolioMetrics = await this.calculatePortfolioMetrics(portfolio, positionRisks, marketData);
      
      // Calculate VaR using multiple methods
      const varResults = await this.calculateVaR(portfolio.positions, confidenceLevel, timeHorizon, 'historical');
      const parametricVaR = await this.calculateVaR(portfolio.positions, confidenceLevel, timeHorizon, 'parametric');
      const monteCarloVaR = await this.calculateVaR(portfolio.positions, confidenceLevel, timeHorizon, 'monte_carlo');
      
      // Calculate CVaR
      const cvarResults = await this.calculateCVaR(portfolio.positions, confidenceLevel, timeHorizon);
      
      // Calculate stress test results
      let stressTestResults = null;
      if (includeStressTests) {
        stressTestResults = await this.performStressTests(portfolio, positionRisks, marketData);
      }
      
      // Calculate scenario analysis
      let scenarioAnalysis = null;
      if (includeScenarioAnalysis) {
        scenarioAnalysis = await this.performScenarioAnalysis(portfolio, positionRisks, marketData);
      }
      
      // Calculate risk-adjusted returns
      const riskAdjustedReturns = await this.calculateRiskAdjustedReturns(portfolio, positionRisks);
      
      // Generate risk recommendations
      const recommendations = await this.generateRiskRecommendations(portfolio, portfolioMetrics, varResults, stressTestResults);
      
      const riskReport = {
        portfolioId: portfolio.id,
        timestamp: new Date().toISOString(),
        summary: {
          totalValue: portfolioMetrics.totalValue,
          totalRisk: portfolioMetrics.totalRisk,
          riskLevel: this.classifyRiskLevel(portfolioMetrics.totalRisk),
          sharpeRatio: riskAdjustedReturns.sharpeRatio,
          maxDrawdown: portfolioMetrics.maxDrawdown,
          beta: portfolioMetrics.beta
        },
        var: {
          historical: varResults,
          parametric: parametricVaR,
          monteCarlo: monteCarloVaR,
          recommended: Math.max(varResults.var, parametricVaR.var, monteCarloVaR.var)
        },
        cvar: cvarResults,
        positionRisks,
        portfolioMetrics,
        riskAdjustedReturns,
        stressTests: stressTestResults,
        scenarioAnalysis,
        recommendations,
        alerts: await this.generateRiskAlerts(portfolio, portfolioMetrics, varResults)
      };

      // Cache results
      await this.cacheRiskResults(portfolio.id, riskReport);
      
      // Emit risk update event
      this.emit('riskUpdated', { portfolioId: portfolio.id, riskReport });
      
      logger.info('Comprehensive risk calculation completed', {
        portfolioId: portfolio.id,
        totalRisk: portfolioMetrics.totalRisk,
        var: varResults.var
      });

      return riskReport;
    } catch (error) {
      logger.error('Error calculating comprehensive risk:', error);
      throw error;
    }
  }

  async calculatePositionRisks(positions, marketData) {
    const positionRisks = [];
    
    for (const position of positions) {
      const symbol = position.symbol;
      const marketInfo = marketData[symbol];
      
      if (!marketInfo) {
        logger.warn(`No market data available for ${symbol}`);
        continue;
      }
      
      // Calculate position-specific risk metrics
      const positionRisk = {
        symbol,
        quantity: position.quantity,
        currentPrice: marketInfo.price,
        marketValue: position.quantity * marketInfo.price,
        volatility: marketInfo.volatility || 0.2,
        beta: marketInfo.beta || 1.0,
        var: this.calculatePositionVaR(position, marketInfo),
        expectedReturn: this.calculateExpectedReturn(position, marketInfo),
        riskContribution: 0, // Will be calculated after portfolio-level analysis
        concentration: 0, // Will be calculated after portfolio-level analysis
        liquidity: this.assessLiquidity(symbol, marketInfo),
        sector: marketInfo.sector || 'Unknown',
        country: marketInfo.country || 'Unknown'
      };
      
      positionRisks.push(positionRisk);
    }
    
    return positionRisks;
  }

  async calculatePortfolioMetrics(portfolio, positionRisks, marketData) {
    const totalValue = positionRisks.reduce((sum, pos) => sum + pos.marketValue, 0);
    
    // Calculate portfolio volatility using covariance matrix
    const portfolioVolatility = await this.calculatePortfolioVolatility(positionRisks, marketData);
    
    // Calculate portfolio beta
    const portfolioBeta = this.calculatePortfolioBeta(positionRisks, totalValue);
    
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(positionRisks, totalValue);
    
    // Calculate sector concentration
    const sectorConcentration = this.calculateSectorConcentration(positionRisks, totalValue);
    
    // Calculate geographic concentration
    const geographicConcentration = this.calculateGeographicConcentration(positionRisks, totalValue);
    
    // Calculate liquidity risk
    const liquidityRisk = this.calculateLiquidityRisk(positionRisks, totalValue);
    
    // Calculate maximum drawdown
    const maxDrawdown = await this.calculateMaxDrawdown(portfolio.id);
    
    return {
      totalValue,
      totalRisk: portfolioVolatility,
      portfolioBeta,
      concentrationRisk,
      sectorConcentration,
      geographicConcentration,
      liquidityRisk,
      maxDrawdown,
      diversificationRatio: this.calculateDiversificationRatio(positionRisks),
      effectivePositions: this.calculateEffectivePositions(positionRisks, totalValue)
    };
  }

  async performStressTests(portfolio, positionRisks, marketData) {
    const stressScenarios = [
      {
        name: 'Market Crash (-20%)',
        description: 'All equity positions decline by 20%',
        impact: -0.20
      },
      {
        name: 'Interest Rate Shock (+2%)',
        description: 'Bond prices decline due to 2% rate increase',
        impact: -0.10
      },
      {
        name: 'Currency Crisis',
        description: 'Foreign currency positions decline by 15%',
        impact: -0.15
      },
      {
        name: 'Sector Collapse',
        description: 'Technology sector declines by 30%',
        impact: -0.30
      },
      {
        name: 'Liquidity Crisis',
        description: 'Illiquid positions become unsellable',
        impact: -0.25
      }
    ];

    const stressResults = [];

    for (const scenario of stressScenarios) {
      const scenarioResult = await this.calculateScenarioImpact(portfolio, positionRisks, scenario);
      stressResults.push(scenarioResult);
    }

    return {
      scenarios: stressResults,
      worstCase: stressResults.reduce((worst, current) => 
        current.impact < worst.impact ? current : worst
      ),
      averageImpact: stressResults.reduce((sum, result) => sum + result.impact, 0) / stressResults.length
    };
  }

  async performScenarioAnalysis(portfolio, positionRisks, marketData) {
    const scenarios = [
      { name: 'Bull Market', probability: 0.3, marketReturn: 0.15 },
      { name: 'Base Case', probability: 0.4, marketReturn: 0.05 },
      { name: 'Bear Market', probability: 0.2, marketReturn: -0.10 },
      { name: 'Crisis', probability: 0.1, marketReturn: -0.25 }
    ];

    const scenarioResults = [];

    for (const scenario of scenarios) {
      const scenarioResult = await this.calculateScenarioReturn(portfolio, positionRisks, scenario);
      scenarioResults.push({
        ...scenario,
        ...scenarioResult
      });
    }

    // Calculate expected return and risk
    const expectedReturn = scenarioResults.reduce((sum, result) => 
      sum + (result.expectedReturn * result.probability), 0
    );
    
    const expectedRisk = Math.sqrt(
      scenarioResults.reduce((sum, result) => 
        sum + (Math.pow(result.expectedReturn - expectedReturn, 2) * result.probability), 0
      )
    );

    return {
      scenarios: scenarioResults,
      expectedReturn,
      expectedRisk,
      riskReturnRatio: expectedReturn / expectedRisk
    };
  }

  async calculateRiskAdjustedReturns(portfolio, positionRisks) {
    try {
      // Get historical returns
      const historicalReturns = await this.getHistoricalReturns(portfolio.positions, 252); // 1 year
      
      if (historicalReturns.length < 30) {
        return {
          sharpeRatio: 0,
          sortinoRatio: 0,
          calmarRatio: 0,
          treynorRatio: 0,
          informationRatio: 0,
          alpha: 0,
          beta: 0
        };
      }

      const returns = this.calculatePortfolioReturns(portfolio.positions, historicalReturns);
      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const volatility = this.calculateVolatility(returns);

      // Risk-free rate (assume 2% annually)
      const riskFreeRate = 0.02 / 252; // Daily risk-free rate
      
      // Sharpe Ratio
      const sharpeRatio = volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0;
      
      // Sortino Ratio (downside deviation)
      const downsideReturns = returns.filter(r => r < 0);
      const downsideDeviation = Math.sqrt(
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
      );
      const sortinoRatio = downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
      
      // Calmar Ratio (return / max drawdown)
      const maxDrawdown = await this.calculateMaxDrawdown(portfolio.id);
      const calmarRatio = maxDrawdown > 0 ? meanReturn * 252 / maxDrawdown : 0;
      
      // Treynor Ratio (return / beta)
      const portfolioBeta = this.calculatePortfolioBeta(positionRisks, portfolio.totalValue);
      const treynorRatio = portfolioBeta > 0 ? (meanReturn - riskFreeRate) / portfolioBeta : 0;
      
      // Information Ratio (active return / tracking error)
      const benchmarkReturns = await this.getBenchmarkReturns(252);
      const activeReturns = returns.map((r, i) => r - (benchmarkReturns[i]?.return || 0));
      const activeReturn = activeReturns.reduce((sum, r) => sum + r, 0) / activeReturns.length;
      const trackingError = Math.sqrt(
        activeReturns.reduce((sum, r) => sum + Math.pow(r - activeReturn, 2), 0) / activeReturns.length
      );
      const informationRatio = trackingError > 0 ? activeReturn / trackingError : 0;
      
      // Alpha and Beta
      const alpha = activeReturn;
      const beta = portfolioBeta;

      return {
        sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
        sortinoRatio: sortinoRatio * Math.sqrt(252), // Annualized
        calmarRatio,
        treynorRatio: treynorRatio * 252, // Annualized
        informationRatio,
        alpha: alpha * 252, // Annualized
        beta
      };
    } catch (error) {
      logger.error('Error calculating risk-adjusted returns:', error);
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        treynorRatio: 0,
        informationRatio: 0,
        alpha: 0,
        beta: 0
      };
    }
  }

  async generateRiskRecommendations(portfolio, portfolioMetrics, varResults, stressTestResults) {
    const recommendations = [];
    
    // High concentration risk
    if (portfolioMetrics.concentrationRisk > 0.3) {
      recommendations.push({
        type: 'concentration',
        severity: 'high',
        title: 'High Concentration Risk',
        description: `Your portfolio has ${(portfolioMetrics.concentrationRisk * 100).toFixed(1)}% concentration risk`,
        action: 'Consider diversifying across more positions',
        impact: 'Reduces single-position risk'
      });
    }
    
    // High VaR
    if (varResults.var > portfolio.totalValue * 0.1) {
      recommendations.push({
        type: 'var',
        severity: 'high',
        title: 'High Value at Risk',
        description: `Your portfolio VaR is ${(varResults.var / portfolio.totalValue * 100).toFixed(1)}% of portfolio value`,
        action: 'Consider reducing position sizes or hedging',
        impact: 'Reduces potential losses'
      });
    }
    
    // Low diversification
    if (portfolioMetrics.diversificationRatio < 0.5) {
      recommendations.push({
        type: 'diversification',
        severity: 'medium',
        title: 'Low Diversification',
        description: 'Your portfolio lacks diversification',
        action: 'Add positions in different sectors or asset classes',
        impact: 'Reduces overall portfolio risk'
      });
    }
    
    return recommendations;
  }

  async generateRiskAlerts(portfolio, portfolioMetrics, varResults) {
    const alerts = [];
    
    // VaR breach alert
    if (varResults.var > portfolio.totalValue * 0.15) {
      alerts.push({
        type: 'var_breach',
        severity: 'critical',
        message: `Portfolio VaR exceeds 15% of total value: ${(varResults.var / portfolio.totalValue * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // High volatility alert
    if (portfolioMetrics.totalRisk > 0.3) {
      alerts.push({
        type: 'high_volatility',
        severity: 'warning',
        message: `Portfolio volatility is high: ${(portfolioMetrics.totalRisk * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  // Helper methods
  async initializeCorrelationMatrix() {
    // Initialize correlation matrix for common asset pairs
    const commonAssets = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
    
    for (let i = 0; i < commonAssets.length; i++) {
      for (let j = i; j < commonAssets.length; j++) {
        const correlation = i === j ? 1.0 : 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        this.correlationMatrix.set(`${commonAssets[i]}:${commonAssets[j]}`, correlation);
        if (i !== j) {
          this.correlationMatrix.set(`${commonAssets[j]}:${commonAssets[i]}`, correlation);
        }
      }
    }
  }

  async getMarketData(symbols) {
    const marketData = {};
    
    for (const symbol of symbols) {
      try {
        // Try to get from cache first
        const cachedData = await this.redis.get(`market_data:${symbol}`);
        if (cachedData) {
          marketData[symbol] = JSON.parse(cachedData);
          continue;
        }
        
        // Fetch from database or external API
        const data = await this.fetchMarketDataFromSource(symbol);
        marketData[symbol] = data;
        
        // Cache for 5 minutes
        await this.redis.setex(`market_data:${symbol}`, 300, JSON.stringify(data));
      } catch (error) {
        logger.error(`Error fetching market data for ${symbol}:`, error);
        // Use default values
        marketData[symbol] = {
          price: 100,
          volatility: 0.2,
          beta: 1.0,
          sector: 'Unknown',
          country: 'Unknown'
        };
      }
    }
    
    return marketData;
  }

  async fetchMarketDataFromSource(symbol) {
    // This would integrate with real market data providers
    // For now, return mock data
    return {
      price: 100 + Math.random() * 200,
      volatility: 0.1 + Math.random() * 0.3,
      beta: 0.5 + Math.random() * 1.0,
      sector: ['Technology', 'Healthcare', 'Financials', 'Energy'][Math.floor(Math.random() * 4)],
      country: ['US', 'EU', 'Asia'][Math.floor(Math.random() * 3)],
      volume: Math.floor(Math.random() * 1000000) + 100000,
      marketCap: Math.floor(Math.random() * 1000000000000) + 1000000000
    };
  }

  startMarketDataUpdates() {
    // Update market data every 30 seconds
    setInterval(async () => {
      try {
        const symbols = await this.getActiveSymbols();
        const marketData = await this.getMarketData(symbols);
        
        // Store in memory for fast access
        for (const [symbol, data] of Object.entries(marketData)) {
          this.marketData.set(symbol, data);
        }
        
        logger.debug('Market data updated', { symbolCount: symbols.length });
      } catch (error) {
        logger.error('Error updating market data:', error);
      }
    }, 30000);
  }

  async getActiveSymbols() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT symbol 
        FROM positions 
        WHERE quantity > 0
      `);
      return result.rows.map(row => row.symbol);
    } catch (error) {
      logger.error('Error getting active symbols:', error);
      return [];
    }
  }

  calculatePositionVaR(position, marketInfo) {
    const confidenceLevel = 0.95;
    const zScore = 1.645; // 95% confidence
    const volatility = marketInfo.volatility || 0.2;
    const positionValue = position.quantity * marketInfo.price;
    
    return positionValue * volatility * zScore;
  }

  calculateExpectedReturn(position, marketInfo) {
    const riskFreeRate = 0.02; // 2% annual
    const marketReturn = 0.08; // 8% annual
    const beta = marketInfo.beta || 1.0;
    
    return riskFreeRate + beta * (marketReturn - riskFreeRate);
  }

  assessLiquidity(symbol, marketInfo) {
    const volume = marketInfo.volume || 0;
    const marketCap = marketInfo.marketCap || 0;
    
    if (volume > 1000000 && marketCap > 1000000000) return 'high';
    if (volume > 100000 && marketCap > 100000000) return 'medium';
    return 'low';
  }

  async calculatePortfolioVolatility(positionRisks, marketData) {
    if (positionRisks.length === 0) return 0;
    
    // Calculate portfolio variance using covariance matrix
    let portfolioVariance = 0;
    const totalValue = positionRisks.reduce((sum, pos) => sum + pos.marketValue, 0);
    
    for (let i = 0; i < positionRisks.length; i++) {
      const weightI = positionRisks[i].marketValue / totalValue;
      portfolioVariance += Math.pow(weightI * positionRisks[i].volatility, 2);
      
      for (let j = i + 1; j < positionRisks.length; j++) {
        const weightJ = positionRisks[j].marketValue / totalValue;
        const correlation = await this.getCorrelation(positionRisks[i].symbol, positionRisks[j].symbol);
        portfolioVariance += 2 * weightI * weightJ * positionRisks[i].volatility * positionRisks[j].volatility * correlation;
      }
    }
    
    return Math.sqrt(portfolioVariance);
  }

  async getCorrelation(symbol1, symbol2) {
    // Check cache first
    const cacheKey = `correlation:${symbol1}:${symbol2}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseFloat(cached);
    
    // Check correlation matrix
    const correlation = this.correlationMatrix.get(`${symbol1}:${symbol2}`) || 0.3;
    
    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, correlation.toString());
    
    return correlation;
  }

  calculatePortfolioBeta(positionRisks, totalValue) {
    return positionRisks.reduce((sum, pos) => {
      const weight = pos.marketValue / totalValue;
      return sum + (weight * pos.beta);
    }, 0);
  }

  calculateConcentrationRisk(positionRisks, totalValue) {
    const weights = positionRisks.map(pos => pos.marketValue / totalValue);
    return weights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);
  }

  calculateSectorConcentration(positionRisks, totalValue) {
    const sectorWeights = {};
    
    positionRisks.forEach(pos => {
      const weight = pos.marketValue / totalValue;
      sectorWeights[pos.sector] = (sectorWeights[pos.sector] || 0) + weight;
    });
    
    return Math.max(...Object.values(sectorWeights));
  }

  calculateGeographicConcentration(positionRisks, totalValue) {
    const countryWeights = {};
    
    positionRisks.forEach(pos => {
      const weight = pos.marketValue / totalValue;
      countryWeights[pos.country] = (countryWeights[pos.country] || 0) + weight;
    });
    
    return Math.max(...Object.values(countryWeights));
  }

  calculateLiquidityRisk(positionRisks, totalValue) {
    const liquidityWeights = { high: 0, medium: 0, low: 0 };
    
    positionRisks.forEach(pos => {
      const weight = pos.marketValue / totalValue;
      liquidityWeights[pos.liquidity] = (liquidityWeights[pos.liquidity] || 0) + weight;
    });
    
    return liquidityWeights.low + (liquidityWeights.medium * 0.5);
  }

  async calculateMaxDrawdown(portfolioId) {
    try {
      const result = await pool.query(`
        SELECT value, date 
        FROM portfolio_history 
        WHERE portfolio_id = $1 
        ORDER BY date ASC
      `, [portfolioId]);
      
      if (result.rows.length < 2) return 0;
      
      let maxDrawdown = 0;
      let peak = result.rows[0].value;
      
      for (const row of result.rows) {
        if (row.value > peak) {
          peak = row.value;
        }
        const drawdown = (peak - row.value) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      return maxDrawdown;
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  calculateDiversificationRatio(positionRisks) {
    if (positionRisks.length <= 1) return 0;
    
    const totalValue = positionRisks.reduce((sum, pos) => sum + pos.marketValue, 0);
    const weightedVolatility = positionRisks.reduce((sum, pos) => {
      const weight = pos.marketValue / totalValue;
      return sum + (weight * pos.volatility);
    }, 0);
    
    // This is a simplified calculation
    return Math.min(1, positionRisks.length / 10) * (1 - weightedVolatility);
  }

  calculateEffectivePositions(positionRisks, totalValue) {
    const weights = positionRisks.map(pos => pos.marketValue / totalValue);
    const herfindahlIndex = weights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);
    return 1 / herfindahlIndex;
  }

  async calculateScenarioImpact(portfolio, positionRisks, scenario) {
    let totalImpact = 0;
    const affectedPositions = [];
    
    for (const position of positionRisks) {
      let impact = 0;
      
      // Apply scenario-specific logic
      switch (scenario.name) {
        case 'Market Crash (-20%)':
          if (position.sector !== 'Fixed Income') {
            impact = position.marketValue * scenario.impact;
          }
          break;
        case 'Interest Rate Shock (+2%)':
          if (position.sector === 'Fixed Income') {
            impact = position.marketValue * scenario.impact;
          }
          break;
        case 'Currency Crisis':
          if (position.country !== 'US') {
            impact = position.marketValue * scenario.impact;
          }
          break;
        case 'Sector Collapse':
          if (position.sector === 'Technology') {
            impact = position.marketValue * scenario.impact;
          }
          break;
        case 'Liquidity Crisis':
          if (position.liquidity === 'low') {
            impact = position.marketValue * scenario.impact;
          }
          break;
      }
      
      totalImpact += impact;
      if (impact !== 0) {
        affectedPositions.push({
          symbol: position.symbol,
          impact: impact,
          impactPercent: (impact / position.marketValue) * 100
        });
      }
    }
    
    return {
      ...scenario,
      impact: totalImpact,
      impactPercent: (totalImpact / portfolio.totalValue) * 100,
      affectedPositions
    };
  }

  async calculateScenarioReturn(portfolio, positionRisks, scenario) {
    const totalValue = positionRisks.reduce((sum, pos) => sum + pos.marketValue, 0);
    const portfolioBeta = this.calculatePortfolioBeta(positionRisks, totalValue);
    
    // Calculate expected return based on scenario
    const expectedReturn = scenario.marketReturn * portfolioBeta;
    
    return {
      expectedReturn,
      expectedValue: totalValue * (1 + expectedReturn),
      portfolioBeta
    };
  }

  async getBenchmarkReturns(days) {
    try {
      const result = await pool.query(`
        SELECT return_pct, date 
        FROM benchmark_returns 
        WHERE benchmark = 'SP500' 
        ORDER BY date DESC 
        LIMIT $1
      `, [days]);
      
      return result.rows.map(row => ({
        return: row.return_pct,
        date: row.date
      }));
    } catch (error) {
      logger.error('Error getting benchmark returns:', error);
      return [];
    }
  }

  classifyRiskLevel(totalRisk) {
    if (totalRisk < 0.1) return 'low';
    if (totalRisk < 0.2) return 'medium';
    if (totalRisk < 0.3) return 'high';
    return 'very_high';
  }

  async cacheRiskResults(portfolioId, riskReport) {
    try {
      const cacheKey = `risk_report:${portfolioId}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(riskReport)); // Cache for 1 hour
    } catch (error) {
      logger.error('Error caching risk results:', error);
    }
  }
}

module.exports = RiskCalculator;
