-- Migration 0007: Enhanced Users and Refresh Tokens
-- Adds Argon2id password hash metadata and refresh token support
-- Checksum: users-argon2id-refresh-tokens

BEGIN;

-- Add Argon2id metadata columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hash_alg VARCHAR(20) DEFAULT 'argon2id',
ADD COLUMN IF NOT EXISTS hash_params_json JSONB DEFAULT '{"timeCost": 3, "memoryCost": 65536, "parallelism": 1}';

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure unique index on users.email (may already exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

-- Composite index on refresh_tokens for active token lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active 
ON refresh_tokens(user_id, revoked_at NULLS FIRST);

-- Index on token_hash for validation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

COMMIT;