/**
 * Batch Generate Embeddings Command
 */

const { BatchGenerateEmbeddingsInput, EmbeddingResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class BatchGenerateEmbeddingsCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = BatchGenerateEmbeddingsInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    // Generate embeddings
    const result = await this.provider.generate(validatedInput.texts, {
      model: validatedInput.model
    });

    // Emit event
    this._emitEvent('embedding.batch_generated.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      textCount: validatedInput.texts.length,
      model: result.model,
      dimensions: result.dimensions
    }, context);

    // Validate and return result
    const output = {
      embeddings: result.embeddings,
      model: result.model,
      dimensions: result.dimensions,
      texts: validatedInput.texts
    };
    
    const { error: outputError } = EmbeddingResult.validate(output);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return output;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { BatchGenerateEmbeddingsCommand };