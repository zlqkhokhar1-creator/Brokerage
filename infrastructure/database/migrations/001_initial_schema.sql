-- Initial Database Schema for Brokerage Platform
-- This migration creates all necessary tables for the microservices

-- Create databases for each service
CREATE DATABASE IF NOT EXISTS brokerage_algorithmic_trading;
CREATE DATABASE IF NOT EXISTS brokerage_risk_monitoring;
CREATE DATABASE IF NOT EXISTS brokerage_compliance;
CREATE DATABASE IF NOT EXISTS brokerage_fraud_detection;
CREATE DATABASE IF NOT EXISTS brokerage_tax_optimization;
CREATE DATABASE IF NOT EXISTS brokerage_performance_analytics;
CREATE DATABASE IF NOT EXISTS brokerage_market_data;
CREATE DATABASE IF NOT EXISTS brokerage_custom_reporting;
CREATE DATABASE IF NOT EXISTS brokerage_zero_trust;
CREATE DATABASE IF NOT EXISTS brokerage_integration;
CREATE DATABASE IF NOT EXISTS brokerage_notifications;
CREATE DATABASE IF NOT EXISTS brokerage_kyc;
CREATE DATABASE IF NOT EXISTS brokerage_identity;
CREATE DATABASE IF NOT EXISTS brokerage_onboarding;
CREATE DATABASE IF NOT EXISTS brokerage_events;
CREATE DATABASE IF NOT EXISTS brokerage_monitoring;

-- Create main brokerage database
CREATE DATABASE IF NOT EXISTS brokerage;

-- Use main database
\c brokerage;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create common tables
CREATE TABLE IF NOT EXISTS service_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    url VARCHAR(255) NOT NULL,
    health_check_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address JSONB,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    verification_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_service_registry_name ON service_registry(name);
CREATE INDEX IF NOT EXISTS idx_service_registry_status ON service_registry(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_registry_updated_at BEFORE UPDATE ON service_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
