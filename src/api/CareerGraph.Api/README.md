# src/api/CareerGraph.Api/README.md
# CareerGraph API

The API layer is a minimal .NET 8 Web API project that exposes the core endpoints for the
CareerGraph application.

## Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/careers/{id}` | GET | Retrieve a detailed career node (metadata + edges). |
| `/api/v1/careers/{id}/neighbourhood` | GET | Retrieve a subgraph around a node (depth, maxDepth). |
| `/api/v1/careers/search` | GET | Fuzzy search by title. |
| `/api/v1/careers/clusters` | GET | List clusters with counts. |
| `/api/v1/careers/path` | GET | Dijkstra path between two nodes. |
| `/api/v1/health` | GET | Health check for the service and DB. |

## Running

```bash
cd src/api/CareerGraph.Api
# Ensure environment variables are set (see .env.example)
dotnet run
```

The API will be available at `https://localhost:5001` (or `http://localhost:5000` if you prefer).

## Development

The project is configured for `dotnet watch` and Swagger UI for easy exploration.

---

## Folder structure

```
CareerGraph.Api/
├── Program.cs
├── CareerGraph.Api.csproj
├── Controllers/
├── Services/
├── Models/
├── Data/
└── Migrations/
```
