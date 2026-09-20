# REACH — Architecture

> Research Exploration, Aggregation & Context Hub

REACH turns a research objective into a focused research workspace. Search
engines return sources; REACH organizes the investigation around the
objective.

## System overview

```mermaid
flowchart LR
    Client[React SPA] -->|POST /api/research| API[FastAPI]
    API --> Service[Research Service]
    Service --> Planner[Planner]
    Service --> Researcher[Researcher]
    Researcher --> Search[Search Provider]
    Researcher --> Fetcher[Source Fetcher]
    Researcher --> Analyzer[Source Analyzer]
    Service --> Synthesizer[Synthesizer]
    Planner --> LLM[LLM Provider]
    Analyzer --> LLM
    Synthesizer --> LLM
    Service --> DB[(SQLite)]
    Fetcher --> Web[External web]
    Search --> Web
```

## Layers (backend)

### API layer — `app/api/routes/research.py`

Endpoints under `/api/research/{id}/…`:

- `POST /api/research` — validate the objective, create a session row, and
  dispatch an in-process `asyncio` research task. Returns `session_id`.
- `GET /api/research/{id}/status` — poll persisted progress
  (`status`, `progress` 0–100, `message`).
- `GET /api/research/{id}` — assemble the full workspace payload
  (queries, sources, findings, gaps, summary, report).
- `GET /api/research/{id}/report` — the full markdown research report as
  plain text.
- `POST /api/research/{id}/compare` — pairwise comparison of two sources
  (similarities, differences, contradictions), persisted per session.
- `GET /api/research/{id}/comparisons` — past comparisons for the session.
- `GET /api/research/{id}/workspace` — list sources, filterable by
  `?starred=` / `?saved=`.
- `PATCH /api/research/{id}/sources/{source_id}` — star/save/tag/note a
  source in the workspace.
- `POST /api/research/{id}/sources/{source_id}/summarize` — regenerate an
  on-demand focused summary for a single source.

No WebSockets: research progress is persisted to SQLite and the client
polls, which is trivial and robust.

### Research service — `app/services/research_service.py`

The orchestrator. Owns the repositories and the in-flight task registry,
runs the deterministic pipeline, and persists each stage before moving on
so an interrupted run still shows partial state:

```
PLANNING → SEARCHING → FILTERING → FETCHING → ANALYZING → SYNTHESIZING → REPORT → COMPLETE
```

Any uncaught failure marks the session `failed` with a human message; the
rest of a partially-completed session remains available.

### Research agent — `app/agent/`

- **Planner** (`planner.py`): one LLM structured call produces a `QueryPlan`
  (5–7 queries). Queries are deduplicated, bounded, and labelled with
  research dimensions (core concept, implementations, academic, technical,
  tools, benchmarks, limitations). A deterministic fallback keeps the run
  alive if the LLM fails.
- **Researcher** (`researcher.py`): discovery + selection + fetch + analyze
  orchestration. Searches are run concurrently per query; raw results are
  normalized and deduplicated; candidates are ranked by provider score,
  source-type quality, domain quality, and lexical overlap with the
  objective; the top 8–15 are selected. Fetches and analyses run under a
  bounded semaphore, and each item's failure is isolated.
- **Synthesizer** (`synthesizer.py`): aggregates the analyzed sources into
  a typed brief (`SynthesisResult`), maps each finding's supporting source
  titles back to source ids for provenance, and produces open questions and
  the research summary. A fallback view keeps sessions complete if the
  model call fails.
- **Comparator** (`comparator.py`): pairwise comparison of two analyzed
  sources into a typed `SourceComparison` (similarities, differences,
  contradictions), persisted per session via the comparison repository.
- **Report writer** (`report_writer.py`): assembles the post-synthesis
  markdown research report (objective, landscape, key sources, findings,
  open questions, recommendations) via one structured LLM call to
  `app/models/report.py`; a deterministic fallback section builder keeps
  the report available even if the model call fails.

### Comparison & workspace layer — `app/services/research_service.py`

- `compare_sources` — runs the comparator for a session/source pair and
  persists the result; `get_comparisons` returns history.
- `get_workspace_sources` — returns session sources filtered by the
  `starred`/`saved` flags.
- `update_source_workspace` — patch `starred`/`saved`/`note`/`tags` on a
  source.
- `summarize_source` — regenerates a focused summary for one source via the
  source analyzer.

### Search layer — `app/search/`

- `base.py` — `SearchProvider` interface (`search(query, limit) → SearchResult`).
- `provider.py` — `TavilySearchProvider` (default) and `MockSearchProvider`
  (keyless, deterministic, for demo/CI). A factory builds either based on
  `REACH_MOCK_MODE`.
- `utils.py` — URL normalization (host lowercasing, fragment/tracking-param
  removal, trailing-slash handling), domain extraction, and
  deduplication by canonical URL and title.

Provider-native shapes are normalized into `SearchResult` early so the rest
of the pipeline never depends on provider specifics.

### Source processing — `app/sources/`

- `classifier.py` — deterministic source-type classification
  (paper / github / documentation / tool / project / article / other) from
  domain and path heuristics; title heuristics cover ambiguous cases. No LLM
  tokens spent where deterministic logic suffices.
- `fetcher.py` — bounded HTTP fetching: size cap, timeout, http(s)-only
  scheme gating, redirect following, and a session-local cache. Handles
  HTTP errors, timeouts, oversized bodies, and empty pages.
- `parser.py` — strips scripts/styles and reduces pages to normalized plain
  text plus a title/description. Fetched content is treated as untrusted
  input; raw HTML is never stored or rendered.
- `analyzer.py` — per-source `SourceAnalysis` grounded in the fetched
  content (summary, key points, technologies, concepts, why_relevant,
  limitations), generated via one structured LLM call.

### LLM layer — `app/llm/`

- `base.py` — `LLMProvider` interface with `generate` and
  `generate_structured`. The base class appends the Pydantic JSON schema to
  the system prompt, extracts the JSON object, validates it, and retries
  once before raising `StructuredOutputError`.
- `provider.py` — `OpenAICompatibleProvider` (any OpenAI-style chat
  completions endpoint) and `MockLLMProvider` (schema-driven deterministic
  data for keyless runs).
- `prompts.py` — all prompt text and `(system, user)` builders are
  centralized here: planner, relevance, source analysis, synthesis,
  comparison (`COMPARISON_SYSTEM`), and report (`REPORT_SYSTEM`).

### Models — `app/models/`

Typed Pydantic schemas for everything the pipeline persists:

- `research.py` — `ResearchSession`, `ProgressUpdate`, `StartResearchRequest`,
  `QueryPlan`, `SessionStatus`.
- `source.py` — `Source`, `SourceAnalysis`, `SourceType`, `SourceFetchStatus`;
  workspace fields `starred`, `saved`, `note`, `tags`.
- `finding.py` — `Finding`, `ResearchGap`, `ResearchSynthesis`,
  `SynthesisResult`, `KeyFinding`, `OpenQuestion`.
- `comparison.py` — `SourceComparison`, `ComparisonPoint`,
  `ComparisonResult`.
- `report.py` — `ReportIntent`, `ResearchReportContent`, `ResearchReport`.

### Storage — `app/storage/`

SQLite via stdlib `sqlite3`. Tables: `research_sessions`, `queries`,
`sources`, `findings`, `finding_sources` (provenance joins),
`research_gaps`, and `source_comparisons`. Schema updates are applied
incrementally through a `_MIGRATIONS` registry (column additions such as
`report` on sessions and the workspace fields on `sources`) so existing
databases upgrade in place. Repositories are small focused classes
(`SessionRepository`, `SourceRepository`, `FindingRepository`,
`ComparisonRepository`) with short-lived connections — no generic
repository abstraction, no ORM.

## Data flow (per research run)

```
objective
  ↓ planner            queries (5–7)                        → queries table
  ↓ search           normalized SearchResults
  ↓ dedupe/filter    candidate Sources
  ↓ rank/select      8–15 sources                           → sources table
  ↓ fetch            bounded content per source (failures tolerated)
  ↓ analyze          SourceAnalysis per source              → sources.analysis
  ↓ synthesize       findings + source links (provenance)   → findings / finding_sources
  ↓                  open questions                         → research_gaps
  ↓                  research brief                          → sessions.synthesis
  ↓ report           markdown research report                → sessions.report
  ↓ complete
```

On-demand (post-run) flows operate on a completed session: pairwise
`compare` persists to `source_comparisons`, and workspace operations
(`GET /workspace`, `PATCH /sources/{id}`, `POST /sources/{id}/summarize`)
read/update the `sources` table.

## Frontend — `apps/web/`

React 19 + Vite + TypeScript + TanStack Query. The SPA has two routes:

- **Home** — research objective entry, example prompts, and a progress
  panel that polls `GET /api/research/{id}/status` through the lifetime of
  a run; on completion it links to the session page.
- **ResearchSession** — renders a completed run: summary
  (`synthesis`), full findings, ranked source cards, the generated markdown
  report, pairwise source comparison (select any two sources → compare →
  results), and workspace actions on each source (star, save, tag, note,
  on-demand summarize).

A normalization layer in `apps/web/src/lib/api.ts` converts the backend
wire format into typed view contracts (score ranges, `source_type`→`type`,
gap `question/rationale`→`title/description`, provenance ids, etc.) so the
UI is insulated from API shape drift. `vite.config.ts` proxies `/api` →
`localhost:8000` in development.

## Design rules honored

- Bounded research: ≤7 queries, ≤15 sources, single fetch+analyze pass.
- Deterministic logic before LLM calls (classification, dedup, overlap).
- Typed structured output everywhere; free-form text never persisted.
- One failed source never kills a session.
- No provenance hiding: findings carry the source ids that support them.
- Reports and comparisons degrade gracefully to deterministic fallbacks.
- No heavyweight infrastructure: no Redis/Celery/Kafka/vector DB.

## Future direction

Sessions are intentionally ephemeral. A later milestone can layer:
cross-session research history, a persistent knowledge graph built from
`finding_sources`, embeddings for semantic recall, and scheduled or
re-queryable research loops — without rewriting the pipeline core.