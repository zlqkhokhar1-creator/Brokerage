-- Migration to add a comprehensive audit trail system
-- This table will log key events and actions across the platform

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL, -- e.g., 'LOGIN', 'PLACE_ORDER', 'UPDATE_PROFILE'
  details JSONB, -- Details of the action, e.g., order details, IP address
  status VARCHAR(50) NOT NULL, -- 'SUCCESS' or 'FAILURE'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
