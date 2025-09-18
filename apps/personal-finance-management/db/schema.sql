-- Personal Finance Management Database Schema
-- Comprehensive schema for Pakistani users with AI-powered features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Users table (extends existing users table)
CREATE TABLE IF NOT EXISTS pfm_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code VARCHAR(3) DEFAULT 'PK',
    currency VARCHAR(3) DEFAULT 'PKR',
    timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
    language VARCHAR(5) DEFAULT 'en',
    financial_goals JSONB,
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    investment_horizon INTEGER, -- in months
    monthly_income DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense categories (Pakistani-specific)
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_urdu VARCHAR(100),
    description TEXT,
    parent_id UUID REFERENCES expense_categories(id),
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Income categories
CREATE TABLE IF NOT EXISTS income_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_urdu VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    budget_type VARCHAR(20) CHECK (budget_type IN ('monthly', 'yearly', 'weekly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PKR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget categories (many-to-many relationship)
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(budget_id, category_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES expense_categories(id),
    income_category_id UUID REFERENCES income_categories(id),
    description TEXT,
    merchant_name VARCHAR(200),
    merchant_address TEXT,
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(50),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- AI categorization fields
    ai_categorized BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2),
    ai_category_suggestions JSONB,
    -- SMS parsing fields
    sms_source VARCHAR(20),
    sms_raw_text TEXT,
    sms_parsed_data JSONB,
    -- Receipt scanning fields
    receipt_image_url TEXT,
    receipt_ocr_data JSONB,
    -- Duplicate detection
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_group_id UUID,
    -- Location data
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_name VARCHAR(200)
);

-- Financial goals
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment plans
CREATE TABLE IF NOT EXISTS investment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    plan_name VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL,
    monthly_contribution DECIMAL(15,2) NOT NULL,
    risk_level VARCHAR(20) CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
    investment_horizon INTEGER, -- in months
    expected_return DECIMAL(5,2), -- percentage
    actual_return DECIMAL(5,2),
    status VARCHAR(20) CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment allocations
CREATE TABLE IF NOT EXISTS investment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES investment_plans(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- stocks, bonds, mutual_funds, etfs, etc.
    asset_name VARCHAR(200) NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    current_value DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS templates for parsing
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name VARCHAR(100) NOT NULL,
    template_regex TEXT NOT NULL,
    amount_group INTEGER,
    merchant_group INTEGER,
    balance_group INTEGER,
    date_group INTEGER,
    transaction_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Merchant database for Pakistani businesses
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_urdu VARCHAR(200),
    category_id UUID REFERENCES expense_categories(id),
    subcategory VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    payment_methods TEXT[], -- array of payment methods
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI model training data
CREATE TABLE IF NOT EXISTS ai_training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    text_data TEXT NOT NULL,
    category_id UUID REFERENCES expense_categories(id),
    confidence_score DECIMAL(3,2),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial health scores
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    spending_score INTEGER CHECK (spending_score >= 0 AND spending_score <= 100),
    saving_score INTEGER CHECK (saving_score >= 0 AND saving_score <= 100),
    investment_score INTEGER CHECK (investment_score >= 0 AND investment_score <= 100),
    debt_score INTEGER CHECK (debt_score >= 0 AND debt_score <= 100),
    score_breakdown JSONB,
    recommendations JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications and alerts
CREATE TABLE IF NOT EXISTS pfm_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and reports
CREATE TABLE IF NOT EXISTS pfm_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pfm_users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_name);
CREATE INDEX IF NOT EXISTS idx_transactions_ai_categorized ON transactions(ai_categorized);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON financial_goals(status);

CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(name);
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category_id);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON merchants(city);

CREATE INDEX IF NOT EXISTS idx_sms_templates_bank ON sms_templates(bank_name);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_transactions_description_fts ON transactions USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_merchants_name_fts ON merchants USING gin(to_tsvector('english', name));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pfm_users_updated_at BEFORE UPDATE ON pfm_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON financial_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investment_plans_updated_at BEFORE UPDATE ON investment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories for Pakistani users
INSERT INTO expense_categories (name, name_urdu, description, icon, color) VALUES
('Food & Dining', 'کھانا اور ڈائننگ', 'Restaurants, groceries, food delivery', '🍽️', '#FF6B6B'),
('Transportation', 'ٹرانسپورٹ', 'Fuel, public transport, ride sharing', '🚗', '#4ECDC4'),
('Utilities', 'یوٹیلٹیز', 'Electricity, gas, water, internet', '⚡', '#45B7D1'),
('Healthcare', 'صحت', 'Medical expenses, pharmacy, doctor visits', '🏥', '#96CEB4'),
('Education', 'تعلیم', 'School fees, books, courses', '📚', '#FFEAA7'),
('Entertainment', 'تفریح', 'Movies, games, subscriptions', '🎬', '#DDA0DD'),
('Shopping', 'خریداری', 'Clothing, electronics, general shopping', '🛍️', '#98D8C8'),
('Housing', 'رہائش', 'Rent, mortgage, maintenance', '🏠', '#F7DC6F'),
('Insurance', 'انشورنس', 'Health, life, car insurance', '🛡️', '#BB8FCE'),
('Savings', 'بچت', 'Emergency fund, savings goals', '💰', '#85C1E9'),
('Investments', 'سرمایہ کاری', 'Stocks, mutual funds, bonds', '📈', '#F8C471'),
('Charity', 'خیرات', 'Donations, zakat, charity', '🤲', '#82E0AA'),
('Travel', 'سفر', 'Vacation, business travel', '✈️', '#F1948A'),
('Personal Care', 'ذاتی دیکھ بھال', 'Grooming, cosmetics, wellness', '💄', '#FADBD8'),
('Communication', 'مواصلات', 'Phone bills, internet, postage', '📱', '#AED6F1'),
('Other', 'دیگر', 'Miscellaneous expenses', '📦', '#D5DBDB')
ON CONFLICT DO NOTHING;

-- Insert default income categories
INSERT INTO income_categories (name, name_urdu, description, icon, color) VALUES
('Salary', 'تنخواہ', 'Monthly salary from employment', '💼', '#2ECC71'),
('Business Income', 'کاروباری آمدنی', 'Income from business or freelancing', '🏢', '#3498DB'),
('Investment Returns', 'سرمایہ کاری کا منافع', 'Dividends, interest, capital gains', '📊', '#9B59B6'),
('Rental Income', 'کرایہ کی آمدنی', 'Income from property rental', '🏘️', '#E67E22'),
('Side Hustle', 'اضافی کام', 'Part-time work, gig economy', '⚡', '#1ABC9C'),
('Government Benefits', 'حکومتی فوائد', 'Pension, social security, benefits', '🏛️', '#34495E'),
('Gifts & Inheritance', 'تحفے اور وراثت', 'Gifts, inheritance, windfalls', '🎁', '#E74C3C'),
('Other Income', 'دیگر آمدنی', 'Miscellaneous income sources', '💰', '#95A5A6')
ON CONFLICT DO NOTHING;

-- Insert SMS templates for Pakistani banks
INSERT INTO sms_templates (bank_name, template_regex, amount_group, merchant_group, balance_group, date_group, transaction_type) VALUES
('HBL', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*debited.*at\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense'),
('UBL', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*debited.*at\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense'),
('MCB', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*debited.*at\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense'),
('Bank Alfalah', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*debited.*at\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense'),
('JazzCash', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*paid.*to\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense'),
('EasyPaisa', '.*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s*paid.*to\\s+(.+?)\\s*on\\s+(\\d{2}-\\d{2}-\\d{4}).*Bal\\s*Rs\\.?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?).*', 1, 2, 4, 3, 'expense')
ON CONFLICT DO NOTHING;
