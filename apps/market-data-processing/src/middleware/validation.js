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

const marketDataSchema = Joi.object({
  symbol: Joi.string().required(),
  dataType: Joi.string().valid('price', 'volume', 'ohlc', 'tick', 'orderbook').optional(),
  rawData: Joi.array().items(Joi.object({
    timestamp: Joi.date().required(),
    price: Joi.number().positive().optional(),
    volume: Joi.number().integer().min(0).optional(),
    open: Joi.number().positive().optional(),
    high: Joi.number().positive().optional(),
    low: Joi.number().positive().optional(),
    close: Joi.number().positive().optional(),
    bid: Joi.number().positive().optional(),
    ask: Joi.number().positive().optional(),
    side: Joi.string().valid('buy', 'sell').optional(),
    tradeId: Joi.string().optional()
  })).required(),
  processingOptions: Joi.object({
    threshold: Joi.number().positive().optional(),
    maxLatency: Joi.number().positive().optional(),
    batchSize: Joi.number().integer().min(1).optional()
  }).optional()
});

const technicalIndicatorSchema = Joi.object({
  symbol: Joi.string().required(),
  dataType: Joi.string().valid('price', 'ohlc').optional(),
  marketData: Joi.array().items(Joi.object({
    timestamp: Joi.date().required(),
    open: Joi.number().positive().optional(),
    high: Joi.number().positive().optional(),
    low: Joi.number().positive().optional(),
    close: Joi.number().positive().required(),
    volume: Joi.number().integer().min(0).optional()
  })).required(),
  indicators: Joi.array().items(Joi.string()).optional(),
  parameters: Joi.object().optional()
});

module.exports = {
  validateRequest,
  marketDataSchema,
  technicalIndicatorSchema
};