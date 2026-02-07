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

if [ -z "${SSH_KEY_FINGERPRINT:-}" ]; then
  echo "[error] SSH_KEY_FINGERPRINT not set in .env"
  exit 1
fi

export TF_VAR_do_token="$DO_TOKEN"
export TF_VAR_ssh_key_fingerprint="$SSH_KEY_FINGERPRINT"

if [ -n "${DO_REGION:-}" ]; then
  export TF_VAR_region="$DO_REGION"
fi
if [ -n "${DO_BACKEND_SIZE:-}" ]; then
  export TF_VAR_backend_size="$DO_BACKEND_SIZE"
fi
if [ -n "${DO_FRONTEND_SIZE:-}" ]; then
  export TF_VAR_frontend_size="$DO_FRONTEND_SIZE"
fi
if [ -n "${DO_BACKEND_IMAGE_SLUG:-}" ]; then
  export TF_VAR_backend_image_slug="$DO_BACKEND_IMAGE_SLUG"
fi
if [ -n "${DO_FRONTEND_IMAGE_SLUG:-}" ]; then
  export TF_VAR_frontend_image_slug="$DO_FRONTEND_IMAGE_SLUG"
fi
if [ -n "${DO_VPC_UUID:-}" ]; then
  export TF_VAR_vpc_uuid="$DO_VPC_UUID"
fi

printf "[ok] Loaded DO env from %s\n" "$ROOT_ENV"
