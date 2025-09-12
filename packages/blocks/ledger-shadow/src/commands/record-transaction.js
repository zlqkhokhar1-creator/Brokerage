/**
 * Record Transaction Command
 */

const { RecordTransactionInput, TransactionResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class RecordTransactionCommand {
  constructor(store) {
    this.store = store;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = RecordTransactionInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    // Create transaction
    const transaction = {
      id: uuidv4(),
      sourceEventType: validatedInput.sourceEventType,
      paymentId: validatedInput.paymentId,
      amountMinor: validatedInput.amountMinor,
      currency: validatedInput.currency,
      direction: validatedInput.direction,
      entityType: validatedInput.entityType,
      entityId: validatedInput.entityId,
      correlationId: validatedInput.correlationId,
      metadata: validatedInput.metadata,
      timestamp: Date.now()
    };

    const startTime = Date.now();

    // Record transaction (with idempotency)
    const recordedTransaction = await this.store.recordTransaction(transaction);

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('ledger.transaction.recorded.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      transactionId: recordedTransaction.id,
      sourceEventType: recordedTransaction.sourceEventType,
      paymentId: recordedTransaction.paymentId,
      amountMinor: recordedTransaction.amountMinor,
      currency: recordedTransaction.currency,
      direction: recordedTransaction.direction,
      entityType: recordedTransaction.entityType,
      entityId: recordedTransaction.entityId,
      duration
    }, context);

    // Validate and return result
    const output = {
      transaction: recordedTransaction
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

module.exports = { RecordTransactionCommand };