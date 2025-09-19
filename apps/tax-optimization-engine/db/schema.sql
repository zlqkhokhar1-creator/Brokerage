-- Tax Optimization Engine Database Schema

CREATE TABLE IF NOT EXISTS tax_optimization_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  preferences JSONB,
  constraints JSONB,
  results JSONB,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_loss_harvesting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  preferences JSONB,
  constraints JSONB,
  results JSONB,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wash_sale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  sale_date TIMESTAMP NOT NULL,
  loss_amount DECIMAL(15,2) NOT NULL,
  replacement_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id VARCHAR(100) NOT NULL,
  parameters JSONB,
  date_range JSONB,
  report_data JSONB,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  income DECIMAL(15,2) NOT NULL,
  deductions JSONB,
  filing_status VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  results JSONB,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  parameters JSONB,
  results JSONB,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_optimization_sessions_user_id ON tax_optimization_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_optimization_sessions_created_at ON tax_optimization_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_tax_loss_harvesting_sessions_user_id ON tax_loss_harvesting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wash_sale_transactions_user_id ON wash_sale_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wash_sale_transactions_symbol ON wash_sale_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_tax_reports_user_id ON tax_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_user_id ON tax_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_id ON compliance_checks(user_id);

