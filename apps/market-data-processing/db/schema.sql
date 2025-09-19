-- Market Data Processing Database Schema

CREATE TABLE IF NOT EXISTS market_data_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  raw_data JSONB NOT NULL,
  processing_options JSONB,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  market_data JSONB NOT NULL,
  indicators JSONB NOT NULL,
  parameters JSONB,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_ingestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  options JSONB,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  storage_type VARCHAR(50) NOT NULL,
  options JSONB,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  rules JSONB NOT NULL,
  options JSONB,
  results JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Time series data tables
CREATE TABLE IF NOT EXISTS market_data_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_data_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_data_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_data_processing_user_id ON market_data_processing(user_id);
CREATE INDEX IF NOT EXISTS idx_market_data_processing_symbol ON market_data_processing(symbol);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_user_id ON technical_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol ON technical_indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_data_ingestion_user_id ON data_ingestion(user_id);
CREATE INDEX IF NOT EXISTS idx_data_ingestion_symbol ON data_ingestion(symbol);
CREATE INDEX IF NOT EXISTS idx_data_storage_user_id ON data_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_data_storage_symbol ON data_storage(symbol);
CREATE INDEX IF NOT EXISTS idx_data_validation_user_id ON data_validation(user_id);
CREATE INDEX IF NOT EXISTS idx_data_validation_symbol ON data_validation(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timeseries_symbol ON market_data_timeseries(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timeseries_timestamp ON market_data_timeseries(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_timeseries_data_type ON market_data_timeseries(data_type);
CREATE INDEX IF NOT EXISTS idx_market_data_documents_symbol ON market_data_documents(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_blobs_symbol ON market_data_blobs(symbol);

