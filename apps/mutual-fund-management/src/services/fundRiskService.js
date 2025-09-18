const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundRiskService extends EventEmitter {
  constructor() {
    super();
    this.riskModels = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Initialize risk models
      this.initializeRiskModels();
      
      this._initialized = true;
      logger.info('FundRiskService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundRiskService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundRiskService closed');
    } catch (error) {
      logger.error('Error closing FundRiskService:', error);
    }
  }

  initializeRiskModels() {
    try {
      // Initialize risk models
      this.riskModels.set('var', {
        name: 'Value at Risk',
        description: 'Maximum expected loss over a given time period',
        confidenceLevels: [0.95, 0.99],
        timeHorizons: [1, 5, 10, 30] // days
      });

      this.riskModels.set('cvar', {
        name: 'Conditional Value at Risk',
        description: 'Expected loss given that VaR is exceeded',
        confidenceLevels: [0.95, 0.99],
        timeHorizons: [1, 5, 10, 30]
      });

      this.riskModels.set('stress_test', {
        name: 'Stress Testing',
        description: 'Portfolio performance under extreme market conditions',
        scenarios: ['2008_crisis', 'dot_com_bubble', 'covid_19', 'interest_rate_shock']
      });

      this.riskModels.set('monte_carlo', {
        name: 'Monte Carlo Simulation',
        description: 'Statistical simulation of portfolio returns',
        simulations: 10000,
        timeHorizons: [30, 90, 180, 365] // days
      });

      logger.info('Risk models initialized');
    } catch (error) {
      logger.error('Error initializing risk models:', error);
    }
  }

  async calculateFundRisk(fundId, options = {}) {
    try {
      const {
        period = '1y',
        confidenceLevel = 0.95,
        timeHorizon = 1
      } = options;

      // Check cache first
      const cacheKey = `fund_risk:${fundId}:${period}:${confidenceLevel}:${timeHorizon}`;
      const cachedRisk = await redisService.get(cacheKey);
      if (cachedRisk) {
        return cachedRisk;
      }

      // Get fund performance data
      const performanceData = await this.getFundPerformanceData(fundId, period);

      if (performanceData.length === 0) {
        throw new Error('No performance data available for risk calculation');
      }

      // Calculate risk metrics
      const riskMetrics = {
        fund_id: fundId,
        period,
        confidence_level: confidenceLevel,
        time_horizon: timeHorizon,
        var: this.calculateVaR(performanceData, confidenceLevel, timeHorizon),
        cvar: this.calculateCVaR(performanceData, confidenceLevel, timeHorizon),
        volatility: this.calculateVolatility(performanceData),
        beta: this.calculateBeta(performanceData),
        sharpe_ratio: this.calculateSharpeRatio(performanceData),
        sortino_ratio: this.calculateSortinoRatio(performanceData),
        maximum_drawdown: this.calculateMaximumDrawdown(performanceData),
        downside_deviation: this.calculateDownsideDeviation(performanceData),
        risk_score: this.calculateRiskScore(performanceData),
        risk_level: this.determineRiskLevel(performanceData)
      };

      // Cache the result
      await redisService.set(cacheKey, riskMetrics, 1800); // Cache for 30 minutes

      return riskMetrics;
    } catch (error) {
      logger.error('Error calculating fund risk:', error);
      throw error;
    }
  }

  async calculatePortfolioRisk(userId, options = {}) {
    try {
      const {
        period = '1y',
        confidenceLevel = 0.95,
        timeHorizon = 1
      } = options;

      // Check cache first
      const cacheKey = `portfolio_risk:${userId}:${period}:${confidenceLevel}:${timeHorizon}`;
      const cachedRisk = await redisService.get(cacheKey);
      if (cachedRisk) {
        return cachedRisk;
      }

      // Get user's portfolio
      const portfolio = await this.getUserPortfolio(userId);

      if (portfolio.length === 0) {
        throw new Error('No portfolio data available for risk calculation');
      }

      // Calculate portfolio risk metrics
      const riskMetrics = {
        user_id: userId,
        period,
        confidence_level: confidenceLevel,
        time_horizon: timeHorizon,
        portfolio_var: this.calculatePortfolioVaR(portfolio, confidenceLevel, timeHorizon),
        portfolio_cvar: this.calculatePortfolioCVaR(portfolio, confidenceLevel, timeHorizon),
        portfolio_volatility: this.calculatePortfolioVolatility(portfolio),
        portfolio_beta: this.calculatePortfolioBeta(portfolio),
        portfolio_sharpe_ratio: this.calculatePortfolioSharpeRatio(portfolio),
        portfolio_sortino_ratio: this.calculatePortfolioSortinoRatio(portfolio),
        portfolio_maximum_drawdown: this.calculatePortfolioMaximumDrawdown(portfolio),
        portfolio_downside_deviation: this.calculatePortfolioDownsideDeviation(portfolio),
        portfolio_risk_score: this.calculatePortfolioRiskScore(portfolio),
        portfolio_risk_level: this.determinePortfolioRiskLevel(portfolio),
        diversification_ratio: this.calculateDiversificationRatio(portfolio),
        concentration_risk: this.calculateConcentrationRisk(portfolio)
      };

      // Cache the result
      await redisService.set(cacheKey, riskMetrics, 1800); // Cache for 30 minutes

      return riskMetrics;
    } catch (error) {
      logger.error('Error calculating portfolio risk:', error);
      throw error;
    }
  }

  async performStressTest(fundId, options = {}) {
    try {
      const {
        scenarios = ['2008_crisis', 'dot_com_bubble', 'covid_19'],
        period = '1y'
      } = options;

      // Check cache first
      const cacheKey = `stress_test:${fundId}:${scenarios.join(',')}:${period}`;
      const cachedStressTest = await redisService.get(cacheKey);
      if (cachedStressTest) {
        return cachedStressTest;
      }

      // Get fund performance data
      const performanceData = await this.getFundPerformanceData(fundId, period);

      if (performanceData.length === 0) {
        throw new Error('No performance data available for stress testing');
      }

      // Perform stress tests
      const stressTestResults = {
        fund_id: fundId,
        period,
        scenarios: {},
        overall_impact: 0,
        worst_case_scenario: null,
        best_case_scenario: null
      };

      let worstImpact = 0;
      let bestImpact = 0;

      for (const scenario of scenarios) {
        const scenarioResult = this.calculateStressTestScenario(performanceData, scenario);
        stressTestResults.scenarios[scenario] = scenarioResult;

        if (scenarioResult.impact < worstImpact) {
          worstImpact = scenarioResult.impact;
          stressTestResults.worst_case_scenario = scenario;
        }

        if (scenarioResult.impact > bestImpact) {
          bestImpact = scenarioResult.impact;
          stressTestResults.best_case_scenario = scenario;
        }
      }

      stressTestResults.overall_impact = (worstImpact + bestImpact) / 2;

      // Cache the result
      await redisService.set(cacheKey, stressTestResults, 3600); // Cache for 1 hour

      return stressTestResults;
    } catch (error) {
      logger.error('Error performing stress test:', error);
      throw error;
    }
  }

  async performMonteCarloSimulation(fundId, options = {}) {
    try {
      const {
        simulations = 10000,
        timeHorizon = 30,
        period = '1y'
      } = options;

      // Check cache first
      const cacheKey = `monte_carlo:${fundId}:${simulations}:${timeHorizon}:${period}`;
      const cachedSimulation = await redisService.get(cacheKey);
      if (cachedSimulation) {
        return cachedSimulation;
      }

      // Get fund performance data
      const performanceData = await this.getFundPerformanceData(fundId, period);

      if (performanceData.length === 0) {
        throw new Error('No performance data available for Monte Carlo simulation');
      }

      // Calculate historical statistics
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const volatility = this.calculateVolatility(performanceData);

      // Run Monte Carlo simulation
      const simulationResults = this.runMonteCarloSimulation(
        meanReturn,
        volatility,
        simulations,
        timeHorizon
      );

      const monteCarloResults = {
        fund_id: fundId,
        period,
        simulations,
        time_horizon: timeHorizon,
        mean_return: meanReturn,
        volatility: volatility,
        simulation_results: simulationResults,
        percentiles: this.calculatePercentiles(simulationResults),
        probability_of_loss: this.calculateProbabilityOfLoss(simulationResults),
        expected_value: this.calculateExpectedValue(simulationResults)
      };

      // Cache the result
      await redisService.set(cacheKey, monteCarloResults, 3600); // Cache for 1 hour

      return monteCarloResults;
    } catch (error) {
      logger.error('Error performing Monte Carlo simulation:', error);
      throw error;
    }
  }

  async getRiskDashboard(userId) {
    try {
      // Check cache first
      const cacheKey = `risk_dashboard:${userId}`;
      const cachedDashboard = await redisService.get(cacheKey);
      if (cachedDashboard) {
        return cachedDashboard;
      }

      // Get portfolio risk
      const portfolioRisk = await this.calculatePortfolioRisk(userId);

      // Get individual fund risks
      const portfolio = await this.getUserPortfolio(userId);
      const fundRisks = [];

      for (const holding of portfolio) {
        try {
          const fundRisk = await this.calculateFundRisk(holding.fund_id);
          fundRisks.push({
            fund_id: holding.fund_id,
            symbol: holding.symbol,
            name: holding.name,
            risk_score: fundRisk.risk_score,
            risk_level: fundRisk.risk_level,
            var: fundRisk.var,
            volatility: fundRisk.volatility
          });
        } catch (error) {
          logger.warn(`Error calculating risk for fund ${holding.fund_id}:`, error.message);
        }
      }

      // Get risk alerts
      const riskAlerts = await this.getRiskAlerts(userId);

      const dashboard = {
        user_id: userId,
        portfolio_risk: portfolioRisk,
        fund_risks: fundRisks,
        risk_alerts: riskAlerts,
        risk_summary: this.generateRiskSummary(portfolioRisk, fundRisks),
        generated_at: new Date()
      };

      // Cache the result
      await redisService.set(cacheKey, dashboard, 1800); // Cache for 30 minutes

      return dashboard;
    } catch (error) {
      logger.error('Error getting risk dashboard:', error);
      throw error;
    }
  }

  async getRiskAlerts(userId) {
    try {
      const alerts = [];

      // Get portfolio risk
      const portfolioRisk = await this.calculatePortfolioRisk(userId);

      // Check for high volatility
      if (portfolioRisk.portfolio_volatility > 20) {
        alerts.push({
          type: 'high_volatility',
          severity: 'warning',
          message: 'Portfolio volatility is above 20%',
          value: portfolioRisk.portfolio_volatility
        });
      }

      // Check for high VaR
      if (portfolioRisk.portfolio_var < -5) {
        alerts.push({
          type: 'high_var',
          severity: 'critical',
          message: 'Portfolio VaR is below -5%',
          value: portfolioRisk.portfolio_var
        });
      }

      // Check for high concentration risk
      if (portfolioRisk.concentration_risk > 0.5) {
        alerts.push({
          type: 'high_concentration',
          severity: 'warning',
          message: 'Portfolio concentration risk is high',
          value: portfolioRisk.concentration_risk
        });
      }

      // Check for low diversification
      if (portfolioRisk.diversification_ratio < 0.5) {
        alerts.push({
          type: 'low_diversification',
          severity: 'info',
          message: 'Portfolio diversification could be improved',
          value: portfolioRisk.diversification_ratio
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Error getting risk alerts:', error);
      return [];
    }
  }

  // Risk calculation methods
  calculateVaR(performanceData, confidenceLevel, timeHorizon) {
    try {
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const sortedReturns = returns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      return sortedReturns[index] || 0;
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      return 0;
    }
  }

  calculateCVaR(performanceData, confidenceLevel, timeHorizon) {
    try {
      const varValue = this.calculateVaR(performanceData, confidenceLevel, timeHorizon);
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const tailReturns = returns.filter(ret => ret <= varValue);
      
      if (tailReturns.length === 0) {
        return varValue;
      }

      return tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    } catch (error) {
      logger.error('Error calculating CVaR:', error);
      return 0;
    }
  }

  calculateVolatility(performanceData) {
    try {
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  calculateBeta(performanceData) {
    try {
      // This would require market data for proper beta calculation
      // For now, return a placeholder
      return 1.0;
    } catch (error) {
      logger.error('Error calculating beta:', error);
      return 1.0;
    }
  }

  calculateSharpeRatio(performanceData) {
    try {
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const volatility = this.calculateVolatility(performanceData);
      const riskFreeRate = 0.02; // Assume 2% risk-free rate

      return volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0;
    } catch (error) {
      logger.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  calculateSortinoRatio(performanceData) {
    try {
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const downsideDeviation = this.calculateDownsideDeviation(performanceData);
      const riskFreeRate = 0.02; // Assume 2% risk-free rate

      return downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
    } catch (error) {
      logger.error('Error calculating Sortino ratio:', error);
      return 0;
    }
  }

  calculateMaximumDrawdown(performanceData) {
    try {
      const navs = performanceData.map(p => p.nav);
      let maxNav = navs[0];
      let maxDrawdown = 0;

      for (let i = 1; i < navs.length; i++) {
        if (navs[i] > maxNav) {
          maxNav = navs[i];
        } else {
          const drawdown = ((maxNav - navs[i]) / maxNav) * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }

      return maxDrawdown;
    } catch (error) {
      logger.error('Error calculating maximum drawdown:', error);
      return 0;
    }
  }

  calculateDownsideDeviation(performanceData) {
    try {
      const returns = performanceData.map(p => p.total_return_1d || 0);
      const negativeReturns = returns.filter(ret => ret < 0);
      
      if (negativeReturns.length === 0) {
        return 0;
      }

      const mean = negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length;
      const variance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / negativeReturns.length;
      return Math.sqrt(variance);
    } catch (error) {
      logger.error('Error calculating downside deviation:', error);
      return 0;
    }
  }

  calculateRiskScore(performanceData) {
    try {
      const volatility = this.calculateVolatility(performanceData);
      const maxDrawdown = this.calculateMaximumDrawdown(performanceData);
      const var95 = this.calculateVaR(performanceData, 0.95, 1);

      // Simple risk score (0-100, higher = riskier)
      const riskScore = Math.min(100, (volatility * 10) + (maxDrawdown * 2) + (Math.abs(var95) * 5));
      return riskScore;
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 0;
    }
  }

  determineRiskLevel(performanceData) {
    try {
      const riskScore = this.calculateRiskScore(performanceData);

      if (riskScore < 20) {
        return 'very_low';
      } else if (riskScore < 40) {
        return 'low';
      } else if (riskScore < 60) {
        return 'medium';
      } else if (riskScore < 80) {
        return 'high';
      } else {
        return 'very_high';
      }
    } catch (error) {
      logger.error('Error determining risk level:', error);
      return 'medium';
    }
  }

  // Portfolio risk calculation methods
  calculatePortfolioVaR(portfolio, confidenceLevel, timeHorizon) {
    try {
      // This would calculate portfolio VaR considering correlations
      // For now, return a simplified calculation
      let totalVaR = 0;
      let totalValue = 0;

      for (const holding of portfolio) {
        const value = holding.shares_owned * holding.current_nav;
        totalValue += value;
        // Simplified VaR calculation
        totalVaR += value * 0.05; // Assume 5% VaR per holding
      }

      return totalValue > 0 ? (totalVaR / totalValue) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating portfolio VaR:', error);
      return 0;
    }
  }

  calculatePortfolioCVaR(portfolio, confidenceLevel, timeHorizon) {
    try {
      // Simplified CVaR calculation
      const portfolioVaR = this.calculatePortfolioVaR(portfolio, confidenceLevel, timeHorizon);
      return portfolioVaR * 1.2; // Assume CVaR is 20% higher than VaR
    } catch (error) {
      logger.error('Error calculating portfolio CVaR:', error);
      return 0;
    }
  }

  calculatePortfolioVolatility(portfolio) {
    try {
      // Simplified portfolio volatility calculation
      let totalVolatility = 0;
      let totalValue = 0;

      for (const holding of portfolio) {
        const value = holding.shares_owned * holding.current_nav;
        totalValue += value;
        // Assume 15% volatility per holding
        totalVolatility += value * 0.15;
      }

      return totalValue > 0 ? (totalVolatility / totalValue) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating portfolio volatility:', error);
      return 0;
    }
  }

  calculatePortfolioBeta(portfolio) {
    try {
      // Simplified portfolio beta calculation
      let totalBeta = 0;
      let totalValue = 0;

      for (const holding of portfolio) {
        const value = holding.shares_owned * holding.current_nav;
        totalValue += value;
        // Assume beta of 1.0 per holding
        totalBeta += value * 1.0;
      }

      return totalValue > 0 ? totalBeta / totalValue : 1.0;
    } catch (error) {
      logger.error('Error calculating portfolio beta:', error);
      return 1.0;
    }
  }

  calculatePortfolioSharpeRatio(portfolio) {
    try {
      // Simplified portfolio Sharpe ratio calculation
      const portfolioVolatility = this.calculatePortfolioVolatility(portfolio);
      const expectedReturn = 0.08; // Assume 8% expected return
      const riskFreeRate = 0.02; // Assume 2% risk-free rate

      return portfolioVolatility > 0 ? (expectedReturn - riskFreeRate) / portfolioVolatility : 0;
    } catch (error) {
      logger.error('Error calculating portfolio Sharpe ratio:', error);
      return 0;
    }
  }

  calculatePortfolioSortinoRatio(portfolio) {
    try {
      // Simplified portfolio Sortino ratio calculation
      const portfolioDownsideDeviation = this.calculatePortfolioDownsideDeviation(portfolio);
      const expectedReturn = 0.08; // Assume 8% expected return
      const riskFreeRate = 0.02; // Assume 2% risk-free rate

      return portfolioDownsideDeviation > 0 ? (expectedReturn - riskFreeRate) / portfolioDownsideDeviation : 0;
    } catch (error) {
      logger.error('Error calculating portfolio Sortino ratio:', error);
      return 0;
    }
  }

  calculatePortfolioMaximumDrawdown(portfolio) {
    try {
      // Simplified portfolio maximum drawdown calculation
      return 15.0; // Assume 15% maximum drawdown
    } catch (error) {
      logger.error('Error calculating portfolio maximum drawdown:', error);
      return 0;
    }
  }

  calculatePortfolioDownsideDeviation(portfolio) {
    try {
      // Simplified portfolio downside deviation calculation
      return 8.0; // Assume 8% downside deviation
    } catch (error) {
      logger.error('Error calculating portfolio downside deviation:', error);
      return 0;
    }
  }

  calculatePortfolioRiskScore(portfolio) {
    try {
      // Simplified portfolio risk score calculation
      const portfolioVolatility = this.calculatePortfolioVolatility(portfolio);
      const portfolioMaxDrawdown = this.calculatePortfolioMaximumDrawdown(portfolio);
      const portfolioVaR = this.calculatePortfolioVaR(portfolio, 0.95, 1);

      const riskScore = Math.min(100, (portfolioVolatility * 2) + (portfolioMaxDrawdown * 1.5) + (Math.abs(portfolioVaR) * 3));
      return riskScore;
    } catch (error) {
      logger.error('Error calculating portfolio risk score:', error);
      return 0;
    }
  }

  determinePortfolioRiskLevel(portfolio) {
    try {
      const riskScore = this.calculatePortfolioRiskScore(portfolio);

      if (riskScore < 20) {
        return 'very_low';
      } else if (riskScore < 40) {
        return 'low';
      } else if (riskScore < 60) {
        return 'medium';
      } else if (riskScore < 80) {
        return 'high';
      } else {
        return 'very_high';
      }
    } catch (error) {
      logger.error('Error determining portfolio risk level:', error);
      return 'medium';
    }
  }

  calculateDiversificationRatio(portfolio) {
    try {
      // Simplified diversification ratio calculation
      const fundCount = portfolio.length;
      const maxDiversification = Math.min(fundCount, 10); // Cap at 10 for scoring
      return Math.min(1.0, fundCount / 10);
    } catch (error) {
      logger.error('Error calculating diversification ratio:', error);
      return 0;
    }
  }

  calculateConcentrationRisk(portfolio) {
    try {
      const totalValue = portfolio.reduce((sum, holding) => 
        sum + (holding.shares_owned * holding.current_nav), 0
      );

      if (totalValue === 0) {
        return 0;
      }

      // Calculate Herfindahl-Hirschman Index (HHI)
      let hhi = 0;
      portfolio.forEach(holding => {
        const percentage = ((holding.shares_owned * holding.current_nav) / totalValue) * 100;
        hhi += percentage * percentage;
      });

      return hhi / 100; // Normalize to 0-1 scale
    } catch (error) {
      logger.error('Error calculating concentration risk:', error);
      return 0;
    }
  }

  // Stress testing methods
  calculateStressTestScenario(performanceData, scenario) {
    try {
      const scenarioImpacts = {
        '2008_crisis': -0.4, // 40% decline
        'dot_com_bubble': -0.3, // 30% decline
        'covid_19': -0.2, // 20% decline
        'interest_rate_shock': -0.15, // 15% decline
        'inflation_spike': -0.1, // 10% decline
        'currency_crisis': -0.25 // 25% decline
      };

      const impact = scenarioImpacts[scenario] || 0;
      const currentValue = performanceData[performanceData.length - 1]?.nav || 100;
      const stressedValue = currentValue * (1 + impact);

      return {
        scenario,
        impact: impact * 100, // Convert to percentage
        current_value: currentValue,
        stressed_value: stressedValue,
        value_change: stressedValue - currentValue
      };
    } catch (error) {
      logger.error('Error calculating stress test scenario:', error);
      return {
        scenario,
        impact: 0,
        current_value: 0,
        stressed_value: 0,
        value_change: 0
      };
    }
  }

  // Monte Carlo simulation methods
  runMonteCarloSimulation(meanReturn, volatility, simulations, timeHorizon) {
    try {
      const results = [];

      for (let i = 0; i < simulations; i++) {
        let cumulativeReturn = 0;
        
        for (let day = 0; day < timeHorizon; day++) {
          // Generate random return using normal distribution
          const randomReturn = this.generateRandomReturn(meanReturn, volatility);
          cumulativeReturn += randomReturn;
        }
        
        results.push(cumulativeReturn);
      }

      return results;
    } catch (error) {
      logger.error('Error running Monte Carlo simulation:', error);
      return [];
    }
  }

  generateRandomReturn(mean, volatility) {
    try {
      // Box-Muller transformation for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      return mean + volatility * z0;
    } catch (error) {
      logger.error('Error generating random return:', error);
      return 0;
    }
  }

  calculatePercentiles(results) {
    try {
      const sortedResults = results.sort((a, b) => a - b);
      const percentiles = {};

      [5, 10, 25, 50, 75, 90, 95].forEach(percentile => {
        const index = Math.floor((percentile / 100) * sortedResults.length);
        percentiles[`p${percentile}`] = sortedResults[index] || 0;
      });

      return percentiles;
    } catch (error) {
      logger.error('Error calculating percentiles:', error);
      return {};
    }
  }

  calculateProbabilityOfLoss(results) {
    try {
      const lossCount = results.filter(result => result < 0).length;
      return lossCount / results.length;
    } catch (error) {
      logger.error('Error calculating probability of loss:', error);
      return 0;
    }
  }

  calculateExpectedValue(results) {
    try {
      return results.reduce((sum, result) => sum + result, 0) / results.length;
    } catch (error) {
      logger.error('Error calculating expected value:', error);
      return 0;
    }
  }

  generateRiskSummary(portfolioRisk, fundRisks) {
    try {
      const summary = {
        overall_risk_level: portfolioRisk.portfolio_risk_level,
        risk_score: portfolioRisk.portfolio_risk_score,
        volatility: portfolioRisk.portfolio_volatility,
        var: portfolioRisk.portfolio_var,
        diversification: portfolioRisk.diversification_ratio,
        concentration: portfolioRisk.concentration_risk,
        recommendations: []
      };

      // Generate recommendations
      if (portfolioRisk.portfolio_volatility > 20) {
        summary.recommendations.push('Consider reducing portfolio volatility through diversification');
      }

      if (portfolioRisk.concentration_risk > 0.5) {
        summary.recommendations.push('Reduce concentration risk by diversifying across more funds');
      }

      if (portfolioRisk.diversification_ratio < 0.5) {
        summary.recommendations.push('Improve diversification by adding funds from different categories');
      }

      if (portfolioRisk.portfolio_var < -5) {
        summary.recommendations.push('Consider reducing portfolio risk to lower VaR');
      }

      return summary;
    } catch (error) {
      logger.error('Error generating risk summary:', error);
      return {
        overall_risk_level: 'medium',
        risk_score: 50,
        volatility: 0,
        var: 0,
        diversification: 0,
        concentration: 0,
        recommendations: []
      };
    }
  }

  // Helper methods
  async getFundPerformanceData(fundId, period) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
          AND date >= $2
        ORDER BY date ASC
      `, [fundId, this.calculateStartDate(period)]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting fund performance data:', error);
      return [];
    }
  }

  async getUserPortfolio(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          uh.*,
          mf.symbol,
          mf.name,
          fp.nav as current_nav
        FROM user_fund_holdings uh
        JOIN mutual_funds mf ON uh.fund_id = mf.id
        LEFT JOIN LATERAL (
          SELECT nav
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE uh.user_id = $1
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user portfolio:', error);
      return [];
    }
  }

  calculateStartDate(period) {
    try {
      const now = new Date();
      const startDate = new Date(now);

      switch (period) {
        case '1m':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case '3y':
          startDate.setFullYear(startDate.getFullYear() - 3);
          break;
        case '5y':
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        default:
          startDate.setFullYear(startDate.getFullYear() - 1);
      }

      return startDate;
    } catch (error) {
      logger.error('Error calculating start date:', error);
      return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = FundRiskService;
