-- Comprehensive database schema for brokerage platform

-- Users table with enhanced fields
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(3), -- ISO country code
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(3), -- ISO country code
  kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected')),
  kyc_documents JSONB, -- Store document metadata
  risk_profile VARCHAR(20) DEFAULT 'moderate' CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  investment_goals TEXT[],
  annual_income NUMERIC(12,2),
  net_worth NUMERIC(15,2),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for JWT management
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Account types
CREATE TABLE IF NOT EXISTS account_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  min_balance NUMERIC(12,2) DEFAULT 0,
  fees JSONB, -- Store fee structure
  features TEXT[],
  is_active BOOLEAN DEFAULT true
);

-- User accounts (brokerage, savings, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_type_id INTEGER REFERENCES account_types(id),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  balance NUMERIC(16,2) DEFAULT 0,
  available_balance NUMERIC(16,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  interest_rate NUMERIC(5,4) DEFAULT 0,
  last_interest_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Securities (stocks, ETFs, bonds, etc.)
CREATE TABLE IF NOT EXISTS securities (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('stock', 'etf', 'bond', 'crypto', 'commodity', 'mutual_fund')),
  exchange VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap NUMERIC(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, exchange)
);

-- Real-time market data
CREATE TABLE IF NOT EXISTS market_data (
  id SERIAL PRIMARY KEY,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  price NUMERIC(16,4) NOT NULL,
  volume BIGINT DEFAULT 0,
  open_price NUMERIC(16,4),
  high_price NUMERIC(16,4),
  low_price NUMERIC(16,4),
  previous_close NUMERIC(16,4),
  change_amount NUMERIC(16,4),
  change_percentage NUMERIC(8,4),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategy VARCHAR(50), -- 'manual', 'robo', 'hybrid'
  risk_level VARCHAR(20),
  target_return NUMERIC(5,2),
  rebalance_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'annually'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio holdings
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  quantity NUMERIC(16,6) NOT NULL,
  average_cost NUMERIC(16,4) NOT NULL,
  current_value NUMERIC(16,2) GENERATED ALWAYS AS (quantity * (SELECT price FROM market_data WHERE security_id = portfolio_holdings.security_id ORDER BY timestamp DESC LIMIT 1)) STORED,
  unrealized_pnl NUMERIC(16,2) GENERATED ALWAYS AS (quantity * (SELECT price FROM market_data WHERE security_id = portfolio_holdings.security_id ORDER BY timestamp DESC LIMIT 1) - quantity * average_cost) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, security_id)
);

-- Trading orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  portfolio_id INTEGER REFERENCES portfolios(id),
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(16,6) NOT NULL,
  price NUMERIC(16,4),
  stop_price NUMERIC(16,4),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled', 'rejected')),
  filled_quantity NUMERIC(16,6) DEFAULT 0,
  average_fill_price NUMERIC(16,4),
  time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'DAY')),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trade executions
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  quantity NUMERIC(16,6) NOT NULL,
  price NUMERIC(16,4) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  commission NUMERIC(10,4) DEFAULT 0,
  fees NUMERIC(10,4) DEFAULT 0,
  net_amount NUMERIC(16,2) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (deposits, withdrawals, transfers)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'dividend', 'interest', 'fee', 'refund')),
  amount NUMERIC(16,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  external_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist_securities (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(watchlist_id, security_id)
);

-- Alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('price_above', 'price_below', 'volume_spike', 'news', 'earnings')),
  condition_value NUMERIC(16,4),
  condition_text TEXT,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social trading tables
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

-- Add social trading columns to existing tables
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_securities_symbol ON securities(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_security_timestamp ON market_data(security_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Insert default account types
INSERT INTO account_types (name, description, min_balance, fees, features) VALUES
('Brokerage', 'Standard investment account for trading securities', 0, '{"commission": 0.99, "annual_fee": 0}', ARRAY['trading', 'research', 'market_data']),
('Savings', 'High-yield savings account', 0, '{"monthly_fee": 0}', ARRAY['interest', 'withdrawals', 'transfers']),
('IRA', 'Individual Retirement Account', 0, '{"annual_fee": 25}', ARRAY['tax_advantaged', 'retirement_planning']),
('Crypto', 'Cryptocurrency trading account', 0, '{"trading_fee": 0.1}', ARRAY['crypto_trading', 'wallet']);

-- Insert some sample securities
INSERT INTO securities (symbol, name, type, exchange, sector, industry) VALUES
('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', 'Technology', 'Internet'),
('TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', 'Consumer Discretionary', 'Electric Vehicles'),
('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', 'Diversified', 'Index Fund'),
('QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ', 'Technology', 'Index Fund'),
('BTC', 'Bitcoin', 'crypto', 'CRYPTO', 'Cryptocurrency', 'Digital Currency'),
('ETH', 'Ethereum', 'crypto', 'CRYPTO', 'Cryptocurrency', 'Digital Currency');
