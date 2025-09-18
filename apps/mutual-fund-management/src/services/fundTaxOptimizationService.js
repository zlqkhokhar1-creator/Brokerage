const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundTaxOptimizationService extends EventEmitter {
  constructor() {
    super();
    this.taxRules = new Map();
    this.taxRates = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load tax rules and rates
      await this.loadTaxRules();
      await this.loadTaxRates();
      
      this._initialized = true;
      logger.info('FundTaxOptimizationService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundTaxOptimizationService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundTaxOptimizationService closed');
    } catch (error) {
      logger.error('Error closing FundTaxOptimizationService:', error);
    }
  }

  async loadTaxRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM tax_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const rule of result.rows) {
        this.taxRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${result.rows.length} tax rules`);
    } catch (error) {
      logger.error('Error loading tax rules:', error);
      throw error;
    }
  }

  async loadTaxRates() {
    try {
      const result = await pool.query(`
        SELECT * FROM tax_rates
        WHERE is_active = true
        ORDER BY effective_date DESC
      `);

      for (const rate of result.rows) {
        this.taxRates.set(rate.tax_type, rate);
      }

      logger.info(`Loaded ${result.rows.length} tax rates`);
    } catch (error) {
      logger.error('Error loading tax rates:', error);
      throw error;
    }
  }

  async calculateTaxLiability(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end_date = new Date(),
        include_unrealized = false
      } = options;

      // Get user's fund holdings
      const holdings = await this.getUserFundHoldings(userId);
      
      // Get user's trading history
      const trades = await this.getUserTrades(userId, start_date, end_date);

      // Calculate realized gains/losses
      const realizedGains = await this.calculateRealizedGains(trades);

      // Calculate unrealized gains/losses
      const unrealizedGains = include_unrealized ? 
        await this.calculateUnrealizedGains(holdings) : 
        { short_term: 0, long_term: 0 };

      // Calculate tax liability
      const taxLiability = await this.calculateTaxLiabilityFromGains(realizedGains, unrealizedGains);

      // Store tax calculation
      await this.storeTaxCalculation(userId, {
        realized_gains: realizedGains,
        unrealized_gains: unrealizedGains,
        tax_liability: taxLiability,
        calculation_date: new Date(),
        start_date,
        end_date
      });

      return {
        user_id: userId,
        period: { start_date, end_date },
        realized_gains: realizedGains,
        unrealized_gains: unrealizedGains,
        tax_liability: taxLiability,
        calculated_at: new Date()
      };
    } catch (error) {
      logger.error('Error calculating tax liability:', error);
      throw error;
    }
  }

  async calculateRealizedGains(trades) {
    try {
      const gains = {
        short_term: 0,
        long_term: 0,
        total: 0,
        trades: []
      };

      // Group trades by fund
      const fundTrades = this.groupTradesByFund(trades);

      for (const [fundId, fundTradeList] of fundTrades) {
        const fundGains = await this.calculateFundRealizedGains(fundId, fundTradeList);
        
        gains.short_term += fundGains.short_term;
        gains.long_term += fundGains.long_term;
        gains.total += fundGains.total;
        gains.trades.push(...fundGains.trades);
      }

      return gains;
    } catch (error) {
      logger.error('Error calculating realized gains:', error);
      return { short_term: 0, long_term: 0, total: 0, trades: [] };
    }
  }

  async calculateFundRealizedGains(fundId, trades) {
    try {
      const gains = {
        short_term: 0,
        long_term: 0,
        total: 0,
        trades: []
      };

      // Sort trades by date
      const sortedTrades = trades.sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));

      // Track shares and cost basis
      let sharesOwned = 0;
      let totalCostBasis = 0;
      const buyTrades = [];

      for (const trade of sortedTrades) {
        if (trade.trade_type === 'BUY') {
          sharesOwned += trade.shares;
          totalCostBasis += trade.total_amount;
          buyTrades.push({
            shares: trade.shares,
            cost_basis: trade.total_amount,
            date: trade.trade_date
          });
        } else if (trade.trade_type === 'SELL') {
          if (sharesOwned >= trade.shares) {
            // Calculate gain/loss using FIFO
            const sellGains = this.calculateSellGains(buyTrades, trade);
            
            gains.short_term += sellGains.short_term;
            gains.long_term += sellGains.long_term;
            gains.total += sellGains.total;
            gains.trades.push(sellGains);

            // Update remaining shares and cost basis
            sharesOwned -= trade.shares;
            totalCostBasis -= sellGains.cost_basis_used;
          }
        }
      }

      return gains;
    } catch (error) {
      logger.error(`Error calculating realized gains for fund ${fundId}:`, error);
      return { short_term: 0, long_term: 0, total: 0, trades: [] };
    }
  }

  calculateSellGains(buyTrades, sellTrade) {
    try {
      const gains = {
        short_term: 0,
        long_term: 0,
        total: 0,
        cost_basis_used: 0,
        proceeds: sellTrade.total_amount,
        shares_sold: sellTrade.shares
      };

      let sharesRemaining = sellTrade.shares;
      const sellDate = new Date(sellTrade.trade_date);

      for (const buyTrade of buyTrades) {
        if (sharesRemaining <= 0) break;

        const sharesToUse = Math.min(sharesRemaining, buyTrade.shares);
        const costBasisPerShare = buyTrade.cost_basis / buyTrade.shares;
        const proceedsPerShare = sellTrade.total_amount / sellTrade.shares;

        const gain = (proceedsPerShare - costBasisPerShare) * sharesToUse;
        const costBasisUsed = costBasisPerShare * sharesToUse;

        // Determine if short-term or long-term
        const buyDate = new Date(buyTrade.date);
        const holdingPeriod = (sellDate - buyDate) / (1000 * 60 * 60 * 24 * 365); // years

        if (holdingPeriod < 1) {
          gains.short_term += gain;
        } else {
          gains.long_term += gain;
        }

        gains.cost_basis_used += costBasisUsed;
        sharesRemaining -= sharesToUse;
        buyTrade.shares -= sharesToUse;
      }

      gains.total = gains.short_term + gains.long_term;

      return gains;
    } catch (error) {
      logger.error('Error calculating sell gains:', error);
      return { short_term: 0, long_term: 0, total: 0, cost_basis_used: 0, proceeds: 0, shares_sold: 0 };
    }
  }

  async calculateUnrealizedGains(holdings) {
    try {
      const gains = {
        short_term: 0,
        long_term: 0,
        total: 0,
        holdings: []
      };

      for (const holding of holdings) {
        const currentValue = holding.current_value || 0;
        const costBasis = holding.total_cost_basis || 0;
        const unrealizedGain = currentValue - costBasis;

        // Determine if short-term or long-term based on average holding period
        const holdingPeriod = this.calculateHoldingPeriod(holding);
        
        if (holdingPeriod < 1) {
          gains.short_term += unrealizedGain;
        } else {
          gains.long_term += unrealizedGain;
        }

        gains.holdings.push({
          fund_id: holding.fund_id,
          symbol: holding.symbol,
          shares: holding.shares_owned,
          cost_basis: costBasis,
          current_value: currentValue,
          unrealized_gain: unrealizedGain,
          holding_period: holdingPeriod
        });
      }

      gains.total = gains.short_term + gains.long_term;

      return gains;
    } catch (error) {
      logger.error('Error calculating unrealized gains:', error);
      return { short_term: 0, long_term: 0, total: 0, holdings: [] };
    }
  }

  calculateHoldingPeriod(holding) {
    try {
      // This is a simplified calculation
      // In practice, you'd need to track the actual purchase dates
      const currentDate = new Date();
      const purchaseDate = new Date(holding.created_at);
      const holdingPeriod = (currentDate - purchaseDate) / (1000 * 60 * 60 * 24 * 365); // years
      
      return holdingPeriod;
    } catch (error) {
      logger.error('Error calculating holding period:', error);
      return 0;
    }
  }

  async calculateTaxLiabilityFromGains(realizedGains, unrealizedGains) {
    try {
      const liability = {
        short_term_tax: 0,
        long_term_tax: 0,
        total_tax: 0,
        effective_rate: 0
      };

      // Get current tax rates
      const shortTermRate = this.getTaxRate('short_term_capital_gains');
      const longTermRate = this.getTaxRate('long_term_capital_gains');

      // Calculate taxes on realized gains
      liability.short_term_tax = realizedGains.short_term * shortTermRate;
      liability.long_term_tax = realizedGains.long_term * longTermRate;

      // Calculate total tax
      liability.total_tax = liability.short_term_tax + liability.long_term_tax;

      // Calculate effective rate
      const totalGains = realizedGains.total + unrealizedGains.total;
      liability.effective_rate = totalGains > 0 ? liability.total_tax / totalGains : 0;

      return liability;
    } catch (error) {
      logger.error('Error calculating tax liability:', error);
      return { short_term_tax: 0, long_term_tax: 0, total_tax: 0, effective_rate: 0 };
    }
  }

  getTaxRate(taxType) {
    try {
      const rate = this.taxRates.get(taxType);
      return rate ? rate.rate : 0;
    } catch (error) {
      logger.error(`Error getting tax rate for ${taxType}:`, error);
      return 0;
    }
  }

  async optimizeTaxHarvesting(userId, options = {}) {
    try {
      const {
        max_loss = 3000, // Maximum loss to harvest
        min_gain = 1000, // Minimum gain to offset
        target_date = new Date()
      } = options;

      // Get user's holdings
      const holdings = await this.getUserFundHoldings(userId);
      
      // Find tax loss harvesting opportunities
      const lossOpportunities = await this.findLossHarvestingOpportunities(holdings, max_loss);
      
      // Find tax gain harvesting opportunities
      const gainOpportunities = await this.findGainHarvestingOpportunities(holdings, min_gain);
      
      // Generate optimization recommendations
      const recommendations = await this.generateTaxOptimizationRecommendations(
        lossOpportunities,
        gainOpportunities,
        target_date
      );

      return {
        user_id: userId,
        target_date,
        loss_opportunities: lossOpportunities,
        gain_opportunities: gainOpportunities,
        recommendations: recommendations,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error optimizing tax harvesting:', error);
      throw error;
    }
  }

  async findLossHarvestingOpportunities(holdings, maxLoss) {
    try {
      const opportunities = [];

      for (const holding of holdings) {
        const currentValue = holding.current_value || 0;
        const costBasis = holding.total_cost_basis || 0;
        const unrealizedLoss = costBasis - currentValue;

        if (unrealizedLoss > 0 && unrealizedLoss <= maxLoss) {
          opportunities.push({
            fund_id: holding.fund_id,
            symbol: holding.symbol,
            shares: holding.shares_owned,
            cost_basis: costBasis,
            current_value: currentValue,
            unrealized_loss: unrealizedLoss,
            potential_tax_savings: unrealizedLoss * this.getTaxRate('short_term_capital_gains'),
            recommendation: 'Consider selling to harvest tax loss'
          });
        }
      }

      // Sort by potential tax savings
      opportunities.sort((a, b) => b.potential_tax_savings - a.potential_tax_savings);

      return opportunities;
    } catch (error) {
      logger.error('Error finding loss harvesting opportunities:', error);
      return [];
    }
  }

  async findGainHarvestingOpportunities(holdings, minGain) {
    try {
      const opportunities = [];

      for (const holding of holdings) {
        const currentValue = holding.current_value || 0;
        const costBasis = holding.total_cost_basis || 0;
        const unrealizedGain = currentValue - costBasis;

        if (unrealizedGain >= minGain) {
          const holdingPeriod = this.calculateHoldingPeriod(holding);
          const isLongTerm = holdingPeriod >= 1;
          const taxRate = isLongTerm ? 
            this.getTaxRate('long_term_capital_gains') : 
            this.getTaxRate('short_term_capital_gains');

          opportunities.push({
            fund_id: holding.fund_id,
            symbol: holding.symbol,
            shares: holding.shares_owned,
            cost_basis: costBasis,
            current_value: currentValue,
            unrealized_gain: unrealizedGain,
            holding_period: holdingPeriod,
            is_long_term: isLongTerm,
            potential_tax: unrealizedGain * taxRate,
            recommendation: isLongTerm ? 
              'Consider selling to realize long-term gains at lower rate' :
              'Consider holding for long-term treatment'
          });
        }
      }

      // Sort by potential tax savings
      opportunities.sort((a, b) => b.potential_tax_savings - a.potential_tax_savings);

      return opportunities;
    } catch (error) {
      logger.error('Error finding gain harvesting opportunities:', error);
      return [];
    }
  }

  async generateTaxOptimizationRecommendations(lossOpportunities, gainOpportunities, targetDate) {
    try {
      const recommendations = [];

      // Loss harvesting recommendations
      if (lossOpportunities.length > 0) {
        recommendations.push({
          type: 'loss_harvesting',
          priority: 'high',
          title: 'Tax Loss Harvesting Opportunities',
          description: `Found ${lossOpportunities.length} opportunities to harvest tax losses`,
          actions: lossOpportunities.slice(0, 5).map(opp => ({
            action: 'sell',
            fund_id: opp.fund_id,
            symbol: opp.symbol,
            shares: opp.shares,
            expected_tax_savings: opp.potential_tax_savings
          })),
          expected_benefit: lossOpportunities.reduce((sum, opp) => sum + opp.potential_tax_savings, 0)
        });
      }

      // Gain harvesting recommendations
      if (gainOpportunities.length > 0) {
        const longTermOpportunities = gainOpportunities.filter(opp => opp.is_long_term);
        
        if (longTermOpportunities.length > 0) {
          recommendations.push({
            type: 'gain_harvesting',
            priority: 'medium',
            title: 'Long-Term Gain Harvesting',
            description: `Found ${longTermOpportunities.length} long-term gain opportunities`,
            actions: longTermOpportunities.slice(0, 3).map(opp => ({
              action: 'sell',
              fund_id: opp.fund_id,
              symbol: opp.symbol,
              shares: opp.shares,
              expected_tax: opp.potential_tax
            })),
            expected_benefit: longTermOpportunities.reduce((sum, opp) => sum + opp.potential_tax, 0)
          });
        }
      }

      // Rebalancing recommendations
      recommendations.push({
        type: 'rebalancing',
        priority: 'low',
        title: 'Portfolio Rebalancing',
        description: 'Consider rebalancing to maintain target allocation',
        actions: [],
        expected_benefit: 0
      });

      return recommendations;
    } catch (error) {
      logger.error('Error generating tax optimization recommendations:', error);
      return [];
    }
  }

  async generateTaxReport(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end_date = new Date(),
        include_recommendations = true
      } = options;

      // Calculate tax liability
      const taxLiability = await this.calculateTaxLiability(userId, {
        start_date,
        end_date,
        include_unrealized: true
      });

      // Get tax optimization recommendations
      const recommendations = include_recommendations ? 
        await this.optimizeTaxHarvesting(userId, { target_date: end_date }) :
        null;

      // Get tax history
      const taxHistory = await this.getTaxHistory(userId, start_date, end_date);

      return {
        user_id: userId,
        period: { start_date, end_date },
        tax_liability: taxLiability,
        recommendations: recommendations,
        tax_history: taxHistory,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error generating tax report:', error);
      throw error;
    }
  }

  async getTaxHistory(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM tax_calculations
        WHERE user_id = $1
          AND calculation_date >= $2
          AND calculation_date <= $3
        ORDER BY calculation_date DESC
      `, [userId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting tax history:', error);
      return [];
    }
  }

  async storeTaxCalculation(userId, calculationData) {
    try {
      await pool.query(`
        INSERT INTO tax_calculations (
          user_id, realized_gains, unrealized_gains, tax_liability,
          calculation_date, start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        JSON.stringify(calculationData.realized_gains),
        JSON.stringify(calculationData.unrealized_gains),
        JSON.stringify(calculationData.tax_liability),
        calculationData.calculation_date,
        calculationData.start_date,
        calculationData.end_date
      ]);

      logger.info(`Stored tax calculation for user ${userId}`);
    } catch (error) {
      logger.error('Error storing tax calculation:', error);
      throw error;
    }
  }

  async getUserFundHoldings(userId) {
    try {
      const result = await pool.query(`
        SELECT ufh.*, mf.symbol, mf.name
        FROM user_fund_holdings ufh
        JOIN mutual_funds mf ON ufh.fund_id = mf.id
        WHERE ufh.user_id = $1
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user fund holdings:', error);
      return [];
    }
  }

  async getUserTrades(userId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_trades
        WHERE user_id = $1
          AND trade_date >= $2
          AND trade_date <= $3
        ORDER BY trade_date ASC
      `, [userId, startDate, endDate]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user trades:', error);
      return [];
    }
  }

  groupTradesByFund(trades) {
    try {
      const grouped = new Map();
      
      for (const trade of trades) {
        if (!grouped.has(trade.fund_id)) {
          grouped.set(trade.fund_id, []);
        }
        grouped.get(trade.fund_id).push(trade);
      }
      
      return grouped;
    } catch (error) {
      logger.error('Error grouping trades by fund:', error);
      return new Map();
    }
  }

  async getTaxStats() {
    try {
      const stats = {
        total_calculations: 0,
        total_tax_liability: 0,
        average_tax_rate: 0,
        total_recommendations: 0
      };

      // Get calculation counts
      const calcResult = await pool.query(`
        SELECT 
          COUNT(*) as total_calculations,
          AVG((tax_liability->>'total_tax')::numeric) as average_tax_liability
        FROM tax_calculations
        WHERE calculation_date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (calcResult.rows.length > 0) {
        stats.total_calculations = parseInt(calcResult.rows[0].total_calculations);
        stats.total_tax_liability = parseFloat(calcResult.rows[0].average_tax_liability) || 0;
      }

      // Get average tax rate
      const rateResult = await pool.query(`
        SELECT AVG((tax_liability->>'effective_rate')::numeric) as average_tax_rate
        FROM tax_calculations
        WHERE calculation_date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (rateResult.rows.length > 0) {
        stats.average_tax_rate = parseFloat(rateResult.rows[0].average_tax_rate) || 0;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting tax stats:', error);
      return {
        total_calculations: 0,
        total_tax_liability: 0,
        average_tax_rate: 0,
        total_recommendations: 0
      };
    }
  }
}

module.exports = FundTaxOptimizationService;
