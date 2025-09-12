/**
 * Database schema types for Kysely
 */

export interface UsersTable {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokensTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface PaymentsTable {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentEventsTable {
  id: string;
  payment_id: string;
  event_type: string;
  event_data: unknown; // JSONB
  created_at: Date;
}

export interface LedgerTransactionsTable {
  id: string;
  user_id: string;
  transaction_type: string;
  amount_cents: number;
  currency: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: Date;
}

export interface LedgerBalancesTable {
  id: string;
  user_id: string;
  currency: string;
  balance_cents: number;
  updated_at: Date;
}

export interface VectorNamespaceMetaTable {
  id: string;
  namespace: string;
  dimension: number;
  created_at: Date;
}

export interface VectorsTable {
  id: string;
  namespace_id: string;
  vector_id: string;
  embedding: number[]; // REAL[] - will migrate to pgvector later
  metadata: unknown; // JSONB
  created_at: Date;
}

export interface IdempotencyKeysTable {
  id: string;
  key: string;
  request_hash: string;
  response_data: unknown | null; // JSONB
  status: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SchemaMigrationsTable {
  version: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

/**
 * Complete database schema interface for Kysely
 */
export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  payments: PaymentsTable;
  payment_events: PaymentEventsTable;
  ledger_transactions: LedgerTransactionsTable;
  ledger_balances: LedgerBalancesTable;
  vector_namespace_meta: VectorNamespaceMetaTable;
  vectors: VectorsTable;
  idempotency_keys: IdempotencyKeysTable;
  schema_migrations: SchemaMigrationsTable;
}