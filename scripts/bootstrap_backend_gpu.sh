#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vincentkoc/finagotchi}"

apt-get update
apt-get install -y docker.io docker-compose-plugin git rsync

if [ ! -d finagotchi ]; then
  git clone "$REPO_URL"
fi

cd finagotchi

echo "[info] Upload GGUF models from local machine:"
cat <<'EON'
rsync -av external/grey/models/ root@<gpu_ip>:/opt/finagotchi/models/
EON

echo "[info] Create .env in repo root with:"
cat <<'EON'
QDRANT_CLUSTER_ENDPOINT=...
QDRANT_API_KEY=...
QDRANT_VECTOR_NAME=text

INPROC_LLM=1
LLM_CHAT_MODEL_PATH=/opt/finagotchi/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
LLM_EMBED_MODEL_PATH=/opt/finagotchi/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf
KUZU_DB_PATH=data/kuzu
EON

echo "[info] Build + run backend:"
cat <<'EON'
docker build -f backend/Dockerfile -t finagotchi-backend .
docker run -d --name finagotchi-backend -p 8000:8000 --env-file .env \
  -v /opt/finagotchi/models:/opt/finagotchi/models \
  -v /root/finagotchi/data:/app/data \
  finagotchi-backend
EON

echo "[info] Build Kuzu graph (once):"
cat <<'EON'
python backend/scripts/build_kuzu_from_qdrant.py
EON

echo "Swagger: http://<gpu_ip>:8000/"
