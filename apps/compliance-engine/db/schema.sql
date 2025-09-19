-- Compliance Engine Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS brokerage_compliance;

-- Use the database
\c brokerage_compliance;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Compliance results table
CREATE TABLE IF NOT EXISTS compliance_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    violations JSONB,
    checks JSONB,
    risk_score DECIMAL(5,2),
    recommendations JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regulatory reports table
CREATE TABLE IF NOT EXISTS regulatory_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_at TIMESTAMP WITH TIME ZONE,
    file_path VARCHAR(500),
    metadata JSONB
);

-- KYC verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    methods JSONB NOT NULL,
    results JSONB,
    score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Trade surveillance table
CREATE TABLE IF NOT EXISTS trade_surveillance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    trade_count INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'monitoring',
    alerts JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Surveillance alerts table
CREATE TABLE IF NOT EXISTS surveillance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    trade_id VARCHAR(255),
    symbol VARCHAR(50),
    message TEXT NOT NULL,
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    portfolio_id VARCHAR(255),
    user_id VARCHAR(255)
);

-- Audit events table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    details JSONB,
    metadata JSONB,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    content JSONB,
    rules JSONB,
    compliance JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_by VARCHAR(255),
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by VARCHAR(255),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Policy categories table
CREATE TABLE IF NOT EXISTS policy_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    conditions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surveillance rules table
CREATE TABLE IF NOT EXISTS surveillance_rules (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    conditions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_results_portfolio_id ON compliance_results(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_user_id ON compliance_results(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_timestamp ON compliance_results(timestamp);

CREATE INDEX IF NOT EXISTS idx_regulatory_reports_portfolio_id ON regulatory_reports(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_user_id ON regulatory_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_type ON regulatory_reports(type);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_status ON regulatory_reports(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_created_at ON regulatory_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_customer_id ON kyc_verifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_created_at ON kyc_verifications(created_at);

CREATE INDEX IF NOT EXISTS idx_trade_surveillance_portfolio_id ON trade_surveillance(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trade_surveillance_user_id ON trade_surveillance(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_surveillance_status ON trade_surveillance(status);

CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_rule_id ON surveillance_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_category ON surveillance_alerts(category);
CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_severity ON surveillance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_status ON surveillance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_created_at ON surveillance_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type ON audit_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(severity);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit_events(category);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);

CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policies_created_at ON policies(created_at);

-- Create views for common queries
CREATE OR REPLACE VIEW active_compliance_violations AS
SELECT 
    cr.*,
    p.user_id
FROM compliance_results cr
JOIN portfolios p ON cr.portfolio_id = p.id
WHERE cr.status = 'non_compliant'
ORDER BY cr.created_at DESC;

CREATE OR REPLACE VIEW compliance_summary AS
SELECT 
    cr.portfolio_id,
    cr.user_id,
    cr.status,
    cr.risk_score,
    cr.timestamp,
    COUNT(cr.id) as total_checks,
    COUNT(cr.id) FILTER (WHERE cr.status = 'non_compliant') as violations
FROM compliance_results cr
WHERE cr.timestamp >= NOW() - INTERVAL '1 day'
GROUP BY cr.portfolio_id, cr.user_id, cr.status, cr.risk_score, cr.timestamp
ORDER BY cr.timestamp DESC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_compliance_history(
    p_portfolio_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    portfolio_id VARCHAR(255),
    status VARCHAR(20),
    risk_score DECIMAL(5,2),
    violations JSONB,
    timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.portfolio_id,
        cr.status,
        cr.risk_score,
        cr.violations,
        cr.timestamp
    FROM compliance_results cr
    WHERE cr.portfolio_id = p_portfolio_id
      AND cr.user_id = p_user_id
      AND cr.timestamp >= NOW() - INTERVAL '1 hour' * p_hours
    ORDER BY cr.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveillance_rules_updated_at
    BEFORE UPDATE ON surveillance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default policy categories
INSERT INTO policy_categories (id, name, description, enabled) VALUES
('compliance', 'Compliance', 'Regulatory compliance policies', true),
('security', 'Security', 'Security and access control policies', true),
('risk_management', 'Risk Management', 'Risk management and mitigation policies', true),
('data_protection', 'Data Protection', 'Data privacy and protection policies', true),
('trading', 'Trading', 'Trading and investment policies', true),
('operational', 'Operational', 'Operational and business policies', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default compliance rules
INSERT INTO compliance_rules (id, name, description, category, severity, enabled, conditions) VALUES
('position_limit_check', 'Position Limit Check', 'Check if position exceeds regulatory limits', 'position_limits', 'high', true, '{"maxPositionValue": 1000000, "maxPositionPercentage": 10, "maxSectorExposure": 25}'),
('concentration_limit_check', 'Concentration Limit Check', 'Check portfolio concentration limits', 'concentration', 'medium', true, '{"maxSingleAssetWeight": 5, "maxSectorWeight": 30, "maxCountryWeight": 40}'),
('liquidity_requirement_check', 'Liquidity Requirement Check', 'Ensure minimum liquidity requirements', 'liquidity', 'high', true, '{"minLiquidityRatio": 0.1, "minCashReserve": 50000, "maxIlliquidAssets": 0.2}'),
('regulatory_capital_check', 'Regulatory Capital Check', 'Check regulatory capital requirements', 'capital', 'critical', true, '{"minCapitalRatio": 0.08, "minTier1Capital": 0.06, "minLeverageRatio": 0.03}'),
('risk_limit_check', 'Risk Limit Check', 'Check risk management limits', 'risk', 'high', true, '{"maxVaR": 0.05, "maxDrawdown": 0.15, "maxVolatility": 0.25}')
ON CONFLICT (id) DO NOTHING;

-- Insert default surveillance rules
INSERT INTO surveillance_rules (id, name, description, category, severity, enabled, conditions) VALUES
('unusual_volume', 'Unusual Volume', 'Detect unusual trading volume patterns', 'volume', 'medium', true, '{"volumeThreshold": 3.0, "timeWindow": 60, "minVolume": 1000}'),
('price_manipulation', 'Price Manipulation', 'Detect potential price manipulation', 'price', 'high', true, '{"priceChangeThreshold": 0.10, "timeWindow": 30, "minPrice": 1.0}'),
('wash_trading', 'Wash Trading', 'Detect wash trading patterns', 'pattern', 'high', true, '{"sameAccountThreshold": 0.8, "timeWindow": 300, "minTradeCount": 5}'),
('front_running', 'Front Running', 'Detect front running patterns', 'timing', 'high', true, '{"timeGap": 30, "priceImpact": 0.05, "minOrderSize": 10000}'),
('layering', 'Layering', 'Detect layering patterns', 'pattern', 'high', true, '{"orderCountThreshold": 10, "timeWindow": 60, "priceImprovement": 0.01}'),
('spoofing', 'Spoofing', 'Detect spoofing patterns', 'pattern', 'high', true, '{"orderSizeThreshold": 100000, "cancellationRate": 0.8, "timeWindow": 300}'),
('insider_trading', 'Insider Trading', 'Detect potential insider trading', 'timing', 'critical', true, '{"newsTimeGap": 3600, "priceChangeThreshold": 0.15, "minOrderSize": 50000}'),
('market_abuse', 'Market Abuse', 'Detect general market abuse', 'general', 'high', true, '{"frequencyThreshold": 100, "timeWindow": 3600, "minOrderSize": 1000}')
ON CONFLICT (id) DO NOTHING;