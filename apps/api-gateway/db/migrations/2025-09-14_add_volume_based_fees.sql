-- Migration to add support for volume-based fee tiers

-- Create a table to define the different fee tiers
CREATE TABLE IF NOT EXISTS fee_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    min_volume_30d DECIMAL(20, 2) NOT NULL,
    maker_fee_percent DECIMAL(8, 6) NOT NULL,
    taker_fee_percent DECIMAL(8, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table to track each user's rolling 30-day trading volume
CREATE TABLE IF NOT EXISTS user_trading_volume (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    volume_30d DECIMAL(20, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default fee tiers
INSERT INTO fee_tiers (tier_name, min_volume_30d, maker_fee_percent, taker_fee_percent) VALUES
    ('Tier 1', 0, 0.0010, 0.0020),
    ('Tier 2', 100000, 0.0008, 0.0018),
    ('Tier 3', 1000000, 0.0006, 0.0016),
    ('Tier 4', 10000000, 0.0004, 0.0014),
    ('Tier 5', 50000000, 0.0002, 0.0012)
ON CONFLICT DO NOTHING;
