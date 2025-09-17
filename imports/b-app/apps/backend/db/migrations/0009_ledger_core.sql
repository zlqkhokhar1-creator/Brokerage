-- Migration 0009: Ledger Core Tables
-- Adds ledger_transactions and ledger_balances for financial accounting
-- Checksum: ledger-transactions-balances

BEGIN;

-- Ledger direction enum
CREATE TYPE ledger_direction AS ENUM ('credit', 'debit');

-- Ledger transactions table
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
    direction ledger_direction NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ledger balances table - tracks current balances per entity
CREATE TABLE IF NOT EXISTS ledger_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    currency CHAR(3) NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
    balance_minor BIGINT NOT NULL DEFAULT 0,
    last_transaction_id UUID REFERENCES ledger_transactions(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint on entity + currency for balances
ALTER TABLE ledger_balances 
ADD CONSTRAINT IF NOT EXISTS unique_entity_currency 
UNIQUE (entity_type, entity_id, currency);

-- Indexes for ledger_transactions
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_entity 
ON ledger_transactions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_created_at 
ON ledger_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_payment_id 
ON ledger_transactions(payment_id) WHERE payment_id IS NOT NULL;

-- Indexes for ledger_balances
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_balances_entity_currency 
ON ledger_balances(entity_type, entity_id, currency);

CREATE INDEX IF NOT EXISTS idx_ledger_balances_entity_type 
ON ledger_balances(entity_type);

-- Currency validation trigger for ledger tables
CREATE OR REPLACE FUNCTION validate_ledger_currency_upper()
RETURNS TRIGGER AS $$
BEGIN
    NEW.currency = upper(NEW.currency);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ledger_transactions_currency_upper
    BEFORE INSERT OR UPDATE ON ledger_transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_currency_upper();

CREATE TRIGGER trigger_ledger_balances_currency_upper
    BEFORE INSERT OR UPDATE ON ledger_balances
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_currency_upper();

COMMIT;