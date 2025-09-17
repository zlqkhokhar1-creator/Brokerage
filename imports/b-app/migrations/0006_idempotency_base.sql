-- Migration: Idempotency Keys Table
-- Version: 0006
-- Checksum placeholder: SHA256 will be calculated by migration runner

BEGIN;

-- Idempotency keys for preventing duplicate requests
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  request_hash TEXT NOT NULL,
  response_data JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for idempotency key operations
CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
CREATE INDEX idx_idempotency_keys_status ON idempotency_keys(status);

COMMIT;