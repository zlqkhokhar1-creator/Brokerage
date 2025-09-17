-- Migration to add support for Device and Session Management

-- 1. Create a table to store active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- This will store the JWT ID (jti) to link the session to a specific token
    jwt_id VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create a table to act as a "deny list" for revoked JWTs
-- When a user logs out or invalidates a session, the JWT ID is added here.
CREATE TABLE IF NOT EXISTS jwt_deny_list (
    jwt_id VARCHAR(255) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_jwt_deny_list_expires_at ON jwt_deny_list(expires_at);
