const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class ComplianceEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.complianceRules = new Map();
    this.violations = new Map();
    this.checks = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadComplianceRules();
      logger.info('Compliance Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Compliance Engine:', error);
      throw error;
    }
  }

  async loadComplianceRules() {
    try {
      const defaultRules = [
        {
          id: 'position_limit_check',
          name: 'Position Limit Check',
          description: 'Check if position exceeds regulatory limits',
          category: 'position_limits',
          severity: 'high',
          enabled: true,
          conditions: {
            maxPositionValue: 1000000, // $1M
            maxPositionPercentage: 10, // 10% of portfolio
            maxSectorExposure: 25 // 25% per sector
          }
        },
        {
          id: 'concentration_limit_check',
          name: 'Concentration Limit Check',
          description: 'Check portfolio concentration limits',
          category: 'concentration',
          severity: 'medium',
          enabled: true,
          conditions: {
            maxSingleAssetWeight: 5, // 5% max per asset
            maxSectorWeight: 30, // 30% max per sector
            maxCountryWeight: 40 // 40% max per country
          }
        },
        {
          id: 'liquidity_requirement_check',
          name: 'Liquidity Requirement Check',
          description: 'Ensure minimum liquidity requirements',
          category: 'liquidity',
          severity: 'high',
          enabled: true,
          conditions: {
            minLiquidityRatio: 0.1, // 10% liquid assets
            minCashReserve: 50000, // $50K cash reserve
            maxIlliquidAssets: 0.2 // 20% max illiquid
          }
        },
        {
          id: 'regulatory_capital_check',
          name: 'Regulatory Capital Check',
          description: 'Check regulatory capital requirements',
          category: 'capital',
          severity: 'critical',
          enabled: true,
          conditions: {
            minCapitalRatio: 0.08, // 8% minimum
            minTier1Capital: 0.06, // 6% Tier 1
            minLeverageRatio: 0.03 // 3% leverage ratio
          }
        },
        {
          id: 'risk_limit_check',
          name: 'Risk Limit Check',
          description: 'Check risk management limits',
          category: 'risk',
          severity: 'high',
          enabled: true,
          conditions: {
            maxVaR: 0.05, // 5% VaR limit
            maxDrawdown: 0.15, // 15% max drawdown
            maxVolatility: 0.25 // 25% max volatility
          }
        }
      ];

      for (const rule of defaultRules) {
        this.complianceRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${defaultRules.length} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
    }
  }

  async checkCompliance(data, user) {
    try {
      const { portfolioId, positions, marketData, portfolioValue } = data;
      const startTime = Date.now();
      
      const complianceResult = {
        portfolioId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        status: 'compliant',
        violations: [],
        checks: [],
        riskScore: 0,
        recommendations: []
      };
      
      // Run all enabled compliance checks
      for (const [ruleId, rule] of this.complianceRules) {
        if (!rule.enabled) continue;
        
        try {
          const checkResult = await this.runComplianceCheck(rule, {
            portfolioId,
            positions,
            marketData,
            portfolioValue,
            user
          });
          
          complianceResult.checks.push(checkResult);
          
          if (checkResult.status === 'violation') {
            complianceResult.status = 'non_compliant';
            complianceResult.violations.push(checkResult);
            
            // Emit violation event
            this.emit('complianceViolation', {
              portfolioId,
              ruleId,
              ruleName: rule.name,
              violation: checkResult,
              user: user.id
            });
          }
        } catch (error) {
          logger.error(`Error running compliance check ${ruleId}:`, error);
          complianceResult.checks.push({
            ruleId,
            status: 'error',
            error: error.message
          });
        }
      }
      
      // Calculate overall risk score
      complianceResult.riskScore = this.calculateRiskScore(complianceResult.checks);
      
      // Generate recommendations
      complianceResult.recommendations = this.generateRecommendations(complianceResult.violations);
      
      // Store compliance result
      await this.storeComplianceResult(complianceResult);
      
      logger.performance('Compliance check', Date.now() - startTime, {
        portfolioId,
        violations: complianceResult.violations.length,
        checks: complianceResult.checks.length
      });
      
      return complianceResult;
    } catch (error) {
      logger.error('Error checking compliance:', error);
      throw error;
    }
  }

  async runComplianceCheck(rule, data) {
    try {
      const { portfolioId, positions, marketData, portfolioValue, user } = data;
      const { conditions } = rule;
      
      let checkResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: 'compliant',
        details: {},
        violations: []
      };
      
      switch (rule.id) {
        case 'position_limit_check':
          checkResult = await this.checkPositionLimits(rule, data);
          break;
        case 'concentration_limit_check':
          checkResult = await this.checkConcentrationLimits(rule, data);
          break;
        case 'liquidity_requirement_check':
          checkResult = await this.checkLiquidityRequirements(rule, data);
          break;
        case 'regulatory_capital_check':
          checkResult = await this.checkRegulatoryCapital(rule, data);
          break;
        case 'risk_limit_check':
          checkResult = await this.checkRiskLimits(rule, data);
          break;
        default:
          checkResult.status = 'skipped';
          checkResult.details = { reason: 'Unknown rule type' };
      }
      
      return checkResult;
    } catch (error) {
      logger.error(`Error running compliance check ${rule.id}:`, error);
      return {
        ruleId: rule.id,
        status: 'error',
        error: error.message
      };
    }
  }

  async checkPositionLimits(rule, data) {
    try {
      const { positions, portfolioValue } = data;
      const { conditions } = rule;
      const violations = [];
      
      for (const position of positions) {
        const positionValue = position.quantity * position.price;
        const positionPercentage = (positionValue / portfolioValue) * 100;
        
        // Check position value limit
        if (positionValue > conditions.maxPositionValue) {
          violations.push({
            type: 'position_value_exceeded',
            symbol: position.symbol,
            currentValue: positionValue,
            limit: conditions.maxPositionValue,
            severity: 'high'
          });
        }
        
        // Check position percentage limit
        if (positionPercentage > conditions.maxPositionPercentage) {
          violations.push({
            type: 'position_percentage_exceeded',
            symbol: position.symbol,
            currentPercentage: positionPercentage,
            limit: conditions.maxPositionPercentage,
            severity: 'high'
          });
        }
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: violations.length > 0 ? 'violation' : 'compliant',
        details: {
          totalPositions: positions.length,
          portfolioValue: portfolioValue
        },
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking position limits:', error);
      throw error;
    }
  }

  async checkConcentrationLimits(rule, data) {
    try {
      const { positions, portfolioValue } = data;
      const { conditions } = rule;
      const violations = [];
      
      // Calculate asset weights
      const assetWeights = {};
      const sectorWeights = {};
      const countryWeights = {};
      
      for (const position of positions) {
        const positionValue = position.quantity * position.price;
        const weight = (positionValue / portfolioValue) * 100;
        
        // Asset weight
        assetWeights[position.symbol] = (assetWeights[position.symbol] || 0) + weight;
        
        // Sector weight (mock data - in reality would come from market data)
        const sector = this.getAssetSector(position.symbol);
        sectorWeights[sector] = (sectorWeights[sector] || 0) + weight;
        
        // Country weight (mock data - in reality would come from market data)
        const country = this.getAssetCountry(position.symbol);
        countryWeights[country] = (countryWeights[country] || 0) + weight;
      }
      
      // Check single asset concentration
      for (const [symbol, weight] of Object.entries(assetWeights)) {
        if (weight > conditions.maxSingleAssetWeight) {
          violations.push({
            type: 'single_asset_concentration_exceeded',
            symbol: symbol,
            currentWeight: weight,
            limit: conditions.maxSingleAssetWeight,
            severity: 'medium'
          });
        }
      }
      
      // Check sector concentration
      for (const [sector, weight] of Object.entries(sectorWeights)) {
        if (weight > conditions.maxSectorWeight) {
          violations.push({
            type: 'sector_concentration_exceeded',
            sector: sector,
            currentWeight: weight,
            limit: conditions.maxSectorWeight,
            severity: 'medium'
          });
        }
      }
      
      // Check country concentration
      for (const [country, weight] of Object.entries(countryWeights)) {
        if (weight > conditions.maxCountryWeight) {
          violations.push({
            type: 'country_concentration_exceeded',
            country: country,
            currentWeight: weight,
            limit: conditions.maxCountryWeight,
            severity: 'medium'
          });
        }
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: violations.length > 0 ? 'violation' : 'compliant',
        details: {
          assetWeights: assetWeights,
          sectorWeights: sectorWeights,
          countryWeights: countryWeights
        },
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking concentration limits:', error);
      throw error;
    }
  }

  async checkLiquidityRequirements(rule, data) {
    try {
      const { positions, portfolioValue } = data;
      const { conditions } = rule;
      const violations = [];
      
      let liquidValue = 0;
      let illiquidValue = 0;
      let cashReserve = 0;
      
      for (const position of positions) {
        const positionValue = position.quantity * position.price;
        const liquidity = this.getAssetLiquidity(position.symbol);
        
        if (liquidity === 'liquid') {
          liquidValue += positionValue;
        } else if (liquidity === 'illiquid') {
          illiquidValue += positionValue;
        } else if (liquidity === 'cash') {
          cashReserve += positionValue;
        }
      }
      
      const liquidityRatio = liquidValue / portfolioValue;
      const illiquidRatio = illiquidValue / portfolioValue;
      
      // Check minimum liquidity ratio
      if (liquidityRatio < conditions.minLiquidityRatio) {
        violations.push({
          type: 'liquidity_ratio_insufficient',
          currentRatio: liquidityRatio,
          requiredRatio: conditions.minLiquidityRatio,
          severity: 'high'
        });
      }
      
      // Check minimum cash reserve
      if (cashReserve < conditions.minCashReserve) {
        violations.push({
          type: 'cash_reserve_insufficient',
          currentReserve: cashReserve,
          requiredReserve: conditions.minCashReserve,
          severity: 'high'
        });
      }
      
      // Check maximum illiquid assets
      if (illiquidRatio > conditions.maxIlliquidAssets) {
        violations.push({
          type: 'illiquid_assets_exceeded',
          currentRatio: illiquidRatio,
          maxRatio: conditions.maxIlliquidAssets,
          severity: 'medium'
        });
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: violations.length > 0 ? 'violation' : 'compliant',
        details: {
          liquidValue: liquidValue,
          illiquidValue: illiquidValue,
          cashReserve: cashReserve,
          liquidityRatio: liquidityRatio,
          illiquidRatio: illiquidRatio
        },
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking liquidity requirements:', error);
      throw error;
    }
  }

  async checkRegulatoryCapital(rule, data) {
    try {
      const { portfolioValue } = data;
      const { conditions } = rule;
      const violations = [];
      
      // Mock capital calculations - in reality would be more complex
      const totalCapital = portfolioValue * 0.12; // 12% capital ratio
      const tier1Capital = totalCapital * 0.8; // 80% Tier 1
      const leverageRatio = totalCapital / portfolioValue;
      
      const capitalRatio = totalCapital / portfolioValue;
      const tier1Ratio = tier1Capital / portfolioValue;
      
      // Check minimum capital ratio
      if (capitalRatio < conditions.minCapitalRatio) {
        violations.push({
          type: 'capital_ratio_insufficient',
          currentRatio: capitalRatio,
          requiredRatio: conditions.minCapitalRatio,
          severity: 'critical'
        });
      }
      
      // Check minimum Tier 1 capital
      if (tier1Ratio < conditions.minTier1Capital) {
        violations.push({
          type: 'tier1_capital_insufficient',
          currentRatio: tier1Ratio,
          requiredRatio: conditions.minTier1Capital,
          severity: 'critical'
        });
      }
      
      // Check minimum leverage ratio
      if (leverageRatio < conditions.minLeverageRatio) {
        violations.push({
          type: 'leverage_ratio_insufficient',
          currentRatio: leverageRatio,
          requiredRatio: conditions.minLeverageRatio,
          severity: 'critical'
        });
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: violations.length > 0 ? 'violation' : 'compliant',
        details: {
          totalCapital: totalCapital,
          tier1Capital: tier1Capital,
          capitalRatio: capitalRatio,
          tier1Ratio: tier1Ratio,
          leverageRatio: leverageRatio
        },
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking regulatory capital:', error);
      throw error;
    }
  }

  async checkRiskLimits(rule, data) {
    try {
      const { positions, marketData } = data;
      const { conditions } = rule;
      const violations = [];
      
      // Mock risk calculations - in reality would use proper risk models
      const portfolioVaR = 0.03; // 3% VaR
      const maxDrawdown = 0.08; // 8% max drawdown
      const volatility = 0.15; // 15% volatility
      
      // Check VaR limit
      if (portfolioVaR > conditions.maxVaR) {
        violations.push({
          type: 'var_limit_exceeded',
          currentVaR: portfolioVaR,
          maxVaR: conditions.maxVaR,
          severity: 'high'
        });
      }
      
      // Check drawdown limit
      if (maxDrawdown > conditions.maxDrawdown) {
        violations.push({
          type: 'drawdown_limit_exceeded',
          currentDrawdown: maxDrawdown,
          maxDrawdown: conditions.maxDrawdown,
          severity: 'high'
        });
      }
      
      // Check volatility limit
      if (volatility > conditions.maxVolatility) {
        violations.push({
          type: 'volatility_limit_exceeded',
          currentVolatility: volatility,
          maxVolatility: conditions.maxVolatility,
          severity: 'medium'
        });
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: violations.length > 0 ? 'violation' : 'compliant',
        details: {
          portfolioVaR: portfolioVaR,
          maxDrawdown: maxDrawdown,
          volatility: volatility
        },
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking risk limits:', error);
      throw error;
    }
  }

  getAssetSector(symbol) {
    // Mock sector mapping - in reality would come from market data
    const sectorMap = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'JPM': 'Financial',
      'BAC': 'Financial'
    };
    return sectorMap[symbol] || 'Other';
  }

  getAssetCountry(symbol) {
    // Mock country mapping - in reality would come from market data
    const countryMap = {
      'AAPL': 'US',
      'GOOGL': 'US',
      'MSFT': 'US',
      'JNJ': 'US',
      'PFE': 'US',
      'JPM': 'US',
      'BAC': 'US'
    };
    return countryMap[symbol] || 'US';
  }

  getAssetLiquidity(symbol) {
    // Mock liquidity classification - in reality would come from market data
    const liquidAssets = ['AAPL', 'GOOGL', 'MSFT', 'JPM', 'BAC'];
    const cashAssets = ['CASH', 'USD', 'EUR'];
    
    if (cashAssets.includes(symbol)) return 'cash';
    if (liquidAssets.includes(symbol)) return 'liquid';
    return 'illiquid';
  }

  calculateRiskScore(checks) {
    try {
      let totalScore = 0;
      let weightSum = 0;
      
      for (const check of checks) {
        if (check.status === 'violation') {
          const weight = this.getSeverityWeight(check.severity);
          const score = this.getViolationScore(check.violations);
          totalScore += score * weight;
          weightSum += weight;
        }
      }
      
      return weightSum > 0 ? Math.min(100, (totalScore / weightSum) * 100) : 0;
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 0;
    }
  }

  getSeverityWeight(severity) {
    const weights = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 5
    };
    return weights[severity] || 1;
  }

  getViolationScore(violations) {
    return violations.length * 20; // 20 points per violation
  }

  generateRecommendations(violations) {
    try {
      const recommendations = [];
      
      for (const violation of violations) {
        switch (violation.ruleId) {
          case 'position_limit_check':
            recommendations.push({
              type: 'position_reduction',
              priority: 'high',
              message: 'Reduce position sizes to comply with regulatory limits',
              actions: ['Sell excess positions', 'Diversify holdings']
            });
            break;
          case 'concentration_limit_check':
            recommendations.push({
              type: 'diversification',
              priority: 'medium',
              message: 'Diversify portfolio to reduce concentration risk',
              actions: ['Rebalance sector allocation', 'Add new asset classes']
            });
            break;
          case 'liquidity_requirement_check':
            recommendations.push({
              type: 'liquidity_improvement',
              priority: 'high',
              message: 'Increase portfolio liquidity to meet regulatory requirements',
              actions: ['Increase cash reserves', 'Convert illiquid assets']
            });
            break;
          case 'regulatory_capital_check':
            recommendations.push({
              type: 'capital_increase',
              priority: 'critical',
              message: 'Increase regulatory capital to meet requirements',
              actions: ['Raise additional capital', 'Reduce risk-weighted assets']
            });
            break;
          case 'risk_limit_check':
            recommendations.push({
              type: 'risk_reduction',
              priority: 'high',
              message: 'Reduce portfolio risk to meet regulatory limits',
              actions: ['Implement hedging strategies', 'Reduce position sizes']
            });
            break;
        }
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  async getComplianceStatus(portfolioId, userId) {
    try {
      const query = `
        SELECT * FROM compliance_results 
        WHERE portfolio_id = $1 AND user_id = $2 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [portfolioId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting compliance status for ${portfolioId}:`, error);
      return null;
    }
  }

  async storeComplianceResult(result) {
    try {
      const query = `
        INSERT INTO compliance_results (
          id, portfolio_id, user_id, status, violations, checks, 
          risk_score, recommendations, timestamp, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        result.portfolioId,
        result.userId,
        result.status,
        JSON.stringify(result.violations),
        JSON.stringify(result.checks),
        result.riskScore,
        JSON.stringify(result.recommendations),
        result.timestamp,
        new Date()
      ]);
    } catch (error) {
      logger.error('Error storing compliance result:', error);
      throw error;
    }
  }

  async runDailyChecks() {
    try {
      logger.info('Running daily compliance checks...');
      
      // Get all active portfolios
      const query = `
        SELECT DISTINCT portfolio_id, user_id 
        FROM portfolios 
        WHERE status = 'active'
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        try {
          // Mock portfolio data - in reality would fetch from portfolio service
          const portfolioData = {
            portfolioId: row.portfolio_id,
            positions: [],
            marketData: {},
            portfolioValue: 1000000
          };
          
          const user = { id: row.user_id };
          await this.checkCompliance(portfolioData, user);
        } catch (error) {
          logger.error(`Error running daily check for portfolio ${row.portfolio_id}:`, error);
        }
      }
      
      logger.info('Daily compliance checks completed');
    } catch (error) {
      logger.error('Error running daily compliance checks:', error);
    }
  }

  async close() {
    try {
      logger.info('Compliance Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Compliance Engine:', error);
    }
  }
}

module.exports = ComplianceEngine;

