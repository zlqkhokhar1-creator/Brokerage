const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class RiskManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.riskRules = new Map();
    this.userLimits = new Map();
    this.positionLimits = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadRiskRules();
      await this.loadUserLimits();
      logger.info('Risk Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Risk Manager:', error);
      throw error;
    }
  }

  async loadRiskRules() {
    try {
      // Load risk rules from database
      const query = `
        SELECT id, name, type, conditions, actions, priority, is_active
        FROM risk_rules 
        WHERE is_active = true
        ORDER BY priority ASC
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        this.riskRules.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          conditions: row.conditions,
          actions: row.actions,
          priority: row.priority,
          isActive: row.is_active
        });
      }
      
      logger.info(`Loaded ${result.rows.length} risk rules`);
    } catch (error) {
      logger.error('Failed to load risk rules:', error);
    }
  }

  async loadUserLimits() {
    try {
      // Load user risk limits from database
      const query = `
        SELECT user_id, max_position_size, max_daily_loss, max_drawdown, 
               max_trades_per_day, max_exposure, risk_tolerance
        FROM user_risk_limits
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        this.userLimits.set(row.user_id, {
          maxPositionSize: row.max_position_size,
          maxDailyLoss: row.max_daily_loss,
          maxDrawdown: row.max_drawdown,
          maxTradesPerDay: row.max_trades_per_day,
          maxExposure: row.max_exposure,
          riskTolerance: row.risk_tolerance
        });
      }
      
      logger.info(`Loaded risk limits for ${result.rows.length} users`);
    } catch (error) {
      logger.error('Failed to load user limits:', error);
    }
  }

  async validateTrade(trade) {
    try {
      const { symbol, action, quantity, price, userId, strategyId, isBacktest = false, isPaperTrading = false } = trade;
      
      // Skip risk checks for backtests
      if (isBacktest) {
        return { approved: true, reason: 'Backtest mode' };
      }
      
      // Get user limits
      const userLimits = this.userLimits.get(userId) || this.getDefaultLimits();
      
      // Check position size limits
      const positionSizeCheck = await this.checkPositionSize(symbol, quantity, price, userId, userLimits);
      if (!positionSizeCheck.approved) {
        return positionSizeCheck;
      }
      
      // Check daily loss limits
      const dailyLossCheck = await this.checkDailyLoss(userId, userLimits);
      if (!dailyLossCheck.approved) {
        return dailyLossCheck;
      }
      
      // Check drawdown limits
      const drawdownCheck = await this.checkDrawdown(userId, userLimits);
      if (!drawdownCheck.approved) {
        return drawdownCheck;
      }
      
      // Check trade frequency limits
      const frequencyCheck = await this.checkTradeFrequency(userId, userLimits);
      if (!frequencyCheck.approved) {
        return frequencyCheck;
      }
      
      // Check exposure limits
      const exposureCheck = await this.checkExposure(symbol, quantity, price, userId, userLimits);
      if (!exposureCheck.approved) {
        return exposureCheck;
      }
      
      // Check risk rules
      const rulesCheck = await this.checkRiskRules(trade);
      if (!rulesCheck.approved) {
        return rulesCheck;
      }
      
      // All checks passed
      return { approved: true, reason: 'All risk checks passed' };
      
    } catch (error) {
      logger.error('Error validating trade:', error);
      return { approved: false, reason: 'Risk validation error' };
    }
  }

  async checkPositionSize(symbol, quantity, price, userId, userLimits) {
    try {
      const tradeValue = quantity * price;
      const maxPositionSize = userLimits.maxPositionSize || 100000; // $100k default
      
      if (tradeValue > maxPositionSize) {
        return {
          approved: false,
          reason: `Position size ${tradeValue} exceeds maximum allowed ${maxPositionSize}`
        };
      }
      
      // Check current position size
      const currentPosition = await this.getCurrentPosition(symbol, userId);
      const newPositionValue = currentPosition + tradeValue;
      
      if (newPositionValue > maxPositionSize) {
        return {
          approved: false,
          reason: `New position size ${newPositionValue} would exceed maximum allowed ${maxPositionSize}`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking position size:', error);
      return { approved: false, reason: 'Position size check error' };
    }
  }

  async checkDailyLoss(userId, userLimits) {
    try {
      const maxDailyLoss = userLimits.maxDailyLoss || 10000; // $10k default
      const dailyLoss = await this.getDailyLoss(userId);
      
      if (dailyLoss >= maxDailyLoss) {
        return {
          approved: false,
          reason: `Daily loss ${dailyLoss} exceeds maximum allowed ${maxDailyLoss}`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking daily loss:', error);
      return { approved: false, reason: 'Daily loss check error' };
    }
  }

  async checkDrawdown(userId, userLimits) {
    try {
      const maxDrawdown = userLimits.maxDrawdown || 0.20; // 20% default
      const currentDrawdown = await this.getCurrentDrawdown(userId);
      
      if (currentDrawdown >= maxDrawdown) {
        return {
          approved: false,
          reason: `Current drawdown ${(currentDrawdown * 100).toFixed(2)}% exceeds maximum allowed ${(maxDrawdown * 100).toFixed(2)}%`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking drawdown:', error);
      return { approved: false, reason: 'Drawdown check error' };
    }
  }

  async checkTradeFrequency(userId, userLimits) {
    try {
      const maxTradesPerDay = userLimits.maxTradesPerDay || 100; // 100 trades per day default
      const todayTrades = await this.getTodayTradeCount(userId);
      
      if (todayTrades >= maxTradesPerDay) {
        return {
          approved: false,
          reason: `Daily trade count ${todayTrades} exceeds maximum allowed ${maxTradesPerDay}`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking trade frequency:', error);
      return { approved: false, reason: 'Trade frequency check error' };
    }
  }

  async checkExposure(symbol, quantity, price, userId, userLimits) {
    try {
      const maxExposure = userLimits.maxExposure || 500000; // $500k default
      const currentExposure = await this.getCurrentExposure(userId);
      const tradeValue = quantity * price;
      const newExposure = currentExposure + tradeValue;
      
      if (newExposure > maxExposure) {
        return {
          approved: false,
          reason: `New exposure ${newExposure} would exceed maximum allowed ${maxExposure}`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking exposure:', error);
      return { approved: false, reason: 'Exposure check error' };
    }
  }

  async checkRiskRules(trade) {
    try {
      for (const [ruleId, rule] of this.riskRules) {
        if (!rule.isActive) continue;
        
        const ruleResult = await this.evaluateRule(rule, trade);
        if (!ruleResult.approved) {
          return ruleResult;
        }
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error checking risk rules:', error);
      return { approved: false, reason: 'Risk rules check error' };
    }
  }

  async evaluateRule(rule, trade) {
    try {
      const { type, conditions } = rule;
      
      switch (type) {
        case 'position_size':
          return this.evaluatePositionSizeRule(conditions, trade);
        case 'concentration':
          return this.evaluateConcentrationRule(conditions, trade);
        case 'volatility':
          return this.evaluateVolatilityRule(conditions, trade);
        case 'correlation':
          return this.evaluateCorrelationRule(conditions, trade);
        default:
          return { approved: true };
      }
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}:`, error);
      return { approved: false, reason: `Rule evaluation error: ${rule.name}` };
    }
  }

  async evaluatePositionSizeRule(conditions, trade) {
    try {
      const { maxSize, maxPercentOfPortfolio } = conditions;
      const tradeValue = trade.quantity * trade.price;
      
      if (maxSize && tradeValue > maxSize) {
        return {
          approved: false,
          reason: `Position size ${tradeValue} exceeds rule limit ${maxSize}`
        };
      }
      
      if (maxPercentOfPortfolio) {
        const portfolioValue = await this.getPortfolioValue(trade.userId);
        const percentOfPortfolio = (tradeValue / portfolioValue) * 100;
        
        if (percentOfPortfolio > maxPercentOfPortfolio) {
          return {
            approved: false,
            reason: `Position size ${percentOfPortfolio.toFixed(2)}% exceeds rule limit ${maxPercentOfPortfolio}%`
          };
        }
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error evaluating position size rule:', error);
      return { approved: false, reason: 'Position size rule evaluation error' };
    }
  }

  async evaluateConcentrationRule(conditions, trade) {
    try {
      const { maxConcentration, sector } = conditions;
      const currentConcentration = await this.getSectorConcentration(trade.userId, sector);
      
      if (currentConcentration >= maxConcentration) {
        return {
          approved: false,
          reason: `Sector concentration ${(currentConcentration * 100).toFixed(2)}% exceeds rule limit ${(maxConcentration * 100).toFixed(2)}%`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error evaluating concentration rule:', error);
      return { approved: false, reason: 'Concentration rule evaluation error' };
    }
  }

  async evaluateVolatilityRule(conditions, trade) {
    try {
      const { maxVolatility } = conditions;
      const symbolVolatility = await this.getSymbolVolatility(trade.symbol);
      
      if (symbolVolatility > maxVolatility) {
        return {
          approved: false,
          reason: `Symbol volatility ${(symbolVolatility * 100).toFixed(2)}% exceeds rule limit ${(maxVolatility * 100).toFixed(2)}%`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error evaluating volatility rule:', error);
      return { approved: false, reason: 'Volatility rule evaluation error' };
    }
  }

  async evaluateCorrelationRule(conditions, trade) {
    try {
      const { maxCorrelation, symbols } = conditions;
      const currentCorrelation = await this.getPortfolioCorrelation(trade.userId, symbols);
      
      if (currentCorrelation > maxCorrelation) {
        return {
          approved: false,
          reason: `Portfolio correlation ${(currentCorrelation * 100).toFixed(2)}% exceeds rule limit ${(maxCorrelation * 100).toFixed(2)}%`
        };
      }
      
      return { approved: true };
    } catch (error) {
      logger.error('Error evaluating correlation rule:', error);
      return { approved: false, reason: 'Correlation rule evaluation error' };
    }
  }

  // Helper methods for getting current state
  async getCurrentPosition(symbol, userId) {
    try {
      const key = `position:${userId}:${symbol}`;
      const position = await this.redis.get(key);
      return position ? parseFloat(position) : 0;
    } catch (error) {
      logger.error(`Error getting current position for ${symbol}:`, error);
      return 0;
    }
  }

  async getDailyLoss(userId) {
    try {
      const key = `daily_loss:${userId}:${new Date().toISOString().split('T')[0]}`;
      const loss = await this.redis.get(key);
      return loss ? parseFloat(loss) : 0;
    } catch (error) {
      logger.error(`Error getting daily loss for ${userId}:`, error);
      return 0;
    }
  }

  async getCurrentDrawdown(userId) {
    try {
      const key = `drawdown:${userId}`;
      const drawdown = await this.redis.get(key);
      return drawdown ? parseFloat(drawdown) : 0;
    } catch (error) {
      logger.error(`Error getting current drawdown for ${userId}:`, error);
      return 0;
    }
  }

  async getTodayTradeCount(userId) {
    try {
      const key = `trade_count:${userId}:${new Date().toISOString().split('T')[0]}`;
      const count = await this.redis.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      logger.error(`Error getting today trade count for ${userId}:`, error);
      return 0;
    }
  }

  async getCurrentExposure(userId) {
    try {
      const key = `exposure:${userId}`;
      const exposure = await this.redis.get(key);
      return exposure ? parseFloat(exposure) : 0;
    } catch (error) {
      logger.error(`Error getting current exposure for ${userId}:`, error);
      return 0;
    }
  }

  async getPortfolioValue(userId) {
    try {
      const key = `portfolio_value:${userId}`;
      const value = await this.redis.get(key);
      return value ? parseFloat(value) : 100000; // Default $100k
    } catch (error) {
      logger.error(`Error getting portfolio value for ${userId}:`, error);
      return 100000;
    }
  }

  async getSectorConcentration(userId, sector) {
    try {
      const key = `sector_concentration:${userId}:${sector}`;
      const concentration = await this.redis.get(key);
      return concentration ? parseFloat(concentration) : 0;
    } catch (error) {
      logger.error(`Error getting sector concentration for ${userId}:`, error);
      return 0;
    }
  }

  async getSymbolVolatility(symbol) {
    try {
      const key = `volatility:${symbol}`;
      const volatility = await this.redis.get(key);
      return volatility ? parseFloat(volatility) : 0.02; // Default 2%
    } catch (error) {
      logger.error(`Error getting volatility for ${symbol}:`, error);
      return 0.02;
    }
  }

  async getPortfolioCorrelation(userId, symbols) {
    try {
      // Simplified correlation calculation
      return 0.5; // Default 50% correlation
    } catch (error) {
      logger.error(`Error getting portfolio correlation for ${userId}:`, error);
      return 0.5;
    }
  }

  getDefaultLimits() {
    return {
      maxPositionSize: 100000,
      maxDailyLoss: 10000,
      maxDrawdown: 0.20,
      maxTradesPerDay: 100,
      maxExposure: 500000,
      riskTolerance: 'moderate'
    };
  }

  async updateUserLimits(userId, limits) {
    try {
      this.userLimits.set(userId, limits);
      
      // Update database
      const query = `
        INSERT INTO user_risk_limits (user_id, max_position_size, max_daily_loss, max_drawdown, 
                                     max_trades_per_day, max_exposure, risk_tolerance, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          max_position_size = $2,
          max_daily_loss = $3,
          max_drawdown = $4,
          max_trades_per_day = $5,
          max_exposure = $6,
          risk_tolerance = $7,
          updated_at = $8
      `;
      
      await this.db.query(query, [
        userId,
        limits.maxPositionSize,
        limits.maxDailyLoss,
        limits.maxDrawdown,
        limits.maxTradesPerDay,
        limits.maxExposure,
        limits.riskTolerance,
        new Date()
      ]);
      
      logger.info(`Updated risk limits for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating user limits for ${userId}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('Risk Manager closed successfully');
    } catch (error) {
      logger.error('Error closing Risk Manager:', error);
    }
  }
}

module.exports = RiskManager;

