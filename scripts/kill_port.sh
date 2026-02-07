#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
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
  else
    echo "Found pid ${PID} (${CMD}) on port ${PORT}. Skipping (not uvicorn/gunicorn/python)."
  fi
done
