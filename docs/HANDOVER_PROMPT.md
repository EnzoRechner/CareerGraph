# Claude Code Handover — Repo Setup & Initial Commit Preparation

Read `CLAUDE.md` fully. Then read `PHASE_RUNNER.md`, `MONETISATION.md`, `PROJECT_PLAN.md`, `docs/ONET_DATA_DICTIONARY.md`, and `docs/ONET_METADATA_EXPANSION.md`. These define the CareerGraph project — a self-hosted 3D career graph visualisation app with a freemium monetisation model.

**Do NOT start Phase 1 yet.** This session is pre-Phase 1: validate the repo structure, create missing standard project files, and get everything ready for an initial commit.

## Tasks

### 1. Audit current repo state
- List what files and directories currently exist in the repo root.
- Check that all .md documentation files are present and in the correct locations per CLAUDE.md's monorepo structure.
- Report anything missing, misplaced, or unexpected.

### 2. Create directory scaffold
Create any missing directories from the monorepo structure defined in CLAUDE.md. Use `.gitkeep` files for empty directories that need to be tracked. Specifically ensure these all exist:
- `src/api/CareerGraph.Api/`
- `src/api/CareerGraph.Api.Tests/`
- `src/web/`
- `data/onet/` (with `.gitkeep`)
- `data/seed/`
- `data/migrations/`
- `docs/`

### 3. Create `.gitignore`
Write a comprehensive `.gitignore` covering:
- .NET: `bin/`, `obj/`, `*.user`, `*.suo`, `.vs/`, `out/`
- Node/Angular: `node_modules/`, `dist/`, `.angular/`, `.cache/`
- Environment: `.env` (NOT `.env.example`)
- O*NET data: `data/onet/*.sql` (large downloaded files, not committed)
- IDE: `.idea/`, `.vscode/` (except shared settings if any), `*.swp`
- Docker: `docker-compose.override.yml` (developer-specific overrides)
- OS: `.DS_Store`, `Thumbs.db`

### 4. Create `.env.example`
Per CLAUDE.md's environment variables section. Placeholder values only. This file IS committed.

### 5. Create `README.md`
Write a proper project README with:
- **Project name and one-line description**: CareerGraph — Interactive 3D career progression visualisation
- **What it does**: 2-3 sentences explaining the concept (3D graph of career paths, explore by clicking, pathfind between careers). Mention the freemium model: free to explore, premium for pathfinding and advanced insights.
- **Screenshot placeholder**: `<!-- TODO: Add screenshot after Phase 2 -->`
- **Tech stack**: Angular 19, .NET 8 Minimal API, PostgreSQL 16, 3d-force-graph, Docker Compose, Stripe
- **Prerequisites**: Docker, Docker Compose, .NET 8 SDK, Node.js 20+, Angular CLI
- **Quick start**:
  1. Clone the repo
  2. Copy `.env.example` to `.env` and set `DB_PASSWORD`
  3. Download O*NET data (link to `data/seed/README.md` for instructions)
  4. `docker compose up`
  5. Run seed pipeline (reference the commands)
  6. Open browser to `http://localhost:4200`
- **Project structure**: Brief tree showing the monorepo layout
- **Documentation**: Links to `PROJECT_PLAN.md`, `MONETISATION.md`, `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`
- **Data source**: O*NET 30.2 with CC BY 4.0 attribution and link. Include the required attribution text: "This application includes information from the O*NET 30.2 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA."
- **License**: 
  ```
  ## License

  Copyright (c) 2026 Enzo. All rights reserved.

  This source code is proprietary and confidential. No part of this codebase may be 
  reproduced, distributed, or transmitted in any form or by any means without the prior 
  written permission of the author.

  For licensing enquiries, contact: [TODO: add contact email]
  ```
- **Contributing**: "This is a proprietary project in active development. It is not open for external contributions at this time."

### 6. Create `LICENSE` file
Create a `LICENSE` file in the repo root with:
```
Copyright (c) 2026 Enzo. All Rights Reserved.

PROPRIETARY SOFTWARE LICENSE

This software and associated documentation files (the "Software") are the 
proprietary property of the author. The Software is protected by copyright 
laws and international treaties.

No part of this Software may be reproduced, distributed, transmitted, 
displayed, published, or broadcast in any form or by any means, including 
photocopying, recording, or other electronic or mechanical methods, without 
the prior written permission of the author.

The Software is provided for personal, non-commercial use by the author only. 
Any unauthorised use, reproduction, or distribution of this Software is 
strictly prohibited and may result in civil and criminal penalties.

For licensing enquiries, contact: [TODO: add contact email]
```

### 7. Create `data/seed/README.md`
Step-by-step instructions for downloading and importing O*NET data:
1. Go to https://www.onetcenter.org/database.html
2. Under "O*NET 30.2 Database" (the first row with download buttons), click "MySQL" — this downloads PostgreSQL-compatible SQL files despite the label
3. Extract the ZIP into `data/onet/`
4. Ensure Docker Compose is running (`docker compose up -d db`)
5. Run `bash data/seed/V2__import_onet_staging.sh`
6. Run `docker exec -i careergraph-db-1 psql -U careergraph -d careergraph < data/seed/V3__transform_onet_to_careergraph.sql`
7. Run `docker exec -i careergraph-db-1 psql -U careergraph -d careergraph < data/seed/V4__verify_seed.sql`
8. Check the output — expected counts and what to look for
9. Optional: `DROP SCHEMA staging CASCADE;` to clean up

Include a note that `data/onet/` is gitignored — each developer downloads the files themselves.

### 8. Create `docs/DEVELOPMENT.md`
Local development setup guide:
- Prerequisites with version numbers
- How to run the full stack with Docker Compose
- How to run just the database (for API development against local .NET)
- How to run the .NET API locally (`dotnet run`)
- How to run the Angular app locally (`ng serve` with proxy config)
- How to run tests (`dotnet test`, `ng test`)
- Common issues and solutions (CORS, port conflicts, Docker healthcheck timing)
- Environment variable reference
- Note on Stripe test mode for Phase 5 development

### 9. Move documentation files if needed
If any `.md` files are in the wrong location (e.g., `ONET_DATA_DICTIONARY.md` in root instead of `docs/`), move them to the correct location per CLAUDE.md's structure:
- Root: `CLAUDE.md`, `PROJECT_PLAN.md`, `PHASE_RUNNER.md`, `FEEDBACK.md`, `MONETISATION.md`, `README.md`, `LICENSE`
- `docs/`: `ONET_DATA_DICTIONARY.md`, `ONET_METADATA_EXPANSION.md`, `DEVELOPMENT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`

### 10. Validate documentation cross-references
Scan the .md files for broken cross-references (e.g., CLAUDE.md referencing a file that doesn't exist, PHASE_RUNNER.md referencing a wrong path). Report any issues.

### 11. Final audit and report
After completing all tasks, report:
- Complete file tree of the repo
- Any issues found and fixed
- Confirmation that the repo is ready for initial commit
- Suggested commit message: `chore: initial project scaffold with documentation, seed pipeline specs, and monetisation strategy`

Let me know when the repo is ready so I can review and make the initial commit.
