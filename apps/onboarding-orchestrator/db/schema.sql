-- Onboarding Orchestrator Database Schema
-- This schema supports the unified onboarding system with optional cash account setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Onboarding sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    current_step VARCHAR(50) NOT NULL,
    completed_steps JSONB DEFAULT '[]',
    skipped_steps JSONB DEFAULT '[]',
    preferences JSONB DEFAULT '{}',
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    country VARCHAR(3) NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- individual, corporate, institutional
    personal_info JSONB,
    identity_verification JSONB,
    risk_assessment JSONB,
    cash_account_setup JSONB,
    trading_preferences JSONB,
    onboarding_completed_at TIMESTAMP,
    profile_status VARCHAR(20) DEFAULT 'active', -- active, suspended, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product tours table
CREATE TABLE IF NOT EXISTS product_tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_audience JSONB DEFAULT '["all"]', -- ["free", "basic", "premium", "vip", "all"]
    steps JSONB NOT NULL,
    features JSONB DEFAULT '[]', -- Required features for this tour
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User tour progress table
CREATE TABLE IF NOT EXISTS user_tour_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tour_id UUID NOT NULL REFERENCES product_tours(id),
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed, skipped
    current_step INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tour_id)
);

-- Feature tour steps table (for auto-generated steps)
CREATE TABLE IF NOT EXISTS feature_tour_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id UUID NOT NULL,
    tour_id UUID NOT NULL REFERENCES product_tours(id),
    step_data JSONB NOT NULL,
    is_auto_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding step templates table
CREATE TABLE IF NOT EXISTS onboarding_step_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- form, verification, selection, information
    component_config JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    skip_conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User onboarding preferences table
CREATE TABLE IF NOT EXISTS user_onboarding_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    skip_cash_account BOOLEAN DEFAULT false,
    skip_bank_linking BOOLEAN DEFAULT false,
    skip_trading_setup BOOLEAN DEFAULT false,
    preferred_currency VARCHAR(3) DEFAULT 'PKR',
    preferred_language VARCHAR(5) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- step_started, step_completed, step_skipped, onboarding_completed
    step_id VARCHAR(50),
    step_data JSONB,
    duration_seconds INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user_id ON user_tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_tour_id ON user_tour_progress(tour_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_status ON user_tour_progress(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event_type ON onboarding_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_timestamp ON onboarding_analytics(timestamp);

-- Insert default onboarding step templates
INSERT INTO onboarding_step_templates (step_id, name, description, required, order_index, component_type, component_config) VALUES
('welcome', 'Welcome & Introduction', 'Welcome to Invest Pro Trading Platform', true, 1, 'information', '{"title": "Welcome to Invest Pro", "content": "Let us guide you through setting up your trading account"}'),
('personal_info', 'Personal Information', 'Collect basic personal information', true, 2, 'form', '{"fields": ["first_name", "last_name", "email", "phone", "date_of_birth"]}'),
('identity_verification', 'Identity Verification', 'Verify your identity with government records', true, 3, 'verification', '{"verification_types": ["cnic", "passport", "drivers_license"]}'),
('risk_assessment', 'Risk Assessment', 'Assess your risk tolerance and investment goals', true, 4, 'form', '{"questions": ["risk_tolerance", "investment_goals", "experience_level"]}'),
('terms_acceptance', 'Terms & Conditions', 'Accept terms and conditions', true, 5, 'information', '{"require_acceptance": true}'),
('cash_account_setup', 'Cash Account Setup', 'Set up your cash account for trading', false, 6, 'selection', '{"options": ["setup_now", "skip_for_later"]}'),
('bank_account_linking', 'Bank Account Linking', 'Link your bank account for deposits/withdrawals', false, 7, 'verification', '{"verification_types": ["raast", "bank_transfer", "card"]}'),
('payment_method_setup', 'Payment Method Setup', 'Set up payment methods', false, 8, 'form', '{"methods": ["raast", "stripe", "paypal"]}'),
('trading_preferences', 'Trading Preferences', 'Configure your trading preferences', false, 9, 'form', '{"preferences": ["watchlist", "alerts", "notifications"]}'),
('watchlist_setup', 'Watchlist Setup', 'Set up your watchlist', false, 10, 'form', '{"default_stocks": ["OGDC", "PPL", "MCB"]}'),
('notification_preferences', 'Notification Preferences', 'Configure notification preferences', false, 11, 'form', '{"channels": ["email", "sms", "push"]}'),
('onboarding_complete', 'Onboarding Complete', 'Congratulations! Your account is ready', true, 12, 'information', '{"show_summary": true}');

-- Insert default product tours
INSERT INTO product_tours (name, description, target_audience, steps, features, priority) VALUES
('Welcome Tour', 'Basic platform introduction for new users', '["all"]', 
 '[{"id": "welcome", "title": "Welcome to Invest Pro", "description": "Let us show you around", "action": "click", "target_element": ".welcome-banner", "position": "center", "duration": 30}]',
 '["dashboard", "navigation"]', 100),

('Trading Basics', 'Learn the basics of trading on our platform', '["basic", "premium", "vip"]',
 '[{"id": "trading_basics", "title": "Trading Dashboard", "description": "This is your trading dashboard", "action": "click", "target_element": ".trading-dashboard", "position": "top", "duration": 45}]',
 '["trading", "dashboard", "orders"]', 90),

('Advanced Features', 'Explore advanced trading features', '["premium", "vip"]',
 '[{"id": "advanced_features", "title": "Advanced Trading", "description": "Access advanced trading tools", "action": "click", "target_element": ".advanced-trading", "position": "bottom", "duration": 60}]',
 '["advanced_trading", "algorithms", "analytics"]', 80),

('Cash Account Tour', 'Learn about cash account management', '["all"]',
 '[{"id": "cash_account", "title": "Cash Account", "description": "Manage your cash balance", "action": "click", "target_element": ".cash-account", "position": "left", "duration": 30}]',
 '["cash_account", "deposits", "withdrawals"]', 70);

-- Insert default user onboarding preferences
INSERT INTO user_onboarding_preferences (user_id, skip_cash_account, skip_bank_linking, skip_trading_setup) VALUES
('00000000-0000-0000-0000-000000000000', false, false, false);
