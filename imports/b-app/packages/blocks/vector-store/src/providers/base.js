/**
 * Base Vector Store Provider Interface
 */

class VectorStoreProvider {
  /**
   * Upsert a vector with metadata
   * @param {string} id - Unique identifier for the vector
   * @param {number[]} embedding - Vector embedding
   * @param {Object} metadata - Associated metadata
   * @returns {Promise<{id: string, success: boolean}>}
   */
  async upsert(id, embedding, metadata = {}) {
    throw new Error('upsert method must be implemented by concrete provider');
  }

  /**
   * Query for similar vectors
   * @param {number[]} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @param {Object} filter - Optional metadata filter
   * @returns {Promise<Array<{id: string, score: number, metadata: Object}>>}
   */
  async query(queryEmbedding, topK = 10, filter = null) {
    throw new Error('query method must be implemented by concrete provider');
  }

  /**
   * Delete a vector by ID
   * @param {string} id - Vector ID to delete
   * @returns {Promise<{id: string, deleted: boolean}>}
   */
  async delete(id) {
    throw new Error('delete method must be implemented by concrete provider');
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

module.exports = { VectorStoreProvider };