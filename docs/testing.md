# REACH — Testing

Test strategy for the REACH monorepo: hermetic backend unit/integration
tests, web lint/typecheck/build, and the product smoke path in
`scripts/launch.sh`.

Related: [development.md](development.md) · [api.md](api.md) · [agent.md](agent.md).

## 1. Goals

| Goal | Approach |
| --- | --- |
| No keys / no flaky network in CI | `REACH_MOCK_MODE=mock` + mock LLM/search/fetch |
| Contract confidence | API workflow tests + launch smoke script |
| Agent correctness | Success path + deterministic fallback path per agent |
| Storage integrity | Repository round-trips, provenance joins, migrations |
| Frontend safety | oxlint + `tsc -b` + production Vite build |

## 2. How to run

```bash
# Everything
make test

# Backend only
cd server
.venv/bin/python -m pytest -q
.venv/bin/python -m pyflakes app/ tests/

# Web only
cd apps/client
npm run lint
npm run build

# Product smoke (boots servers)
./scripts/launch.sh
REACH_SERVER_ONLY=1 ./scripts/launch.sh
```

Pytest discovers tests under `server/tests/`. Prefer `-q` for concise CI
output; use `-k <expr>` for focused runs while developing.

## 3. Backend suite layout

Approximate coverage (~156 tests; count may drift — trust `pytest --collect-only`):

| File | Focus |
| --- | --- |
| `test_models.py` | Objective validation, progress/relevance bounds, enums |
| `test_storage.py` | Schema, repositories, provenance, comparisons, workspace fields |
| `test_search.py` | URL normalization, dedupe, mock provider |
| `test_sources.py` | Classifier (incl. academic domains), parser, bounded fetcher |
| `test_llm.py` | JSON extraction, structured retries, mock provider |
| `test_planner.py` | Query generation, bounds, academic guarantee, fallback |
| `test_agent.py` | Selection/ranking bounds, discovery, fetch/analyze isolation |
| `test_synthesizer.py` | Provenance title→id mapping, retry then raise on failure |
| `test_comparator.py` | Pairwise comparison success + fallback |
| `test_report_writer.py` | Intent, markdown render, fallback report |
| `test_research_service.py` | Full pipeline, concurrency limit, failure marking |
| `test_api.py` | HTTP workflow: start → poll → detail → report → compare → workspace → history |

### Fixtures (`conftest.py`)

- Temporary SQLite path with `init_db`.
- Helpers for session ids / settings overrides.
- Tests inject `MockLLMProvider` / `MockSearchProvider` or set
  `Settings(mock_mode="mock")` for service/API layers.

### Hermetic rules

- Do not call live OpenAI/Tavily endpoints in the default suite.
- Do not depend on developer `.env` keys.
- Prefer in-process ASGI/httpx clients over real network sockets where possible.

## 4. What “good” looks like per layer

### Models

- Reject objectives shorter than 8 characters (including whitespace-only).
- Clamp/validate progress and relevance ranges.

### Search / sources

- Tracking params stripped; duplicate URLs/titles collapsed.
- Academic hosts classify as `paper`; github as `github`; docs hosts as
  `documentation`.
- Oversized / HTTP error fetches mark `partial` / `failed` without raising
  out of the researcher loop.

### Agents

- Planner respects max queries and academic guarantee.
- Selector keeps scores in 0–1 and respects min/max selection policy.
- Synthesizer maps titles to real source ids when possible.
- Comparator/report always return typed objects even when LLM fails.

### Service / API

- Status progresses through expected stages to `complete`.
- Detail payload includes queries, sources, findings, gaps, report.
- History endpoint returns counts and honors `status` /
  `exclude_in_progress` / `limit`.
- Workspace PATCH + tag filter behave as documented.
- Excess concurrent starts → 429.

## 5. Web checks

| Command | Verifies |
| --- | --- |
| `npm run lint` | oxlint static issues |
| `npm run build` | TypeScript project build + Vite production bundle |

There is no separate Jest/Vitest suite in v0.1; UI behavior is covered
indirectly via API contract stability and manual/smoke verification.

## 6. Product smoke (`scripts/launch.sh`)

The launcher:

1. Ensures backend venv/deps.
2. Wipes `data/reach.db*` for a clean run.
3. Starts uvicorn with `REACH_MOCK_MODE=mock`.
4. Optionally builds and previews the web app (skip with
   `REACH_SERVER_ONLY=1`).
5. Exercises the API contract end-to-end:
   - health
   - reject short objective
   - start research → wait `complete`
   - validate detail payload shape
   - workspace star / tag filter
   - summarize
   - compare

Use this before demos and after cross-cutting API changes.

## 7. Recommended checks before merge

- [ ] `make test` green
- [ ] New LLM/agent path has success **and** fallback tests
- [ ] Schema changes include storage tests + `_MIGRATIONS` if needed
- [ ] API shape changes update [api.md](api.md) and web normalizer if required
- [ ] Docs updated when behavior changes
- [ ] `./scripts/launch.sh` (or backend-only) when touching orchestration/API

## 8. Writing new tests

1. Keep tests hermetic (mocks / temp DB).
2. Name tests after behavior, not implementation trivia.
3. Assert user-visible contracts (status codes, persisted fields, provenance).
4. Prefer one logical behavior per test for failure clarity.
5. Avoid sleeping on real wall clocks when a direct await/poll of in-memory
   state suffices; when polling is required, bound iterations.

## 9. Gaps / future test investments

- Dedicated frontend component or Playwright e2e suite.
- Load testing around concurrent runs and fetch semaphore.
- Contract tests generated from OpenAPI for the web client.
- Property-based tests for URL normalization and ranking monotonicity.

See [limitations.md](limitations.md) for product bounds that tests should
enforce rather than “fix around.”
