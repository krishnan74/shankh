#!/usr/bin/env bash
# Regenerates docs/evidence.md from the live system: deployed addresses, a sample
# Arkiv query, and the most recent shankh incident report. Dry run by default --
# prints what it would collect. Pass --write to actually overwrite docs/evidence.md.
set -euo pipefail

WRITE=false
for arg in "$@"; do
  [[ "$arg" == "--write" ]] && WRITE=true
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Shankh evidence collection =="
echo "mode: $([[ "$WRITE" == true ]] && echo WRITE || echo "dry run (pass --write to overwrite docs/evidence.md)")"
echo
echo "Not wired up yet — see docs/plan.md Status table. Once it is, this script will:"
echo "  1. Read the deployed KillSwitch address and the ENS shankh.revoked record."
echo "  2. Run one sample Arkiv query against shankh.report and print the result."
echo "  3. Pull the most recent incident report from shankh report --last."
echo "  4. Write all of it into $ROOT_DIR/docs/evidence.md."
