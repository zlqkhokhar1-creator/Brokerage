/**
 * In-Memory Vector Store Provider
 * Simple implementation using cosine similarity
 */

const { VectorStoreProvider } = require('./base');

class InMemoryVectorStoreProvider extends VectorStoreProvider {
  constructor() {
    super();
    this.vectors = new Map(); // id -> {embedding, metadata}
  }

  /**
   * Upsert a vector with metadata
   */
  async upsert(id, embedding, metadata = {}) {
    this.vectors.set(id, {
      embedding: [...embedding], // Copy the embedding
      metadata: { ...metadata },
      timestamp: Date.now()
    });

    return {
      id,
      success: true
    };
  }

  /**
   * Query for similar vectors using cosine similarity
   */
  async query(queryEmbedding, topK = 10, filter = null) {
    const results = [];
    
    for (const [id, vectorData] of this.vectors.entries()) {
      // Apply filter if provided
      if (filter && !this._matchesFilter(vectorData.metadata, filter)) {
        continue;
      }
      
      const score = this._cosineSimilarity(queryEmbedding, vectorData.embedding);
      results.push({
        id,
        score,
        metadata: vectorData.metadata
      });
    }

    // Sort by similarity score (highest first) and limit to topK
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Delete a vector by ID
   */
  async delete(id) {
    const deleted = this.vectors.delete(id);
    return {
      id,
      deleted
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   * @private
   */
  _cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Check if metadata matches filter
   * @private
   */
  _matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  getProviderInfo() {
    return {
      name: 'in-memory',
      version: '1.0.0',
      type: 'cosine-similarity'
    };
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      vectorCount: this.vectors.size,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  _estimateMemoryUsage() {
    let size = 0;
    for (const vectorData of this.vectors.values()) {
      size += vectorData.embedding.length * 8; // 8 bytes per float
      size += JSON.stringify(vectorData.metadata).length;
    }
    return size;
  }
}

module.exports = { InMemoryVectorStoreProvider };