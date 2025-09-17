-- Migration to add support for Social and Copy Trading

-- 1. Enhance the users table for public profiles
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nickname VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS trading_strategy_bio TEXT;

-- 2. Create a table to manage follower relationships
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id)
);

-- 3. Create a table to manage copy trading subscriptions
CREATE TABLE IF NOT EXISTS copy_trading_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- The fixed amount or percentage of the trader's volume to copy
    copy_amount_fixed DECIMAL(15, 2),
    -- Constraint to ensure only one copy strategy is chosen
    CONSTRAINT check_copy_strategy CHECK (copy_amount_fixed IS NOT NULL),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subscriber_id, trader_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_id ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_subscriber_id ON copy_trading_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_trader_id ON copy_trading_subscriptions(trader_id);
