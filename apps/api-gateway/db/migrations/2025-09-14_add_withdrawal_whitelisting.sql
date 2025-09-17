-- Migration to add support for Withdrawal Address Whitelisting & Time-locks

-- 1. Enhance the user_bank_accounts table for whitelisting and time-locks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_account_status_enum') THEN
        CREATE TYPE bank_account_status_enum AS ENUM ('pending', 'active', 'rejected');
    END IF;
END$$;

ALTER TABLE user_bank_accounts
ADD COLUMN IF NOT EXISTS status bank_account_status_enum DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. Add a foreign key constraint to fund_transactions
-- This ensures withdrawals can only be made to linked bank accounts.
ALTER TABLE fund_transactions
DROP CONSTRAINT IF EXISTS fund_transactions_bank_account_id_fkey,
ADD CONSTRAINT fund_transactions_bank_account_id_fkey
FOREIGN KEY (bank_account_id) REFERENCES user_bank_accounts(id) ON DELETE SET NULL;
