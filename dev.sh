#!/usr/bin/env bash
# dev.sh — Start backend + frontend in parallel for local development
# Usage: bash dev.sh   (or: chmod +x dev.sh && ./dev.sh)
#
# Prerequisites:
#   - Python 3.11+ with venv created: cd backend && python -m venv .venv && pip install -r requirements.txt
#   - Node 18+ with deps installed:   cd frontend && npm install

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀  Starting AI Product Enrichment Platform — Local Dev"
echo "   Backend  → http://127.0.0.1:8000"
echo "   Frontend → http://localhost:5173"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
start_backend() {
  cd "$ROOT/backend"
  # Activate venv if present (Windows: .venv\Scripts\activate)
  if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
  elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
  fi
  echo "[backend] Starting uvicorn..."
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
}

# ── Frontend ─────────────────────────────────────────────────────────────────
start_frontend() {
  cd "$ROOT/frontend"
  echo "[frontend] Starting Vite dev server..."
  npm run dev
}

# Run both in parallel; Ctrl+C kills both
(start_backend &)
(start_frontend &)
wait
