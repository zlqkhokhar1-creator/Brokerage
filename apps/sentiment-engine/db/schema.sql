-- Sentiment Engine Database Schema
-- This schema supports real-time market sentiment analysis

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sentiment_data table
CREATE TABLE IF NOT EXISTS sentiment_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    sentiment_score DECIMAL(3,2) NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    polarity VARCHAR(20) NOT NULL CHECK (polarity IN ('positive', 'negative', 'neutral')),
    subjectivity DECIMAL(3,2) NOT NULL CHECK (subjectivity >= 0 AND subjectivity <= 1),
    category VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sentiment_aggregates table for pre-computed aggregations
CREATE TABLE IF NOT EXISTS sentiment_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1h', '4h', '24h', '7d')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    avg_score DECIMAL(5,4) NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
    weighted_score DECIMAL(5,4) NOT NULL DEFAULT 0,
    positive_count INTEGER NOT NULL DEFAULT 0,
    negative_count INTEGER NOT NULL DEFAULT 0,
    neutral_count INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, timeframe, period_start)
);

-- Create sentiment_alerts table
CREATE TABLE IF NOT EXISTS sentiment_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    threshold DECIMAL(3,2) NOT NULL,
    current_score DECIMAL(3,2) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sentiment_subscriptions table for user subscriptions
CREATE TABLE IF NOT EXISTS sentiment_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    alert_threshold DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- Create sentiment_sources table for tracking data sources
CREATE TABLE IF NOT EXISTS sentiment_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sentiment_trends table for trend analysis
CREATE TABLE IF NOT EXISTS sentiment_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1h', '4h', '24h', '7d')),
    trend_direction VARCHAR(20) NOT NULL CHECK (trend_direction IN ('improving', 'declining', 'stable')),
    trend_strength DECIMAL(3,2) NOT NULL CHECK (trend_strength >= 0 AND trend_strength <= 1),
    change_amount DECIMAL(5,4) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, timeframe, period_start)
);

-- Create market_sentiment table for market-wide sentiment
CREATE TABLE IF NOT EXISTS market_sentiment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1h', '4h', '24h', '7d')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    market_sentiment VARCHAR(20) NOT NULL CHECK (market_sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
    avg_score DECIMAL(5,4) NOT NULL,
    total_symbols INTEGER NOT NULL DEFAULT 0,
    positive_symbols INTEGER NOT NULL DEFAULT 0,
    negative_symbols INTEGER NOT NULL DEFAULT 0,
    neutral_symbols INTEGER NOT NULL DEFAULT 0,
    volatility DECIMAL(5,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timeframe, period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_data_symbol ON sentiment_data(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_source ON sentiment_data(source);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_created_at ON sentiment_data(created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_symbol_created_at ON sentiment_data(symbol, created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_score ON sentiment_data(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_sentiment_data_confidence ON sentiment_data(confidence);

CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_symbol ON sentiment_aggregates(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_timeframe ON sentiment_aggregates(timeframe);
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_period ON sentiment_aggregates(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_symbol_timeframe ON sentiment_aggregates(symbol, timeframe);

CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_symbol ON sentiment_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_triggered_at ON sentiment_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_priority ON sentiment_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_active ON sentiment_alerts(is_active);

CREATE INDEX IF NOT EXISTS idx_sentiment_subscriptions_user_id ON sentiment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_subscriptions_symbol ON sentiment_subscriptions(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_subscriptions_active ON sentiment_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_sentiment_trends_symbol ON sentiment_trends(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_trends_timeframe ON sentiment_trends(timeframe);
CREATE INDEX IF NOT EXISTS idx_sentiment_trends_period ON sentiment_trends(period_start);

CREATE INDEX IF NOT EXISTS idx_market_sentiment_timeframe ON market_sentiment(timeframe);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_period ON market_sentiment(period_start);

-- Create functions for sentiment analysis

-- Function to calculate sentiment category
CREATE OR REPLACE FUNCTION calculate_sentiment_category(score DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    IF score >= 0.6 THEN
        RETURN 'very_positive';
    ELSIF score >= 0.2 THEN
        RETURN 'positive';
    ELSIF score >= -0.2 THEN
        RETURN 'neutral';
    ELSIF score >= -0.6 THEN
        RETURN 'negative';
    ELSE
        RETURN 'very_negative';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate sentiment data
CREATE OR REPLACE FUNCTION aggregate_sentiment_data(
    p_symbol VARCHAR,
    p_timeframe VARCHAR,
    p_period_start TIMESTAMP WITH TIME ZONE,
    p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    count INTEGER,
    avg_score DECIMAL,
    avg_confidence DECIMAL,
    weighted_score DECIMAL,
    positive_count INTEGER,
    negative_count INTEGER,
    neutral_count INTEGER,
    category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as count,
        AVG(sd.sentiment_score)::DECIMAL as avg_score,
        AVG(sd.confidence)::DECIMAL as avg_confidence,
        (AVG(sd.sentiment_score) * AVG(sd.confidence))::DECIMAL as weighted_score,
        COUNT(CASE WHEN sd.sentiment_score > 0.1 THEN 1 END)::INTEGER as positive_count,
        COUNT(CASE WHEN sd.sentiment_score < -0.1 THEN 1 END)::INTEGER as negative_count,
        COUNT(CASE WHEN sd.sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 END)::INTEGER as neutral_count,
        calculate_sentiment_category(AVG(sd.sentiment_score) * AVG(sd.confidence)) as category
    FROM sentiment_data sd
    WHERE sd.symbol = p_symbol
        AND sd.created_at >= p_period_start
        AND sd.created_at < p_period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to get sentiment trends
CREATE OR REPLACE FUNCTION get_sentiment_trends(
    p_symbol VARCHAR,
    p_timeframe VARCHAR,
    p_periods INTEGER DEFAULT 10
)
RETURNS TABLE(
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    avg_score DECIMAL,
    trend_direction VARCHAR,
    trend_strength DECIMAL
) AS $$
DECLARE
    period_interval INTERVAL;
    current_start TIMESTAMP WITH TIME ZONE;
    current_end TIMESTAMP WITH TIME ZONE;
    prev_score DECIMAL;
    current_score DECIMAL;
    trend_direction VARCHAR;
    trend_strength DECIMAL;
BEGIN
    -- Calculate period interval based on timeframe
    CASE p_timeframe
        WHEN '1h' THEN period_interval := INTERVAL '1 hour';
        WHEN '4h' THEN period_interval := INTERVAL '4 hours';
        WHEN '24h' THEN period_interval := INTERVAL '1 day';
        WHEN '7d' THEN period_interval := INTERVAL '7 days';
        ELSE period_interval := INTERVAL '1 hour';
    END CASE;

    -- Get the most recent period end
    SELECT MAX(created_at) INTO current_end
    FROM sentiment_data
    WHERE symbol = p_symbol;

    IF current_end IS NULL THEN
        RETURN;
    END IF;

    -- Calculate periods
    FOR i IN 1..p_periods LOOP
        current_start := current_end - period_interval;
        
        -- Get average score for this period
        SELECT AVG(sentiment_score * confidence) INTO current_score
        FROM sentiment_data
        WHERE symbol = p_symbol
            AND created_at >= current_start
            AND created_at < current_end;

        -- Calculate trend direction and strength
        IF prev_score IS NOT NULL AND current_score IS NOT NULL THEN
            IF current_score > prev_score + 0.1 THEN
                trend_direction := 'improving';
                trend_strength := LEAST(ABS(current_score - prev_score), 1.0);
            ELSIF current_score < prev_score - 0.1 THEN
                trend_direction := 'declining';
                trend_strength := LEAST(ABS(current_score - prev_score), 1.0);
            ELSE
                trend_direction := 'stable';
                trend_strength := 0.0;
            END IF;
        ELSE
            trend_direction := 'stable';
            trend_strength := 0.0;
        END IF;

        -- Return this period's data
        period_start := current_start;
        period_end := current_end;
        avg_score := current_score;
        trend_direction := trend_direction;
        trend_strength := trend_strength;
        RETURN NEXT;

        prev_score := current_score;
        current_end := current_start;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_sentiment_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old sentiment data
    DELETE FROM sentiment_data
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old aggregates
    DELETE FROM sentiment_aggregates
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    -- Delete old alerts
    DELETE FROM sentiment_alerts
    WHERE triggered_at < NOW() - INTERVAL '1 day' * retention_days
        AND acknowledged_at IS NOT NULL;
    
    -- Delete old trends
    DELETE FROM sentiment_trends
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    -- Delete old market sentiment
    DELETE FROM market_sentiment
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default sentiment sources
INSERT INTO sentiment_sources (name, display_name, description, weight) VALUES
('news', 'News Articles', 'Financial news articles and press releases', 1.0),
('twitter', 'Twitter/X', 'Social media posts and tweets', 0.8),
('reddit', 'Reddit', 'Reddit discussions and posts', 0.6),
('youtube', 'YouTube', 'YouTube videos and comments', 0.7),
('analyst', 'Analyst Reports', 'Professional analyst reports and ratings', 1.2),
('earnings', 'Earnings Calls', 'Earnings call transcripts and analysis', 1.1),
('press_release', 'Press Releases', 'Official company press releases', 1.3),
('general', 'General', 'General financial content', 0.5)
ON CONFLICT (name) DO NOTHING;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sentiment_data_updated_at
    BEFORE UPDATE ON sentiment_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sentiment_aggregates_updated_at
    BEFORE UPDATE ON sentiment_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sentiment_subscriptions_updated_at
    BEFORE UPDATE ON sentiment_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sentiment_sources_updated_at
    BEFORE UPDATE ON sentiment_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
