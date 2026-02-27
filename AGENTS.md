# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js 14 App Router UI.
- `frontend/app/`: route pages (`page.tsx`, `market/page.tsx`, `chat/page.tsx`, `powerbi/page.tsx`).
- `frontend/components/`: shared UI and layout components (for example `components/ui/KpiCard.tsx`).
- `frontend/lib/`: API helpers and utilities.
- `backend/`: Flask API entrypoint (`app.py`), route blueprints in `routes/`, shared services in `services/`.
- `database/`: SQL schema and primary operational dataset (`schema.sql`, `Steeves_and_Associates_2020_2025.xlsx`).
- `backend/data/`: competitor CSV and legacy sample files used by the seed script.

## Build, Test, and Development Commands
- Frontend setup: `cd frontend && npm install`
- Frontend dev server: `cd frontend && npm run dev` (http://localhost:3000)
- Frontend production build: `cd frontend && npm run build && npm run start`
- Frontend lint: `cd frontend && npm run lint`
- Backend setup: `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- Backend run: `cd backend && python app.py` (http://localhost:5000)
- Database init: `psql -U postgres -f database/schema.sql`
- Seed data (uses `database/Steeves_and_Associates_2020_2025.xlsx` by default):
  `python database/seed.py`

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indentation, `snake_case` for functions/variables, concise docstrings for route/service behavior.
- TypeScript/React: keep strict typing enabled, `PascalCase` components, `camelCase` functions/hooks, colocate route-specific UI under `frontend/app/<route>`.
- Keep API route groups consistent: `/api/overview`, `/api/competitors`, `/api/chat`, `/api/powerbi`.

## Testing Guidelines
- No dedicated automated test suite is currently checked in.
- Minimum for each change: run `npm run lint`, validate affected frontend page(s), and hit changed backend endpoints (for example `GET /api/health`).
- When adding tests, prefer `frontend/__tests__/*.test.tsx` and `backend/tests/test_*.py` naming.

## Commit & Pull Request Guidelines
- Git history is not available in this workspace snapshot, so follow Conventional Commit style going forward: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Keep commits focused by layer (frontend, backend, database) and reference touched paths in the message body.
- PRs should include: purpose, key changes, local verification steps, related issue/task, and screenshots for UI updates.

## Security & Configuration Tips
- Never commit secrets. Use `backend/.env` and `frontend/.env.local` from provided examples.
- Ensure local `.env` values align with README expectations before running chat or Power BI integrations.
