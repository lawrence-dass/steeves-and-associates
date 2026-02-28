# API Surface and Ownership Diagram

```mermaid
flowchart TB
  UI[Next.js Frontend — Vercel<br/>calls NEXT_PUBLIC_API_URL directly in prod]:::frontend

  UI --> OVG & MKG & CLG & ALG & CHG

  subgraph OVG["Overview Endpoints"]
    O1[GET /api/overview/filter-options]:::overview
    O2[GET /api/overview/kpis]:::overview
    O3[GET /api/overview/revenue-trend]:::overview
    O4[GET /api/overview/top-customers]:::overview
    O5[GET /api/overview/top-resources]:::overview
    O6[GET /api/overview/revenue-by-customer]:::overview
  end

  subgraph MKG["Competitors Endpoints"]
    M1[GET /api/competitors/filter-options]:::market
    M2[GET /api/competitors/all]:::market
    M3[GET /api/competitors/summary]:::market
    M4[GET /api/competitors/by-location]:::market
    M5[GET /api/competitors/by-size]:::market
    M6[GET /api/competitors/steeves-position]:::market
  end

  subgraph CLG["Client Health Endpoints"]
    CL1[GET /api/client-health/scores]:::health
    CL2[GET /api/client-health/summary]:::health
    CL3[GET /api/client-health/at-risk]:::health
  end

  subgraph ALG["Allocation Endpoints"]
    A1[GET /api/allocation/inputs]:::alloc
    A2[POST /api/allocation/recommend]:::alloc
  end

  subgraph CHG["Chat Endpoints"]
    C1[POST /api/chat/message]:::chat
    C2[GET /api/chat/history/:session_id]:::chat
    C3[GET /api/chat/suggestions]:::chat
  end

  OVG & MKG & CLG & ALG --> DB[(Azure PostgreSQL<br/>steeves_capstone)]:::db
  CHG --> DB
  CHG --> OR[(OpenRouter<br/>DeepSeek V3 · Llama 3.3 70B :free)]:::llm

  classDef frontend fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:1.5px;
  classDef overview fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:1.2px;
  classDef market fill:#FEF3C7,stroke:#D97706,color:#78350F,stroke-width:1.2px;
  classDef health fill:#FCE7F3,stroke:#DB2777,color:#831843,stroke-width:1.2px;
  classDef alloc fill:#EDE9FE,stroke:#7C3AED,color:#4C1D95,stroke-width:1.2px;
  classDef chat fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E,stroke-width:1.2px;
  classDef db fill:#FFF7ED,stroke:#EA580C,color:#9A3412,stroke-width:1.5px;
  classDef llm fill:#F3E8FF,stroke:#7E22CE,color:#3B0764,stroke-width:1.5px;
```
