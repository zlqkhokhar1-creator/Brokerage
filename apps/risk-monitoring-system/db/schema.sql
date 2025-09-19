-- Risk Monitoring System Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS brokerage_risk;

-- Use the database
\c brokerage_risk;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Portfolio risk metrics table
CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    portfolio_value DECIMAL(15,2) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    var95 DECIMAL(10,6) NOT NULL,
    var99 DECIMAL(10,6) NOT NULL,
    cvar95 DECIMAL(10,6) NOT NULL,
    sharpe_ratio DECIMAL(10,6),
    max_drawdown DECIMAL(10,6),
    beta DECIMAL(10,6),
    concentration_risk DECIMAL(5,2),
    liquidity_risk DECIMAL(5,2),
    volatility DECIMAL(10,6),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio risk limits table
CREATE TABLE IF NOT EXISTS portfolio_risk_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    max_var95 DECIMAL(10,6) NOT NULL DEFAULT 0.05,
    max_var99 DECIMAL(10,6) NOT NULL DEFAULT 0.10,
    max_cvar95 DECIMAL(10,6) NOT NULL DEFAULT 0.08,
    max_drawdown DECIMAL(10,6) NOT NULL DEFAULT 0.20,
    max_concentration DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    max_liquidity_risk DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    max_risk_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, user_id)
);

-- Risk violations table
CREATE TABLE IF NOT EXISTS risk_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    current_value DECIMAL(15,6) NOT NULL,
    limit_value DECIMAL(15,6) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk alerts table
CREATE TABLE IF NOT EXISTS risk_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_value DECIMAL(15,6) NOT NULL,
    threshold DECIMAL(15,6) NOT NULL,
    trigger_count INTEGER NOT NULL DEFAULT 1,
    first_triggered TIMESTAMP WITH TIME ZONE NOT NULL,
    last_triggered TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    risk_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk alert events table
CREATE TABLE IF NOT EXISTS risk_alert_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES risk_alerts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stress tests table
CREATE TABLE IF NOT EXISTS stress_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    scenarios JSONB NOT NULL,
    positions JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    results JSONB,
    aggregate_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER
);

-- Stress test scenarios table
CREATE TABLE IF NOT EXISTS stress_test_scenarios (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Correlation analysis table
CREATE TABLE IF NOT EXISTS correlation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbols JSONB NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    method VARCHAR(20) NOT NULL,
    correlation_matrix JSONB NOT NULL,
    correlation_metrics JSONB NOT NULL,
    clusters JSONB,
    portfolio_correlation_risk JSONB,
    data_points INTEGER NOT NULL,
    calculation_time INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market data table
CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(15,6),
    high DECIMAL(15,6),
    low DECIMAL(15,6),
    close DECIMAL(15,6) NOT NULL,
    volume BIGINT,
    bid DECIMAL(15,6),
    ask DECIMAL(15,6),
    spread DECIMAL(10,6),
    volatility DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_portfolio_id ON portfolio_risk_metrics(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_user_id ON portfolio_risk_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_timestamp ON portfolio_risk_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_risk_violations_portfolio_id ON risk_violations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_risk_violations_user_id ON risk_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_violations_created_at ON risk_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_portfolio_id ON risk_alerts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_id ON risk_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_status ON risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at ON risk_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_alert_events_alert_id ON risk_alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_risk_alert_events_event_type ON risk_alert_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stress_tests_portfolio_id ON stress_tests(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_user_id ON stress_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_status ON stress_tests(status);

CREATE INDEX IF NOT EXISTS idx_correlation_analysis_symbols ON correlation_analysis USING GIN(symbols);
CREATE INDEX IF NOT EXISTS idx_correlation_analysis_created_at ON correlation_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);

-- Create views for common queries
CREATE OR REPLACE VIEW active_risk_alerts AS
SELECT 
    ra.*,
    p.user_id
FROM risk_alerts ra
JOIN portfolios p ON ra.portfolio_id = p.id
WHERE ra.status = 'active'
ORDER BY ra.created_at DESC;

CREATE OR REPLACE VIEW portfolio_risk_summary AS
SELECT 
    prm.portfolio_id,
    prm.user_id,
    prm.portfolio_value,
    prm.risk_score,
    prm.var95,
    prm.var99,
    prm.cvar95,
    prm.max_drawdown,
    prm.timestamp,
    COUNT(ra.id) as active_alerts
FROM portfolio_risk_metrics prm
LEFT JOIN risk_alerts ra ON prm.portfolio_id = ra.portfolio_id AND ra.status = 'active'
WHERE prm.timestamp >= NOW() - INTERVAL '1 day'
GROUP BY prm.portfolio_id, prm.user_id, prm.portfolio_value, prm.risk_score, 
         prm.var95, prm.var99, prm.cvar95, prm.max_drawdown, prm.timestamp
ORDER BY prm.timestamp DESC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_portfolio_risk_history(
    p_portfolio_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    portfolio_id VARCHAR(255),
    risk_score DECIMAL(5,2),
    var95 DECIMAL(10,6),
    var99 DECIMAL(10,6),
    cvar95 DECIMAL(10,6),
    max_drawdown DECIMAL(10,6),
    timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        prm.portfolio_id,
        prm.risk_score,
        prm.var95,
        prm.var99,
        prm.cvar95,
        prm.max_drawdown,
        prm.timestamp
    FROM portfolio_risk_metrics prm
    WHERE prm.portfolio_id = p_portfolio_id
      AND prm.user_id = p_user_id
      AND prm.timestamp >= NOW() - INTERVAL '1 hour' * p_hours
    ORDER BY prm.timestamp DESC;
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

CREATE TRIGGER update_portfolio_risk_limits_updated_at
    BEFORE UPDATE ON portfolio_risk_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default stress test scenarios
INSERT INTO stress_test_scenarios (id, name, description, parameters, is_custom) VALUES
('market_crash', 'Market Crash', 'Simulate a 2008-style market crash', 
 '{"equityShock": -0.30, "bondShock": -0.10, "volatilitySpike": 0.50, "correlationIncrease": 0.20}', false),
('interest_rate_shock', 'Interest Rate Shock', 'Simulate a sudden interest rate increase',
 '{"rateShock": 0.03, "bondShock": -0.15, "equityShock": -0.10, "duration": 1}', false),
('volatility_spike', 'Volatility Spike', 'Simulate a VIX spike scenario',
 '{"volatilityMultiplier": 3.0, "correlationIncrease": 0.30, "liquidityReduction": 0.50}', false),
('sector_crash', 'Sector Crash', 'Simulate a specific sector crash',
 '{"sectorShock": -0.40, "affectedSectors": ["technology", "healthcare"], "spilloverEffect": 0.10}', false),
('currency_crisis', 'Currency Crisis', 'Simulate a currency crisis',
 '{"currencyShock": -0.25, "emergingMarketShock": -0.35, "commodityShock": -0.20}', false),
('liquidity_crisis', 'Liquidity Crisis', 'Simulate a liquidity crisis',
 '{"liquidityReduction": 0.80, "spreadIncrease": 5.0, "forcedLiquidation": 0.20}', false)
ON CONFLICT (id) DO NOTHING;

