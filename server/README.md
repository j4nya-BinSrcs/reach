# REACH server

Research Exploration, Aggregation & Context Hub — backend API.

Turns a research objective into a focused research workspace: generated
queries, discovered and analyzed sources, cross-source findings, and open
questions, all traceable back to their original sources.

## Stack

- Python / FastAPI
- Pydantic v2 (typed schemas + validated LLM output)
- SQLite (lightweight, per-session persistence)
- httpx + BeautifulSoup4 (bounded source fetching/parsing)
- LLM provider (OpenAI-compatible live, with keyless extractive fallback) +
  search provider (Tavily, or the keyless web aggregator) — all swappable

## Quick start

```bash
cd server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env      # add real keys (optional)
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Research is always real — there is no mock mode. With no keys at all, the
keyless providers handle the run: the web search provider pulls live results
from public endpoints (DuckDuckGo, Wikipedia, arXiv, Crossref, GitHub,
StackExchange, Hacker News, Reddit) and the extractive provider analyzes the
actual fetched content. With API keys set, the OpenAI-compatible LLM and
Tavily search providers run live, and the resilient LLM layer falls back to
content-grounded extraction if the live model is rate-limited or fails.

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
| `REACH_DATABASE_PATH` | SQLite file path |
| `REACH_FETCH_MAX_BYTES` | Body size cap per fetched source |
| `REACH_FETCH_TIMEOUT_SECONDS` | Per-fetch timeout |
| `REACH_CORS_ORIGINS` | Comma-separated allowed frontend origins |

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/research` | Start a research session (`{"objective": "..."}`) → `{"session_id": "..."}` |
| `GET` | `/api/research/{session_id}/status` | Poll live status + progress (`planning → … → synthesizing → report → complete/failed`) |
| `GET` | `/api/research/{session_id}` | Full workspace payload (queries, sources, findings, gaps, summary, report) |
| `GET` | `/api/research/{session_id}/report` | The generated markdown research report |
| `POST` | `/api/research/{session_id}/compare` | Compare two sources → similarities / differences / contradictions |
| `GET` | `/api/research/{session_id}/comparisons` | Comparisons generated for this session |
| `GET` | `/api/research/{session_id}/workspace` | Sources, filterable by `?starred=` / `?saved=` |
| `PATCH` | `/api/research/{session_id}/sources/{source_id}` | Star/save/tag/note a source |
| `POST` | `/api/research/{session_id}/sources/{source_id}/summarize` | On-demand focused source summary |
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
   → report (LLM)           full markdown research report (with fallback)
   → persist                SQLite + mark complete
```

Runs are lightweight in-process `asyncio` tasks (no Celery/Redis/workers);
progress is persisted so clients poll it. Comparisons and workspace
operations run on demand against the completed session.

## Testing

```bash
.venv/bin/python -m pytest -q
```

The suite covers model validation, storage, URL normalization,
deduplication, source classification, parsing, bounded fetching, the LLM
layer's retry/validation/resilience behavior, the planner, researcher,
synthesizer, comparator, report writer, workspace operations, and the full
API workflow — hermetic via keyless extractive providers and scripted test
doubles, never against paid APIs.

## Project layout

```
server/
├── app/
│   ├── agent/       planner, researcher, synthesizer, comparator, report writer
│   ├── api/routes/  research endpoints
│   ├── llm/         provider abstraction, providers, centralized prompts
│   ├── search/      provider abstraction, keyless web + Tavily, URL utilities
│   ├── sources/     classifier, fetcher, parser, analyzer, extractor
│   ├── models/      Pydantic domain + schema models
│   ├── services/    research service (pipeline + workspace operations)
│   ├── storage/     SQLite schema (+migrations) + repositories
│   ├── config.py    settings (REACH_* env)
│   └── main.py      application factory
├── tests/            pytest tests
├── requirements.txt / requirements-dev.txt
└── .env.example
```

## Known limitations

- Real LLM analysis needs an API key; keyless search + extractive analysis
  still produce real, source-grounded research without any keys.
- Fetching is HTML/plain-text only; JavaScript-heavy pages and many PDFs
  yield thin or unavailable content (the session degrades gracefully).
- Sessions are ephemeral local SQLite rows — no cross-session knowledge
  graph or team collaboration.
- One research run at a time per source budget; bounded to 8–15 sources.