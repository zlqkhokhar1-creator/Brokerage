/**
 * Mock Embedding Provider
 * Generates deterministic embeddings for testing
 */

const crypto = require('crypto');
const { EmbeddingProvider } = require('./base');

class MockEmbeddingProvider extends EmbeddingProvider {
  constructor(dimensions = 384) {
    super();
    this.dimensions = dimensions;
    this.model = 'mock-embedding-model-v1';
  }

  /**
   * Generate deterministic embeddings based on text hash
   * @param {string[]} texts 
   * @param {Object} options 
   * @returns {Promise<{embeddings: number[][], model: string, dimensions: number}>}
   */
  async generate(texts, options = {}) {
    const embeddings = texts.map(text => this._generateEmbedding(text));
    
    return {
      embeddings,
      model: this.model,
      dimensions: this.dimensions
    };
  }

  /**
   * Generate deterministic embedding for a single text
   * @private
   */
  _generateEmbedding(text) {
    // Create deterministic hash-based embedding
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = [];
    
    // Convert hash bytes to normalized float values
    for (let i = 0; i < this.dimensions; i++) {
      const byteIndex = i % hash.length;
      const value = (hash[byteIndex] - 128) / 128; // Normalize to [-1, 1]
      embedding.push(value);
    }
    
    // Normalize the vector to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Get available mock models
   */
  async getAvailableModels() {
    return {
      models: [
        {
          id: 'mock-embedding-model-v1',
          name: 'Mock Embedding Model v1',
          dimensions: this.dimensions
        },
        {
          id: 'mock-embedding-model-v2', 
          name: 'Mock Embedding Model v2',
          dimensions: 768
        }
      ]
    };
  }

  getProviderInfo() {
    return {
      name: 'mock',
      version: '1.0.0',
      type: 'deterministic'
    };
  }
}

module.exports = { MockEmbeddingProvider };