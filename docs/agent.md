# REACH — Agent subsystem

REACH’s research intelligence is a **deterministic orchestration** of
specialized agents under `backend/app/agent/`, coordinated by
`ResearchService`. LLMs are used only where structured reasoning adds value;
classification, URL hygiene, ranking, and bounds are code-first.

Related: [workflow.md](workflow.md) · [architecture.md](architecture.md) ·
[api.md](api.md).

## 1. Agent map

| Agent | Module | Primary I/O | LLM? |
| --- | --- | --- | --- |
| Planner | `planner.py` | objective → queries (+ dimensions) | Yes (`QueryPlan`) |
| Researcher | `researcher.py` | queries → selected & analyzed sources | Search + analyze |
| Synthesizer | `synthesizer.py` | sources → findings, gaps, brief | Yes (`SynthesisResult`) |
| Comparator | `comparator.py` | two sources → comparison | Yes (`SourceComparisonResult`) |
| Report writer | `report_writer.py` | session artifacts → markdown report | Yes (`ResearchReportContent`) |

Supporting non-agent modules: `app/sources/*` (classify/fetch/parse/analyze),
`app/search/*`, `app/llm/*`.

## 2. Design rules for agents

1. **Structured outputs only** — Pydantic models validated via
   `LLMProvider.generate_structured` (schema hint + JSON extract + retry).
2. **Fallbacks always** — every LLM stage has a deterministic path so a
   session can still complete.
3. **Bounded I/O** — query counts, source counts, content character caps.
4. **Isolated failures** — per-query search and per-source fetch/analyze
   errors do not abort siblings.
5. **Provenance** — synthesizer maps supporting titles back to source ids.

## 3. Planner

### Purpose

Decompose a research objective into a small set of **dimension-covering**
search queries.

### Dimensions

Queries are labelled against dimensions such as:

- core concept  
- existing implementations  
- academic research  
- technical implementation  
- tools and libraries  
- benchmarks and performance  
- limitations and challenges  

### Bounds & behavior

| Constant / rule | Value / behavior |
| --- | --- |
| Default max queries | 7 (`REACH_SEARCH_MAX_QUERIES`) |
| Practical min (fallback) | 3 |
| Dedup | Case-insensitive query text |
| Topic truncation | ~140 characters for fallback templates |
| Academic guarantee | If no query matches academic markers (`arxiv`, `paper`, `scholar`, `academic`, `literature`, …), append an academic query (dropping the last if at max) |

### Fallback

If the LLM call fails, emit three deterministic queries covering academic,
open-source, and documentation angles for the topic.

### Output

List of search query strings persisted into the `queries` table and returned
in the session detail payload.

## 4. Researcher (discovery → analysis)

The researcher owns the middle of the pipeline.

### 4.1 Search

- Runs searches **concurrently per query** against the configured
  `SearchProvider` (Tavily or Mock).
- Results normalized early into `SearchResult` (title, url, snippet, score).
- Per-query failures are logged and skipped.

### 4.2 Filter & select (`SourceSelector`)

1. Normalize and dedupe URLs (tracking-param strip, host/path canonicalization).
2. Classify `SourceType` deterministically (paper, github, documentation, …).
3. Score candidates and select a bounded set.

**Ranking (clamped 0–1):**

```
score =
  0.40 * provider_score
+ 0.25 * type_score
+ 0.15 * domain_score
+ 0.20 * token_overlap(objective)
+ academic_boost   # +0.15 when source_type == paper
```

| Factor | Notes |
| --- | --- |
| Provider score | From search API; default 0.5 if missing |
| Type score | paper 1.0 … other 0.4 |
| Domain score | 1.0 if host in high-quality domain set, else 0.5 |
| Token overlap | Lexical overlap with the objective |
| Academic boost | Prefer papers for research-shaped objectives |

**High-quality / trusted domains (representative):**  
`arxiv.org`, `semanticscholar.org`, `acm.org`, `ieee.org` / `ieeexplore.ieee.org`,
`nature.com`, `openreview.net`, `pubmed.ncbi.nlm.nih.gov`, `github.com`,
`docs.rs`, `readthedocs.io`, `developer.mozilla.org`, `docs.python.org`,
`crates.io`, and related scholarly hosts.

**Selection bounds:**

| Rule | Value |
| --- | --- |
| Min sources | 8 (soft; may be lower if few candidates) |
| Max sources | 15 |
| Target size | `min(max, max(min, int(len(candidates) * 0.35)))` |
| Relevance floor | Keep candidates with score ≥ **0.25**; if none, take top 1 |

### 4.3 Fetch

- `SourceFetcher`: http(s) only, size cap (default 300 KB), timeout (15s),
  session-local URL cache, redirect follow.
- Statuses: `fetched` · `partial` · `failed` · `skipped` · `pending`.
- Parser strips scripts/styles/chrome; stores plain text (content treated as
  untrusted; raw HTML is not rendered by the UI).

### 4.4 Analyze

- `SourceAnalyzer` produces `SourceAnalysis`:
  `summary`, `key_points`, `technologies`, `concepts`, `why_relevant`,
  `limitations`.
- Content budget for the prompt is truncated (≈12,000 characters).
- Empty or failed analysis yields an explicit limitation note rather than
  invented claims.

### Concurrency

Fetch/analyze work shares a semaphore (default **5** concurrent tasks).

## 5. Synthesizer

### Purpose

Aggregate analyzed sources into a research brief with **cross-source**
findings and **open questions** (gaps).

### LLM output (`SynthesisResult`)

- `overview`
- `key_findings` (each with `source_titles`)
- `existing_projects`, `relevant_technologies`, `important_sources`
- `open_questions` (`question` + `rationale`)

### Provenance mapping

Titles returned by the model are fuzzy-matched back to persisted source
ids so each `Finding` stores `supporting_source_ids`.

Persisted shapes:

- `findings` + `finding_sources`  
- `research_gaps`  
- `research_sessions.synthesis` (JSON brief)

### Retries & failure

Synthesis LLM calls are retried with exponential backoff (5 attempts, up to
30 s delays) so transient provider failures self-heal and the run stays in
`synthesizing` while it waits. If synthesis genuinely fails, the session is
marked `failed` instead of completing with placeholder content — sources
already collected remain persisted for review.

## 6. Comparator

### Purpose

On-demand pairwise comparison of two sources in the same session.

### LLM output (`SourceComparisonResult`)

- `overview`
- `similarities` / `differences` / `contradictions` — each a
  `ComparisonPoint` (`statement`, `source_a_evidence`, `source_b_evidence`)
- `complementarity_notes`

Content excerpts are capped (≈5,000 characters per source) before the call.

### Fallback

Result with a failure-oriented overview and empty/minimal lists so the API
still returns a typed object.

### Persistence

Rows in `source_comparisons` keyed by session and source pair.

## 7. Report writer

### Purpose

Produce a **markdown research report** suited to the user’s objective intent.

### Intent detection (`ReportIntent`)

| Intent | Trigger hints (examples) | Emphasis |
| --- | --- | --- |
| `build` | build, create, develop, implement, … | architecture, tooling, build plan, optimizations |
| `study` | study, history, origins, explore, … | origins, scholarship, people, context |
| `general` | default | Balanced sections |

### Two-step planning & fill (`ReportOutline` → `ResearchReportContent`)

The writer never uses a fixed section template. It first plans a
`ReportOutline` for the specific objective: the model reasons about what the
report should contain (e.g. a historical objective gets origins, primary
sources, key figures, cultural context — not technologies or build plans),
then fills each planned heading with grounded `items`. Content whose heading
does not belong to the outline is dropped, and empty sections are omitted
when rendering markdown.

### Render & appendices

After the planned sections, the writer appends grounded appendices from
pipeline state (source findings, gaps, projects, technologies, source list).

### Retries & fallback

Outline and content LLM calls are retried with backoff like synthesis. Only on
persistent failure does a deterministic outline (executive summary, key
findings, open questions) get filled from the real synthesis overview, up to
~8 findings, and the research gaps — never with placeholder prose.

Persisted on `research_sessions.report` and served as plain text via
`GET /api/research/{id}/report`.

## 8. Prompt centralization

All system/user prompt builders live in `backend/app/llm/prompts.py`
(planner, source analysis, synthesis, comparison, report). Agents should
not embed large prompt strings inline.

## 9. Mock agents (test/demo)

`MockLLMProvider` constructs valid Pydantic instances without calling a
network API. Combined with `MockSearchProvider` and the fetcher’s mock
transport, every agent path is exercisable in CI.

## 10. Extension guidance

When adding a new agent capability:

1. Define a Pydantic output model under `app/models/`.
2. Add prompts in `app/llm/prompts.py`.
3. Implement the agent with a deterministic fallback.
4. Wire persistence + API + tests (success path and fallback path).
5. Update this document, [workflow.md](workflow.md), and [SRS.md](SRS.md).

Do **not** introduce unbounded loops, uncapped fetches, or free-form
persisted LLM text without schema validation.
