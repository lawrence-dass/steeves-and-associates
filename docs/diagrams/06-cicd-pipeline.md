# CI/CD Pipeline Diagram

```mermaid
flowchart TD
  DEV[Developer pushes to main<br/>backend/** or workflow file]:::trigger

  subgraph GHA["GitHub Actions — ubuntu-latest runner"]
    S1[Checkout code]:::step
    S2[Azure Login<br/>AZURE_CREDENTIALS service principal]:::step
    S3[Log in to ACR<br/>steevesassociatesacr.azurecr.io]:::step
    S4[Docker build linux/amd64<br/>tag :latest + :sha]:::step
    S5[Push both tags to ACR]:::step
    S6[Update Container App secrets<br/>dburl · openrouter-key]:::step
    S7[az containerapp update<br/>new image + env vars]:::step
  end

  subgraph ACR["Azure Container Registry"]
    IMG[steeves-api:latest<br/>steeves-api:sha]:::image
  end

  subgraph ACA["Azure Container Apps — East US"]
    CA[steeves-api container<br/>steeves-and-associates-env]:::container
  end

  VERCEL[Vercel — auto-deploys frontend<br/>on every push to main]:::vercel

  DEV --> S1
  S1 --> S2 --> S3 --> S4 --> S5
  S5 --> IMG
  IMG --> S6 --> S7
  S7 --> CA

  DEV --> VERCEL

  classDef trigger fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:2px;
  classDef step fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:1.2px;
  classDef image fill:#FEF3C7,stroke:#D97706,color:#78350F,stroke-width:1.5px;
  classDef container fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E,stroke-width:1.5px;
  classDef vercel fill:#F3E8FF,stroke:#7E22CE,color:#3B0764,stroke-width:1.5px;
```

## Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | Azure service principal JSON (`az ad sp create-for-rbac`) |
| `ACR_NAME` | `steevesassociatesacr` |
| `ACR_LOGIN_SERVER` | `steevesassociatesacr.azurecr.io` |
| `RESOURCE_GROUP` | `steeves-and-associates-rg` |
| `CONTAINERAPP_NAME` | `steeves-api` |
| `DATABASE_URL` | PostgreSQL URL with URL-encoded password (`@`→`%40`, `#`→`%23`) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `CORS_ORIGINS` | `https://steeves-and-associates.vercel.app,http://localhost:3000` |

## Trigger Conditions

- **Automatic**: push to `main` touching `backend/**` or `.github/workflows/deploy-backend.yml`
- **Manual**: GitHub UI → Actions → "Deploy Backend" → "Run workflow" (`workflow_dispatch`)

## Notes

- Runner is `ubuntu-latest` (amd64) — image is natively compatible with Azure Container Apps, no `--platform` flag needed
- `DATABASE_URL` and `OPENROUTER_API_KEY` are stored as Container App secrets (`secretref:`) to avoid shell-interpolating special characters
- Both `:sha` and `:latest` tags are pushed; the SHA tag is what gets deployed (immutable, traceable per commit)
