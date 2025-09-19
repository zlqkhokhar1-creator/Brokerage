const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }
    next();
  };
};

const taxOptimizationSchema = Joi.object({
  portfolio: Joi.object({
    positions: Joi.array().items(Joi.object({
      symbol: Joi.string().required(),
      currentValue: Joi.number().positive().required(),
      costBasis: Joi.number().positive().required(),
      holdingPeriod: Joi.number().integer().min(0).required(),
      dividendYield: Joi.number().min(0).required(),
      assetType: Joi.string().valid('stocks', 'bonds', 'etfs', 'mutual_funds').required(),
      accountType: Joi.string().valid('taxable', 'ira', 'roth_ira', '401k').required()
    })).required(),
    totalValue: Joi.number().positive().required()
  }).required(),
  preferences: Joi.object({
    riskTolerance: Joi.string().valid('conservative', 'moderate', 'aggressive').optional(),
    timeHorizon: Joi.number().integer().min(1).optional(),
    taxBracket: Joi.number().min(0).max(1).optional()
  }).optional(),
  constraints: Joi.object({
    maxTrades: Joi.number().integer().min(0).optional(),
    maxTaxSavings: Joi.number().positive().optional(),
    minHoldingPeriod: Joi.number().integer().min(0).optional()
  }).optional()
});

const taxLossHarvestingSchema = Joi.object({
  portfolio: Joi.object({
    positions: Joi.array().items(Joi.object({
      symbol: Joi.string().required(),
      currentValue: Joi.number().positive().required(),
      costBasis: Joi.number().positive().required(),
      holdingPeriod: Joi.number().integer().min(0).required()
    })).required()
  }).required(),
  preferences: Joi.object({
    minLossThreshold: Joi.number().positive().optional(),
    maxHarvestAmount: Joi.number().positive().optional(),
    washSalePeriod: Joi.number().integer().min(1).max(60).optional()
  }).optional(),
  constraints: Joi.object({
    maxTrades: Joi.number().integer().min(0).optional(),
    maxTaxSavings: Joi.number().positive().optional()
  }).optional()
});

module.exports = {
  validateRequest,
  taxOptimizationSchema,
  taxLossHarvestingSchema
};

