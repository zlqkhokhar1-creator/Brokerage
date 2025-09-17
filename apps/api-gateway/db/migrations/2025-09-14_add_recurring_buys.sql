-- Migration to add support for Recurring Buys

-- Define an enum for the frequency of recurring buys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_frequency_enum') THEN
        CREATE TYPE recurring_frequency_enum AS ENUM (
            'daily',
            'weekly',
            'biweekly',
            'monthly'
        );
    END IF;
END$$;

-- Create a table to store the recurring buy schedules
CREATE TABLE IF NOT EXISTS recurring_buys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    frequency recurring_frequency_enum NOT NULL,
    next_execution_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_buys_user_id ON recurring_buys(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_buys_next_execution_date ON recurring_buys(next_execution_date);
