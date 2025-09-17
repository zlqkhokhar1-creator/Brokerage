/**
 * List Transactions Command
 */

const { ListTransactionsInput, TransactionListResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class ListTransactionsCommand {
  constructor(store) {
    this.store = store;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = ListTransactionsInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // List transactions
    const result = await this.store.listTransactionsForEntity(
      validatedInput.entityId,
      {
        limit: validatedInput.limit,
        offset: validatedInput.offset,
        sortBy: validatedInput.sortBy,
        sortOrder: validatedInput.sortOrder
      }
    );

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('ledger.transactions.listed.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      entityId: validatedInput.entityId,
      resultCount: result.transactions.length,
      totalCount: result.totalCount,
      duration
    }, context);

    // Validate and return result
    const { error: outputError } = TransactionListResult.validate(result);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return result;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { ListTransactionsCommand };