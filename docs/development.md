# REACH — Development guide

Setup, environment, and day-to-day workflow for the REACH monorepo
(backend + web). For product smoke testing, prefer
[`scripts/launch.sh`](../scripts/launch.sh). Architecture context:
[architecture.md](architecture.md). Testing strategy: [testing.md](testing.md).

## Prerequisites

| Tool | Notes |
| --- | --- |
| Python 3.11+ | Developed against 3.14 |
| Node 20+ / npm | Web app |
| Optional API keys | LLM (OpenAI-compatible) + Tavily for real research |

## Quick start (Makefile)

```bash
make setup            # backend venv + web deps (once)
make dev              # backend (:8000) + web (:5173)
make test             # backend pytest + lint, web lint + build
make full             # mock backend + web + API smoke contract
make clean            # remove venv, node_modules, dist, local DBs
```

Or use the scripts directly:

```bash
./scripts/dev.sh server
./scripts/dev.sh client
./scripts/launch.sh                 # full product smoke
REACH_SERVER_ONLY=1 ./scripts/launch.sh
```

## Manual setup

```bash
# Backend
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                # add keys for real research

# Web
cd ../apps/client && npm install
```

## Environment

All configuration uses the `REACH_` prefix. Copy
[`server/.env.example`](../server/.env.example) → `server/.env`.
**Never commit real keys.**

| Variable | Purpose | Default / notes |
| --- | --- | --- |
| `REACH_LLM_API_KEY` | LLM provider key | empty |
| `REACH_LLM_BASE_URL` | OpenAI-compatible base URL | `https://api.openai.com/v1` |
| `REACH_LLM_MODEL` | Model name | `gpt-4o-mini` |
| `REACH_SEARCH_API_KEY` | Tavily (or configured) key | empty |
| `REACH_SEARCH_PROVIDER` | Search provider id | `tavily` |
| `REACH_SEARCH_RESULTS_PER_QUERY` | Results per planned query | `10` |
| `REACH_SEARCH_MAX_QUERIES` | Upper bound on queries | `7` |
| `REACH_MOCK_MODE` | `off` \| `mock` | `off` |
| `REACH_DATABASE_PATH` | SQLite path (rel. to server) | `../data/reach.db` |
| `REACH_FETCH_MAX_BYTES` | Fetch body cap | `300000` |
| `REACH_FETCH_TIMEOUT_SECONDS` | Per-fetch timeout | `15` |
| `REACH_CORS_ORIGINS` | Comma-separated origins | Vite localhost ports |

Settings load in `server/app/config.py` via pydantic-settings.

## Running the backend

```bash
cd server
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --reload --port 8000
```

- Mock mode: deterministic mock LLM + mock search + mock fetch transport.
- Real mode: set keys, leave `REACH_MOCK_MODE=off` (or unset).

Useful URLs:

- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`
- Health: `GET /api/health`

## Running the web app

```bash
cd apps/client
npm run dev          # http://localhost:5173 — proxies /api → :8000
npm run lint         # oxlint
npm run build        # tsc -b && vite build
npm run preview      # serve production bundle
```

Routes: `/` (Home), `/research/:id` (session workspace). See
[`apps/client/README.md`](../apps/client/README.md).

## End-to-end curl (mock)

```bash
cd server
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --port 8000 &

SID=$(curl -s -X POST localhost:8000/api/research \
  -H 'Content-Type: application/json' \
  -d '{"objective":"I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, documentation, and technologies."}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["session_id"])')

until [ "$(curl -s localhost:8000/api/research/$SID/status | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')" = "complete" ]; do sleep 0.3; done

curl -s localhost:8000/api/research/$SID | python3 -m json.tool | head -60
```

## Development workflow

1. Branch from current mainline: `git checkout -b feat/<name>` (or `docs/…`).
2. Implement the smallest complete vertical slice.
3. Run checks (`make test` or targeted pytest / npm scripts).
4. Update docs under `docs/` when behavior or contracts change.
5. Commit; merge with review as appropriate.

### Docs-only changes

Only modify files under `docs/` (and project READMEs when intentionally
updating operator-facing copy). Do not mix unrelated application changes into
documentation commits.

## Project map (where to edit)

| Concern | Location |
| --- | --- |
| HTTP routes | `server/app/api/routes/research.py` |
| Pipeline orchestration | `server/app/services/research_service.py` |
| Agents | `server/app/agent/` |
| Prompts | `server/app/llm/prompts.py` |
| Models | `server/app/models/` |
| SQLite | `server/app/storage/` |
| Web API client | `apps/client/src/lib/api.ts` |
| UI pages | `apps/client/src/pages/` |
| Research components | `apps/client/src/components/research/` |

## Code style expectations

- Prefer typed Pydantic / TypeScript contracts at boundaries.
- Deterministic logic before LLM calls.
- Every new LLM stage needs a deterministic fallback + tests.
- Keep research bounded (queries/sources/content caps).
- Do not introduce Redis/Celery/vector DB without an explicit product decision.

## Perf notes

- Providers/fetchers are created per run and scoped/closed with the task.
- Session-local fetch cache avoids duplicate GETs for the same URL.
- LLM inputs are truncated to content budgets before calls.
- Fetch/analyze concurrency is semaphore-limited (default 5).
- Concurrent research starts are capped (`MAX_CONCURRENT_RUNS = 16`).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| CORS errors from Vite | Origin not in `REACH_CORS_ORIGINS` | Add origin or use `/api` proxy |
| 429 on `POST /api/research` | Too many in-flight runs | Wait for completion or restart process |
| Empty/thin analyses | Fetch failed / JS-only page / PDF | Check `fetch_status`; expect degradation |
| Tests need network | Mock mode not set in fixture | Use `Settings(mock_mode="mock")` / providers |
| Stale DB schema | Old file missing columns | Restart app (`init_db` migrations) or `make clean` |

## Related docs

- [testing.md](testing.md) — suites and smoke tests  
- [deployment.md](deployment.md) — run modes and packaging  
- [api.md](api.md) — HTTP contract  
- [limitations.md](limitations.md) — known bounds  
