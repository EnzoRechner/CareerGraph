# CLAUDE.md — CareerGraph

## Project Overview

CareerGraph is a self-hosted web application that visualises career progression paths as an interactive 3D node graph. Users explore careers, see what's required to transition between roles, and find optimal paths from their current position to a target career.

**Core concept:** Store a directed graph of ~1,000 career roles (seeded from O\*NET 30.2 public data) with weighted edges representing career transitions. Render the user's local neighbourhood (2-3 hops) in a 3D force-directed graph. Click to explore, select start/end to pathfind.

**Data caveat:** O\*NET is US-centric (US Department of Labor). Career titles, salary data, and SOC codes are American. The architecture supports internationalisation (additional data sources, regional salary overrides) but the MVP ships with US data as the universal seed. This is a known gap, not an oversight.

## Tech Stack

- **Frontend:** Angular 19 (standalone components, signals, zoneless if stable)
- **Backend:** .NET 8 Minimal API with Entity Framework Core
- **Database:** PostgreSQL 16 with adjacency list model
- **3D Rendering:** `3d-force-graph` (Three.js + d3-force-3d) wrapped in Angular component
- **Containerisation:** Docker Compose (Caddy + nginx + Kestrel + PostgreSQL)
- **Testing:** xUnit (.NET), Jasmine/Karma or Jest (Angular)

## Monorepo Structure

```
careergraph/
├── CLAUDE.md                          # This file — Claude Code mother prompt
├── PROJECT_PLAN.md                    # Human-readable project plan
├── PHASE_RUNNER.md                    # Autonomous execution protocol + feedback loop
├── FEEDBACK.md                        # Developer feedback after each phase (Claude Code reads this)
├── MONETISATION.md                    # Revenue strategy, tier definitions, Stripe integration specs
├── docker-compose.yml                 # Full stack orchestration
├── docker-compose.override.yml        # Dev overrides (port mapping, volumes)
├── .env.example                       # Template for required environment variables
├── .gitignore
├── Caddyfile                          # Reverse proxy config (production)
│
├── src/
│   ├── api/                           # .NET 8 Minimal API
│   │   ├── CareerGraph.Api/
│   │   │   ├── Program.cs
│   │   │   ├── CareerGraph.Api.csproj
│   │   │   ├── appsettings.json
│   │   │   ├── appsettings.Development.json
│   │   │   ├── Endpoints/
│   │   │   │   ├── CareerEndpoints.cs
│   │   │   │   └── HealthEndpoints.cs
│   │   │   ├── Services/
│   │   │   │   ├── ICareerService.cs
│   │   │   │   ├── CareerService.cs
│   │   │   │   ├── IPathfindingService.cs
│   │   │   │   └── PathfindingService.cs
│   │   │   ├── Models/
│   │   │   │   ├── CareerNode.cs
│   │   │   │   ├── CareerEdge.cs
│   │   │   │   └── Dtos/
│   │   │   │       ├── CareerNodeDto.cs
│   │   │   │       ├── CareerNodeDetailDto.cs
│   │   │   │       ├── GraphDto.cs
│   │   │   │       ├── PathDto.cs
│   │   │   │       └── ClusterSummaryDto.cs
│   │   │   ├── Data/
│   │   │   │   ├── CareerGraphDbContext.cs
│   │   │   │   ├── Configurations/
│   │   │   │   │   ├── CareerNodeConfiguration.cs
│   │   │   │   │   └── CareerEdgeConfiguration.cs
│   │   │   │   └── Migrations/
│   │   │   └── Dockerfile
│   │   └── CareerGraph.Api.Tests/
│   │       ├── CareerGraph.Api.Tests.csproj
│   │       ├── Services/
│   │       │   ├── CareerServiceTests.cs
│   │       │   └── PathfindingServiceTests.cs
│   │       └── Endpoints/
│   │
│   └── web/                           # Angular 19 app
│       ├── angular.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── proxy.conf.json            # Dev proxy: /api → localhost:5000
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
│           ├── app/
│           │   ├── app.component.ts
│           │   ├── app.config.ts
│           │   ├── app.routes.ts
│           │   ├── core/
│           │   │   ├── services/
│           │   │   │   ├── career-api.service.ts
│           │   │   │   └── graph-data.service.ts
│           │   │   ├── models/
│           │   │   │   ├── career-node.model.ts
│           │   │   │   ├── career-edge.model.ts
│           │   │   │   └── graph-data.model.ts
│           │   │   └── interceptors/
│           │   │       └── api-base-url.interceptor.ts
│           │   ├── features/
│           │   │   ├── graph-canvas/
│           │   │   │   ├── graph-canvas.component.ts
│           │   │   │   └── graph-canvas.component.scss
│           │   │   ├── career-detail/
│           │   │   │   ├── career-detail.component.ts
│           │   │   │   └── career-detail.component.scss
│           │   │   ├── search/
│           │   │   │   ├── search.component.ts
│           │   │   │   └── search.component.scss
│           │   │   └── path-finder/
│           │   │       ├── path-finder.component.ts
│           │   │       └── path-finder.component.scss
│           │   └── shared/
│           │       ├── components/
│           │       └── pipes/
│           ├── environments/
│           │   ├── environment.ts
│           │   └── environment.development.ts
│           └── styles/
│               └── styles.scss
│
├── data/
│   ├── onet/                          # O*NET 30.2 PostgreSQL SQL files (gitignored)
│   │   └── .gitkeep
│   ├── seed/
│   │   ├── README.md                  # Step-by-step download + import instructions
│   │   ├── V1__create_careergraph_schema.sql    # Our career_nodes + career_edges DDL
│   │   ├── V2__import_onet_staging.sh           # Shell: loads O*NET SQL into staging schema
│   │   ├── V3__transform_onet_to_careergraph.sql  # Maps staging → our schema
│   │   └── V4__verify_seed.sql                  # Sanity check queries
│   └── migrations/                    # Future incremental migrations
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── ONET_DATA_DICTIONARY.md        # Core O*NET table schemas (5 tables)
    ├── ONET_METADATA_EXPANSION.md     # Additional O*NET tables + transformation SQL
    └── DEVELOPMENT.md                 # Local dev setup instructions
```

## Environment Variables

```env
# .env.example — copy to .env and fill in values
DB_PASSWORD=changeme_use_a_strong_password
DB_HOST=db
DB_PORT=5432
DB_NAME=careergraph
DB_USER=careergraph

# Angular dev proxy target (used in proxy.conf.json for ng serve)
API_BASE_URL=http://localhost:5000

# Production domain (used by Caddy)
DOMAIN=careergraph.example.com
```

**Important:** `.env` is gitignored. `.env.example` is committed. Claude Code should create `.env.example` with placeholder values and document the setup in `docs/DEVELOPMENT.md`.

## Coding Conventions

Follow these strictly. Consistency has measurable value.

### General
- Explicit over implicit. Descriptive names. No `i`, `x`, `temp`.
- Comments where code alone doesn't explain the *why*.
- Only catch exceptions when adding value. Never catch-and-rethrow empty. Never swallow.
- Code for the next developer. In 2 months, you are the next developer.
- Lower impedance mismatch: keep property names consistent through the stack where possible (e.g., `socCode` in C# DTO → `socCode` in TypeScript model → `soc_code` only at the DB boundary).

### C# / .NET
- Use Minimal API pattern (`app.MapGet(...)`) not controllers.
- Constructor-injected services with interface abstractions (`ICareerService`, `IPathfindingService`).
- Private backing fields prefixed with `_` (e.g., `_careerService`).
- Async/await throughout. Suffix async methods with `Async`.
- DTOs in `Models/Dtos/` folder. Domain models in `Models/`.
- Use `record` types for DTOs where appropriate.
- EF Core with Fluent API configuration in dedicated `Configurations/` classes (no data annotations on models). One configuration class per entity.
- Return `Results.Ok()`, `Results.NotFound()` etc. from endpoints.
- Use `System.Text.Json` with camelCase naming policy (matches Angular expectations).
- Configure CORS in `Program.cs` — allow the Angular dev origin (`http://localhost:4200`) in development. See CORS section below.

### Angular / TypeScript
- Standalone components only. No NgModules.
- Use Angular signals for local state. Introduce NgRx only if state sharing across unrelated components becomes complex.
- Services in `core/services/`, models in `core/models/`.
- Feature folders: one folder per feature with its component, service (if feature-specific), and spec file.
- Use `inject()` function, not constructor injection.
- Do not prefix interfaces with `I` (this is a greenfield Angular project, not the .NET side).
- Barrel exports (`index.ts`) per feature folder.
- Use `provideHttpClient(withInterceptors([...]))` in app config.
- Use `environment.ts` for API base URL configuration.
- Use Angular's `proxy.conf.json` during development to proxy `/api` requests to the .NET backend, avoiding CORS issues during `ng serve`.

### SQL / Database
- Table names: `snake_case` plural (e.g., `career_nodes`, `career_edges`).
- Column names: `snake_case` (e.g., `source_node_id`).
- Always include `created_at timestamptz DEFAULT now()`.
- Use UUIDs for primary keys (`gen_random_uuid()`).
- Index foreign keys. Add trigram indexes for search columns.
- Seed/migration files use Flyway-style naming: `V{N}__{description}.sql`.
- O\*NET staging tables live in a `staging` schema, kept separate from `public` where our application tables live. This avoids namespace collisions and makes cleanup trivial (`DROP SCHEMA staging CASCADE`).

### Docker
- Each service has its own `Dockerfile` in its project root.
- Use multi-stage builds for .NET and Angular.
- `docker-compose.yml` at repo root orchestrates everything.
- Use named volumes for PostgreSQL data persistence.
- PostgreSQL container must include a healthcheck. API container uses `depends_on` with `condition: service_healthy` to avoid startup race conditions.

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `data:`.
- Branch naming: `feature/{short-description}`, `fix/{short-description}`.
- `data/onet/` is gitignored (large SQL dump files). The README documents how to download them.

## CORS Configuration

The Angular frontend and .NET API run on different origins during development (`localhost:4200` vs `localhost:5000`).

**Development (preferred):** Use Angular's `proxy.conf.json` to proxy `/api/*` requests through the Angular dev server to the backend. This avoids CORS entirely during `ng serve`.

```json
// src/web/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false,
    "changeOrigin": true
  }
}
```

**Production:** Caddy reverse-proxies both the Angular app and the API under the same domain, so CORS is not needed.

**Belt-and-suspenders:** Also configure CORS in the .NET API as a fallback:

```csharp
// Program.cs — only in Development environment
builder.Services.AddCors(options =>
{
    options.AddPolicy("Development", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
// Then: if (app.Environment.IsDevelopment()) app.UseCors("Development");
```

## Database Schema

```sql
-- V1__create_careergraph_schema.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy search support

CREATE TABLE career_nodes (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soc_code                 VARCHAR(10) UNIQUE NOT NULL,
    title                    VARCHAR(200) NOT NULL,
    description              TEXT,
    career_cluster           VARCHAR(100),
    education_level          VARCHAR(50),
    median_salary_usd        DECIMAL(12, 2),
    experience_years_typical INT,
    bright_outlook           BOOLEAN DEFAULT FALSE,
    metadata                 JSONB DEFAULT '{}',
    source                   VARCHAR(20) NOT NULL DEFAULT 'onet',
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE career_edges (
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
CREATE INDEX ix_career_edges_source ON career_edges (source_node_id);
CREATE INDEX ix_career_edges_target ON career_edges (target_node_id);

-- Indexes for search and filtering
CREATE INDEX ix_career_nodes_cluster ON career_nodes (career_cluster);
CREATE INDEX ix_career_nodes_title_trgm ON career_nodes USING GIN (title gin_trgm_ops);
CREATE INDEX ix_career_nodes_soc_code ON career_nodes (soc_code);
```

## O*NET Data Seeding

### Source
- **Database:** O\*NET 30.2 (current as of 2025)
- **Download:** https://www.onetcenter.org/database.html → "All Files" → choose the **PostgreSQL-compatible SQL** ZIP
- **License:** Creative Commons Attribution 4.0 (CC BY 4.0). Attribution required in app footer or about page.
- **What to download:** The "All Files" ZIP containing PostgreSQL `CREATE TABLE` + `INSERT` statements for all ~40 O\*NET tables. Do NOT download individual files.

### Import Strategy (Pure SQL Pipeline — No Python)

The user downloads the O\*NET PostgreSQL SQL ZIP and extracts it into `data/onet/`. This directory is gitignored (files are large and publicly available). The import is a pure SQL pipeline with a thin shell orchestrator.

**Step 1: Load O\*NET into staging schema**

```bash
#!/bin/bash
# V2__import_onet_staging.sh
# Loads O*NET PostgreSQL SQL files into a staging schema to isolate them from our app tables.
set -euo pipefail

ONET_SQL_DIR="./data/onet"
DB_CONTAINER="careergraph-db-1"
DB_NAME="careergraph"
DB_USER="careergraph"

echo "=== O*NET Staging Import ==="

echo "Creating staging schema..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA IF EXISTS staging CASCADE; CREATE SCHEMA staging;"

echo "Importing O*NET SQL files into staging schema..."
for sqlfile in "$ONET_SQL_DIR"/*.sql; do
    echo "  → $(basename "$sqlfile")"
    # Prepend search_path so all CREATE/INSERT land in staging, not public
    (echo "SET search_path TO staging;" && cat "$sqlfile") | \
        docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q
done

echo "Listing staging tables..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "\dt staging.*"

echo "=== Staging import complete ==="
```

**Step 2: Transform staging → careergraph**

```sql
-- V3__transform_onet_to_careergraph.sql
-- Maps O*NET staging tables into our career_nodes and career_edges tables.
-- Run after V2 staging import completes.
--
-- IMPORTANT: O*NET table/column names may vary between versions.
-- If the staging tables have different names, inspect with: \dt staging.*
-- and adjust this script accordingly. The column names below are based on
-- the O*NET 30.2 data dictionary.

BEGIN;

-- === STEP 1: Populate career_nodes from occupation_data ===
-- O*NET occupation_data: onetsoc_code, title, description
INSERT INTO public.career_nodes (soc_code, title, description, source)
SELECT
    od.onetsoc_code,
    od.title,
    od.description,
    'onet'
FROM staging.occupation_data od
ON CONFLICT (soc_code) DO NOTHING;

-- === STEP 2: Enrich with Job Zone data (experience level) ===
-- Job zones 1-5 map to approximate years of preparation:
--   Zone 1 = little/no prep (0 yrs), Zone 5 = extensive prep (8+ yrs)
UPDATE public.career_nodes cn
SET experience_years_typical = CASE jz.job_zone
        WHEN 1 THEN 0
        WHEN 2 THEN 1
        WHEN 3 THEN 3
        WHEN 4 THEN 5
        WHEN 5 THEN 8
        ELSE NULL
    END
FROM staging.job_zones jz
WHERE cn.soc_code = jz.onetsoc_code;

-- === STEP 3: Enrich with education level ===
-- education_training_experience uses element_id + scale_id, NOT element_name.
-- element_id = '2.D.1' with scale_id = 'RL' = Required Level of Education.
-- category is a number (1-12) that maps to ete_categories for human-readable labels.
-- We pick the category with the highest data_value (most common requirement).
UPDATE public.career_nodes cn
SET education_level = subq.category_description
FROM (
    SELECT DISTINCT ON (ete.onetsoc_code)
        ete.onetsoc_code,
        cat.category_description
    FROM staging.education_training_experience ete
    JOIN staging.ete_categories cat
        ON cat.element_id = ete.element_id
        AND cat.scale_id = ete.scale_id
        AND cat.category = ete.category
    WHERE ete.element_id = '2.D.1'     -- Required Level of Education
      AND ete.scale_id = 'RL'          -- Required Level scale
    ORDER BY ete.onetsoc_code, ete.data_value DESC
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 4: Set career clusters from SOC major group ===
-- O*NET doesn't always include a direct cluster table in the SQL export.
-- SOC 2-digit prefix reliably maps to the BLS major occupation groups.
UPDATE public.career_nodes
SET career_cluster = CASE LEFT(soc_code, 2)
    WHEN '11' THEN 'Management'
    WHEN '13' THEN 'Business & Financial'
    WHEN '15' THEN 'Computer & Mathematical'
    WHEN '17' THEN 'Architecture & Engineering'
    WHEN '19' THEN 'Life, Physical & Social Science'
    WHEN '21' THEN 'Community & Social Service'
    WHEN '23' THEN 'Legal'
    WHEN '25' THEN 'Education, Training & Library'
    WHEN '27' THEN 'Arts, Design, Entertainment & Media'
    WHEN '29' THEN 'Healthcare Practitioners'
    WHEN '31' THEN 'Healthcare Support'
    WHEN '33' THEN 'Protective Services'
    WHEN '35' THEN 'Food Preparation & Serving'
    WHEN '37' THEN 'Building & Grounds Maintenance'
    WHEN '39' THEN 'Personal Care & Service'
    WHEN '41' THEN 'Sales'
    WHEN '43' THEN 'Office & Administrative Support'
    WHEN '45' THEN 'Farming, Fishing & Forestry'
    WHEN '47' THEN 'Construction & Extraction'
    WHEN '49' THEN 'Installation, Maintenance & Repair'
    WHEN '51' THEN 'Production'
    WHEN '53' THEN 'Transportation & Material Moving'
    WHEN '55' THEN 'Military Specific'
    ELSE 'Other'
END;

-- === STEP 5: Populate career_edges from related_occupations ===
-- O*NET related_occupations has: onetsoc_code → related_onetsoc_code
-- plus relatedness_tier (Primary-Short/Primary-Long/Supplemental) and related_index (1-20).
-- For MVP, import Primary-Short and Primary-Long only (top 10 per occupation).
-- Supplemental (11-20) can be added later for denser graph.
INSERT INTO public.career_edges (source_node_id, target_node_id, relationship_type, source)
SELECT
    src.id,
    tgt.id,
    'related',
    'onet'
FROM staging.related_occupations ro
JOIN public.career_nodes src ON src.soc_code = ro.onetsoc_code
JOIN public.career_nodes tgt ON tgt.soc_code = ro.related_onetsoc_code
WHERE src.id <> tgt.id
  AND ro.relatedness_tier IN ('Primary-Short', 'Primary-Long')  -- Skip Supplemental for MVP
ON CONFLICT ON CONSTRAINT uq_career_edge DO NOTHING;

-- === STEP 6: Calculate edge weights ===
-- Uses O*NET relatedness_tier + related_index for base weight,
-- then adjusts for experience gap between source and target careers.
-- Primary-Short (top 5) = lightest weight, Supplemental = heaviest.
UPDATE public.career_edges ce
SET weight = base_weight.tier_weight
    + ABS(COALESCE(tgt.experience_years_typical, 3) - COALESCE(src.experience_years_typical, 3)) * 0.1,
    years_experience_delta = GREATEST(
        COALESCE(tgt.experience_years_typical, 0) - COALESCE(src.experience_years_typical, 0),
        0
    )
FROM public.career_nodes src,
     public.career_nodes tgt,
     (
         SELECT ro.onetsoc_code, ro.related_onetsoc_code,
                CASE ro.relatedness_tier
                    WHEN 'Primary-Short' THEN 1.0 + (ro.related_index * 0.08)
                    WHEN 'Primary-Long'  THEN 1.5 + (ro.related_index * 0.08)
                    WHEN 'Supplemental'  THEN 2.5 + (ro.related_index * 0.08)
                    ELSE 3.0
                END AS tier_weight
         FROM staging.related_occupations ro
     ) base_weight
WHERE ce.source_node_id = src.id
  AND ce.target_node_id = tgt.id
  AND src.soc_code = base_weight.onetsoc_code
  AND tgt.soc_code = base_weight.related_onetsoc_code;

-- === STEP 7: Pack alternate titles into metadata for enhanced search ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    COALESCE(cn.metadata, '{}'),
    '{alternateTitles}',
    COALESCE(
        (SELECT jsonb_agg(at.alternate_title)
         FROM staging.alternate_titles at
         WHERE at.onetsoc_code = cn.soc_code),
        '[]'
    )
);

COMMIT;
```

**Step 3: Verify the import**

```sql
-- V4__verify_seed.sql
-- Sanity checks. All queries should return reasonable numbers.

-- Total nodes (expect ~900-1100)
SELECT 'career_nodes' AS entity, COUNT(*) AS total FROM career_nodes;

-- Total edges (expect ~5000-15000)
SELECT 'career_edges' AS entity, COUNT(*) AS total FROM career_edges;

-- Nodes per cluster (should see ~23 clusters, none empty)
SELECT career_cluster, COUNT(*) AS node_count
FROM career_nodes
GROUP BY career_cluster
ORDER BY node_count DESC;

-- Spot check: Foundation Phase Teaching
-- SOC 25-2021.00 = "Elementary School Teachers, Except Special Education"
SELECT id, soc_code, title, education_level, experience_years_typical, career_cluster
FROM career_nodes
WHERE title ILIKE '%elementary%teacher%' OR soc_code LIKE '25-2021%';

-- That node's outbound edges (related careers it leads to)
SELECT tgt.title AS leads_to, ce.weight, ce.years_experience_delta
FROM career_edges ce
JOIN career_nodes src ON src.id = ce.source_node_id
JOIN career_nodes tgt ON tgt.id = ce.target_node_id
WHERE src.soc_code LIKE '25-2021%'
ORDER BY ce.weight;

-- Orphan check: nodes with zero edges (should be very few)
SELECT cn.title, cn.soc_code
FROM career_nodes cn
LEFT JOIN career_edges ce_out ON ce_out.source_node_id = cn.id
LEFT JOIN career_edges ce_in ON ce_in.target_node_id = cn.id
WHERE ce_out.id IS NULL AND ce_in.id IS NULL;

-- Weight distribution (should show a spread, not all 1.0)
SELECT ROUND(weight, 1) AS weight_bucket, COUNT(*) AS edge_count
FROM career_edges
GROUP BY ROUND(weight, 1)
ORDER BY weight_bucket;

-- Nodes with metadata populated (alternate titles)
SELECT COUNT(*) AS nodes_with_alt_titles
FROM career_nodes
WHERE metadata->>'alternateTitles' IS NOT NULL
  AND metadata->>'alternateTitles' <> '[]';
```

**Step 4: Clean up staging (optional, recommended after verification)**

```sql
DROP SCHEMA IF EXISTS staging CASCADE;
```

### Handling O*NET SQL File Structure

The O\*NET PostgreSQL ZIP may contain one monolithic SQL file or multiple files per table. The import script (`V2`) handles both cases by iterating all `.sql` files. All tables land in the `staging` schema regardless of structure.

If the O\*NET column names differ from what `V3` expects, Claude Code should:
1. Inspect staging tables: `docker exec -i careergraph-db-1 psql -U careergraph -d careergraph -c "\dt staging.*"`
2. Check columns: `docker exec -i careergraph-db-1 psql -U careergraph -d careergraph -c "\d staging.occupation_data"`
3. Adjust `V3__transform_onet_to_careergraph.sql` to match actual column names

## API Endpoints

Base path: `/api/v1`

```
GET  /careers/{id}                    → CareerNodeDetailDto (node + inbound/outbound edges)
GET  /careers/{id}/neighbourhood      → GraphDto { nodes[], edges[] }  (query: depth=2, max 3)
GET  /careers/search                  → CareerNodeDto[]  (query: q=teacher&cluster=Education&limit=20)
GET  /careers/clusters                → ClusterSummaryDto[]  (cluster name + node count)
GET  /careers/path                    → PathDto { steps[], totalWeight, ... }  (query: fromId, toId)
GET  /health                          → { status: "healthy", dbConnected: true }
```

### Response Shape: Neighbourhood

```json
{
  "focusNodeId": "uuid",
  "nodes": [
    {
      "id": "uuid",
      "socCode": "25-2021.00",
      "title": "Elementary School Teachers",
      "careerCluster": "Education, Training & Library",
      "educationLevel": "Bachelor's degree",
      "medianSalaryUsd": 61690,
      "experienceYearsTypical": 5,
      "brightOutlook": true
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "sourceNodeId": "uuid",
      "targetNodeId": "uuid",
      "relationshipType": "related",
      "weight": 1.5,
      "yearsExperienceDelta": 3,
      "salaryDeltaUsd": 12000
    }
  ]
}
```

### Neighbourhood Query (Recursive CTE)

```sql
-- Fetch subgraph N hops from a focus node.
-- Two explicit UNION branches (outbound + inbound) rather than a single OR join.
-- More explicit, better index utilisation by the query planner.
WITH RECURSIVE neighbourhood AS (
    -- Anchor: the focus node
    SELECT id, 0 AS depth
    FROM career_nodes
    WHERE id = @focusNodeId

    UNION

    -- Follow outbound edges (where this career leads)
    SELECT ce.target_node_id AS id, n.depth + 1
    FROM neighbourhood n
    JOIN career_edges ce ON ce.source_node_id = n.id
    WHERE n.depth < @maxDepth

    UNION

    -- Follow inbound edges (what leads to this career)
    SELECT ce.source_node_id AS id, n.depth + 1
    FROM neighbourhood n
    JOIN career_edges ce ON ce.target_node_id = n.id
    WHERE n.depth < @maxDepth
)
SELECT DISTINCT cn.*
FROM neighbourhood nb
JOIN career_nodes cn ON cn.id = nb.id;

-- Separately: fetch all edges where BOTH endpoints are in the discovered node set.
-- This gives us the complete subgraph for rendering.
SELECT ce.*
FROM career_edges ce
WHERE ce.source_node_id = ANY(@discoveredNodeIds)
  AND ce.target_node_id = ANY(@discoveredNodeIds);
```

### Pathfinding

Implement Dijkstra's in C# (in-memory). At ~1,000 nodes, loading the full adjacency list into `IMemoryCache` and running Dijkstra's is faster and simpler than a DB-side solution. Do not prematurely optimise.

```csharp
// PathfindingService sketch
public class PathfindingService : IPathfindingService
{
    private readonly IMemoryCache _graphCache;
    private readonly CareerGraphDbContext _dbContext;
    private const string GraphCacheKey = "career_graph_adjacency_list";

    public async Task<PathResult?> FindShortestPathAsync(Guid fromId, Guid toId)
    {
        // 1. Load or retrieve cached adjacency list
        //    Dictionary<Guid, List<(Guid targetId, decimal weight, Guid edgeId)>>
        // 2. Run Dijkstra's using edge.Weight as cost
        // 3. Reconstruct path from predecessor map
        // 4. Return ordered list of nodes + edges, total cost
        // 5. Return null if no path exists (disconnected subgraphs)
    }

    public void InvalidateGraphCache()
    {
        _graphCache.Remove(GraphCacheKey);
    }
}
```

## 3D Graph Angular Integration

Wrap `3d-force-graph` (vanilla JS) in an Angular component:

```typescript
// graph-canvas.component.ts (sketch — not final)
import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, input, output } from '@angular/core';
import { CareerNode, GraphData } from '../../core/models';

@Component({
    selector: 'app-graph-canvas',
    standalone: true,
    template: `<div #graphContainer class="graph-container"></div>`,
    styleUrl: './graph-canvas.component.scss',
})
export class GraphCanvasComponent implements AfterViewInit, OnDestroy {
    @ViewChild('graphContainer') containerRef!: ElementRef;
    private graphInstance: any; // ForceGraph3DInstance

    focusNodeId = input<string>();
    graphData = input<GraphData>({ nodes: [], links: [] });
    nodeClicked = output<CareerNode>();
    nodeHovered = output<CareerNode | null>();

    ngAfterViewInit() {
        // Dynamic import 3d-force-graph (ESM)
        // Initialise on containerRef.nativeElement
        // nodeAutoColorBy('careerCluster')
        // nodeVal(node => normalisedSalary(node)) for size-by-salary
        // nodeLabel for tooltip
        // onNodeClick → emit nodeClicked
        // linkDirectionalArrowLength for edge direction
    }

    ngOnDestroy() {
        // CRITICAL: dispose Three.js renderer to prevent WebGL context leaks
    }
}
```

### Node Styling by Cluster

```typescript
export const CLUSTER_COLOURS: Record<string, string> = {
    'Management':                          '#E63946',
    'Business & Financial':                '#F4A261',
    'Computer & Mathematical':             '#2EC4B6',
    'Architecture & Engineering':          '#457B9D',
    'Life, Physical & Social Science':     '#8338EC',
    'Community & Social Service':          '#FF6B6B',
    'Legal':                               '#6C757D',
    'Education, Training & Library':       '#3A86FF',
    'Arts, Design, Entertainment & Media': '#FB5607',
    'Healthcare Practitioners':            '#D62828',
    'Healthcare Support':                  '#EF476F',
    'Protective Services':                 '#118AB2',
    'Food Preparation & Serving':          '#FFD166',
    'Building & Grounds Maintenance':      '#06D6A0',
    'Personal Care & Service':             '#F72585',
    'Sales':                               '#4CC9F0',
    'Office & Administrative Support':     '#7209B7',
    'Farming, Fishing & Forestry':         '#2D6A4F',
    'Construction & Extraction':           '#E76F51',
    'Installation, Maintenance & Repair':  '#264653',
    'Production':                          '#A8DADC',
    'Transportation & Material Moving':    '#023E8A',
    'Military Specific':                   '#6B705C',
    'Other':                               '#ADB5BD',
};
```

Node size scales with `medianSalaryUsd` (normalised to 2-8 range).

## Docker Compose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-careergraph}
      POSTGRES_USER: ${DB_USER:-careergraph}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./data/seed/V1__create_careergraph_schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-careergraph} -d ${DB_NAME:-careergraph}"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

  api:
    build: ./src/api/CareerGraph.Api
    environment:
      ConnectionStrings__Default: "Host=db;Database=${DB_NAME:-careergraph};Username=${DB_USER:-careergraph};Password=${DB_PASSWORD}"
      ASPNETCORE_URLS: "http://+:5000"
      ASPNETCORE_ENVIRONMENT: "Development"
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "5000:5000"

  web:
    build: ./src/web
    depends_on:
      - api
    ports:
      - "4200:80"

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - web
      - api

volumes:
  pgdata:
  caddy_data:
```

## Phase Implementation Order

**CRITICAL:** Before starting ANY phase, read `PHASE_RUNNER.md` for the full execution
protocol, verification checklists, error recovery, and feedback loop. Read `FEEDBACK.md`
for developer feedback from previous phases. If feedback requires adjustments, apply them
before starting the current phase.

See `PHASE_RUNNER.md` for detailed task lists and verification checklists per phase.
Below is the summary.

### Phase 1: Scaffold + Data
**Also read:** `docs/ONET_DATA_DICTIONARY.md`, `docs/ONET_METADATA_EXPANSION.md`

Scaffold monorepo. Write seed pipeline (V1-V4) including FULL metadata enrichment (skills,
knowledge, interests, technology_skills, tasks, work_styles, work_values into JSONB).
Scaffold .NET API with all GET endpoints. xUnit tests. Docker Compose with healthcheck.
→ Enzo tests → FEEDBACK.md

### Phase 2: 3D Canvas
**Also read:** `FEEDBACK.md`

Angular 19 app. 3d-force-graph wrapper. Load neighbourhood from API. Cluster colouring.
Node click → expand. Tooltip on hover. Docker build.
→ Enzo tests → FEEDBACK.md

### Phase 3: Detail Sidebar + Pathfinding
**Also read:** `FEEDBACK.md`

Career detail sidebar showing ALL metadata (skills list, RIASEC radar/chart, tasks, tech
skills, work styles). Inbound/outbound edge display. Start/target selection. Dijkstra's
pathfinding. Path highlight in 3D graph. Step-by-step panel.
→ Enzo tests → FEEDBACK.md

### Phase 4: Search + Polish
**Also read:** `FEEDBACK.md`

Search bar with fuzzy match. Cluster grid overview. Loading/error/empty states. Mobile
responsive. Caddy HTTPS. O\*NET CC BY 4.0 attribution. Career Finder/Traverser mode toggle.
→ Enzo tests → FEEDBACK.md

### Phase 5: Auth + Monetisation
**Also read:** `MONETISATION.md`, `FEEDBACK.md`

OAuth login (Google + GitHub). JWT auth. User tier model (free/premium/api). Stripe Checkout
integration for Premium subscriptions ($9/mo or $90/yr). Feature gating: pathfinding, deep
neighbourhood (3 hops), and full metadata are premium. Free tier gets graph browsing, search,
basic career details (top 3 skills/knowledge). PremiumGateComponent in Angular. /pricing page.
Metadata trimming in DTOs. Migrate localStorage to user account on login.
→ Enzo tests → FEEDBACK.md

## Key Architectural Decisions

1. **Never render the full graph.** Load neighbourhood subgraph (2-3 hops free, 3 hops premium). Merge new data on explore. Deduplicate nodes by ID.

2. **PostgreSQL is the graph DB for now.** Recursive CTEs handle traversal. Migrate to Neo4j only if measured performance demands it.

3. **Pathfinding runs in-memory.** ~1,000 nodes fits comfortably in `IMemoryCache`. Invalidate on data changes.

4. **Edge weights are heuristic.** The V3 transformation formula is a starting approximation. Refine with real data later. Don't over-engineer now.

5. **Guest-first, auth in Phase 5.** Phases 1-4 are fully anonymous. Auth is additive — it layers on top without rewriting existing features. Preferences in localStorage until auth exists, then migrate to user account.

6. **Backwards compatible.** API versioned (`/api/v1`). Migrations additive. Never drop columns.

7. **O\*NET data is staged, not directly consumed.** Staging schema isolates import from app tables. Can re-import newer O\*NET versions without touching application data.

8. **SQL-first data pipeline.** Entire seed/import is pure SQL + thin shell orchestration. No Python, no Node.js. Inspectable, auditable, runnable with `psql`.

9. **Feature gating is a middleware layer, not embedded in business logic.** Services always return full data. The `TierGateFilter` and DTO trimming layer decide what the user sees based on their tier. This means every feature is built fully functional first, then gated. See `MONETISATION.md` for the full gating architecture.

10. **Monetisation is freemium.** Free tier is genuinely useful (graph browsing, search, basic details). Premium gates insight (pathfinding, skills gap, full metadata). See `MONETISATION.md` for tier definitions and pricing.
