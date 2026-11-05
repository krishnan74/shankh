#!/usr/bin/env bash
# One-command demo run: the terminal path from docs/plan.md's "Demo path" section.
# Dry run by default. Pass --write to actually send transactions / mutate AWS state.
set -euo pipefail

WRITE=false
for arg in "$@"; do
  [[ "$arg" == "--write" ]] && WRITE=true
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/shankh"
source .venv/bin/activate 2>/dev/null || true

if [[ "$WRITE" == true ]]; then
  shankh demo --step
else
  shankh demo --recap
fi
