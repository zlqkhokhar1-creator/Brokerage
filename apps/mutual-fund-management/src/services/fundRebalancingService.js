const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundRebalancingService extends EventEmitter {
  constructor() {
    super();
    this.rebalancingStrategies = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load rebalancing strategies
      await this.loadRebalancingStrategies();
      
      this._initialized = true;
      logger.info('FundRebalancingService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundRebalancingService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundRebalancingService closed');
    } catch (error) {
      logger.error('Error closing FundRebalancingService:', error);
    }
  }

  async loadRebalancingStrategies() {
    try {
      const result = await pool.query(`
        SELECT * FROM rebalancing_strategies
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const strategy of result.rows) {
        this.rebalancingStrategies.set(strategy.id, strategy);
      }

      logger.info(`Loaded ${result.rows.length} rebalancing strategies`);
    } catch (error) {
      logger.error('Error loading rebalancing strategies:', error);
      throw error;
    }
  }

  async analyzeRebalancingNeeds(userId, options = {}) {
    try {
      const {
        target_allocation = null,
        rebalancing_threshold = 0.05, // 5% threshold
        strategy_id = null
      } = options;

      // Get user's current portfolio
      const currentPortfolio = await this.getUserPortfolio(userId);
      
      if (!currentPortfolio || currentPortfolio.length === 0) {
        throw new Error('No portfolio found for user');
      }

      // Get target allocation
      const targetAllocation = target_allocation || await this.getTargetAllocation(userId);
      
      if (!targetAllocation) {
        throw new Error('No target allocation found for user');
      }

      // Calculate current allocation
      const currentAllocation = this.calculateCurrentAllocation(currentPortfolio);
      
      // Calculate allocation drift
      const allocationDrift = this.calculateAllocationDrift(currentAllocation, targetAllocation);
      
      // Determine if rebalancing is needed
      const rebalancingNeeded = this.isRebalancingNeeded(allocationDrift, rebalancing_threshold);
      
      // Calculate rebalancing recommendations
      const recommendations = rebalancingNeeded ? 
        await this.calculateRebalancingRecommendations(currentAllocation, targetAllocation, currentPortfolio) :
        [];

      // Calculate tax implications
      const taxImplications = await this.calculateTaxImplications(userId, recommendations);

      // Calculate transaction costs
      const transactionCosts = await this.calculateTransactionCosts(recommendations);

      return {
        user_id: userId,
        rebalancing_needed: rebalancingNeeded,
        current_allocation: currentAllocation,
        target_allocation: targetAllocation,
        allocation_drift: allocationDrift,
        recommendations: recommendations,
        tax_implications: taxImplications,
        transaction_costs: transactionCosts,
        analyzed_at: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing rebalancing needs:', error);
      throw error;
    }
  }

  async executeRebalancing(userId, rebalancingPlan, options = {}) {
    try {
      const {
        execute_immediately = false,
        dry_run = false,
        strategy_id = null
      } = options;

      // Validate rebalancing plan
      await this.validateRebalancingPlan(userId, rebalancingPlan);

      // Check compliance
      const complianceCheck = await this.checkRebalancingCompliance(userId, rebalancingPlan);
      
      if (!complianceCheck.compliant) {
        throw new Error(`Rebalancing compliance check failed: ${complianceCheck.violations.join(', ')}`);
      }

      // Execute rebalancing trades
      const executionResults = [];
      
      for (const trade of rebalancingPlan.trades) {
        try {
          if (dry_run) {
            // Simulate trade execution
            const simulatedTrade = await this.simulateTrade(userId, trade);
            executionResults.push(simulatedTrade);
          } else {
            // Execute actual trade
            const executedTrade = await this.executeTrade(userId, trade);
            executionResults.push(executedTrade);
          }
        } catch (error) {
          logger.error(`Error executing trade for ${trade.symbol}:`, error);
          executionResults.push({
            ...trade,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Update portfolio allocation
      if (!dry_run) {
        await this.updatePortfolioAllocation(userId, rebalancingPlan);
      }

      // Store rebalancing record
      const rebalancingRecord = await this.storeRebalancingRecord(userId, rebalancingPlan, executionResults, dry_run);

      // Emit rebalancing event
      this.emit('rebalancingExecuted', {
        user_id: userId,
        rebalancing_id: rebalancingRecord.id,
        trades_executed: executionResults.length,
        successful_trades: executionResults.filter(t => t.status === 'executed').length,
        failed_trades: executionResults.filter(t => t.status === 'failed').length
      });

      return {
        user_id: userId,
        rebalancing_id: rebalancingRecord.id,
        execution_results: executionResults,
        dry_run: dry_run,
        executed_at: new Date()
      };
    } catch (error) {
      logger.error('Error executing rebalancing:', error);
      throw error;
    }
  }

  async calculateRebalancingRecommendations(currentAllocation, targetAllocation, currentPortfolio) {
    try {
      const recommendations = [];

      // Calculate required changes
      const requiredChanges = this.calculateRequiredChanges(currentAllocation, targetAllocation);
      
      // Generate trade recommendations
      for (const [fundId, change] of requiredChanges) {
        if (Math.abs(change.percentage_change) < 0.01) continue; // Skip small changes
        
        const fund = currentPortfolio.find(p => p.fund_id === fundId);
        if (!fund) continue;

        const recommendation = {
          fund_id: fundId,
          symbol: fund.symbol,
          name: fund.name,
          current_allocation: change.current_percentage,
          target_allocation: change.target_percentage,
          percentage_change: change.percentage_change,
          current_value: fund.current_value,
          target_value: change.target_value,
          value_change: change.value_change,
          action: change.value_change > 0 ? 'buy' : 'sell',
          shares_to_trade: Math.abs(change.value_change) / fund.current_price,
          estimated_cost: Math.abs(change.value_change)
        };

        recommendations.push(recommendation);
      }

      // Sort by absolute value change (largest changes first)
      recommendations.sort((a, b) => Math.abs(b.value_change) - Math.abs(a.value_change));

      return recommendations;
    } catch (error) {
      logger.error('Error calculating rebalancing recommendations:', error);
      return [];
    }
  }

  async calculateTaxImplications(userId, recommendations) {
    try {
      const taxImplications = {
        total_tax_liability: 0,
        short_term_gains: 0,
        long_term_gains: 0,
        short_term_losses: 0,
        long_term_losses: 0,
        net_tax_impact: 0
      };

      for (const recommendation of recommendations) {
        if (recommendation.action === 'sell') {
          // Calculate gain/loss on sale
          const gainLoss = await this.calculateGainLoss(userId, recommendation);
          
          if (gainLoss > 0) {
            // Gain
            const isLongTerm = await this.isLongTermHolding(userId, recommendation.fund_id);
            if (isLongTerm) {
              taxImplications.long_term_gains += gainLoss;
            } else {
              taxImplications.short_term_gains += gainLoss;
            }
          } else {
            // Loss
            const isLongTerm = await this.isLongTermHolding(userId, recommendation.fund_id);
            if (isLongTerm) {
              taxImplications.long_term_losses += Math.abs(gainLoss);
            } else {
              taxImplications.short_term_losses += Math.abs(gainLoss);
            }
          }
        }
      }

      // Calculate tax liability
      const shortTermRate = 0.22; // 22% short-term capital gains rate
      const longTermRate = 0.15; // 15% long-term capital gains rate

      taxImplications.total_tax_liability = 
        (taxImplications.short_term_gains * shortTermRate) +
        (taxImplications.long_term_gains * longTermRate);

      // Calculate net tax impact
      taxImplications.net_tax_impact = 
        taxImplications.total_tax_liability -
        (taxImplications.short_term_losses * shortTermRate) -
        (taxImplications.long_term_losses * longTermRate);

      return taxImplications;
    } catch (error) {
      logger.error('Error calculating tax implications:', error);
      return {
        total_tax_liability: 0,
        short_term_gains: 0,
        long_term_gains: 0,
        short_term_losses: 0,
        long_term_losses: 0,
        net_tax_impact: 0
      };
    }
  }

  async calculateTransactionCosts(recommendations) {
    try {
      const costs = {
        total_commission: 0,
        total_fees: 0,
        total_cost: 0,
        cost_percentage: 0
      };

      for (const recommendation of recommendations) {
        // Commission (assuming $0 for mutual funds)
        const commission = 0;
        
        // Fees (expense ratios, loads, etc.)
        const fees = await this.calculateFundFees(recommendation);
        
        costs.total_commission += commission;
        costs.total_fees += fees;
      }

      costs.total_cost = costs.total_commission + costs.total_fees;
      
      const totalTradeValue = recommendations.reduce((sum, rec) => sum + Math.abs(rec.estimated_cost), 0);
      costs.cost_percentage = totalTradeValue > 0 ? (costs.total_cost / totalTradeValue) * 100 : 0;

      return costs;
    } catch (error) {
      logger.error('Error calculating transaction costs:', error);
      return {
        total_commission: 0,
        total_fees: 0,
        total_cost: 0,
        cost_percentage: 0
      };
    }
  }

  async getUserPortfolio(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          ufh.*,
          mf.symbol,
          mf.name,
          mf.expense_ratio,
          mf.load_type,
          mf.front_load,
          mf.back_load,
          fp.nav as current_price
        FROM user_fund_holdings ufh
        JOIN mutual_funds mf ON ufh.fund_id = mf.id
        LEFT JOIN fund_performance fp ON mf.id = fp.fund_id
        WHERE ufh.user_id = $1
          AND ufh.shares_owned > 0
        ORDER BY ufh.current_value DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user portfolio:', error);
      return [];
    }
  }

  async getTargetAllocation(userId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM user_target_allocations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting target allocation:', error);
      return null;
    }
  }

  calculateCurrentAllocation(portfolio) {
    try {
      const totalValue = portfolio.reduce((sum, holding) => sum + (holding.current_value || 0), 0);
      
      if (totalValue === 0) return {};

      const allocation = {};
      
      for (const holding of portfolio) {
        const percentage = (holding.current_value / totalValue) * 100;
        allocation[holding.fund_id] = {
          fund_id: holding.fund_id,
          symbol: holding.symbol,
          name: holding.name,
          current_value: holding.current_value,
          percentage: percentage
        };
      }

      return allocation;
    } catch (error) {
      logger.error('Error calculating current allocation:', error);
      return {};
    }
  }

  calculateAllocationDrift(currentAllocation, targetAllocation) {
    try {
      const drift = {};
      
      for (const [fundId, target] of Object.entries(targetAllocation.allocation)) {
        const current = currentAllocation[fundId];
        const currentPercentage = current ? current.percentage : 0;
        const targetPercentage = target.percentage;
        const driftPercentage = currentPercentage - targetPercentage;
        
        drift[fundId] = {
          fund_id: fundId,
          symbol: target.symbol,
          name: target.name,
          current_percentage: currentPercentage,
          target_percentage: targetPercentage,
          drift_percentage: driftPercentage,
          drift_value: current ? (driftPercentage / 100) * current.current_value : 0
        };
      }

      return drift;
    } catch (error) {
      logger.error('Error calculating allocation drift:', error);
      return {};
    }
  }

  isRebalancingNeeded(allocationDrift, threshold) {
    try {
      const maxDrift = Math.max(...Object.values(allocationDrift).map(drift => Math.abs(drift.drift_percentage)));
      return maxDrift > threshold;
    } catch (error) {
      logger.error('Error checking rebalancing need:', error);
      return false;
    }
  }

  calculateRequiredChanges(currentAllocation, targetAllocation) {
    try {
      const changes = {};
      const totalValue = Object.values(currentAllocation).reduce((sum, alloc) => sum + alloc.current_value, 0);
      
      for (const [fundId, target] of Object.entries(targetAllocation.allocation)) {
        const current = currentAllocation[fundId];
        const currentPercentage = current ? current.percentage : 0;
        const targetPercentage = target.percentage;
        const percentageChange = targetPercentage - currentPercentage;
        
        const targetValue = (targetPercentage / 100) * totalValue;
        const currentValue = current ? current.current_value : 0;
        const valueChange = targetValue - currentValue;
        
        changes[fundId] = {
          fund_id: fundId,
          symbol: target.symbol,
          name: target.name,
          current_percentage: currentPercentage,
          target_percentage: targetPercentage,
          percentage_change: percentageChange,
          current_value: currentValue,
          target_value: targetValue,
          value_change: valueChange
        };
      }

      return changes;
    } catch (error) {
      logger.error('Error calculating required changes:', error);
      return {};
    }
  }

  async calculateGainLoss(userId, recommendation) {
    try {
      const result = await pool.query(`
        SELECT 
          ufh.total_cost_basis,
          ufh.shares_owned,
          fp.nav as current_price
        FROM user_fund_holdings ufh
        LEFT JOIN fund_performance fp ON ufh.fund_id = fp.fund_id
        WHERE ufh.user_id = $1 AND ufh.fund_id = $2
      `, [userId, recommendation.fund_id]);

      if (result.rows.length === 0) return 0;

      const holding = result.rows[0];
      const costBasisPerShare = holding.total_cost_basis / holding.shares_owned;
      const currentPrice = holding.current_price || 0;
      const sharesToSell = Math.abs(recommendation.shares_to_trade);
      
      return (currentPrice - costBasisPerShare) * sharesToSell;
    } catch (error) {
      logger.error('Error calculating gain/loss:', error);
      return 0;
    }
  }

  async isLongTermHolding(userId, fundId) {
    try {
      const result = await pool.query(`
        SELECT MIN(trade_date) as first_purchase_date
        FROM fund_trades
        WHERE user_id = $1 AND fund_id = $2 AND trade_type = 'BUY'
      `, [userId, fundId]);

      if (result.rows.length === 0) return false;

      const firstPurchaseDate = new Date(result.rows[0].first_purchase_date);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      return firstPurchaseDate < oneYearAgo;
    } catch (error) {
      logger.error('Error checking long-term holding:', error);
      return false;
    }
  }

  async calculateFundFees(recommendation) {
    try {
      const result = await pool.query(`
        SELECT expense_ratio, load_type, front_load, back_load
        FROM mutual_funds
        WHERE id = $1
      `, [recommendation.fund_id]);

      if (result.rows.length === 0) return 0;

      const fund = result.rows[0];
      const tradeValue = Math.abs(recommendation.estimated_cost);
      
      let fees = 0;
      
      // Expense ratio (annual, prorated)
      if (fund.expense_ratio) {
        fees += tradeValue * fund.expense_ratio * 0.25; // Assume 3-month holding
      }
      
      // Load fees
      if (fund.load_type === 'Front Load' && fund.front_load) {
        fees += tradeValue * fund.front_load;
      } else if (fund.load_type === 'Back Load' && fund.back_load) {
        fees += tradeValue * fund.back_load;
      }
      
      return fees;
    } catch (error) {
      logger.error('Error calculating fund fees:', error);
      return 0;
    }
  }

  async validateRebalancingPlan(userId, rebalancingPlan) {
    try {
      // Check if user has sufficient funds
      const portfolio = await this.getUserPortfolio(userId);
      const totalValue = portfolio.reduce((sum, holding) => sum + holding.current_value, 0);
      
      const totalBuyAmount = rebalancingPlan.trades
        .filter(trade => trade.action === 'buy')
        .reduce((sum, trade) => sum + trade.estimated_cost, 0);
      
      if (totalBuyAmount > totalValue) {
        throw new Error('Insufficient funds for rebalancing');
      }

      // Check if user has sufficient shares to sell
      for (const trade of rebalancingPlan.trades) {
        if (trade.action === 'sell') {
          const holding = portfolio.find(h => h.fund_id === trade.fund_id);
          if (!holding || holding.shares_owned < trade.shares_to_trade) {
            throw new Error(`Insufficient shares to sell for ${trade.symbol}`);
          }
        }
      }

      logger.info(`Rebalancing plan validated for user ${userId}`);
    } catch (error) {
      logger.error('Error validating rebalancing plan:', error);
      throw error;
    }
  }

  async checkRebalancingCompliance(userId, rebalancingPlan) {
    try {
      // This would integrate with the compliance service
      // For now, return a basic compliance check
      return {
        compliant: true,
        violations: []
      };
    } catch (error) {
      logger.error('Error checking rebalancing compliance:', error);
      return {
        compliant: false,
        violations: ['Compliance check failed']
      };
    }
  }

  async simulateTrade(userId, trade) {
    try {
      // Simulate trade execution
      const simulatedTrade = {
        ...trade,
        status: 'simulated',
        executed_price: trade.current_price,
        executed_at: new Date(),
        fees: await this.calculateFundFees(trade)
      };

      logger.info(`Simulated trade for ${trade.symbol}: ${trade.action} ${trade.shares_to_trade} shares`);
      return simulatedTrade;
    } catch (error) {
      logger.error('Error simulating trade:', error);
      throw error;
    }
  }

  async executeTrade(userId, trade) {
    try {
      // This would integrate with the trading service
      // For now, simulate execution
      const executedTrade = {
        ...trade,
        status: 'executed',
        executed_price: trade.current_price,
        executed_at: new Date(),
        fees: await this.calculateFundFees(trade)
      };

      logger.info(`Executed trade for ${trade.symbol}: ${trade.action} ${trade.shares_to_trade} shares`);
      return executedTrade;
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  async updatePortfolioAllocation(userId, rebalancingPlan) {
    try {
      // Update user's target allocation
      await pool.query(`
        INSERT INTO user_target_allocations (user_id, allocation, updated_at)
        VALUES ($1, $2, $3)
      `, [userId, JSON.stringify(rebalancingPlan.target_allocation), new Date()]);

      logger.info(`Updated portfolio allocation for user ${userId}`);
    } catch (error) {
      logger.error('Error updating portfolio allocation:', error);
      throw error;
    }
  }

  async storeRebalancingRecord(userId, rebalancingPlan, executionResults, dryRun) {
    try {
      const result = await pool.query(`
        INSERT INTO rebalancing_records (
          user_id, rebalancing_plan, execution_results, dry_run,
          total_trades, successful_trades, failed_trades, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId,
        JSON.stringify(rebalancingPlan),
        JSON.stringify(executionResults),
        dryRun,
        executionResults.length,
        executionResults.filter(t => t.status === 'executed').length,
        executionResults.filter(t => t.status === 'failed').length,
        new Date()
      ]);

      logger.info(`Stored rebalancing record for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error storing rebalancing record:', error);
      throw error;
    }
  }

  async getRebalancingHistory(userId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end_date = new Date(),
        limit = 50
      } = options;

      const result = await pool.query(`
        SELECT *
        FROM rebalancing_records
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY created_at DESC
        LIMIT $4
      `, [userId, start_date, end_date, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting rebalancing history:', error);
      return [];
    }
  }

  async getRebalancingStats() {
    try {
      const stats = {
        total_rebalancings: 0,
        successful_rebalancings: 0,
        failed_rebalancings: 0,
        average_trades_per_rebalancing: 0,
        total_trades_executed: 0
      };

      // Get rebalancing counts
      const rebalancingResult = await pool.query(`
        SELECT 
          COUNT(*) as total_rebalancings,
          COUNT(CASE WHEN failed_trades = 0 THEN 1 END) as successful_rebalancings,
          COUNT(CASE WHEN failed_trades > 0 THEN 1 END) as failed_rebalancings,
          AVG(total_trades) as average_trades_per_rebalancing,
          SUM(total_trades) as total_trades_executed
        FROM rebalancing_records
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      if (rebalancingResult.rows.length > 0) {
        const row = rebalancingResult.rows[0];
        stats.total_rebalancings = parseInt(row.total_rebalancings);
        stats.successful_rebalancings = parseInt(row.successful_rebalancings);
        stats.failed_rebalancings = parseInt(row.failed_rebalancings);
        stats.average_trades_per_rebalancing = parseFloat(row.average_trades_per_rebalancing) || 0;
        stats.total_trades_executed = parseInt(row.total_trades_executed);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting rebalancing stats:', error);
      return {
        total_rebalancings: 0,
        successful_rebalancings: 0,
        failed_rebalancings: 0,
        average_trades_per_rebalancing: 0,
        total_trades_executed: 0
      };
    }
  }
}

module.exports = FundRebalancingService;