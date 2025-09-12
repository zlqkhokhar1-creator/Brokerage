/**
 * List Embedding Models Command
 */

const { ListEmbeddingModelsInput, ModelsResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class ListEmbeddingModelsCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = ListEmbeddingModelsInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    // Get available models
    const result = await this.provider.getAvailableModels();

    // Emit event
    this._emitEvent('embedding.models_listed.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      modelCount: result.models.length,
      provider: this.provider.getProviderInfo().name
    }, context);

    // Validate and return result
    const { error: outputError } = ModelsResult.validate(result);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return result;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { ListEmbeddingModelsCommand };