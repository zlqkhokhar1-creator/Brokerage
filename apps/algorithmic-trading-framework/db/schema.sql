-- Algorithmic Trading Framework Database Schema
-- This schema supports the complete algorithmic trading framework with plugins, strategies, backtesting, and paper trading

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS algorithmic_trading;

-- Use the database
\c algorithmic_trading;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE strategy_status AS ENUM ('inactive', 'active', 'paused', 'error');
CREATE TYPE backtest_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE session_status AS ENUM ('active', 'stopped', 'paused', 'error');
CREATE TYPE trade_action AS ENUM ('BUY', 'SELL');
CREATE TYPE trade_status AS ENUM ('pending', 'executed', 'cancelled', 'rejected');
CREATE TYPE order_type AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT');
CREATE TYPE time_in_force AS ENUM ('DAY', 'GTC', 'IOC', 'FOK');
CREATE TYPE risk_tolerance AS ENUM ('low', 'moderate', 'high', 'aggressive');
CREATE TYPE rule_type AS ENUM ('position_size', 'concentration', 'volatility', 'correlation', 'custom');

-- Strategies table
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    plugin_id VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}',
    symbols TEXT[] NOT NULL,
    user_id UUID NOT NULL,
    status strategy_status DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_strategy_name_per_user UNIQUE (name, user_id)
);

-- Create index on strategies
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_strategies_status ON strategies(status);
CREATE INDEX idx_strategies_plugin_id ON strategies(plugin_id);

-- Backtests table
CREATE TABLE backtests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_capital DECIMAL(15,2) NOT NULL,
    symbols TEXT[] NOT NULL,
    status backtest_status DEFAULT 'pending',
    results JSONB DEFAULT '{}',
    trades JSONB DEFAULT '[]',
    equity_curve JSONB DEFAULT '[]',
    drawdown_curve JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT positive_capital CHECK (initial_capital > 0)
);

-- Create index on backtests
CREATE INDEX idx_backtests_strategy_id ON backtests(strategy_id);
CREATE INDEX idx_backtests_user_id ON backtests(user_id);
CREATE INDEX idx_backtests_status ON backtests(status);
CREATE INDEX idx_backtests_created_at ON backtests(created_at);

-- Paper trading sessions table
CREATE TABLE paper_trading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    initial_capital DECIMAL(15,2) NOT NULL,
    current_capital DECIMAL(15,2) NOT NULL,
    symbols TEXT[] NOT NULL,
    status session_status DEFAULT 'active',
    positions JSONB DEFAULT '{}',
    trades JSONB DEFAULT '[]',
    performance JSONB DEFAULT '{}',
    equity_curve JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stopped_at TIMESTAMP WITH TIME ZONE,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_initial_capital CHECK (initial_capital > 0),
    CONSTRAINT non_negative_current_capital CHECK (current_capital >= 0)
);

-- Create index on paper trading sessions
CREATE INDEX idx_paper_sessions_strategy_id ON paper_trading_sessions(strategy_id);
CREATE INDEX idx_paper_sessions_user_id ON paper_trading_sessions(user_id);
CREATE INDEX idx_paper_sessions_status ON paper_trading_sessions(status);
CREATE INDEX idx_paper_sessions_started_at ON paper_trading_sessions(started_at);

-- Trades table (for both live and paper trading)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    session_id UUID REFERENCES paper_trading_sessions(id) ON DELETE CASCADE,
    backtest_id UUID REFERENCES backtests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    action trade_action NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    order_type order_type DEFAULT 'MARKET',
    time_in_force time_in_force DEFAULT 'DAY',
    status trade_status DEFAULT 'executed',
    reason TEXT,
    mode VARCHAR(10) DEFAULT 'paper', -- 'paper' or 'live'
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_trade_reference CHECK (
        (strategy_id IS NOT NULL AND session_id IS NULL AND backtest_id IS NULL) OR
        (strategy_id IS NULL AND session_id IS NOT NULL AND backtest_id IS NULL) OR
        (strategy_id IS NULL AND session_id IS NULL AND backtest_id IS NOT NULL)
    )
);

-- Create index on trades
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_session_id ON trades(session_id);
CREATE INDEX idx_trades_backtest_id ON trades(backtest_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_executed_at ON trades(executed_at);
CREATE INDEX idx_trades_mode ON trades(mode);

-- Risk rules table
CREATE TABLE risk_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type rule_type NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on risk rules
CREATE INDEX idx_risk_rules_type ON risk_rules(type);
CREATE INDEX idx_risk_rules_priority ON risk_rules(priority);
CREATE INDEX idx_risk_rules_is_active ON risk_rules(is_active);

-- User risk limits table
CREATE TABLE user_risk_limits (
    user_id UUID PRIMARY KEY,
    max_position_size DECIMAL(15,2) DEFAULT 100000,
    max_daily_loss DECIMAL(15,2) DEFAULT 10000,
    max_drawdown DECIMAL(5,4) DEFAULT 0.20,
    max_trades_per_day INTEGER DEFAULT 100,
    max_exposure DECIMAL(15,2) DEFAULT 500000,
    risk_tolerance risk_tolerance DEFAULT 'moderate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_max_position_size CHECK (max_position_size > 0),
    CONSTRAINT positive_max_daily_loss CHECK (max_daily_loss > 0),
    CONSTRAINT valid_max_drawdown CHECK (max_drawdown >= 0 AND max_drawdown <= 1),
    CONSTRAINT positive_max_trades_per_day CHECK (max_trades_per_day > 0),
    CONSTRAINT positive_max_exposure CHECK (max_exposure > 0)
);

-- Market data table (for historical data storage)
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(10,4) NOT NULL,
    high DECIMAL(10,4) NOT NULL,
    low DECIMAL(10,4) NOT NULL,
    close DECIMAL(10,4) NOT NULL,
    volume BIGINT NOT NULL,
    bid DECIMAL(10,4),
    ask DECIMAL(10,4),
    spread DECIMAL(8,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_ohlc CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0),
    CONSTRAINT valid_ohlc CHECK (high >= open AND high >= close AND low <= open AND low <= close),
    CONSTRAINT positive_volume CHECK (volume >= 0)
);

-- Create index on market data
CREATE INDEX idx_market_data_symbol ON market_data(symbol);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);

-- Performance metrics table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    session_id UUID REFERENCES paper_trading_sessions(id) ON DELETE CASCADE,
    backtest_id UUID REFERENCES backtests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_metric_reference CHECK (
        (strategy_id IS NOT NULL AND session_id IS NULL AND backtest_id IS NULL) OR
        (strategy_id IS NULL AND session_id IS NOT NULL AND backtest_id IS NULL) OR
        (strategy_id IS NULL AND session_id IS NULL AND backtest_id IS NOT NULL)
    )
);

-- Create index on performance metrics
CREATE INDEX idx_performance_strategy_id ON performance_metrics(strategy_id);
CREATE INDEX idx_performance_session_id ON performance_metrics(session_id);
CREATE INDEX idx_performance_backtest_id ON performance_metrics(backtest_id);
CREATE INDEX idx_performance_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_calculated_at ON performance_metrics(calculated_at);

-- System events table (for logging and monitoring)
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID,
    strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
    session_id UUID REFERENCES paper_trading_sessions(id) ON DELETE SET NULL,
    backtest_id UUID REFERENCES backtests(id) ON DELETE SET NULL,
    severity VARCHAR(20) DEFAULT 'info',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on system events
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_user_id ON system_events(user_id);
CREATE INDEX idx_system_events_strategy_id ON system_events(strategy_id);
CREATE INDEX idx_system_events_created_at ON system_events(created_at);
CREATE INDEX idx_system_events_severity ON system_events(severity);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_rules_updated_at BEFORE UPDATE ON risk_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_risk_limits_updated_at BEFORE UPDATE ON user_risk_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old backtests (older than 30 days)
    DELETE FROM backtests 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Delete old paper trading sessions (older than 7 days)
    DELETE FROM paper_trading_sessions 
    WHERE started_at < NOW() - INTERVAL '7 days' 
    AND status IN ('stopped', 'error');
    
    -- Delete old market data (older than 1 year)
    DELETE FROM market_data 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Delete old system events (older than 90 days)
    DELETE FROM system_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get strategy performance summary
CREATE OR REPLACE FUNCTION get_strategy_performance_summary(p_strategy_id UUID)
RETURNS TABLE (
    total_trades BIGINT,
    winning_trades BIGINT,
    losing_trades BIGINT,
    total_pnl DECIMAL(15,2),
    win_rate DECIMAL(5,2),
    avg_win DECIMAL(15,2),
    avg_loss DECIMAL(15,2),
    profit_factor DECIMAL(10,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE action = 'SELL' AND quantity > 0) as winning_trades,
        COUNT(*) FILTER (WHERE action = 'BUY') as losing_trades,
        COALESCE(SUM(CASE WHEN action = 'SELL' THEN quantity * price ELSE -quantity * price END), 0) as total_pnl,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE action = 'SELL' AND quantity > 0)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as win_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE action = 'SELL' AND quantity > 0) > 0 THEN
                ROUND(AVG(CASE WHEN action = 'SELL' AND quantity > 0 THEN quantity * price END), 2)
            ELSE 0 
        END as avg_win,
        CASE 
            WHEN COUNT(*) FILTER (WHERE action = 'BUY') > 0 THEN
                ROUND(AVG(CASE WHEN action = 'BUY' THEN quantity * price END), 2)
            ELSE 0 
        END as avg_loss,
        CASE 
            WHEN SUM(CASE WHEN action = 'BUY' THEN quantity * price ELSE 0 END) > 0 THEN
                ROUND(SUM(CASE WHEN action = 'SELL' THEN quantity * price ELSE 0 END) / 
                      SUM(CASE WHEN action = 'BUY' THEN quantity * price ELSE 0 END), 4)
            ELSE 0 
        END as profit_factor
    FROM trades 
    WHERE strategy_id = p_strategy_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for strategy summary
CREATE VIEW strategy_summary AS
SELECT 
    s.id,
    s.name,
    s.description,
    s.plugin_id,
    s.symbols,
    s.status,
    s.created_at,
    s.updated_at,
    COALESCE(ps.total_trades, 0) as total_trades,
    COALESCE(ps.winning_trades, 0) as winning_trades,
    COALESCE(ps.losing_trades, 0) as losing_trades,
    COALESCE(ps.total_pnl, 0) as total_pnl,
    COALESCE(ps.win_rate, 0) as win_rate,
    COALESCE(ps.avg_win, 0) as avg_win,
    COALESCE(ps.avg_loss, 0) as avg_loss,
    COALESCE(ps.profit_factor, 0) as profit_factor
FROM strategies s
LEFT JOIN LATERAL get_strategy_performance_summary(s.id) ps ON true;

-- Insert default risk rules
INSERT INTO risk_rules (name, type, conditions, actions, priority) VALUES
('Maximum Position Size', 'position_size', '{"maxSize": 100000, "maxPercentOfPortfolio": 10}', '{"action": "reject", "message": "Position size exceeds limits"}', 1),
('Sector Concentration', 'concentration', '{"maxConcentration": 0.3, "sector": "technology"}', '{"action": "reject", "message": "Sector concentration too high"}', 2),
('Volatility Limit', 'volatility', '{"maxVolatility": 0.05}', '{"action": "reject", "message": "Symbol volatility too high"}', 3),
('Correlation Limit', 'correlation', '{"maxCorrelation": 0.8, "symbols": ["AAPL", "GOOGL"]}', '{"action": "reject", "message": "Portfolio correlation too high"}', 4);

-- Insert default user risk limits for demo users
INSERT INTO user_risk_limits (user_id, max_position_size, max_daily_loss, max_drawdown, max_trades_per_day, max_exposure, risk_tolerance) VALUES
('00000000-0000-0000-0000-000000000001', 100000, 10000, 0.20, 100, 500000, 'moderate'),
('00000000-0000-0000-0000-000000000002', 200000, 20000, 0.30, 200, 1000000, 'high'),
('00000000-0000-0000-0000-000000000003', 50000, 5000, 0.10, 50, 250000, 'low');

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_trades_user_symbol ON trades(user_id, symbol);
CREATE INDEX CONCURRENTLY idx_trades_executed_at_desc ON trades(executed_at DESC);
CREATE INDEX CONCURRENTLY idx_market_data_symbol_timestamp_desc ON market_data(symbol, timestamp DESC);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Create a function to get database health
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'strategies'::TEXT as table_name,
        COUNT(*)::BIGINT as row_count,
        MAX(updated_at) as last_updated
    FROM strategies
    UNION ALL
    SELECT 
        'backtests'::TEXT as table_name,
        COUNT(*)::BIGINT as row_count,
        MAX(created_at) as last_updated
    FROM backtests
    UNION ALL
    SELECT 
        'paper_trading_sessions'::TEXT as table_name,
        COUNT(*)::BIGINT as row_count,
        MAX(started_at) as last_updated
    FROM paper_trading_sessions
    UNION ALL
    SELECT 
        'trades'::TEXT as table_name,
        COUNT(*)::BIGINT as row_count,
        MAX(executed_at) as last_updated
    FROM trades
    UNION ALL
    SELECT 
        'market_data'::TEXT as table_name,
        COUNT(*)::BIGINT as row_count,
        MAX(timestamp) as last_updated
    FROM market_data;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get system statistics
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    total_strategies BIGINT,
    active_strategies BIGINT,
    total_backtests BIGINT,
    running_backtests BIGINT,
    total_sessions BIGINT,
    active_sessions BIGINT,
    total_trades BIGINT,
    today_trades BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM strategies) as total_strategies,
        (SELECT COUNT(*) FROM strategies WHERE status = 'active') as active_strategies,
        (SELECT COUNT(*) FROM backtests) as total_backtests,
        (SELECT COUNT(*) FROM backtests WHERE status = 'running') as running_backtests,
        (SELECT COUNT(*) FROM paper_trading_sessions) as total_sessions,
        (SELECT COUNT(*) FROM paper_trading_sessions WHERE status = 'active') as active_sessions,
        (SELECT COUNT(*) FROM trades) as total_trades,
        (SELECT COUNT(*) FROM trades WHERE executed_at >= CURRENT_DATE) as today_trades;
END;
$$ LANGUAGE plpgsql;

