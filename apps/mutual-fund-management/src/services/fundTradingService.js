const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundTradingService extends EventEmitter {
  constructor() {
    super();
    this.trades = new Map();
    this.userHoldings = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundTradingService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundTradingService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundTradingService closed');
    } catch (error) {
      logger.error('Error closing FundTradingService:', error);
    }
  }

  async executeTrade(userId, tradeData) {
    try {
      const {
        fund_id,
        trade_type,
        shares,
        price_per_share,
        trade_date,
        notes
      } = tradeData;

      // Validate fund exists and is tradeable
      const fundResult = await pool.query(`
        SELECT * FROM mutual_funds
        WHERE id = $1 AND is_active = true AND is_tradeable = true
      `, [fund_id]);

      if (fundResult.rows.length === 0) {
        throw new Error('Fund not found or not tradeable');
      }

      const fund = fundResult.rows[0];

      // Calculate settlement date (T+1 for mutual funds)
      const settlementDate = new Date(trade_date);
      settlementDate.setDate(settlementDate.getDate() + 1);

      // Calculate fees
      const fees = this.calculateFees(fund, trade_type, shares, price_per_share);
      const totalAmount = shares * price_per_share;
      const netAmount = totalAmount + fees;

      // Create trade record
      const tradeId = nanoid();
      const trade = {
        id: tradeId,
        user_id: userId,
        fund_id,
        trade_type,
        shares,
        price_per_share,
        total_amount: totalAmount,
        fees,
        net_amount: netAmount,
        trade_date,
        settlement_date: settlementDate,
        status: 'PENDING',
        order_id: `MF-${Date.now()}-${tradeId.substring(0, 8)}`,
        notes,
        created_at: new Date()
      };

      // Store trade in database
      await pool.query(`
        INSERT INTO fund_trades (
          id, user_id, fund_id, trade_type, shares, price_per_share,
          total_amount, fees, net_amount, trade_date, settlement_date,
          status, order_id, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        trade.id,
        trade.user_id,
        trade.fund_id,
        trade.trade_type,
        trade.shares,
        trade.price_per_share,
        trade.total_amount,
        trade.fees,
        trade.net_amount,
        trade.trade_date,
        trade.settlement_date,
        trade.status,
        trade.order_id,
        trade.notes,
        trade.created_at
      ]);

      // Cache trade
      this.trades.set(tradeId, trade);

      // Process trade immediately for mutual funds
      await this.processTrade(tradeId);

      // Emit event
      this.emit('tradeExecuted', trade);

      logger.info(`Fund trade executed: ${trade_type} ${shares} shares of ${fund.symbol}`, {
        tradeId,
        userId,
        fundId: fund_id,
        totalAmount
      });

      return trade;
    } catch (error) {
      logger.error('Error executing fund trade:', error);
      throw error;
    }
  }

  async processTrade(tradeId) {
    try {
      const trade = this.trades.get(tradeId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      // Update trade status to processing
      trade.status = 'PROCESSING';
      await this.updateTradeStatus(tradeId, 'PROCESSING');

      // Simulate trade execution (in real implementation, this would integrate with broker)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update user holdings
      await this.updateUserHoldings(trade);

      // Update trade status to executed
      trade.status = 'EXECUTED';
      trade.execution_id = `EXEC-${Date.now()}-${tradeId.substring(0, 8)}`;
      await this.updateTradeStatus(tradeId, 'EXECUTED', trade.execution_id);

      // Emit event
      this.emit('tradeProcessed', trade);

      logger.info(`Fund trade processed: ${tradeId}`);
    } catch (error) {
      logger.error(`Error processing trade ${tradeId}:`, error);
      
      // Update trade status to failed
      const trade = this.trades.get(tradeId);
      if (trade) {
        trade.status = 'FAILED';
        await this.updateTradeStatus(tradeId, 'FAILED');
      }
    }
  }

  async updateUserHoldings(trade) {
    try {
      const { user_id, fund_id, trade_type, shares, price_per_share, total_amount } = trade;

      // Get current holdings
      const holdingsResult = await pool.query(`
        SELECT * FROM user_fund_holdings
        WHERE user_id = $1 AND fund_id = $2
      `, [user_id, fund_id]);

      if (holdingsResult.rows.length === 0) {
        // Create new holding
        if (trade_type === 'BUY') {
          await pool.query(`
            INSERT INTO user_fund_holdings (
              user_id, fund_id, shares_owned, average_cost_basis,
              total_cost_basis, current_value, unrealized_gain_loss
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            user_id,
            fund_id,
            shares,
            price_per_share,
            total_amount,
            total_amount, // Current value equals cost basis initially
            0 // No unrealized gain/loss initially
          ]);
        }
      } else {
        // Update existing holding
        const currentHolding = holdingsResult.rows[0];
        let newShares, newTotalCost, newAverageCost;

        if (trade_type === 'BUY') {
          newShares = parseFloat(currentHolding.shares_owned) + parseFloat(shares);
          newTotalCost = parseFloat(currentHolding.total_cost_basis) + parseFloat(total_amount);
          newAverageCost = newTotalCost / newShares;
        } else {
          newShares = parseFloat(currentHolding.shares_owned) - parseFloat(shares);
          newTotalCost = parseFloat(currentHolding.total_cost_basis) - parseFloat(total_amount);
          newAverageCost = newTotalCost / newShares;
        }

        if (newShares <= 0) {
          // Delete holding if no shares left
          await pool.query(`
            DELETE FROM user_fund_holdings
            WHERE user_id = $1 AND fund_id = $2
          `, [user_id, fund_id]);
        } else {
          // Update holding
          await pool.query(`
            UPDATE user_fund_holdings
            SET shares_owned = $1, average_cost_basis = $2, total_cost_basis = $3,
                last_updated = CURRENT_TIMESTAMP
            WHERE user_id = $4 AND fund_id = $5
          `, [newShares, newAverageCost, newTotalCost, user_id, fund_id]);
        }
      }

      // Create tax lot for buy trades
      if (trade_type === 'BUY') {
        await pool.query(`
          INSERT INTO fund_tax_lots (
            user_id, fund_id, trade_id, shares, cost_basis, acquisition_date
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [user_id, fund_id, trade.id, shares, price_per_share, trade.trade_date]);
      }

      // Update holdings cache
      await this.updateHoldingsCache(user_id);

      logger.info(`User holdings updated for trade ${trade.id}`);
    } catch (error) {
      logger.error('Error updating user holdings:', error);
      throw error;
    }
  }

  async updateHoldingsCache(userId) {
    try {
      const holdings = await this.getUserHoldings(userId);
      await redisService.set(`user_holdings:${userId}`, holdings, 3600);
    } catch (error) {
      logger.error('Error updating holdings cache:', error);
    }
  }

  async getUserHoldings(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'current_value',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      // Build ORDER BY clause
      let orderBy = 'uh.current_value DESC';
      if (sortBy === 'name') {
        orderBy = `mf.name ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'symbol') {
        orderBy = `mf.symbol ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'shares_owned') {
        orderBy = `uh.shares_owned ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'unrealized_gain_loss') {
        orderBy = `uh.unrealized_gain_loss ${sortOrder.toUpperCase()}`;
      }

      const result = await pool.query(`
        SELECT 
          uh.*,
          mf.symbol,
          mf.name,
          ff.name as family_name,
          fc.name as category_name,
          fp.nav as current_nav,
          (uh.shares_owned * fp.nav) as current_value,
          (uh.shares_owned * fp.nav - uh.total_cost_basis) as unrealized_gain_loss,
          CASE 
            WHEN uh.total_cost_basis > 0 THEN 
              ((uh.shares_owned * fp.nav - uh.total_cost_basis) / uh.total_cost_basis) * 100
            ELSE 0
          END as unrealized_gain_loss_percentage
        FROM user_fund_holdings uh
        JOIN mutual_funds mf ON uh.fund_id = mf.id
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        LEFT JOIN LATERAL (
          SELECT nav
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE uh.user_id = $1
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM user_fund_holdings uh
        WHERE uh.user_id = $1
      `, [userId]);

      const total = parseInt(countResult.rows[0].total);

      return {
        holdings: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user holdings:', error);
      throw error;
    }
  }

  async getTrades(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        fund_id = null,
        trade_type = null,
        status = null,
        start_date = null,
        end_date = null,
        sortBy = 'trade_date',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = ['ft.user_id = $1'];
      let queryParams = [userId];
      let paramCount = 1;

      if (fund_id) {
        paramCount++;
        whereConditions.push(`ft.fund_id = $${paramCount}`);
        queryParams.push(fund_id);
      }

      if (trade_type) {
        paramCount++;
        whereConditions.push(`ft.trade_type = $${paramCount}`);
        queryParams.push(trade_type);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`ft.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (start_date) {
        paramCount++;
        whereConditions.push(`ft.trade_date >= $${paramCount}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        paramCount++;
        whereConditions.push(`ft.trade_date <= $${paramCount}`);
        queryParams.push(end_date);
      }

      // Build ORDER BY clause
      let orderBy = 'ft.trade_date DESC';
      if (sortBy === 'created_at') {
        orderBy = `ft.created_at ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'total_amount') {
        orderBy = `ft.total_amount ${sortOrder.toUpperCase()}`;
      }

      const query = `
        SELECT 
          ft.*,
          mf.symbol,
          mf.name as fund_name,
          ff.name as family_name
        FROM fund_trades ft
        JOIN mutual_funds mf ON ft.fund_id = mf.id
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_trades ft
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        trades: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting trades:', error);
      throw error;
    }
  }

  async getTrade(tradeId, userId) {
    try {
      const result = await pool.query(`
        SELECT 
          ft.*,
          mf.symbol,
          mf.name as fund_name,
          ff.name as family_name
        FROM fund_trades ft
        JOIN mutual_funds mf ON ft.fund_id = mf.id
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        WHERE ft.id = $1 AND ft.user_id = $2
      `, [tradeId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Trade not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting trade:', error);
      throw error;
    }
  }

  async cancelTrade(tradeId, userId) {
    try {
      const result = await pool.query(`
        UPDATE fund_trades
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND status = 'PENDING'
        RETURNING *
      `, [tradeId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Trade not found or cannot be cancelled');
      }

      const cancelledTrade = result.rows[0];
      
      // Remove from cache
      this.trades.delete(tradeId);
      
      // Emit event
      this.emit('tradeCancelled', cancelledTrade);
      
      logger.info(`Trade cancelled: ${tradeId}`);
      
      return cancelledTrade;
    } catch (error) {
      logger.error('Error cancelling trade:', error);
      throw error;
    }
  }

  async processPendingTrades() {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_trades
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 10
      `);

      for (const trade of result.rows) {
        this.trades.set(trade.id, trade);
        await this.processTrade(trade.id);
      }

      logger.info(`Processed ${result.rows.length} pending trades`);
    } catch (error) {
      logger.error('Error processing pending trades:', error);
    }
  }

  calculateFees(fund, tradeType, shares, pricePerShare) {
    try {
      let fees = 0;
      const totalAmount = shares * pricePerShare;

      // Front load fee
      if (tradeType === 'BUY' && fund.front_load > 0) {
        fees += totalAmount * (fund.front_load / 100);
      }

      // Back load fee
      if (tradeType === 'SELL' && fund.back_load > 0) {
        fees += totalAmount * (fund.back_load / 100);
      }

      // Redemption fee
      if (tradeType === 'SELL' && fund.redemption_fee > 0) {
        fees += totalAmount * (fund.redemption_fee / 100);
      }

      return fees;
    } catch (error) {
      logger.error('Error calculating fees:', error);
      return 0;
    }
  }

  async updateTradeStatus(tradeId, status, executionId = null) {
    try {
      const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const values = [status];
      let paramCount = 1;

      if (executionId) {
        paramCount++;
        updateFields.push(`execution_id = $${paramCount}`);
        values.push(executionId);
      }

      paramCount++;
      values.push(tradeId);

      await pool.query(`
        UPDATE fund_trades
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
      `, values);
    } catch (error) {
      logger.error('Error updating trade status:', error);
      throw error;
    }
  }

  async getTradingStats(userId) {
    try {
      const stats = {
        total_trades: 0,
        buy_trades: 0,
        sell_trades: 0,
        pending_trades: 0,
        executed_trades: 0,
        cancelled_trades: 0,
        failed_trades: 0,
        total_volume: 0,
        total_fees: 0
      };

      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN trade_type = 'BUY' THEN 1 END) as buy_trades,
          COUNT(CASE WHEN trade_type = 'SELL' THEN 1 END) as sell_trades,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_trades,
          COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed_trades,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_trades,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_trades,
          COALESCE(SUM(total_amount), 0) as total_volume,
          COALESCE(SUM(fees), 0) as total_fees
        FROM fund_trades
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length > 0) {
        Object.assign(stats, result.rows[0]);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting trading stats:', error);
      throw error;
    }
  }
}

module.exports = FundTradingService;
