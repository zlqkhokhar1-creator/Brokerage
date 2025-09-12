/**
 * Base Embedding Provider Interface
 */

class EmbeddingProvider {
  /**
   * Generate embeddings for given texts
   * @param {string[]} texts - Array of text strings to embed
   * @param {Object} options - Provider-specific options
   * @returns {Promise<{embeddings: number[][], model: string, dimensions: number}>}
   */
  async generate(texts, options = {}) {
    throw new Error('generate method must be implemented by concrete provider');
  }

  /**
   * Get available models
   * @returns {Promise<{models: Array<{id: string, name: string, dimensions: number}>}>}
   */
  async getAvailableModels() {
    throw new Error('getAvailableModels method must be implemented by concrete provider');
  }

  /**
   * Get provider metadata
   * @returns {Object}
   */
  getProviderInfo() {
    return {
      name: 'base',
      version: '1.0.0'
    };
  }
}

module.exports = { EmbeddingProvider };