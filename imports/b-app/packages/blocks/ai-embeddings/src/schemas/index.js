/**
 * Joi schemas for AI Embeddings block
 */

const Joi = require('joi');

// Input schemas
const GenerateEmbeddingInput = Joi.object({
  text: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).required(),
  model: Joi.string().optional(),
  traceId: Joi.string().optional()
});

const BatchGenerateEmbeddingsInput = Joi.object({
  texts: Joi.array().items(Joi.string()).min(1).max(100).required(),
  model: Joi.string().optional(),
  traceId: Joi.string().optional()
});

const ListEmbeddingModelsInput = Joi.object({
  traceId: Joi.string().optional()
});

// Output schemas
const EmbeddingResult = Joi.object({
  embeddings: Joi.array().items(Joi.array().items(Joi.number())).required(),
  model: Joi.string().required(),
  dimensions: Joi.number().required(),
  texts: Joi.array().items(Joi.string()).required()
});

const ModelInfo = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  dimensions: Joi.number().required()
});

const ModelsResult = Joi.object({
  models: Joi.array().items(ModelInfo).required()
});

module.exports = {
  GenerateEmbeddingInput,
  BatchGenerateEmbeddingsInput,
  ListEmbeddingModelsInput,
  EmbeddingResult,
  ModelInfo,
  ModelsResult
};