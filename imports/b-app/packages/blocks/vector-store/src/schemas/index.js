/**
 * Joi schemas for Vector Store block
 */

const Joi = require('joi');

// Input schemas
const UpsertVectorInput = Joi.object({
  id: Joi.string().required(),
  embedding: Joi.array().items(Joi.number()).required(),
  metadata: Joi.object().default({}),
  traceId: Joi.string().optional()
});

const QuerySimilarInput = Joi.object({
  embedding: Joi.array().items(Joi.number()).required(),
  topK: Joi.number().integer().min(1).max(100).default(10),
  filter: Joi.object().optional(),
  traceId: Joi.string().optional()
});

const DeleteVectorInput = Joi.object({
  id: Joi.string().required(),
  traceId: Joi.string().optional()
});

// Output schemas
const UpsertResult = Joi.object({
  id: Joi.string().required(),
  success: Joi.boolean().required()
});

const QueryResult = Joi.object({
  results: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    score: Joi.number().required(),
    metadata: Joi.object().required()
  })).required(),
  queryTime: Joi.number().optional()
});

const DeleteResult = Joi.object({
  id: Joi.string().required(),
  deleted: Joi.boolean().required()
});

module.exports = {
  UpsertVectorInput,
  QuerySimilarInput, 
  DeleteVectorInput,
  UpsertResult,
  QueryResult,
  DeleteResult
};