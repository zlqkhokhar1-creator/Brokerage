-- Custom Reporting Engine Database Schema

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('trading', 'portfolio', 'market', 'risk', 'performance')),
    template_id UUID NOT NULL,
    parameters JSONB,
    schedule JSONB,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'failed')),
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_executed TIMESTAMP
);

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('portfolio', 'trading', 'market', 'risk', 'performance')),
    layout JSONB NOT NULL,
    widgets JSONB NOT NULL,
    filters JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_refreshed TIMESTAMP
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('html', 'pdf', 'excel', 'json')),
    category VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    parameters JSONB,
    metadata JSONB,
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report executions table
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    execution_time_ms INTEGER,
    result_data JSONB
);

-- Dashboard refreshes table
CREATE TABLE IF NOT EXISTS dashboard_refreshes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    refresh_time_ms INTEGER
);

-- Export jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path VARCHAR(500),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Data sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    connection_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget definitions table
CREATE TABLE IF NOT EXISTS widget_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('chart', 'table', 'metric', 'gauge', 'pie')),
    description TEXT,
    config_schema JSONB NOT NULL,
    default_config JSONB,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_type VARCHAR(50) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_type, preference_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_type ON dashboards(type);
CREATE INDEX IF NOT EXISTS idx_dashboards_status ON dashboards(status);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_at ON dashboards(created_at);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at);

CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_started_at ON report_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_dashboard_refreshes_dashboard_id ON dashboard_refreshes(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_refreshes_status ON dashboard_refreshes(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_refreshes_started_at ON dashboard_refreshes(started_at);

CREATE INDEX IF NOT EXISTS idx_export_jobs_report_id ON export_jobs(report_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_widget_definitions_type ON widget_definitions(type);
CREATE INDEX IF NOT EXISTS idx_widget_definitions_is_system ON widget_definitions(is_system);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_definitions_updated_at BEFORE UPDATE ON widget_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data sources
INSERT INTO data_sources (name, type, description, connection_config) VALUES
('Trading Data', 'trading', 'Trading transactions and orders', '{"table": "trading_transactions", "primary_key": "id"}'),
('Portfolio Data', 'portfolio', 'Portfolio holdings and performance', '{"table": "portfolio_holdings", "primary_key": "id"}'),
('Market Data', 'market', 'Market prices and indicators', '{"table": "market_data", "primary_key": "id"}'),
('Risk Data', 'risk', 'Risk metrics and calculations', '{"table": "risk_metrics", "primary_key": "id"}'),
('Performance Data', 'performance', 'Performance analytics and metrics', '{"table": "performance_metrics", "primary_key": "id"}')
ON CONFLICT DO NOTHING;

-- Insert default widget definitions
INSERT INTO widget_definitions (name, type, description, config_schema, default_config, is_system) VALUES
('Line Chart', 'chart', 'Line chart widget for time series data', '{"dataSource": {"type": "string"}, "xAxis": {"type": "string"}, "yAxis": {"type": "string"}}', '{"chartType": "line"}', true),
('Bar Chart', 'chart', 'Bar chart widget for categorical data', '{"dataSource": {"type": "string"}, "xAxis": {"type": "string"}, "yAxis": {"type": "string"}}', '{"chartType": "bar"}', true),
('Pie Chart', 'pie', 'Pie chart widget for proportional data', '{"dataSource": {"type": "string"}, "labelField": {"type": "string"}, "valueField": {"type": "string"}}', '{"chartType": "pie"}', true),
('Data Table', 'table', 'Table widget for tabular data', '{"dataSource": {"type": "string"}, "columns": {"type": "array"}}', '{"pageSize": 10}', true),
('Metric Card', 'metric', 'Metric card widget for single values', '{"dataSource": {"type": "string"}, "valueField": {"type": "string"}, "format": {"type": "string"}}', '{"format": "currency"}', true),
('Gauge Chart', 'gauge', 'Gauge chart widget for progress indicators', '{"dataSource": {"type": "string"}, "valueField": {"type": "string"}, "min": {"type": "number"}, "max": {"type": "number"}}', '{"min": 0, "max": 100}', true)
ON CONFLICT DO NOTHING;

