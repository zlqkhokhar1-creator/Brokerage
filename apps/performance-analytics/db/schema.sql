-- Performance Analytics Database Schema

CREATE TABLE IF NOT EXISTS performance_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  benchmark_data JSONB,
  period JSONB NOT NULL,
  metrics JSONB NOT NULL,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attribution_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  method VARCHAR(100) NOT NULL,
  portfolio_data JSONB NOT NULL,
  benchmark_data JSONB NOT NULL,
  period JSONB NOT NULL,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS benchmark_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  benchmark VARCHAR(100) NOT NULL,
  period JSONB NOT NULL,
  metrics JSONB NOT NULL,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_adjusted_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  benchmark_data JSONB,
  period JSONB NOT NULL,
  metrics JSONB NOT NULL,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  benchmark_data JSONB,
  period JSONB NOT NULL,
  metrics JSONB NOT NULL,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_performance_analyses_user_id ON performance_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_analyses_created_at ON performance_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_attribution_analyses_user_id ON attribution_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_user_id ON benchmark_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_adjusted_returns_user_id ON risk_adjusted_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_analyses_user_id ON portfolio_analyses(user_id);

