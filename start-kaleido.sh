#!/usr/bin/env bash
# Starts the full Kaleido stack: PostgreSQL, Redis, Ollama, backend API, Cloudflare tunnel.
# Usage: ./start-kaleido.sh [--no-tunnel]

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_BIN="$HOME/.conda/envs/kaleido-services/bin"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

echo "==> PostgreSQL"
if "$SERVICES_BIN/pg_ctl" -D "$ROOT/data/postgres" status >/dev/null 2>&1; then
  echo "    already running"
else
  "$SERVICES_BIN/pg_ctl" -D "$ROOT/data/postgres" -l "$LOGS/postgres.log" start
fi

echo "==> Redis"
if "$SERVICES_BIN/redis-cli" -p 6379 ping >/dev/null 2>&1; then
  echo "    already running"
else
  "$SERVICES_BIN/redis-server" --daemonize yes --dir "$ROOT/data/redis" --port 6379 --logfile "$LOGS/redis.log"
fi

echo "==> Ollama"
if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "    already running"
else
  # Use the full install (lib/ contains the CUDA runners; a bare binary
  # without lib/ falls back to slow CPU inference)
  nohup "$HOME/ollama-v0.30.7/bin/ollama" serve >> "$LOGS/ollama.log" 2>&1 &
  echo "    started (pid $!)"
fi

echo "==> Backend API (port 8001)"
if curl -s http://127.0.0.1:8001/health >/dev/null 2>&1; then
  echo "    already running"
else
  cd "$ROOT/kaleido-backend"
  nohup ../venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8001 >> "$LOGS/uvicorn.log" 2>&1 &
  echo "    started (pid $!)"
  cd "$ROOT"
fi

echo "==> Celery worker (scheduled publishing + phone reminders)"
if pgrep -f "celery -A tasks.celery_app" >/dev/null 2>&1; then
  echo "    already running"
else
  cd "$ROOT/kaleido-backend"
  nohup ../venv/bin/python -m celery -A tasks.celery_app worker --beat --loglevel=info >> "$LOGS/celery.log" 2>&1 &
  echo "    started (pid $!)"
  cd "$ROOT"
fi

if [ "${1:-}" != "--no-tunnel" ]; then
  echo "==> Cloudflare tunnel"
  if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
    echo "    already running"
  else
    nohup "$ROOT/cloudflared" tunnel --no-autoupdate --url http://127.0.0.1:8001 --protocol http2 >> "$LOGS/cloudflared.log" 2>&1 &
    echo "    started (pid $!), waiting for URL..."
    sleep 8
  fi
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOGS/cloudflared.log" | tail -1)
  echo ""
  echo "    Public API URL: ${URL:-not found yet, check logs/cloudflared.log}"
  echo "    IMPORTANT: quick tunnels get a NEW random URL on every restart."
  echo "    Update NEXT_PUBLIC_API_URL in Vercel and redeploy the frontend,"
  echo "    or set up a named tunnel with a stable hostname (needs a Cloudflare account)."
fi

echo ""
echo "==> Health check"
sleep 2
curl -s http://127.0.0.1:8001/health/detailed | "$ROOT/venv/bin/python" -m json.tool 2>/dev/null || curl -s http://127.0.0.1:8001/health
echo "Done."
