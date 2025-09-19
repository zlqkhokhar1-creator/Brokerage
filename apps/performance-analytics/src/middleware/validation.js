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

const performanceAnalysisSchema = Joi.object({
  portfolio: Joi.object({
    positions: Joi.array().items(Joi.object({
      symbol: Joi.string().required(),
      currentValue: Joi.number().positive().required(),
      costBasis: Joi.number().positive().required(),
      weight: Joi.number().min(0).max(1).required()
    })).required(),
    totalValue: Joi.number().positive().required()
  }).required(),
  benchmark: Joi.string().optional(),
  period: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required()
  }).optional(),
  metrics: Joi.array().items(Joi.string()).optional()
});

const benchmarkComparisonSchema = Joi.object({
  portfolio: Joi.object({
    positions: Joi.array().items(Joi.object({
      symbol: Joi.string().required(),
      currentValue: Joi.number().positive().required(),
      costBasis: Joi.number().positive().required(),
      weight: Joi.number().min(0).max(1).required()
    })).required(),
    totalValue: Joi.number().positive().required()
  }).required(),
  benchmark: Joi.string().required(),
  period: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required()
  }).optional(),
  metrics: Joi.array().items(Joi.string()).optional()
});

module.exports = {
  validateRequest,
  performanceAnalysisSchema,
  benchmarkComparisonSchema
};

