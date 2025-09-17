-- Migration to add a 'current_challenge' column to the users table for WebAuthn

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS current_challenge TEXT;
