#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
GPU_IP_HINT="${GPU_IP_HINT:-}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL is required. Example:"
  echo "  REPO_URL=git@github.com:you/finagotchi.git ./scripts/bootstrap_backend_gpu.sh"
  exit 1
fi

apt-get update
apt-get install -y docker.io docker-compose-plugin git rsync

if [ ! -d finagotchi ]; then
  git clone "$REPO_URL"
fi

cd finagotchi

echo "[info] Create .env in repo root with Qdrant + model paths before running backend."
echo "[info] Upload GGUF models to /opt/finagotchi/models on this droplet."

cat <<'EON'

Next steps:
1) rsync models from local:
   rsync -av external/grey/models/ root@<gpu_ip>:/opt/finagotchi/models/

2) Create .env with:
   QDRANT_CLUSTER_ENDPOINT=...
   QDRANT_API_KEY=...
   QDRANT_VECTOR_NAME=text
   INPROC_LLM=1
   LLM_CHAT_MODEL_PATH=/opt/finagotchi/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
   LLM_EMBED_MODEL_PATH=/opt/finagotchi/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf

3) Run backend:
   docker build -f backend/Dockerfile -t finagotchi-backend .
   docker run -d --name finagotchi-backend -p 8000:8000 --env-file .env \
     -v /opt/finagotchi/models:/opt/finagotchi/models finagotchi-backend

Swagger:
  http://<gpu_ip>:8000/
EON
