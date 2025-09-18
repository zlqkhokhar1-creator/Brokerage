-- Integration Hub Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS integration_hub;

-- Use the database
\c integration_hub;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('api', 'webhook', 'database', 'file')),
    configuration JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Partner credentials table
CREATE TABLE IF NOT EXISTS partner_credentials (
    id VARCHAR(255) PRIMARY KEY,
    partner_id VARCHAR(255) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    encrypted_credentials TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id)
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('api', 'webhook', 'database', 'file')),
    configuration JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Integration partners junction table
CREATE TABLE IF NOT EXISTS integration_partners (
    id VARCHAR(255) PRIMARY KEY,
    integration_id VARCHAR(255) NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    partner_id VARCHAR(255) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(integration_id, partner_id)
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255),
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(255) PRIMARY KEY,
    webhook_id VARCHAR(255) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id VARCHAR(255) PRIMARY KEY,
    partner_id VARCHAR(255) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    requests_per_window INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id, endpoint)
);

-- Rate limit usage table
CREATE TABLE IF NOT EXISTS rate_limit_usage (
    id VARCHAR(255) PRIMARY KEY,
    rate_limit_id VARCHAR(255) NOT NULL REFERENCES rate_limits(id) ON DELETE CASCADE,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(rate_limit_id, window_start)
);

-- Monitoring alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    integration_id VARCHAR(255) NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    conditions JSONB NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Alert instances table
CREATE TABLE IF NOT EXISTS alert_instances (
    id VARCHAR(255) PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL REFERENCES monitoring_alerts(id) ON DELETE CASCADE,
    integration_id VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    condition JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255)
);

-- Health checks table
CREATE TABLE IF NOT EXISTS health_checks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    integration_id VARCHAR(255) NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('api', 'webhook', 'database', 'file')),
    config JSONB NOT NULL,
    interval_seconds INTEGER NOT NULL DEFAULT 300,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Health status table
CREATE TABLE IF NOT EXISTS health_status (
    id VARCHAR(255) PRIMARY KEY,
    integration_id VARCHAR(255) NOT NULL,
    healthy BOOLEAN NOT NULL,
    checks JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monitoring metrics table
CREATE TABLE IF NOT EXISTS monitoring_metrics (
    id VARCHAR(255) PRIMARY KEY,
    metric_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data transformations table
CREATE TABLE IF NOT EXISTS data_transformations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Integration executions table
CREATE TABLE IF NOT EXISTS integration_executions (
    id VARCHAR(255) PRIMARY KEY,
    integration_id VARCHAR(255) NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    parameters JSONB,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- API Gateway routes table
CREATE TABLE IF NOT EXISTS api_gateway_routes (
    id VARCHAR(255) PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    target_service VARCHAR(255) NOT NULL,
    target_path VARCHAR(500),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(path, method)
);

-- Request logs table
CREATE TABLE IF NOT EXISTS request_logs (
    id VARCHAR(255) PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at);

CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON integrations(created_at);

CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON webhooks(created_by);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limits_partner_id ON rate_limits(partner_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_rate_limit_id ON rate_limit_usage(rate_limit_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_window_start ON rate_limit_usage(window_start);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_integration_id ON monitoring_alerts(integration_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_is_active ON monitoring_alerts(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_instances_alert_id ON alert_instances(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_integration_id ON alert_instances(integration_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at);

CREATE INDEX IF NOT EXISTS idx_health_checks_integration_id ON health_checks(integration_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(type);
CREATE INDEX IF NOT EXISTS idx_health_checks_is_active ON health_checks(is_active);

CREATE INDEX IF NOT EXISTS idx_health_status_integration_id ON health_status(integration_id);
CREATE INDEX IF NOT EXISTS idx_health_status_healthy ON health_status(healthy);
CREATE INDEX IF NOT EXISTS idx_health_status_timestamp ON health_status(timestamp);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_metric_type ON monitoring_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp ON monitoring_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_integration_executions_integration_id ON integration_executions(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_executions_status ON integration_executions(status);
CREATE INDEX IF NOT EXISTS idx_integration_executions_created_at ON integration_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_api_gateway_routes_path ON api_gateway_routes(path);
CREATE INDEX IF NOT EXISTS idx_api_gateway_routes_method ON api_gateway_routes(method);
CREATE INDEX IF NOT EXISTS idx_api_gateway_routes_is_active ON api_gateway_routes(is_active);

CREATE INDEX IF NOT EXISTS idx_request_logs_method ON request_logs(method);
CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);
CREATE INDEX IF NOT EXISTS idx_request_logs_status_code ON request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_credentials_updated_at BEFORE UPDATE ON partner_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_alerts_updated_at BEFORE UPDATE ON monitoring_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_checks_updated_at BEFORE UPDATE ON health_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_transformations_updated_at BEFORE UPDATE ON data_transformations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_gateway_routes_updated_at BEFORE UPDATE ON api_gateway_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_integrations AS
SELECT 
    i.*,
    p.name as partner_name,
    p.type as partner_type
FROM integrations i
LEFT JOIN integration_partners ip ON i.id = ip.integration_id
LEFT JOIN partners p ON ip.partner_id = p.id
WHERE i.is_active = true AND i.status = 'active';

CREATE OR REPLACE VIEW integration_health_summary AS
SELECT 
    i.id,
    i.name,
    i.type,
    hs.healthy,
    hs.timestamp as last_check,
    COUNT(a.id) as active_alerts
FROM integrations i
LEFT JOIN health_status hs ON i.id = hs.integration_id
LEFT JOIN alert_instances a ON i.id = a.integration_id AND a.status = 'active'
WHERE i.is_active = true
GROUP BY i.id, i.name, i.type, hs.healthy, hs.timestamp;

CREATE OR REPLACE VIEW webhook_delivery_summary AS
SELECT 
    w.id,
    w.name,
    w.url,
    COUNT(wd.id) as total_deliveries,
    COUNT(CASE WHEN wd.status = 'delivered' THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN wd.status = 'failed' THEN 1 END) as failed_deliveries,
    ROUND(
        COUNT(CASE WHEN wd.status = 'delivered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(wd.id), 0), 2
    ) as success_rate
FROM webhooks w
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
WHERE w.is_active = true
GROUP BY w.id, w.name, w.url;

-- Sample data
INSERT INTO partners (id, name, type, configuration, created_by) VALUES
('partner_1', 'Alpha API', 'api', '{"baseUrl": "https://api.alpha.com", "timeout": 30000}', 'system'),
('partner_2', 'Beta Webhook', 'webhook', '{"webhookUrl": "https://webhook.beta.com", "timeout": 30000}', 'system'),
('partner_3', 'Gamma Database', 'database', '{"connectionString": "postgresql://user:pass@localhost:5432/gamma"}', 'system'),
('partner_4', 'Delta File', 'file', '{"filePath": "/data/delta", "timeout": 30000}', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integrations (id, name, type, configuration, created_by) VALUES
('integration_1', 'Market Data Integration', 'api', '{"baseUrl": "https://api.marketdata.com", "timeout": 30000}', 'system'),
('integration_2', 'Trading Webhook', 'webhook', '{"webhookUrl": "https://webhook.trading.com", "timeout": 30000}', 'system'),
('integration_3', 'Analytics Database', 'database', '{"connectionString": "postgresql://user:pass@localhost:5432/analytics"}', 'system'),
('integration_4', 'Reports File', 'file', '{"filePath": "/data/reports", "timeout": 30000}', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integration_partners (id, integration_id, partner_id) VALUES
('ip_1', 'integration_1', 'partner_1'),
('ip_2', 'integration_2', 'partner_2'),
('ip_3', 'integration_3', 'partner_3'),
('ip_4', 'integration_4', 'partner_4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webhooks (id, name, url, events, created_by) VALUES
('webhook_1', 'Trading Events', 'https://webhook.trading.com/events', ARRAY['order.created', 'order.updated', 'order.completed'], 'system'),
('webhook_2', 'Market Data Events', 'https://webhook.marketdata.com/events', ARRAY['price.updated', 'volume.updated'], 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rate_limits (id, partner_id, endpoint, requests_per_window, window_seconds, created_by) VALUES
('rl_1', 'partner_1', '/api/v1/quotes', 1000, 3600, 'system'),
('rl_2', 'partner_2', '/webhook/events', 100, 60, 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO monitoring_alerts (id, name, integration_id, severity, conditions, created_by) VALUES
('alert_1', 'High Error Rate', 'integration_1', 'high', '[{"type": "greater_than", "field": "error_rate", "value": 0.05}]', 'system'),
('alert_2', 'Slow Response Time', 'integration_1', 'medium', '[{"type": "greater_than", "field": "response_time", "value": 5000}]', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO health_checks (id, name, integration_id, type, config, created_by) VALUES
('hc_1', 'API Health Check', 'integration_1', 'api', '{"baseUrl": "https://api.marketdata.com", "timeout": 30000}', 'system'),
('hc_2', 'Webhook Health Check', 'integration_2', 'webhook', '{"webhookUrl": "https://webhook.trading.com", "timeout": 30000}', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_gateway_routes (id, path, method, target_service, target_path, created_by) VALUES
('route_1', '/api/v1/market-data/*', 'GET', 'market-data-service', '/api/v1/*', 'system'),
('route_2', '/api/v1/trading/*', 'POST', 'trading-service', '/api/v1/*', 'system'),
('route_3', '/api/v1/analytics/*', 'GET', 'analytics-service', '/api/v1/*', 'system')
ON CONFLICT (id) DO NOTHING;
