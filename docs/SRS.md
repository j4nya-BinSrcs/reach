# REACH — Software Requirements Specification (SRS)

| Field | Value |
| --- | --- |
| Document ID | REACH-SRS-001 |
| Title | Software Requirements Specification — REACH |
| Version | 0.1.0 |
| Status | Baseline (implemented system) |
| Reference model | IEEE 830 / ISO/IEC/IEEE 29148 style structure (adapted) |
| Companions | [CRM.md](CRM.md) · [PRD.md](PRD.md) · [api.md](api.md) · [limitations.md](limitations.md) |

## 1. Introduction

### 1.1 Purpose

This SRS specifies functional and non-functional requirements for REACH
v0.1 so that engineering and QA can verify behavior against an explicit
contract. Requirements marked **Implemented** describe current code.
Requirements marked **Target** are desired but not fully guaranteed.

### 1.2 Scope

REACH is an on-demand research intelligence application comprising:

- A FastAPI backend that plans, searches, filters, fetches, analyzes,
  synthesizes, reports, and persists research sessions in SQLite.
- A React SPA that submits objectives, polls progress, and presents a
  research workspace (sources, findings, gaps, report, comparison,
  curation, history).

Out of scope: multi-tenant SaaS, auth, permanent corpora, vector search,
unbounded crawling. See [limitations.md](limitations.md).

### 1.3 Definitions

See [CRM.md](CRM.md) § Domain glossary. Additional:

| Term | Definition |
| --- | --- |
| SHALL | Mandatory requirement |
| SHOULD | Recommended requirement |
| MAY | Optional requirement |
| FR | Functional requirement |
| NFR | Non-functional requirement |

### 1.4 References

- Repository code under `backend/` and `apps/web/`
- [architecture.md](architecture.md), [workflow.md](workflow.md),
  [agent.md](agent.md), [data-model.md](data-model.md), [testing.md](testing.md),
  [deployment.md](deployment.md), [accessibility.md](accessibility.md)
- `backend/.env.example`, `Makefile`, `scripts/launch.sh`

### 1.5 Overview

Section 2 summarizes the product. Section 3 lists specific requirements.
Section 4 covers verification. Section 5 lists open items.

---

## 2. Overall description

### 2.1 Product perspective

REACH is a monorepo product with a browser client and a local/single-node
API. External systems: LLM provider, search provider, arbitrary source
hosts. Persistence: SQLite file.

### 2.2 Product functions (summary)

1. Start and track research sessions from an objective.
2. Plan queries; discover/select/analyze sources.
3. Synthesize findings and gaps with provenance.
4. Generate an intent-aware markdown report.
5. Compare sources; curate workspace metadata; summarize on demand.
6. List session history; operate in mock mode without keys.

### 2.3 User characteristics

Technical users comfortable with research objectives and source evaluation.
Operators can manage env vars and local processes.

### 2.4 Constraints

- Python 3.11+, Node 20+ for development builds.
- Provider APIs required for non-mock research.
- Single-process asyncio research execution.
- MIT license.

### 2.5 Assumptions and dependencies

Assumptions in [CRM.md](CRM.md) §13–14. Dependencies: FastAPI, Pydantic v2,
httpx, BeautifulSoup4, SQLite, React 19, Vite, TanStack Query,
OpenAI-compatible API, Tavily (default search).

---

## 3. Specific requirements

### 3.1 External interfaces

#### 3.1.1 User interfaces

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-UI-01 | The system SHALL provide a Home view to enter a research objective and start a session. | Must | Implemented |
| FR-UI-02 | The system SHALL display research progress derived from polled session status. | Must | Implemented |
| FR-UI-03 | The system SHALL provide a session view at a routable URL containing the session id. | Must | Implemented (`/research/:id`) |
| FR-UI-04 | The session view SHALL present summary, findings, sources, gaps, and report content when available. | Must | Implemented |
| FR-UI-05 | The session view SHALL allow pairwise source comparison. | Must | Implemented |
| FR-UI-06 | The session view SHALL allow starring, saving, tagging, noting, and summarizing sources. | Must | Implemented |
| FR-UI-07 | The Home view SHOULD list recent sessions for re-entry. | Should | Implemented |
| FR-UI-08 | The UI SHALL NOT render fetched source HTML as trusted markup. | Must | Implemented (text/analysis only) |
| FR-UI-09 | Icon-only controls SHALL expose accessible names. | Must | Implemented (see a11y doc) |
| FR-UI-10 | External links that open a new browsing context SHOULD disclose that behavior to assistive tech. | Should | Implemented |

#### 3.1.2 Software interfaces (HTTP API)

Normative detail: [api.md](api.md). Summary requirements:

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-API-01 | `POST /api/research` SHALL accept `{objective}`, create a session, and return `{session_id}` with HTTP 201 on success. | Must | Implemented |
| FR-API-02 | `GET /api/research/{id}/status` SHALL return `{status, progress, message}` or 404. | Must | Implemented |
| FR-API-03 | `GET /api/research/{id}` SHALL return the full workspace payload or 404. | Must | Implemented |
| FR-API-04 | `GET /api/research/{id}/report` SHALL return markdown as plain text when ready, else 404. | Must | Implemented |
| FR-API-05 | `POST /api/research/{id}/compare` SHALL accept two source ids and return a typed comparison. | Must | Implemented |
| FR-API-06 | `GET /api/research/{id}/comparisons` SHALL list persisted comparisons. | Must | Implemented |
| FR-API-07 | `GET /api/research/{id}/workspace` SHALL list sources with optional `starred`, `saved`, and `tag` filters. | Must | Implemented |
| FR-API-08 | `PATCH /api/research/{id}/sources/{sid}` SHALL update starred/saved/note/tags. | Must | Implemented |
| FR-API-09 | `POST /api/research/{id}/sources/{sid}/summarize` SHALL return a `SourceAnalysis`. | Must | Implemented |
| FR-API-10 | `GET /api/research` SHALL list session summaries (newest first) with optional `status`, `limit`, `exclude_in_progress`. | Must | Implemented |
| FR-API-11 | `GET /api/health` SHALL return a positive health document. | Must | Implemented |
| FR-API-12 | On concurrent capacity exhaustion, `POST /api/research` SHALL respond 429. | Must | Implemented |
| FR-API-13 | Validation failures for objectives SHALL respond 422. | Must | Implemented |
| FR-API-14 | The API SHOULD expose OpenAPI docs at `/docs`. | Should | Implemented |

#### 3.1.3 Communications interfaces

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-COM-01 | The API SHALL speak HTTP/JSON for research endpoints (report MAY be `text/plain`). | Must | Implemented |
| FR-COM-02 | Progress delivery SHALL be client-pull (polling); WebSockets are not required. | Must | Implemented |
| FR-COM-03 | CORS SHALL be configurable via `REACH_CORS_ORIGINS`. | Must | Implemented |

---

### 3.2 Functional requirements — validation

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-VAL-01 | Objectives SHALL be between 8 and 1000 characters after trim. | Must | Implemented |
| FR-VAL-02 | Whitespace-only objectives SHALL be rejected. | Must | Implemented |
| FR-VAL-03 | Compare source ids SHALL be integers ≥ 1. | Must | Implemented |

### 3.3 Functional requirements — session lifecycle

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-SES-01 | A session SHALL progress through planning, searching, filtering, fetching, analyzing, synthesizing, then complete or failed. | Must | Implemented |
| FR-SES-02 | Progress percent SHALL be in 0–100 and persisted for polling. | Must | Implemented |
| FR-SES-03 | Uncaught pipeline failures SHALL mark the session `failed` with an error message. | Must | Implemented |
| FR-SES-04 | Partial artifacts written before failure SHOULD remain readable via GET detail. | Should | Implemented |
| FR-SES-05 | Concurrent in-process research starts SHALL be capped (default 16). | Must | Implemented |

### 3.4 Functional requirements — planner agent

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AG-PLAN-01 | The planner SHALL produce a bounded set of search queries (default max 7). | Must | Implemented |
| FR-AG-PLAN-02 | Queries SHOULD cover multiple research dimensions. | Should | Implemented |
| FR-AG-PLAN-03 | If academic coverage is missing, the planner SHALL append an academic-oriented query when under/at max. | Must | Implemented |
| FR-AG-PLAN-04 | If planning LLM fails, the system SHALL use a deterministic fallback query set and continue. | Must | Implemented |
| FR-AG-PLAN-05 | Queries SHALL be persisted and returned in the session detail. | Must | Implemented |

### 3.5 Functional requirements — researcher / sources

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AG-RES-01 | The system SHALL search for each planned query via the configured search provider. | Must | Implemented |
| FR-AG-RES-02 | Results SHALL be URL-normalized and deduplicated before selection. | Must | Implemented |
| FR-AG-RES-03 | Sources SHALL be classified into a fixed `SourceType` taxonomy without requiring an LLM. | Must | Implemented |
| FR-AG-RES-04 | Selection SHALL prefer higher combined scores including type, domain, overlap, and academic boost for papers. | Must | Implemented |
| FR-AG-RES-05 | The selected set SHALL be bounded (target band 8–15 when candidates allow). | Must | Implemented |
| FR-AG-RES-06 | Per-query search failures SHALL NOT abort sibling queries. | Must | Implemented |
| FR-SRC-01 | Fetching SHALL enforce http(s)-only, timeout, and max-bytes limits. | Must | Implemented |
| FR-SRC-02 | Fetch outcomes SHALL be recorded as fetch status values including fetched/partial/failed. | Must | Implemented |
| FR-SRC-03 | Per-source fetch/analyze failures SHALL NOT abort the session. | Must | Implemented |
| FR-SRC-04 | Analysis SHALL be schema-validated (`SourceAnalysis`) when produced by the LLM path. | Must | Implemented |
| FR-SRC-05 | Analysis prompts SHALL truncate source content to a bounded character budget. | Must | Implemented |

### 3.6 Functional requirements — synthesizer

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AG-SYN-01 | The synthesizer SHALL produce findings, open questions (gaps), and a research brief. | Must | Implemented |
| FR-AG-SYN-02 | Findings SHALL include supporting source ids when titles can be mapped. | Must | Implemented |
| FR-AG-SYN-03 | Gaps SHALL be stored as question + rationale. | Must | Implemented |
| FR-AG-SYN-04 | On synthesizer LLM failure, the system SHALL retry with backoff; on persistent failure it SHALL mark the session failed rather than complete with placeholder content. | Must | Implemented |

### 3.7 Functional requirements — report & comparison

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AG-REP-01 | After synthesis, the system SHALL generate a markdown research report. | Must | Implemented |
| FR-AG-REP-02 | Report generation SHALL detect intent among build/study/general. | Must | Implemented |
| FR-AG-REP-03 | On report LLM failure, a deterministic fallback report SHALL still be available. | Must | Implemented |
| FR-AG-CMP-01 | The comparator SHALL return similarities, differences, contradictions, and complementarity notes in a typed result. | Must | Implemented |
| FR-AG-CMP-02 | Comparisons SHALL be persisted per session. | Must | Implemented |
| FR-AG-CMP-03 | Comparator LLM failure SHALL yield a typed fallback result rather than a bare 500 when sources exist. | Must | Implemented |

### 3.8 Functional requirements — workspace & history

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-API-WS-01 | Sources SHALL support starred and saved boolean flags. | Must | Implemented |
| FR-API-WS-02 | Sources SHALL support a note string and a list of tags. | Must | Implemented |
| FR-API-WS-03 | Workspace listing SHALL filter by starred, saved, and tag when requested. | Must | Implemented |
| FR-API-SUM | Summarize SHALL regenerate analysis for a single source on demand. | Must | Implemented |
| FR-API-LIST | Session list entries SHALL include sources/findings/gaps counts. | Must | Implemented |

### 3.9 Functional requirements — providers & ops

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-OPS-MOCK | When `REACH_MOCK_MODE=mock`, the system SHALL run without live LLM/search keys using deterministic providers. | Must | Implemented |
| FR-OPS-CFG | Configuration SHALL load from `REACH_*` environment variables. | Must | Implemented |
| FR-OPS-DB | The system SHALL initialize/migrate SQLite schema on startup. | Must | Implemented |
| FR-OPS-LLM | Structured LLM calls SHALL validate against Pydantic schemas and retry a bounded number of times before failing the call. | Must | Implemented |

### 3.10 Data requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-DATA-01 | Session deletion (DB cascade) SHALL remove dependent queries, sources, findings, gaps, and comparisons. | Must | Implemented |
| FR-DATA-02 | Provenance SHALL be stored via `finding_sources` join rows. | Must | Implemented |
| FR-DATA-03 | Additive schema changes SHALL be applyable via idempotent migrations for existing DB files. | Must | Implemented |
| FR-DATA-04 | Database files and secrets SHALL NOT be required in version control. | Must | Implemented (gitignore / env example) |

Normative schema: [data-model.md](data-model.md).

---

### 3.11 Non-functional requirements

#### 3.11.1 Performance

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-PERF-01 | Mock-mode end-to-end research SHOULD complete on the order of seconds on a developer machine (not a hard SLA). | Should | Target / observed |
| NFR-PERF-02 | Fetch and analyze concurrency SHALL be limited by a semaphore to avoid unbounded fan-out. | Must | Implemented |
| NFR-PERF-03 | UI status polling interval SHOULD be on the order of 1–3 seconds. | Should | Implemented (~2s) |

#### 3.11.2 Reliability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-REL-01 | Provider/source partial failures SHALL degrade per item rather than crash the process. | Must | Implemented |
| NFR-REL-02 | Health endpoint SHALL remain responsive while research runs execute. | Must | Implemented |
| NFR-REL-03 | SQLite connections SHALL enable foreign keys and a busy timeout. | Must | Implemented |

#### 3.11.3 Security

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-SEC-01 | Secrets SHALL be supplied via environment / `.env`, not committed. | Must | Implemented |
| NFR-SEC-02 | Fetched HTML SHALL be parsed to text; the SPA SHALL NOT treat it as executable UI content. | Must | Implemented |
| NFR-SEC-03 | Fetch SHALL refuse non-http(s) schemes. | Must | Implemented |
| NFR-SEC-04 | The system SHOULD document the absence of authentication as a deployment risk. | Should | Implemented (this SRS + limitations) |
| NFR-SEC-05 | Production-like deploys SHOULD disable mock mode. | Should | Documented |

#### 3.11.4 Maintainability & testability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-TEST-01 | The backend SHALL provide a hermetic automated test suite covering models, storage, agents, service, and API. | Must | Implemented |
| NFR-TEST-02 | The monorepo SHOULD provide a one-command product smoke path. | Should | Implemented (`launch.sh`) |
| NFR-TEST-03 | Web changes SHALL pass lint and production build checks. | Must | Implemented |
| NFR-MAINT-01 | LLM prompts SHALL be centralized for review. | Must | Implemented |
| NFR-MAINT-02 | Search and LLM providers SHALL be swappable behind interfaces. | Must | Implemented |

#### 3.11.5 Usability & accessibility

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-USE-01 | Progress messages SHOULD be human-readable stage descriptions. | Should | Implemented |
| NFR-USE-02 | Open questions SHALL be presented distinctly from established findings. | Must | Implemented |
| NFR-A11Y-01 | Primary interactive controls SHALL be keyboard operable. | Must | Target / largely implemented |
| NFR-A11Y-02 | The project SHOULD document accessibility patterns and gaps. | Should | Implemented ([accessibility.md](accessibility.md)) |

#### 3.11.6 Portability & operability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-OPS-01 | Local setup SHOULD be achievable via Makefile targets. | Should | Implemented |
| NFR-OPS-02 | Database path SHALL be configurable. | Must | Implemented |
| NFR-OPS-03 | Deployment docs SHALL state single-worker guidance for in-process runs. | Should | Implemented |

---

## 4. Verification

| Method | Applies to |
| --- | --- |
| Automated unit/integration tests | Most FR-AG-*, FR-SRC-*, FR-DATA-*, FR-API-* |
| Product smoke script | Critical path FR-API-* + mock ops |
| Manual UI exploration | FR-UI-*, NFR-A11Y-* |
| Document review | NFR-SEC-04/05, limitations alignment |
| Build/lint | NFR-TEST-03 |

Traceability: CRM capabilities → SRS IDs ([CRM.md](CRM.md) §15). API field
shapes → [api.md](api.md). Agent bounds → [agent.md](agent.md).

Minimum verification before release of a behavior change:

1. `make test`
2. Update this SRS if requirements change
3. `REACH_BACKEND_ONLY=1 ./scripts/launch.sh` for orchestration/API changes

---

## 5. Apportioning of requirements

| Release | Includes |
| --- | --- |
| **v0.1 (current)** | All **Implemented** Must requirements above |
| **Later** | Auth, multi-user, queued workers, richer fetch (PDF/JS), a11y certification, exports, cross-session graph |

---

## 6. Open issues

1. First-class routed Workspace page vs session-embedded curation only.
2. Formal retention/TTL policy for SQLite session content.
3. Whether compare should short-circuit when an identical pair already exists.
4. Hard performance SLOs for real-mode runs (provider-dependent).
5. Accessibility CI tooling selection.

---

## 7. Requirement index (quick lookup)

**UI:** FR-UI-01…10  
**API:** FR-API-01…14, FR-API-WS-*, FR-API-SUM, FR-API-LIST  
**Session:** FR-SES-01…05, FR-VAL-01…03  
**Agents:** FR-AG-PLAN-*, FR-AG-RES-*, FR-AG-SYN-*, FR-AG-REP-*, FR-AG-CMP-*  
**Sources:** FR-SRC-01…05  
**Data/Ops:** FR-DATA-*, FR-OPS-*, FR-COM-*  
**NFR:** NFR-PERF-*, NFR-REL-*, NFR-SEC-*, NFR-TEST-*, NFR-MAINT-*, NFR-USE-*, NFR-A11Y-*, NFR-OPS-*

---

## 8. Revision history

| Version | Date | Notes |
| --- | --- | --- |
| 0.1.0 | 2026-09-20 | Initial SRS aligned to implemented REACH v0.1 |
