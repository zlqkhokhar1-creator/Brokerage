/**
 * Embed and Store Command
 * Orchestrates embedding generation and vector storage
 */

const { v4: uuidv4 } = require('uuid');

class EmbedAndStoreCommand {
  constructor(embeddingProvider, vectorStoreProvider) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStoreProvider = vectorStoreProvider;
  }

  async execute(input, context = {}) {
    const { text, id, metadata = {}, model, traceId } = input;
    
    const span = context.traceContext?.createSpan('EmbedAndStore', {
      textLength: text.length,
      vectorId: id
    });

    try {
      // Generate embedding
      const embeddingResult = await this.embeddingProvider.generate([text], { model });
      const embedding = embeddingResult.embeddings[0];

      // Store vector
      const storeResult = await this.vectorStoreProvider.upsert(id, embedding, {
        ...metadata,
        text,
        model: embeddingResult.model,
        timestamp: Date.now()
      });

      // Emit orchestration event
      this._emitEvent('ai.embed_and_store.completed.v1', {
        traceId: traceId || uuidv4(),
        vectorId: id,
        textLength: text.length,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        success: storeResult.success
      }, context);

      if (span) {
        context.traceContext.finishSpan(span.spanId, {
          vectorId: id,
          success: storeResult.success
        });
      }

      return {
        vectorId: id,
        embedding: embedding,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        stored: storeResult.success
      };

    } catch (error) {
      if (span) {
        context.traceContext.finishSpan(span.spanId, null, error);
      }
      throw error;
    }
  }

  _emitEvent(eventType, data, context) {
    if (context.eventEmitter) {
      context.eventEmitter.emit(eventType, data);
    }
  }
}

module.exports = { EmbedAndStoreCommand };