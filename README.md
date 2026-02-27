# Steeves & Associates — Capstone Analytics Dashboard

## ALY6080: Integrated Experiential Learning | Northeastern University | Spring 2025

A lean business intelligence dashboard for Steeves and Associates, a 21-employee Microsoft consulting firm in Canada. The app provides operational analytics, competitive market positioning, AI-powered insights, and Power BI integration in a single unified interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │
│  │ Overview  │ │  Market  │ │  Chat  │ │ Power BI │ │
│  │ (KPIs)   │ │ Position │ │  (AI)  │ │ (Embed)  │ │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘ │
│       │             │           │            │       │
│       └─────────────┴─────┬─────┴────────────┘       │
│                           │                          │
│                    Flask REST API                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │/api/      │ │/api/      │ │/api/     │ │/api/   │ │
│  │overview   │ │competitors│ │chat      │ │powerbi │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │             │            │            │       │
│  PostgreSQL    CSV File     Gemini API   PBI REST API│
└─────────────────────────────────────────────────────┘
```

## Pages

| Page | Route | Data Source | Purpose |
|------|-------|-------------|---------|
| Overview | `/` | PostgreSQL | KPIs, revenue trends, top clients/resources |
| Market Position | `/market` | Competitor CSV | Steeves vs. 49 Canadian Microsoft partners |
| AI Chat | `/chat` | All sources | Natural language Q&A across all data |
| Power BI | `/powerbi` | Power BI API | Embedded live dashboards |

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Python Flask
- **Database**: PostgreSQL
- **AI**: Google Gemini (free tier)
- **BI Integration**: Power BI REST API (iframe embed + Execute Queries API)
- **Data**: 1,000-row operational sample + 49-company competitor dataset

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your keys
python app.py
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # Fill in your keys
npm run dev
```

### Database
```bash
psql -U postgres -f database/schema.sql
psql -U postgres -d steeves_capstone -f database/seed.sql
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/steeves_capstone
GEMINI_API_KEY=your_gemini_api_key
POWERBI_CLIENT_ID=your_azure_app_client_id
POWERBI_CLIENT_SECRET=your_azure_app_client_secret
POWERBI_TENANT_ID=your_azure_tenant_id
POWERBI_WORKSPACE_ID=your_workspace_id
POWERBI_DATASET_ID=your_dataset_id
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_POWERBI_EMBED_URL=your_report_embed_url
```

## Extensibility (v2 Features)

The architecture supports adding these without rewriting:
- Additional analytics pages (Trend, Customer, Project drill-downs)
- Client health scoring + churn detection
- Resource allocation recommendations
- Monte Carlo profitability simulation
- Excel upload & ad-hoc analysis
- Full RAG pipeline (swap context builder for vector store)
- Power BI Execute Queries API (swap iframe for live DAX queries)

## Team — Group 2
- Lawrence Dass
- Naveen Koushik Thotakura
- Shanmugapriya Gopalakrishnan (Priya)
- Melika Zandi (Ly)
