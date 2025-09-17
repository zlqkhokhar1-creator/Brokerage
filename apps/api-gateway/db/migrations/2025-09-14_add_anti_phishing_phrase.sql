-- Migration to add support for an Anti-Phishing Security Phrase

ALTER TABLE users
ADD COLUMN IF NOT EXISTS security_phrase VARCHAR(100);
