# Steeves & Associates Analytics Dashboard

End-to-end analytics dashboard for Steeves and Associates, a Microsoft consulting firm in Canada. The platform combines operational reporting, market benchmarking, client health scoring, resource allocation insights, and an AI-powered natural language chat experience.

**Independently built and maintained by Lawrence Dass as a portfolio project**

Built with Next.js, Flask, PostgreSQL, Azure, and Vercel.

---

## Screenshots

![Steeves & Associates dashboard screenshot 1](frontend/public/Steeves&Associates1.png)

![Steeves & Associates dashboard screenshot 2](frontend/public/Steeves&Associates2.png)

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
Flask API (Azure Container Apps - East US)
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
| LLM | OpenRouter - DeepSeek V3 + Llama 3.3 70B :free |
| Hosting | Vercel (frontend) · Azure Container Apps (backend) · Azure Container Registry |
| Data | 17,792-row operational dataset (2020–2025) · 50-company competitor dataset |

---

## Architecture Diagrams

See [`docs/diagrams/`](./docs/diagrams/) for full Mermaid diagrams:

1. [System Architecture](./docs/diagrams/01-system-architecture.md) - Full stack map
2. [User Flow](./docs/diagrams/02-user-flow.md) - End-user paths across all 5 modules
3. [Data Pipeline](./docs/diagrams/03-data-pipeline.md) - Ingestion to analytics outputs
4. [API Surface](./docs/diagrams/04-api-surface.md) - All endpoint groups and dependencies
5. [Chat Lifecycle](./docs/diagrams/05-chat-lifecycle.md) - Intent routing, NL-to-SQL, RFMT, allocation paths

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

### CI/CD - GitHub Actions (Backend)

Pushing to `main` with changes under `backend/**` automatically:
1. Builds a `linux/amd64` Docker image on the GitHub runner
2. Pushes `:latest` + `:<sha>` tags to Azure Container Registry
3. Updates Container App secrets and deploys the new image

To trigger manually: **Actions → Deploy Backend (Azure Container Apps) → Run workflow**

See [`docs/diagrams/06-cicd-pipeline.md`](./docs/diagrams/06-cicd-pipeline.md) for the full pipeline diagram.

#### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac` JSON output |
| `ACR_NAME` | `steevesassociatesacr` |
| `ACR_LOGIN_SERVER` | `steevesassociatesacr.azurecr.io` |
| `RESOURCE_GROUP` | `steeves-and-associates-rg` |
| `CONTAINERAPP_NAME` | `steeves-api` |
| `DATABASE_URL` | PostgreSQL URL (URL-encode `@`→`%40`, `#`→`%23` in password) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `CORS_ORIGINS` | `https://steeves-and-associates.vercel.app,http://localhost:3000` |

#### Manual deploy (one-off, Apple Silicon)
```bash
# Required on Apple Silicon - Azure needs linux/amd64
az acr login --name steevesassociatesacr
docker buildx build --platform linux/amd64 \
  -t steevesassociatesacr.azurecr.io/steeves-api:latest --push backend/

az containerapp update \
  --name steeves-api \
  --resource-group steeves-and-associates-rg \
  --image steevesassociatesacr.azurecr.io/steeves-api:latest
```

### Frontend - Vercel
Auto-deploys on every push to `main`.

Initial setup:
1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL` = `https://steeves-api.happyforest-1e18c340.eastus.azurecontainerapps.io`
4. Deploy

### Azure Resources
| Resource | Name | Region |
|----------|------|--------|
| Resource Group | `steeves-and-associates-rg` | East US |
| Container Registry | `steevesassociatesacr` | East US |
| Container Apps Env | `steeves-and-associates-env` | East US |
| Container App | `steeves-api` | East US |
| PostgreSQL Server | `steeves-associates-db` | Canada Central |
