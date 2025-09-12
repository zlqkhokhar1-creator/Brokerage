/**
 * Joi schemas for Ledger Shadow block
 */

const Joi = require('joi');

// Input schemas
const RecordTransactionInput = Joi.object({
  sourceEventType: Joi.string().required(),
  paymentId: Joi.string().required(),
  amountMinor: Joi.number().integer().required(),
  currency: Joi.string().length(3).required(), // ISO 4217
  direction: Joi.string().valid('debit', 'credit').required(),
  entityType: Joi.string().valid('user', 'system', 'merchant').required(),
  entityId: Joi.string().required(),
  correlationId: Joi.string().optional(),
  metadata: Joi.object().default({}),
  traceId: Joi.string().optional()
});

const GetTransactionInput = Joi.object({
  transactionId: Joi.string().required(),
  traceId: Joi.string().optional()
});

const ListTransactionsInput = Joi.object({
  entityId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('timestamp', 'amountMinor').default('timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  traceId: Joi.string().optional()
});

const GetBalanceInput = Joi.object({
  entityId: Joi.string().required(),
  currency: Joi.string().length(3).required(),
  traceId: Joi.string().optional()
});

// Output schemas
const Transaction = Joi.object({
  id: Joi.string().required(),
  sourceEventType: Joi.string().required(),
  paymentId: Joi.string().required(),
  amountMinor: Joi.number().required(),
  currency: Joi.string().required(),
  direction: Joi.string().valid('debit', 'credit').required(),
  entityType: Joi.string().valid('user', 'system', 'merchant').required(),
  entityId: Joi.string().required(),
  correlationId: Joi.string().allow(null).optional(),
  metadata: Joi.object().required(),
  timestamp: Joi.number().required()
});

const TransactionResult = Joi.object({
  transaction: Transaction.required()
});

const TransactionListResult = Joi.object({
  transactions: Joi.array().items(Transaction).required(),
  totalCount: Joi.number().required(),
  hasMore: Joi.boolean().required()
});

const BalanceResult = Joi.object({
  entityId: Joi.string().required(),
  currency: Joi.string().required(),
  balanceMinor: Joi.number().required()
});

module.exports = {
  RecordTransactionInput,
  GetTransactionInput,
  ListTransactionsInput,
  GetBalanceInput,
  Transaction,
  TransactionResult,
  TransactionListResult,
  BalanceResult
};