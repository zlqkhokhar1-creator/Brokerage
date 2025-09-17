-- Feature Toggle System Database Schema
-- This schema enables dynamic feature management across membership tiers

-- Features table - defines all available features
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'trading', 'ai', 'analytics', 'social', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership tiers table
CREATE TABLE IF NOT EXISTS membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature availability per tier
CREATE TABLE IF NOT EXISTS tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  limits JSONB DEFAULT '{}', -- Store limits like {'max_portfolio_size': 100000, 'api_calls_per_day': 1000}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, feature_id)
);

-- User tier assignments
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'trial'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One active membership per user
);

-- Feature usage tracking for limits enforcement
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER,
  reset_date TIMESTAMP WITH TIME ZONE,
  period VARCHAR(50) DEFAULT 'daily', -- 'daily', 'monthly', 'unlimited'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- Audit trail for feature changes
CREATE TABLE IF NOT EXISTS feature_toggle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'limit_changed'
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tier_features_tier_id ON tier_features(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_features_feature_id ON tier_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_reset_date ON feature_usage(reset_date);
CREATE INDEX IF NOT EXISTS idx_feature_toggle_logs_created_at ON feature_toggle_logs(created_at);

-- Insert default membership tiers
INSERT INTO membership_tiers (name, display_name, price_monthly, price_yearly) VALUES
('free', 'Free', 0.00, 0.00),
('basic', 'Basic', 9.99, 99.99),
('premium', 'Premium', 29.99, 299.99),
('vip', 'VIP', 99.99, 999.99)
ON CONFLICT (name) DO NOTHING;

-- Insert default features
INSERT INTO features (name, display_name, description, category) VALUES
-- Trading Features
('basic_trading', 'Basic Trading', 'Place market and limit orders', 'trading'),
('advanced_orders', 'Advanced Orders', 'Stop-loss, trailing stops, and bracket orders', 'trading'),
('unlimited_trades', 'Unlimited Trading', 'No daily trade limits', 'trading'),
('options_trading', 'Options Trading', 'Trade options contracts', 'trading'),
('futures_trading', 'Futures Trading', 'Trade futures contracts', 'trading'),

-- AI Features
('ai_predictions', 'AI Market Predictions', 'Real-time AI-powered market predictions', 'ai'),
('ai_signals', 'AI Trading Signals', 'Automated buy/sell signals', 'ai'),
('ai_portfolio', 'AI Portfolio Management', 'AI-driven portfolio optimization', 'ai'),
('ai_risk_assessment', 'AI Risk Assessment', 'Advanced risk analysis', 'ai'),
('ai_news_analysis', 'AI News Analysis', 'Sentiment analysis of news', 'ai'),

-- Analytics Features
('basic_charts', 'Basic Charts', 'Standard price charts', 'analytics'),
('advanced_charts', 'Advanced Charts', 'Technical indicators and advanced charting', 'analytics'),
('portfolio_analytics', 'Portfolio Analytics', 'Detailed portfolio performance analysis', 'analytics'),
('risk_metrics', 'Risk Metrics', 'VaR, Sharpe ratio, and other risk metrics', 'analytics'),
('backtesting', 'Strategy Backtesting', 'Test trading strategies on historical data', 'analytics'),

-- Social Features
('social_feed', 'Social Feed', 'View community trades and insights', 'social'),
('social_trading', 'Social Trading', 'Copy other traders strategies', 'social'),
('private_communities', 'Private Communities', 'Access to exclusive trading communities', 'social'),
('expert_insights', 'Expert Insights', 'Access to professional trader insights', 'social'),

-- Education Features
('basic_education', 'Basic Education', 'Fundamental trading education', 'education'),
('advanced_education', 'Advanced Education', 'Expert-level trading courses', 'education'),
('live_webinars', 'Live Webinars', 'Real-time educational sessions', 'education'),
('personal_coaching', 'Personal Coaching', '1-on-1 coaching with experts', 'education'),

-- Support Features
('email_support', 'Email Support', 'Email customer support', 'support'),
('chat_support', 'Live Chat Support', 'Real-time chat support', 'support'),
('phone_support', 'Phone Support', 'Phone customer support', 'support'),
('priority_support', 'Priority Support', 'Fast-tracked support requests', 'support')
ON CONFLICT (name) DO NOTHING;

-- Set up default feature availability for tiers
-- Free tier - basic features only
INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits)
SELECT mt.id, f.id, true, '{"max_portfolio_size": 10000, "api_calls_per_day": 100}'
FROM membership_tiers mt, features f
WHERE mt.name = 'free'
  AND f.name IN ('basic_trading', 'basic_charts', 'basic_education', 'email_support')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Basic tier - more features
INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits)
SELECT mt.id, f.id, true, '{"max_portfolio_size": 50000, "api_calls_per_day": 500}'
FROM membership_tiers mt, features f
WHERE mt.name = 'basic'
  AND f.name IN ('basic_trading', 'advanced_orders', 'basic_charts', 'advanced_charts', 'portfolio_analytics', 'social_feed', 'basic_education', 'advanced_education', 'email_support', 'chat_support')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Premium tier - most features
INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits)
SELECT mt.id, f.id, true, '{"max_portfolio_size": 500000, "api_calls_per_day": 2000}'
FROM membership_tiers mt, features f
WHERE mt.name = 'premium'
  AND f.name IN ('basic_trading', 'advanced_orders', 'unlimited_trades', 'options_trading', 'ai_predictions', 'ai_signals', 'ai_portfolio', 'ai_risk_assessment', 'basic_charts', 'advanced_charts', 'portfolio_analytics', 'risk_metrics', 'backtesting', 'social_feed', 'social_trading', 'private_communities', 'basic_education', 'advanced_education', 'live_webinars', 'email_support', 'chat_support', 'phone_support')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- VIP tier - all features
INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits)
SELECT mt.id, f.id, true, '{"max_portfolio_size": 10000000, "api_calls_per_day": 10000}'
FROM membership_tiers mt, features f
WHERE mt.name = 'vip'
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Create function to get user's current tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TABLE(tier_name VARCHAR, tier_id UUID, status VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT mt.name, mt.id, um.status
  FROM user_memberships um
  JOIN membership_tiers mt ON um.tier_id = mt.id
  WHERE um.user_id = user_uuid
    AND um.status = 'active'
    AND (um.end_date IS NULL OR um.end_date > NOW())
  ORDER BY um.start_date DESC
  LIMIT 1;
END;
$$;

-- Create function to check feature access
CREATE OR REPLACE FUNCTION check_feature_access(user_uuid UUID, feature_name VARCHAR)
RETURNS TABLE(has_access BOOLEAN, limits JSONB, usage_count INTEGER, usage_limit INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  user_tier VARCHAR;
  feature_limits JSONB;
  current_usage INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier_name INTO user_tier
  FROM get_user_tier(user_uuid);

  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Check if feature is enabled for user's tier
  SELECT tf.limits INTO feature_limits
  FROM tier_features tf
  JOIN membership_tiers mt ON tf.tier_id = mt.id
  JOIN features f ON tf.feature_id = f.id
  WHERE mt.name = user_tier
    AND f.name = feature_name
    AND tf.is_enabled = true;

  -- Get current usage
  SELECT fu.usage_count, fu.usage_limit INTO current_usage, usage_limit
  FROM feature_usage fu
  JOIN features f ON fu.feature_id = f.id
  WHERE fu.user_id = user_uuid
    AND f.name = feature_name;

  RETURN QUERY
  SELECT
    (feature_limits IS NOT NULL) as has_access,
    feature_limits,
    COALESCE(current_usage, 0) as usage_count,
    (feature_limits->>'api_calls_per_day')::INTEGER as usage_limit;
END;
$$;

-- Create function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(user_uuid UUID, feature_name VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  feature_uuid UUID;
  current_count INTEGER;
  usage_limit INTEGER;
BEGIN
  -- Get feature ID
  SELECT id INTO feature_uuid
  FROM features
  WHERE name = feature_name;

  IF feature_uuid IS NULL THEN
    RETURN;
  END IF;

  -- Get or create usage record
  INSERT INTO feature_usage (user_id, feature_id, usage_count, usage_limit, reset_date, period)
  VALUES (user_uuid, feature_uuid, 1, 1000, NOW() + INTERVAL '1 day', 'daily')
  ON CONFLICT (user_id, feature_id)
  DO UPDATE SET
    usage_count = feature_usage.usage_count + 1,
    updated_at = NOW();

  -- Check if limit exceeded (you can add logic here to block access)
  SELECT usage_count, usage_limit INTO current_count, usage_limit
  FROM feature_usage
  WHERE user_id = user_uuid AND feature_id = feature_uuid;

  IF current_count > usage_limit THEN
    -- Log limit exceeded (you can add notification logic here)
    INSERT INTO feature_toggle_logs (feature_id, tier_id, admin_id, action, new_value)
    SELECT feature_uuid, um.tier_id, user_uuid, 'limit_exceeded', jsonb_build_object('usage_count', current_count, 'usage_limit', usage_limit)
    FROM user_memberships um
    WHERE um.user_id = user_uuid AND um.status = 'active'
    LIMIT 1;
  END IF;
END;
$$;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_tiers_updated_at BEFORE UPDATE ON membership_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tier_features_updated_at BEFORE UPDATE ON tier_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON user_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_usage_updated_at BEFORE UPDATE ON feature_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();