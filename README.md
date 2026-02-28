# Steeves & Associates — Capstone Analytics Dashboard

## ALY6980: Integrated Experiential Learning | Northeastern University | Spring 2025

A business intelligence dashboard for Steeves and Associates, a 21-employee Microsoft consulting firm in Canada. Provides operational analytics, competitive market positioning, client health scoring, resource allocation recommendations, and an AI-powered natural language chat assistant.

**Built by Lawrence Dass**

---

## Live Deployment

| Layer | URL |
|-------|-----|
| Frontend | Vercel (auto-deploys from `main`) |
| Backend | `https://steeves-api.happyforest-1e18c340.eastus.azurecontainerapps.io` |
| Health check | `GET /api/health` |

---

## Architecture

```
Next.js (Vercel)
     │
     │  NEXT_PUBLIC_API_URL (production)
     │  /api/* rewrite to localhost:5000 (dev)
     ▼
Flask API (Azure Container Apps — East US)
     │
     ├──► Azure PostgreSQL Flexible Server (Canada Central)
     │    database: steeves_capstone
     │    17,792 time entries · 50 competitors
     │
     └──► OpenRouter
          ├── Llama 3.3 70B :free  (intent classification)
          └── DeepSeek V3          (SQL generation · narration · health · allocation)
```

---

## Pages

| Page | Route | Data Source | Purpose |
|------|-------|-------------|---------|
| Overview | `/` | PostgreSQL | KPIs, revenue trends, top clients and resources |
| Market Position | `/market` | PostgreSQL (competitors) | Steeves vs. 50 Canadian Microsoft partners |
| Client Health | `/client-health` | PostgreSQL | RFMT risk scoring for 119 active customers |
| Allocation | `/allocation` | PostgreSQL | Consultant recommendations based on historical patterns |
| AI Chat | `/chat` | PostgreSQL + OpenRouter | Natural language Q&A with NL-to-SQL and intent routing |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · Tailwind CSS · Recharts |
| Backend | Python Flask · Gunicorn |
| Database | PostgreSQL 16 (Azure Flexible Server) |
| LLM | OpenRouter — DeepSeek V3 + Llama 3.3 70B :free |
| Hosting | Vercel (frontend) · Azure Container Apps (backend) · Azure Container Registry |
| Data | 17,792-row operational dataset (2020–2025) · 50-company competitor dataset |

---

## Architecture Diagrams

See [`docs/diagrams/`](./docs/diagrams/) for full Mermaid diagrams:

1. [System Architecture](./docs/diagrams/01-system-architecture.md) — Full stack map
2. [User Flow](./docs/diagrams/02-user-flow.md) — End-user paths across all 5 modules
3. [Data Pipeline](./docs/diagrams/03-data-pipeline.md) — Ingestion to analytics outputs
4. [API Surface](./docs/diagrams/04-api-surface.md) — All endpoint groups and dependencies
5. [Chat Lifecycle](./docs/diagrams/05-chat-lifecycle.md) — Intent routing, NL-to-SQL, RFMT, allocation paths

> Diagrams render in GitHub and in VS Code / Cursor with the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.

---

## Quick Start

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in DATABASE_URL, OPENROUTER_API_KEY, LLM_PROVIDER
python app.py             # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                  # http://localhost:3000
```

### Database
```bash
# URL-encode special chars in password (@ → %40, # → %23)
psql "postgresql://user:pass@host:5432/steeves_capstone?sslmode=require" \
  -f database/schema.sql
DATABASE_URL='postgresql://...' python database/seed.py
```

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:pass@host:5432/steeves_capstone?sslmode=require
LLM_PROVIDER=openrouter          # ollama | openrouter | gemini
OPENROUTER_API_KEY=sk-or-v1-...
GEMINI_API_KEY=                  # optional, only if LLM_PROVIDER=gemini
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Deployment

### Backend — Azure Container Apps
```bash
# Must build for linux/amd64 (required for Azure; Apple Silicon uses --platform flag)
az acr login --name steevesassociatesacr
docker buildx build --platform linux/amd64 \
  -t steevesassociatesacr.azurecr.io/steeves-api:latest --push backend/

az containerapp update \
  --name steeves-api \
  --resource-group steeves-and-associates-rg \
  --image steevesassociatesacr.azurecr.io/steeves-api:latest
```

### Frontend — Vercel
1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL` = Container App URL
4. Deploy — every push to `main` redeploys automatically

### Azure Resources
| Resource | Name | Region |
|----------|------|--------|
| Resource Group | `steeves-and-associates-rg` | East US |
| Container Registry | `steevesassociatesacr` | East US |
| Container Apps Env | `steeves-and-associates-env` | East US |
| Container App | `steeves-api` | East US |
| PostgreSQL Server | `steeves-associates-db` | Canada Central |
