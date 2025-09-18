const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundCatalogService extends EventEmitter {
  constructor() {
    super();
    this.funds = new Map();
    this.categories = new Map();
    this.families = new Map();
    this.subcategories = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      // Load fund categories
      await this.loadCategories();
      
      // Load fund families
      await this.loadFamilies();
      
      // Load subcategories
      await this.loadSubcategories();
      
      // Load funds
      await this.loadFunds();
      
      this._initialized = true;
      logger.info('FundCatalogService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundCatalogService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundCatalogService closed');
    } catch (error) {
      logger.error('Error closing FundCatalogService:', error);
    }
  }

  async loadCategories() {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_categories
        WHERE is_active = true
        ORDER BY name ASC
      `);
      
      for (const category of result.rows) {
        this.categories.set(category.id, category);
      }
      
      logger.info(`Loaded ${result.rows.length} fund categories`);
    } catch (error) {
      logger.error('Error loading fund categories:', error);
      throw error;
    }
  }

  async loadFamilies() {
    try {
      const result = await pool.query(`
        SELECT * FROM fund_families
        WHERE is_active = true
        ORDER BY name ASC
      `);
      
      for (const family of result.rows) {
        this.families.set(family.id, family);
      }
      
      logger.info(`Loaded ${result.rows.length} fund families`);
    } catch (error) {
      logger.error('Error loading fund families:', error);
      throw error;
    }
  }

  async loadSubcategories() {
    try {
      const result = await pool.query(`
        SELECT sc.*, c.name as category_name
        FROM fund_subcategories sc
        JOIN fund_categories c ON sc.category_id = c.id
        WHERE sc.is_active = true
        ORDER BY c.name, sc.name ASC
      `);
      
      for (const subcategory of result.rows) {
        this.subcategories.set(subcategory.id, subcategory);
      }
      
      logger.info(`Loaded ${result.rows.length} fund subcategories`);
    } catch (error) {
      logger.error('Error loading fund subcategories:', error);
      throw error;
    }
  }

  async loadFunds() {
    try {
      const result = await pool.query(`
        SELECT 
          mf.*,
          ff.name as family_name,
          fc.name as category_name,
          fsc.name as subcategory_name
        FROM mutual_funds mf
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        LEFT JOIN fund_subcategories fsc ON mf.subcategory_id = fsc.id
        WHERE mf.is_active = true
        ORDER BY mf.name ASC
      `);
      
      for (const fund of result.rows) {
        this.funds.set(fund.id, fund);
      }
      
      logger.info(`Loaded ${result.rows.length} mutual funds`);
    } catch (error) {
      logger.error('Error loading mutual funds:', error);
      throw error;
    }
  }

  async getFunds(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        category = '',
        family = '',
        minExpenseRatio = null,
        maxExpenseRatio = null,
        minAssets = null,
        maxAssets = null,
        isActive = true,
        isTradeable = true,
        sortBy = 'name',
        sortOrder = 'asc'
      } = filters;

      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      let whereConditions = ['mf.is_active = $1'];
      let queryParams = [isActive];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereConditions.push(`(mf.name ILIKE $${paramCount} OR mf.symbol ILIKE $${paramCount})`);
        queryParams.push(`%${search}%`);
      }

      if (category) {
        paramCount++;
        whereConditions.push(`mf.category_id = $${paramCount}`);
        queryParams.push(category);
      }

      if (family) {
        paramCount++;
        whereConditions.push(`mf.fund_family_id = $${paramCount}`);
        queryParams.push(family);
      }

      if (isTradeable !== null) {
        paramCount++;
        whereConditions.push(`mf.is_tradeable = $${paramCount}`);
        queryParams.push(isTradeable);
      }

      if (minExpenseRatio !== null) {
        paramCount++;
        whereConditions.push(`mf.expense_ratio >= $${paramCount}`);
        queryParams.push(minExpenseRatio);
      }

      if (maxExpenseRatio !== null) {
        paramCount++;
        whereConditions.push(`mf.expense_ratio <= $${paramCount}`);
        queryParams.push(maxExpenseRatio);
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
          fp.beta
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
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        funds: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting funds:', error);
      throw error;
    }
  }

  async getFund(fundId) {
    try {
      // Check cache first
      const cacheKey = `fund:${fundId}`;
      const cachedFund = await redisService.get(cacheKey);
      if (cachedFund) {
        return cachedFund;
      }

      const result = await pool.query(`
        SELECT 
          mf.*,
          ff.name as family_name,
          ff.description as family_description,
          ff.website as family_website,
          fc.name as category_name,
          fc.description as category_description,
          fsc.name as subcategory_name,
          fp.nav,
          fp.total_return_1d,
          fp.total_return_1w,
          fp.total_return_1m,
          fp.total_return_3m,
          fp.total_return_6m,
          fp.total_return_1y,
          fp.total_return_3y,
          fp.total_return_5y,
          fp.total_return_10y,
          fp.total_return_ytd,
          fp.total_return_since_inception,
          fp.assets_under_management,
          fp.shares_outstanding,
          fp.dividend_yield,
          fp.beta,
          fp.alpha,
          fp.sharpe_ratio,
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
        WHERE mf.id = $1
      `, [fundId]);

      if (result.rows.length === 0) {
        throw new Error('Fund not found');
      }

      const fund = result.rows[0];

      // Cache the result
      await redisService.set(cacheKey, fund, 3600); // Cache for 1 hour

      return fund;
    } catch (error) {
      logger.error('Error getting fund:', error);
      throw error;
    }
  }

  async createFund(fundData) {
    try {
      const result = await pool.query(`
        INSERT INTO mutual_funds (
          symbol, name, fund_family_id, category_id, subcategory_id,
          investment_objective, investment_strategy, inception_date,
          expense_ratio, management_fee, other_expenses,
          minimum_investment, minimum_additional_investment,
          redemption_fee, load_type, front_load, back_load, deferred_load,
          redemption_fee_period, management_company, portfolio_manager,
          fund_manager_tenure, is_etf, is_index_fund, is_sector_fund,
          is_international, is_bond_fund, is_equity_fund, is_balanced_fund,
          is_money_market, is_target_date, target_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
        ) RETURNING *
      `, [
        fundData.symbol,
        fundData.name,
        fundData.fund_family_id,
        fundData.category_id,
        fundData.subcategory_id,
        fundData.investment_objective,
        fundData.investment_strategy,
        fundData.inception_date,
        fundData.expense_ratio,
        fundData.management_fee,
        fundData.other_expenses,
        fundData.minimum_investment,
        fundData.minimum_additional_investment,
        fundData.redemption_fee,
        fundData.load_type,
        fundData.front_load,
        fundData.back_load,
        fundData.deferred_load,
        fundData.redemption_fee_period,
        fundData.management_company,
        fundData.portfolio_manager,
        fundData.fund_manager_tenure,
        fundData.is_etf || false,
        fundData.is_index_fund || false,
        fundData.is_sector_fund || false,
        fundData.is_international || false,
        fundData.is_bond_fund || false,
        fundData.is_equity_fund || false,
        fundData.is_balanced_fund || false,
        fundData.is_money_market || false,
        fundData.is_target_date || false,
        fundData.target_date
      ]);

      const newFund = result.rows[0];
      
      // Add to in-memory cache
      this.funds.set(newFund.id, newFund);
      
      // Emit event
      this.emit('fundCreated', newFund);
      
      logger.info(`Fund created: ${newFund.symbol} - ${newFund.name}`);
      
      return newFund;
    } catch (error) {
      logger.error('Error creating fund:', error);
      throw error;
    }
  }

  async updateFund(fundId, updateData) {
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(fundId);

      const query = `
        UPDATE mutual_funds
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Fund not found');
      }

      const updatedFund = result.rows[0];
      
      // Update in-memory cache
      this.funds.set(updatedFund.id, updatedFund);
      
      // Clear cache
      await redisService.del(`fund:${fundId}`);
      
      // Emit event
      this.emit('fundUpdated', updatedFund);
      
      logger.info(`Fund updated: ${updatedFund.symbol} - ${updatedFund.name}`);
      
      return updatedFund;
    } catch (error) {
      logger.error('Error updating fund:', error);
      throw error;
    }
  }

  async deleteFund(fundId) {
    try {
      const result = await pool.query(`
        UPDATE mutual_funds
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [fundId]);

      if (result.rows.length === 0) {
        throw new Error('Fund not found');
      }

      const deletedFund = result.rows[0];
      
      // Remove from in-memory cache
      this.funds.delete(fundId);
      
      // Clear cache
      await redisService.del(`fund:${fundId}`);
      
      // Emit event
      this.emit('fundDeleted', deletedFund);
      
      logger.info(`Fund deleted: ${deletedFund.symbol} - ${deletedFund.name}`);
      
      return deletedFund;
    } catch (error) {
      logger.error('Error deleting fund:', error);
      throw error;
    }
  }

  async getCategories() {
    try {
      return Array.from(this.categories.values());
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  async getFamilies() {
    try {
      return Array.from(this.families.values());
    } catch (error) {
      logger.error('Error getting families:', error);
      throw error;
    }
  }

  async getSubcategories() {
    try {
      return Array.from(this.subcategories.values());
    } catch (error) {
      logger.error('Error getting subcategories:', error);
      throw error;
    }
  }

  async searchFunds(searchTerm, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          mf.id,
          mf.symbol,
          mf.name,
          ff.name as family_name,
          fc.name as category_name,
          fp.nav,
          fp.total_return_1y
        FROM mutual_funds mf
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE mf.is_active = true
          AND (mf.name ILIKE $1 OR mf.symbol ILIKE $1)
        ORDER BY mf.name ASC
        LIMIT $2
      `, [`%${searchTerm}%`, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error searching funds:', error);
      throw error;
    }
  }

  async getFundStats() {
    try {
      const stats = {
        total_funds: this.funds.size,
        active_funds: Array.from(this.funds.values()).filter(f => f.is_active).length,
        tradeable_funds: Array.from(this.funds.values()).filter(f => f.is_tradeable).length,
        etf_funds: Array.from(this.funds.values()).filter(f => f.is_etf).length,
        index_funds: Array.from(this.funds.values()).filter(f => f.is_index_fund).length,
        total_categories: this.categories.size,
        total_families: this.families.size,
        total_subcategories: this.subcategories.size
      };

      return stats;
    } catch (error) {
      logger.error('Error getting fund stats:', error);
      throw error;
    }
  }
}

module.exports = FundCatalogService;
