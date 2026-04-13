# docs/DEVELOPMENT.md – quick start guide

# CareerGraph Local Development

These instructions walk you through getting the entire stack up and running locally.

## Prerequisites
- Docker Desktop (or Docker Engine) 23+ with Compose V2
- .NET 8 SDK
- Node.js 20+ (for Angular 19)
- Git (recommended)

## 1. Clone the repo (or unzip the workspace)
```bash
git clone <repo-url> careergraph
cd careergraph
```

## 2. Pull O*NET data
The O*NET PostgreSQL dump is large (~150 MB) and is kept in `data/onet/`. It is **gitignored**.

Download the latest O*NET 30.2 PostgreSQL export from:

> https://www.onetcenter.org/database.html → *All Files* → *PostgreSQL*.

Extract the ZIP into `data/onet/`.

> **Important**: The folder should contain a series of `.sql` files, one per O*NET table.

## 3. Create the database and seed schema
```bash
docker compose up db
```

The container will run the init script `V1__create_careergraph_schema.sql` and start PostgreSQL.

## 4. Run the full seed pipeline
The seed pipeline uses three scripts:

1. `V2__import_onet_staging.sh` – loads the O*NET dump into a staging schema.
2. `V3__transform_onet_to_careergraph.sql` – transforms staging data into the application tables.
3. `V4__verify_seed.sql` – sanity‑checks the import.

```bash
# Inside the workspace root
bash data/seed/V2__import_onet_staging.sh
psql -U careergraph -d careergraph -f data/seed/V3__transform_onet_to_careergraph.sql
psql -U careergraph -d careergraph -f data/seed/V4__verify_seed.sql
```

## 5. Build and start the API
```bash
docker compose build api
docker compose up api
```

The API will be reachable at `http://localhost:5000`.

## 6. Build and start the Angular frontend
```bash
docker compose build web
docker compose up web
```

The web app is served on `http://localhost:4200`.

## 7. Full stack (API + Web + DB + Caddy)
```bash
docker compose up
```

- API: `http://localhost:5000`
- Angular: `http://localhost:4200` (dev server) or `http://localhost` (Caddy reverse proxy)
- Caddy: HTTPS support if `DOMAIN` env var is set.

## 8. Running tests
```bash
# .NET xUnit tests
cd src/api/CareerGraph.Api.Tests
dotnet test
```

## 9. Common Troubleshooting
- **PostgreSQL not ready**: Ensure `docker compose up db` finished with a healthy status.
- **Seed fails**: Check the output of `V2__import_onet_staging.sh`. The script prints any errors.
- **Angular build errors**: Verify Node.js and npm are the correct versions.

Happy hacking!
