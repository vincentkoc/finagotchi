#!/usr/bin/env bash
set -euo pipefail

# Requires:
# - tofu apply already run
# - SSH access to droplets
# - local git repo with this script

API_URL="${API_URL:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL_LOCAL="${REPO_URL_LOCAL:-https://github.com/vincentkoc/finagotchi}"

if ! command -v tofu >/dev/null 2>&1; then
  echo "[error] tofu not found"
  exit 1
fi

BACKEND_IP=$(tofu -chdir="$SCRIPT_DIR" output -raw backend_ip)
FRONTEND_IP=$(tofu -chdir="$SCRIPT_DIR" output -raw frontend_ip)

if [ -z "$BACKEND_IP" ] || [ -z "$FRONTEND_IP" ]; then
  echo "[error] Missing backend or frontend IPs from tofu output"
  exit 1
fi

if [ -z "$API_URL" ]; then
  API_URL="http://$BACKEND_IP:8000"
fi

echo "[info] Backend IP: $BACKEND_IP"
ssh root@"$BACKEND_IP" "REPO_URL=$REPO_URL_LOCAL; \
  if [ ! -d finagotchi ]; then git clone \"\$REPO_URL\"; fi; \
  cd finagotchi; \
  git fetch --all --prune; \
  git reset --hard origin/main; \
  ./scripts/bootstrap_backend_gpu.sh"

echo "[info] Frontend IP: $FRONTEND_IP"
ssh root@"$FRONTEND_IP" "REPO_URL=$REPO_URL_LOCAL API_URL=$API_URL; export API_URL; \
  if [ ! -d finagotchi ]; then git clone \"\$REPO_URL\"; fi; \
  cd finagotchi; \
  git fetch --all --prune; \
  git reset --hard origin/main; \
  ./scripts/bootstrap_frontend_cpu.sh"

cat <<EON

Next steps:
1) Upload GGUF models to backend droplet:
   rsync -av external/grey/models/ root@$BACKEND_IP:/opt/finagotchi/models/

2) Create .env on backend droplet with Qdrant + model paths.
3) Run backend container (see scripts/bootstrap_backend_gpu.sh output).

Frontend should be reachable at:
  http://$FRONTEND_IP:3000
EON
