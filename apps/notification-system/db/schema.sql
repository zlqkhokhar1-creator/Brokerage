-- Notification System Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS notification_system;

-- Use the database
\c notification_system;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    recipients TEXT[] NOT NULL,
    message JSONB NOT NULL,
    channels TEXT[] NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    template_id VARCHAR(255),
    personalized_content JSONB,
    retry_config JSONB,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notification deliveries table
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id VARCHAR(255) PRIMARY KEY,
    notification_id VARCHAR(255) NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'webhook', 'in_app')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    message_id VARCHAR(255),
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    variables TEXT[] DEFAULT '{}',
    channels TEXT[] NOT NULL CHECK (array_length(channels, 1) > 0),
    category_id VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Template categories table
CREATE TABLE IF NOT EXISTS template_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Template variables table
CREATE TABLE IF NOT EXISTS template_variables (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'email', 'url', 'date')),
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    validation_rules JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Rendered templates table
CREATE TABLE IF NOT EXISTS rendered_templates (
    id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL REFERENCES notification_templates(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    variables JSONB NOT NULL,
    channels TEXT[] NOT NULL,
    rendered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    rendered_by VARCHAR(255) NOT NULL
);

-- Notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'webhook', 'in_app')),
    configuration JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Channel providers table
CREATE TABLE IF NOT EXISTS channel_providers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'webhook', 'in_app')),
    configuration JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Channel test results table
CREATE TABLE IF NOT EXISTS channel_test_results (
    id VARCHAR(255) PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed')),
    test_data JSONB NOT NULL,
    result JSONB,
    error TEXT,
    duration INTEGER,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    preferences JSONB DEFAULT '{}',
    behavior_data JSONB DEFAULT '{}',
    demographics JSONB DEFAULT '{}',
    personalization_score INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Personalization rules table
CREATE TABLE IF NOT EXISTS personalization_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Behavior patterns table
CREATE TABLE IF NOT EXISTS behavior_patterns (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Personalization analyses table
CREATE TABLE IF NOT EXISTS personalization_analyses (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    behavior_analysis JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    personalization_score INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Delivery optimization rules table
CREATE TABLE IF NOT EXISTS delivery_optimization_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Delivery optimizations table
CREATE TABLE IF NOT EXISTS delivery_optimizations (
    id VARCHAR(255) PRIMARY KEY,
    notification_id VARCHAR(255) NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    optimization_type VARCHAR(50) NOT NULL CHECK (optimization_type IN ('timing', 'channel_selection', 'personalization', 'batch_processing', 'retry_strategy')),
    parameters JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Delivery performance metrics table
CREATE TABLE IF NOT EXISTS delivery_performance_metrics (
    id VARCHAR(255) PRIMARY KEY,
    metric_type VARCHAR(255) NOT NULL,
    channel VARCHAR(50),
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Analytics metrics table
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id VARCHAR(255) PRIMARY KEY,
    metric_type VARCHAR(255) NOT NULL,
    channel VARCHAR(50),
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Analytics reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    time_range VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A/B tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variants JSONB NOT NULL,
    traffic_split JSONB NOT NULL,
    duration INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'stopped', 'deleted')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    configuration JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User assignments table
CREATE TABLE IF NOT EXISTS user_assignments (
    test_id VARCHAR(255) NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (test_id, user_id)
);

-- A/B test results table
CREATE TABLE IF NOT EXISTS ab_test_results (
    id VARCHAR(255) PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A/B test analyses table
CREATE TABLE IF NOT EXISTS ab_test_analyses (
    test_id VARCHAR(255) PRIMARY KEY REFERENCES ab_tests(id) ON DELETE CASCADE,
    analysis JSONB NOT NULL,
    significance JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON notification_deliveries(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_at ON notification_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_rendered_templates_template_id ON rendered_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_rendered_templates_rendered_at ON rendered_templates(rendered_at);

CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_is_active ON notification_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_channel_test_results_channel_id ON channel_test_results(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_test_results_status ON channel_test_results(status);
CREATE INDEX IF NOT EXISTS idx_channel_test_results_created_at ON channel_test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user_id ON behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_created_at ON behavior_patterns(created_at);

CREATE INDEX IF NOT EXISTS idx_personalization_analyses_user_id ON personalization_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_analyses_created_at ON personalization_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_delivery_optimizations_notification_id ON delivery_optimizations(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_optimizations_type ON delivery_optimizations(optimization_type);
CREATE INDEX IF NOT EXISTS idx_delivery_optimizations_status ON delivery_optimizations(status);

CREATE INDEX IF NOT EXISTS idx_delivery_performance_metrics_type ON delivery_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_metrics_channel ON delivery_performance_metrics(channel);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_metrics_created_at ON delivery_performance_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_channel ON analytics_metrics(channel);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_created_at ON analytics_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_by ON analytics_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_at ON analytics_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_by ON ab_tests(created_by);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_at ON ab_tests(created_at);

CREATE INDEX IF NOT EXISTS idx_user_assignments_test_id ON user_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_user_id ON user_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_user_id ON ab_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON ab_test_results(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_created_at ON ab_test_results(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_variables_updated_at BEFORE UPDATE ON template_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_providers_updated_at BEFORE UPDATE ON channel_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalization_rules_updated_at BEFORE UPDATE ON personalization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_optimization_rules_updated_at BEFORE UPDATE ON delivery_optimization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW notification_summary AS
SELECT 
    n.id,
    n.status,
    n.priority,
    n.channels,
    array_length(n.recipients, 1) as recipient_count,
    n.created_at,
    n.delivered_at,
    COUNT(nd.id) as delivery_count,
    COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN nd.status = 'failed' THEN 1 END) as failed_deliveries
FROM notifications n
LEFT JOIN notification_deliveries nd ON n.id = nd.notification_id
GROUP BY n.id, n.status, n.priority, n.channels, n.recipients, n.created_at, n.delivered_at;

CREATE OR REPLACE VIEW channel_performance_summary AS
SELECT 
    nd.channel,
    COUNT(*) as total_deliveries,
    COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN nd.status = 'failed' THEN 1 END) as failed_deliveries,
    ROUND(
        COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as success_rate,
    AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time
FROM notification_deliveries nd
GROUP BY nd.channel;

CREATE OR REPLACE VIEW template_usage_summary AS
SELECT 
    nt.id,
    nt.name,
    COUNT(n.id) as total_usage,
    COUNT(CASE WHEN n.status = 'delivered' THEN 1 END) as successful_usage,
    ROUND(
        COUNT(CASE WHEN n.status = 'delivered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(n.id), 0), 2
    ) as success_rate
FROM notification_templates nt
LEFT JOIN notifications n ON nt.id = n.template_id
GROUP BY nt.id, nt.name;

CREATE OR REPLACE VIEW ab_test_summary AS
SELECT 
    t.id,
    t.name,
    t.status,
    t.start_date,
    t.end_date,
    COUNT(DISTINCT ua.user_id) as total_participants,
    COUNT(ar.id) as total_events,
    COUNT(DISTINCT ar.user_id) as active_participants
FROM ab_tests t
LEFT JOIN user_assignments ua ON t.id = ua.test_id
LEFT JOIN ab_test_results ar ON t.id = ar.test_id
GROUP BY t.id, t.name, t.status, t.start_date, t.end_date;

-- Sample data
INSERT INTO template_categories (id, name, description) VALUES
('cat_1', 'Trading Notifications', 'Notifications related to trading activities'),
('cat_2', 'Account Updates', 'Notifications about account changes and updates'),
('cat_3', 'Market Alerts', 'Notifications about market conditions and alerts'),
('cat_4', 'System Notifications', 'System-generated notifications')
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_variables (id, name, type, description, required) VALUES
('var_1', 'user_name', 'string', 'User full name', true),
('var_2', 'account_balance', 'number', 'Current account balance', false),
('var_3', 'stock_symbol', 'string', 'Stock symbol', false),
('var_4', 'price', 'number', 'Stock price', false),
('var_5', 'quantity', 'number', 'Quantity of shares', false),
('var_6', 'order_id', 'string', 'Order identifier', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_channels (id, name, type, configuration, created_by) VALUES
('channel_1', 'Email Channel', 'email', '{"smtp_host": "smtp.example.com", "smtp_port": 587}', 'system'),
('channel_2', 'SMS Channel', 'sms', '{"provider": "twilio", "account_sid": "AC1234567890"}', 'system'),
('channel_3', 'Push Channel', 'push', '{"provider": "firebase", "server_key": "AAAA1234567890"}', 'system'),
('channel_4', 'Webhook Channel', 'webhook', '{"base_url": "https://webhook.example.com"}', 'system'),
('channel_5', 'In-App Channel', 'in_app', '{"database": "postgresql://localhost:5432/notifications"}', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO channel_providers (id, name, type, configuration, credentials) VALUES
('provider_1', 'SendGrid', 'email', '{"api_version": "v3"}', '{"api_key": "SG.1234567890"}'),
('provider_2', 'Twilio', 'sms', '{"api_version": "2010-04-01"}', '{"account_sid": "AC1234567890", "auth_token": "1234567890"}'),
('provider_3', 'Firebase', 'push', '{"api_version": "v1"}', '{"server_key": "AAAA1234567890"}'),
('provider_4', 'Custom Webhook', 'webhook', '{"timeout": 30000}', '{"secret": "webhook_secret_123"}'),
('provider_5', 'In-App Database', 'in_app', '{"table": "in_app_notifications"}', '{"connection_string": "postgresql://localhost:5432/notifications"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_templates (id, name, content, variables, channels, category_id, created_by) VALUES
('template_1', 'Order Confirmation', '{"text": "Your order for {{quantity}} shares of {{stock_symbol}} at ${{price}} has been confirmed. Order ID: {{order_id}}", "subject": "Order Confirmation - {{stock_symbol}}"}', '["quantity", "stock_symbol", "price", "order_id"]', '["email", "in_app"]', 'cat_1', 'system'),
('template_2', 'Account Balance Alert', '{"text": "Your account balance is ${{account_balance}}. Please consider adding funds if needed.", "subject": "Account Balance Alert"}', '["account_balance"]', '["email", "sms", "in_app"]', 'cat_2', 'system'),
('template_3', 'Market Alert', '{"text": "{{stock_symbol}} has reached your target price of ${{price}}.", "subject": "Market Alert - {{stock_symbol}}"}', '["stock_symbol", "price"]', '["email", "push", "in_app"]', 'cat_3', 'system'),
('template_4', 'System Maintenance', '{"text": "System maintenance is scheduled for {{maintenance_time}}. Please plan accordingly.", "subject": "System Maintenance Notice"}', '["maintenance_time"]', '["email", "in_app"]', 'cat_4', 'system')
ON CONFLICT (id) DO NOTHING;
