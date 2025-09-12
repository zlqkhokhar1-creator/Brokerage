/**
 * Contract Schema Artifacts for Phase 4 Events
 * Defines event schemas for AI Embeddings, Vector Store, and Ledger Shadow blocks
 */

const Joi = require('joi');

// Base event schema
const BaseEvent = Joi.object({
  traceId: Joi.string().uuid().required(),
  timestamp: Joi.date().iso().default(() => new Date()),
  version: Joi.string().valid('v1').default('v1'),
  source: Joi.string().required(),
  correlationId: Joi.string().uuid().optional()
});

// AI Embeddings Events
const EmbeddingGeneratedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('embedding.generated.v1').required(),
  data: Joi.object({
    textCount: Joi.number().integer().min(1).required(),
    model: Joi.string().required(),
    dimensions: Joi.number().integer().min(1).required(),
    duration: Joi.number().optional(),
    textLengths: Joi.array().items(Joi.number().integer().min(0)).optional()
  }).required()
});

const EmbeddingBatchGeneratedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('embedding.batch_generated.v1').required(),
  data: Joi.object({
    textCount: Joi.number().integer().min(1).required(),
    model: Joi.string().required(),
    dimensions: Joi.number().integer().min(1).required(),
    duration: Joi.number().optional(),
    batchSize: Joi.number().integer().min(1).required()
  }).required()
});

const EmbeddingModelsListedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('embedding.models_listed.v1').required(),
  data: Joi.object({
    modelCount: Joi.number().integer().min(0).required(),
    provider: Joi.string().required(),
    duration: Joi.number().optional()
  }).required()
});

// Vector Store Events  
const VectorUpsertedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('vector.upserted.v1').required(),
  data: Joi.object({
    vectorId: Joi.string().required(),
    dimensions: Joi.number().integer().min(1).required(),
    duration: Joi.number().optional(),
    metadataKeys: Joi.array().items(Joi.string()).optional()
  }).required()
});

const VectorQueriedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('vector.queried.v1').required(),
  data: Joi.object({
    dimensions: Joi.number().integer().min(1).required(),
    topK: Joi.number().integer().min(1).required(),
    resultCount: Joi.number().integer().min(0).required(),
    queryTime: Joi.number().required(),
    filterApplied: Joi.boolean().default(false)
  }).required()
});

const VectorDeletedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('vector.deleted.v1').required(),
  data: Joi.object({
    vectorId: Joi.string().required(),
    deleted: Joi.boolean().required(),
    duration: Joi.number().optional()
  }).required()
});

// Ledger Shadow Events
const LedgerTransactionRecordedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('ledger.transaction.recorded.v1').required(),
  data: Joi.object({
    transactionId: Joi.string().uuid().required(),
    sourceEventType: Joi.string().required(),
    paymentId: Joi.string().required(),
    amountMinor: Joi.number().integer().required(),
    currency: Joi.string().length(3).required(),
    direction: Joi.string().valid('debit', 'credit').required(),
    entityType: Joi.string().valid('user', 'system', 'merchant').required(),
    entityId: Joi.string().required(),
    duration: Joi.number().optional(),
    balanceAfter: Joi.number().integer().optional()
  }).required()
});

const LedgerTransactionRetrievedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('ledger.transaction.retrieved.v1').required(),
  data: Joi.object({
    transactionId: Joi.string().uuid().required(),
    found: Joi.boolean().required(),
    duration: Joi.number().optional()
  }).required()
});

const LedgerTransactionsListedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('ledger.transactions.listed.v1').required(),
  data: Joi.object({
    entityId: Joi.string().required(),
    resultCount: Joi.number().integer().min(0).required(),
    totalCount: Joi.number().integer().min(0).required(),
    duration: Joi.number().optional(),
    hasMore: Joi.boolean().default(false)
  }).required()
});

const LedgerBalanceRetrievedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('ledger.balance.retrieved.v1').required(),
  data: Joi.object({
    entityId: Joi.string().required(),
    currency: Joi.string().length(3).required(),
    balanceMinor: Joi.number().integer().required(),
    duration: Joi.number().optional()
  }).required()
});

// Orchestration Events
const AIEmbedAndStoreCompletedEvent = BaseEvent.keys({
  eventType: Joi.string().valid('ai.embed_and_store.completed.v1').required(),
  data: Joi.object({
    vectorId: Joi.string().required(),
    textLength: Joi.number().integer().min(0).required(),
    model: Joi.string().required(),
    dimensions: Joi.number().integer().min(1).required(),
    success: Joi.boolean().required(),
    duration: Joi.number().optional()
  }).required()
});

// Event registry for validation
const EVENT_SCHEMAS = {
  'embedding.generated.v1': EmbeddingGeneratedEvent,
  'embedding.batch_generated.v1': EmbeddingBatchGeneratedEvent,
  'embedding.models_listed.v1': EmbeddingModelsListedEvent,
  'vector.upserted.v1': VectorUpsertedEvent,
  'vector.queried.v1': VectorQueriedEvent,
  'vector.deleted.v1': VectorDeletedEvent,
  'ledger.transaction.recorded.v1': LedgerTransactionRecordedEvent,
  'ledger.transaction.retrieved.v1': LedgerTransactionRetrievedEvent,
  'ledger.transactions.listed.v1': LedgerTransactionsListedEvent,
  'ledger.balance.retrieved.v1': LedgerBalanceRetrievedEvent,
  'ai.embed_and_store.completed.v1': AIEmbedAndStoreCompletedEvent
};

/**
 * Validate an event against its schema
 */
function validateEvent(eventType, eventData) {
  const schema = EVENT_SCHEMAS[eventType];
  if (!schema) {
    throw new Error(`Unknown event type: ${eventType}`);
  }
  
  const { error, value } = schema.validate(eventData);
  if (error) {
    throw new Error(`Event validation failed for ${eventType}: ${error.message}`);
  }
  
  return value;
}

/**
 * Get all supported event types
 */
function getSupportedEventTypes() {
  return Object.keys(EVENT_SCHEMAS);
}

module.exports = {
  BaseEvent,
  EVENT_SCHEMAS,
  validateEvent,
  getSupportedEventTypes,
  // Individual schemas for direct import
  EmbeddingGeneratedEvent,
  EmbeddingBatchGeneratedEvent,
  EmbeddingModelsListedEvent,
  VectorUpsertedEvent,
  VectorQueriedEvent,
  VectorDeletedEvent,
  LedgerTransactionRecordedEvent,
  LedgerTransactionRetrievedEvent,
  LedgerTransactionsListedEvent,
  LedgerBalanceRetrievedEvent,
  AIEmbedAndStoreCompletedEvent
};