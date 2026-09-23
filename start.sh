#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Starting InterNova API on :8000"
(cd "$ROOT/backend" && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
API_PID=$!

echo "==> Starting InterNova web on :5173"
(cd "$ROOT/frontend" && npm run dev) &
WEB_PID=$!

trap "kill $API_PID $WEB_PID 2>/dev/null" INT TERM
wait
