-- Migration: Ledger Base Tables
-- Version: 0004
-- Checksum placeholder: SHA256 will be calculated by migration runner

BEGIN;

-- Ledger transactions for double-entry bookkeeping
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ledger transaction queries
CREATE INDEX idx_ledger_transactions_user_id ON ledger_transactions(user_id);
CREATE INDEX idx_ledger_transactions_type ON ledger_transactions(transaction_type);
CREATE INDEX idx_ledger_transactions_reference ON ledger_transactions(reference_id, reference_type);
CREATE INDEX idx_ledger_transactions_created_at ON ledger_transactions(created_at);

-- Ledger balances for current account balances
CREATE TABLE ledger_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Index for balance lookups
CREATE INDEX idx_ledger_balances_user_currency ON ledger_balances(user_id, currency);

COMMIT;