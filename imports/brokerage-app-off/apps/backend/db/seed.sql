-- Insert sample users
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES 
  ('demo@example.com', '$2b$10$dummyhashfordemo12345', 'Demo', 'User'),
  ('test@example.com', '$2b$10$dummyhashfortest12345', 'Test', 'User')
ON CONFLICT (email) DO NOTHING;

-- Insert sample securities
INSERT INTO securities (symbol, name, current_price)
VALUES 
  ('AAPL', 'Apple Inc.', 175.50),
  ('MSFT', 'Microsoft Corporation', 350.25),
  ('GOOGL', 'Alphabet Inc.', 138.75),
  ('AMZN', 'Amazon.com Inc.', 142.80),
  ('TSLA', 'Tesla, Inc.', 250.75)
ON CONFLICT (symbol) DO NOTHING;

-- Create accounts for users
INSERT INTO accounts (user_id, account_type, balance)
SELECT u.id, 'trading', 10000.00
FROM users u
WHERE u.email IN ('demo@example.com', 'test@example.com')
ON CONFLICT DO NOTHING;