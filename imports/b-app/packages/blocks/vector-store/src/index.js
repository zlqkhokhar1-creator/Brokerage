/**
 * Vector Store Block
 * Provides vector storage and similarity search capabilities
 */

const { VectorStoreProvider } = require('./providers/base');
const { InMemoryVectorStoreProvider } = require('./providers/in-memory');
const { UpsertVectorCommand } = require('./commands/upsert-vector');
const { QuerySimilarCommand } = require('./commands/query-similar');
const { DeleteVectorCommand } = require('./commands/delete-vector');

class VectorStoreBlock {
  constructor(provider = new InMemoryVectorStoreProvider()) {
    this.provider = provider;
    this.commands = {
      upsertVector: new UpsertVectorCommand(provider),
      querySimilar: new QuerySimilarCommand(provider),
      deleteVector: new DeleteVectorCommand(provider)
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
  VectorStoreBlock,
  VectorStoreProvider,
  InMemoryVectorStoreProvider
};