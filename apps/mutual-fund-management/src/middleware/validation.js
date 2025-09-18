const Joi = require('joi');
const { logger } = require('../utils/logger');

// Common validation schemas
const commonSchemas = {
  id: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  fundId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  date: Joi.date().iso().required(),
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  status: Joi.string().valid('PENDING', 'EXECUTED', 'CANCELLED', 'FAILED').required(),
  tradeType: Joi.string().valid('BUY', 'SELL').required(),
  alertType: Joi.string().valid('price', 'performance', 'news', 'dividend', 'expense_ratio').required(),
  operator: Joi.string().valid('>=', '<=', '>', '<', '=', '!=').required()
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', {
          path: req.path,
          method: req.method,
          errors: errorDetails
        });

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errorDetails
        });
      }

      // Replace the request property with the validated and sanitized value
      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

// Fund Catalog validation schemas
const fundCatalogSchemas = {
  getFunds: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255),
    category: Joi.string().uuid(),
    family: Joi.string().uuid(),
    minExpenseRatio: Joi.number().min(0).max(10),
    maxExpenseRatio: Joi.number().min(0).max(10),
    minAssets: Joi.number().min(0),
    maxAssets: Joi.number().min(0),
    isActive: Joi.boolean(),
    isTradeable: Joi.boolean(),
    sortBy: Joi.string().valid('name', 'symbol', 'expense_ratio', 'assets', 'performance_1y', 'performance_3y', 'performance_5y').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  getFund: Joi.object({
    fundId: commonSchemas.fundId
  }),

  createFund: Joi.object({
    symbol: Joi.string().max(20).required(),
    name: Joi.string().max(255).required(),
    fund_family_id: Joi.string().uuid().required(),
    category_id: Joi.string().uuid().required(),
    subcategory_id: Joi.string().uuid().optional(),
    investment_objective: Joi.string().max(1000),
    investment_strategy: Joi.string().max(1000),
    inception_date: commonSchemas.date,
    expense_ratio: Joi.number().min(0).max(10),
    management_fee: Joi.number().min(0).max(10),
    other_expenses: Joi.number().min(0).max(10),
    minimum_investment: commonSchemas.nonNegativeNumber,
    minimum_additional_investment: commonSchemas.nonNegativeNumber,
    redemption_fee: Joi.number().min(0).max(10),
    load_type: Joi.string().max(50),
    front_load: Joi.number().min(0).max(10),
    back_load: Joi.number().min(0).max(10),
    deferred_load: Joi.number().min(0).max(10),
    redemption_fee_period: Joi.number().integer().min(0),
    management_company: Joi.string().max(255),
    portfolio_manager: Joi.string().max(255),
    fund_manager_tenure: Joi.number().integer().min(0),
    is_etf: Joi.boolean().default(false),
    is_index_fund: Joi.boolean().default(false),
    is_sector_fund: Joi.boolean().default(false),
    is_international: Joi.boolean().default(false),
    is_bond_fund: Joi.boolean().default(false),
    is_equity_fund: Joi.boolean().default(false),
    is_balanced_fund: Joi.boolean().default(false),
    is_money_market: Joi.boolean().default(false),
    is_target_date: Joi.boolean().default(false),
    target_date: commonSchemas.date.optional()
  }),

  updateFund: Joi.object({
    name: Joi.string().max(255),
    investment_objective: Joi.string().max(1000),
    investment_strategy: Joi.string().max(1000),
    expense_ratio: Joi.number().min(0).max(10),
    management_fee: Joi.number().min(0).max(10),
    other_expenses: Joi.number().min(0).max(10),
    minimum_investment: commonSchemas.nonNegativeNumber,
    minimum_additional_investment: commonSchemas.nonNegativeNumber,
    redemption_fee: Joi.number().min(0).max(10),
    load_type: Joi.string().max(50),
    front_load: Joi.number().min(0).max(10),
    back_load: Joi.number().min(0).max(10),
    deferred_load: Joi.number().min(0).max(10),
    redemption_fee_period: Joi.number().integer().min(0),
    management_company: Joi.string().max(255),
    portfolio_manager: Joi.string().max(255),
    fund_manager_tenure: Joi.number().integer().min(0),
    is_active: Joi.boolean(),
    is_tradeable: Joi.boolean()
  })
};

// Fund Trading validation schemas
const fundTradingSchemas = {
  executeTrade: Joi.object({
    fund_id: commonSchemas.fundId,
    trade_type: commonSchemas.tradeType,
    shares: commonSchemas.positiveNumber,
    price_per_share: commonSchemas.positiveNumber,
    trade_date: commonSchemas.date,
    notes: Joi.string().max(500)
  }),

  getTrades: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    fund_id: Joi.string().uuid(),
    trade_type: commonSchemas.tradeType,
    status: commonSchemas.status,
    start_date: commonSchemas.date,
    end_date: commonSchemas.date,
    sortBy: Joi.string().valid('trade_date', 'created_at', 'total_amount').default('trade_date'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  getTrade: Joi.object({
    tradeId: commonSchemas.id
  }),

  cancelTrade: Joi.object({
    tradeId: commonSchemas.id
  })
};

// Fund Research validation schemas
const fundResearchSchemas = {
  getFundResearch: Joi.object({
    fundId: commonSchemas.fundId
  }),

  createResearchNote: Joi.object({
    fund_id: commonSchemas.fundId,
    title: Joi.string().max(255).required(),
    content: Joi.string().max(5000).required(),
    rating: Joi.number().integer().min(1).max(5),
    tags: Joi.array().items(Joi.string().max(50)),
    is_private: Joi.boolean().default(true)
  }),

  updateResearchNote: Joi.object({
    title: Joi.string().max(255),
    content: Joi.string().max(5000),
    rating: Joi.number().integer().min(1).max(5),
    tags: Joi.array().items(Joi.string().max(50)),
    is_private: Joi.boolean()
  }),

  getResearchNotes: Joi.object({
    fund_id: Joi.string().uuid(),
    user_id: commonSchemas.userId,
    is_private: Joi.boolean(),
    rating: Joi.number().integer().min(1).max(5),
    tags: Joi.array().items(Joi.string().max(50)),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Fund Screening validation schemas
const fundScreeningSchemas = {
  screenFunds: Joi.object({
    criteria: Joi.object({
      categories: Joi.array().items(Joi.string().uuid()),
      families: Joi.array().items(Joi.string().uuid()),
      min_expense_ratio: Joi.number().min(0).max(10),
      max_expense_ratio: Joi.number().min(0).max(10),
      min_assets: Joi.number().min(0),
      max_assets: Joi.number().min(0),
      min_performance_1y: Joi.number(),
      max_performance_1y: Joi.number(),
      min_performance_3y: Joi.number(),
      max_performance_3y: Joi.number(),
      min_performance_5y: Joi.number(),
      max_performance_5y: Joi.number(),
      min_sharpe_ratio: Joi.number(),
      max_sharpe_ratio: Joi.number(),
      min_alpha: Joi.number(),
      max_alpha: Joi.number(),
      min_beta: Joi.number(),
      max_beta: Joi.number(),
      is_etf: Joi.boolean(),
      is_index_fund: Joi.boolean(),
      is_sector_fund: Joi.boolean(),
      is_international: Joi.boolean(),
      is_bond_fund: Joi.boolean(),
      is_equity_fund: Joi.boolean(),
      is_balanced_fund: Joi.boolean(),
      is_money_market: Joi.boolean(),
      is_target_date: Joi.boolean(),
      is_active: Joi.boolean(),
      is_tradeable: Joi.boolean()
    }).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'symbol', 'expense_ratio', 'assets', 'performance_1y', 'performance_3y', 'performance_5y', 'sharpe_ratio').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  saveScreen: Joi.object({
    name: Joi.string().max(255).required(),
    criteria: Joi.object().required()
  }),

  getSavedScreens: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Fund Performance validation schemas
const fundPerformanceSchemas = {
  getFundPerformance: Joi.object({
    fundId: commonSchemas.fundId,
    startDate: commonSchemas.date,
    endDate: commonSchemas.date,
    period: Joi.string().valid('1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', '10y', 'ytd', 'since_inception').default('1y')
  }),

  getFundComparison: Joi.object({
    fundIds: Joi.array().items(commonSchemas.fundId).min(2).max(10).required(),
    period: Joi.string().valid('1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', '10y', 'ytd', 'since_inception').default('1y'),
    metrics: Joi.array().items(Joi.string().valid('total_return', 'volatility', 'sharpe_ratio', 'alpha', 'beta', 'r_squared', 'expense_ratio', 'assets')).default(['total_return', 'volatility', 'sharpe_ratio'])
  })
};

// Fund Holdings validation schemas
const fundHoldingsSchemas = {
  getFundHoldings: Joi.object({
    fundId: commonSchemas.fundId,
    asOfDate: commonSchemas.date,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  getUserFundHoldings: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'symbol', 'current_value', 'unrealized_gain_loss', 'percentage_of_portfolio').default('current_value'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Fund Tax validation schemas
const fundTaxSchemas = {
  getTaxLots: Joi.object({
    fund_id: Joi.string().uuid(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  calculateTaxHarvesting: Joi.object({
    fund_id: Joi.string().uuid(),
    target_loss: commonSchemas.positiveNumber,
    replacement_fund_id: Joi.string().uuid()
  })
};

// Fund Rebalancing validation schemas
const fundRebalancingSchemas = {
  createRebalancingPlan: Joi.object({
    name: Joi.string().max(255).required(),
    target_allocation: Joi.object().pattern(
      Joi.string().uuid(),
      Joi.number().min(0).max(100)
    ).required(),
    rebalancing_frequency: Joi.string().valid('monthly', 'quarterly', 'semi_annually', 'annually').default('quarterly'),
    threshold_percentage: Joi.number().min(0).max(50).default(5)
  }),

  updateRebalancingPlan: Joi.object({
    name: Joi.string().max(255),
    target_allocation: Joi.object().pattern(
      Joi.string().uuid(),
      Joi.number().min(0).max(100)
    ),
    rebalancing_frequency: Joi.string().valid('monthly', 'quarterly', 'semi_annually', 'annually'),
    threshold_percentage: Joi.number().min(0).max(50),
    is_active: Joi.boolean()
  }),

  executeRebalancing: Joi.object({
    planId: commonSchemas.id,
    dry_run: Joi.boolean().default(false)
  })
};

// Fund Analytics validation schemas
const fundAnalyticsSchemas = {
  getFundAnalytics: Joi.object({
    fundId: commonSchemas.fundId,
    period: Joi.string().valid('1m', '3m', '6m', '1y', '3y', '5y', '10y', 'all').default('1y')
  }),

  getPortfolioAnalytics: Joi.object({
    period: Joi.string().valid('1m', '3m', '6m', '1y', '3y', '5y', '10y', 'all').default('1y'),
    includeBenchmark: Joi.boolean().default(true),
    benchmarkId: Joi.string().uuid()
  })
};

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  dateRange: Joi.object({
    start_date: commonSchemas.date,
    end_date: commonSchemas.date
  }),

  statusFilter: Joi.object({
    status: commonSchemas.status
  })
};

// Export validation functions
module.exports = {
  validate,
  commonSchemas,
  fundCatalogSchemas,
  fundTradingSchemas,
  fundResearchSchemas,
  fundScreeningSchemas,
  fundPerformanceSchemas,
  fundHoldingsSchemas,
  fundTaxSchemas,
  fundRebalancingSchemas,
  fundAnalyticsSchemas,
  querySchemas
};
