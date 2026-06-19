#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v bun >/dev/null 2>&1; then
  echo "missing dependency: bun" >&2
  exit 127
fi

if [[ ! -f packages/shared/dist/index.js ]]; then
  bun --filter @simplekanban/shared build >/dev/null
fi

exec bun packages/cli/src/index.ts "$@"
