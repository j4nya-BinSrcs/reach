# REACH — Development Guide

Setup, environment, and workflow for working on the REACH backend.

## Prerequisites

- Python 3.11+ (developed against 3.14)
- pip
- (optional) API keys for real research: an LLM key and a Tavily key

## Setup

```bash
# 1. Create and activate the virtualenv
cd backend
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt          # runtime
pip install -r requirements-dev.txt      # tests
```

## Environment

Copy the template and fill in real values:

```bash
cp .env.example .env
```

`REACH_*` variables are documented in
[`backend/.env.example`](../backend/.env.example) and
[`backend/README.md`](../backend/README.md). Real keys must never be
committed.

## Running the backend

```bash
cd backend
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --reload --port 8000
```

- Mock mode runs the whole pipeline without keys (deterministic mock LLM,
  mock search, and a mock fetch transport).
- With real keys set, drop `REACH_MOCK_MODE` and run normally.

Available routes:

- `GET /api/health`
- `POST /api/research` → `{"session_id": "..."}`
- `GET /api/research/{id}/status`
- `GET /api/research/{id}`
- Interactive docs: `http://localhost:8000/docs`

The provided launcher (`../scripts/dev.sh backend`) automates venv setup and
the uvicorn command.

## Trying it end-to-end (no keys)

```bash
cd backend
REACH_MOCK_MODE=mock .venv/bin/uvicorn app.main:app --port 8000 &
SID=$(curl -s -X POST localhost:8000/api/research \
  -H 'Content-Type: application/json' \
  -d '{"objective":"I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, documentation, and technologies."}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["session_id"])')

until [ "$(curl -s localhost:8000/api/research/$SID/status | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')" = "complete" ]; do sleep 0.3; done

curl -s localhost:8000/api/research/$SID | python3 -m json.tool | head -60
```

## Development workflow

1. Work on a feature branch: `git checkout -b feat/<name>`.
2. Implement the smallest complete piece.
3. Run the checks (below).
4. Commit, then merge with `--no-ff` after the feature works.

### Running the tests

```bash
cd backend
.venv/bin/python -m pytest -q
```

The suite covers model validation, storage, search normalization/dedup,
source classification/parsing/fetching, the LLM layer, planner, researcher,
synthesizer, the research service, and the full API workflow (all hermetic —
no network or keys required).

### Test layout

```
backend/tests/
├── test_models.py           Pydantic schema validation
├── test_storage.py          SQLite schema + repository round-trips
├── test_search.py           URL normalization, dedup, mock provider
├── test_sources.py          classifier, parser, bounded fetcher
├── test_llm.py              JSON parsing, retries, mock LLM
├── test_planner.py          query generation + fallback
├── test_agent.py            selection, discovery, fetch/analyze
├── test_synthesizer.py      provenance mapping + fallback
├── test_research_service.py service pipeline + failure paths
└── test_api.py              full API workflow (mock mode)
```

## Known limitations

- Real research requires live API keys; everything else (CI, demo,
  frontend work) can run in `REACH_MOCK_MODE=mock`.
- Fetching supports HTML/plain text; JavaScript-heavy pages and many PDFs
  yield thin content. Sessions degrade gracefully and surface the failure
  per source.
- The prototype persists only session-local data in SQLite; there is no
  permanent corpus, vector index, or multi-user system.
- Research is bounded by design: ≤7 queries, ≤15 sources, one analysis
  pass. This keeps runs responsive and API costs small, not exhaustive.

## Perf considerations

- Providers and fetchers are created per research run and closed/scoped in
  the run task; the session-local fetch cache prevents duplicate fetches.
- All LLM inputs are truncated to a bounded content budget before calls.
- Fetches and analyses run concurrently under a small semaphore.