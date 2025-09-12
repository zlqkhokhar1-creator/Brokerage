/**
 * Delete Vector Command
 */

const { DeleteVectorInput, DeleteResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class DeleteVectorCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = DeleteVectorInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // Delete vector
    const result = await this.provider.delete(validatedInput.id);

    const duration = Date.now() - startTime;

    // Emit event
    this._emitEvent('vector.deleted.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      vectorId: validatedInput.id,
      deleted: result.deleted,
      duration
    }, context);

    // Validate and return result
    const { error: outputError } = DeleteResult.validate(result);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return result;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { DeleteVectorCommand };