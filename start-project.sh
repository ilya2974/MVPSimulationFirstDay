#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Load local configuration before starting either service. Without this,
# DATABASE_URL from .env is invisible to the shell expansion below and the
# script silently falls back to the local PostgreSQL instance.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MVP_API_PORT="${API_PORT:-5050}"
MVP_FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# Free common dev ports if something is already running.
for port in "$MVP_FRONTEND_PORT" "$MVP_API_PORT"; do
  pids=$(lsof -ti tcp:"$port" || true)
  if [ -n "$pids" ]; then
    echo "Stopping process(es) on port $port: $pids"
    kill -9 $pids || true
  fi
done

API_LOG="/tmp/mvpsim_api.log"
FRONT_LOG="/tmp/mvpsim_front.log"

# Start backend as a detached process so it survives the shell exiting.
nohup env PORT="$MVP_API_PORT" DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}" \
  pnpm --filter @workspace/api-server run dev >"$API_LOG" 2>&1 &
API_PID=$!

# Start frontend as a detached process so it survives the shell exiting.
nohup env PORT="$MVP_FRONTEND_PORT" BASE_PATH=/ API_PROXY_TARGET="http://localhost:$MVP_API_PORT" \
  pnpm --filter @workspace/workday-simulation run dev >"$FRONT_LOG" 2>&1 &
FRONT_PID=$!

disown "$API_PID" "$FRONT_PID" 2>/dev/null || true

echo "========================================"
echo "Project started"
echo "API: http://localhost:$MVP_API_PORT/"
echo "Frontend: http://localhost:$MVP_FRONTEND_PORT/"
echo "API log: $API_LOG"
echo "Frontend log: $FRONT_LOG"
echo "API PID: $API_PID"
echo "Frontend PID: $FRONT_PID"
echo "========================================"

echo "Waiting for services to become responsive..."
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://localhost:$MVP_API_PORT/api/healthz" >/dev/null 2>&1 && curl -sf "http://localhost:$MVP_FRONTEND_PORT/" >/dev/null 2>&1; then
    echo "Services are responding."
    break
  fi
done

echo "To stop the project: kill $API_PID $FRONT_PID"
