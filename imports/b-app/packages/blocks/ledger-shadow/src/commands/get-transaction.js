/**
 * Get Transaction Command
 */

const { GetTransactionInput, TransactionResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class GetTransactionCommand {
  constructor(store) {
    this.store = store;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = GetTransactionInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // Get transaction
    const transaction = await this.store.getTransaction(validatedInput.transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${validatedInput.transactionId}`);
    }

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('ledger.transaction.retrieved.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      transactionId: validatedInput.transactionId,
      found: !!transaction,
      duration
    }, context);

    // Validate and return result
    const output = {
      transaction
    };
    
    const { error: outputError } = TransactionResult.validate(output);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return output;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { GetTransactionCommand };