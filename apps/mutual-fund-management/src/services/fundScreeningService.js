const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundScreeningService extends EventEmitter {
  constructor() {
    super();
    this.screens = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundScreeningService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundScreeningService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundScreeningService closed');
    } catch (error) {
      logger.error('Error closing FundScreeningService:', error);
    }
  }

  async screenFunds(criteria, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      const offset = (page - 1) * limit;

      // Build WHERE clause based on criteria
      const whereConditions = ['mf.is_active = true'];
      const queryParams = [];
      let paramCount = 0;

      // Category filter
      if (criteria.categories && criteria.categories.length > 0) {
        paramCount++;
        whereConditions.push(`mf.category_id = ANY($${paramCount})`);
        queryParams.push(criteria.categories);
      }

      // Family filter
      if (criteria.families && criteria.families.length > 0) {
        paramCount++;
        whereConditions.push(`mf.fund_family_id = ANY($${paramCount})`);
        queryParams.push(criteria.families);
      }

      // Expense ratio range
      if (criteria.min_expense_ratio !== null && criteria.min_expense_ratio !== undefined) {
        paramCount++;
        whereConditions.push(`mf.expense_ratio >= $${paramCount}`);
        queryParams.push(criteria.min_expense_ratio);
      }

      if (criteria.max_expense_ratio !== null && criteria.max_expense_ratio !== undefined) {
        paramCount++;
        whereConditions.push(`mf.expense_ratio <= $${paramCount}`);
        queryParams.push(criteria.max_expense_ratio);
      }

      // Assets under management range
      if (criteria.min_assets !== null && criteria.min_assets !== undefined) {
        paramCount++;
        whereConditions.push(`fp.assets_under_management >= $${paramCount}`);
        queryParams.push(criteria.min_assets);
      }

      if (criteria.max_assets !== null && criteria.max_assets !== undefined) {
        paramCount++;
        whereConditions.push(`fp.assets_under_management <= $${paramCount}`);
        queryParams.push(criteria.max_assets);
      }

      // Performance filters
      if (criteria.min_performance_1y !== null && criteria.min_performance_1y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_1y >= $${paramCount}`);
        queryParams.push(criteria.min_performance_1y);
      }

      if (criteria.max_performance_1y !== null && criteria.max_performance_1y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_1y <= $${paramCount}`);
        queryParams.push(criteria.max_performance_1y);
      }

      if (criteria.min_performance_3y !== null && criteria.min_performance_3y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_3y >= $${paramCount}`);
        queryParams.push(criteria.min_performance_3y);
      }

      if (criteria.max_performance_3y !== null && criteria.max_performance_3y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_3y <= $${paramCount}`);
        queryParams.push(criteria.max_performance_3y);
      }

      if (criteria.min_performance_5y !== null && criteria.min_performance_5y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_5y >= $${paramCount}`);
        queryParams.push(criteria.min_performance_5y);
      }

      if (criteria.max_performance_5y !== null && criteria.max_performance_5y !== undefined) {
        paramCount++;
        whereConditions.push(`fp.total_return_5y <= $${paramCount}`);
        queryParams.push(criteria.max_performance_5y);
      }

      // Risk metrics filters
      if (criteria.min_sharpe_ratio !== null && criteria.min_sharpe_ratio !== undefined) {
        paramCount++;
        whereConditions.push(`fp.sharpe_ratio >= $${paramCount}`);
        queryParams.push(criteria.min_sharpe_ratio);
      }

      if (criteria.max_sharpe_ratio !== null && criteria.max_sharpe_ratio !== undefined) {
        paramCount++;
        whereConditions.push(`fp.sharpe_ratio <= $${paramCount}`);
        queryParams.push(criteria.max_sharpe_ratio);
      }

      if (criteria.min_alpha !== null && criteria.min_alpha !== undefined) {
        paramCount++;
        whereConditions.push(`fp.alpha >= $${paramCount}`);
        queryParams.push(criteria.min_alpha);
      }

      if (criteria.max_alpha !== null && criteria.max_alpha !== undefined) {
        paramCount++;
        whereConditions.push(`fp.alpha <= $${paramCount}`);
        queryParams.push(criteria.max_alpha);
      }

      if (criteria.min_beta !== null && criteria.min_beta !== undefined) {
        paramCount++;
        whereConditions.push(`fp.beta >= $${paramCount}`);
        queryParams.push(criteria.min_beta);
      }

      if (criteria.max_beta !== null && criteria.max_beta !== undefined) {
        paramCount++;
        whereConditions.push(`fp.beta <= $${paramCount}`);
        queryParams.push(criteria.max_beta);
      }

      // Boolean filters
      if (criteria.is_etf !== null && criteria.is_etf !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_etf = $${paramCount}`);
        queryParams.push(criteria.is_etf);
      }

      if (criteria.is_index_fund !== null && criteria.is_index_fund !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_index_fund = $${paramCount}`);
        queryParams.push(criteria.is_index_fund);
      }

      if (criteria.is_sector_fund !== null && criteria.is_sector_fund !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_sector_fund = $${paramCount}`);
        queryParams.push(criteria.is_sector_fund);
      }

      if (criteria.is_international !== null && criteria.is_international !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_international = $${paramCount}`);
        queryParams.push(criteria.is_international);
      }

      if (criteria.is_bond_fund !== null && criteria.is_bond_fund !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_bond_fund = $${paramCount}`);
        queryParams.push(criteria.is_bond_fund);
      }

      if (criteria.is_equity_fund !== null && criteria.is_equity_fund !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_equity_fund = $${paramCount}`);
        queryParams.push(criteria.is_equity_fund);
      }

      if (criteria.is_balanced_fund !== null && criteria.is_balanced_fund !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_balanced_fund = $${paramCount}`);
        queryParams.push(criteria.is_balanced_fund);
      }

      if (criteria.is_money_market !== null && criteria.is_money_market !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_money_market = $${paramCount}`);
        queryParams.push(criteria.is_money_market);
      }

      if (criteria.is_target_date !== null && criteria.is_target_date !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_target_date = $${paramCount}`);
        queryParams.push(criteria.is_target_date);
      }

      if (criteria.is_tradeable !== null && criteria.is_tradeable !== undefined) {
        paramCount++;
        whereConditions.push(`mf.is_tradeable = $${paramCount}`);
        queryParams.push(criteria.is_tradeable);
      }

      // Build ORDER BY clause
      let orderBy = 'mf.name ASC';
      if (sortBy === 'symbol') {
        orderBy = `mf.symbol ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'expense_ratio') {
        orderBy = `mf.expense_ratio ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'assets') {
        orderBy = `fp.assets_under_management ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'performance_1y') {
        orderBy = `fp.total_return_1y ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'performance_3y') {
        orderBy = `fp.total_return_3y ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'performance_5y') {
        orderBy = `fp.total_return_5y ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'sharpe_ratio') {
        orderBy = `fp.sharpe_ratio ${sortOrder.toUpperCase()}`;
      }

      const query = `
        SELECT 
          mf.*,
          ff.name as family_name,
          fc.name as category_name,
          fsc.name as subcategory_name,
          fp.nav,
          fp.total_return_1y,
          fp.total_return_3y,
          fp.total_return_5y,
          fp.assets_under_management,
          fp.sharpe_ratio,
          fp.alpha,
          fp.beta,
          fp.standard_deviation,
          fp.r_squared
        FROM mutual_funds mf
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        LEFT JOIN fund_subcategories fsc ON mf.subcategory_id = fsc.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM mutual_funds mf
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Calculate screening statistics
      const stats = this.calculateScreeningStats(result.rows);

      return {
        funds: result.rows,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error screening funds:', error);
      throw error;
    }
  }

  async saveScreen(userId, screenData) {
    try {
      const {
        name,
        criteria
      } = screenData;

      const screenId = nanoid();
      const screen = {
        id: screenId,
        user_id: userId,
        name,
        criteria,
        results_count: 0,
        last_run_at: null,
        is_saved: true,
        created_at: new Date()
      };

      await pool.query(`
        INSERT INTO fund_screens (
          id, user_id, name, criteria, results_count, last_run_at, is_saved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        screen.id,
        screen.user_id,
        screen.name,
        JSON.stringify(screen.criteria),
        screen.results_count,
        screen.last_run_at,
        screen.is_saved,
        screen.created_at
      ]);

      // Cache the screen
      this.screens.set(screenId, screen);

      // Emit event
      this.emit('screenSaved', screen);

      logger.info(`Fund screen saved: ${screenId}`);

      return screen;
    } catch (error) {
      logger.error('Error saving screen:', error);
      throw error;
    }
  }

  async getSavedScreens(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;

      const result = await pool.query(`
        SELECT *
        FROM fund_screens
        WHERE user_id = $1 AND is_saved = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM fund_screens
        WHERE user_id = $1 AND is_saved = true
      `, [userId]);

      const total = parseInt(countResult.rows[0].total);

      return {
        screens: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting saved screens:', error);
      throw error;
    }
  }

  async getScreen(screenId, userId) {
    try {
      const result = await pool.query(`
        SELECT *
        FROM fund_screens
        WHERE id = $1 AND user_id = $2
      `, [screenId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Screen not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting screen:', error);
      throw error;
    }
  }

  async updateScreen(screenId, userId, updateData) {
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          if (key === 'criteria') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(screenId);
      paramCount++;
      values.push(userId);

      const query = `
        UPDATE fund_screens
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Screen not found');
      }

      const updatedScreen = result.rows[0];

      // Update cache
      this.screens.set(screenId, updatedScreen);

      // Emit event
      this.emit('screenUpdated', updatedScreen);

      logger.info(`Screen updated: ${screenId}`);

      return updatedScreen;
    } catch (error) {
      logger.error('Error updating screen:', error);
      throw error;
    }
  }

  async deleteScreen(screenId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM fund_screens
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [screenId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Screen not found');
      }

      const deletedScreen = result.rows[0];

      // Remove from cache
      this.screens.delete(screenId);

      // Emit event
      this.emit('screenDeleted', deletedScreen);

      logger.info(`Screen deleted: ${screenId}`);

      return deletedScreen;
    } catch (error) {
      logger.error('Error deleting screen:', error);
      throw error;
    }
  }

  async runScreen(screenId, userId, options = {}) {
    try {
      const screen = await this.getScreen(screenId, userId);
      
      // Run the screen with the saved criteria
      const results = await this.screenFunds(screen.criteria, options);
      
      // Update the screen with results count and last run time
      await this.updateScreen(screenId, userId, {
        results_count: results.pagination.total,
        last_run_at: new Date()
      });

      return results;
    } catch (error) {
      logger.error('Error running screen:', error);
      throw error;
    }
  }

  calculateScreeningStats(funds) {
    try {
      const stats = {
        total_funds: funds.length,
        average_expense_ratio: 0,
        average_assets: 0,
        average_performance_1y: 0,
        average_performance_3y: 0,
        average_performance_5y: 0,
        average_sharpe_ratio: 0,
        category_distribution: {},
        family_distribution: {},
        risk_distribution: {
          low: 0,
          medium: 0,
          high: 0
        }
      };

      if (funds.length === 0) {
        return stats;
      }

      let totalExpenseRatio = 0;
      let totalAssets = 0;
      let totalPerformance1y = 0;
      let totalPerformance3y = 0;
      let totalPerformance5y = 0;
      let totalSharpeRatio = 0;
      let validExpenseRatio = 0;
      let validAssets = 0;
      let validPerformance1y = 0;
      let validPerformance3y = 0;
      let validPerformance5y = 0;
      let validSharpeRatio = 0;

      funds.forEach(fund => {
        // Category distribution
        if (fund.category_name) {
          stats.category_distribution[fund.category_name] = 
            (stats.category_distribution[fund.category_name] || 0) + 1;
        }

        // Family distribution
        if (fund.family_name) {
          stats.family_distribution[fund.family_name] = 
            (stats.family_distribution[fund.family_name] || 0) + 1;
        }

        // Risk distribution based on standard deviation
        if (fund.standard_deviation !== null && fund.standard_deviation !== undefined) {
          if (fund.standard_deviation < 10) {
            stats.risk_distribution.low++;
          } else if (fund.standard_deviation > 20) {
            stats.risk_distribution.high++;
          } else {
            stats.risk_distribution.medium++;
          }
        }

        // Calculate averages
        if (fund.expense_ratio !== null && fund.expense_ratio !== undefined) {
          totalExpenseRatio += parseFloat(fund.expense_ratio);
          validExpenseRatio++;
        }

        if (fund.assets_under_management !== null && fund.assets_under_management !== undefined) {
          totalAssets += parseFloat(fund.assets_under_management);
          validAssets++;
        }

        if (fund.total_return_1y !== null && fund.total_return_1y !== undefined) {
          totalPerformance1y += parseFloat(fund.total_return_1y);
          validPerformance1y++;
        }

        if (fund.total_return_3y !== null && fund.total_return_3y !== undefined) {
          totalPerformance3y += parseFloat(fund.total_return_3y);
          validPerformance3y++;
        }

        if (fund.total_return_5y !== null && fund.total_return_5y !== undefined) {
          totalPerformance5y += parseFloat(fund.total_return_5y);
          validPerformance5y++;
        }

        if (fund.sharpe_ratio !== null && fund.sharpe_ratio !== undefined) {
          totalSharpeRatio += parseFloat(fund.sharpe_ratio);
          validSharpeRatio++;
        }
      });

      // Calculate averages
      stats.average_expense_ratio = validExpenseRatio > 0 ? totalExpenseRatio / validExpenseRatio : 0;
      stats.average_assets = validAssets > 0 ? totalAssets / validAssets : 0;
      stats.average_performance_1y = validPerformance1y > 0 ? totalPerformance1y / validPerformance1y : 0;
      stats.average_performance_3y = validPerformance3y > 0 ? totalPerformance3y / validPerformance3y : 0;
      stats.average_performance_5y = validPerformance5y > 0 ? totalPerformance5y / validPerformance5y : 0;
      stats.average_sharpe_ratio = validSharpeRatio > 0 ? totalSharpeRatio / validSharpeRatio : 0;

      return stats;
    } catch (error) {
      logger.error('Error calculating screening stats:', error);
      return {
        total_funds: 0,
        average_expense_ratio: 0,
        average_assets: 0,
        average_performance_1y: 0,
        average_performance_3y: 0,
        average_performance_5y: 0,
        average_sharpe_ratio: 0,
        category_distribution: {},
        family_distribution: {},
        risk_distribution: { low: 0, medium: 0, high: 0 }
      };
    }
  }

  async getScreeningStats() {
    try {
      const stats = {
        total_screens: this.screens.size,
        saved_screens: Array.from(this.screens.values()).filter(s => s.is_saved).length,
        total_screen_runs: Array.from(this.screens.values()).reduce((sum, s) => sum + (s.results_count || 0), 0)
      };

      return stats;
    } catch (error) {
      logger.error('Error getting screening stats:', error);
      throw error;
    }
  }
}

module.exports = FundScreeningService;
