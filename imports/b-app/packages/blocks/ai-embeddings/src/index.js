/**
 * AI Embeddings Block
 * Provides text embedding generation with provider abstraction
 */

const { EmbeddingProvider } = require('./providers/base');
const { MockEmbeddingProvider } = require('./providers/mock');
const { GenerateEmbeddingCommand } = require('./commands/generate-embedding');
const { BatchGenerateEmbeddingsCommand } = require('./commands/batch-generate-embeddings');
const { ListEmbeddingModelsCommand } = require('./commands/list-embedding-models');

class AIEmbeddingsBlock {
  constructor(provider = new MockEmbeddingProvider()) {
    this.provider = provider;
    this.commands = {
      generateEmbedding: new GenerateEmbeddingCommand(provider),
      batchGenerateEmbeddings: new BatchGenerateEmbeddingsCommand(provider),
      listEmbeddingModels: new ListEmbeddingModelsCommand(provider)
    };
  }

  /**
   * Execute a command by name
   */
  async executeCommand(commandName, input, context = {}) {
    const command = this.commands[commandName];
    if (!command) {
      throw new Error(`Command '${commandName}' not found`);
    }
    
    return await command.execute(input, context);
  }

  /**
   * Get available commands
   */
  getAvailableCommands() {
    return Object.keys(this.commands);
  }
}

module.exports = {
  AIEmbeddingsBlock,
  EmbeddingProvider,
  MockEmbeddingProvider
};