-- Migration to add support for user-generated API keys

-- Create a table to store user API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    public_key VARCHAR(64) UNIQUE NOT NULL, -- The part of the key the user will use to identify it
    secret_key_hash VARCHAR(255) NOT NULL, -- A bcrypt hash of the secret key
    permissions JSONB, -- e.g., { "can_trade": true, "can_withdraw": false }
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_public_key ON user_api_keys(public_key);
