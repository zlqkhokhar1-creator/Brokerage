-- Migration to add support for Paper Trading Mode

-- Create a table to store paper trading accounts
CREATE TABLE IF NOT EXISTS paper_trading_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 100000.00, -- Start with a default of $100,000
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- You might also want separate tables for paper_positions, paper_orders, etc.,
-- to keep the simulation completely separate from real trading data.
-- For this initial implementation, we will focus on the account.

CREATE INDEX IF NOT EXISTS idx_paper_trading_accounts_user_id ON paper_trading_accounts(user_id);
