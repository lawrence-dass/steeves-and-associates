# System Architecture Diagram

```mermaid
flowchart LR
  U[Users<br/>Consultants, Managers, Faculty]:::actor

  subgraph FE["Next.js Frontend (Port 3000)"]
    OV[Overview]:::frontend
    MK[Market Position]:::frontend
    CH[AI Chat]:::frontend
    PB[Power BI]:::frontend
    UI[Shared UI Components<br/>Tailwind + Recharts]:::frontend
  end

  subgraph BE["Flask API (Port 5000)"]
    HEALTH[/api/health]:::backend
    OVAPI[/api/overview/*]:::backend
    CPAPI[/api/competitors/*]:::backend
    CHATAPI[/api/chat/*]:::backend
    PBIAPI[/api/powerbi/*]:::backend
    SERV[Service Layer<br/>DB + LLM adapters]:::backend
  end

  subgraph DATA["Data Layer"]
    PG[(PostgreSQL<br/>time_entries, competitors, chat_history)]:::database
    SEED[database/seed.py]:::database
    XLSX[Steeves_and_Associates_2020_2025.xlsx]:::source
    CSV[microsoft-azure-partners-canada__new_1.csv]:::source
  end

  subgraph AI["LLM Providers"]
    OLLAMA[(Ollama Local<br/>llama3.1:8b)]:::llm
    GEMINI[(Gemini API<br/>Fallback)]:::llm
  end

  subgraph EXT["External Integrations"]
    PBI[(Power BI Embed/API)]:::external
  end

  U --> OV
  U --> MK
  U --> CH
  U --> PB

  OV --> OVAPI
  MK --> CPAPI
  CH --> CHATAPI
  PB --> PBIAPI

  OV --> UI
  MK --> UI
  CH --> UI
  PB --> UI

  OVAPI --> PG
  CPAPI --> PG
  CHATAPI --> SERV
  SERV --> PG
  SERV --> OLLAMA
  SERV -. fallback .-> GEMINI
  PBIAPI --> PBI

  XLSX --> SEED
  CSV --> SEED
  SEED --> PG

  classDef actor fill:#F3E8FF,stroke:#7E22CE,color:#3B0764,stroke-width:2px;
  classDef frontend fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:1.5px;
  classDef backend fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:1.5px;
  classDef database fill:#FEF3C7,stroke:#D97706,color:#78350F,stroke-width:1.5px;
  classDef source fill:#FFF7ED,stroke:#EA580C,color:#9A3412,stroke-width:1.5px;
  classDef llm fill:#FCE7F3,stroke:#DB2777,color:#831843,stroke-width:1.5px;
  classDef external fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E,stroke-width:1.5px;
```

