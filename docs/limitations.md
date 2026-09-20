# REACH — Limitations

Honest inventory of product, technical, and operational limits for REACH
v0.1. Use this when scoping demos, writing requirements, or deciding
whether a failure is a bug vs. an expected bound.

Related: [PRD.md](PRD.md) · [SRS.md](SRS.md) · [architecture.md](architecture.md)
· [deployment.md](deployment.md).

## 1. Product scope limits

| Limitation | Detail |
| --- | --- |
| Single-user local prototype | No accounts, auth, teams, sharing, or permissions |
| Ephemeral sessions | No cross-session knowledge graph or global corpus |
| One-shot research pass | No automatic multi-round deepening or scheduled re-query |
| Bounded discovery | ≤7 queries (configurable cap), 8–15 selected sources |
| English-centric UX | Copy and prompts assume English objectives |
| No export suite | Markdown report view/API only (no PDF/BibTeX/ZIP) |
| Collaboration | No comments, assignments, or multiplayer editing |

## 2. Research quality limits

| Limitation | Detail |
| --- | --- |
| Not exhaustive | Ranking selects a small strong set; relevant material may be omitted |
| Provider-dependent discovery | Results reflect Tavily (or mock) coverage and ranking |
| LLM fallibility | Analyses/synthesis/reports can miss nuance or mis-weight sources; schemas reduce format failures, not all factual errors |
| Provenance mapping | Title→id matching is fuzzy; rare mismatches possible |
| Academic boost ≠ peer review | Paper classification/domain boost does not validate claim quality |
| Contradiction coverage | Pairwise only; no global contradiction graph |

## 3. Fetch & content limits

| Limitation | Detail |
| --- | --- |
| HTML / plain text focus | JS-rendered SPAs often yield thin or empty text |
| PDFs | Many PDFs are not fully extracted; expect `partial` / weak analysis |
| Size & time caps | Default ~300 KB body, ~15s timeout; larger pages truncated |
| Robots / paywalls / soft-404s | May fetch unusable content; surfaced via fetch status / limitations |
| SSRF posture | Scheme allowlist + timeouts + size caps only — not a hardened SSRF gateway |
| Untrusted content | Parsed to text; never treat fetched HTML as safe to render |

## 4. Runtime & scale limits

| Limitation | Detail |
| --- | --- |
| In-process tasks | Research runs live inside the API process |
| Concurrent starts | Soft cap **16**; excess → HTTP 429 |
| Single worker assumed | Multi-worker uvicorn splits in-memory run state |
| SQLite | Local file; not ideal for multi-instance write sharing |
| No job queue | Process restart drops in-flight task objects (DB progress may stop mid-stage until marked failed/incomplete) |
| No rate limit beyond concurrency | Provider quotas still apply |

## 5. API & client limits

| Limitation | Detail |
| --- | --- |
| Polling only | No WebSocket/SSE token stream |
| No authn headers | Anyone who can reach the API can start/read sessions |
| Large payloads | Session detail may include source `content`; clients should handle size |
| History filters | Tag filter uses SQL `LIKE` on JSON text — prefer exact tag tokens |
| Workspace page routing | Workspace browsing component may exist without a first-class route |

## 6. Mock mode limits

| Limitation | Detail |
| --- | --- |
| Not real research | Deterministic templates; do not cite mock URLs as evidence |
| Demo-only fidelity | Useful for CI/UI; not a substitute for keyed evaluation |

## 7. Accessibility & i18n limits

See [accessibility.md](accessibility.md). Summary: no WCAG certification,
limited live-region announcements, no skip link, English-only, no RTL
validation.

## 8. Security & compliance limits

| Limitation | Detail |
| --- | --- |
| No tenant isolation | Shared local DB |
| Secrets in env files | Operator responsibility |
| No audit log | Actions are not attributed to users |
| Copyrighted third-party text | May be stored transiently in `sources.content` for analysis |
| No DPA / enterprise controls | Not offered in v0.1 |

## 9. Operational limits

| Limitation | Detail |
| --- | --- |
| Minimal observability | Logs + persisted progress; no metrics/tracing pack |
| Manual retention | No TTL job; disk grows with sessions/content |
| Launch script DB wipe | `launch.sh` deletes local `data/reach.db*` by design |
| Dependency on third parties | LLM and search outages degrade or fail real runs |

## 10. What graceful degradation looks like

These are **expected** behaviors, not defects:

- Planner LLM down → deterministic queries still run.
- One search query fails → other queries continue.
- One source fails fetch → session continues; card shows retrieval state.
- Analyzer/synthesizer/report/compare LLM fails → typed fallbacks; session can still complete.
- Objective &lt; 8 chars → 422, no session.
- Too many concurrent runs → 429.

## 11. Out of scope (explicit non-goals)

- Permanent crawled corpus or vector DB
- Autonomous agents with uncapped tool loops
- Guaranteed legal/medical/financial advice
- Replacing primary literature review by domain experts
- Multi-cloud HA SQLite

## 12. Future relief valves

Documented product directions that would address classes of limits (not
commitments): cross-session graph, embeddings recall, better PDF/JS fetch,
auth + multi-user, queued workers, richer export, a11y CI, scheduled
re-runs. See [PRD.md](PRD.md) § Future scope.

## 13. How to report a limitation vs a bug

| Treat as **limitation** | Treat as **bug** |
| --- | --- |
| Thin content on a JS-only marketing page | Crash / uncaught 500 on valid objective |
| Mock URLs in mock mode | Provenance ids pointing at missing sources on success path |
| Cap of 15 sources | Selector returning 50 sources |
| No login | Session data leaking across intended auth boundaries (N/A today) |

When in doubt, check whether an automated test in `server/tests` already
encodes the bound; if yes, changing it is a product decision, not a silent
fix.
