-- Migration to add support for Two-Factor Authentication (2FA)

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
    ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT FALSE;
