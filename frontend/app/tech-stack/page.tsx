"use client";

const CATEGORIES = [
  {
    label: "Frontend",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    tools: [
      {
        name: "Next.js 14",
        role: "React framework",
        function:
          "Renders all dashboard pages (Overview, Market, Client Health, Allocation, Chat, Architecture, Tech Stack) using the App Router. Handles routing, server-side data fetching, and API proxying in development.",
        reason:
          "Chosen because it pairs React with file-based routing and built-in Vercel deployment. The App Router lets us mix server and client components, keeping data-heavy pages fast while keeping interactive charts and chat on the client side.",
        link: "https://nextjs.org",
      },
      {
        name: "React 18",
        role: "UI component model",
        function:
          "Powers all interactive UI — filter dropdowns, chart tooltips, the chat message thread, allocation search, and dismissable chips. State is managed with useState and side-effects with useEffect.",
        reason:
          "Industry-standard for component-driven UIs. Rich ecosystem of chart and UI libraries built on top of it (Recharts, Lucide), which kept third-party dependencies minimal.",
        link: "https://react.dev",
      },
      {
        name: "Tailwind CSS",
        role: "Utility-first styling",
        function:
          "Styles every element in the app. Custom brand tokens (steeves-navy, steeves-blue, steeves-gold, steeves-teal, steeves-muted) are defined in tailwind.config.js and used across all components. Shared utility classes like vz-card, vz-title, and vz-subtitle enforce visual consistency.",
        reason:
          "Eliminates the need for separate CSS files. Constraints like a fixed colour palette and spacing scale keep the dashboard visually consistent without a design system.",
        link: "https://tailwindcss.com",
      },
      {
        name: "Recharts",
        role: "Data visualisation",
        function:
          "Renders all charts in the dashboard — revenue trend line charts on the Overview page, bar charts for top customers and resources, pie/bar charts on the Market Position page, and score bar distributions on the Client Health page.",
        reason:
          "Built natively for React with a composable component API. Lighter than D3 for standard chart types, and the declarative syntax fits cleanly into Next.js page components.",
        link: "https://recharts.org",
      },
      {
        name: "Mermaid.js",
        role: "Diagram rendering",
        function:
          "Converts the system architecture flowchart definition (written as plain text) into an SVG diagram rendered in the browser on the Architecture page.",
        reason:
          "Allows the architecture diagram to be version-controlled as text alongside the code, rather than as a binary image. Dynamically imported to avoid adding it to the initial page bundle.",
        link: "https://mermaid.js.org",
      },
      {
        name: "Lucide React",
        role: "Icon library",
        function:
          "Provides all icons used in the sidebar navigation, action buttons, status indicators, and info tooltips across the UI.",
        reason:
          "Lightweight, tree-shakeable icon set with a consistent visual style. Each icon is an individual React component, so only the icons actually used end up in the bundle.",
        link: "https://lucide.dev",
      },
      {
        name: "Vercel",
        role: "Frontend hosting & CDN",
        function:
          "Hosts the Next.js app and serves it globally via CDN. Automatically builds and deploys a new version every time code is pushed to the main branch on GitHub. Handles SSL certificates, edge caching, and preview URLs for branches.",
        reason:
          "Made by the same team as Next.js — zero configuration needed for deployment. The free Hobby plan covers the project's traffic with automatic deploys, removing any manual deployment step for the frontend.",
        link: "https://vercel.com",
      },
    ],
  },
  {
    label: "Backend",
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-800",
    tools: [
      {
        name: "Python 3.11",
        role: "Backend runtime",
        function:
          "Runs all backend code — API route handlers, database queries, client health scoring (RFMT), resource allocation logic, NL-to-SQL generation, and LLM orchestration. The Docker image is built from python:3.11-slim.",
        reason:
          "Python has the best ecosystem for data science and LLM integration. Libraries like psycopg2, requests, and pandas are mature and well-documented. The slim Docker image keeps the container size small.",
        link: "https://python.org",
      },
      {
        name: "Flask 3.1",
        role: "API web framework",
        function:
          "Exposes all API endpoints consumed by the frontend. Routes are split into blueprints by feature: /api/overview, /api/competitors, /api/client-health, /api/allocation, /api/chat. Each blueprint maps HTTP requests to the corresponding service layer.",
        reason:
          "Lightweight and unopinionated — ideal for an API-only backend where the data logic lives in service modules rather than the framework. Faster to set up than Django for a project of this scope.",
        link: "https://flask.palletsprojects.com",
      },
      {
        name: "Flask-CORS",
        role: "Cross-origin requests",
        function:
          "Adds CORS headers to every API response so the Vercel-hosted frontend (a different domain) can call the Azure-hosted API. In production, allowed origins are restricted to the Vercel URL and localhost.",
        reason:
          "Browsers block cross-origin requests by default. Since the frontend and backend are on different domains (Vercel vs Azure), CORS headers are required for every API call to succeed.",
        link: "https://flask-cors.readthedocs.io",
      },
      {
        name: "Gunicorn",
        role: "Production WSGI server",
        function:
          "Sits in front of the Flask app inside the Docker container. Runs 2 sync worker processes, each handling HTTP requests independently. Configured with a 120-second timeout to accommodate slow LLM API calls.",
        reason:
          "Flask's built-in development server is single-threaded and not safe for production. Gunicorn handles concurrent requests reliably and integrates cleanly with Docker.",
        link: "https://gunicorn.org",
      },
      {
        name: "psycopg2",
        role: "PostgreSQL driver",
        function:
          "Executes all SQL queries against the Azure PostgreSQL database. Uses a ThreadedConnectionPool (min 1, max 10 connections) so connections are reused across requests rather than opened and closed on every call.",
        reason:
          "The standard Python driver for PostgreSQL. The connection pool was added specifically to stay within the Azure B1ms tier's connection limit and avoid per-request connection overhead on a containerised app.",
        link: "https://www.psycopg.org",
      },
      {
        name: "requests",
        role: "HTTP client for LLM calls",
        function:
          "Makes all HTTP calls to the OpenRouter API. The payload is serialised with json.dumps(ensure_ascii=True) and encoded as ASCII bytes before being sent, giving full control over encoding.",
        reason:
          "Replaced the OpenAI Python SDK after discovering that the SDK's internal httpx layer validated header values with .encode('latin-1'), which raised UnicodeEncodeError when the API key contained non-ASCII characters. Using requests directly avoids that layer entirely.",
        link: "https://requests.readthedocs.io",
      },
    ],
  },
  {
    label: "Database",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    tools: [
      {
        name: "PostgreSQL 16",
        role: "Primary data store",
        function:
          "Stores all application data in three tables: time_entries (17,792 billable hour records from 2020–2025 used for all revenue and utilisation queries), competitors (50 Canadian Microsoft Azure partners used for market analysis), and chat_history (session-scoped conversation logs for the AI chat).",
        reason:
          "Relational model is the right fit for structured time-entry and competitor data. PostgreSQL's window functions (RANK, OVER), date extraction (EXTRACT QUARTER), and aggregation functions are used extensively in the dashboard queries.",
        link: "https://www.postgresql.org",
      },
      {
        name: "Azure PostgreSQL Flex",
        role: "Managed database service",
        function:
          "Runs the PostgreSQL 16 server on Azure infrastructure (Canada Central, B1ms tier). Handles automated backups, security patching, and SSL enforcement. Firewall rules allow connections from the Azure Container Apps environment and from local developer IPs.",
        reason:
          "Managed service eliminates database administration work. The Flexible Server tier allows pausing the instance during inactivity, reducing cost for a portfolio project. Hosting in Canada Central keeps data residency aligned with the company's Canadian operations.",
        link: "https://azure.microsoft.com/en-ca/products/postgresql",
      },
    ],
  },
  {
    label: "AI & LLM",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800",
    tools: [
      {
        name: "OpenRouter",
        role: "LLM API gateway",
        function:
          "Acts as a single API endpoint that routes requests to different LLM providers (DeepSeek, Meta, etc.). The backend sends all LLM calls to OpenRouter, which handles provider routing, rate limiting, and billing in one place.",
        reason:
          "Avoids maintaining separate API keys and SDKs for each model provider. Lets us mix a free model (Llama for classification) with a paid model (DeepSeek for generation) under one unified API, and makes swapping models trivial.",
        link: "https://openrouter.ai",
      },
      {
        name: "DeepSeek V3",
        role: "SQL generation & narration",
        function:
          "Receives a natural language question plus the database schema and generates a valid read-only SQL query. Also narrates the query results into a business-friendly answer, and answers contextual questions about competitor data and operational metrics.",
        reason:
          "Benchmark results show DeepSeek V3 performs on par with GPT-4 class models for code and SQL generation at a fraction of the cost (~$0.0004 per conversation via OpenRouter). Chosen specifically for its strong SQL accuracy.",
        link: "https://deepseek.com",
      },
      {
        name: "Llama 3.3 70B",
        role: "Intent classification",
        function:
          "Reads the user's chat message and classifies it into one of five intents: data_query, client_health, resource_recommend, document_qa, or general. The classified intent routes the request to the correct handler in gemini_chat.py.",
        reason:
          "Intent classification is a lightweight task that does not require the most capable model. Llama 3.3 70B is available on OpenRouter's free tier, so this step costs nothing. Keyword matching handles obvious cases first; the LLM only runs when keywords are ambiguous.",
        link: "https://ai.meta.com",
      },
      {
        name: "Ollama",
        role: "Local LLM runtime (dev only)",
        function:
          "Runs a local LLM (llama3.1:8b) on the developer's machine during development. Set via LLM_PROVIDER=ollama in the local .env file. The backend calls Ollama's /api/chat endpoint instead of OpenRouter.",
        reason:
          "Allows full end-to-end development and testing of all LLM-powered features without spending API credits or requiring an internet connection. The same code paths run; only the provider endpoint changes.",
        link: "https://ollama.com",
      },
    ],
  },
  {
    label: "Infrastructure & DevOps",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    tools: [
      {
        name: "Docker",
        role: "Containerisation",
        function:
          "Packages the Flask backend and all its dependencies into a single portable image. The Dockerfile installs Python requirements, copies the source code, exposes port 5000, and starts Gunicorn. The image is built for linux/amd64 to match the Azure Container Apps runtime.",
        reason:
          "Containerisation guarantees the app runs identically in development, CI, and production. It eliminates 'works on my machine' problems and makes the deployment unit self-contained — no need to install Python or dependencies on the server.",
        link: "https://docker.com",
      },
      {
        name: "Azure Container Apps",
        role: "Backend hosting",
        function:
          "Runs the Docker container in a managed serverless environment. Configured with min/max 1 replica (always on, no cold starts). Secrets (database URL, OpenRouter key) are stored as Container App secrets and injected as environment variables at container startup.",
        reason:
          "Serverless containers remove the need to manage VMs or Kubernetes clusters. Container Apps scales automatically and integrates natively with Azure Container Registry, making it the lowest-overhead way to run a containerised API on Azure.",
        link: "https://azure.microsoft.com/en-ca/products/container-apps",
      },
      {
        name: "Azure Container Registry",
        role: "Docker image storage",
        function:
          "Stores every Docker image built by the CI pipeline. Each deploy pushes two tags: :latest (for human reference) and :<git-sha> (the tag actually deployed — immutable and traceable back to the exact commit). Azure Container Apps pulls the image directly from ACR.",
        reason:
          "Private registry co-located with the rest of the Azure infrastructure. The SHA-based tagging strategy means every running container can be traced back to the exact commit that produced it, which simplifies rollbacks and auditing.",
        link: "https://azure.microsoft.com/en-ca/products/container-registry",
      },
      {
        name: "GitHub Actions",
        role: "CI/CD pipeline",
        function:
          "Automatically builds and deploys the backend whenever code touching backend/** is pushed to main. Pipeline steps: checkout → Azure login → ACR login → docker build (amd64) → docker push → update Container App secrets → deploy new image to Container App.",
        reason:
          "Eliminates manual deployments entirely. The pipeline runs on GitHub's infrastructure with no separate CI server to maintain. workflow_dispatch support also allows manual redeploys triggered directly from the GitHub UI.",
        link: "https://github.com/features/actions",
      },
      {
        name: "GitHub Secrets",
        role: "Secret management",
        function:
          "Encrypted storage for all sensitive values used by the pipeline: AZURE_CREDENTIALS, DATABASE_URL, OPENROUTER_API_KEY, ACR_NAME, ACR_LOGIN_SERVER, RESOURCE_GROUP, CONTAINERAPP_NAME, and CORS_ORIGINS. The CI workflow reads these at runtime and injects them into Azure.",
        reason:
          "Secrets never appear in code or logs. Separating secret storage from the deployment pipeline means rotating a key only requires updating one GitHub Secret and triggering a redeploy — no code changes needed.",
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
          Every tool and service powering the Steeves &amp; Associates BI
          platform — what each one does and why it was chosen.
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.label} className={`vz-card border ${cat.border}`}>
          <div
            className={`px-5 py-3 border-b ${cat.border} ${cat.bg} rounded-t-panel`}
          >
            <h2 className="text-sm font-semibold text-steeves-ink tracking-wide uppercase">
              {cat.label}
            </h2>
          </div>

          <div className="divide-y divide-steeves-border">
            {cat.tools.map((tool) => (
              <div key={tool.name} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-steeves-ink text-sm">
                      {tool.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}
                    >
                      {tool.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <p className="text-xs font-semibold text-steeves-ink uppercase tracking-wide mb-0.5">
                        Function
                      </p>
                      <p className="text-sm text-steeves-muted leading-relaxed">
                        {tool.function}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-steeves-ink uppercase tracking-wide mb-0.5">
                        Why chosen
                      </p>
                      <p className="text-sm text-steeves-muted leading-relaxed">
                        {tool.reason}
                      </p>
                    </div>
                  </div>
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
