-- Integration Hub Database Schema

-- API routes table
CREATE TABLE IF NOT EXISTS api_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    target VARCHAR(500) NOT NULL,
    service VARCHAR(100) NOT NULL,
    load_balancer VARCHAR(100),
    circuit_breaker VARCHAR(100),
    rate_limit INTEGER DEFAULT 1000,
    authentication BOOLEAN DEFAULT false,
    authorization VARCHAR(100),
    middleware JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(path, method)
);

-- Load balancers table
CREATE TABLE IF NOT EXISTS load_balancers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    algorithm VARCHAR(20) NOT NULL CHECK (algorithm IN ('round_robin', 'least_connections', 'weighted_round_robin', 'ip_hash')),
    targets TEXT[] NOT NULL,
    health_check JSONB DEFAULT '{}',
    weights INTEGER[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Circuit breakers table
CREATE TABLE IF NOT EXISTS circuit_breakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    failure_threshold INTEGER DEFAULT 5,
    timeout INTEGER DEFAULT 10000,
    reset_timeout INTEGER DEFAULT 60000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Third-party integrations table
CREATE TABLE IF NOT EXISTS third_party_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('market_data', 'trading', 'banking', 'compliance')),
    provider VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL,
    endpoints JSONB NOT NULL,
    authentication JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data transformation rules table
CREATE TABLE IF NOT EXISTS data_transformation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_format VARCHAR(50) NOT NULL,
    target_format VARCHAR(50) NOT NULL,
    transformation_rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integration logs table
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES third_party_integrations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'warning')),
    message TEXT,
    data JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API usage statistics table
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES api_routes(id) ON DELETE CASCADE,
    user_id UUID,
    ip_address INET,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service health checks table
CREATE TABLE IF NOT EXISTS service_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'unknown')),
    response_time_ms INTEGER,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_routes_path ON api_routes(path);
CREATE INDEX IF NOT EXISTS idx_api_routes_method ON api_routes(method);
CREATE INDEX IF NOT EXISTS idx_api_routes_service ON api_routes(service);
CREATE INDEX IF NOT EXISTS idx_api_routes_is_active ON api_routes(is_active);

CREATE INDEX IF NOT EXISTS idx_load_balancers_name ON load_balancers(name);
CREATE INDEX IF NOT EXISTS idx_load_balancers_is_active ON load_balancers(is_active);

CREATE INDEX IF NOT EXISTS idx_circuit_breakers_name ON circuit_breakers(name);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_is_active ON circuit_breakers(is_active);

CREATE INDEX IF NOT EXISTS idx_third_party_integrations_type ON third_party_integrations(type);
CREATE INDEX IF NOT EXISTS idx_third_party_integrations_provider ON third_party_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_third_party_integrations_status ON third_party_integrations(status);

CREATE INDEX IF NOT EXISTS idx_data_transformation_rules_source_format ON data_transformation_rules(source_format);
CREATE INDEX IF NOT EXISTS idx_data_transformation_rules_target_format ON data_transformation_rules(target_format);
CREATE INDEX IF NOT EXISTS idx_data_transformation_rules_is_active ON data_transformation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_event_type ON integration_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_stats_route_id ON api_usage_stats(route_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON api_usage_stats(created_at);

CREATE INDEX IF NOT EXISTS idx_service_health_checks_service_name ON service_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_service_health_checks_status ON service_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_service_health_checks_last_checked ON service_health_checks(last_checked);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_routes_updated_at BEFORE UPDATE ON api_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_load_balancers_updated_at BEFORE UPDATE ON load_balancers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circuit_breakers_updated_at BEFORE UPDATE ON circuit_breakers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_third_party_integrations_updated_at BEFORE UPDATE ON third_party_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_transformation_rules_updated_at BEFORE UPDATE ON data_transformation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default API routes
INSERT INTO api_routes (path, method, target, service, authentication, authorization) VALUES
('/api/trading/*', 'GET', 'http://localhost:3001', 'trading-service', true, 'read_trading_data'),
('/api/trading/*', 'POST', 'http://localhost:3001', 'trading-service', true, 'write_trading_data'),
('/api/portfolio/*', 'GET', 'http://localhost:3002', 'portfolio-service', true, 'read_portfolio_data'),
('/api/portfolio/*', 'POST', 'http://localhost:3002', 'portfolio-service', true, 'write_portfolio_data'),
('/api/market/*', 'GET', 'http://localhost:3003', 'market-service', true, 'read_market_data'),
('/api/risk/*', 'GET', 'http://localhost:3004', 'risk-service', true, 'read_risk_data'),
('/api/risk/*', 'POST', 'http://localhost:3004', 'risk-service', true, 'write_risk_data'),
('/api/performance/*', 'GET', 'http://localhost:3005', 'performance-service', true, 'read_performance_data'),
('/api/reports/*', 'GET', 'http://localhost:3008', 'reports-service', true, 'read_reports'),
('/api/reports/*', 'POST', 'http://localhost:3008', 'reports-service', true, 'write_reports'),
('/api/dashboards/*', 'GET', 'http://localhost:3008', 'dashboards-service', true, 'read_dashboards'),
('/api/dashboards/*', 'POST', 'http://localhost:3008', 'dashboards-service', true, 'write_dashboards'),
('/api/security/*', 'GET', 'http://localhost:3009', 'security-service', true, 'admin_security'),
('/api/security/*', 'POST', 'http://localhost:3009', 'security-service', true, 'admin_security')
ON CONFLICT (path, method) DO NOTHING;

-- Insert default load balancers
INSERT INTO load_balancers (name, algorithm, targets, health_check) VALUES
('trading-lb', 'round_robin', ARRAY['http://localhost:3001', 'http://localhost:3001-backup'], '{"endpoint": "/health", "interval": 30000}'),
('portfolio-lb', 'round_robin', ARRAY['http://localhost:3002', 'http://localhost:3002-backup'], '{"endpoint": "/health", "interval": 30000}'),
('market-lb', 'round_robin', ARRAY['http://localhost:3003', 'http://localhost:3003-backup'], '{"endpoint": "/health", "interval": 30000}'),
('risk-lb', 'round_robin', ARRAY['http://localhost:3004', 'http://localhost:3004-backup'], '{"endpoint": "/health", "interval": 30000}'),
('performance-lb', 'round_robin', ARRAY['http://localhost:3005', 'http://localhost:3005-backup'], '{"endpoint": "/health", "interval": 30000}')
ON CONFLICT (name) DO NOTHING;

-- Insert default circuit breakers
INSERT INTO circuit_breakers (name, failure_threshold, timeout, reset_timeout) VALUES
('trading-cb', 5, 10000, 60000),
('portfolio-cb', 5, 10000, 60000),
('market-cb', 5, 10000, 60000),
('risk-cb', 5, 10000, 60000),
('performance-cb', 5, 10000, 60000),
('reports-cb', 5, 10000, 60000),
('security-cb', 5, 10000, 60000)
ON CONFLICT (name) DO NOTHING;

-- Insert default data transformation rules
INSERT INTO data_transformation_rules (name, source_format, target_format, transformation_rules) VALUES
('market-data-to-json', 'csv', 'json', '{"fieldMappings": {"symbol": "ticker", "price": "value", "volume": "quantity"}}'),
('trading-data-to-csv', 'json', 'csv', '{"fieldMappings": {"order_id": "id", "symbol": "ticker", "quantity": "shares", "price": "value"}}'),
('portfolio-data-to-xml', 'json', 'xml', '{"fieldMappings": {"holding_id": "id", "symbol": "ticker", "quantity": "shares", "value": "amount"}}')
ON CONFLICT (name) DO NOTHING;