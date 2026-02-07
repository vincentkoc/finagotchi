#!/usr/bin/env bash
set -euo pipefail

ROOT_ENV="${ROOT_ENV:-$(cd "$(dirname "$0")/../.." && pwd)/.env}"
if [ ! -f "$ROOT_ENV" ]; then
  echo "[error] .env not found at $ROOT_ENV"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ROOT_ENV"
set +a

if [ -z "${DO_TOKEN:-}" ]; then
  echo "[error] DO_TOKEN not set in .env"
  exit 1
fi

TMP_BODY=$(mktemp)
CODE=$(curl -s -o "$TMP_BODY" -w "%{http_code}" \
  -X GET "https://api.digitalocean.com/v2/account/keys" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json")

BYTES=$(wc -c < "$TMP_BODY" | tr -d ' ')

if [ "$CODE" != "200" ]; then
  echo "[error] Failed to list keys (HTTP $CODE)"
  cat "$TMP_BODY"
  rm -f "$TMP_BODY"
  exit 1
fi

if [ "$BYTES" -eq 0 ]; then
  echo "[error] Empty response body (HTTP 200)."
  echo "Check DO_TOKEN and network connectivity."
  rm -f "$TMP_BODY"
  exit 1
fi

python - <<'PY' "$TMP_BODY"
import json,sys
path = sys.argv[1]
with open(path, 'r') as f:
    resp=json.load(f)
for key in resp.get('ssh_keys', []):
    print(f"{key.get('fingerprint')}\t{key.get('name')}")
PY

rm -f "$TMP_BODY"
