#!/usr/bin/env bash
set -euo pipefail

# NFR-001 QA: Simulate an API server restart locally.
#
# Usage:
#   bash tasks/restart-sim.sh [PORT]
#
# Defaults:
#   PORT=3000
#
# Behavior:
# - Kills any process bound to PORT
# - Starts `nx run api:serve:development` in the background
# - Polls /healthz until it responds

PORT="${1:-3000}"

echo "[NFR-001] Simulating API restart on port ${PORT}…"

if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti ":${PORT}" || true)
  if [[ -n "${PID}" ]]; then
    echo "Killing process ${PID} using port ${PORT}…"
    kill -9 ${PID} || true
  fi
fi

echo "Starting api:serve in background…"
nohup npx nx run api:serve:development >/tmp/api-serve.log 2>&1 &

echo -n "Waiting for /healthz to respond"
for i in {1..60}; do
  if curl -fsS "http://localhost:${PORT}/healthz" >/dev/null 2>&1; then
    echo "\nAPI is healthy again."
    exit 0
  fi
  echo -n "."
  sleep 0.5
done

echo "\nTimed out waiting for API health after restart." >&2
echo "See /tmp/api-serve.log for details." >&2
exit 1

