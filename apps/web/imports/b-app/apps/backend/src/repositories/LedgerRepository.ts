/**
 * Ledger Repository for Financial Transaction Management
 */

import { kysely } from '../config/kysely';
import { LedgerTransactionTable, LedgerBalanceTable, LedgerDirection } from '../types/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export interface RecordTransactionData {
  paymentId?: string;
  entityType: string;
  entityId: string;
  amountMinor: bigint;
  currency: string;
  direction: LedgerDirection;
  description?: string;
  metadata?: object;
}

export interface BalanceQuery {
  entityType: string;
  entityId: string;
  currency: string;
}

export interface TransactionQuery {
  entityType: string;
  entityId: string;
  limit?: number;
  cursor?: string;
  currency?: string;
}

export class LedgerRepository {
  /**
   * Record a transaction and update balance atomically
   */
  async recordTransaction(data: RecordTransactionData): Promise<LedgerTransactionTable> {
    return await kysely.transaction().execute(async (trx) => {
      // Insert transaction
      const transaction = await trx
        .insertInto('ledger_transactions')
        .values({
          id: uuidv4(),
          payment_id: data.paymentId,
          entity_type: data.entityType,
          entity_id: data.entityId,
          amount_minor: data.amountMinor.toString(),
          currency: data.currency.toUpperCase(),
          direction: data.direction,
          description: data.description,
          metadata: data.metadata || {},
          created_at: new Date()
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Calculate balance change
      const balanceChange = data.direction === 'credit' 
        ? data.amountMinor 
        : -data.amountMinor;

      // Update balance using UPSERT
      await trx
        .insertInto('ledger_balances')
        .values({
          id: uuidv4(),
          entity_type: data.entityType,
          entity_id: data.entityId,
          currency: data.currency.toUpperCase(),
          balance_minor: balanceChange.toString(),
          last_transaction_id: transaction.id,
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict((oc) =>
          oc.columns(['entity_type', 'entity_id', 'currency']).doUpdateSet({
            balance_minor: sql`ledger_balances.balance_minor + ${balanceChange.toString()}::bigint`,
            last_transaction_id: transaction.id,
            updated_at: new Date()
          })
        )
        .execute();

      return transaction;
    });
  }

  /**
   * Get current balance for entity
   */
  async getBalance(entityType: string, entityId: string, currency: string): Promise<bigint> {
    const result = await kysely
      .selectFrom('ledger_balances')
      .select('balance_minor')
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .where('currency', '=', currency.toUpperCase())
      .executeTakeFirst();

    return result ? BigInt(result.balance_minor) : BigInt(0);
  }

  /**
   * Get balance with metadata
   */
  async getBalanceWithMetadata(entityType: string, entityId: string, currency: string): Promise<LedgerBalanceTable | null> {
    const result = await kysely
      .selectFrom('ledger_balances')
      .selectAll()
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .where('currency', '=', currency.toUpperCase())
      .executeTakeFirst();

    return result || null;
  }

  /**
   * List transactions for entity
   */
  async listTransactions(query: TransactionQuery): Promise<LedgerTransactionTable[]> {
    let dbQuery = kysely
      .selectFrom('ledger_transactions')
      .selectAll()
      .where('entity_type', '=', query.entityType)
      .where('entity_id', '=', query.entityId);

    if (query.currency) {
      dbQuery = dbQuery.where('currency', '=', query.currency.toUpperCase());
    }

    if (query.cursor) {
      // Cursor-based pagination using created_at
      dbQuery = dbQuery.where('created_at', '<', new Date(query.cursor));
    }

    dbQuery = dbQuery
      .orderBy('created_at', 'desc')
      .limit(query.limit || 50);

    return await dbQuery.execute();
  }

  /**
   * Get all balances for entity
   */
  async getAllBalances(entityType: string, entityId: string): Promise<LedgerBalanceTable[]> {
    return await kysely
      .selectFrom('ledger_balances')
      .selectAll()
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .execute();
  }

  /**
   * Get transactions in time range (for replay/verification)
   */
  async getTransactionsInRange(
    startDate: Date, 
    endDate: Date, 
    limit: number = 1000, 
    offset: number = 0
  ): Promise<LedgerTransactionTable[]> {
    return await kysely
      .selectFrom('ledger_transactions')
      .selectAll()
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<LedgerTransactionTable | null> {
    const result = await kysely
      .selectFrom('ledger_transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Get transactions by payment ID
   */
  async getTransactionsByPaymentId(paymentId: string): Promise<LedgerTransactionTable[]> {
    return await kysely
      .selectFrom('ledger_transactions')
      .selectAll()
      .where('payment_id', '=', paymentId)
      .orderBy('created_at', 'asc')
      .execute();
  }

  /**
   * Count transactions for entity
   */
  async countTransactions(entityType: string, entityId: string, currency?: string): Promise<number> {
    let query = kysely
      .selectFrom('ledger_transactions')
      .select(kysely.fn.count('id').as('count'))
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId);

    if (currency) {
      query = query.where('currency', '=', currency.toUpperCase());
    }

    const result = await query.executeTakeFirstOrThrow();
    return Number(result.count);
  }

  /**
   * Get balance summary across all entities of a type
   */
  async getBalanceSummary(entityType: string, currency?: string): Promise<{ 
    totalBalance: bigint; 
    entityCount: number; 
  }> {
    let query = kysely
      .selectFrom('ledger_balances')
      .select([
        kysely.fn.sum('balance_minor').as('total_balance'),
        kysely.fn.count('id').as('entity_count')
      ])
      .where('entity_type', '=', entityType);

    if (currency) {
      query = query.where('currency', '=', currency.toUpperCase());
    }

    const result = await query.executeTakeFirstOrThrow();
    
    return {
      totalBalance: BigInt(result.total_balance || '0'),
      entityCount: Number(result.entity_count || 0)
    };
  }

  /**
   * Verify balance consistency (for integrity checks)
   * Recalculates balance from transactions and compares with stored balance
   */
  async verifyBalanceConsistency(entityType: string, entityId: string, currency: string): Promise<{
    storedBalance: bigint;
    calculatedBalance: bigint;
    isConsistent: boolean;
    transactionCount: number;
  }> {
    const storedBalance = await this.getBalance(entityType, entityId, currency);
    
    // Calculate balance from transactions
    const result = await kysely
      .selectFrom('ledger_transactions')
      .select([
        kysely.fn.count('id').as('transaction_count'),
        kysely.fn
          .sum(
            sql`CASE WHEN direction = 'credit' THEN amount_minor::bigint ELSE -amount_minor::bigint END`
          )
          .as('calculated_balance')
      ])
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .where('currency', '=', currency.toUpperCase())
      .executeTakeFirstOrThrow();

    const calculatedBalance = BigInt(result.calculated_balance || '0');
    const transactionCount = Number(result.transaction_count || 0);

    return {
      storedBalance,
      calculatedBalance,
      isConsistent: storedBalance === calculatedBalance,
      transactionCount
    };
  }
}