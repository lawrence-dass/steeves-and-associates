# Steeves & Associates Analytics Platform — Deployment Plan

## Final Architecture

| Layer | Service | Cost | Notes |
|-------|---------|------|-------|
| **Frontend** | Vercel (Hobby plan) | $0/month | Next.js native support, global CDN, never sleeps |
| **Backend** | Azure App Service or Container Apps | $0/month (from $100 credit) | Flask API, scale-to-zero, auto-wake |
| **Database** | Azure PostgreSQL Flexible Server (B1ms) | ~$16/month (from $100 credit) | 1 vCore, 2 GB RAM, 32 GB storage, always on |
| **LLM** | OpenRouter (one-time $10 purchase) | ~$10.55 total | 300+ models, free + paid, lasts 6–12 months |
| **Total** | | ~$0/month ongoing | Azure credit covers ~6 months; OpenRouter lasts 6–12 months |

After Azure credits expire (~6 months), swap PostgreSQL to **Neon** (free tier, 0.5 GB, auto-wake) and everything else continues at $0 indefinitely.

---

## 1. Frontend — Vercel

### Why Vercel

Vercel built Next.js. You get SSR, ISR, API routes, image optimization, and App Router support out of the box with zero configuration. Static assets serve from a global CDN and never sleep. Serverless functions cold-start in 1–3 seconds after ~5–10 minutes of inactivity, which is invisible since page content is CDN-cached.

### Free Tier Limits

- 100 GB bandwidth/month
- 1M edge requests/month
- 100 GB-hours serverless function execution
- 5,000 image optimizations/month
- Unlimited projects
- No credit card required
- 10-second function timeout (Hobby plan)
- Commercial use prohibited (fine for portfolio)

### Deployment Steps

1. Push your Next.js code to a GitHub repository (if not already)
2. Go to [vercel.com](https://vercel.com), sign up with GitHub
3. Click "Import Project" and select your repo
4. Set environment variables:
   - `NEXT_PUBLIC_API_URL` → your Azure backend URL (e.g., `https://steeves-and-associates-api.azurewebsites.net`)
5. Deploy — Vercel auto-detects Next.js and configures everything
6. Every push to `main` triggers automatic redeployment

### Configuration

Create `vercel.json` in your project root if you need custom settings:

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

### Custom Domain (Optional)

Vercel provides a free `*.vercel.app` subdomain. For a custom domain, you can connect one for free through Vercel's dashboard — just update DNS records.

---

## 2. Backend — Azure App Service (Flask)

### Why Azure

You have $100 in Azure credits, and showing Azure deployment on your portfolio is valuable for a Microsoft consulting firm's project. Azure App Service F1 (free tier) doesn't consume credits at all, but has limitations. For a better experience, use B1 ($13/month from credits) or Container Apps.

### Option A: Azure App Service (Recommended for Simplicity)

**F1 Free Tier** (does not consume credits):
- 1 GB RAM, 1 GB storage
- 60 CPU minutes/day
- Sleeps after ~20 minutes of inactivity, auto-wakes on request
- Custom domain supported (no SSL on free tier)
- Linux + Python 3.11+ supported

**B1 Basic Tier** ($13/month from credits, if you need more headroom):
- 1.75 GB RAM, 10 GB storage
- No CPU minute limit
- Always on (no sleep)
- Custom domain + SSL

### Deployment Steps (App Service)

```bash
# Install Azure CLI if not already
# Login to Azure
az login

# Create resource group
az group create --name steeves-and-associates-rg --location eastus

# Create App Service plan (F1 free tier)
az appservice plan create \
  --name steeves-and-associates-plan \
  --resource-group steeves-and-associates-rg \
  --sku F1 \
  --is-linux

# Create the web app
az webapp create \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --plan steeves-and-associates-plan \
  --runtime "PYTHON:3.11"

# Set environment variables
az webapp config appsettings set \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --settings \
    DATABASE_URL="postgresql://user:pass@steeves-and-associates-db.postgres.database.azure.com:5432/steeves" \
    OPENROUTER_API_KEY="sk-or-..." \
    FLASK_ENV="production"

# Deploy from GitHub (recommended)
az webapp deployment source config \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --repo-url https://github.com/yourusername/steeves-backend \
  --branch main \
  --manual-integration

# OR deploy with ZIP
cd your-flask-project
zip -r deploy.zip . -x "*.git*" "venv/*" "__pycache__/*"
az webapp deployment source config-zip \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --src deploy.zip
```

### Option B: Azure Container Apps (Better for Docker)

If your Flask app is already Dockerized, Container Apps is a stronger choice. It offers scale-to-zero (you only pay when requests come in) and a generous monthly free grant.

**Free grant (monthly, does not consume credits):**
- 2 million requests
- 180,000 vCPU-seconds (~50 hours CPU)
- 360,000 GiB-seconds (~100 hours of 1 GB RAM)

```bash
# Build and push Docker image to Azure Container Registry
az acr create --name steevesassociatesacr --resource-group steeves-and-associates-rg --sku Basic
az acr build --registry steevesassociatesacr --image steeves-and-associates-api:latest .

# Create Container Apps environment
az containerapp env create \
  --name steeves-and-associates-env \
  --resource-group steeves-and-associates-rg \
  --location eastus

# Deploy container app
az containerapp create \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --environment steeves-and-associates-env \
  --image steevesassociatesacr.azurecr.io/steeves-and-associates-api:latest \
  --target-port 5000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --env-vars \
    DATABASE_URL="postgresql://..." \
    OPENROUTER_API_KEY="sk-or-..."
```

### Flask Requirements

Make sure your Flask project has these files at the root:

**`requirements.txt`**:
```
flask
gunicorn
psycopg2-binary
sqlalchemy
scipy
numpy
pandas
openai
```

**`startup.txt`** (for App Service):
```
gunicorn --bind=0.0.0.0:8000 app:app
```

**`Dockerfile`** (for Container Apps):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
```

### CORS Configuration

Your Flask backend needs to allow requests from your Vercel frontend:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    "https://steeves-and-associates-dashboard.vercel.app",  # your Vercel URL
    "http://localhost:3000"                     # local dev
])
```

---

## 3. Database — Azure PostgreSQL Flexible Server

### Why Azure PostgreSQL

Your database has 13,688 rows spanning 2020–2024 with 130 customers and 24 resources. Azure PostgreSQL Flexible Server (B1ms) handles this effortlessly, stays always-on (no cold starts for the database layer), and the cost is covered by your $100 credit.

### Pricing

- **B1ms (Burstable)**: ~$16/month (1 vCore, 2 GB RAM, 32 GB storage included)
- $100 credit lasts approximately **6 months**
- If you use stop/start to run only during business hours, you can reduce to ~$10/month and stretch to ~10 months

### Deployment Steps

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name steeves-and-associates-db \
  --resource-group steeves-and-associates-rg \
  --location eastus \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --admin-user steevesadmin \
  --admin-password "YourSecurePassword123!" \
  --version 16 \
  --public-access 0.0.0.0

# Create the database
az postgres flexible-server db create \
  --resource-group steeves-and-associates-rg \
  --server-name steeves-and-associates-db \
  --database-name steeves_analytics

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group steeves-and-associates-rg \
  --name steeves-and-associates-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Connection String

```
postgresql://steevesadmin:YourSecurePassword123!@steeves-and-associates-db.postgres.database.azure.com:5432/steeves_analytics?sslmode=require
```

Set this as `DATABASE_URL` in your Azure App Service environment variables.

### Data Migration

Load your decoded dataset into the Azure database:

```bash
# From your local machine (with psql installed)
psql "postgresql://steevesadmin:YourSecurePassword123!@steeves-and-associates-db.postgres.database.azure.com:5432/steeves_analytics?sslmode=require" \
  -f create_tables.sql

# Or use pg_dump from your local PostgreSQL
pg_dump -h localhost -U localuser steeves_local | \
  psql "postgresql://steevesadmin:...@steeves-and-associates-db.postgres.database.azure.com:5432/steeves_analytics?sslmode=require"
```

### Budget Alerts

Set up alerts so you know when credits are running low:

```bash
# Create a budget alert at $15/month
az consumption budget create \
  --budget-name steeves-and-associates-monthly \
  --amount 15 \
  --category Cost \
  --time-grain Monthly \
  --start-date 2025-06-01 \
  --end-date 2026-06-01 \
  --resource-group steeves-and-associates-rg
```

Also set up email alerts in Azure Portal → Cost Management → Budgets.

### Post-Credit Migration Plan (After ~6 Months)

When Azure credits run out, migrate PostgreSQL to **Neon** (free):

1. `pg_dump` from Azure PostgreSQL
2. Create a Neon project at [neon.tech](https://neon.tech) (no credit card needed)
3. `psql` restore into Neon
4. Update `DATABASE_URL` in your Azure App Service (or wherever backend is hosted)
5. Delete the Azure PostgreSQL server to stop charges

Neon free tier: 0.5 GB storage, auto-wake from sleep in ~500ms, data never deleted.

---

## 4. LLM — OpenRouter

### Why OpenRouter

One API key, one credit balance, access to 300+ models from every major provider. OpenAI-compatible API, so the code change from Ollama is minimal. Built-in fallback routing between providers. Free models available for lightweight tasks, paid models for quality tasks.

### Setup

1. Create an account at [openrouter.ai](https://openrouter.ai)
2. Purchase $10 in credits (~$10.55 after 5.5% fee)
   - This unlocks 1,000 requests/day on free models (up from 50/day)
   - $10 in paid credits lasts 6–12 months at portfolio traffic levels
3. Generate an API key from the dashboard
4. Set `OPENROUTER_API_KEY` in your backend environment variables

### Model Strategy

Use different models for different tasks to optimize cost:

| Task | Model | Cost | Why |
|------|-------|------|-----|
| **Intent classification** | `meta-llama/llama-3.3-70b-instruct:free` | $0 | Simple classification, free model is plenty |
| **SQL generation** | `deepseek/deepseek-chat-v3-0324` | ~$0.14/$0.28 per 1M tokens | Excellent at code/SQL, extremely cheap |
| **Response narration** | `deepseek/deepseek-chat-v3-0324` | Same as above | Good natural language, consistent |
| **Client health explanations** | `deepseek/deepseek-chat-v3-0324` | Same | Handles analytical narration well |
| **Complex reasoning (fallback)** | `meta-llama/llama-3.3-70b-instruct` (paid variant) | ~$0.07/$0.14 per 1M tokens | When free tier is rate-limited |

### Cost Estimate

Per chatbot conversation (~1,500 tokens total across 3 LLM calls):
- Intent classification: $0 (free model)
- SQL generation + narration: ~$0.0004 (DeepSeek V3.2)
- **$10 in credits ≈ 25,000 conversations**

At 10 demo conversations per day, credits last **~7 years**. Even with heavier usage during portfolio demos, you're covered for well over a year.

### Code Implementation

Replace your current Ollama client with OpenRouter. The API is OpenAI-compatible:

```python
# app/services/llm_client.py

from openai import OpenAI
import os

# Single client for all LLM operations
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

# Optional: set HTTP headers for OpenRouter analytics
EXTRA_HEADERS = {
    "HTTP-Referer": "https://steeves-and-associates-dashboard.vercel.app",
    "X-Title": "Steeves and Associates Analytics Dashboard",
}


def classify_intent(user_message: str) -> str:
    """Classify user intent using a free model (zero cost)."""
    response = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct:free",
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify this message into exactly one category:\n"
                    "- data_query: asks for specific numbers, metrics, rankings, or trends\n"
                    "- client_health: asks about client risk, churn, engagement, or health\n"
                    "- resource_recommend: asks who to assign or recommend for a project\n"
                    "- document_qa: asks about company info, services, or qualitative info\n"
                    "- general: greetings, clarifications, or meta questions\n\n"
                    "Respond with ONLY the category name."
                ),
            },
            {"role": "user", "content": user_message},
        ],
        max_tokens=20,
        temperature=0,
        extra_headers=EXTRA_HEADERS,
    )
    intent = response.choices[0].message.content.strip().lower()
    valid = {"data_query", "client_health", "resource_recommend", "document_qa", "general"}
    return intent if intent in valid else "document_qa"


def generate_sql(user_message: str, schema_prompt: str) -> str:
    """Generate SQL using DeepSeek V3.2 (paid, ~$0.0002 per call)."""
    response = client.chat.completions.create(
        model="deepseek/deepseek-chat-v3-0324",
        messages=[
            {"role": "system", "content": schema_prompt},
            {"role": "user", "content": f"Generate a SQL query for: {user_message}"},
        ],
        max_tokens=500,
        temperature=0,
        extra_headers=EXTRA_HEADERS,
    )
    return response.choices[0].message.content.strip()


def narrate_results(question: str, results: str) -> str:
    """Narrate query results in natural language (paid, ~$0.0002 per call)."""
    response = client.chat.completions.create(
        model="deepseek/deepseek-chat-v3-0324",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an analytics assistant for Steeves and Associates, "
                    "a Microsoft consulting firm with 21 employees. Provide clear, "
                    "conversational answers with specific numbers from the data."
                ),
            },
            {
                "role": "user",
                "content": f'The user asked: "{question}"\n\nQuery results:\n{results}\n\n'
                           "Provide a clear answer with the specific numbers.",
            },
        ],
        max_tokens=800,
        temperature=0.3,
        extra_headers=EXTRA_HEADERS,
    )
    return response.choices[0].message.content.strip()


def general_response(user_message: str, context: str = "") -> str:
    """General LLM response for health scoring, resource recommendations, etc."""
    response = client.chat.completions.create(
        model="deepseek/deepseek-chat-v3-0324",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an analytics assistant for Steeves and Associates. "
                    "Provide actionable insights based on the data provided."
                ),
            },
            {"role": "user", "content": f"{context}\n\nUser question: {user_message}"},
        ],
        max_tokens=1000,
        temperature=0.3,
        extra_headers=EXTRA_HEADERS,
    )
    return response.choices[0].message.content.strip()
```

### Removing Ollama Dependency

In your Flask app, find everywhere you currently call Ollama/Mistral and replace with the functions above. The typical pattern:

**Before (Ollama):**
```python
from ollama import Client
client = Client(host="http://localhost:11434")
response = client.chat(model="mistral", messages=[...])
```

**After (OpenRouter):**
```python
from app.services.llm_client import classify_intent, generate_sql, narrate_results
# Use the appropriate function for each task
```

### LightRAG Integration

Your existing LightRAG setup uses Gemini embeddings. Keep that as-is for the knowledge graph path — embeddings are separate from the chat LLM. Only the generative (chat completion) calls need to switch to OpenRouter. If LightRAG internally calls an LLM for response generation, point that to OpenRouter as well:

```python
# If LightRAG uses an LLM for generation, update its config:
lightrag_config = {
    "llm_base_url": "https://openrouter.ai/api/v1",
    "llm_api_key": os.environ["OPENROUTER_API_KEY"],
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    # Keep embedding model as Gemini (separate concern)
    "embedding_model": "models/embedding-001",
    "embedding_api_key": os.environ["GEMINI_API_KEY"],
}
```

---

## 5. Environment Variables Summary

All environment variables your deployed application needs:

| Variable | Where Set | Value |
|----------|-----------|-------|
| `DATABASE_URL` | Azure App Service | `postgresql://steevesadmin:...@steeves-and-associates-db.postgres.database.azure.com:5432/steeves_analytics?sslmode=require` |
| `OPENROUTER_API_KEY` | Azure App Service | `sk-or-v1-...` (from OpenRouter dashboard) |
| `GEMINI_API_KEY` | Azure App Service | Your existing Gemini key (for embeddings only) |
| `FLASK_ENV` | Azure App Service | `production` |
| `NEXT_PUBLIC_API_URL` | Vercel | `https://steeves-and-associates-api.azurewebsites.net` |

---

## 6. Deployment Order

Execute in this sequence to minimize issues:

### Step 1: Azure PostgreSQL (30 minutes)

1. Create resource group and PostgreSQL server (commands in Section 3)
2. Create the database
3. Migrate your local data using `pg_dump` / `psql`
4. Verify data is accessible: `psql` into Azure and run a test query
5. Set up budget alerts

### Step 2: OpenRouter Setup (10 minutes)

1. Create account at openrouter.ai
2. Purchase $10 in credits
3. Generate API key
4. Test with a quick curl:

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer sk-or-v1-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct:free",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

### Step 3: Flask Backend on Azure (45 minutes)

1. Update your Flask code:
   - Replace all Ollama calls with OpenRouter client (Section 4 code)
   - Update `DATABASE_URL` to use Azure PostgreSQL connection string
   - Add CORS configuration for your Vercel domain
   - Ensure `requirements.txt` includes `openai` package
2. Deploy to Azure App Service or Container Apps (commands in Section 2)
3. Set environment variables
4. Test the API endpoints:
   - `GET /api/client-health` — should return health scores
   - `POST /api/chat` — should classify intent and respond
   - `POST /api/recommend-resources` — should return recommendations

### Step 4: Next.js Frontend on Vercel (20 minutes)

1. Update `NEXT_PUBLIC_API_URL` to point to your Azure backend
2. Push to GitHub
3. Import project on Vercel
4. Set environment variables in Vercel dashboard
5. Deploy and test end-to-end

### Step 5: Verification Checklist

- [ ] Frontend loads on Vercel URL
- [ ] Chat sends a data question → gets SQL-generated answer with real numbers
- [ ] Chat asks about company info → gets LightRAG knowledge graph response
- [ ] Client health page shows risk scores for all 130 customers
- [ ] Resource recommendation form returns ranked suggestions
- [ ] Source indicator badges show "Live Data Query" vs "Knowledge Base"
- [ ] Response times are acceptable (< 5 seconds for most queries)

---

## 7. Post-Credit Migration Plan

When your $100 Azure credit approaches zero (~month 5–6):

### Database: Azure PostgreSQL → Neon

```bash
# Export from Azure
pg_dump "postgresql://steevesadmin:...@steeves-and-associates-db.postgres.database.azure.com:5432/steeves_analytics?sslmode=require" > steeves_backup.sql

# Create Neon project at console.neon.tech (free, no credit card)
# Get connection string from Neon dashboard

# Import to Neon
psql "postgresql://user:pass@ep-something.us-east-2.aws.neon.tech/steeves_analytics?sslmode=require" < steeves_backup.sql

# Update DATABASE_URL in Azure App Service
az webapp config appsettings set \
  --name steeves-and-associates-api \
  --resource-group steeves-and-associates-rg \
  --settings DATABASE_URL="postgresql://user:pass@ep-something.us-east-2.aws.neon.tech/steeves_analytics?sslmode=require"

# Delete Azure PostgreSQL to stop charges
az postgres flexible-server delete --name steeves-and-associates-db --resource-group steeves-and-associates-rg --yes
```

Neon free tier details:
- 0.5 GB storage (your ~14K row dataset is well under this)
- Compute sleeps after 5 minutes of inactivity
- Auto-wakes in ~500ms on next connection (transparent to your app)
- Data is never deleted regardless of inactivity
- No credit card required
- No expiration on free tier

### Backend: Azure App Service → Render or Google Cloud Run (if needed)

If you also want to stop Azure backend charges (F1 tier is free and doesn't consume credits, so this may not be necessary):

- **Render**: Free tier, 512 MB RAM, ~60 second cold start, no credit card
- **Google Cloud Run**: Free tier, 1–5 second cold start, credit card required
- **Koyeb**: Free tier, 1–5 second cold start, credit card required

Frontend on Vercel and LLM on OpenRouter require no changes — they're already independent of Azure.

---

## 8. Cost Summary

### Months 1–6 (Azure credit period)

| Service | Monthly Cost | Source |
|---------|-------------|--------|
| Vercel (frontend) | $0 | Free Hobby plan |
| Azure App Service F1 (backend) | $0 | Free tier, no credit consumption |
| Azure PostgreSQL B1ms (database) | ~$16 | From $100 credit |
| OpenRouter (LLM) | ~$0 | $10 one-time purchase lasts entire period |
| **Monthly total** | **~$16** | **Covered by Azure credit** |
| **Out of pocket** | **~$10.55 total** | **One-time OpenRouter purchase** |

### Months 7+ (Post Azure credit)

| Service | Monthly Cost | Source |
|---------|-------------|--------|
| Vercel (frontend) | $0 | Free Hobby plan |
| Azure App Service F1 (backend) | $0 | Free tier (no credits needed) |
| Neon (database) | $0 | Free tier |
| OpenRouter (LLM) | ~$0 | Original $10 still has credits |
| **Monthly total** | **$0** | **Indefinitely** |

### Total Cost of Ownership

- **One-time**: ~$10.55 (OpenRouter credits)
- **Months 1–6**: $0 out of pocket (Azure credits cover PostgreSQL)
- **Months 7+**: $0/month indefinitely
- **$100 Azure credit remaining after 6 months**: ~$4 (most consumed by PostgreSQL)

---

## 9. Portfolio Presentation Notes

When showcasing this project, highlight the architecture decisions:

**Azure integration** — Demonstrates ability to deploy production workloads on Microsoft's cloud platform, directly relevant to Steeves and Associates as a Microsoft consulting firm. Backend and database both run on Azure services.

**Multi-model LLM strategy** — Intent classification runs on free Llama 3.3 70B, SQL generation and narration run on DeepSeek V3.2, all through a single OpenRouter gateway. This demonstrates cost-conscious AI architecture design.

**Dual-path chatbot** — The NL-to-SQL pipeline (data questions → SQL → real numbers) alongside the LightRAG knowledge graph path (qualitative questions → document retrieval) shows sophisticated query routing that goes beyond typical chatbot implementations.

**Three analytical features** — Client health scoring (RFMT model), predictive resource allocation (historical pattern matching), and NL-to-SQL (dynamic query generation) collectively transform a dashboard into an intelligent operations platform.

**Zero ongoing cost architecture** — After the initial credit period, the entire platform runs for $0/month through strategic use of free tiers across Vercel, Azure App Service F1, Neon, and OpenRouter credits. This demonstrates infrastructure cost optimization, a skill directly applicable to consulting.
