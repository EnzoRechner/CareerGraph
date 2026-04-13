-- This script creates the core tables for CareerGraph.
-- It is idempotent and will be executed automatically on the first DB boot via docker-compose.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS career_nodes (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soc_code                 VARCHAR(10) UNIQUE NOT NULL,
    title                    VARCHAR(200) NOT NULL,
    description              TEXT,
    career_cluster           VARCHAR(100),
    education_level          VARCHAR(50),
    median_salary_usd        DECIMAL(12, 2),
    experience_years_typical INT,
    bright_outlook           BOOLEAN DEFAULT FALSE,
    metadata                 JSONB DEFAULT '{}'::jsonb,
    source                   VARCHAR(20) NOT NULL DEFAULT 'onet',
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_edges (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id           UUID NOT NULL REFERENCES career_nodes(id) ON DELETE CASCADE,
    target_node_id           UUID NOT NULL REFERENCES career_nodes(id) ON DELETE CASCADE,
    relationship_type        VARCHAR(30) NOT NULL DEFAULT 'related',
    weight                   DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    years_experience_delta   INT,
    required_certifications  TEXT[],
    salary_delta_usd         DECIMAL(12, 2),
    description              TEXT,
    source                   VARCHAR(20) NOT NULL DEFAULT 'onet',
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_career_edge UNIQUE (source_node_id, target_node_id, relationship_type),
    CONSTRAINT chk_no_self_edge CHECK (source_node_id <> target_node_id)
);

-- Indexes for graph traversal
CREATE INDEX IF NOT EXISTS ix_career_edges_source ON career_edges (source_node_id);
CREATE INDEX IF NOT EXISTS ix_career_edges_target ON career_edges (target_node_id);

-- Indexes for search and filtering
CREATE INDEX IF NOT EXISTS ix_career_nodes_cluster ON career_nodes (career_cluster);
CREATE INDEX IF NOT EXISTS ix_career_nodes_title_trgm ON career_nodes USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_career_nodes_soc_code ON career_nodes (soc_code);
