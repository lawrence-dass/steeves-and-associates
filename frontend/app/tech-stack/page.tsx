"use client";

const CATEGORIES = [
  {
    label: "Frontend",
    color: "steeves-blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    tools: [
      {
        name: "Next.js 14",
        role: "React framework for the dashboard UI",
        detail:
          "App Router, server and client components. Deployed on Vercel with automatic deploys on every push to main.",
        link: "https://nextjs.org",
      },
      {
        name: "React 18",
        role: "Component model and state management",
        detail:
          "useState, useEffect, useRef hooks power all interactive elements — charts, filters, chat, allocation UI.",
        link: "https://react.dev",
      },
      {
        name: "Tailwind CSS",
        role: "Utility-first styling",
        detail:
          "Custom brand tokens (steeves-navy, steeves-blue, steeves-gold, steeves-teal) defined in tailwind.config.js. Zero custom CSS files.",
        link: "https://tailwindcss.com",
      },
      {
        name: "Recharts",
        role: "Data visualisation",
        detail:
          "Powers all charts: revenue trend lines, bar charts, pie charts, and client health score distributions.",
        link: "https://recharts.org",
      },
      {
        name: "Mermaid.js",
        role: "Architecture diagram rendering",
        detail:
          "Dynamically imported client-side to render the system architecture flowchart as SVG.",
        link: "https://mermaid.js.org",
      },
      {
        name: "Lucide React",
        role: "Icon library",
        detail:
          "Sidebar icons, action buttons, and status indicators throughout the UI.",
        link: "https://lucide.dev",
      },
      {
        name: "Vercel",
        role: "Frontend hosting & CDN",
        detail:
          "Hobby plan. Auto-deploys from main branch. Handles SSL, edge caching, and preview deployments.",
        link: "https://vercel.com",
      },
    ],
  },
  {
    label: "Backend",
    color: "steeves-teal",
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-800",
    tools: [
      {
        name: "Python 3.11",
        role: "Backend runtime",
        detail:
          "python:3.11-slim Docker base image. All backend services, routes, and data processing run on Python.",
        link: "https://python.org",
      },
      {
        name: "Flask 3.1",
        role: "API web framework",
        detail:
          "Thin blueprint-based API. Each feature group (/api/overview, /api/chat, etc.) lives in its own routes/ file.",
        link: "https://flask.palletsprojects.com",
      },
      {
        name: "Flask-CORS",
        role: "Cross-origin request handling",
        detail:
          "Allows the Vercel frontend to call the Azure-hosted API. Origins are locked to the production Vercel URL and localhost.",
        link: "https://flask-cors.readthedocs.io",
      },
      {
        name: "Gunicorn",
        role: "Production WSGI server",
        detail:
          "2 sync workers, 120 s timeout. Sits in front of Flask inside the Docker container.",
        link: "https://gunicorn.org",
      },
      {
        name: "psycopg2",
        role: "PostgreSQL driver",
        detail:
          "ThreadedConnectionPool (min 1, max 10) reuses connections across requests, staying within Azure B1ms limits.",
        link: "https://www.psycopg.org",
      },
      {
        name: "requests",
        role: "HTTP client for LLM calls",
        detail:
          "Used for all OpenRouter API calls. Chosen over the OpenAI SDK to give full control over header encoding and request serialisation.",
        link: "https://requests.readthedocs.io",
      },
    ],
  },
  {
    label: "Database",
    color: "steeves-gold",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    tools: [
      {
        name: "PostgreSQL 16",
        role: "Primary data store",
        detail:
          "Azure Database for PostgreSQL — Flexible Server. B1ms tier (Canada Central). Database: steeves_capstone. 3 tables: time_entries (17,792 rows), competitors (50 rows), chat_history.",
        link: "https://www.postgresql.org",
      },
      {
        name: "Azure PostgreSQL Flex",
        role: "Managed database service",
        detail:
          "Handles backups, patching, and high availability. Firewall allows Azure Container Apps egress IPs.",
        link: "https://azure.microsoft.com/en-ca/products/postgresql",
      },
    ],
  },
  {
    label: "AI & LLM",
    color: "steeves-navy",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800",
    tools: [
      {
        name: "OpenRouter",
        role: "LLM API gateway",
        detail:
          "Unified API that routes to multiple LLM providers. Used in production (LLM_PROVIDER=openrouter).",
        link: "https://openrouter.ai",
      },
      {
        name: "DeepSeek V3",
        role: "SQL generation & narration",
        detail:
          "deepseek/deepseek-chat-v3-0324 via OpenRouter. Converts natural language questions to SQL, narrates query results, and answers contextual questions. ~$0.0004 per conversation.",
        link: "https://deepseek.com",
      },
      {
        name: "Llama 3.3 70B",
        role: "Intent classification",
        detail:
          "meta-llama/llama-3.3-70b-instruct:free via OpenRouter. Classifies chat messages into data_query, client_health, resource_recommend, document_qa, or general. Free tier.",
        link: "https://ai.meta.com",
      },
      {
        name: "Ollama",
        role: "Local LLM runtime (dev only)",
        detail:
          "Used locally during development (LLM_PROVIDER=ollama) with llama3.1:8b. Avoids API costs while building and testing features.",
        link: "https://ollama.com",
      },
    ],
  },
  {
    label: "Infrastructure & DevOps",
    color: "steeves-danger",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    tools: [
      {
        name: "Docker",
        role: "Container runtime",
        detail:
          "python:3.11-slim base. Single-stage build: install requirements, copy source, expose 5000, run gunicorn. Built for linux/amd64 to match Azure Container Apps.",
        link: "https://docker.com",
      },
      {
        name: "Azure Container Apps",
        role: "Backend hosting",
        detail:
          "Serverless container hosting. Environment: steeves-and-associates-env (East US). App: steeves-api. Min/max replicas: 1. Secrets stored as secretref: values.",
        link: "https://azure.microsoft.com/en-ca/products/container-apps",
      },
      {
        name: "Azure Container Registry",
        role: "Docker image storage",
        detail:
          "steevesassociatesacr.azurecr.io. Basic tier. Stores :latest and :<git-sha> tags for every deploy — the SHA tag is what actually runs (immutable, traceable).",
        link: "https://azure.microsoft.com/en-ca/products/container-registry",
      },
      {
        name: "GitHub Actions",
        role: "CI/CD pipeline",
        detail:
          "deploy-backend.yml triggers on push to main touching backend/**. Steps: Azure login → ACR login → docker build → docker push → containerapp secret set → containerapp update.",
        link: "https://github.com/features/actions",
      },
      {
        name: "GitHub Secrets",
        role: "Secret management",
        detail:
          "Encrypted store for AZURE_CREDENTIALS, DATABASE_URL, OPENROUTER_API_KEY, CORS_ORIGINS, and ACR credentials. CI reads these and injects them into Azure at deploy time.",
        link: "https://docs.github.com/en/actions/security-guides/encrypted-secrets",
      },
    ],
  },
];

export default function TechStackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Tech Stack</h1>
        <p className="vz-subtitle mt-1">
          Every tool and service powering the Steeves &amp; Associates BI platform
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.label} className={`vz-card border ${cat.border}`}>
          <div className={`px-5 py-3 border-b ${cat.border} ${cat.bg} rounded-t-panel`}>
            <h2 className="text-sm font-semibold text-steeves-ink tracking-wide uppercase">
              {cat.label}
            </h2>
          </div>

          <div className="divide-y divide-steeves-border">
            {cat.tools.map((tool) => (
              <div key={tool.name} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-steeves-ink text-sm">
                      {tool.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
                      {tool.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-steeves-muted leading-relaxed">
                    {tool.detail}
                  </p>
                </div>
                <a
                  href={tool.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-steeves-blue hover:underline whitespace-nowrap mt-0.5"
                >
                  docs ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
