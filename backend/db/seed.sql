-- Seed data for InvestPro brokerage platform

-- Insert sample market data for securities
INSERT INTO market_data (security_id, price, volume, open_price, high_price, low_price, previous_close, change_amount, change_percentage) VALUES
-- Apple Inc.
(1, 175.43, 45678900, 173.28, 176.15, 172.50, 173.28, 2.15, 1.24),
-- Microsoft Corp.
(2, 378.85, 23456700, 380.10, 381.25, 377.50, 380.10, -1.25, -0.33),
-- Alphabet Inc.
(3, 142.56, 34567800, 139.11, 143.20, 138.75, 139.11, 3.45, 2.48),
-- Tesla Inc.
(4, 248.12, 56789000, 253.79, 255.30, 246.80, 253.79, -5.67, -2.23),
-- SPDR S&P 500 ETF
(5, 445.67, 67890100, 444.44, 446.20, 443.10, 444.44, 1.23, 0.28),
-- Invesco QQQ Trust
(6, 385.42, 45678900, 383.15, 386.80, 382.50, 383.15, 2.27, 0.59),
-- Bitcoin
(7, 43250.75, 1234567890, 42800.50, 43800.25, 42500.00, 42800.50, 450.25, 1.05),
-- Ethereum
(8, 2650.30, 987654321, 2580.75, 2680.50, 2560.25, 2580.75, 69.55, 2.70);

-- Insert sample users (for demo purposes)
INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, nationality, address_line1, city, state, postal_code, country, kyc_status, risk_profile, investment_goals, annual_income, net_worth, email_verified, phone_verified) VALUES
('demo@investpro.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5QZ8K2O', 'John', 'Doe', '+1-555-0123', '1985-06-15', 'USA', '123 Main Street', 'New York', 'NY', '10001', 'USA', 'approved', 'moderate', ARRAY['Retirement Planning', 'Wealth Building'], 75000.00, 150000.00, true, true),
('jane.smith@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5QZ8K2O', 'Jane', 'Smith', '+1-555-0124', '1990-03-22', 'USA', '456 Oak Avenue', 'San Francisco', 'CA', '94102', 'USA', 'approved', 'aggressive', ARRAY['Wealth Building', 'Tax Optimization'], 120000.00, 250000.00, true, true),
('mike.wilson@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5QZ8K2O', 'Mike', 'Wilson', '+1-555-0125', '1978-11-08', 'USA', '789 Pine Street', 'Chicago', 'IL', '60601', 'USA', 'in_review', 'conservative', ARRAY['Retirement Planning', 'Emergency Fund'], 95000.00, 200000.00, true, false);

-- Insert sample accounts for users
INSERT INTO accounts (user_id, account_type_id, account_number, balance, available_balance, currency, status) VALUES
(1, 1, 'ACC123456789', 125430.50, 125430.50, 'USD', 'active'),
(1, 2, 'SAV123456789', 25000.00, 25000.00, 'USD', 'active'),
(2, 1, 'ACC987654321', 87520.25, 87520.25, 'USD', 'active'),
(2, 3, 'IRA987654321', 50000.00, 50000.00, 'USD', 'active'),
(3, 1, 'ACC456789123', 45000.00, 45000.00, 'USD', 'active');

-- Insert sample portfolios
INSERT INTO portfolios (user_id, name, description, strategy, risk_level, target_return, rebalance_frequency, is_active) VALUES
(1, 'Main Portfolio', 'Primary investment portfolio for long-term growth', 'manual', 'moderate', 8.5, 'quarterly', true),
(1, 'Tech Growth', 'Technology-focused growth portfolio', 'manual', 'aggressive', 12.0, 'monthly', true),
(2, 'Retirement Fund', 'Conservative retirement savings portfolio', 'robo', 'conservative', 6.0, 'annually', true),
(2, 'High Growth', 'Aggressive growth portfolio for wealth building', 'manual', 'aggressive', 15.0, 'monthly', true),
(3, 'Conservative Portfolio', 'Low-risk income-focused portfolio', 'robo', 'conservative', 5.0, 'quarterly', true);

-- Insert sample portfolio holdings
INSERT INTO portfolio_holdings (portfolio_id, security_id, quantity, average_cost) VALUES
-- Main Portfolio holdings
(1, 1, 100, 150.00),  -- Apple
(1, 2, 50, 350.00),   -- Microsoft
(1, 5, 200, 420.00),  -- SPY ETF
-- Tech Growth portfolio holdings
(2, 1, 200, 140.00),  -- Apple
(2, 2, 100, 320.00),  -- Microsoft
(2, 3, 150, 120.00),  -- Google
(2, 4, 50, 200.00),   -- Tesla
-- Retirement Fund holdings
(3, 5, 500, 400.00),  -- SPY ETF
(3, 6, 300, 350.00),  -- QQQ ETF
-- High Growth portfolio holdings
(4, 1, 300, 130.00),  -- Apple
(4, 2, 150, 300.00),  -- Microsoft
(4, 3, 200, 110.00),  -- Google
(4, 4, 100, 180.00),  -- Tesla
(4, 7, 2.5, 40000.00), -- Bitcoin
-- Conservative Portfolio holdings
(5, 5, 1000, 380.00), -- SPY ETF
(5, 6, 500, 320.00);  -- QQQ ETF

-- Insert sample orders
INSERT INTO orders (user_id, portfolio_id, security_id, order_type, side, quantity, price, status, filled_quantity, average_fill_price, time_in_force, created_at) VALUES
(1, 1, 1, 'market', 'buy', 50, NULL, 'filled', 50, 150.00, 'GTC', NOW() - INTERVAL '7 days'),
(1, 1, 2, 'limit', 'buy', 25, 350.00, 'filled', 25, 350.00, 'GTC', NOW() - INTERVAL '5 days'),
(1, 1, 5, 'market', 'buy', 100, NULL, 'filled', 100, 420.00, 'GTC', NOW() - INTERVAL '3 days'),
(2, 3, 5, 'market', 'buy', 200, NULL, 'filled', 200, 400.00, 'GTC', NOW() - INTERVAL '10 days'),
(2, 4, 1, 'limit', 'buy', 100, 140.00, 'filled', 100, 140.00, 'GTC', NOW() - INTERVAL '8 days'),
(3, 5, 5, 'market', 'buy', 500, NULL, 'filled', 500, 380.00, 'GTC', NOW() - INTERVAL '15 days');

-- Insert sample trades
INSERT INTO trades (order_id, user_id, security_id, quantity, price, side, commission, fees, net_amount, executed_at) VALUES
(1, 1, 1, 50, 150.00, 'buy', 0.99, 0.00, 7500.99, NOW() - INTERVAL '7 days'),
(2, 1, 2, 25, 350.00, 'buy', 0.99, 0.00, 8750.99, NOW() - INTERVAL '5 days'),
(3, 1, 5, 100, 420.00, 'buy', 0.99, 0.00, 42000.99, NOW() - INTERVAL '3 days'),
(4, 2, 5, 200, 400.00, 'buy', 0.99, 0.00, 80000.99, NOW() - INTERVAL '10 days'),
(5, 2, 1, 100, 140.00, 'buy', 0.99, 0.00, 14000.99, NOW() - INTERVAL '8 days'),
(6, 3, 5, 500, 380.00, 'buy', 0.99, 0.00, 190000.99, NOW() - INTERVAL '15 days');

-- Insert sample transactions
INSERT INTO transactions (user_id, account_id, type, amount, currency, description, status, created_at) VALUES
(1, 1, 'deposit', 100000.00, 'USD', 'Initial deposit', 'completed', NOW() - INTERVAL '30 days'),
(1, 1, 'deposit', 25000.00, 'USD', 'Additional deposit', 'completed', NOW() - INTERVAL '15 days'),
(2, 3, 'deposit', 150000.00, 'USD', 'Initial deposit', 'completed', NOW() - INTERVAL '25 days'),
(2, 3, 'deposit', 50000.00, 'USD', 'Additional deposit', 'completed', NOW() - INTERVAL '10 days'),
(3, 5, 'deposit', 75000.00, 'USD', 'Initial deposit', 'completed', NOW() - INTERVAL '20 days');

-- Insert sample watchlists
INSERT INTO watchlists (user_id, name, is_default) VALUES
(1, 'My Watchlist', true),
(1, 'Tech Stocks', false),
(2, 'My Watchlist', true),
(2, 'Growth Stocks', false),
(3, 'My Watchlist', true);

-- Insert sample watchlist securities
INSERT INTO watchlist_securities (watchlist_id, security_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 5),  -- User 1's default watchlist
(2, 1), (2, 2), (2, 3), (2, 4),  -- User 1's tech watchlist
(3, 1), (3, 2), (3, 5), (3, 6),  -- User 2's default watchlist
(4, 1), (4, 2), (4, 3), (4, 4),  -- User 2's growth watchlist
(5, 5), (5, 6);                   -- User 3's conservative watchlist

-- Insert sample alerts
INSERT INTO alerts (user_id, security_id, type, condition_value, condition_text, is_active) VALUES
(1, 1, 'price_above', 180.00, 'Apple stock above $180', true),
(1, 2, 'price_below', 350.00, 'Microsoft stock below $350', true),
(2, 4, 'price_above', 300.00, 'Tesla stock above $300', true),
(2, 7, 'price_below', 40000.00, 'Bitcoin below $40,000', true);

-- Insert system settings
INSERT INTO system_settings (key, value, description) VALUES
('trading_hours', '{"start": "09:30", "end": "16:00", "timezone": "America/New_York"}', 'Market trading hours'),
('commission_rate', '0.99', 'Default commission per trade'),
('min_order_amount', '1.00', 'Minimum order amount in USD'),
('max_order_amount', '1000000.00', 'Maximum order amount in USD'),
('supported_currencies', '["USD", "EUR", "GBP", "CAD", "AUD"]', 'Supported trading currencies'),
('kyc_required_amount', '10000.00', 'KYC required for deposits above this amount'),
('daily_trading_limit', '50000.00', 'Daily trading limit per user'),
('api_rate_limit', '1000', 'API requests per 15 minutes per IP');

-- Update account balances based on transactions
UPDATE accounts SET balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN type IN ('deposit', 'transfer_in', 'dividend', 'interest', 'refund') THEN amount
            WHEN type IN ('withdrawal', 'transfer_out', 'fee') THEN -amount
            ELSE 0
        END
    ), 0)
    FROM transactions 
    WHERE account_id = accounts.id
);

-- Update available balance to match balance for now
UPDATE accounts SET available_balance = balance;

-- Create some sample market data history (last 30 days)
INSERT INTO market_data (security_id, price, volume, open_price, high_price, low_price, previous_close, change_amount, change_percentage, timestamp)
SELECT 
    security_id,
    price + (RANDOM() - 0.5) * price * 0.05, -- Random price within 5% of current
    volume + (RANDOM() - 0.5) * volume * 0.3, -- Random volume within 30% of current
    price + (RANDOM() - 0.5) * price * 0.02,
    price + (RANDOM() - 0.5) * price * 0.03,
    price + (RANDOM() - 0.5) * price * 0.02,
    price + (RANDOM() - 0.5) * price * 0.01,
    (RANDOM() - 0.5) * price * 0.02,
    (RANDOM() - 0.5) * 2.0,
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM market_data 
WHERE timestamp = (SELECT MAX(timestamp) FROM market_data)
CROSS JOIN generate_series(1, 30);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Update statistics
ANALYZE;