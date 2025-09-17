-- Migration to create the foundational schema for the Algorithmic Trading Framework

-- Define an enum for the supported algorithmic strategies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'algo_strategy_enum') THEN
        CREATE TYPE algo_strategy_enum AS ENUM (
            'TWAP' -- Time-Weighted Average Price
            -- VWAP can be added later: 'VWAP' -- Volume-Weighted Average Price
        );
    END IF;
END$$;

-- Create the main table for parent algorithmic orders
CREATE TABLE IF NOT EXISTS algo_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    symbol VARCHAR(10) NOT NULL,
    side order_side_enum NOT NULL,
    total_quantity DECIMAL(16, 6) NOT NULL,
    filled_quantity DECIMAL(16, 6) DEFAULT 0,
    strategy algo_strategy_enum NOT NULL,
    parameters JSONB, -- e.g., { "duration": "4h", "sliceInterval": "5m" }
    status order_status_enum DEFAULT 'pending',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a foreign key to the existing orders table to link child orders to the parent algo order
ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS algo_order_id UUID REFERENCES algo_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_algo_orders_user_id ON algo_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_algo_orders_status ON algo_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_algo_order_id ON orders(algo_order_id);
