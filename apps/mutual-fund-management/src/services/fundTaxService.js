const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundTaxService extends EventEmitter {
  constructor() {
    super();
    this.taxLots = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundTaxService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundTaxService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundTaxService closed');
    } catch (error) {
      logger.error('Error closing FundTaxService:', error);
    }
  }

  async getTaxLots(userId, options = {}) {
    try {
      const {
        fund_id = null,
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `tax_lots:${userId}:${fund_id || 'all'}`;
      const cachedLots = await redisService.get(cacheKey);
      if (cachedLots) {
        return cachedLots;
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = ['ftl.user_id = $1'];
      let queryParams = [userId];
      let paramCount = 1;

      if (fund_id) {
        paramCount++;
        whereConditions.push(`ftl.fund_id = $${paramCount}`);
        queryParams.push(fund_id);
      }

      const query = `
        SELECT 
          ftl.*,
          mf.symbol,
          mf.name as fund_name,
          ft.trade_type,
          ft.trade_date,
          ft.price_per_share as trade_price
        FROM fund_tax_lots ftl
        JOIN mutual_funds mf ON ftl.fund_id = mf.id
        LEFT JOIN fund_trades ft ON ftl.trade_id = ft.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ftl.acquisition_date DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_tax_lots ftl
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      const taxLots = {
        lots: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisService.set(cacheKey, taxLots, 1800); // Cache for 30 minutes

      return taxLots;
    } catch (error) {
      logger.error('Error getting tax lots:', error);
      throw error;
    }
  }

  async calculateTaxHarvesting(userId, options = {}) {
    try {
      const {
        fund_id = null,
        target_loss = 1000,
        replacement_fund_id = null
      } = options;

      // Get all tax lots for the user
      const taxLots = await this.getTaxLots(userId, { fund_id, limit: 1000 });
      
      // Filter for lots with unrealized losses
      const lossLots = taxLots.lots.filter(lot => {
        // Calculate current value and unrealized gain/loss
        const currentValue = lot.shares * (lot.cost_basis || 0); // This should be current NAV
        const costBasis = lot.shares * lot.cost_basis;
        return currentValue < costBasis;
      });

      // Sort by loss amount (highest loss first)
      lossLots.sort((a, b) => {
        const lossA = (a.shares * a.cost_basis) - (a.shares * (a.cost_basis || 0));
        const lossB = (b.shares * b.cost_basis) - (b.shares * (b.cost_basis || 0));
        return lossB - lossA;
      });

      // Select lots to sell to achieve target loss
      const selectedLots = [];
      let totalLoss = 0;

      for (const lot of lossLots) {
        if (totalLoss >= target_loss) {
          break;
        }

        const lotLoss = (lot.shares * lot.cost_basis) - (lot.shares * (lot.cost_basis || 0));
        if (totalLoss + lotLoss <= target_loss * 1.1) { // Allow 10% over target
          selectedLots.push(lot);
          totalLoss += lotLoss;
        }
      }

      // Calculate tax savings
      const taxSavings = this.calculateTaxSavings(totalLoss);

      // Find replacement fund if not specified
      let replacementFund = null;
      if (replacement_fund_id) {
        replacementFund = await this.getFundById(replacement_fund_id);
      } else if (fund_id) {
        // Find a similar fund in the same category
        replacementFund = await this.findReplacementFund(fund_id);
      }

      const harvesting = {
        user_id: userId,
        target_loss,
        selected_lots: selectedLots,
        total_loss: totalLoss,
        tax_savings: taxSavings,
        replacement_fund: replacementFund,
        generated_at: new Date()
      };

      return harvesting;
    } catch (error) {
      logger.error('Error calculating tax harvesting:', error);
      throw error;
    }
  }

  async executeTaxHarvesting(userId, harvestingData) {
    try {
      const {
        selected_lots,
        replacement_fund_id
      } = harvestingData;

      // Start transaction
      await pool.query('BEGIN');

      try {
        const executedTrades = [];

        // Execute sell trades for selected lots
        for (const lot of selected_lots) {
          const sellTrade = await this.executeSellTrade(userId, lot);
          executedTrades.push(sellTrade);
        }

        // Execute buy trade for replacement fund if specified
        if (replacement_fund_id) {
          const totalProceeds = executedTrades.reduce((sum, trade) => sum + trade.total_amount, 0);
          const buyTrade = await this.executeBuyTrade(userId, replacement_fund_id, totalProceeds);
          executedTrades.push(buyTrade);
        }

        // Commit transaction
        await pool.query('COMMIT');

        // Clear cache
        await this.clearTaxCache(userId);

        // Emit event
        this.emit('taxHarvestingExecuted', { userId, executedTrades });

        logger.info(`Tax harvesting executed for user ${userId}`);

        return executedTrades;
      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error executing tax harvesting:', error);
      throw error;
    }
  }

  async getTaxReport(userId, year) {
    try {
      // Check cache first
      const cacheKey = `tax_report:${userId}:${year}`;
      const cachedReport = await redisService.get(cacheKey);
      if (cachedReport) {
        return cachedReport;
      }

      // Get all trades for the year
      const trades = await this.getTradesForYear(userId, year);

      // Calculate realized gains/losses
      const realizedGains = this.calculateRealizedGains(trades);

      // Calculate dividend income
      const dividendIncome = await this.calculateDividendIncome(userId, year);

      // Calculate capital gains distributions
      const capitalGainsDistributions = await this.calculateCapitalGainsDistributions(userId, year);

      // Generate tax forms data
      const taxForms = this.generateTaxForms(realizedGains, dividendIncome, capitalGainsDistributions);

      const report = {
        user_id: userId,
        year,
        realized_gains: realizedGains,
        dividend_income: dividendIncome,
        capital_gains_distributions: capitalGainsDistributions,
        tax_forms: taxForms,
        generated_at: new Date()
      };

      // Cache the result
      await redisService.set(cacheKey, report, 3600); // Cache for 1 hour

      return report;
    } catch (error) {
      logger.error('Error generating tax report:', error);
      throw error;
    }
  }

  async getTaxOptimizationSuggestions(userId) {
    try {
      const suggestions = [];

      // Check for tax loss harvesting opportunities
      const harvesting = await this.calculateTaxHarvesting(userId);
      if (harvesting.selected_lots.length > 0) {
        suggestions.push({
          type: 'tax_loss_harvesting',
          priority: 'high',
          title: 'Tax Loss Harvesting Opportunity',
          description: `You can realize $${harvesting.total_loss.toFixed(2)} in losses and save $${harvesting.tax_savings.toFixed(2)} in taxes`,
          action: 'harvest_losses',
          data: harvesting
        });
      }

      // Check for wash sale violations
      const washSales = await this.checkWashSales(userId);
      if (washSales.length > 0) {
        suggestions.push({
          type: 'wash_sale_violation',
          priority: 'medium',
          title: 'Wash Sale Violations Detected',
          description: `${washSales.length} potential wash sale violations found`,
          action: 'review_wash_sales',
          data: washSales
        });
      }

      // Check for concentrated positions
      const concentratedPositions = await this.checkConcentratedPositions(userId);
      if (concentratedPositions.length > 0) {
        suggestions.push({
          type: 'concentrated_position',
          priority: 'low',
          title: 'Concentrated Positions',
          description: `${concentratedPositions.length} positions represent more than 10% of your portfolio`,
          action: 'diversify_positions',
          data: concentratedPositions
        });
      }

      // Check for tax-efficient rebalancing
      const rebalancing = await this.checkTaxEfficientRebalancing(userId);
      if (rebalancing.opportunities.length > 0) {
        suggestions.push({
          type: 'tax_efficient_rebalancing',
          priority: 'medium',
          title: 'Tax-Efficient Rebalancing',
          description: 'Consider rebalancing to maintain target allocation while minimizing taxes',
          action: 'rebalance_portfolio',
          data: rebalancing
        });
      }

      return suggestions;
    } catch (error) {
      logger.error('Error getting tax optimization suggestions:', error);
      throw error;
    }
  }

  async checkWashSales(userId) {
    try {
      // Get recent trades and tax lots
      const recentTrades = await this.getRecentTrades(userId, 30); // Last 30 days
      const taxLots = await this.getTaxLots(userId, { limit: 1000 });

      const washSales = [];

      // Check for wash sales (buying same fund within 30 days of selling at a loss)
      for (const trade of recentTrades) {
        if (trade.trade_type === 'SELL') {
          const sellDate = new Date(trade.trade_date);
          const washSaleWindow = new Date(sellDate.getTime() + 30 * 24 * 60 * 60 * 1000);

          // Check for buys within wash sale window
          const washSaleBuys = recentTrades.filter(t => 
            t.trade_type === 'BUY' &&
            t.fund_id === trade.fund_id &&
            new Date(t.trade_date) >= sellDate &&
            new Date(t.trade_date) <= washSaleWindow
          );

          if (washSaleBuys.length > 0) {
            washSales.push({
              sell_trade: trade,
              buy_trades: washSaleBuys,
              violation_type: 'wash_sale'
            });
          }
        }
      }

      return washSales;
    } catch (error) {
      logger.error('Error checking wash sales:', error);
      return [];
    }
  }

  async checkConcentratedPositions(userId) {
    try {
      // Get user's current holdings
      const holdings = await this.getUserHoldings(userId);
      
      const concentratedPositions = [];
      const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);

      for (const holding of holdings) {
        const percentage = totalValue > 0 ? (holding.current_value / totalValue) * 100 : 0;
        if (percentage > 10) { // More than 10% of portfolio
          concentratedPositions.push({
            fund_id: holding.fund_id,
            symbol: holding.symbol,
            name: holding.name,
            current_value: holding.current_value,
            percentage: percentage,
            recommendation: 'Consider reducing position size'
          });
        }
      }

      return concentratedPositions;
    } catch (error) {
      logger.error('Error checking concentrated positions:', error);
      return [];
    }
  }

  async checkTaxEfficientRebalancing(userId) {
    try {
      // This would integrate with the rebalancing service
      // For now, return a placeholder
      return {
        opportunities: [],
        current_allocation: {},
        target_allocation: {},
        rebalancing_trades: []
      };
    } catch (error) {
      logger.error('Error checking tax efficient rebalancing:', error);
      return { opportunities: [], current_allocation: {}, target_allocation: {}, rebalancing_trades: [] };
    }
  }

  calculateTaxSavings(lossAmount) {
    try {
      // Assume 20% tax rate for long-term gains and 37% for short-term gains
      // This is a simplified calculation - in reality, you'd need to consider
      // the user's actual tax bracket and the type of gains being offset
      const longTermRate = 0.20;
      const shortTermRate = 0.37;
      
      // For simplicity, assume 50/50 split between long and short term
      const longTermSavings = (lossAmount * 0.5) * longTermRate;
      const shortTermSavings = (lossAmount * 0.5) * shortTermRate;
      
      return longTermSavings + shortTermSavings;
    } catch (error) {
      logger.error('Error calculating tax savings:', error);
      return 0;
    }
  }

  calculateRealizedGains(trades) {
    try {
      const realizedGains = {
        long_term: 0,
        short_term: 0,
        total: 0
      };

      for (const trade of trades) {
        if (trade.trade_type === 'SELL') {
          // Calculate realized gain/loss
          const costBasis = trade.shares * trade.price_per_share;
          const proceeds = trade.total_amount;
          const gainLoss = proceeds - costBasis;

          // Determine if long-term or short-term (simplified)
          const holdingPeriod = this.calculateHoldingPeriod(trade);
          if (holdingPeriod >= 365) {
            realizedGains.long_term += gainLoss;
          } else {
            realizedGains.short_term += gainLoss;
          }
        }
      }

      realizedGains.total = realizedGains.long_term + realizedGains.short_term;

      return realizedGains;
    } catch (error) {
      logger.error('Error calculating realized gains:', error);
      return { long_term: 0, short_term: 0, total: 0 };
    }
  }

  calculateHoldingPeriod(trade) {
    try {
      // This is a simplified calculation
      // In reality, you'd need to track the actual acquisition date
      const tradeDate = new Date(trade.trade_date);
      const currentDate = new Date();
      return Math.floor((currentDate - tradeDate) / (1000 * 60 * 60 * 24));
    } catch (error) {
      logger.error('Error calculating holding period:', error);
      return 0;
    }
  }

  async calculateDividendIncome(userId, year) {
    try {
      // This would typically come from fund performance data
      // For now, return a placeholder
      return {
        qualified_dividends: 0,
        non_qualified_dividends: 0,
        total_dividends: 0
      };
    } catch (error) {
      logger.error('Error calculating dividend income:', error);
      return { qualified_dividends: 0, non_qualified_dividends: 0, total_dividends: 0 };
    }
  }

  async calculateCapitalGainsDistributions(userId, year) {
    try {
      // This would typically come from fund performance data
      // For now, return a placeholder
      return {
        long_term_distributions: 0,
        short_term_distributions: 0,
        total_distributions: 0
      };
    } catch (error) {
      logger.error('Error calculating capital gains distributions:', error);
      return { long_term_distributions: 0, short_term_distributions: 0, total_distributions: 0 };
    }
  }

  generateTaxForms(realizedGains, dividendIncome, capitalGainsDistributions) {
    try {
      return {
        form_8949: {
          long_term_gains: realizedGains.long_term,
          short_term_gains: realizedGains.short_term
        },
        schedule_d: {
          total_gains: realizedGains.total
        },
        form_1099_div: {
          qualified_dividends: dividendIncome.qualified_dividends,
          non_qualified_dividends: dividendIncome.non_qualified_dividends
        },
        form_1099_int: {
          capital_gains_distributions: capitalGainsDistributions.total_distributions
        }
      };
    } catch (error) {
      logger.error('Error generating tax forms:', error);
      return {};
    }
  }

  async executeSellTrade(userId, lot) {
    try {
      // This would integrate with the trading service
      // For now, return a placeholder
      return {
        id: `sell-${Date.now()}`,
        user_id: userId,
        fund_id: lot.fund_id,
        trade_type: 'SELL',
        shares: lot.shares,
        price_per_share: lot.cost_basis, // This should be current NAV
        total_amount: lot.shares * lot.cost_basis,
        trade_date: new Date()
      };
    } catch (error) {
      logger.error('Error executing sell trade:', error);
      throw error;
    }
  }

  async executeBuyTrade(userId, fundId, amount) {
    try {
      // This would integrate with the trading service
      // For now, return a placeholder
      return {
        id: `buy-${Date.now()}`,
        user_id: userId,
        fund_id: fundId,
        trade_type: 'BUY',
        shares: 0, // This should be calculated based on current NAV
        price_per_share: 0, // This should be current NAV
        total_amount: amount,
        trade_date: new Date()
      };
    } catch (error) {
      logger.error('Error executing buy trade:', error);
      throw error;
    }
  }

  async getFundById(fundId) {
    try {
      const result = await pool.query(`
        SELECT * FROM mutual_funds WHERE id = $1
      `, [fundId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting fund by ID:', error);
      return null;
    }
  }

  async findReplacementFund(originalFundId) {
    try {
      // Get the original fund's category
      const result = await pool.query(`
        SELECT category_id FROM mutual_funds WHERE id = $1
      `, [originalFundId]);

      if (result.rows.length === 0) {
        return null;
      }

      const categoryId = result.rows[0].category_id;

      // Find a similar fund in the same category
      const replacementResult = await pool.query(`
        SELECT * FROM mutual_funds
        WHERE category_id = $1 AND id != $2 AND is_active = true
        ORDER BY assets_under_management DESC
        LIMIT 1
      `, [categoryId, originalFundId]);

      return replacementResult.rows[0] || null;
    } catch (error) {
      logger.error('Error finding replacement fund:', error);
      return null;
    }
  }

  async getTradesForYear(userId, year) {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_trades
        WHERE user_id = $1 AND EXTRACT(YEAR FROM trade_date) = $2
        ORDER BY trade_date ASC
      `, [userId, year]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting trades for year:', error);
      return [];
    }
  }

  async getRecentTrades(userId, days) {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_trades
        WHERE user_id = $1 AND trade_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY trade_date DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent trades:', error);
      return [];
    }
  }

  async getUserHoldings(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          uh.*,
          mf.symbol,
          mf.name
        FROM user_fund_holdings uh
        JOIN mutual_funds mf ON uh.fund_id = mf.id
        WHERE uh.user_id = $1
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user holdings:', error);
      return [];
    }
  }

  async clearTaxCache(userId) {
    try {
      const pattern = `tax_lots:${userId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }

      const reportPattern = `tax_report:${userId}:*`;
      const reportKeys = await redisService.keys(reportPattern);
      
      if (reportKeys.length > 0) {
        await Promise.all(reportKeys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing tax cache:', error);
    }
  }
}

module.exports = FundTaxService;
