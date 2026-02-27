# Data Pipeline Diagram

```mermaid
flowchart LR
  subgraph SRC["Data Sources"]
    X[Operational Excel<br/>2020-2025]:::source
    C[Competitor CSV<br/>50 companies]:::source
    S[schema.sql]:::source
  end

  subgraph ETL["Load & Prepare"]
    SEED[database/seed.py]:::process
    MAP[Type parsing + normalization<br/>(dates, rates, booleans)]:::process
  end

  subgraph DB["PostgreSQL"]
    T1[(time_entries)]:::table
    T2[(competitors)]:::table
    T3[(chat_history)]:::table
  end

  subgraph API["Flask Query Layer"]
    OQ[Overview queries<br/>KPI/trend/share]:::api
    MQ[Market queries<br/>rankings/filters]:::api
    CQ[Chat context queries<br/>operational + competitive]:::api
  end

  subgraph UX["Frontend Outputs"]
    CHARTS[Overview + Market charts]:::output
    CHAT[AI chat responses]:::output
    AUDIT[Conversation log]:::output
  end

  X --> SEED
  C --> SEED
  S --> T1
  S --> T2
  S --> T3
  SEED --> MAP
  MAP --> T1
  MAP --> T2

  T1 --> OQ
  T2 --> MQ
  T1 --> CQ
  T2 --> CQ
  CQ --> T3

  OQ --> CHARTS
  MQ --> CHARTS
  CQ --> CHAT
  T3 --> AUDIT

  classDef source fill:#FFF7ED,stroke:#EA580C,color:#9A3412,stroke-width:1.5px;
  classDef process fill:#FEF3C7,stroke:#D97706,color:#78350F,stroke-width:1.5px;
  classDef table fill:#EDE9FE,stroke:#7C3AED,color:#4C1D95,stroke-width:1.5px;
  classDef api fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:1.5px;
  classDef output fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:1.5px;
```

