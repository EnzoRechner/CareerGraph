# PHASE_RUNNER.md — Claude Code Execution Protocol

## How This Works

CareerGraph is built in phases. Each phase is a self-contained unit of work that Claude Code
executes autonomously. After each phase, the developer (Enzo) tests the output, writes
feedback, and Claude Code reads that feedback before starting the next phase.

**The cycle:**
```
1. Claude Code reads CLAUDE.md + phase docs + any prior FEEDBACK
2. Claude Code executes all tasks in the current phase
3. Claude Code runs the verification checklist
4. Claude Code reports: what was done, what passed, what needs attention
5. Enzo tests manually
6. Enzo writes feedback in FEEDBACK.md
7. Next session: Claude Code reads FEEDBACK.md, adjusts plan, executes next phase
```

---

## Reading Order for Each Session

Before starting ANY phase, Claude Code must read these files in order:

1. `CLAUDE.md` — Architecture, conventions, schema, API design
2. `PHASE_RUNNER.md` — This file (execution protocol)
3. `FEEDBACK.md` — Developer feedback from previous phases (if exists)
4. Phase-specific reference docs (listed per phase below)

If `FEEDBACK.md` contains adjustments that affect the current phase, apply them BEFORE
executing the phase tasks. If feedback requires changes to future phases, note them in
a `## Phase Adjustments` section at the bottom of `FEEDBACK.md`.

---

## FEEDBACK.md Template

After each phase, the developer fills in this template. Claude Code reads it at the start
of the next session.

```markdown
# FEEDBACK.md — Developer Testing Feedback

## Phase [N] Feedback
**Date:** YYYY-MM-DD
**Overall:** [PASS / PARTIAL / FAIL]

### What Worked
- [list what worked correctly]

### Issues Found
- [ ] Issue 1: description (severity: HIGH/MEDIUM/LOW)
- [ ] Issue 2: description (severity: HIGH/MEDIUM/LOW)

### Adjustments for Next Phase
- [any changes to the plan based on what was learned]

### Adjustments for Future Phases
- [any changes to phases beyond the next one]

### Notes
- [anything else Claude Code should know]

---
## Phase [N-1] Feedback
[previous feedback stays here — append, don't overwrite]
```

---

## Phase Definitions

### Phase 1: Scaffold + Seed Data

**Read before starting:** `CLAUDE.md`, `docs/ONET_DATA_DICTIONARY.md`, `docs/ONET_METADATA_EXPANSION.md`

**Tasks:**
1. Create full monorepo directory structure
2. Create `.gitignore` (include `data/onet/`, `.env`, `node_modules`, `bin/`, `obj/`)
3. Create `.env.example` with all required variables
4. Write `data/seed/V1__create_careergraph_schema.sql`
5. Write `docker-compose.yml` with PostgreSQL service (healthcheck included)
6. Write `data/seed/README.md` — step-by-step O*NET download + import instructions
7. Write `data/seed/V2__import_onet_staging.sh`
8. Write `data/seed/V3__transform_onet_to_careergraph.sql` (ALL steps including metadata enrichment from ONET_METADATA_EXPANSION.md)
9. Write `data/seed/V4__verify_seed.sql` (including metadata completeness checks)
10. Boot PostgreSQL via Docker Compose
11. Run the full seed pipeline (V1 → V2 → V3 → V4)
12. Verify all V4 queries pass with reasonable numbers
13. Scaffold .NET 8 Minimal API project (`dotnet new webapi --use-minimal-apis`)
14. Configure EF Core + Npgsql + PostgreSQL connection
15. Create domain models: `CareerNode.cs`, `CareerEdge.cs`
16. Create `CareerGraphDbContext.cs` with Fluent API configurations
17. Create DTOs: `CareerNodeDto`, `CareerNodeDetailDto`, `GraphDto`, `ClusterSummaryDto`
18. Create `ICareerService` + `CareerService` (get by id, search, neighbourhood, clusters)
19. Create `CareerEndpoints.cs` (wire service to Minimal API routes)
20. Create `HealthEndpoints.cs` (DB connectivity check)
21. Configure CORS (development policy + belt-and-suspenders)
22. Add API service to `docker-compose.yml` with `depends_on: db: condition: service_healthy`
23. Write xUnit tests for `CareerService` (search, neighbourhood depth, empty results, not found)
24. Write `docs/DEVELOPMENT.md` — local dev setup guide
25. Final verification: `docker compose up` → `curl` all endpoints

**Verification Checklist:**
```
[ ] docker compose up starts without errors
[ ] PostgreSQL healthcheck passes
[ ] V4 verify queries all return expected counts
[ ] Metadata completeness: >90% of nodes have skills, knowledge, interests
[ ] GET /api/v1/health returns { status: "healthy", dbConnected: true }
[ ] GET /api/v1/careers/search?q=teacher returns multiple results
[ ] GET /api/v1/careers/{id} returns a career with metadata populated
[ ] GET /api/v1/careers/{id}/neighbourhood returns nodes and edges
[ ] GET /api/v1/careers/clusters returns 20+ clusters with counts
[ ] xUnit tests pass: dotnet test
[ ] No compiler warnings in API project
```

**Report format after completion:**
```
## Phase 1 Complete

### What was built
- [list files created]

### Seed data stats
- career_nodes: [count]
- career_edges: [count]
- Nodes with skills metadata: [count/total]
- Nodes with interests metadata: [count/total]

### API endpoints working
- [list endpoints and sample responses]

### Tests
- [pass/fail count]

### Known issues
- [any issues encountered]

### Ready for testing
Enzo: please test the following:
1. Run `docker compose up`
2. Hit GET /api/v1/careers/search?q=teacher
3. Pick an ID from the results, hit GET /api/v1/careers/{id}/neighbourhood
4. Check that metadata (skills, tasks, interests) is populated
5. Write feedback to FEEDBACK.md
```

---

### Phase 2: 3D Graph Canvas

**Read before starting:** `CLAUDE.md`, `FEEDBACK.md`

**Tasks:**
1. Scaffold Angular 19 app in `src/web/`
2. Configure `proxy.conf.json` and environments
3. Install `3d-force-graph` + `three`
4. Create `core/models/` (TypeScript interfaces matching API DTOs)
5. Create `core/services/career-api.service.ts`
6. Create `features/graph-canvas/graph-canvas.component.ts`
7. Wrap `3d-force-graph` in the component (dynamic ESM import)
8. Load neighbourhood for default node on init (SOC 25-2021.00)
9. Node colouring by career cluster (use CLUSTER_COLOURS from CLAUDE.md)
10. Node sizing by salary (normalised)
11. Directional arrows on edges
12. Node click → expand neighbourhood (fetch + merge, deduplicate by ID)
13. Node hover → tooltip (title + salary + cluster)
14. Camera auto-focus on clicked node
15. Dockerfile + nginx.conf for production build
16. Add web service to docker-compose.yml

**Verification Checklist:**
```
[ ] ng serve starts without errors
[ ] Browser shows 3D graph with coloured nodes
[ ] Default node (Elementary School Teachers) is visible
[ ] Clicking a node fetches and renders adjacent nodes
[ ] Node tooltip shows title + salary
[ ] Directional arrows visible on edges
[ ] No WebGL console errors
[ ] Docker build succeeds
[ ] Full stack docker compose up shows the app at localhost:4200
```

---

### Phase 3: Career Detail Sidebar + Pathfinding

**Read before starting:** `CLAUDE.md`, `FEEDBACK.md`

**Tasks:**
1. Career detail sidebar component (slide-out panel, right side)
2. Display all career attributes: title, description, cluster, education, salary
3. Display rich metadata: top skills, top knowledge, RIASEC radar, tasks, tech skills
4. Display inbound edges ("How to get here") with transition details
5. Display outbound edges ("Where this leads") with transition details
6. "Set as my current role" / "Set as my target role" buttons
7. Signal-based `UserSelectionService` persisting to localStorage
8. `IPathfindingService` + `PathfindingService` in .NET (Dijkstra's, IMemoryCache)
9. `GET /api/v1/careers/path` endpoint
10. Path highlight in 3D graph (glow edges, pulse nodes)
11. Step-by-step panel showing transition sequence with cost summary
12. xUnit tests for pathfinding

**Verification Checklist:**
```
[ ] Clicking a node opens the sidebar with full details
[ ] Metadata sections (skills, tasks, tech) render correctly
[ ] Setting start/end roles persists across page refresh
[ ] GET /api/v1/careers/path returns a valid path
[ ] Path is highlighted in the 3D graph
[ ] Step-by-step panel shows correct transitions
[ ] Pathfinding between unrelated careers works (long path)
[ ] Pathfinding to same node returns empty/self path
[ ] xUnit pathfinding tests pass
```

---

### Phase 4: Search + Polish

**Read before starting:** `CLAUDE.md`, `FEEDBACK.md`

**Tasks:**
1. Search bar component with debounced input (300ms)
2. Search results dropdown/overlay
3. Click search result → focus graph on that node + load neighbourhood
4. Career cluster grid overview page (`GET /careers/clusters`)
5. Click cluster → load all nodes in that cluster as a subgraph
6. Loading spinners, error messages, empty states
7. Mobile-responsive: graph resizes, sidebar → bottom sheet on narrow screens
8. Caddy configuration for production HTTPS
9. O*NET attribution in footer (CC BY 4.0 requirement)
10. "Career Traverser" vs "Career Finder" mode toggle (nav element, routes)

**Verification Checklist:**
```
[ ] Search finds careers by name (partial match)
[ ] Search finds careers by alternate title
[ ] Cluster grid shows all clusters with counts
[ ] Clicking a cluster loads a cluster subgraph
[ ] Loading states appear during API calls
[ ] Error states appear on failed API calls
[ ] App is usable on mobile viewport
[ ] Caddy serves app over HTTPS with valid cert (if domain configured)
[ ] O*NET attribution visible in footer
```

---

### Phase 5: Auth + Monetisation

**Read before starting:** `CLAUDE.md`, `MONETISATION.md`, `FEEDBACK.md`

**Tasks:**
1. Write migration `V5__add_users_and_auth.sql` (users table, api_keys table)
2. Implement OAuth login — Google + GitHub via ASP.NET Core authentication
3. Implement JWT token issuance (login returns JWT with user ID, email, tier claim)
4. Create `UserService` in Angular (signal-based, stores auth state + tier)
5. Create auth interceptor in Angular (attaches JWT to API requests)
6. Create `TierGateFilter` endpoint filter in .NET (checks tier claim, returns 403 with upgrade prompt for insufficient tier)
7. Apply `TierGateFilter` to premium endpoints:
   - `GET /careers/path` → requires "premium"
   - `GET /careers/{id}/neighbourhood?depth=3` → requires "premium" (free max is 2)
8. Implement metadata trimming in `CareerNodeDetailDto.FromEntity()`:
   - Free: top 3 skills, top 3 knowledge, top 3 tasks, top 3 tech skills. No interests/workStyles/workValues. `isTruncated = true`
   - Premium: full metadata, `isTruncated = false`
9. Create `PremiumGateComponent` in Angular (wraps content, shows upgrade CTA for free users)
10. Apply premium gates in career detail sidebar (full skills list, RIASEC chart, full tasks, work styles)
11. Create Stripe products and prices in Stripe Dashboard (test mode):
    - "CareerGraph Premium" monthly ($9) and yearly ($90)
12. Implement `POST /api/v1/billing/checkout` (creates Stripe Checkout Session, returns URL)
13. Implement `POST /api/v1/billing/webhook` (handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)
14. Implement `GET /api/v1/billing/portal` (Stripe Customer Portal URL for managing subscription)
15. Implement `GET /api/v1/billing/status` (current tier, subscription status, expiry)
16. Create `/pricing` page in Angular (Free vs Premium comparison cards, CTA buttons)
17. Create `/login` page with OAuth buttons (Google, GitHub)
18. Add "Upgrade" button in nav bar (visible to free/anonymous users)
19. Add upgrade prompts at each premium gate point in the UI
20. Migrate localStorage preferences (current/target role) to user account on first login
21. Test full flow: anonymous → browse → hit gate → register → checkout → premium unlocked
22. xUnit tests for tier gating, billing endpoints, metadata trimming

**Verification Checklist:**
```
[ ] OAuth login works (Google redirect → callback → JWT issued)
[ ] JWT is attached to subsequent API requests
[ ] Anonymous user can browse graph and search (free features work)
[ ] Anonymous user gets 403 on /careers/path with { error: "premium_required", upgradeUrl }
[ ] Free user sees truncated metadata (top 3 skills, no RIASEC)
[ ] Free user sees PremiumGateComponent with upgrade CTA in sidebar
[ ] Stripe Checkout redirect works (test mode)
[ ] Stripe webhook updates user tier to "premium"
[ ] Premium user sees full metadata + pathfinding + 3-hop neighbourhood
[ ] Cancellation sets subscription_expires_at, access continues until expiry
[ ] /pricing page renders correctly with tier comparison
[ ] /login page shows OAuth buttons
[ ] localStorage preferences migrate to user account on login
[ ] Billing status endpoint returns correct tier info
[ ] xUnit tests pass for all new endpoints
```

**Report format after completion:**
```
## Phase 5 Complete

### Auth
- OAuth providers configured: [list]
- JWT token issuance: [working/issues]

### Monetisation
- Stripe test mode: [working/issues]
- Checkout flow: [working/issues]
- Webhook handling: [working/issues]

### Feature Gating
- Endpoints gated: [list]
- Metadata trimming: [working/issues]
- UI premium gates: [count of gate points]

### Ready for testing
Enzo: please test:
1. Browse app as anonymous — verify free features work
2. Try pathfinding — should see premium gate
3. Click upgrade → should redirect to Stripe (test mode)
4. Complete test payment
5. Verify premium features unlock
6. Write feedback to FEEDBACK.md
```

---

## Handling Feedback Adjustments

When Claude Code reads `FEEDBACK.md` at the start of a new phase:

1. **HIGH severity issues from the previous phase:** Fix these FIRST before starting the new phase. These are blockers.
2. **MEDIUM severity issues:** Fix if they affect the current phase. Otherwise note them for a dedicated fix session.
3. **LOW severity issues:** Log for later. Don't let them delay the current phase.
4. **Adjustments for this phase:** Apply the adjustments to the task list before starting.
5. **Adjustments for future phases:** Note them but don't act yet (last responsible moment).

If feedback contradicts something in CLAUDE.md, the feedback takes precedence — it represents
the developer's tested reality over the plan's assumptions.

---

## Error Recovery

If Claude Code encounters an error during phase execution:

1. **Database errors in seed pipeline:** Check staging table names with `\dt staging.*` and column names with `\d staging.[table]`. The O*NET SQL file structure may differ from what the data dictionary describes. Adjust V3 accordingly.
2. **npm/dotnet restore failures:** Check network access. The Docker build needs internet.
3. **3d-force-graph import issues:** It's an ESM-only package. Use dynamic `import()` in Angular, not static imports. May need to add to `angular.json` allowedCommonJsDependencies.
4. **CORS errors:** Verify proxy.conf.json is loaded (check angular.json serve config).
5. **EF Core migration issues:** Don't use EF migrations for the O*NET seed. The seed pipeline uses raw SQL. EF only manages the schema for application code going forward.

If an error can't be resolved, report it clearly in the completion report so Enzo can investigate.
