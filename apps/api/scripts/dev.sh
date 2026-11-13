#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(cd ../.. && pwd)"
ENV_FILE="$ROOT/.env"
tsc -p tsconfig.build.json
tsc -p tsconfig.build.json -w --preserveWatchOutput &
TSC_PID=$!
cleanup() { kill "$TSC_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
export NODE_USE_ENV_PROXY=1
if [[ -f "$ENV_FILE" ]]; then
  exec node --env-file="$ENV_FILE" --watch dist/main.js
fi
exec node --watch dist/main.js
