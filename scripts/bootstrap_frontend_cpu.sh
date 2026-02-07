#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
API_URL="${API_URL:-}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL is required. Example:"
  echo "  REPO_URL=git@github.com:you/finagotchi.git ./scripts/bootstrap_frontend_cpu.sh"
  exit 1
fi

if [ -z "$API_URL" ]; then
  echo "API_URL is required. Example:"
  echo "  API_URL=http://<gpu_ip>:8000 ./scripts/bootstrap_frontend_cpu.sh"
  exit 1
fi

apt-get update
apt-get install -y docker.io docker-compose-plugin git

if [ ! -d finagotchi ]; then
  git clone "$REPO_URL"
fi

cd finagotchi

docker build -t finagotchi-frontend -f frontend/Dockerfile .
docker run -d --name finagotchi-frontend -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="$API_URL" finagotchi-frontend

echo "Frontend running at http://$(hostname -I | awk '{print $1}'):3000"
