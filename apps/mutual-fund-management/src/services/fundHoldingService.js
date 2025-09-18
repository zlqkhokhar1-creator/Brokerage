const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const redisService = require('../utils/redis');

class FundHoldingService extends EventEmitter {
  constructor() {
    super();
    this.holdings = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await redisService.healthCheck();
      
      this._initialized = true;
      logger.info('FundHoldingService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FundHoldingService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('FundHoldingService closed');
    } catch (error) {
      logger.error('Error closing FundHoldingService:', error);
    }
  }

  async getFundHoldings(fundId, options = {}) {
    try {
      const {
        asOfDate = null,
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `fund_holdings:${fundId}:${asOfDate || 'latest'}`;
      const cachedHoldings = await redisService.get(cacheKey);
      if (cachedHoldings) {
        return cachedHoldings;
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = ['fh.fund_id = $1'];
      let queryParams = [fundId];
      let paramCount = 1;

      if (asOfDate) {
        paramCount++;
        whereConditions.push(`fh.as_of_date = $${paramCount}`);
        queryParams.push(asOfDate);
      } else {
        // Get latest holdings
        whereConditions.push(`fh.as_of_date = (SELECT MAX(as_of_date) FROM fund_holdings WHERE fund_id = $1)`);
      }

      const query = `
        SELECT 
          fh.*,
          mf.symbol as fund_symbol,
          mf.name as fund_name
        FROM fund_holdings fh
        JOIN mutual_funds mf ON fh.fund_id = mf.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY fh.percentage_of_fund DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM fund_holdings fh
        WHERE ${whereConditions.join(' AND ')}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Calculate holdings analytics
      const analytics = this.calculateHoldingsAnalytics(result.rows);

      const holdings = {
        holdings: result.rows,
        analytics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisService.set(cacheKey, holdings, 3600); // Cache for 1 hour

      return holdings;
    } catch (error) {
      logger.error('Error getting fund holdings:', error);
      throw error;
    }
  }

  async getUserFundHoldings(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'current_value',
        sortOrder = 'desc'
      } = options;

      // Check cache first
      const cacheKey = `user_holdings:${userId}:${sortBy}:${sortOrder}`;
      const cachedHoldings = await redisService.get(cacheKey);
      if (cachedHoldings) {
        return cachedHoldings;
      }

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
      } else if (sortBy === 'percentage_of_portfolio') {
        orderBy = `(uh.current_value / (SELECT SUM(current_value) FROM user_fund_holdings WHERE user_id = $1)) ${sortOrder.toUpperCase()}`;
      }

      const query = `
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
          END as unrealized_gain_loss_percentage,
          CASE 
            WHEN (SELECT SUM(current_value) FROM user_fund_holdings WHERE user_id = $1) > 0 THEN
              (uh.current_value / (SELECT SUM(current_value) FROM user_fund_holdings WHERE user_id = $1)) * 100
            ELSE 0
          END as percentage_of_portfolio
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
      `;

      const result = await pool.query(query, [userId, limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM user_fund_holdings uh
        WHERE uh.user_id = $1
      `, [userId]);

      const total = parseInt(countResult.rows[0].total);

      // Calculate portfolio analytics
      const analytics = this.calculatePortfolioAnalytics(result.rows);

      const holdings = {
        holdings: result.rows,
        analytics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisService.set(cacheKey, holdings, 1800); // Cache for 30 minutes

      return holdings;
    } catch (error) {
      logger.error('Error getting user fund holdings:', error);
      throw error;
    }
  }

  async updateFundHoldings(fundId, holdingsData) {
    try {
      const {
        as_of_date,
        holdings
      } = holdingsData;

      // Start transaction
      await pool.query('BEGIN');

      try {
        // Delete existing holdings for this date
        await pool.query(`
          DELETE FROM fund_holdings
          WHERE fund_id = $1 AND as_of_date = $2
        `, [fundId, as_of_date]);

        // Insert new holdings
        for (const holding of holdings) {
          await pool.query(`
            INSERT INTO fund_holdings (
              fund_id, holding_symbol, holding_name, sector, industry, country,
              market_value, shares_held, percentage_of_fund, cost_basis,
              unrealized_gain_loss, as_of_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            fundId,
            holding.holding_symbol,
            holding.holding_name,
            holding.sector,
            holding.industry,
            holding.country,
            holding.market_value,
            holding.shares_held,
            holding.percentage_of_fund,
            holding.cost_basis,
            holding.unrealized_gain_loss,
            as_of_date
          ]);
        }

        // Commit transaction
        await pool.query('COMMIT');

        // Clear cache
        await this.clearHoldingsCache(fundId);

        // Emit event
        this.emit('fundHoldingsUpdated', { fundId, as_of_date, holdings_count: holdings.length });

        logger.info(`Fund holdings updated: ${fundId} for ${as_of_date}`);

        return true;
      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error updating fund holdings:', error);
      throw error;
    }
  }

  async getHoldingsOverlap(userId, fundId) {
    try {
      // Get user's current holdings
      const userHoldings = await this.getUserFundHoldings(userId);
      
      // Get fund's holdings
      const fundHoldings = await this.getFundHoldings(fundId);
      
      // Find overlapping holdings
      const overlap = [];
      
      for (const userHolding of userHoldings.holdings) {
        for (const fundHolding of fundHoldings.holdings) {
          if (userHolding.symbol === fundHolding.holding_symbol) {
            overlap.push({
              symbol: userHolding.symbol,
              name: userHolding.name,
              user_percentage: userHolding.percentage_of_portfolio,
              fund_percentage: fundHolding.percentage_of_fund,
              overlap_risk: Math.min(userHolding.percentage_of_portfolio, fundHolding.percentage_of_fund)
            });
          }
        }
      }

      // Sort by overlap risk
      overlap.sort((a, b) => b.overlap_risk - a.overlap_risk);

      return {
        fund_id: fundId,
        overlap,
        total_overlap_risk: overlap.reduce((sum, o) => sum + o.overlap_risk, 0),
        overlap_count: overlap.length
      };
    } catch (error) {
      logger.error('Error getting holdings overlap:', error);
      throw error;
    }
  }

  async getSectorAllocation(userId) {
    try {
      const userHoldings = await this.getUserFundHoldings(userId);
      
      // Calculate sector allocation across all holdings
      const sectorMap = new Map();
      let totalValue = 0;

      for (const holding of userHoldings.holdings) {
        // Get fund's sector allocation
        const fundHoldings = await this.getFundHoldings(holding.fund_id);
        
        for (const fundHolding of fundHoldings.holdings) {
          if (fundHolding.sector) {
            const sectorValue = (fundHolding.percentage_of_fund / 100) * holding.current_value;
            
            if (sectorMap.has(fundHolding.sector)) {
              sectorMap.set(fundHolding.sector, sectorMap.get(fundHolding.sector) + sectorValue);
            } else {
              sectorMap.set(fundHolding.sector, sectorValue);
            }
            
            totalValue += sectorValue;
          }
        }
      }

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
      logger.error('Error getting sector allocation:', error);
      throw error;
    }
  }

  async getGeographicAllocation(userId) {
    try {
      const userHoldings = await this.getUserFundHoldings(userId);
      
      // Calculate geographic allocation across all holdings
      const countryMap = new Map();
      let totalValue = 0;

      for (const holding of userHoldings.holdings) {
        // Get fund's geographic allocation
        const fundHoldings = await this.getFundHoldings(holding.fund_id);
        
        for (const fundHolding of fundHoldings.holdings) {
          if (fundHolding.country) {
            const countryValue = (fundHolding.percentage_of_fund / 100) * holding.current_value;
            
            if (countryMap.has(fundHolding.country)) {
              countryMap.set(fundHolding.country, countryMap.get(fundHolding.country) + countryValue);
            } else {
              countryMap.set(fundHolding.country, countryValue);
            }
            
            totalValue += countryValue;
          }
        }
      }

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
      logger.error('Error getting geographic allocation:', error);
      throw error;
    }
  }

  async getTopHoldings(userId, limit = 20) {
    try {
      const userHoldings = await this.getUserFundHoldings(userId);
      
      // Get top holdings across all funds
      const holdingMap = new Map();
      let totalValue = 0;

      for (const holding of userHoldings.holdings) {
        // Get fund's holdings
        const fundHoldings = await this.getFundHoldings(holding.fund_id);
        
        for (const fundHolding of fundHoldings.holdings) {
          if (fundHolding.holding_symbol) {
            const holdingValue = (fundHolding.percentage_of_fund / 100) * holding.current_value;
            
            if (holdingMap.has(fundHolding.holding_symbol)) {
              const existing = holdingMap.get(fundHolding.holding_symbol);
              existing.value += holdingValue;
              existing.percentage += (fundHolding.percentage_of_fund / 100) * holding.percentage_of_portfolio;
            } else {
              holdingMap.set(fundHolding.holding_symbol, {
                symbol: fundHolding.holding_symbol,
                name: fundHolding.holding_name,
                sector: fundHolding.sector,
                country: fundHolding.country,
                value: holdingValue,
                percentage: (fundHolding.percentage_of_fund / 100) * holding.percentage_of_portfolio
              });
            }
            
            totalValue += holdingValue;
          }
        }
      }

      const topHoldings = Array.from(holdingMap.values())
        .map(holding => ({
          ...holding,
          percentage: totalValue > 0 ? (holding.value / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);

      return topHoldings;
    } catch (error) {
      logger.error('Error getting top holdings:', error);
      throw error;
    }
  }

  calculateHoldingsAnalytics(holdings) {
    try {
      const analytics = {
        total_holdings: holdings.length,
        total_value: 0,
        sector_count: 0,
        country_count: 0,
        top_sector: null,
        top_country: null,
        concentration_risk: 0
      };

      if (holdings.length === 0) {
        return analytics;
      }

      const sectorMap = new Map();
      const countryMap = new Map();
      let totalValue = 0;

      holdings.forEach(holding => {
        totalValue += parseFloat(holding.market_value || 0);

        if (holding.sector) {
          sectorMap.set(holding.sector, (sectorMap.get(holding.sector) || 0) + parseFloat(holding.market_value || 0));
        }

        if (holding.country) {
          countryMap.set(holding.country, (countryMap.get(holding.country) || 0) + parseFloat(holding.market_value || 0));
        }
      });

      analytics.total_value = totalValue;
      analytics.sector_count = sectorMap.size;
      analytics.country_count = countryMap.size;

      // Find top sector
      let maxSectorValue = 0;
      sectorMap.forEach((value, sector) => {
        if (value > maxSectorValue) {
          maxSectorValue = value;
          analytics.top_sector = {
            sector,
            value,
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
          };
        }
      });

      // Find top country
      let maxCountryValue = 0;
      countryMap.forEach((value, country) => {
        if (value > maxCountryValue) {
          maxCountryValue = value;
          analytics.top_country = {
            country,
            value,
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
          };
        }
      });

      // Calculate concentration risk (sum of top 10 holdings percentage)
      const topHoldings = holdings
        .sort((a, b) => parseFloat(b.percentage_of_fund || 0) - parseFloat(a.percentage_of_fund || 0))
        .slice(0, 10);
      
      analytics.concentration_risk = topHoldings.reduce((sum, holding) => 
        sum + parseFloat(holding.percentage_of_fund || 0), 0
      );

      return analytics;
    } catch (error) {
      logger.error('Error calculating holdings analytics:', error);
      return {
        total_holdings: 0,
        total_value: 0,
        sector_count: 0,
        country_count: 0,
        top_sector: null,
        top_country: null,
        concentration_risk: 0
      };
    }
  }

  calculatePortfolioAnalytics(holdings) {
    try {
      const analytics = {
        total_value: 0,
        total_cost_basis: 0,
        total_unrealized_gain_loss: 0,
        total_unrealized_gain_loss_percentage: 0,
        fund_count: holdings.length,
        family_count: 0,
        category_count: 0,
        diversification_score: 0
      };

      if (holdings.length === 0) {
        return analytics;
      }

      const familySet = new Set();
      const categorySet = new Set();
      let totalValue = 0;
      let totalCostBasis = 0;

      holdings.forEach(holding => {
        totalValue += parseFloat(holding.current_value || 0);
        totalCostBasis += parseFloat(holding.total_cost_basis || 0);

        if (holding.family_name) {
          familySet.add(holding.family_name);
        }

        if (holding.category_name) {
          categorySet.add(holding.category_name);
        }
      });

      analytics.total_value = totalValue;
      analytics.total_cost_basis = totalCostBasis;
      analytics.total_unrealized_gain_loss = totalValue - totalCostBasis;
      analytics.total_unrealized_gain_loss_percentage = totalCostBasis > 0 ? 
        ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0;
      analytics.family_count = familySet.size;
      analytics.category_count = categorySet.size;

      // Calculate diversification score (0-100)
      const maxPossibleDiversification = Math.min(holdings.length, 10); // Cap at 10 for scoring
      analytics.diversification_score = Math.min(
        (analytics.family_count * 10) + (analytics.category_count * 5) + (holdings.length * 2),
        100
      );

      return analytics;
    } catch (error) {
      logger.error('Error calculating portfolio analytics:', error);
      return {
        total_value: 0,
        total_cost_basis: 0,
        total_unrealized_gain_loss: 0,
        total_unrealized_gain_loss_percentage: 0,
        fund_count: 0,
        family_count: 0,
        category_count: 0,
        diversification_score: 0
      };
    }
  }

  async clearHoldingsCache(fundId) {
    try {
      const pattern = `fund_holdings:${fundId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing holdings cache:', error);
    }
  }

  async clearUserHoldingsCache(userId) {
    try {
      const pattern = `user_holdings:${userId}:*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisService.del(key)));
      }
    } catch (error) {
      logger.error('Error clearing user holdings cache:', error);
    }
  }
}

module.exports = FundHoldingService;
