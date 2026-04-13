# CareerGraph — Project Plan

## Decision Log

Decisions made during planning, with rationale. This is the source of truth.

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | MVP scope | 3D graph canvas + backend + DB with O\*NET seed data | Foundation build, not throwaway prototype |
| D2 | Primary user persona | Career Traverser (someone in a career exploring advancement/lateral moves) | Narrower scope = sharper UX. Career Finder (exploratory) is Phase 5 |
| D3 | Seed data source | O\*NET 30.2 (US Dept of Labor) — ~1,000 occupations, CC BY 4.0 | Unblocks the data problem without scraping. Enrichment comes later |
| D4 | Graph model | Weighted Directed Graph (DAG-like, bridges allowed) in PostgreSQL adjacency list | Avoids Neo4j ops overhead for MVP. Swap later if query complexity demands it |
| D5 | Frontend | Angular 19 (standalone components, signals) | Enzo's stack. Signals over NgRx for greenfield simplicity |
| D6 | Backend | .NET 8 Minimal API | Enzo's stack. Minimal API keeps boilerplate low |
| D7 | Database | PostgreSQL 16 | Free, self-hostable, recursive CTEs for graph traversal, JSONB for metadata, pg_trgm for fuzzy search |
| D8 | 3D rendering | `3d-force-graph` (Three.js + d3-force-3d wrapper) | Purpose-built for interactive 3D node graphs. Wrap in Angular component |
| D9 | Hosting | Self-hosted via Docker Compose | Enzo's preference. Caddy reverse proxy for automatic HTTPS |
| D10 | Auth | Anonymous/guest-first. No auth in MVP | Accountless-friendly. Auth added when user submissions require it |
| D11 | Repo structure | Monorepo with workspace | Single commit history, shared docs, unified CI |
| D12 | Tests | From the start, lightweight. xUnit + Angular testing | Small but present. Test the graph data service and pathfinding logic |
| D13 | Graph rendering strategy | Local neighbourhood (2-3 hops from focus node) | Never render full graph. Expand on click. Solves "massive tree" concern |
| D14 | O\*NET import method | Direct PostgreSQL SQL import → staging schema → transformation SQL | No Python parsing. Pure SQL pipeline. Auditable and inspectable |
| D15 | CORS handling | Angular proxy.conf.json (dev) + Caddy same-origin (prod) | Avoids CORS complexity. Belt-and-suspenders CORS policy in .NET as fallback |
| D16 | O\*NET data isolation | Staging schema (`staging.*`) separate from app schema (`public.*`) | Clean separation. Re-importable. Droppable without touching app data |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Compose                         │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Caddy    │───▶│  Angular App │    │  .NET API    │   │
│  │  (proxy)  │───▶│  (nginx)     │    │  (Kestrel)   │   │
│  │  :80/:443 │    │  :4200       │    │  :5000       │   │
│  └──────────┘    └──────────────┘    └──────┬───────┘   │
│                                             │           │
│                                      ┌──────▼───────┐   │
│                                      │  PostgreSQL   │   │
│                                      │  :5432        │   │
│                                      │  (healthcheck)│   │
│                                      └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

```
O*NET 30.2 PostgreSQL SQL ZIP (downloaded by developer)
      │
      ▼
data/onet/*.sql  (gitignored)
      │
      ▼
V2__import_onet_staging.sh  →  staging.* schema (raw O*NET tables)
      │
      ▼
V3__transform_onet_to_careergraph.sql  →  public.career_nodes + public.career_edges
      │
      ▼
V4__verify_seed.sql  →  sanity check counts and spot checks
      │
      ▼
.NET API (REST endpoints, Dijkstra's pathfinding in-memory)
      │
      ▼
Angular (3d-force-graph)
├── Renders local subgraph (2-3 hops)
├── Node click → expand neighbourhood / show detail sidebar
└── Pathfinding overlay (glow + pulse)
```

---

## Database Schema

### `career_nodes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | Generated via `gen_random_uuid()` |
| `soc_code` | `varchar(10)` UNIQUE | O\*NET SOC code (e.g., "25-2021.00") |
| `title` | `varchar(200)` | "Elementary School Teachers, Except Special Education" |
| `description` | `text` | From O\*NET occupation_data |
| `career_cluster` | `varchar(100)` | Derived from SOC 2-digit prefix (e.g., "Education, Training & Library") |
| `education_level` | `varchar(50)` | Most common required level from O\*NET |
| `median_salary_usd` | `decimal(12,2)` | From BLS/O\*NET wage data (future enrichment) |
| `experience_years_typical` | `int` | Derived from O\*NET Job Zone (1-5 → 0-8 years) |
| `bright_outlook` | `boolean` | O\*NET "Bright Outlook" flag (future enrichment) |
| `metadata` | `jsonb` | Flexible: alternate titles, skills, tools, work styles |
| `source` | `varchar(20)` | 'onet', 'user_submitted', 'scraped' |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `career_edges`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | Generated |
| `source_node_id` | `uuid` FK | From node |
| `target_node_id` | `uuid` FK | To node (direction = progression/relationship) |
| `relationship_type` | `varchar(30)` | 'related' (from O\*NET), future: 'promotion', 'lateral_move', 'bridge' |
| `weight` | `decimal(5,2)` | Pathfinding cost. Lower = easier transition. Heuristic formula in V3 |
| `years_experience_delta` | `int` NULL | Additional years typically needed for this transition |
| `required_certifications` | `text[]` NULL | Array of cert names (future enrichment) |
| `salary_delta_usd` | `decimal(12,2)` NULL | Expected salary change (future enrichment) |
| `description` | `text` NULL | Human-readable transition description (future enrichment) |
| `source` | `varchar(20)` | 'onet', 'user_submitted', 'inferred' |
| `created_at` | `timestamptz` | |

**Indexes:**
- `ix_career_edges_source` on `(source_node_id)` — outgoing edge lookups
- `ix_career_edges_target` on `(target_node_id)` — incoming edge lookups
- `ix_career_nodes_cluster` on `(career_cluster)` — cluster filtering
- `ix_career_nodes_title_trgm` GIN trigram on `(title)` — fuzzy search
- `ix_career_nodes_soc_code` on `(soc_code)` — SOC lookups

**Constraints:**
- `UNIQUE(source_node_id, target_node_id, relationship_type)` — no duplicate edges
- `CHECK(source_node_id <> target_node_id)` — no self-edges

---

## API Design

Base: `/api/v1`

| Method | Endpoint | Purpose | Query Params |
|--------|----------|---------|--------------|
| GET | `/careers/{id}` | Single career with inbound/outbound edges | — |
| GET | `/careers/{id}/neighbourhood` | Subgraph N hops from node | `depth=2` (max 3) |
| GET | `/careers/search` | Full-text + fuzzy search | `q=teacher&cluster=Education&limit=20` |
| GET | `/careers/clusters` | List all career clusters with node counts | — |
| GET | `/careers/path` | Shortest path between two careers | `fromId={uuid}&toId={uuid}` |
| GET | `/health` | Health check (includes DB connectivity) | — |

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

---

## Monorepo Structure

```
careergraph/
├── CLAUDE.md                          # Claude Code mother prompt
├── PROJECT_PLAN.md                    # This file
├── docker-compose.yml                 # Full stack orchestration
├── docker-compose.override.yml        # Dev overrides
├── .env.example                       # Environment variable template
├── .gitignore
├── Caddyfile                          # Production reverse proxy
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
│   │   │   ├── Data/
│   │   │   │   ├── CareerGraphDbContext.cs
│   │   │   │   ├── Configurations/
│   │   │   │   └── Migrations/
│   │   │   └── Dockerfile
│   │   └── CareerGraph.Api.Tests/
│   │
│   └── web/                           # Angular 19 app
│       ├── angular.json
│       ├── package.json
│       ├── proxy.conf.json            # Dev: /api → localhost:5000
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
│           └── app/
│               ├── app.component.ts
│               ├── app.config.ts
│               ├── app.routes.ts
│               ├── core/              # Services, models, interceptors
│               ├── features/          # graph-canvas, career-detail, search, path-finder
│               └── shared/            # Reusable components, pipes
│
├── data/
│   ├── onet/                          # O*NET SQL files (gitignored — developer downloads)
│   │   └── .gitkeep
│   ├── seed/
│   │   ├── README.md                  # Download + import instructions
│   │   ├── V1__create_careergraph_schema.sql
│   │   ├── V2__import_onet_staging.sh
│   │   ├── V3__transform_onet_to_careergraph.sql
│   │   └── V4__verify_seed.sql
│   └── migrations/                    # Future incremental migrations
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── ONET_DATA_DICTIONARY.md
    └── DEVELOPMENT.md
```

---

## Phase Plan

### Phase 1: Scaffold + Seed Data (Week 1-2)

**Goal:** Monorepo exists, DB has real O\*NET career data, API serves it.

**Tasks:**
1. Initialise monorepo structure (dirs, `.gitignore`, `.env.example`, `docker-compose.yml`)
2. Write `V1__create_careergraph_schema.sql` (DDL)
3. Write `data/seed/README.md` with step-by-step O\*NET download instructions
4. Write `V2__import_onet_staging.sh` (loads O\*NET SQL into `staging` schema)
5. Write `V3__transform_onet_to_careergraph.sql` (maps staging → our schema with weight heuristic)
6. Write `V4__verify_seed.sql` (count checks, spot checks, orphan detection)
7. Boot PostgreSQL via Docker Compose, run full seed pipeline, verify data
8. Scaffold .NET 8 Minimal API (Program.cs, EF Core DbContext, models, CORS config)
9. Implement `CareerService` + `CareerEndpoints` (GET by id, search, neighbourhood)
10. Write xUnit tests for `CareerService` (neighbourhood depth, search, empty results)
11. Add API to Docker Compose with healthcheck dependency
12. Write `docs/DEVELOPMENT.md` (local setup instructions)

**Deliverable:** `docker compose up` → `curl localhost:5000/api/v1/careers/search?q=teacher` returns real O\*NET career data.

**How to run with Claude Code:**
```
Session 1: "Execute Phase 1, tasks 1-7. The O*NET SQL files are in data/onet/."
Session 2: "Execute Phase 1, tasks 8-12."
```

---

### Phase 2: 3D Graph Canvas (Week 3-4)

**Goal:** User sees careers in 3D, can click and explore.

**Tasks:**
1. Scaffold Angular 19 app (`ng new --standalone --style=scss`)
2. Configure `proxy.conf.json` for dev API proxying
3. Configure environments with API base URL
4. Install `3d-force-graph` + `three`
5. Create `CareerApiService` calling backend
6. Create `GraphCanvasComponent` wrapping `3d-force-graph`
7. Load neighbourhood for default node on init (SOC 25-2021.00 — elementary teaching)
8. Colour nodes by career cluster, directional arrows on edges
9. Node click → expand neighbourhood (fetch + merge, deduplicate by ID)
10. Node hover → tooltip (title + salary)
11. Dockerfile + nginx.conf for production build
12. Update Docker Compose with web service

**Deliverable:** Open browser → see 3D graph of teaching-related careers → click to explore adjacent fields.

---

### Phase 3: Career Detail Sidebar + Pathfinding (Week 5-6)

**Goal:** Full explore + pathfind workflow.

**Tasks:**
1. Slide-out sidebar component on node click
2. Display: title, description, education, salary, cluster, bright outlook
3. Inbound edges ("How to get here") + outbound edges ("Where this leads")
4. Edge details: years needed, certifications, salary delta
5. "Set as my current role" / "Set as my target role" (signal service + localStorage)
6. `PathfindingService` in .NET (Dijkstra's, `IMemoryCache`)
7. `GET /careers/path` endpoint
8. Path highlight in 3D graph (glow edges, pulse nodes)
9. Step-by-step panel with transition details + cost summary
10. xUnit tests for pathfinding (known paths, unreachable nodes, same-node edge case)

**Deliverable:** Click a career → see details → set start/end → see glowing path + step-by-step breakdown.

---

### Phase 4: Search + Polish (Week 7-8)

**Goal:** Users can search, browse clusters, and the app feels complete.

**Tasks:**
1. Search bar with debounced input calling `GET /careers/search`
2. Career cluster grid overview (`GET /careers/clusters`)
3. Click cluster → filter graph to that cluster's subgraph
4. Loading states, error handling, empty states throughout
5. Mobile-responsive layout (graph resizes, sidebar → bottom sheet)
6. Caddy configuration for production HTTPS
7. O\*NET attribution in footer (CC BY 4.0 requirement)
8. "Career Finder" vs "Career Traverser" mode toggle in nav (prep for Phase 5)

**Deliverable:** Polished, deployable application.

---

### Phase 5: Career Finder Mode (Week 9-10)

**Goal:** Users who don't know their target career can explore by interest.

**Tasks:**
1. Career Finder entry: interest/skill-based filtering (O\*NET metadata has this)
2. Cluster-first browsing: show cluster overview → drill into cluster → explore graph
3. Suggested starting points based on popular/bright-outlook careers
4. Different default graph layout for exploration vs traversal mode

**Deliverable:** Two distinct entry points into the same graph.

---

### Future Phases (Not scoped yet)

- **User submissions:** Auth, moderation queue, crowdsourced edges and career nodes
- **Job listing integration:** Indeed/LinkedIn API hooks in sidebar
- **Educational resources:** Udemy/Coursera links per career node
- **Internationalisation:** Non-US career data (UK SOC, ZA OFO codes, etc.)
- **Salary localisation:** Regional salary data beyond US medians
- **AI enrichment:** LLM-generated transition descriptions between careers
- **BLS wage data:** Automated import of Bureau of Labor Statistics salary data by SOC code

---

## O*NET Data Import Notes

### Where to get it
- **URL:** https://www.onetcenter.org/database.html
- **Version:** O\*NET 30.2 (current as of 2025)
- **Format:** Choose "All Files" → PostgreSQL-compatible SQL ZIP
- **License:** Creative Commons Attribution 4.0 (CC BY 4.0). Must attribute in app footer or about page.
- **What's in the ZIP:** ~40 tables as `CREATE TABLE` + `INSERT` statements

### Import pipeline

| Step | File | What it does |
|------|------|-------------|
| 1 | `V1__create_careergraph_schema.sql` | Creates our `career_nodes` + `career_edges` tables |
| 2 | `V2__import_onet_staging.sh` | Loads all O\*NET SQL files into `staging.*` schema |
| 3 | `V3__transform_onet_to_careergraph.sql` | SELECTs from staging, INSERTs into our tables, calculates weights |
| 4 | `V4__verify_seed.sql` | Counts, cluster distribution, spot checks, orphan detection |
| cleanup | `DROP SCHEMA staging CASCADE` | Removes raw O\*NET tables after successful verification |

### Key O*NET tables consumed

| O\*NET Table | Maps To | Notes |
|-------------|---------|-------|
| `occupation_data` | `career_nodes` (soc_code, title, description) | Core career data |
| `related_occupations` | `career_edges` (source → target) | Career relationships = our graph edges |
| `job_zones` | `career_nodes.experience_years_typical` | Zone 1-5 → years approximation |
| `education_training_experience` | `career_nodes.education_level` | Most common required education |
| `alternate_titles` | `career_nodes.metadata.alternateTitles` | Enhances search matching |

### Edge weight heuristic

O\*NET's "Related Occupations" doesn't provide transition difficulty. We derive a weight:

```
weight = 1.0 (base)
       + abs(target_experience - source_experience) * 0.15 (experience gap penalty)
       + 0.5 if target requires more experience (upward move penalty)
```

Lower weight = easier transition. This is a starting heuristic — refine with real data later. Don't over-engineer the formula now (premature optimisation principle).

### Salary data (future enrichment)

O\*NET links to BLS Occupational Employment and Wage Statistics. Median salary can be joined via SOC code. BLS data: https://www.bls.gov/oes/. This is a Phase 5+ enrichment, not MVP.

---

## Infrastructure Costs (Self-Hosted)

| Item | Cost | Notes |
|------|------|-------|
| Domain | ~$12/year | .com or .dev |
| VPS (Hetzner CX22) | ~€4.85/month (~$60/year) | 2 vCPU, 4GB RAM, 40GB SSD |
| SSL | Free | Caddy auto-provisions Let's Encrypt |
| PostgreSQL | Free | Runs in Docker on the VPS |
| O\*NET data | Free | Public data, CC BY 4.0 |
| **Total** | **~$72/year** | |

A single Hetzner CX22 instance comfortably runs the full stack (PostgreSQL + .NET API + Angular + Caddy) with room to spare.

---

## Claude Code Session Guide

Recommended way to execute this project with Claude Code:

| Session | Scope | Prompt |
|---------|-------|--------|
| 1 | Phase 1: Scaffold + DB + Seed | "Read CLAUDE.md. Execute Phase 1 tasks 1-7. O\*NET SQL files are in data/onet/." |
| 2 | Phase 1: API | "Continue Phase 1. Execute tasks 8-12. The DB is seeded and running." |
| 3 | Phase 2: Angular + 3D graph | "Execute Phase 2. The API is running on localhost:5000." |
| 4 | Phase 3: Sidebar + Pathfinding | "Execute Phase 3." |
| 5 | Phase 4: Search + Polish | "Execute Phase 4." |

Between sessions: review code, commit what's good, note anything to adjust in the next prompt. Each session is scoped to hold full context without drift.
