/**
 * Upsert Vector Command
 */

const { UpsertVectorInput, UpsertResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class UpsertVectorCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = UpsertVectorInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // Upsert vector
    const result = await this.provider.upsert(
      validatedInput.id,
      validatedInput.embedding,
      validatedInput.metadata
    );

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('vector.upserted.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      vectorId: validatedInput.id,
      dimensions: validatedInput.embedding.length,
      duration
    }, context);

    // Validate and return result
    const { error: outputError } = UpsertResult.validate(result);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return result;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { UpsertVectorCommand };