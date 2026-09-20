# REACH

**Research Exploration, Aggregation & Context Hub**

> Turn a research objective into the knowledge needed to understand it.

REACH is an on-demand research intelligence web application. Instead of a
plain factual question, the user provides a **research objective** — REACH
plans the investigation, searches external sources, filters and analyzes the
strongest material, synthesizes cross-source findings, and surfaces the open
questions — then presents everything in a research workspace with direct
links back to the original sources.

Search engines return sources. REACH organizes the investigation around the
objective.

## Problem

Traditional search gives you a ranked list of links and leaves the research
to you: read dozens of pages, judge relevance yourself, connect ideas
across sources, and manually keep track of what supports what.

## Solution

REACH automates the research workflow around a single objective:

1. Understand the objective and decompose it into research dimensions.
2. Generate 5–7 targeted search queries.
3. Discover sources across papers, GitHub, documentation, tools, and more.
4. Filter, dedupe, and rank the candidates down to a small strong set.
5. Fetch and analyze each selected source (structured, grounded output).
6. Synthesize findings with source provenance and identify open questions.
7. Present a compact research workspace, everything traceable to originals.

## How it works

```
objective → planner → queries → search → filter → select (8–15)
         → fetch (bounded) → analyze (typed) → synthesize
         → findings + open questions + research brief → SQLite → workspace
```

Research is **on demand**: no permanent corpus, no vector database, no
infinite crawler. A run is bounded (≤7 queries, ≤15 sources) and sessions
are lightweight, temporary rows.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full design
(agents, search layer, source processing, LLM layer, storage, and data
flow), including a Mermaid diagram.

High-level layout:

```
reach/
├── apps/web/            React + Vite + TypeScript UI (implemented)
├── backend/             FastAPI + SQLite + agent pipeline (implemented)
├── docs/                architecture and development guides
├── data/                SQLite data directory (.gitignore)
├── scripts/             dev.sh (dev servers) · launch.sh (one-shot product test)
└── Makefile             setup / test / run convenience targets
```

## Tech stack

- **Backend:** Python · FastAPI · Pydantic v2 · httpx · BeautifulSoup4 ·
  SQLite · OpenAI-compatible LLM provider · Tavily search provider (both
  swappable)
- **Frontend:** React 19 · Vite · TypeScript · TanStack Query

## Features

- **Planner** turns an objective into dimension-covering queries.
- **Multi-source discovery** normalized from a single search provider.
- **Deterministic filtering** — dedupe, classify, and rank before any LLM
  analysis (deterministic logic first, LLM only where it adds value).
- **Bounded, failure-tolerant fetching** — a bad source never kills a session.
- **Typed structured output** — every LLM result is schema-validated with a
  bounded retry.
- **Source provenance** — findings reference the sources that support them.
- **Open questions** surfaced separately from established findings.
- **Research report** — a full markdown briefing generated from the run
  (objective, landscape, sources, findings, gaps, recommendations).
- **Pairwise source comparison** — similarities, differences, and
  contradictions between any two sources.
- **Workspace** — star/save sources, tag them, add notes, and summarize a
  single source on demand.
- **Progress API** — status is persisted and pollable end-to-end.
- **Mock mode** — the entire pipeline runs keylessly for demo and CI.

## Project structure

```
apps/web/
├── src/
│   ├── components/      common layout · research (input, progress,
│   │                    summary, sources, report, comparison)
│   ├── hooks/           TanStack Query hooks (session, sources)
│   ├── lib/             api client + normalization layer · constants · utils
│   ├── pages/           Home · ResearchSession
│   └── types/           research · source view contracts
└── vite.config.ts       /api → localhost:8000 dev proxy

backend/
├── app/
│   ├── agent/        planner · researcher · synthesizer · comparator · report writer
│   ├── api/routes/    research endpoints
│   ├── llm/          provider abstraction · providers · prompts
│   ├── search/        provider abstraction · Tavily/mock · URL utilities
│   ├── sources/       classifier · fetcher · parser · analyzer
│   ├── models/        Pydantic domain + schema models
│   ├── services/      research service orchestrator
│   ├── storage/        SQLite schema + repositories
│   ├── config.py       settings (REACH_* env)
│   └── main.py         app factory
├── tests/             151 tests, hermetic
└── README.md          backend README
```

## Local development

Everything is wired through the `Makefile` and `scripts/`:

```bash
make setup            # backend venv + web deps (once)
make dev              # backend (:8000) + web dev server (:5173) side by side
make test             # backend pytest + lint, then web lint + typecheck + build
```

Backend alone (see [backend/README.md](backend/README.md) and
[docs/development.md](docs/development.md) for details):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                       # add keys for real research
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --reload --port 8000
```

Or use the launcher: `./scripts/dev.sh backend`.

**One command tests the whole product** — the launch script boots the
backend (mock mode), builds and serves the web app, then smoke-tests the
complete API contract end to end (research run → report → comparison →
workspace → summarize):

```bash
./scripts/launch.sh                    # full stack + smoke test
REACH_BACKEND_ONLY=1 ./scripts/launch.sh   # backend API smoke test only
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/research` | Start research from an objective |
| `GET` | `/api/research/{id}/status` | Poll progress (planning → … → complete/failed) |
| `GET` | `/api/research/{id}` | Full workspace payload (queries, sources, findings, gaps, report) |
| `GET` | `/api/research/{id}/report` | Full markdown research report |
| `POST` | `/api/research/{id}/compare` | Compare two sources (similarities/differences/contradictions) |
| `GET` | `/api/research/{id}/comparisons` | Past comparisons for the session |
| `GET` | `/api/research/{id}/workspace` | Starred/saved sources (`?starred=` `?saved=`) |
| `PATCH` | `/api/research/{id}/sources/{sid}` | Star/save/tag/note a source |
| `POST` | `/api/research/{id}/sources/{sid}/summarize` | On-demand source summary |
| `GET` | `/api/health` | Health check |

## Environment variables

All secrets and options use the `REACH_` prefix and are listed in
[`backend/.env.example`](backend/.env.example). Real keys are never
committed.

## Example research session

With mock mode (no keys):

```bash
cd backend
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --port 8000
```

```http
POST /api/research
{"objective": "I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, documentation, and technologies."}
```

Poll `GET /api/research/{id}/status` until `complete`, then
`GET /api/research/{id}` returns the workspace: queries, ranked sources
with per-source analysis, findings with supporting source ids, open
questions, a research brief, and the full markdown report. From there you
can star/save sources (`PATCH /api/research/{id}/sources/{sid}`), summarize
one (`POST /api/research/{id}/sources/{sid}/summarize`), or compare two
(`POST /api/research/{id}/compare`).

Or run it all at once, GUI included, with `./scripts/launch.sh`.

## Limitations

- Real research requires live LLM and search API keys; mock mode is for
  demo/CI.
- HTML/plain-text fetching — JS-heavy pages and many PDFs degrade to thin
  or unavailable content (surfaced per source).
- Sessions are ephemeral and local; no cross-session knowledge graph,
  accounts, or collaboration.
- A single bounded pass (≤7 queries, ≤15 sources) by design.
- The web UI currently surfaces a session in depth (frontend polish for
  cross-session history, dedicated workspace browsing, and the summarize
  modal remain).

## Future scope

Cross-session research history, a persistent knowledge graph from
findings/sources, embeddings for semantic recall across sessions, scheduled
and re-queryable research loops, contradiction detection, and benchmark
comparison — none of which require rewriting the pipeline core.

## License

See [LICENSE](LICENSE).