# REACH backend

Research Exploration, Aggregation & Context Hub — backend API.

Turns a research objective into a focused research workspace: generated
queries, discovered and analyzed sources, cross-source findings, and open
questions, all traceable back to their original sources.

## Stack

- Python / FastAPI
- Pydantic v2 (typed schemas + validated LLM output)
- SQLite (lightweight, per-session persistence)
- httpx + BeautifulSoup4 (bounded source fetching/parsing)
- OpenAI-compatible LLM provider + Tavily search provider (both swappable)

## Quick start

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env      # add real keys
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Mock mode runs the entire pipeline without any API keys:

```bash
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --port 8000
```

## Configuration

All configuration lives in [`app/config.py`](app/config.py) and is loaded
from environment variables with the `REACH_` prefix (see
[`.env.example`](.env.example)). Never commit real keys.

| Variable | Purpose |
| --- | --- |
| `REACH_LLM_API_KEY` | LLM provider key |
| `REACH_LLM_BASE_URL` | OpenAI-compatible base URL |
| `REACH_LLM_MODEL` | Model name |
| `REACH_SEARCH_API_KEY` | Search provider key (Tavily) |
| `REACH_SEARCH_PROVIDER` | `tavily` (default) |
| `REACH_SEARCH_RESULTS_PER_QUERY` | Results per generated query |
| `REACH_SEARCH_MAX_QUERIES` | Upper bound on generated queries |
| `REACH_MOCK_MODE` | `mock` runs keylessly for demo/testing |
| `REACH_DATABASE_PATH` | SQLite file path |
| `REACH_FETCH_MAX_BYTES` | Body size cap per fetched source |
| `REACH_FETCH_TIMEOUT_SECONDS` | Per-fetch timeout |
| `REACH_CORS_ORIGINS` | Comma-separated allowed frontend origins |

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/research` | Start a research session (`{"objective": "..."}`) → `{"session_id": "..."}` |
| `GET` | `/api/research/{session_id}/status` | Poll live status + progress (`planning → searching → filtering → fetching → analyzing → synthesizing → complete/failed`) |
| `GET` | `/api/research/{session_id}` | Full workspace payload (queries, sources, findings, gaps, summary) |
| `GET` | `/api/health` | Health check |

Interactive docs are available at `/docs`.

## How a research run works

```
objective
   → planner (LLM)          5–7 dimension-covering queries
   → search (provider)      bounded web results per query
   → filter/dedupe          normalize URLs, dedupe, drop junk
   → rank/select            8–15 strongest sources
   → fetch (bounded)        httpx + parse to plain text, failures tolerated
   → analyze (LLM)          typed SourceAnalysis per source
   → synthesize (LLM)       findings, open questions, research brief
   → persist                SQLite + mark complete
```

Runs are lightweight in-process `asyncio` tasks (no Celery/Redis/workers);
progress is persisted so clients poll it.

## Testing

```bash
.venv/bin/python -m pytest -q
```

The suite (114 tests) covers model validation, storage, URL normalization,
deduplication, source classification, parsing, bounded fetching, the LLM
layer's retry/validation behavior, the planner, researcher, synthesizer,
and full API workflow in mock mode.

## Project layout

```
backend/
├── app/
│   ├── agent/       planner, researcher, synthesizer
│   ├── api/routes/  research endpoints
│   ├── llm/         provider abstraction, providers, centralized prompts
│   ├── search/      provider abstraction, Tavily/mock, URL utilities
│   ├── sources/     classifier, fetcher, parser, analyzer
│   ├── models/      Pydantic domain + schema models
│   ├── services/    research service (pipeline orchestrator)
│   ├── storage/     SQLite schema + repositories
│   ├── config.py    settings (REACH_* env)
│   └── main.py      application factory
├── tests/           114 pytest tests
├── requirements.txt / requirements-dev.txt
└── .env.example
```

## Known limitations

- External search/LLM APIs are required for real research (mock mode is
  for demo/CI).
- Fetching is HTML/plain-text only; JavaScript-heavy pages and many PDFs
  yield thin or unavailable content (the session degrades gracefully).
- Sessions are ephemeral local SQLite rows — no cross-session knowledge
  graph or team collaboration.
- One research run at a time per source budget; bounded to 8–15 sources.