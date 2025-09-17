/**
 * Query Similar Command
 */

const { QuerySimilarInput, QueryResult } = require('../schemas');
const { v4: uuidv4 } = require('uuid');

class QuerySimilarCommand {
  constructor(provider) {
    this.provider = provider;
  }

  async execute(input, context = {}) {
    // Validate input
    const { error, value: validatedInput } = QuerySimilarInput.validate(input);
    if (error) throw new Error(`Validation error: ${error.message}`);
    
    const startTime = Date.now();
    
    // Query similar vectors
    const results = await this.provider.query(
      validatedInput.embedding,
      validatedInput.topK,
      validatedInput.filter
    );

    const queryTime = Date.now() - startTime;

    // Emit event
    this._emitEvent('vector.queried.v1', {
      traceId: validatedInput.traceId || uuidv4(),
      dimensions: validatedInput.embedding.length,
      topK: validatedInput.topK,
      resultCount: results.length,
      queryTime
    }, context);

    // Validate and return result
    const output = {
      results,
      queryTime
    };
    
    const { error: outputError } = QueryResult.validate(output);
    if (outputError) throw new Error(`Output validation error: ${outputError.message}`);
    
    return output;
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { QuerySimilarCommand };