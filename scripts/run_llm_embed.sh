#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

if [ -n "${LLM_EMBED_CMD:-}" ]; then
  echo "[llm-embed] Running custom command"
  exec bash -lc "${LLM_EMBED_CMD}"
fi

if [ -z "${LLM_EMBED_MODEL_PATH:-}" ]; then
  echo "LLM_EMBED_CMD or LLM_EMBED_MODEL_PATH not set."
  echo "Set LLM_EMBED_CMD to your runner command or LLM_EMBED_MODEL_PATH to a GGUF file." >&2
  exit 1
fi

HOST="${LLM_EMBED_HOST:-127.0.0.1}"
PORT="${LLM_EMBED_PORT:-8081}"
CTX="${LLM_EMBED_CTX:-8192}"
THREADS="${LLM_EMBED_THREADS:-4}"

exec python -m llama_cpp.server \
  --model "${LLM_EMBED_MODEL_PATH}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --n_ctx "${CTX}" \
  --n_threads "${THREADS}" \
  --embedding
