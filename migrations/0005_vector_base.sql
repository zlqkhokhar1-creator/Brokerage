-- Migration: Vector Base Tables (Placeholder)
-- Version: 0005
-- Checksum placeholder: SHA256 will be calculated by migration runner

BEGIN;

-- Vector namespace metadata
CREATE TABLE vector_namespace_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(255) UNIQUE NOT NULL,
  dimension INTEGER NOT NULL CHECK (dimension > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for namespace lookups
CREATE INDEX idx_vector_namespace_meta_namespace ON vector_namespace_meta(namespace);

-- Vectors table with REAL[] embedding column
-- TODO: Migrate to pgvector extension in PR10
CREATE TABLE vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id UUID NOT NULL REFERENCES vector_namespace_meta(id) ON DELETE CASCADE,
  vector_id VARCHAR(255) NOT NULL,
  embedding REAL[] NOT NULL,  -- Will migrate to vector type in PR10
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(namespace_id, vector_id)
);

-- Indexes for vector queries
CREATE INDEX idx_vectors_namespace_id ON vectors(namespace_id);
CREATE INDEX idx_vectors_vector_id ON vectors(vector_id);
CREATE INDEX idx_vectors_created_at ON vectors(created_at);

COMMIT;