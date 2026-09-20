#!/usr/bin/env bash
# REACH development launcher.
#
# Usage:
#   ./scripts/dev.sh server   — run the FastAPI server with reload
#   ./scripts/dev.sh client   — run the Vite client (if present)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

run_server() {
  if [ ! -d "$SERVER_DIR/.venv" ]; then
    echo "Creating server virtualenv..."
    python3 -m venv "$SERVER_DIR/.venv"
    "$SERVER_DIR/.venv/bin/pip" install --upgrade pip
    "$SERVER_DIR/.venv/bin/pip" install -r "$SERVER_DIR/requirements.txt" -r "$SERVER_DIR/requirements-dev.txt"
  fi
  echo "Starting REACH server on http://localhost:8000"
  cd "$SERVER_DIR"
  exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

run_client() {
  if [ ! -d "$ROOT_DIR/apps/client" ]; then
    echo "Client not present at apps/client — server-only workspace."
    exit 1
  fi
  cd "$ROOT_DIR/apps/client"
  exec npm run dev
}

case "${1:-server}" in
  server) run_server ;;
  client) run_client ;;
  *) echo "Usage: $0 [server|client]"; exit 1 ;;
esac