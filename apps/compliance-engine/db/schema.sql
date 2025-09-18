-- Compliance Engine Database Schema
-- Advanced Compliance Engine with Regulatory Automation

-- Compliance rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- KYC, AML, TRADE_SURVEILLANCE, REGULATORY_REPORTING, RISK_MANAGEMENT
    type VARCHAR(50) NOT NULL, -- THRESHOLD, PATTERN, BEHAVIORAL, REGULATORY
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, draft
    priority INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules (category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON compliance_rules (type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_status ON compliance_rules (status);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_priority ON compliance_rules (priority DESC);

-- Compliance violations table
CREATE TABLE IF NOT EXISTS compliance_violations (
    id VARCHAR(50) PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    user_id VARCHAR(50) NOT NULL,
    portfolio_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, acknowledged, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(50),
    resolved_by VARCHAR(50),
    resolution TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_rule_id ON compliance_violations (rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_user_id ON compliance_violations (user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations (status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations (severity);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_created_at ON compliance_violations (created_at DESC);

-- KYC cases table
CREATE TABLE IF NOT EXISTS kyc_cases (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, rejected, under_review
    tier VARCHAR(20) NOT NULL DEFAULT 'basic', -- basic, intermediate, advanced, professional
    risk_score DECIMAL(5,2) DEFAULT 0,
    verification_level INTEGER DEFAULT 1,
    documents JSONB DEFAULT '{}',
    personal_info JSONB DEFAULT '{}',
    verification_data JSONB DEFAULT '{}',
    review_notes TEXT,
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_cases_user_id ON kyc_cases (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_cases_status ON kyc_cases (status);
CREATE INDEX IF NOT EXISTS idx_kyc_cases_tier ON kyc_cases (tier);
CREATE INDEX IF NOT EXISTS idx_kyc_cases_risk_score ON kyc_cases (risk_score);

-- AML alerts table
CREATE TABLE IF NOT EXISTS aml_alerts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- SUSPICIOUS_ACTIVITY, LARGE_TRANSACTION, UNUSUAL_PATTERN, HIGH_RISK_CUSTOMER
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, investigating, resolved, false_positive
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    risk_score DECIMAL(5,2) NOT NULL,
    transactions JSONB DEFAULT '[]',
    customer_data JSONB DEFAULT '{}',
    investigation_data JSONB DEFAULT '{}',
    investigation_notes TEXT,
    investigated_by VARCHAR(50),
    investigated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50),
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aml_alerts_user_id ON aml_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_alert_type ON aml_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_severity ON aml_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts (status);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_risk_score ON aml_alerts (risk_score);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_created_at ON aml_alerts (created_at DESC);

-- Trade surveillance patterns table
CREATE TABLE IF NOT EXISTS surveillance_patterns (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- FRONT_RUNNING, WASH_TRADING, SPOOFING, LAYERING, MARKING_CLOSE
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'detected', -- detected, investigating, confirmed, false_positive
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    trades JSONB DEFAULT '[]',
    market_data JSONB DEFAULT '{}',
    confidence_score DECIMAL(5,2) NOT NULL,
    investigation_data JSONB DEFAULT '{}',
    investigation_notes TEXT,
    investigated_by VARCHAR(50),
    investigated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50),
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_user_id ON surveillance_patterns (user_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_pattern_type ON surveillance_patterns (pattern_type);
CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_severity ON surveillance_patterns (severity);
CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_status ON surveillance_patterns (status);
CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_confidence_score ON surveillance_patterns (confidence_score);
CREATE INDEX IF NOT EXISTS idx_surveillance_patterns_created_at ON surveillance_patterns (created_at DESC);

-- Pattern Day Trading (PDT) records table
CREATE TABLE IF NOT EXISTS pdt_records (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- CASH, MARGIN, PDT
    day_trade_count INTEGER DEFAULT 0,
    rolling_5_day_count INTEGER DEFAULT 0,
    last_day_trade_date DATE,
    pdt_status VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal, pdt, restricted
    restrictions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdt_records_user_id ON pdt_records (user_id);
CREATE INDEX IF NOT EXISTS idx_pdt_records_account_type ON pdt_records (account_type);
CREATE INDEX IF NOT EXISTS idx_pdt_records_pdt_status ON pdt_records (pdt_status);

-- Wash sale records table
CREATE TABLE IF NOT EXISTS wash_sale_records (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    loss_trade_id VARCHAR(50) NOT NULL,
    replacement_trade_id VARCHAR(50) NOT NULL,
    loss_amount DECIMAL(15,2) NOT NULL,
    disallowed_loss DECIMAL(15,2) NOT NULL,
    wash_sale_date DATE NOT NULL,
    replacement_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, adjusted, disputed
    adjustment_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wash_sale_records_user_id ON wash_sale_records (user_id);
CREATE INDEX IF NOT EXISTS idx_wash_sale_records_symbol ON wash_sale_records (symbol);
CREATE INDEX IF NOT EXISTS idx_wash_sale_records_wash_sale_date ON wash_sale_records (wash_sale_date);
CREATE INDEX IF NOT EXISTS idx_wash_sale_records_status ON wash_sale_records (status);

-- Regulatory reports table
CREATE TABLE IF NOT EXISTS regulatory_reports (
    id VARCHAR(50) PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL, -- FINRA_OATS, SEC_RULE_606, TRACE, CTR, SAR, FORM_13F
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, generating, completed, failed
    format VARCHAR(20) NOT NULL DEFAULT 'CSV', -- CSV, XML, JSON, PDF
    parameters JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    file_size BIGINT,
    generated_by VARCHAR(50) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submission_id VARCHAR(100),
    submission_status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_reports_type ON regulatory_reports (report_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_status ON regulatory_reports (status);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_generated_by ON regulatory_reports (generated_by);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_generated_at ON regulatory_reports (generated_at DESC);

-- Compliance audits table
CREATE TABLE IF NOT EXISTS compliance_audits (
    id VARCHAR(50) PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL, -- TRADE_SURVEILLANCE, KYC_COMPLIANCE, AML_COMPLIANCE, REGULATORY_REPORTING
    scope VARCHAR(50) NOT NULL, -- ALL, USER, PORTFOLIO, RULE
    scope_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    parameters JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    risk_score DECIMAL(5,2),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    run_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audits_type ON compliance_audits (audit_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_scope ON compliance_audits (scope);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_status ON compliance_audits (status);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_run_by ON compliance_audits (run_by);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_started_at ON compliance_audits (started_at DESC);

-- Compliance metrics table
CREATE TABLE IF NOT EXISTS compliance_metrics (
    id VARCHAR(50) PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- VIOLATIONS, ALERTS, REPORTS, AUDITS
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    dimensions JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_metrics_type ON compliance_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_name ON compliance_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_timestamp ON compliance_metrics (timestamp DESC);

-- Compliance notifications table
CREATE TABLE IF NOT EXISTS compliance_notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- VIOLATION, ALERT, REPORT, AUDIT
    entity_id VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread', -- unread, read, acknowledged
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_notifications_user_id ON compliance_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_type ON compliance_notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_status ON compliance_notifications (status);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_created_at ON compliance_notifications (created_at DESC);

-- Compliance configurations table
CREATE TABLE IF NOT EXISTS compliance_configurations (
    id VARCHAR(50) PRIMARY KEY,
    config_type VARCHAR(50) NOT NULL, -- RULE_ENGINE, KYC, AML, SURVEILLANCE, REPORTING
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(config_type, config_key)
);

CREATE INDEX IF NOT EXISTS idx_compliance_configurations_type ON compliance_configurations (config_type);
CREATE INDEX IF NOT EXISTS idx_compliance_configurations_key ON compliance_configurations (config_key);
CREATE INDEX IF NOT EXISTS idx_compliance_configurations_active ON compliance_configurations (is_active);

-- Compliance audit logs table
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- RULE, VIOLATION, KYC, AML, SURVEILLANCE, REPORT
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, ACKNOWLEDGE, RESOLVE
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_entity ON compliance_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_action ON compliance_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_changed_by ON compliance_audit_logs (changed_by);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_changed_at ON compliance_audit_logs (changed_at DESC);

-- Create views for common queries
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    'violations' as metric_type,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
    COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count
FROM compliance_violations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'kyc_cases' as metric_type,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as open_count,
    COUNT(CASE WHEN status = 'under_review' THEN 1 END) as acknowledged_count,
    COUNT(CASE WHEN status = 'verified' THEN 1 END) as resolved_count,
    0 as critical_count,
    0 as high_count,
    0 as medium_count,
    0 as low_count
FROM kyc_cases
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'aml_alerts' as metric_type,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
    COUNT(CASE WHEN status = 'investigating' THEN 1 END) as acknowledged_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count
FROM aml_alerts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_cases_updated_at BEFORE UPDATE ON kyc_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aml_alerts_updated_at BEFORE UPDATE ON aml_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surveillance_patterns_updated_at BEFORE UPDATE ON surveillance_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pdt_records_updated_at BEFORE UPDATE ON pdt_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wash_sale_records_updated_at BEFORE UPDATE ON wash_sale_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regulatory_reports_updated_at BEFORE UPDATE ON regulatory_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_audits_updated_at BEFORE UPDATE ON compliance_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_configurations_updated_at BEFORE UPDATE ON compliance_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default compliance rules
INSERT INTO compliance_rules (id, name, description, category, type, conditions, actions, severity, priority, created_by) VALUES
('pdt_rule_001', 'Pattern Day Trading Detection', 'Detect when a user makes 4 or more day trades in 5 business days', 'TRADE_SURVEILLANCE', 'THRESHOLD', 
 '{"threshold": 4, "timeframe": "5_business_days", "account_type": "margin"}', 
 '{"actions": ["flag_account", "send_notification", "restrict_trading"]}', 'high', 1, 'system'),

('wash_sale_rule_001', 'Wash Sale Detection', 'Detect wash sales within 30 days of a loss', 'TRADE_SURVEILLANCE', 'PATTERN',
 '{"timeframe": "30_days", "loss_threshold": 0}', 
 '{"actions": ["flag_trade", "adjust_tax_loss", "send_notification"]}', 'medium', 2, 'system'),

('concentration_rule_001', 'Position Concentration Limit', 'Alert when single position exceeds 20% of portfolio', 'RISK_MANAGEMENT', 'THRESHOLD',
 '{"threshold": 0.20, "position_type": "any"}', 
 '{"actions": ["send_alert", "flag_position"]}', 'medium', 3, 'system'),

('kyc_rule_001', 'KYC Verification Required', 'Ensure KYC verification is completed before trading', 'KYC', 'REGULATORY',
 '{"verification_level": 1, "trading_restriction": true}', 
 '{"actions": ["restrict_trading", "send_notification"]}', 'high', 1, 'system'),

('aml_rule_001', 'Suspicious Activity Detection', 'Detect suspicious transaction patterns', 'AML', 'BEHAVIORAL',
 '{"patterns": ["unusual_frequency", "large_amounts", "off_hours"]}', 
 '{"actions": ["generate_alert", "flag_account", "investigate"]}', 'high', 1, 'system');

-- Insert default compliance configurations
INSERT INTO compliance_configurations (id, config_type, config_key, config_value, description, created_by) VALUES
('config_001', 'RULE_ENGINE', 'evaluation_interval', '30', 'Rule evaluation interval in seconds', 'system'),
('config_002', 'KYC', 'verification_levels', '{"basic": 1, "intermediate": 2, "advanced": 3, "professional": 4}', 'KYC verification levels', 'system'),
('config_003', 'AML', 'risk_thresholds', '{"low": 0.3, "medium": 0.6, "high": 0.8, "critical": 0.9}', 'AML risk score thresholds', 'system'),
('config_004', 'SURVEILLANCE', 'pattern_confidence', '0.7', 'Minimum confidence score for pattern detection', 'system'),
('config_005', 'REPORTING', 'retention_days', '2555', 'Report retention period in days (7 years)', 'system');
