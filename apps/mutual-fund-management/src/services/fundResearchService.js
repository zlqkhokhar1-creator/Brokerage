const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundResearchService extends EventEmitter {
  constructor() {
    super();
    this.researchNotes = new Map();
    this.comparisons = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundResearchService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundResearchService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundResearchService closed');
    } catch (error) {
      logger.error('Error closing FundResearchService:', error);
    }
  }

  async getFundResearch(fundId) {
    try {
      // Check cache first
      const cacheKey = `fund_research:${fundId}`;
      const cachedResearch = await redisService.get(cacheKey);
      if (cachedResearch) {
        return cachedResearch;
      }

      // Get fund basic information
      const fundResult = await pool.query(`
        SELECT 
          mf.*,
          ff.name as family_name,
          ff.description as family_description,
          fc.name as category_name,
          fc.description as category_description,
          fsc.name as subcategory_name
        FROM mutual_funds mf
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN fund_categories fc ON mf.category_id = fc.id
        LEFT JOIN fund_subcategories fsc ON mf.subcategory_id = fsc.id
        WHERE mf.id = $1
      `, [fundId]);

      if (fundResult.rows.length === 0) {
        throw new Error('Fund not found');
      }

      const fund = fundResult.rows[0];

      // Get latest performance data
      const performanceResult = await pool.query(`
        SELECT *
        FROM fund_performance
        WHERE fund_id = $1
        ORDER BY date DESC
        LIMIT 1
      `, [fundId]);

      const performance = performanceResult.rows[0] || {};

      // Get fund holdings
      const holdingsResult = await pool.query(`
        SELECT *
        FROM fund_holdings
        WHERE fund_id = $1
        ORDER BY percentage_of_fund DESC
        LIMIT 20
      `, [fundId]);

      const holdings = holdingsResult.rows;

      // Get sector allocation
      const sectorAllocation = this.calculateSectorAllocation(holdings);

      // Get geographic allocation
      const geographicAllocation = this.calculateGeographicAllocation(holdings);

      // Get top holdings
      const topHoldings = holdings.slice(0, 10);

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(performance);

      // Get performance comparison with category
      const categoryComparison = await this.getCategoryComparison(fundId, fund.category_id);

      // Get fund family comparison
      const familyComparison = await this.getFamilyComparison(fundId, fund.fund_family_id);

      const research = {
        fund,
        performance,
        holdings: {
          all: holdings,
          top: topHoldings,
          sector_allocation: sectorAllocation,
          geographic_allocation: geographicAllocation
        },
        risk_metrics: riskMetrics,
        comparisons: {
          category: categoryComparison,
          family: familyComparison
        },
        generated_at: new Date()
      };

      // Cache the result
      await redisService.set(cacheKey, research, 1800); // Cache for 30 minutes

      return research;
    } catch (error) {
      logger.error('Error getting fund research:', error);
      throw error;
    }
  }

  async createResearchNote(userId, noteData) {
    try {
      const {
        fund_id,
        title,
        content,
        rating,
        tags,
        is_private
      } = noteData;

      const noteId = nanoid();
      const note = {
        id: noteId,
        user_id: userId,
        fund_id,
        title,
        content,
        rating,
        tags: tags || [],
        is_private: is_private !== false,
        created_at: new Date()
      };

      await pool.query(`
        INSERT INTO fund_research_notes (
          id, user_id, fund_id, title, content, rating, tags, is_private, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        note.id,
        note.user_id,
        note.fund_id,
        note.title,
        note.content,
        note.rating,
        JSON.stringify(note.tags),
        note.is_private,
        note.created_at
      ]);

      // Cache the note
      this.researchNotes.set(noteId, note);

      // Clear fund research cache
      await redisService.del(`fund_research:${fund_id}`);

      // Emit event
      this.emit('researchNoteCreated', note);

      logger.info(`Research note created: ${noteId} for fund ${fund_id}`);

      return note;
    } catch (error) {
      logger.error('Error creating research note:', error);
      throw error;
    }
  }

  async updateResearchNote(noteId, userId, updateData) {
    try {
      // Check if note exists and belongs to user
      const existingNote = await pool.query(`
        SELECT * FROM fund_research_notes
        WHERE id = $1 AND user_id = $2
      `, [noteId, userId]);

      if (existingNote.rows.length === 0) {
        throw new Error('Research note not found');
      }

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          if (key === 'tags') {
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
      values.push(noteId);
      paramCount++;
      values.push(userId);

      const query = `
        UPDATE fund_research_notes
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      const updatedNote = result.rows[0];

      // Update cache
      this.researchNotes.set(noteId, updatedNote);

      // Clear fund research cache
      await redisService.del(`fund_research:${updatedNote.fund_id}`);

      // Emit event
      this.emit('researchNoteUpdated', updatedNote);

      logger.info(`Research note updated: ${noteId}`);

      return updatedNote;
    } catch (error) {
      logger.error('Error updating research note:', error);
      throw error;
    }
  }

  async deleteResearchNote(noteId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM fund_research_notes
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [noteId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Research note not found');
      }

      const deletedNote = result.rows[0];

      // Remove from cache
      this.researchNotes.delete(noteId);

      // Clear fund research cache
      await redisService.del(`fund_research:${deletedNote.fund_id}`);

      // Emit event
      this.emit('researchNoteDeleted', deletedNote);

      logger.info(`Research note deleted: ${noteId}`);

      return deletedNote;
    } catch (error) {
      logger.error('Error deleting research note:', error);
      throw error;
    }
  }

  async getResearchNotes(filters = {}) {
    try {
      const {
        fund_id = null,
        user_id = null,
        is_private = null,
        rating = null,
        tags = null,
        page = 1,
        limit = 20
      } = filters;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (fund_id) {
        paramCount++;
        whereConditions.push(`frn.fund_id = $${paramCount}`);
        queryParams.push(fund_id);
      }

      if (user_id) {
        paramCount++;
        whereConditions.push(`frn.user_id = $${paramCount}`);
        queryParams.push(user_id);
      }

      if (is_private !== null) {
        paramCount++;
        whereConditions.push(`frn.is_private = $${paramCount}`);
        queryParams.push(is_private);
      }

      if (rating) {
        paramCount++;
        whereConditions.push(`frn.rating = $${paramCount}`);
        queryParams.push(rating);
      }

      if (tags && tags.length > 0) {
        paramCount++;
        whereConditions.push(`frn.tags && $${paramCount}`);
        queryParams.push(JSON.stringify(tags));
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          frn.*,
          mf.symbol,
          mf.name as fund_name,
          u.email as user_email
        FROM fund_research_notes frn
        JOIN mutual_funds mf ON frn.fund_id = mf.id
        LEFT JOIN users u ON frn.user_id = u.id
        ${whereClause}
        ORDER BY frn.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_research_notes frn
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        notes: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting research notes:', error);
      throw error;
    }
  }

  async createFundComparison(userId, comparisonData) {
    try {
      const {
        name,
        fund_ids,
        comparison_criteria
      } = comparisonData;

      const comparisonId = nanoid();
      const comparison = {
        id: comparisonId,
        user_id: userId,
        name,
        fund_ids,
        comparison_criteria,
        created_at: new Date()
      };

      await pool.query(`
        INSERT INTO fund_comparisons (
          id, user_id, name, fund_ids, comparison_criteria, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        comparison.id,
        comparison.user_id,
        comparison.name,
        JSON.stringify(comparison.fund_ids),
        JSON.stringify(comparison.comparison_criteria),
        comparison.created_at
      ]);

      // Cache the comparison
      this.comparisons.set(comparisonId, comparison);

      // Emit event
      this.emit('fundComparisonCreated', comparison);

      logger.info(`Fund comparison created: ${comparisonId}`);

      return comparison;
    } catch (error) {
      logger.error('Error creating fund comparison:', error);
      throw error;
    }
  }

  async getFundComparison(comparisonId, userId) {
    try {
      const result = await pool.query(`
        SELECT 
          fc.*,
          mf.id as fund_id,
          mf.symbol,
          mf.name as fund_name,
          ff.name as family_name,
          fp.nav,
          fp.total_return_1y,
          fp.total_return_3y,
          fp.total_return_5y,
          fp.sharpe_ratio,
          fp.alpha,
          fp.beta,
          fp.standard_deviation
        FROM fund_comparisons fc
        CROSS JOIN UNNEST(fc.fund_ids) AS fund_id
        JOIN mutual_funds mf ON mf.id = fund_id::uuid
        LEFT JOIN fund_families ff ON mf.fund_family_id = ff.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE fc.id = $1 AND fc.user_id = $2
        ORDER BY mf.name
      `, [comparisonId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Fund comparison not found');
      }

      // Group funds by comparison
      const comparison = result.rows[0];
      const funds = result.rows.map(row => ({
        id: row.fund_id,
        symbol: row.symbol,
        name: row.fund_name,
        family_name: row.family_name,
        nav: row.nav,
        total_return_1y: row.total_return_1y,
        total_return_3y: row.total_return_3y,
        total_return_5y: row.total_return_5y,
        sharpe_ratio: row.sharpe_ratio,
        alpha: row.alpha,
        beta: row.beta,
        standard_deviation: row.standard_deviation
      }));

      return {
        id: comparison.id,
        name: comparison.name,
        fund_ids: comparison.fund_ids,
        comparison_criteria: comparison.comparison_criteria,
        funds,
        created_at: comparison.created_at
      };
    } catch (error) {
      logger.error('Error getting fund comparison:', error);
      throw error;
    }
  }

  calculateSectorAllocation(holdings) {
    try {
      const sectorMap = new Map();
      let totalValue = 0;

      holdings.forEach(holding => {
        if (holding.sector && holding.market_value) {
          const sector = holding.sector;
          const value = parseFloat(holding.market_value);
          
          if (sectorMap.has(sector)) {
            sectorMap.set(sector, sectorMap.get(sector) + value);
          } else {
            sectorMap.set(sector, value);
          }
          
          totalValue += value;
        }
      });

      const allocation = [];
      sectorMap.forEach((value, sector) => {
        allocation.push({
          sector,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
        });
      });

      return allocation.sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
      logger.error('Error calculating sector allocation:', error);
      return [];
    }
  }

  calculateGeographicAllocation(holdings) {
    try {
      const countryMap = new Map();
      let totalValue = 0;

      holdings.forEach(holding => {
        if (holding.country && holding.market_value) {
          const country = holding.country;
          const value = parseFloat(holding.market_value);
          
          if (countryMap.has(country)) {
            countryMap.set(country, countryMap.get(country) + value);
          } else {
            countryMap.set(country, value);
          }
          
          totalValue += value;
        }
      });

      const allocation = [];
      countryMap.forEach((value, country) => {
        allocation.push({
          country,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
        });
      });

      return allocation.sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
      logger.error('Error calculating geographic allocation:', error);
      return [];
    }
  }

  calculateRiskMetrics(performance) {
    try {
      const metrics = {
        sharpe_ratio: performance.sharpe_ratio || 0,
        alpha: performance.alpha || 0,
        beta: performance.beta || 0,
        r_squared: performance.r_squared || 0,
        standard_deviation: performance.standard_deviation || 0,
        risk_level: 'medium'
      };

      // Determine risk level based on standard deviation
      if (metrics.standard_deviation < 10) {
        metrics.risk_level = 'low';
      } else if (metrics.standard_deviation > 20) {
        metrics.risk_level = 'high';
      }

      return metrics;
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      return {
        sharpe_ratio: 0,
        alpha: 0,
        beta: 0,
        r_squared: 0,
        standard_deviation: 0,
        risk_level: 'medium'
      };
    }
  }

  async getCategoryComparison(fundId, categoryId) {
    try {
      const result = await pool.query(`
        SELECT 
          AVG(fp.total_return_1y) as avg_return_1y,
          AVG(fp.total_return_3y) as avg_return_3y,
          AVG(fp.total_return_5y) as avg_return_5y,
          AVG(fp.sharpe_ratio) as avg_sharpe_ratio,
          AVG(fp.alpha) as avg_alpha,
          AVG(fp.beta) as avg_beta,
          AVG(fp.standard_deviation) as avg_standard_deviation,
          AVG(mf.expense_ratio) as avg_expense_ratio
        FROM mutual_funds mf
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE mf.category_id = $1 AND mf.is_active = true
      `, [categoryId]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting category comparison:', error);
      return {};
    }
  }

  async getFamilyComparison(fundId, familyId) {
    try {
      const result = await pool.query(`
        SELECT 
          AVG(fp.total_return_1y) as avg_return_1y,
          AVG(fp.total_return_3y) as avg_return_3y,
          AVG(fp.total_return_5y) as avg_return_5y,
          AVG(fp.sharpe_ratio) as avg_sharpe_ratio,
          AVG(fp.alpha) as avg_alpha,
          AVG(fp.beta) as avg_beta,
          AVG(fp.standard_deviation) as avg_standard_deviation,
          AVG(mf.expense_ratio) as avg_expense_ratio
        FROM mutual_funds mf
        LEFT JOIN LATERAL (
          SELECT *
          FROM fund_performance fp
          WHERE fp.fund_id = mf.id
          ORDER BY fp.date DESC
          LIMIT 1
        ) fp ON true
        WHERE mf.fund_family_id = $1 AND mf.is_active = true
      `, [familyId]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting family comparison:', error);
      return {};
    }
  }
}

module.exports = FundResearchService;
