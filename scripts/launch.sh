#!/usr/bin/env bash
# REACH — single-command product launcher + end-to-end smoke test.
#
# Starts the server with the real research pipeline (keyless extractive
# fallback works with no keys; Tavily + live LLM when keys are configured),
# serves the built client, then verifies the complete product contract:
# regular research run, markdown report, source comparison, workspace
# marking, and single-source summarization. No mock providers exist anymore —
# every result is grounded in real fetched web material.
#
# Usage:
#   ./scripts/launch.sh                # full launch + smoke test
#   REACH_SERVER_ONLY=1 ./scripts/launch.sh   # server API smoke test only
#   RUN_E2E=1 ./scripts/launch.sh              # + browser E2E, then shut down
#
# The smoke run uses a throwaway database so it never pollutes the product
# DB; once it passes, the real server is restarted against data/reach.db and
# stays up for interactive use. Everything the script starts is shut down on
# exit (including via process groups) so no stale REACH process is left.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="$ROOT/server"
CLIENT="$ROOT/apps/client"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
API="http://localhost:$API_PORT"

# ── Colors/logging ───────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${BOLD}[launch]${NC} $*"; }
ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
warn()  { echo -e "  ${YELLOW}!${NC} $*"; }
fail()  { echo -e "  ${RED}✗${NC} $*"; }

# ── 0. Must-have tooling ─────────────────────────────────
command -v curl >/dev/null || { echo "curl is required"; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required"; exit 1; }

# ── 1. Server venv ───────────────────────────────────────
if [ ! -x "$SERVER/.venv/bin/python" ]; then
  info "Creating server virtualenv (one-time)…"
  python3 -m venv "$SERVER/.venv"
  "$SERVER/.venv/bin/pip" install -q -U pip
  "$SERVER/.venv/bin/pip" install -q -r "$SERVER/requirements.txt"
fi

# ── 2. Throwaway database for the smoke run ────────────────
# The smoke test never touches (or wipes) the developer's real
# data/reach.db; it gets a fresh temp DB that is deleted on exit.
SMOKE_DB="/tmp/reach-smoke.$$.db"
rm -f "$SMOKE_DB" "$SMOKE_DB"-*
cleanup() {
  rm -f "$SMOKE_DB" "$SMOKE_DB"-* 2>/dev/null || true
  local pid
  for pid in "${PIDS[@]:-}"; do
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

# ── 3. Preflight: stop stale REACH servers on our ports ───
# An interrupted run can leave an old server/client holding the ports
# (and an old bundle). Reap anything that looks like a REACH server so a
# rerun never talks to stale code.
stop_stale() {
  local port pid
  for port in "$API_PORT" "$WEB_PORT"; do
    for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u); do
      if ps -p "$pid" -o args= 2>/dev/null | grep -Eq 'uvicorn app[.]main|vite preview'; then
        warn "stopping stale REACH server on :$port (pid $pid)"
        kill "$pid" 2>/dev/null || true
      fi
    done
  done
  sleep 0.5
}
if command -v ss >/dev/null 2>&1; then stop_stale; else
  warn "ss(8) not found — skipping stale-server check"
fi

# ── 4. Start smoke server (real pipeline, throwaway DB) ───
info "Starting smoke server on $API (real pipeline, throwaway DB)…"
(
  cd "$SERVER"
  exec setsid env -u REACH_DATABASE_PATH \
    REACH_DATABASE_PATH="$SMOKE_DB" \
    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" \
    >/tmp/reach-server.log 2>&1
) &
SMOKE_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "$API/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.3
done
curl -fsS "$API/api/health" >/dev/null 2>&1 \
  || { fail "server failed to start (see /tmp/reach-server.log)"; exit 1; }
ok "server healthy"

# ── 5. Build + serve client (unless server-only) ──────────
if [ "${REACH_SERVER_ONLY:-0}" != "1" ]; then
  info "Building client app…"
  ( cd "$CLIENT" && npm run build >/tmp/reach-client-build.log 2>&1 ) \
    || { fail "client build failed (see /tmp/reach-client-build.log)"; exit 1; }
  ok "client build succeeded"

  info "Serving client app on http://localhost:$WEB_PORT…"
  ( cd "$CLIENT" && exec setsid npm run preview -- --port "$WEB_PORT" >/tmp/reach-client.log 2>&1 ) &
  PIDS+=($!)
  for _ in $(seq 1 30); do
    if curl -fsS "http://localhost:$WEB_PORT" >/dev/null 2>&1; then break; fi
    sleep 0.3
  done
  curl -fsS "http://localhost:$WEB_PORT" >/dev/null 2>&1 \
    || { fail "client app failed to start (see /tmp/reach-client.log)"; exit 1; }
  ok "client app serving"
fi

# ── 6. API smoke test: full product contract ─────────────
STATUS=0
t () { # t <expected_status> <label> <curl...>
  local expected="$1"; shift
  local label="$1"; shift
  local code
  code=$(curl -s -o /tmp/reach-body.json -w "%{http_code}" "$@")
  if [ "$code" = "$expected" ]; then ok "$label"; else fail "$label → HTTP $code (expected $expected)"; STATUS=1; fi
}

fatal_on_failed_run() { # curl the status; abort if the run failed
  local st
  st=$(curl -s "$API/api/research/$SESSION_ID/status" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
  [ "$st" = "failed" ] && { fail "research run FAILED"; exit 1; }
}

t 200 "health check"                    "$API/api/health"
t 422 "reject malformed objective"      -X POST "$API/api/research" -H 'Content-Type: application/json' -d '{"objective":"x"}'

t 201 "start research session"          -X POST "$API/api/research" \
    -H 'Content-Type: application/json' \
    -d '{"objective":"I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, and technologies."}'
SESSION_ID=$(python3 -c 'import json;s=json.load(open("/tmp/reach-body.json"));print(s["session_id"])')
ok "session id = $SESSION_ID"

# A real research run searches the live web, fetches pages, and analyzes
# them; give it generous time (rate-limited live models fall back to the
# content-grounded extractive provider, so runs still complete).
info "waiting for research to complete — this can take several minutes…"
for _ in $(seq 1 600); do
  st=$(curl -s "$API/api/research/$SESSION_ID/status" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
  [ "$st" = "complete" ] && break
  fatal_on_failed_run
  sleep 2
done

t 200   "session status is terminal"   "$API/api/research/$SESSION_ID/status"
t 200   "fetch full session detail"    "$API/api/research/$SESSION_ID"
t 200   "fetch markdown report"        "$API/api/research/$SESSION_ID/report"

# Validate payload fields
python3 - "$API/api/research/$SESSION_ID" <<'PY'
import json, sys, urllib.request
detail = json.load(urllib.request.urlopen(sys.argv[1]))
checks = {
  "report": bool(detail.get("report", {}).get("markdown")),
  "queries": len(detail.get("queries", [])) > 0,
  "sources": len(detail.get("sources", [])) > 0,
  "findings": len(detail.get("findings", [])) > 0,
  "gaps": len(detail.get("gaps", [])) > 0,
}
present = [k for k, v in checks.items() if v]
missing = [k for k, v in checks.items() if not v]
print(f"  payload contains: {', '.join(present) if present else '(none)'}")
if missing:
    print(f"  payload missing: {', '.join(missing)}")
    sys.exit(1)
PY

# Workspace + summarize + compare
SOURCE_IDS=$(curl -s "$API/api/research/$SESSION_ID" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(" ".join(str(s["id"]) for s in d["sources"][:2]))')
read -r SRC_A SRC_B <<< "$SOURCE_IDS"
t 200 "list workspace sources"         "$API/api/research/$SESSION_ID/workspace"
t 200 "star a source in workspace"     -X PATCH "$API/api/research/$SESSION_ID/sources/$SRC_A" \
    -H 'Content-Type: application/json' -d '{"starred":true,"saved":true,"note":"must revisit","tags":["core"]}'
t 200 "filter workspace to starred"    "$API/api/research/$SESSION_ID/workspace?starred=true"
t 200 "summarize a single source"      -X POST "$API/api/research/$SESSION_ID/sources/$SRC_A/summarize"
if [ -n "$SRC_B" ]; then
  t 200 "compare two sources"          -X POST "$API/api/research/$SESSION_ID/compare" \
      -H 'Content-Type: application/json' -d "{\"source_a_id\":$SRC_A,\"source_b_id\":$SRC_B}"
  t 200 "list comparisons"             "$API/api/research/$SESSION_ID/comparisons"
fi

# ── 7. Summary ───────────────────────────────────────────
echo
if [ "$STATUS" != "0" ]; then
  echo -e "${RED}${BOLD}REACH product smoke test: ${STATUS} check(s) failed${NC}"
  exit "$STATUS"
fi
echo -e "${GREEN}${BOLD}REACH product smoke test: ALL CHECKS PASSED${NC}"

# In server-only (CI) mode, shut down after a successful test.
if [ "${REACH_SERVER_ONLY:-0}" = "1" ]; then
  info "Server-only test complete; shutting down."
  exit 0
fi

# ── 8. Switch to the real server on the product DB ────────
# The smoke DB was temporary; now serve the real product against
# data/reach.db so interactive sessions persist.
info "Bringing up the real server on the product database…"
kill "$SMOKE_PID" 2>/dev/null || true
sleep 1
(
  cd "$SERVER"
  exec setsid env -u REACH_DATABASE_PATH \
    REACH_DATABASE_PATH="$ROOT/data/reach.db" \
    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" \
    >/tmp/reach-server.log 2>&1
) &
PIDS+=($!)
for _ in $(seq 1 30); do
  if curl -fsS "$API/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.3
done
curl -fsS "$API/api/health" >/dev/null 2>&1 \
  || { fail "real server failed to start (see /tmp/reach-server.log)"; exit 1; }
ok "real server serving on $API (docs at $API/docs)"
[ "${REACH_SERVER_ONLY:-0}" != "1" ] && \
  ok "client : http://localhost:$WEB_PORT"

# Browser E2E mode: drive the running product through Playwright (headless
# Chromium), then shut down regardless of the result.
if [ "${RUN_E2E:-0}" = "1" ]; then
  info "Running browser E2E against http://localhost:$WEB_PORT…"
  if ( cd "$CLIENT" && npm run test:e2e ); then
    echo -e "${GREEN}${BOLD}REACH browser E2E: PASSED${NC}"
  else
    echo -e "${RED}${BOLD}REACH browser E2E: FAILED${NC}"
    exit 1
  fi
  info "E2E complete; shutting down."
  exit 0
fi

# Interactive mode: keep servers up; Ctrl-C to stop.
info "Servers are running; Ctrl-C to stop."
wait 2>/dev/null || true