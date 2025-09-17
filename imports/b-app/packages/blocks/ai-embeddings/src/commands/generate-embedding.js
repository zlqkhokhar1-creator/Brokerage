/**
 * Generate Embedding Command
 */

const { GenerateEmbeddingInput, EmbeddingResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class GenerateEmbeddingCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = GenerateEmbeddingInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    // Normalize text input to array
    const texts = Array.isArray(validatedInput.text) 
      ? validatedInput.text 
      : [validatedInput.text];

    // Generate embeddings
    const result = await this.provider.generate(texts, {
      model: validatedInput.model
    });

    // Emit event
    this._emitEvent('embedding.generated.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      textCount: texts.length,
      model: result.model,
      dimensions: result.dimensions
    }, context);

    // Validate and return result
    const output = {
      embeddings: result.embeddings,
      model: result.model,
      dimensions: result.dimensions,
      texts: texts
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

module.exports = { GenerateEmbeddingCommand };