#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/../.."
pnpm --filter @autobi/database migrate:deploy
