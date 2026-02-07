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

PUB_KEY_PATH="${SSH_PUB_KEY_PATH:-$HOME/.ssh/id_ed25519.pub}"
if [ ! -f "$PUB_KEY_PATH" ]; then
  echo "[error] SSH public key not found at $PUB_KEY_PATH"
  echo "Create one with: ssh-keygen -t ed25519 -C \"finagotchi\""
  exit 1
fi

KEY_NAME="${SSH_KEY_NAME:-finagotchi}"
PUB_KEY_CONTENT=$(cat "$PUB_KEY_PATH")

RESP=$(curl -s -X POST "https://api.digitalocean.com/v2/account/keys" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$KEY_NAME\",\"public_key\":\"$PUB_KEY_CONTENT\"}")

FINGERPRINT=$(echo "$RESP" | python - <<'PY'
import json,sys
try:
    data=json.load(sys.stdin)
    print(data.get("ssh_key", {}).get("fingerprint", ""))
except Exception:
    print("")
PY
)

if [ -z "$FINGERPRINT" ]; then
  # Fallback: extract fingerprint from raw response
  FINGERPRINT=$(echo "$RESP" | sed -n 's/.*\"fingerprint\":\"\\([^\"]*\\)\".*/\\1/p')
fi

if [ -z "$FINGERPRINT" ]; then
  # If key already exists, fetch fingerprint by listing keys and matching public key
  LIST=$(curl -s -w "\n%{http_code}" -X GET "https://api.digitalocean.com/v2/account/keys" \
    -H "Authorization: Bearer $DO_TOKEN" \
    -H "Content-Type: application/json")
  BODY=$(echo "$LIST" | head -n 1)
  CODE=$(echo "$LIST" | tail -n 1)
  if [ "$CODE" = "200" ]; then
    FINGERPRINT=$(echo "$BODY" | python - <<'PY'
import json,sys,os
data=json.load(sys.stdin)
target=os.environ.get("PUB_KEY_CONTENT","")
for key in data.get("ssh_keys", []):
    if key.get("public_key","") == target:
        print(key.get("fingerprint",""))
        break
PY
    )
  else
    echo "[warn] Failed to list keys via API (HTTP $CODE)."
  fi
fi

if [ -z "$FINGERPRINT" ]; then
  # Fallback: compute local md5 fingerprint
  if command -v ssh-keygen >/dev/null 2>&1; then
    FINGERPRINT=$(ssh-keygen -E md5 -lf "$PUB_KEY_PATH" | awk '{print $2}' | sed 's/^MD5://')
    echo "[warn] Using local MD5 fingerprint: $FINGERPRINT"
  fi
fi

if [ -z "$FINGERPRINT" ]; then
  echo "[error] Failed to extract SSH fingerprint. Response:"
  echo "$RESP"
  exit 1
fi

echo "[ok] Added SSH key. Fingerprint: $FINGERPRINT"

grep -q '^SSH_KEY_FINGERPRINT=' "$ROOT_ENV" && \
  sed -i.bak "s/^SSH_KEY_FINGERPRINT=.*/SSH_KEY_FINGERPRINT=$FINGERPRINT/" "$ROOT_ENV" || \
  echo "SSH_KEY_FINGERPRINT=$FINGERPRINT" >> "$ROOT_ENV"

echo "[ok] Updated .env with SSH_KEY_FINGERPRINT"
