# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Business Intelligence dashboard for **Steeves and Associates**, a 21-person Microsoft consulting firm. Three-layer architecture: Next.js frontend → Flask API → PostgreSQL, with OpenRouter LLM integration for a natural language chat assistant.

## Commands

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in required values
python app.py               # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                 # http://localhost:3000
npm run build               # production build
```

### Database
```bash
# URL-encode special chars in password (@ → %40, # → %23)
psql "postgresql://user:pass@host:5432/steeves_capstone?sslmode=require" -f database/schema.sql
DATABASE_URL='postgresql://...' python database/seed.py
```

### Docker (backend only)
```bash
cd backend
# Local test
docker build -t steeves-api:latest .
docker run -p 5000:5000 -e DATABASE_URL="postgresql://..." steeves-api:latest

# Deploy to ACR (amd64 required for Azure Container Apps)
docker buildx build --platform linux/amd64 \
  -t steevesassociatesacr.azurecr.io/steeves-api:latest --push .
```

## Architecture

### Data Flow
```
Next.js (Vercel) ──NEXT_PUBLIC_API_URL──► Flask (Azure Container Apps)
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         PostgreSQL        OpenRouter       psycopg2
                      (Azure Flex,      (DeepSeek V3 +    connection
                      Canada Central)   Llama 3.3 70B)      pool
```

### Deployed Infrastructure

| Resource | Name | Notes |
|----------|------|-------|
| Frontend | Vercel (Hobby) | Auto-deploys from `main` |
| Backend | Azure Container Apps — `steeves-api` | `steeves-and-associates-env`, East US |
| Container Registry | `steevesassociatesacr.azurecr.io` | ACR Basic, East US |
| Database | `steeves-associates-db.postgres.database.azure.com` | PostgreSQL 16 Flex, Canada Central, B1ms |
| Database name | `steeves_capstone` | 17,792 time entries, 50 competitors |
| LLM | OpenRouter | `OPENROUTER_API_KEY` env var |

### Backend Structure (`backend/`)
- **`app.py`** — Creates Flask app, registers all blueprints, sets up CORS
- **`routes/`** — Thin Flask blueprints; each file owns one API group (`/api/overview`, `/api/competitors`, `/api/chat`, `/api/client-health`, `/api/allocation`)
- **`services/`** — Business logic:
  - `database.py` — `psycopg2` connection pool; use `query()`, `query_one()`, `execute()` helpers throughout
  - `gemini_chat.py` — Central chat orchestrator: classifies intent → routes to SQL generator, health scorer, or resource allocator → returns response with `data_source` attribution
  - `sql_generator.py` — NL-to-SQL using LLM with schema context; executes read-only against `time_entries`
  - `client_health.py` — RFMT scoring (Recency, Frequency, Monetary, Tenure) → risk category
  - `resource_allocator.py` — Matches consultants to projects using historical patterns

### Frontend Structure (`frontend/`)
- **`app/`** — One `page.tsx` per dashboard module; route = module
- **`components/ui/`** — Reusable chart and card components (Recharts-based)
- **`lib/`** — Typed API helper functions that call `/api/*`
- **`next.config.js`** — Rewrites `/api/*` → `http://127.0.0.1:5000/api/*` in dev; production uses `NEXT_PUBLIC_API_URL` directly

### Database Schema
- **`time_entries`** — Operational data (17,792 rows, 2020–2025): `customer_name`, `resource_name`, `project`, `worked_date`, `billable_hours`, `hourly_billing_rate`, `extended_price`
- **`competitors`** — 50 Canadian Microsoft Azure partners with certifications and revenue data
- **`chat_history`** — Session-scoped conversation log

### LLM Provider Configuration
Controlled by `LLM_PROVIDER` env var (`ollama` | `openrouter` | `gemini`). Production uses `openrouter`. `gemini_chat.py` handles provider selection.

| Task | Model | Cost |
|------|-------|------|
| Intent classification | `meta-llama/llama-3.3-70b-instruct:free` | $0 |
| SQL generation + narration | `deepseek/deepseek-chat-v3-0324` | ~$0.0004/conversation |
| Health + allocation narration | `deepseek/deepseek-chat-v3-0324` | Same |

For local dev, set `LLM_PROVIDER=ollama` with `ollama pull llama3.1:8b` to avoid API costs.

## Key Conventions

- Python: PEP 8, `snake_case`; TypeScript: strict mode, `PascalCase` components, `camelCase` hooks/functions
- API route groups: `/api/overview`, `/api/competitors`, `/api/chat`, `/api/client-health`, `/api/allocation` — no `/api/powerbi`
- Commit style: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) scoped by layer
- Brand colors are defined in `tailwind.config.js` — use them (`navy`, `blue`, `gold`, `teal`) rather than raw hex values
- No automated test suite; validate with `npm run build` + manual endpoint testing (`GET /api/health`)

## Deployment

### Frontend — Vercel
- Auto-deploys from `main` (root directory set to `frontend`)
- `NEXT_PUBLIC_API_URL` = `https://steeves-api.happyforest-1e18c340.eastus.azurecontainerapps.io`

### Backend — GitHub Actions CI/CD (primary)
Pushing to `main` with changes to `backend/**` triggers `.github/workflows/deploy-backend.yml` automatically. Manual trigger also available via `workflow_dispatch` in the Actions UI.

Required GitHub Secrets (all 8 must be set):
| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON from `az ad sp create-for-rbac` |
| `ACR_NAME` | `steevesassociatesacr` |
| `ACR_LOGIN_SERVER` | `steevesassociatesacr.azurecr.io` |
| `RESOURCE_GROUP` | `steeves-and-associates-rg` |
| `CONTAINERAPP_NAME` | `steeves-api` |
| `DATABASE_URL` | PostgreSQL URL — URL-encode `@`→`%40`, `#`→`%23` in password |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `CORS_ORIGINS` | `https://steeves-and-associates.vercel.app,http://localhost:3000` |

The pipeline: Checkout → Azure Login → ACR Login → `docker build` (amd64) → push → `az containerapp secret set` → `az containerapp update`

### Backend — Manual deploy (one-off, Apple Silicon)
```bash
# GitHub Actions runner is amd64 natively; local Apple Silicon needs --platform flag
az acr login --name steevesassociatesacr
docker buildx build --platform linux/amd64 \
  -t steevesassociatesacr.azurecr.io/steeves-api:latest --push backend/

az containerapp update \
  --name steeves-api \
  --resource-group steeves-and-associates-rg \
  --image steevesassociatesacr.azurecr.io/steeves-api:latest
```

### Container App Environment Variables
| Variable | How set |
|----------|---------|
| `DATABASE_URL` | Container App secret `dburl` via `secretref:dburl` |
| `OPENROUTER_API_KEY` | Container App secret `openrouter-key` via `secretref:openrouter-key` |
| `LLM_PROVIDER` | `openrouter` |
| `FLASK_ENV` | `production` |
| `CORS_ORIGINS` | Direct env var from `CORS_ORIGINS` secret |

### Database — Azure PostgreSQL (Canada Central)
- Firewall: local machine IP + `0.0.0.0–255.255.255.255` for Container Apps egress
- Database name: `steeves_capstone`; admin login: `steevesadmin`
- Password special chars must be URL-encoded (`@`→`%40`, `#`→`%23`) in the connection string
