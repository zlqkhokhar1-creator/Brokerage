/**
 * Kysely Database Schema Types
 */

export interface Database {
  users: UserTable;
  refresh_tokens: RefreshTokenTable;
  payments: PaymentTable;
  payment_events: PaymentEventTable;
  idempotency_keys: IdempotencyKeyTable;
  ledger_transactions: LedgerTransactionTable;
  ledger_balances: LedgerBalanceTable;
  accounts: AccountTable;
  securities: SecurityTable;
  portfolios: PortfolioTable;
  portfolio_holdings: PortfolioHoldingTable;
  orders: OrderTable;
  schema_migrations: SchemaMigrationTable;
}

export interface UserTable {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  hash_alg?: string;
  hash_params_json?: object;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type PaymentStatus = 'initialized' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface PaymentTable {
  id: string;
  user_id: string;
  amount_minor: string; // BIGINT comes as string
  currency: string;
  status: PaymentStatus;
  payment_method_id?: string;
  external_id?: string;
  metadata: object;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentEventTable {
  id: string;
  payment_id: string;
  event_type: string;
  payload_json: object;
  created_at: Date;
}

export interface IdempotencyKeyTable {
  id: string;
  scope: string;
  key_value: string;
  status_code?: number;
  response_json?: object;
  completed_at?: Date;
  created_at: Date;
  expires_at: Date;
}

export type LedgerDirection = 'credit' | 'debit';

export interface LedgerTransactionTable {
  id: string;
  payment_id?: string;
  entity_type: string;
  entity_id: string;
  amount_minor: string; // BIGINT comes as string
  currency: string;
  direction: LedgerDirection;
  description?: string;
  metadata: object;
  created_at: Date;
}

export interface LedgerBalanceTable {
  id: string;
  entity_type: string;
  entity_id: string;
  currency: string;
  balance_minor: string; // BIGINT comes as string
  last_transaction_id?: string;
  updated_at: Date;
  created_at: Date;
}

// Existing tables (keeping for compatibility)
export interface AccountTable {
  id: string;
  user_id: string;
  account_type: string;
  balance: string;
  created_at: Date;
  updated_at: Date;
}

export interface SecurityTable {
  id: string;
  symbol: string;
  name: string;
  current_price: string;
  last_updated: Date;
}

export interface PortfolioTable {
  id: string;
  user_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioHoldingTable {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: string;
  average_cost: string;
  current_value: string;
  unrealized_pnl: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderTable {
  id: string;
  user_id: string;
  security_id?: string;
  symbol: string;
  order_type: string;
  side: string;
  quantity: number;
  price?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface SchemaMigrationTable {
  version: string;
  applied_at: Date;
}