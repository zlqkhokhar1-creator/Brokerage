-- Migration: Add missing tables and columns for Postgres backend
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- Extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS: add profile, KYC, auth-related columns
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS risk_profile VARCHAR(50) DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS investment_goals JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ACCOUNT TYPES: dictionary for accounts
CREATE TABLE IF NOT EXISTS account_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  fees JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACCOUNTS: add operational columns
ALTER TABLE IF EXISTS accounts
  ADD COLUMN IF NOT EXISTS account_type_id INTEGER REFERENCES account_types(id),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(32) UNIQUE,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_accounts_user_id_status ON accounts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type_id ON accounts(account_type_id);

-- PORTFOLIOS: add metadata and flags
ALTER TABLE IF EXISTS portfolios
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS strategy VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS target_return DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS rebalance_frequency VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_portfolios_user_active ON portfolios(user_id, is_active);

-- SECURITIES: add descriptive columns and status
ALTER TABLE IF EXISTS securities
  ADD COLUMN IF NOT EXISTS type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS exchange VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sector VARCHAR(50),
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_securities_active ON securities(is_active);
CREATE INDEX IF NOT EXISTS idx_securities_type ON securities(type);

-- MARKET DATA: time-series quotes
CREATE TABLE IF NOT EXISTS market_data (
  id BIGSERIAL PRIMARY KEY,
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  price DECIMAL(16,4) NOT NULL,
  volume BIGINT,
  open_price DECIMAL(16,4),
  high_price DECIMAL(16,4),
  low_price DECIMAL(16,4),
  previous_close DECIMAL(16,4),
  change_amount DECIMAL(16,4),
  change_percentage DECIMAL(8,4),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_data_security_time ON market_data(security_id, timestamp DESC);

-- ORDERS: enrich with advanced order fields
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stop_price DECIMAL(16,4),
  ADD COLUMN IF NOT EXISTS limit_price DECIMAL(16,4),
  ADD COLUMN IF NOT EXISTS time_in_force VARCHAR(10) DEFAULT 'GTC',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS filled_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_fill_price DECIMAL(16,4),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conditions JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_portfolio ON orders(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_orders_security ON orders(security_id);

-- TRADES: executions against orders
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(16,4) NOT NULL,
  side VARCHAR(10) NOT NULL,
  commission DECIMAL(16,4) DEFAULT 0,
  fees DECIMAL(16,4) DEFAULT 0,
  net_amount DECIMAL(16,4) DEFAULT 0,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_order ON trades(order_id);
CREATE INDEX IF NOT EXISTS idx_trades_security ON trades(security_id);

-- TRANSACTIONS: account money movements
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  description TEXT,
  reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  external_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- FOLLOWS: social graph
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- USER SESSIONS: JWT session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_sessions_user_token ON user_sessions(user_id, token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

-- WATCHLISTS: minimal to satisfy creation
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);

-- Ensure portfolio_holdings has needed computed fields (already present in base schema)
ALTER TABLE IF EXISTS portfolio_holdings
  ADD COLUMN IF NOT EXISTS current_value DECIMAL(16,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unrealized_pnl DECIMAL(16,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Optional: simple triggers to auto-update updated_at on common tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION touch_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END$$;

-- Attach trigger where updated_at exists
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT table_schema, table_name FROM information_schema.columns 
           WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION touch_updated_at();',
                   'trg_touch_' || t.table_name, t.table_schema, t.table_name);
    -- ignore errors if trigger exists
    EXCEPTION WHEN duplicate_object THEN NULL;
  END LOOP;
END$$;


