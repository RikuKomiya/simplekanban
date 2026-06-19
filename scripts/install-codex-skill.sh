#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill_name="${1:-simplekanban-cli}"
source_dir="$repo_root/skills/$skill_name"
dest_root="${CODEX_HOME:-$HOME/.codex}/skills"
dest_dir="$dest_root/$skill_name"

if [[ ! -d "$source_dir" ]]; then
  echo "missing skill directory: $source_dir" >&2
  exit 1
fi

if [[ -e "$dest_dir" ]]; then
  echo "destination already exists: $dest_dir" >&2
  echo "remove it first if you want to reinstall" >&2
  exit 1
fi

mkdir -p "$dest_root"
cp -R "$source_dir" "$dest_dir"

echo "installed $skill_name to $dest_dir"
echo "restart Codex to pick up new skills"
