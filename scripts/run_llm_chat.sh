#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

if [ -n "${LLM_CHAT_CMD:-}" ]; then
  echo "[llm-chat] Running custom command"
  exec bash -lc "${LLM_CHAT_CMD}"
fi

if [ -z "${LLM_CHAT_MODEL_PATH:-}" ]; then
  echo "LLM_CHAT_CMD or LLM_CHAT_MODEL_PATH not set."
  echo "Set LLM_CHAT_CMD to your runner command or LLM_CHAT_MODEL_PATH to a GGUF file." >&2
  exit 1
fi

HOST="${LLM_CHAT_HOST:-127.0.0.1}"
PORT="${LLM_CHAT_PORT:-8080}"
CTX="${LLM_CHAT_CTX:-4096}"
THREADS="${LLM_CHAT_THREADS:-4}"

exec python -m llama_cpp.server \
  --model "${LLM_CHAT_MODEL_PATH}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --n_ctx "${CTX}" \
  --n_threads "${THREADS}" \
  --chat_format "${LLM_CHAT_FORMAT:-chatml}"
