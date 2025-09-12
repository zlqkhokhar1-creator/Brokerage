/**
 * In-Memory Ledger Store
 * Stores transactions and maintains entity balances
 */

class LedgerStore {
  constructor() {
    this.transactions = new Map(); // transactionId -> transaction
    this.balances = new Map(); // entityId:currency -> balanceMinor
    this.entityTransactions = new Map(); // entityId -> Set<transactionId>
  }

  /**
   * Record a new transaction
   */
  async recordTransaction(transaction) {
    // Check for idempotency
    const compositeKey = this._generateCompositeKey(transaction);
    const existingTransaction = this._findByCompositeKey(compositeKey);
    
    if (existingTransaction) {
      return existingTransaction;
    }

    // Store transaction
    this.transactions.set(transaction.id, transaction);

    // Update entity transactions index
    if (!this.entityTransactions.has(transaction.entityId)) {
      this.entityTransactions.set(transaction.entityId, new Set());
    }
    this.entityTransactions.get(transaction.entityId).add(transaction.id);

    // Update balance
    await this._updateBalance(transaction);

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * List transactions for entity
   */
  async listTransactionsForEntity(entityId, options = {}) {
    const { limit = 100, offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = options;
    
    const transactionIds = this.entityTransactions.get(entityId) || new Set();
    const transactions = Array.from(transactionIds)
      .map(id => this.transactions.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const order = sortOrder === 'asc' ? 1 : -1;
        return aVal > bVal ? order : -order;
      })
      .slice(offset, offset + limit);

    return {
      transactions,
      totalCount: transactionIds.size,
      hasMore: offset + limit < transactionIds.size
    };
  }

  /**
   * Get balance for entity and currency
   */
  async getBalance(entityId, currency) {
    const key = `${entityId}:${currency}`;
    return this.balances.get(key) || 0;
  }

  /**
   * Update balance based on transaction
   * @private
   */
  async _updateBalance(transaction) {
    const key = `${transaction.entityId}:${transaction.currency}`;
    const currentBalance = this.balances.get(key) || 0;
    
    const balanceChange = transaction.direction === 'credit' 
      ? transaction.amountMinor 
      : -transaction.amountMinor;
    
    this.balances.set(key, currentBalance + balanceChange);
  }

  /**
   * Generate composite key for idempotency
   * @private
   */
  _generateCompositeKey(transaction) {
    return `${transaction.sourceEventType}:${transaction.paymentId}:${transaction.entityId}`;
  }

  /**
   * Find transaction by composite key
   * @private
   */
  _findByCompositeKey(compositeKey) {
    for (const transaction of this.transactions.values()) {
      if (this._generateCompositeKey(transaction) === compositeKey) {
        return transaction;
      }
    }
    return null;
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      transactionCount: this.transactions.size,
      entityCount: this.entityTransactions.size,
      balanceCount: this.balances.size
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.transactions.clear();
    this.balances.clear();
    this.entityTransactions.clear();
  }
}

module.exports = { LedgerStore };