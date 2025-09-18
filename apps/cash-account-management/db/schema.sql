-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Currency rates table for multi-currency support
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(15,8) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'SBP', 'XE', 'FIXER', 'MANUAL'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(base_currency, target_currency, rate_date)
);

-- Payment providers configuration
CREATE TABLE IF NOT EXISTS payment_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    provider_code VARCHAR(50) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- 'BANK', 'DIGITAL_WALLET', 'CARD_PROCESSOR', 'GOVERNMENT'
    country VARCHAR(3) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB, -- Provider-specific configuration
    api_endpoints JSONB, -- API endpoints for different operations
    supported_operations JSONB, -- ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']
    limits JSONB, -- Transaction limits
    fees JSONB, -- Fee structure
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User cash accounts - Universal for all trading
CREATE TABLE IF NOT EXISTS cash_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Multi-currency balances
    pkr_balance DECIMAL(15,2) DEFAULT 0,
    usd_balance DECIMAL(15,2) DEFAULT 0,
    eur_balance DECIMAL(15,2) DEFAULT 0,
    gbp_balance DECIMAL(15,2) DEFAULT 0,
    cad_balance DECIMAL(15,2) DEFAULT 0,
    aud_balance DECIMAL(15,2) DEFAULT 0,
    
    -- Pending and reserved balances
    pkr_pending DECIMAL(15,2) DEFAULT 0,
    usd_pending DECIMAL(15,2) DEFAULT 0,
    eur_pending DECIMAL(15,2) DEFAULT 0,
    gbp_pending DECIMAL(15,2) DEFAULT 0,
    cad_pending DECIMAL(15,2) DEFAULT 0,
    aud_pending DECIMAL(15,2) DEFAULT 0,
    
    pkr_reserved DECIMAL(15,2) DEFAULT 0,
    usd_reserved DECIMAL(15,2) DEFAULT 0,
    eur_reserved DECIMAL(15,2) DEFAULT 0,
    gbp_reserved DECIMAL(15,2) DEFAULT 0,
    cad_reserved DECIMAL(15,2) DEFAULT 0,
    aud_reserved DECIMAL(15,2) DEFAULT 0,
    
    -- Account settings
    base_currency VARCHAR(3) DEFAULT 'PKR',
    account_type VARCHAR(20) DEFAULT 'individual', -- individual, corporate, institutional
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, closed, restricted
    
    -- Pakistani specific fields
    cnic VARCHAR(15),
    cnic_verified BOOLEAN DEFAULT false,
    iban VARCHAR(34),
    raast_enabled BOOLEAN DEFAULT false,
    
    -- International fields
    tax_id VARCHAR(50),
    tax_id_verified BOOLEAN DEFAULT false,
    kyc_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected, expired
    aml_status VARCHAR(20) DEFAULT 'pending', -- pending, cleared, flagged, blocked
    
    -- Account limits
    daily_deposit_limit DECIMAL(15,2) DEFAULT 1000000,
    daily_withdrawal_limit DECIMAL(15,2) DEFAULT 1000000,
    monthly_deposit_limit DECIMAL(15,2) DEFAULT 10000000,
    monthly_withdrawal_limit DECIMAL(15,2) DEFAULT 10000000,
    max_balance_limit DECIMAL(15,2) DEFAULT 100000000,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts for deposits/withdrawals
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    
    -- Bank details
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20),
    bank_country VARCHAR(3) NOT NULL,
    bank_currency VARCHAR(3) NOT NULL,
    
    -- Account information
    account_holder_name VARCHAR(100) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- checking, savings, current, business
    
    -- International banking
    iban VARCHAR(34),
    swift_code VARCHAR(11),
    routing_number VARCHAR(20),
    sort_code VARCHAR(10),
    
    -- Pakistani specific
    cnic VARCHAR(15),
    branch_code VARCHAR(10),
    branch_name VARCHAR(100),
    
    -- Verification and status
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    verification_method VARCHAR(50), -- 'MANUAL', 'AUTOMATED', 'THIRD_PARTY'
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Payment provider integration
    payment_provider_id UUID REFERENCES payment_providers(id),
    provider_account_id VARCHAR(100),
    provider_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Digital wallets (JazzCash, EasyPaisa, etc.)
CREATE TABLE IF NOT EXISTS user_digital_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    
    -- Wallet details
    wallet_provider VARCHAR(50) NOT NULL, -- JAZZCASH, EASYPAISA, PAYPAL, STRIPE, etc.
    wallet_type VARCHAR(20) NOT NULL, -- MOBILE, DIGITAL, CRYPTO
    wallet_id VARCHAR(100) NOT NULL,
    wallet_name VARCHAR(100),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Provider integration
    payment_provider_id UUID REFERENCES payment_providers(id),
    provider_wallet_id VARCHAR(100),
    provider_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- All trading transactions (stocks, ETFs, mutual funds, bonds, crypto, etc.)
CREATE TABLE IF NOT EXISTS trading_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    
    -- Transaction details
    transaction_type VARCHAR(10) NOT NULL, -- BUY, SELL
    asset_type VARCHAR(20) NOT NULL, -- STOCK, ETF, MUTUAL_FUND, BOND, CRYPTO, COMMODITY, FOREX
    asset_symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    asset_isin VARCHAR(12),
    asset_cusip VARCHAR(9),
    
    -- Quantity and pricing
    quantity DECIMAL(15,4) NOT NULL,
    price_per_unit DECIMAL(15,4) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Fees and taxes
    commission DECIMAL(10,2) DEFAULT 0,
    commission_currency VARCHAR(3),
    taxes DECIMAL(10,2) DEFAULT 0,
    tax_currency VARCHAR(3),
    exchange_fees DECIMAL(10,2) DEFAULT 0,
    regulatory_fees DECIMAL(10,2) DEFAULT 0,
    other_fees DECIMAL(10,2) DEFAULT 0,
    total_fees DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Transaction status
    status VARCHAR(20) DEFAULT 'pending', -- pending, executed, settled, cancelled, failed, partial
    order_id VARCHAR(100),
    execution_id VARCHAR(100),
    settlement_date DATE,
    settlement_currency VARCHAR(3),
    
    -- Market information
    market VARCHAR(20) NOT NULL, -- PSX, NYSE, NASDAQ, LSE, etc.
    exchange VARCHAR(50),
    trading_session VARCHAR(20), -- REGULAR, PRE_MARKET, AFTER_HOURS
    
    -- Pakistani market specific
    psx_symbol VARCHAR(20),
    psx_sector VARCHAR(50),
    psx_board VARCHAR(20), -- MAIN, SME, GEM
    
    -- International market specific
    bloomberg_ticker VARCHAR(20),
    reuters_ticker VARCHAR(20),
    yahoo_ticker VARCHAR(20),
    
    -- Execution details
    execution_price DECIMAL(15,4),
    execution_time TIMESTAMP,
    execution_venue VARCHAR(50),
    execution_algorithm VARCHAR(50),
    
    -- Compliance
    compliance_checked BOOLEAN DEFAULT false,
    aml_checked BOOLEAN DEFAULT false,
    regulatory_approved BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    settled_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash transactions (deposits, withdrawals, transfers)
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- DEPOSIT, WITHDRAWAL, TRANSFER, REFUND, ADJUSTMENT
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    base_currency_amount DECIMAL(15,2), -- Amount in account's base currency
    
    -- Payment method and provider
    payment_method VARCHAR(50) NOT NULL, -- RAAST, BANK_TRANSFER, WIRE, ACH, CARD, DIGITAL_WALLET
    payment_provider_id UUID REFERENCES payment_providers(id),
    payment_provider VARCHAR(50),
    
    -- Bank account reference
    bank_account_id UUID REFERENCES user_bank_accounts(id),
    digital_wallet_id UUID REFERENCES user_digital_wallets(id),
    
    -- Transaction references
    external_transaction_id VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    provider_reference VARCHAR(100),
    bank_reference VARCHAR(100),
    internal_reference VARCHAR(100),
    
    -- Pakistani payment integration
    raast_transaction_id VARCHAR(100),
    raast_reference VARCHAR(100),
    raast_status VARCHAR(20),
    
    -- International payment integration
    swift_reference VARCHAR(100),
    ach_reference VARCHAR(100),
    card_transaction_id VARCHAR(100),
    
    -- Processing details
    processing_fee DECIMAL(10,2) DEFAULT 0,
    exchange_rate DECIMAL(15,8),
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Status and processing
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled, refunded
    processing_status VARCHAR(50), -- INITIATED, SENT, RECEIVED, PROCESSED, SETTLED
    failure_reason TEXT,
    
    -- Compliance and security
    compliance_checked BOOLEAN DEFAULT false,
    aml_verified BOOLEAN DEFAULT false,
    fraud_checked BOOLEAN DEFAULT false,
    risk_score DECIMAL(5,2),
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Response data
    provider_response JSONB,
    error_details JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment gateway transactions
CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    cash_transaction_id UUID REFERENCES cash_transactions(id),
    payment_provider_id UUID REFERENCES payment_providers(id),
    
    -- Gateway specific
    gateway_transaction_id VARCHAR(100) UNIQUE NOT NULL,
    gateway_reference VARCHAR(100),
    gateway_status VARCHAR(20) NOT NULL,
    
    -- Payment details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    
    -- Gateway response
    gateway_response JSONB,
    gateway_fees DECIMAL(10,2) DEFAULT 0,
    gateway_net_amount DECIMAL(15,2),
    
    -- Processing
    processing_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP
);

-- Transaction limits and compliance
CREATE TABLE IF NOT EXISTS transaction_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    
    -- Limit types
    limit_type VARCHAR(50) NOT NULL, -- DAILY_DEPOSIT, DAILY_WITHDRAWAL, MONTHLY_DEPOSIT, etc.
    currency VARCHAR(3) NOT NULL,
    limit_amount DECIMAL(15,2) NOT NULL,
    used_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) NOT NULL,
    
    -- Time period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_exceeded BOOLEAN DEFAULT false,
    exceeded_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance and AML records
CREATE TABLE IF NOT EXISTS compliance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES cash_accounts(id),
    transaction_id UUID,
    
    -- Compliance details
    compliance_type VARCHAR(50) NOT NULL, -- KYC, AML, SANCTIONS, PEP, etc.
    check_type VARCHAR(50) NOT NULL, -- ID_VERIFICATION, ADDRESS_VERIFICATION, etc.
    status VARCHAR(20) NOT NULL, -- PENDING, PASSED, FAILED, FLAGGED
    risk_level VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Check results
    check_provider VARCHAR(50),
    check_reference VARCHAR(100),
    check_score DECIMAL(5,2),
    check_details JSONB,
    
    -- Flags and alerts
    flags JSONB,
    alerts JSONB,
    notes TEXT,
    
    -- Timestamps
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Audit trail for all transactions
CREATE TABLE IF NOT EXISTS transaction_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- CASH_TRANSACTION, TRADING_TRANSACTION
    user_id UUID NOT NULL,
    account_id UUID,
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, EXECUTED, CANCELLED, etc.
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Actor information
    actor_type VARCHAR(20) NOT NULL, -- USER, SYSTEM, ADMIN, API
    actor_id UUID,
    actor_name VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_accounts_user_id ON cash_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_status ON cash_accounts(status);
CREATE INDEX IF NOT EXISTS idx_trading_transactions_user_id ON trading_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_transactions_account_id ON trading_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_trading_transactions_status ON trading_transactions(status);
CREATE INDEX IF NOT EXISTS idx_trading_transactions_asset_type ON trading_transactions(asset_type);
CREATE INDEX IF NOT EXISTS idx_trading_transactions_market ON trading_transactions(market);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_user_id ON cash_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account_id ON cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_status ON cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_currency ON cash_transactions(currency);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_user_id ON payment_gateway_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_gateway_id ON payment_gateway_transactions(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_limits_user_id ON transaction_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_limits_type ON transaction_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_compliance_records_user_id ON compliance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_status ON compliance_records(status);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id ON transaction_audit(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_user_id ON transaction_audit(user_id);

-- Insert default payment providers
INSERT INTO payment_providers (provider_name, provider_code, provider_type, country, currency, is_active, configuration, api_endpoints, supported_operations, limits, fees) VALUES
('Raast Network', 'RAAST', 'GOVERNMENT', 'PAK', 'PKR', true, 
 '{"api_base_url": "https://raast-api.sbp.gov.pk", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/deposit", "withdraw": "/withdraw", "status": "/status", "webhook": "/webhook"}',
 '["DEPOSIT", "WITHDRAWAL", "TRANSFER"]',
 '{"daily_limit": 1000000, "monthly_limit": 10000000, "max_transaction": 500000}',
 '{"deposit_fee": 0, "withdrawal_fee": 0, "transfer_fee": 0}'),

('JazzCash', 'JAZZCASH', 'DIGITAL_WALLET', 'PAK', 'PKR', true,
 '{"api_base_url": "https://api.jazzcash.com.pk", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/deposit", "withdraw": "/withdraw", "status": "/status", "webhook": "/webhook"}',
 '["DEPOSIT", "WITHDRAWAL"]',
 '{"daily_limit": 500000, "monthly_limit": 5000000, "max_transaction": 100000}',
 '{"deposit_fee": 0.01, "withdrawal_fee": 0.01, "transfer_fee": 0.01}'),

('EasyPaisa', 'EASYPAISA', 'DIGITAL_WALLET', 'PAK', 'PKR', true,
 '{"api_base_url": "https://api.easypaisa.com.pk", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/deposit", "withdraw": "/withdraw", "status": "/status", "webhook": "/webhook"}',
 '["DEPOSIT", "WITHDRAWAL"]',
 '{"daily_limit": 500000, "monthly_limit": 5000000, "max_transaction": 100000}',
 '{"deposit_fee": 0.01, "withdrawal_fee": 0.01, "transfer_fee": 0.01}'),

('Stripe', 'STRIPE', 'CARD_PROCESSOR', 'US', 'USD', true,
 '{"api_base_url": "https://api.stripe.com", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/v1/charges", "withdraw": "/v1/transfers", "status": "/v1/charges", "webhook": "/v1/webhooks"}',
 '["DEPOSIT", "WITHDRAWAL"]',
 '{"daily_limit": 10000, "monthly_limit": 100000, "max_transaction": 5000}',
 '{"deposit_fee": 0.029, "withdrawal_fee": 0.029, "transfer_fee": 0.029}'),

('PayPal', 'PAYPAL', 'DIGITAL_WALLET', 'US', 'USD', true,
 '{"api_base_url": "https://api.paypal.com", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/v1/payments", "withdraw": "/v1/payments", "status": "/v1/payments", "webhook": "/v1/notifications"}',
 '["DEPOSIT", "WITHDRAWAL"]',
 '{"daily_limit": 10000, "monthly_limit": 100000, "max_transaction": 5000}',
 '{"deposit_fee": 0.034, "withdrawal_fee": 0.034, "transfer_fee": 0.034}'),

('Wise (formerly TransferWise)', 'WISE', 'BANK', 'GB', 'USD', true,
 '{"api_base_url": "https://api.wise.com", "timeout": 30000, "retry_attempts": 3}',
 '{"deposit": "/v1/transfers", "withdraw": "/v1/transfers", "status": "/v1/transfers", "webhook": "/v1/webhooks"}',
 '["DEPOSIT", "WITHDRAWAL", "TRANSFER"]',
 '{"daily_limit": 50000, "monthly_limit": 500000, "max_transaction": 25000}',
 '{"deposit_fee": 0.004, "withdrawal_fee": 0.004, "transfer_fee": 0.004}');

-- Insert default currency rates
INSERT INTO currency_rates (base_currency, target_currency, exchange_rate, rate_date, source) VALUES
('PKR', 'USD', 0.0036, CURRENT_DATE, 'SBP'),
('USD', 'PKR', 280.0, CURRENT_DATE, 'SBP'),
('PKR', 'EUR', 0.0033, CURRENT_DATE, 'SBP'),
('EUR', 'PKR', 300.0, CURRENT_DATE, 'SBP'),
('PKR', 'GBP', 0.0028, CURRENT_DATE, 'SBP'),
('GBP', 'PKR', 350.0, CURRENT_DATE, 'SBP'),
('USD', 'EUR', 0.92, CURRENT_DATE, 'XE'),
('EUR', 'USD', 1.09, CURRENT_DATE, 'XE'),
('USD', 'GBP', 0.78, CURRENT_DATE, 'XE'),
('GBP', 'USD', 1.28, CURRENT_DATE, 'XE');
