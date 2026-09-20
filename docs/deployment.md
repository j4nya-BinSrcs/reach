# REACH — Deployment

Deployment and operations guidance for REACH v0.1. The product is a
**local / single-node prototype**: FastAPI + SQLite + optional static web
build. It is not yet a multi-tenant cloud service.

Related: [development.md](development.md) · [architecture.md](architecture.md)
· [limitations.md](limitations.md).

## 1. Runtime topology

```
┌─────────────────────────────┐
│  Browser (React SPA)        │
│  static files or Vite preview│
└──────────────┬──────────────┘
               │ HTTP /api
┌──────────────▼──────────────┐
│  uvicorn · FastAPI          │
│  in-process asyncio tasks   │
│  SQLite (WAL file)          │
└──────────────┬──────────────┘
               │ outbound HTTPS
     ┌─────────┴─────────┐
     ▼                   ▼
 LLM provider      Search provider
 (OpenAI-compat)   (Tavily default)
 + source hosts (fetch)
```

No Redis, Celery, Kafka, or vector database.

## 2. Run modes

| Mode | When | Config |
| --- | --- | --- |
| **Mock** | CI, demos, UI work without keys | `REACH_MOCK_MODE=mock` |
| **Real research** | Production-like research | Keys set, `REACH_MOCK_MODE=off` |
| **Dev** | Local iteration | uvicorn `--reload` + Vite `npm run dev` |
| **Smoke / preview** | One-shot product check | `./scripts/launch.sh` |

## 3. Configuration checklist

Copy `server/.env.example` → `server/.env` (or inject env in the process
manager). Required for real research:

- [ ] `REACH_LLM_API_KEY`
- [ ] `REACH_LLM_BASE_URL` / `REACH_LLM_MODEL` as needed
- [ ] `REACH_SEARCH_API_KEY`
- [ ] `REACH_CORS_ORIGINS` includes the web origin(s)
- [ ] `REACH_DATABASE_PATH` points to a writable location
- [ ] `REACH_MOCK_MODE=off`

Optional tuning: fetch size/timeout, results per query, max queries.

**Secrets:** never bake keys into images or commit `.env`. Prefer platform
secret stores in any hosted environment.

## 4. Backend process

Example production-ish single node:

```bash
cd server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
export REACH_MOCK_MODE=off
export REACH_DATABASE_PATH=/var/lib/reach/reach.db
export REACH_CORS_ORIGINS=https://reach.example.com
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### Worker guidance

Use **`--workers 1`** (or a single process) while research runs are
in-process `asyncio` tasks registered on `app.state`. Multiple workers
would split in-memory run registries and complicate SQLite writers. If you
need horizontal scale later, extract the run worker to a shared queue and
shared DB — out of scope for v0.1.

### Health

Probe `GET /api/health` → `{ "status": "ok", "service": "reach-server" }`.

## 5. Frontend delivery

Build static assets:

```bash
cd apps/client
npm ci
npm run build    # outputs apps/client/dist
```

Serve `dist/` with any static file server (nginx, Caddy, object storage +
CDN). Ensure:

1. SPA fallback: unknown paths → `index.html` (client router).
2. `/api/*` reverse-proxied to the FastAPI process **or** the SPA calls an
   absolute API origin with matching CORS.

Dev proxy (`vite.config.ts`) is **not** present in production builds —
configure the reverse proxy explicitly.

## 6. Reverse proxy sketch (nginx)

```nginx
server {
  listen 443 ssl;
  server_name reach.example.com;

  root /var/www/reach;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_read_timeout 300s;  # long research runs; client polls status
  }

  location / {
    try_files $uri /index.html;
  }
}
```

Research itself is asynchronous; clients poll status. Still allow generous
timeouts for compare/summarize/report endpoints that may wait on the LLM.

## 7. Data directory

| Path | Purpose |
| --- | --- |
| `data/reach.db` (+ `-wal`/`-shm`) | Session persistence |
| `data/.gitkeep` | Keeps empty dir in git |

Backups: copy the SQLite file only after checkpointing or stopping writers
(`PRAGMA wal_checkpoint(FULL)` or stop uvicorn). For casual local use,
stopping the process and copying `reach.db*` is sufficient.

`make clean` and `launch.sh` may delete local DB files — do not point
`REACH_DATABASE_PATH` at irreplaceable data without backups.

## 8. Resource expectations

| Resource | Notes |
| --- | --- |
| CPU | Spikes during concurrent fetch/analyze; semaphore limits concurrency |
| Memory | Grows with in-flight runs and fetched text; content truncated for LLM |
| Disk | SQLite + source `content` columns; prune DBs periodically |
| Outbound | LLM, search API, and arbitrary source hosts |

Concurrent research starts are capped at **16** per process (HTTP 429 beyond).

## 9. Observability (current)

- Python `logging` in services/agents.
- Progress persisted per session (`status`, `progress`, `message`, `error`).
- No metrics/tracing stack shipped in v0.1.

Recommended when hosting: ship access logs from the reverse proxy, retain
application logs, and alert on health-check failures and elevated 5xx/429.

## 10. Security hardening checklist

- [ ] TLS at the edge
- [ ] Restrict CORS to known web origins
- [ ] Keep mock mode **off** in any shared deployment
- [ ] File permissions on `.env` and DB (owner-only)
- [ ] Do not expose uvicorn directly to the public internet without a proxy
- [ ] Understand fetch SSRF limits are basic (scheme/timeout/size only)
- [ ] Plan auth before multi-user exposure (none today)

## 11. Containerization (optional pattern)

v0.1 does not ship an official Dockerfile. A minimal pattern:

1. Multi-stage build: Node stage builds `apps/client/dist`; Python stage
   installs backend deps.
2. Copy web assets into an image served by nginx **or** serve API-only and
   host static assets separately.
3. Mount a volume for `REACH_DATABASE_PATH`.
4. Pass secrets via environment, not layers.
5. Single uvicorn worker; healthcheck on `/api/health`.

## 12. CI suggestion

```text
install backend deps → pytest + pyflakes
install web deps → lint + build
optional: REACH_SERVER_ONLY=1 ./scripts/launch.sh
```

Keep CI on mock mode. Never inject production secrets into PR builds.

## 13. Rollback

- Application: redeploy previous git revision / image tag.
- Data: restore SQLite backup if schema-compatible; additive migrations are
  forward-compatible for column adds in `_MIGRATIONS`.
- Config: revert env changes independently of code.

## 14. Out of scope for v0.1 deploy

Multi-region active-active SQLite, autoscaling research workers, blue/green
with shared in-memory task state, managed auth, and SLA-backed uptime
guarantees. See [PRD.md](PRD.md) future scope and [limitations.md](limitations.md).
