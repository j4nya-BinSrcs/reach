# REACH — Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| Product | REACH — Research Exploration, Aggregation & Context Hub |
| Version | 0.1.0 |
| Status | Implemented prototype (local / single-user) |
| Primary surfaces | Web SPA (`apps/client`) · FastAPI server (`server`) |
| Related docs | [CRM.md](CRM.md) · [SRS.md](SRS.md) · [architecture.md](architecture.md) · [limitations.md](limitations.md) |

## 1. Vision

Turn a **research objective** into the knowledge needed to understand it —
not a ranked list of links, but a bounded, provenance-backed research
workspace: planned queries, selected sources, grounded analyses, cross-source
findings, open questions, and a markdown research report.

Search engines return sources. REACH organizes the investigation around the
objective.

## 2. Problem statement

Researchers, engineers, and technical founders routinely face objectives
such as:

> “I want to build a privacy-focused search engine using Rust. Find relevant
> research papers, existing search projects, indexing libraries, documentation,
> and technologies.”

Traditional search leaves the hard work to the human: judge relevance, read
dozens of pages, connect ideas across sources, and manually track what
supports what. Generic chat assistants often invent citations or collapse
nuance. Neither tool produces a **traceable research brief** tied to real
URLs with structured analysis.

## 3. Goals

### 3.1 Primary goals

| ID | Goal | How REACH addresses it |
| --- | --- | --- |
| G1 | Objective-centric research | Planner decomposes the objective into dimension-covering queries |
| G2 | High-signal source set | Deterministic filter/rank selects 8–15 sources before LLM analysis |
| G3 | Grounded understanding | Per-source analysis is schema-validated and content-bounded |
| G4 | Provenance | Findings carry supporting source ids; UI links to originals |
| G5 | Actionable output | Synthesis + open questions + intent-aware markdown report |
| G6 | Operable without infra tax | In-process asyncio, SQLite, no Redis/Celery/vector DB |
| G7 | Demo/CI without keys | Full pipeline runs in `REACH_MOCK_MODE=mock` |

### 3.2 Non-goals (current release)

- Multi-user accounts, auth, or collaboration
- Permanent research corpus or cross-session knowledge graph
- Exhaustive / unbounded crawling
- Real-time WebSocket streaming of token-level LLM output
- Guaranteed PDF or JavaScript-rendered page extraction
- Enterprise SSO, RBAC, or audit logging

See [limitations.md](limitations.md) for the full bound set.

## 4. Target users

| Persona | Need | REACH value |
| --- | --- | --- |
| Builder / founder | Map a build objective to papers, repos, docs, tools | Build-intent report, technologies, architecture hints |
| Student / researcher | Survey a topic with academic bias | Academic query guarantee + paper ranking boost |
| Engineer evaluating tech | Compare approaches across sources | Pairwise comparison (similarities / differences / contradictions) |
| Demo / reviewer | Exercise the product without API spend | Mock mode + `scripts/launch.sh` smoke path |

## 5. Product principles

1. **Bounded by design** — ≤7 queries, 8–15 selected sources, single fetch/analyze pass.
2. **Deterministic first** — classify, dedupe, and rank before spending LLM tokens.
3. **Typed structured output** — free-form LLM text is never persisted as the source of truth.
4. **Failure isolation** — one bad source never kills a session; stages degrade with fallbacks.
5. **No provenance hiding** — findings and reports remain attached to real sources.
6. **Local & ephemeral** — sessions are lightweight SQLite rows, not a cloud knowledge base.

## 6. Features (v0.1)

### 6.1 Core research run

1. User submits a research objective (8–1000 characters).
2. Backend creates a session and runs the pipeline asynchronously.
3. Client polls progress until `complete` or `failed`.
4. Workspace shows queries, ranked sources with analyses, findings, gaps,
   synthesis summary, and markdown report.

### 6.2 Post-run intelligence

- **Research report** — intent-detected (`build` / `study` / `general`) markdown briefing.
- **Pairwise source comparison** — similarities, differences, contradictions, complementarity.
- **On-demand source summarize** — regenerate a focused `SourceAnalysis` for one source.

### 6.3 Workspace curation

- Star / save sources.
- Tags and free-text notes.
- Workspace listing with optional filters (`starred`, `saved`, `tag`).

### 6.4 Session history

- `GET /api/research` returns lightweight session summaries (counts of sources,
  findings, gaps), filterable by status and in-progress exclusion.
- Home UI surfaces recent sessions for re-entry.

## 7. User experience outline

| Surface | Route | Job |
| --- | --- | --- |
| Home | `/` | Capture objective, show progress, recent history |
| Research session | `/research/:id` | Full workspace: summary, findings, sources, report, compare, curation |
| Workspace page | (component present; routing optional) | Browse starred/saved/tagged sources for a session |

Progress is poll-based (default UI interval 2s); no WebSockets.

## 8. Success metrics

| Metric | Target (prototype) | Measurement |
| --- | --- | --- |
| Hermetic test pass | 100% of suite green | `make test` / pytest (~156 tests) |
| End-to-end smoke | Launch script completes contract | `./scripts/launch.sh` |
| Run boundedness | ≤7 queries, ≤15 sources persisted | Service + agent invariants |
| Failure tolerance | Partial session retained on source errors | Fetcher/analyzer isolation tests |
| Mock completeness | Full pipeline without keys | Mock LLM + mock search + mock fetch |
| Provenance integrity | Findings link to existing source ids | Synthesizer mapping + API detail payload |

Qualitative success: a user can state an objective and, within one run, leave
with a brief they can defend using linked sources.

## 9. Constraints & assumptions

| Constraint | Implication |
| --- | --- |
| Live LLM + search keys required for real research | Mock mode for everything else |
| HTML/plain-text fetch only | JS-heavy and many PDF URLs yield thin/partial content |
| Single process concurrency cap (`MAX_CONCURRENT_RUNS = 16`) | Excess starts → HTTP 429 |
| SQLite local file | No multi-instance shared write without ops redesign |
| OpenAI-compatible + Tavily defaults | Providers are abstracted and swappable |

## 10. Dependencies

| Dependency | Role |
| --- | --- |
| OpenAI-compatible chat API | Planning, analysis, synthesis, comparison, report |
| Tavily (default search) | Web discovery per planned query |
| External source hosts | Fetched content for analysis |
| Browser (modern) | React 19 SPA |

## 11. Milestones (implemented)

| Milestone | Outcome |
| --- | --- |
| Core pipeline | Plan → search → filter → fetch → analyze → synthesize |
| Trusted sources | Academic/domain prioritization in ranking |
| Source comparison | Pairwise compare API + UI |
| Research report | Intent-based markdown report |
| Workspace | Star/save/tag/note + summarize |
| Session history | List endpoint + Home history UI |
| Monorepo ops | Makefile, `dev.sh`, `launch.sh` product smoke |

## 12. Future scope (not committed)

Cross-session history/knowledge graph, embeddings for semantic recall,
scheduled re-runs, multi-user auth, richer PDF/JS fetch, contradiction
detection beyond pairwise compare, and benchmark comparison suites —
designed to layer on without rewriting the pipeline core.

## 13. Open product questions

- Should workspace browsing become a first-class routed page in the SPA?
- Retention / TTL policy for local SQLite sessions?
- Should concurrent-run limits be configurable per deployment?
- Export formats beyond markdown (PDF, BibTeX)?

## 14. Document ownership

Product intent lives in this PRD and [CRM.md](CRM.md). Normative
requirements for build/test live in [SRS.md](SRS.md). Implementation truth
lives in code; when docs and code diverge, update docs in the same change
set as the behavior change.
