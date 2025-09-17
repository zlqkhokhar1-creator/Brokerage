-- Migration: Enable Extensions
-- Version: 0001
-- Checksum placeholder: SHA256 will be calculated by migration runner

BEGIN;

-- Enable pgcrypto extension for UUID generation and cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- TODO: pgvector extension will be enabled in PR10 migration
-- CREATE EXTENSION IF NOT EXISTS vector;

COMMIT;