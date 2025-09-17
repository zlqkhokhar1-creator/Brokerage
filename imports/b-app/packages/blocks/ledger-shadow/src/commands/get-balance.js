/**
 * Get Balance Command
 */

const { GetBalanceInput, BalanceResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class GetBalanceCommand {
  constructor(store) {
    this.store = store;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = GetBalanceInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // Get balance
    const balanceMinor = await this.store.getBalance(
      validatedInput.entityId,
      validatedInput.currency
    );

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('ledger.balance.retrieved.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      entityId: validatedInput.entityId,
      currency: validatedInput.currency,
      balanceMinor,
      duration
    }, context);

    // Validate and return result
    const output = {
      entityId: validatedInput.entityId,
      currency: validatedInput.currency,
      balanceMinor
    };
    
    const { error: outputError } = BalanceResult.validate(output);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return output;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { GetBalanceCommand };