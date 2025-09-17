-- Migration to add new order types and related columns

-- First, add the new enum types if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type_enum') THEN
        CREATE TYPE order_type_enum AS ENUM (
            'MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 
            'TRAILING_STOP', 'OCO'
        );
    ELSE
        ALTER TYPE order_type_enum ADD VALUE IF NOT EXISTS 'TRAILING_STOP';
        ALTER TYPE order_type_enum ADD VALUE IF NOT EXISTS 'OCO';
    END IF;
END$$;

-- Alter the orders table to use the new enum and add columns for new order types
ALTER TABLE IF EXISTS orders
  ALTER COLUMN order_type TYPE order_type_enum USING order_type::order_type_enum,
  ADD COLUMN IF NOT EXISTS trail_price_offset DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS trail_percent_offset DECIMAL(8, 4),
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS child_order_type VARCHAR(50); -- To distinguish between the two legs of an OCO order
