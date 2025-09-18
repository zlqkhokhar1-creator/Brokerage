const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundComplianceService extends EventEmitter {
  constructor() {
    super();
    this.complianceRules = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load compliance rules
      await this.loadComplianceRules();
      
      this._initialized = true;
      logger.info('FundComplianceService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundComplianceService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundComplianceService closed');
    } catch (error) {
      logger.error('Error closing FundComplianceService:', error);
    }
  }

  async loadComplianceRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM compliance_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const rule of result.rows) {
        this.complianceRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${result.rows.length} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
      throw error;
    }
  }

  async checkCompliance(userId, action, data) {
    try {
      const violations = [];
      const applicableRules = this.getApplicableRules(action);

      for (const rule of applicableRules) {
        try {
          const isViolation = await this.evaluateRule(rule, userId, action, data);
          if (isViolation) {
            violations.push({
              rule_id: rule.id,
              rule_name: rule.name,
              violation_type: rule.violation_type,
              severity: rule.severity,
              message: rule.message,
              data: data
            });
          }
        } catch (error) {
          logger.error(`Error evaluating rule ${rule.id}:`, error);
        }
      }

      // Store violations
      if (violations.length > 0) {
        await this.storeViolations(userId, violations);
      }

      return {
        compliant: violations.length === 0,
        violations: violations
      };
    } catch (error) {
      logger.error('Error checking compliance:', error);
      throw error;
    }
  }

  async checkTradeCompliance(userId, tradeData) {
    try {
      const {
        fund_id,
        trade_type,
        shares,
        price_per_share,
        total_amount
      } = tradeData;

      // Get user's trading history
      const tradingHistory = await this.getUserTradingHistory(userId);
      const userProfile = await this.getUserProfile(userId);
      const fundData = await this.getFundData(fund_id);

      const complianceChecks = [];

      // Check minimum investment requirements
      const minInvestmentCheck = await this.checkMinimumInvestment(fundData, total_amount);
      complianceChecks.push(minInvestmentCheck);

      // Check pattern day trading rules
      const pdtCheck = await this.checkPatternDayTrading(userId, tradingHistory, tradeData);
      complianceChecks.push(pdtCheck);

      // Check wash sale rules
      const washSaleCheck = await this.checkWashSale(userId, tradingHistory, tradeData);
      complianceChecks.push(washSaleCheck);

      // Check suitability requirements
      const suitabilityCheck = await this.checkSuitability(userProfile, fundData, total_amount);
      complianceChecks.push(suitabilityCheck);

      // Check position limits
      const positionLimitCheck = await this.checkPositionLimits(userId, fund_id, shares, trade_type);
      complianceChecks.push(positionLimitCheck);

      // Check market hours
      const marketHoursCheck = await this.checkMarketHours(tradeData);
      complianceChecks.push(marketHoursCheck);

      // Check fund-specific restrictions
      const fundRestrictionCheck = await this.checkFundRestrictions(fundData, userProfile, tradeData);
      complianceChecks.push(fundRestrictionCheck);

      // Aggregate results
      const violations = complianceChecks.filter(check => !check.compliant);
      const warnings = complianceChecks.filter(check => check.warning);

      return {
        compliant: violations.length === 0,
        violations: violations,
        warnings: warnings,
        checks: complianceChecks
      };
    } catch (error) {
      logger.error('Error checking trade compliance:', error);
      throw error;
    }
  }

  async checkMinimumInvestment(fundData, totalAmount) {
    try {
      const minInvestment = fundData.minimum_investment || 0;
      const isCompliant = totalAmount >= minInvestment;

      return {
        check_type: 'minimum_investment',
        compliant: isCompliant,
        message: isCompliant ? 
          'Minimum investment requirement met' : 
          `Minimum investment of $${minInvestment} required`,
        data: {
          required: minInvestment,
          actual: totalAmount
        }
      };
    } catch (error) {
      logger.error('Error checking minimum investment:', error);
      return {
        check_type: 'minimum_investment',
        compliant: false,
        message: 'Error checking minimum investment requirement',
        data: {}
      };
    }
  }

  async checkPatternDayTrading(userId, tradingHistory, tradeData) {
    try {
      // Check if user is a pattern day trader
      const isPDT = await this.isPatternDayTrader(userId, tradingHistory);
      
      if (!isPDT) {
        return {
          check_type: 'pattern_day_trading',
          compliant: true,
          message: 'Pattern day trading rules do not apply',
          data: { is_pdt: false }
        };
      }

      // Check PDT requirements
      const accountValue = await this.getAccountValue(userId);
      const pdtMinimum = 25000; // $25,000 minimum for PDT

      const isCompliant = accountValue >= pdtMinimum;

      return {
        check_type: 'pattern_day_trading',
        compliant: isCompliant,
        message: isCompliant ? 
          'Pattern day trading requirements met' : 
          `Pattern day trading requires minimum account value of $${pdtMinimum}`,
        data: {
          is_pdt: true,
          required: pdtMinimum,
          actual: accountValue
        }
      };
    } catch (error) {
      logger.error('Error checking pattern day trading:', error);
      return {
        check_type: 'pattern_day_trading',
        compliant: false,
        message: 'Error checking pattern day trading rules',
        data: {}
      };
    }
  }

  async checkWashSale(userId, tradingHistory, tradeData) {
    try {
      const { fund_id, trade_type, shares } = tradeData;

      if (trade_type !== 'SELL') {
        return {
          check_type: 'wash_sale',
          compliant: true,
          message: 'Wash sale rules only apply to sell orders',
          data: {}
        };
      }

      // Check for wash sale violations
      const washSaleViolations = await this.findWashSaleViolations(userId, fund_id, shares, tradingHistory);
      
      const isCompliant = washSaleViolations.length === 0;

      return {
        check_type: 'wash_sale',
        compliant: isCompliant,
        message: isCompliant ? 
          'No wash sale violations detected' : 
          `Wash sale violation detected: ${washSaleViolations.length} potential violations`,
        data: {
          violations: washSaleViolations
        }
      };
    } catch (error) {
      logger.error('Error checking wash sale:', error);
      return {
        check_type: 'wash_sale',
        compliant: false,
        message: 'Error checking wash sale rules',
        data: {}
      };
    }
  }

  async checkSuitability(userProfile, fundData, totalAmount) {
    try {
      const userRiskTolerance = userProfile.risk_tolerance || 'medium';
      const fundRiskLevel = fundData.risk_level || 'medium';

      // Check risk tolerance compatibility
      const riskCompatible = this.isRiskCompatible(userRiskTolerance, fundRiskLevel);

      // Check investment amount suitability
      const portfolioValue = userProfile.portfolio_value || 0;
      const investmentPercentage = (totalAmount / portfolioValue) * 100;
      const maxSingleInvestment = 20; // 20% of portfolio

      const amountSuitable = investmentPercentage <= maxSingleInvestment;

      const isCompliant = riskCompatible && amountSuitable;

      return {
        check_type: 'suitability',
        compliant: isCompliant,
        message: isCompliant ? 
          'Investment is suitable for user profile' : 
          'Investment may not be suitable for user profile',
        data: {
          user_risk_tolerance: userRiskTolerance,
          fund_risk_level: fundRiskLevel,
          investment_percentage: investmentPercentage,
          max_single_investment: maxSingleInvestment
        }
      };
    } catch (error) {
      logger.error('Error checking suitability:', error);
      return {
        check_type: 'suitability',
        compliant: false,
        message: 'Error checking suitability requirements',
        data: {}
      };
    }
  }

  async checkPositionLimits(userId, fundId, shares, tradeType) {
    try {
      // Get current position
      const currentPosition = await this.getCurrentPosition(userId, fundId);
      
      // Calculate new position
      const newPosition = tradeType === 'BUY' ? 
        currentPosition + shares : 
        currentPosition - shares;

      // Check position limits
      const maxPosition = 1000000; // 1M shares limit
      const isCompliant = newPosition >= 0 && newPosition <= maxPosition;

      return {
        check_type: 'position_limits',
        compliant: isCompliant,
        message: isCompliant ? 
          'Position limits satisfied' : 
          'Position would exceed limits',
        data: {
          current_position: currentPosition,
          new_position: newPosition,
          max_position: maxPosition
        }
      };
    } catch (error) {
      logger.error('Error checking position limits:', error);
      return {
        check_type: 'position_limits',
        compliant: false,
        message: 'Error checking position limits',
        data: {}
      };
    }
  }

  async checkMarketHours(tradeData) {
    try {
      const now = new Date();
      const marketOpen = new Date(now);
      marketOpen.setHours(9, 30, 0, 0); // 9:30 AM
      
      const marketClose = new Date(now);
      marketClose.setHours(16, 0, 0, 0); // 4:00 PM

      const isMarketHours = now >= marketOpen && now <= marketClose;
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

      const isCompliant = isMarketHours && isWeekday;

      return {
        check_type: 'market_hours',
        compliant: isCompliant,
        message: isCompliant ? 
          'Trade is within market hours' : 
          'Trade is outside market hours',
        data: {
          current_time: now,
          market_open: marketOpen,
          market_close: marketClose,
          is_weekday: isWeekday
        }
      };
    } catch (error) {
      logger.error('Error checking market hours:', error);
      return {
        check_type: 'market_hours',
        compliant: false,
        message: 'Error checking market hours',
        data: {}
      };
    }
  }

  async checkFundRestrictions(fundData, userProfile, tradeData) {
    try {
      const restrictions = [];

      // Check if fund is tradeable
      if (!fundData.is_tradeable) {
        restrictions.push('Fund is not available for trading');
      }

      // Check if fund is active
      if (!fundData.is_active) {
        restrictions.push('Fund is not active');
      }

      // Check user tier restrictions
      const userTier = userProfile.membership_tier || 'basic';
      const requiredTier = fundData.required_tier || 'basic';
      
      if (!this.isTierCompatible(userTier, requiredTier)) {
        restrictions.push(`Fund requires ${requiredTier} tier membership`);
      }

      // Check geographic restrictions
      const userCountry = userProfile.country || 'US';
      const allowedCountries = fundData.allowed_countries || ['US'];
      
      if (!allowedCountries.includes(userCountry)) {
        restrictions.push('Fund is not available in your country');
      }

      const isCompliant = restrictions.length === 0;

      return {
        check_type: 'fund_restrictions',
        compliant: isCompliant,
        message: isCompliant ? 
          'Fund restrictions satisfied' : 
          `Fund restrictions violated: ${restrictions.join(', ')}`,
        data: {
          restrictions: restrictions
        }
      };
    } catch (error) {
      logger.error('Error checking fund restrictions:', error);
      return {
        check_type: 'fund_restrictions',
        compliant: false,
        message: 'Error checking fund restrictions',
        data: {}
      };
    }
  }

  async isPatternDayTrader(userId, tradingHistory) {
    try {
      // Check if user has made 4 or more day trades in 5 business days
      const dayTrades = tradingHistory.filter(trade => 
        trade.trade_type === 'SELL' && 
        this.isDayTrade(trade, tradingHistory)
      );

      // Count day trades in last 5 business days
      const fiveBusinessDaysAgo = new Date();
      fiveBusinessDaysAgo.setDate(fiveBusinessDaysAgo.getDate() - 7); // Approximate 5 business days

      const recentDayTrades = dayTrades.filter(trade => 
        new Date(trade.trade_date) >= fiveBusinessDaysAgo
      );

      return recentDayTrades.length >= 4;
    } catch (error) {
      logger.error('Error checking pattern day trader status:', error);
      return false;
    }
  }

  isDayTrade(sellTrade, tradingHistory) {
    try {
      // Find corresponding buy trade on the same day
      const buyTrade = tradingHistory.find(trade => 
        trade.fund_id === sellTrade.fund_id &&
        trade.trade_type === 'BUY' &&
        trade.trade_date === sellTrade.trade_date
      );

      return !!buyTrade;
    } catch (error) {
      logger.error('Error checking day trade:', error);
      return false;
    }
  }

  async findWashSaleViolations(userId, fundId, shares, tradingHistory) {
    try {
      const violations = [];
      const washSaleWindow = 30; // 30 days

      // Find recent sales of the same fund
      const recentSales = tradingHistory.filter(trade => 
        trade.fund_id === fundId &&
        trade.trade_type === 'SELL' &&
        this.isWithinWashSaleWindow(trade.trade_date, washSaleWindow)
      );

      // Check for wash sale violations
      for (const sale of recentSales) {
        const buyTrade = tradingHistory.find(trade => 
          trade.fund_id === fundId &&
          trade.trade_type === 'BUY' &&
          trade.trade_date > sale.trade_date &&
          this.isWithinWashSaleWindow(trade.trade_date, washSaleWindow)
        );

        if (buyTrade) {
          violations.push({
            sale_trade: sale,
            buy_trade: buyTrade,
            violation_type: 'wash_sale'
          });
        }
      }

      return violations;
    } catch (error) {
      logger.error('Error finding wash sale violations:', error);
      return [];
    }
  }

  isWithinWashSaleWindow(tradeDate, windowDays) {
    try {
      const trade = new Date(tradeDate);
      const now = new Date();
      const diffTime = Math.abs(now - trade);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays <= windowDays;
    } catch (error) {
      logger.error('Error checking wash sale window:', error);
      return false;
    }
  }

  isRiskCompatible(userRiskTolerance, fundRiskLevel) {
    try {
      const riskLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      const userIndex = riskLevels.indexOf(userRiskTolerance);
      const fundIndex = riskLevels.indexOf(fundRiskLevel);

      // User can invest in funds with risk level equal to or lower than their tolerance
      return fundIndex <= userIndex;
    } catch (error) {
      logger.error('Error checking risk compatibility:', error);
      return false;
    }
  }

  isTierCompatible(userTier, requiredTier) {
    try {
      const tiers = ['basic', 'premium', 'professional', 'institutional'];
      const userIndex = tiers.indexOf(userTier);
      const requiredIndex = tiers.indexOf(requiredTier);

      return userIndex >= requiredIndex;
    } catch (error) {
      logger.error('Error checking tier compatibility:', error);
      return false;
    }
  }

  async getApplicableRules(action) {
    try {
      const applicableRules = [];

      for (const [ruleId, rule] of this.complianceRules) {
        if (rule.applicable_actions.includes(action) || rule.applicable_actions.includes('all')) {
          applicableRules.push(rule);
        }
      }

      return applicableRules;
    } catch (error) {
      logger.error('Error getting applicable rules:', error);
      return [];
    }
  }

  async evaluateRule(rule, userId, action, data) {
    try {
      // This would evaluate the specific rule logic
      // For now, return a placeholder
      return false;
    } catch (error) {
      logger.error('Error evaluating rule:', error);
      return false;
    }
  }

  async storeViolations(userId, violations) {
    try {
      for (const violation of violations) {
        await pool.query(`
          INSERT INTO compliance_violations (
            user_id, rule_id, violation_type, severity, message, data, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          userId,
          violation.rule_id,
          violation.violation_type,
          violation.severity,
          violation.message,
          JSON.stringify(violation.data),
          new Date()
        ]);
      }

      logger.info(`Stored ${violations.length} compliance violations for user ${userId}`);
    } catch (error) {
      logger.error('Error storing violations:', error);
      throw error;
    }
  }

  async getUserTradingHistory(userId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_trades
        WHERE user_id = $1
        ORDER BY trade_date DESC
        LIMIT 100
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user trading history:', error);
      return [];
    }
  }

  async getUserProfile(userId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM user_profiles
        WHERE user_id = $1
      `, [userId]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return {};
    }
  }

  async getFundData(fundId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM mutual_funds
        WHERE id = $1
      `, [fundId]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting fund data:', error);
      return {};
    }
  }

  async getAccountValue(userId) {
    try {
      const result = await pool.query(`
        SELECT SUM(current_value) as total_value
        FROM user_fund_holdings
        WHERE user_id = $1
      `, [userId]);

      return parseFloat(result.rows[0].total_value) || 0;
    } catch (error) {
      logger.error('Error getting account value:', error);
      return 0;
    }
  }

  async getCurrentPosition(userId, fundId) {
    try {
      const result = await pool.query(`
        SELECT shares_owned
        FROM user_fund_holdings
        WHERE user_id = $1 AND fund_id = $2
      `, [userId, fundId]);

      return parseFloat(result.rows[0]?.shares_owned) || 0;
    } catch (error) {
      logger.error('Error getting current position:', error);
      return 0;
    }
  }

  async getComplianceReport(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date = new Date()
      } = options;

      // Get compliance violations
      const violations = await pool.query(`
        SELECT *
        FROM compliance_violations
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY created_at DESC
      `, [userId, start_date, end_date]);

      // Get compliance summary
      const summary = await this.getComplianceSummary(userId, start_date, end_date);

      return {
        user_id: userId,
        start_date,
        end_date,
        violations: violations.rows,
        summary: summary,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error getting compliance report:', error);
      throw error;
    }
  }

  async getComplianceSummary(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_violations,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_violations,
          COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_violations
        FROM compliance_violations
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `, [userId, startDate, endDate]);

      return result.rows[0] || {
        total_violations: 0,
        critical_violations: 0,
        warning_violations: 0,
        info_violations: 0
      };
    } catch (error) {
      logger.error('Error getting compliance summary:', error);
      return {
        total_violations: 0,
        critical_violations: 0,
        warning_violations: 0,
        info_violations: 0
      };
    }
  }

  async getComplianceStats() {
    try {
      const stats = {
        total_rules: this.complianceRules.size,
        active_rules: Array.from(this.complianceRules.values()).filter(rule => rule.is_active).length,
        total_violations: 0,
        critical_violations: 0
      };

      // Get violation counts
      const violationResult = await pool.query(`
        SELECT 
          COUNT(*) as total_violations,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations
        FROM compliance_violations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (violationResult.rows.length > 0) {
        stats.total_violations = parseInt(violationResult.rows[0].total_violations);
        stats.critical_violations = parseInt(violationResult.rows[0].critical_violations);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting compliance stats:', error);
      return {
        total_rules: 0,
        active_rules: 0,
        total_violations: 0,
        critical_violations: 0
      };
    }
  }
}

module.exports = FundComplianceService;
