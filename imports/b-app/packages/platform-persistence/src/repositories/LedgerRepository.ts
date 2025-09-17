import { Kysely } from 'kysely';
import { Database } from '../types';

export interface LedgerTransaction {
  id: string;
  userId: string;
  transactionType: string;
  amountCents: number;
  currency: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: Date;
}

export interface LedgerBalance {
  id: string;
  userId: string;
  currency: string;
  balanceCents: number;
  updatedAt: Date;
}

/**
 * Ledger repository interface for managing user balances and transactions
 * TODO: Implement in PR9 with replay scaffold and integrity hash chain
 */
export interface LedgerRepository {
  /**
   * Record a ledger transaction
   */
  recordTransaction(transaction: Omit<LedgerTransaction, 'id' | 'createdAt'>): Promise<LedgerTransaction>;

  /**
   * Get current balance for user and currency
   */
  getBalance(userId: string, currency: string): Promise<LedgerBalance | null>;

  /**
   * Get transaction history for user
   */
  getTransactionHistory(userId: string, limit?: number): Promise<LedgerTransaction[]>;

  /**
   * Validate ledger integrity
   */
  validateIntegrity(userId: string): Promise<boolean>;
}

/**
 * Database implementation of LedgerRepository
 * TODO: Implement in PR9 with replay patterns and dual-write logic
 */
export class DatabaseLedgerRepository implements LedgerRepository {
  constructor(private db: Kysely<Database>) {}

  async recordTransaction(transaction: Omit<LedgerTransaction, 'id' | 'createdAt'>): Promise<LedgerTransaction> {
    // TODO: Implement in PR9 - ledger persistence with replay scaffold
    // TODO: Add integrity hash chain for transaction verification
    throw new Error('Not implemented yet - will be implemented in PR9');
  }

  async getBalance(userId: string, currency: string): Promise<LedgerBalance | null> {
    // TODO: Implement in PR9 - ledger persistence with replay scaffold
    throw new Error('Not implemented yet - will be implemented in PR9');
  }

  async getTransactionHistory(userId: string, limit?: number): Promise<LedgerTransaction[]> {
    // TODO: Implement in PR9 - ledger persistence with replay scaffold
    throw new Error('Not implemented yet - will be implemented in PR9');
  }

  async validateIntegrity(userId: string): Promise<boolean> {
    // TODO: Implement in PR9 - integrity hash chain validation
    throw new Error('Not implemented yet - will be implemented in PR9');
  }
}