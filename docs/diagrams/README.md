# Application Diagrams (Mermaid)

These diagrams are color-coded and presentation-ready for teammates and faculty review.
Reflect the live deployed stack as of February 2026.

1. [01-system-architecture.md](./01-system-architecture.md) — Full stack map: Vercel · Azure Container Apps · Azure PostgreSQL · OpenRouter
2. [02-user-flow.md](./02-user-flow.md) — End-user paths across all 5 modules
3. [03-data-pipeline.md](./03-data-pipeline.md) — Data ingestion to analytics outputs
4. [04-api-surface.md](./04-api-surface.md) — API endpoint groups and dependencies
5. [05-chat-lifecycle.md](./05-chat-lifecycle.md) — Chat intent routing with NL-to-SQL, RFMT health, and allocation paths

## Deployed Infrastructure

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Vercel | Auto-deployed from `main` |
| Backend | Azure Container Apps | `steeves-api.happyforest-1e18c340.eastus.azurecontainerapps.io` |
| Database | Azure PostgreSQL Flexible Server (Canada Central) | `steeves-associates-db.postgres.database.azure.com` |
| LLM | OpenRouter | DeepSeek V3 (SQL/narration) · Llama 3.3 70B :free (intent) |
| Registry | Azure Container Registry | `steevesassociatesacr.azurecr.io` |
