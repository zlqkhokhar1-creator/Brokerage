-- Migration to add support for Fractional Share Trading

-- Alter the portfolio_holdings table to allow for decimal quantities
ALTER TABLE IF EXISTS portfolio_holdings
    ALTER COLUMN quantity TYPE DECIMAL(18, 8);

-- Alter the orders table to allow for decimal quantities
ALTER TABLE IF EXISTS orders
    ALTER COLUMN quantity TYPE DECIMAL(18, 8);
