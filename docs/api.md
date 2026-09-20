# REACH — HTTP API

Base URL (local default): `http://localhost:8000`

Interactive OpenAPI UI: `http://localhost:8000/docs`

Version: **0.1.0** (`REACH API` in `app/main.py`)

CORS origins are controlled by `REACH_CORS_ORIGINS` (default Vite
`http://localhost:5173` and `http://127.0.0.1:5173`). In development the
Vite proxy forwards `/api/*` to the backend so the browser may call
relative `/api/...` paths.

## Conventions

| Topic | Behavior |
| --- | --- |
| Content type | `application/json` unless noted |
| IDs | Session ids are opaque strings (UUIDs). Source ids are integers. |
| Errors | FastAPI/HTTPException JSON `{ "detail": ... }` |
| Progress | Poll `GET .../status`; no WebSockets |
| Auth | None in v0.1 (local single-user prototype) |

## Endpoints

### Health

```
GET /api/health
```

**200**

```json
{ "status": "ok", "service": "reach-server" }
```

---

### Start research

```
POST /api/research
```

**Request**

```json
{ "objective": "I want to build a privacy-focused search engine using Rust..." }
```

| Field | Rules |
| --- | --- |
| `objective` | string, trimmed; **min 8**, **max 1000** characters |

**201 Created**

```json
{ "session_id": "…" }
```

**Errors**

| Status | Cause |
| --- | --- |
| 422 | Validation (too short, blank after strip, too long) |
| 429 | Concurrent research capacity exceeded (`MAX_CONCURRENT_RUNS`) |

---

### List sessions (history)

```
GET /api/research
```

**Query parameters**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `SessionStatus` | — | Filter by exact status |
| `limit` | int 1–200 | 50 | Max rows |
| `exclude_in_progress` | bool | false | Drop planning…synthesizing |

**200** — array of `SessionSummary` (newest first):

```json
[
  {
    "id": "…",
    "objective": "…",
    "status": "complete",
    "progress": 100,
    "error": null,
    "created_at": "…",
    "updated_at": "…",
    "sources_count": 12,
    "findings_count": 5,
    "gaps_count": 3
  }
]
```

---

### Session status (poll)

```
GET /api/research/{session_id}/status
```

**200** — `ProgressUpdate`

```json
{
  "status": "analyzing",
  "progress": 82,
  "message": "Analyzing source content"
}
```

**404** — unknown session.

`SessionStatus` values:  
`planning` · `searching` · `filtering` · `fetching` · `analyzing` ·
`synthesizing` · `complete` · `failed`

---

### Full session (workspace payload)

```
GET /api/research/{session_id}
```

**200** — `ResearchSessionDetail`

Includes session metadata plus:

| Field | Contents |
| --- | --- |
| `queries` | Planned search strings |
| `sources` | Selected sources with analysis + workspace fields |
| `findings` | Cross-source findings with `supporting_source_ids` |
| `gaps` | Open questions (`question`, `rationale`) |
| `summary` | Synthesis brief dict |
| `comparisons` | Prior pairwise comparisons |
| `report` | Report object (`intent`, `markdown`) or null |

**404** — unknown session.

---

### Research report (markdown)

```
GET /api/research/{session_id}/report
```

**200** — `text/plain` markdown body.

**404** — session missing or report not ready.

---

### Compare two sources

```
POST /api/research/{session_id}/compare
```

**Request**

```json
{ "source_a_id": 1, "source_b_id": 2 }
```

Ids must be ≥ 1 and belong to the session.

**200** — `SourceComparison`

```json
{
  "id": 1,
  "session_id": "…",
  "source_a_id": 1,
  "source_b_id": 2,
  "result": {
    "overview": "…",
    "similarities": [
      {
        "statement": "…",
        "source_a_evidence": "…",
        "source_b_evidence": "…"
      }
    ],
    "differences": [],
    "contradictions": [],
    "complementarity_notes": "…"
  }
}
```

**404** — session/source not found (or invalid pair).

---

### List comparisons

```
GET /api/research/{session_id}/comparisons
```

**200** — `SourceComparison[]` for the session.

---

### Workspace sources

```
GET /api/research/{session_id}/workspace
```

**Query parameters**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `starred` | bool | false | When true, only starred |
| `saved` | bool | false | When true, only saved |
| `tag` | string | — | Sources whose tags JSON contains the tag |

Filters may combine. Tag match is SQL `LIKE` against the stored JSON array
text (exact token preferred; avoid ambiguous substrings).

**200** — `Source[]`  
**404** — unknown session.

---

### Update source workspace fields

```
PATCH /api/research/{session_id}/sources/{source_id}
```

**Request** (all fields optional)

```json
{
  "starred": true,
  "saved": false,
  "note": "Revisit for indexing section",
  "tags": ["rust", "tantivy"]
}
```

**200** — updated `Source`  
**404** — session/source not found.

---

### Summarize a source

```
POST /api/research/{session_id}/sources/{source_id}/summarize
```

Regenerates a focused `SourceAnalysis` for one source (LLM or mock).

**200** — `SourceAnalysis`

```json
{
  "summary": "…",
  "key_points": ["…"],
  "technologies": ["…"],
  "concepts": ["…"],
  "why_relevant": "…",
  "limitations": ["…"]
}
```

**404** — session/source not found.

---

## Source object (wire shape)

Representative fields returned on sources:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | int | Session-scoped |
| `session_id` | string | Parent session |
| `url` | string | Canonical discovery URL |
| `title` | string | |
| `source_type` | enum | `paper` · `github` · `documentation` · `tool` · `project` · `article` · `other` |
| `domain` | string | |
| `description` / `snippet` | string | |
| `relevance` | float 0–1 | Ranking score |
| `content` | string | Fetched plain text (may be large) |
| `fetch_status` | enum | `pending` · `fetched` · `partial` · `failed` · `skipped` |
| `analysis` | object | `SourceAnalysis` |
| `starred` / `saved` | bool | Workspace flags |
| `note` | string | |
| `tags` | string[] | |
| `created_at` | datetime | |

Frontend normalization (`apps/client/src/lib/api.ts`) maps relevance to 0–100,
`source_type` → `type`, and fetch statuses for view contracts.

## Typical client sequence

```bash
# 1. Start
SID=$(curl -s -X POST localhost:8000/api/research \
  -H 'Content-Type: application/json' \
  -d '{"objective":"Survey privacy-preserving search engines and Rust indexing libraries."}' \
  | jq -r .session_id)

# 2. Poll
curl -s localhost:8000/api/research/$SID/status | jq .

# 3. Load workspace
curl -s localhost:8000/api/research/$SID | jq '.findings,.gaps' 

# 4. Report
curl -s localhost:8000/api/research/$SID/report

# 5. Curate + compare
curl -s -X PATCH localhost:8000/api/research/$SID/sources/1 \
  -H 'Content-Type: application/json' \
  -d '{"starred":true,"tags":["core"]}'
curl -s -X POST localhost:8000/api/research/$SID/compare \
  -H 'Content-Type: application/json' \
  -d '{"source_a_id":1,"source_b_id":2}' | jq .
```

## Rate / capacity notes

- No per-IP rate limiter in v0.1.
- In-process concurrent research starts are capped at **16**.
- External LLM/search provider quotas apply when not in mock mode.

## Compatibility

Additive fields may appear on detail payloads as the product evolves.
Clients should ignore unknown JSON properties. Breaking renames should bump
the documented API version and update this file in the same PR.
