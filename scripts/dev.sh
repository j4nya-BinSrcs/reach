#!/usr/bin/env bash
# REACH development launcher.
#
# Usage:
#   ./scripts/dev.sh backend   — run the FastAPI backend with reload
#   ./scripts/dev.sh frontend  — run the Vite frontend (if present)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

run_backend() {
  if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo "Creating backend virtualenv..."
    python3 -m venv "$BACKEND_DIR/.venv"
    "$BACKEND_DIR/.venv/bin/pip" install --upgrade pip
    "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -r "$BACKEND_DIR/requirements-dev.txt"
  fi
  echo "Starting REACH backend on http://localhost:8000"
  cd "$BACKEND_DIR"
  exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

run_frontend() {
  if [ ! -d "$ROOT_DIR/apps/web" ]; then
    echo "Frontend not present at apps/web — backend-only workspace."
    exit 1
  fi
  cd "$ROOT_DIR/apps/web"
  exec npm run dev
}

case "${1:-backend}" in
  backend) run_backend ;;
  frontend) run_frontend ;;
  *) echo "Usage: $0 [backend|frontend]"; exit 1 ;;
esac