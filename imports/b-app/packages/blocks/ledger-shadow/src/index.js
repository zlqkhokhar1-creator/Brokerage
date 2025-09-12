/**
 * Ledger Shadow Block
 * Captures and normalizes payment events into canonical ledger transactions
 */

const { LedgerStore } = require('./store/ledger-store');
const { RecordTransactionCommand } = require('./commands/record-transaction');
const { GetTransactionCommand } = require('./commands/get-transaction');
const { ListTransactionsCommand } = require('./commands/list-transactions');
const { GetBalanceCommand } = require('./commands/get-balance');

class LedgerShadowBlock {
  constructor(store = new LedgerStore()) {
    this.store = store;
    this.commands = {
      recordTransaction: new RecordTransactionCommand(store),
      getTransaction: new GetTransactionCommand(store),
      listTransactionsForEntity: new ListTransactionsCommand(store),
      getBalance: new GetBalanceCommand(store)
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
  LedgerShadowBlock,
  LedgerStore
};