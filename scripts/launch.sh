#!/usr/bin/env bash
# REACH — start the API server, Vite client, and local SQLite DB.
#
# Usage:
#   ./scripts/launch.sh
#   API_PORT=8000 WEB_PORT=5173 ./scripts/launch.sh
#
# Ctrl-C stops everything.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="$ROOT/server"
CLIENT="$ROOT/apps/client"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
DB_PATH="$ROOT/data/reach.db"
API="http://127.0.0.1:$API_PORT"
WEB="http://127.0.0.1:$WEB_PORT"

log() { echo "[launch] $*"; }
die() { echo "[launch] ERROR: $*" >&2; exit 1; }

command -v python3 >/dev/null || die "python3 is required"
command -v npm >/dev/null || die "npm is required"
command -v curl >/dev/null || die "curl is required"

# ── Dependencies (one-time) ───────────────────────────────
if [ ! -x "$SERVER/.venv/bin/uvicorn" ]; then
  log "creating server virtualenv…"
  python3 -m venv "$SERVER/.venv"
  "$SERVER/.venv/bin/pip" install -q -U pip
  "$SERVER/.venv/bin/pip" install -q -r "$SERVER/requirements.txt"
fi

if [ ! -d "$CLIENT/node_modules" ]; then
  log "installing client dependencies…"
  (cd "$CLIENT" && npm install)
fi

mkdir -p "$(dirname "$DB_PATH")"

# ── Free our ports if something is still holding them ─────
free_port() {
  local port="$1" pid
  command -v ss >/dev/null 2>&1 || return 0
  for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u); do
    log "stopping process on :$port (pid $pid)"
    kill "$pid" 2>/dev/null || true
  done
}
free_port "$API_PORT"
free_port "$WEB_PORT"
sleep 0.3

# ── Shutdown on exit / Ctrl-C ─────────────────────────────
SERVER_PID=""
CLIENT_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Start server (SQLite init happens on boot) ────────────
log "database  $DB_PATH"
log "starting  API on $API"
(
  cd "$SERVER"
  export REACH_DATABASE_PATH="$DB_PATH"
  exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT"
) >/tmp/reach-server.log 2>&1 &
SERVER_PID=$!

# ── Start client ──────────────────────────────────────────
log "starting  client on $WEB"
(
  cd "$CLIENT"
  exec ./node_modules/.bin/vite --host 127.0.0.1 --port "$WEB_PORT"
) >/tmp/reach-client.log 2>&1 &
CLIENT_PID=$!

# ── Wait until both are ready ─────────────────────────────
for _ in $(seq 1 60); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    die "server exited early (see /tmp/reach-server.log)"
  fi
  if ! kill -0 "$CLIENT_PID" 2>/dev/null; then
    die "client exited early (see /tmp/reach-client.log)"
  fi
  if curl -fsS --max-time 1 "$API/api/health" >/dev/null 2>&1 \
    && curl -fsS --max-time 1 "$WEB" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS --max-time 2 "$API/api/health" >/dev/null \
  || die "server failed to become healthy (see /tmp/reach-server.log)"
curl -fsS --max-time 2 "$WEB" >/dev/null \
  || die "client failed to become ready (see /tmp/reach-client.log)"
[ -f "$DB_PATH" ] || die "database was not created at $DB_PATH"

log "ready"
log "  API     $API   (docs: $API/docs)"
log "  client  $WEB"
log "  db      $DB_PATH"
log "Ctrl-C to stop"

wait
