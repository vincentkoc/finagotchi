#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
FORCE="${FORCE:-0}"
if [ "${FORCE}" = "1" ]; then
  pkill -f "uvicorn backend.app.main" 2>/dev/null || true
  pkill -f "uvicorn" 2>/dev/null || true
fi

PIDS=$(lsof -ti tcp:"${PORT}" || true)

if [ -z "${PIDS}" ]; then
  echo "No process found on port ${PORT}."
  exit 0
fi

for PID in ${PIDS}; do
  CMD=$(ps -p "${PID}" -o comm= || true)
  if echo "${CMD}" | grep -qiE 'uvicorn|gunicorn|python'; then
    echo "Stopping ${CMD} (pid ${PID}) on port ${PORT}..."
    kill "${PID}" || true
  elif [ "${FORCE}" = "1" ]; then
    echo "Force stopping ${CMD} (pid ${PID}) on port ${PORT}..."
    kill "${PID}" || true
  else
    echo "Found pid ${PID} (${CMD}) on port ${PORT}. Skipping (not uvicorn/gunicorn/python). Use FORCE=1 to kill."
  fi
done
