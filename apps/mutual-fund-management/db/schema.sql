-- Mutual Fund Management System Database Schema
-- This schema supports comprehensive mutual fund management functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fund Families table
CREATE TABLE fund_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    contact_email VARCHAR(255),
    founded_date DATE,
    total_assets DECIMAL(15,2),
    number_of_funds INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Categories table
CREATE TABLE fund_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    investment_style VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Subcategories table
CREATE TABLE fund_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES fund_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mutual Funds table
CREATE TABLE mutual_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    fund_family_id UUID REFERENCES fund_families(id),
    category_id UUID REFERENCES fund_categories(id),
    subcategory_id UUID REFERENCES fund_subcategories(id),
    investment_objective TEXT,
    investment_strategy TEXT,
    inception_date DATE,
    expense_ratio DECIMAL(5,4),
    management_fee DECIMAL(5,4),
    other_expenses DECIMAL(5,4),
    minimum_investment DECIMAL(15,2),
    minimum_additional_investment DECIMAL(15,2),
    redemption_fee DECIMAL(5,4),
    load_type VARCHAR(50),
    front_load DECIMAL(5,4),
    back_load DECIMAL(5,4),
    deferred_load DECIMAL(5,4),
    redemption_fee_period INTEGER, -- in days
    management_company VARCHAR(255),
    portfolio_manager VARCHAR(255),
    fund_manager_tenure INTEGER, -- in years
    is_active BOOLEAN DEFAULT true,
    is_tradeable BOOLEAN DEFAULT true,
    is_etf BOOLEAN DEFAULT false,
    is_index_fund BOOLEAN DEFAULT false,
    is_sector_fund BOOLEAN DEFAULT false,
    is_international BOOLEAN DEFAULT false,
    is_bond_fund BOOLEAN DEFAULT false,
    is_equity_fund BOOLEAN DEFAULT false,
    is_balanced_fund BOOLEAN DEFAULT false,
    is_money_market BOOLEAN DEFAULT false,
    is_target_date BOOLEAN DEFAULT false,
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Performance Data table
CREATE TABLE fund_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES mutual_funds(id),
    date DATE NOT NULL,
    nav DECIMAL(10,4) NOT NULL,
    change_amount DECIMAL(10,4),
    change_percentage DECIMAL(8,4),
    total_return_1d DECIMAL(8,4),
    total_return_1w DECIMAL(8,4),
    total_return_1m DECIMAL(8,4),
    total_return_3m DECIMAL(8,4),
    total_return_6m DECIMAL(8,4),
    total_return_1y DECIMAL(8,4),
    total_return_3y DECIMAL(8,4),
    total_return_5y DECIMAL(8,4),
    total_return_10y DECIMAL(8,4),
    total_return_ytd DECIMAL(8,4),
    total_return_since_inception DECIMAL(8,4),
    assets_under_management DECIMAL(15,2),
    shares_outstanding DECIMAL(15,2),
    dividend_yield DECIMAL(8,4),
    distribution_frequency VARCHAR(20),
    last_distribution_date DATE,
    last_distribution_amount DECIMAL(10,4),
    beta DECIMAL(8,4),
    alpha DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    standard_deviation DECIMAL(8,4),
    r_squared DECIMAL(8,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fund_id, date)
);

-- Fund Holdings table
CREATE TABLE fund_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES mutual_funds(id),
    holding_symbol VARCHAR(20),
    holding_name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    country VARCHAR(100),
    market_value DECIMAL(15,2),
    shares_held DECIMAL(15,2),
    percentage_of_fund DECIMAL(8,4),
    cost_basis DECIMAL(15,2),
    unrealized_gain_loss DECIMAL(15,2),
    as_of_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Trades table
CREATE TABLE fund_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    shares DECIMAL(15,4) NOT NULL,
    price_per_share DECIMAL(10,4) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    fees DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    trade_date DATE NOT NULL,
    settlement_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'CANCELLED', 'FAILED')),
    order_id VARCHAR(100),
    execution_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Fund Holdings table
CREATE TABLE user_fund_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    shares_owned DECIMAL(15,4) NOT NULL,
    average_cost_basis DECIMAL(10,4) NOT NULL,
    total_cost_basis DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2),
    unrealized_gain_loss DECIMAL(15,2),
    realized_gain_loss DECIMAL(15,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fund_id)
);

-- Fund Watchlists table
CREATE TABLE fund_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, fund_id)
);

-- Fund Alerts table
CREATE TABLE fund_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    alert_type VARCHAR(50) NOT NULL,
    condition_value DECIMAL(10,4),
    condition_operator VARCHAR(10) DEFAULT '>=' CHECK (condition_operator IN ('>=', '<=', '>', '<', '=', '!=')),
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Research Notes table
CREATE TABLE fund_research_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Comparisons table
CREATE TABLE fund_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    fund_ids UUID[] NOT NULL,
    comparison_criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Screens table
CREATE TABLE fund_screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    criteria JSONB NOT NULL,
    results_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP,
    is_saved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Tax Lots table
CREATE TABLE fund_tax_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    trade_id UUID REFERENCES fund_trades(id),
    shares DECIMAL(15,4) NOT NULL,
    cost_basis DECIMAL(10,4) NOT NULL,
    acquisition_date DATE NOT NULL,
    is_sold BOOLEAN DEFAULT false,
    sale_trade_id UUID REFERENCES fund_trades(id),
    sale_date DATE,
    sale_price DECIMAL(10,4),
    realized_gain_loss DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Rebalancing Plans table
CREATE TABLE fund_rebalancing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_allocation JSONB NOT NULL,
    rebalancing_frequency VARCHAR(20) DEFAULT 'quarterly',
    threshold_percentage DECIMAL(5,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    last_rebalanced_at TIMESTAMP,
    next_rebalance_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Rebalancing Actions table
CREATE TABLE fund_rebalancing_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES fund_rebalancing_plans(id),
    fund_id UUID REFERENCES mutual_funds(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('BUY', 'SELL', 'HOLD')),
    current_allocation DECIMAL(8,4),
    target_allocation DECIMAL(8,4),
    required_shares DECIMAL(15,4),
    required_amount DECIMAL(15,2),
    priority INTEGER DEFAULT 1,
    executed_at TIMESTAMP,
    trade_id UUID REFERENCES fund_trades(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Reports table
CREATE TABLE fund_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    file_path VARCHAR(500),
    file_size INTEGER,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0
);

-- Fund Notifications table
CREATE TABLE fund_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fund_id UUID REFERENCES mutual_funds(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_mutual_funds_symbol ON mutual_funds(symbol);
CREATE INDEX idx_mutual_funds_family ON mutual_funds(fund_family_id);
CREATE INDEX idx_mutual_funds_category ON mutual_funds(category_id);
CREATE INDEX idx_mutual_funds_active ON mutual_funds(is_active);
CREATE INDEX idx_mutual_funds_tradeable ON mutual_funds(is_tradeable);

CREATE INDEX idx_fund_performance_fund_date ON fund_performance(fund_id, date);
CREATE INDEX idx_fund_performance_date ON fund_performance(date);

CREATE INDEX idx_fund_holdings_fund ON fund_holdings(fund_id);
CREATE INDEX idx_fund_holdings_date ON fund_holdings(as_of_date);

CREATE INDEX idx_fund_trades_user ON fund_trades(user_id);
CREATE INDEX idx_fund_trades_fund ON fund_trades(fund_id);
CREATE INDEX idx_fund_trades_date ON fund_trades(trade_date);
CREATE INDEX idx_fund_trades_status ON fund_trades(status);

CREATE INDEX idx_user_fund_holdings_user ON user_fund_holdings(user_id);
CREATE INDEX idx_user_fund_holdings_fund ON user_fund_holdings(fund_id);

CREATE INDEX idx_fund_watchlists_user ON fund_watchlists(user_id);
CREATE INDEX idx_fund_watchlists_fund ON fund_watchlists(fund_id);

CREATE INDEX idx_fund_alerts_user ON fund_alerts(user_id);
CREATE INDEX idx_fund_alerts_fund ON fund_alerts(fund_id);
CREATE INDEX idx_fund_alerts_active ON fund_alerts(is_active);

CREATE INDEX idx_fund_research_notes_user ON fund_research_notes(user_id);
CREATE INDEX idx_fund_research_notes_fund ON fund_research_notes(fund_id);

CREATE INDEX idx_fund_comparisons_user ON fund_comparisons(user_id);

CREATE INDEX idx_fund_screens_user ON fund_screens(user_id);

CREATE INDEX idx_fund_tax_lots_user ON fund_tax_lots(user_id);
CREATE INDEX idx_fund_tax_lots_fund ON fund_tax_lots(fund_id);

CREATE INDEX idx_fund_rebalancing_plans_user ON fund_rebalancing_plans(user_id);

CREATE INDEX idx_fund_reports_user ON fund_reports(user_id);
CREATE INDEX idx_fund_reports_type ON fund_reports(report_type);

CREATE INDEX idx_fund_notifications_user ON fund_notifications(user_id);
CREATE INDEX idx_fund_notifications_read ON fund_notifications(is_read);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fund_families_updated_at BEFORE UPDATE ON fund_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_categories_updated_at BEFORE UPDATE ON fund_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_subcategories_updated_at BEFORE UPDATE ON fund_subcategories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mutual_funds_updated_at BEFORE UPDATE ON mutual_funds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_trades_updated_at BEFORE UPDATE ON fund_trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_alerts_updated_at BEFORE UPDATE ON fund_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_research_notes_updated_at BEFORE UPDATE ON fund_research_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_comparisons_updated_at BEFORE UPDATE ON fund_comparisons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_screens_updated_at BEFORE UPDATE ON fund_screens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_rebalancing_plans_updated_at BEFORE UPDATE ON fund_rebalancing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO fund_categories (name, description, risk_level, investment_style) VALUES
('Equity', 'Stock-based mutual funds', 'high', 'Growth'),
('Bond', 'Fixed-income mutual funds', 'low', 'Income'),
('Balanced', 'Mix of stocks and bonds', 'medium', 'Balanced'),
('Money Market', 'Short-term, low-risk investments', 'very_low', 'Income'),
('International', 'Foreign market investments', 'high', 'Growth'),
('Sector', 'Industry-specific funds', 'high', 'Growth'),
('Index', 'Passively managed index funds', 'medium', 'Index'),
('Target Date', 'Retirement-focused funds', 'medium', 'Balanced');

INSERT INTO fund_families (name, description, website, founded_date) VALUES
('Vanguard', 'Low-cost index fund pioneer', 'https://vanguard.com', '1975-05-01'),
('Fidelity', 'Full-service investment company', 'https://fidelity.com', '1946-01-01'),
('T. Rowe Price', 'Active management specialist', 'https://troweprice.com', '1937-01-01'),
('American Funds', 'Long-term growth focus', 'https://americanfunds.com', '1931-01-01'),
('BlackRock', 'Global investment management', 'https://blackrock.com', '1988-01-01');
