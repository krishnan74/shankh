#!/usr/bin/env bash
# Builds the demo's local "replay" of the LiteLLM 1.107.0 attack pattern, never touching PyPI:
#   <out>/clean/     shankh_demo-1.0.0.tar.gz (source archive) + a clean wheel
#   <out>/poisoned/  shankh_demo-1.0.0-...whl that ALSO ships a top-level sitecustomize.py
# The poisoned wheel's extra file is inert -- a labeled no-op -- but it is exactly the shape of
# the real attack: a file Python auto-runs on every start that appears nowhere in the source.
#
# Every poisoned build is stamped with a unique ID, so every build has its own fingerprint. That
# makes the demo repeatable without ever un-flagging (which takes 48h by design): each run flags
# a brand-new build that isn't on the bad-builds list yet.
#
# Usage: scripts/demo-packages/build.sh <out-dir> [stamp]
set -euo pipefail

OUT="${1:?usage: build.sh <out-dir> [stamp]}"
STAMP="${2:-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-python3}"

rm -rf "$OUT" && mkdir -p "$OUT/clean" "$OUT/poisoned"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Clean source archive + clean wheel, straight from the package source.
cp -R "$HERE/shankh-demo" "$WORK/clean"
"$PYTHON" -m pip wheel --quiet --no-deps --wheel-dir "$OUT/clean" "$WORK/clean"
"$PYTHON" - "$WORK/clean" "$OUT/clean" <<'PY'
import sys, tarfile, pathlib
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
with tarfile.open(out / "shankh_demo-1.0.0.tar.gz", "w:gz") as tar:
    for path in sorted(src.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            tar.add(path, arcname=f"shankh_demo-1.0.0/{path.relative_to(src)}")
PY

# Poisoned wheel: same package, plus the injected startup hook at the wheel's root.
cp -R "$HERE/shankh-demo" "$WORK/poisoned"
cat > "$WORK/poisoned/sitecustomize.py" <<PY
# Shankh demo: an INERT stand-in for the startup hook the real LiteLLM 1.107.0 attack injected.
# Python imports sitecustomize.py automatically on every start. This one deliberately does nothing.
# build stamp: $STAMP
PY
cat >> "$WORK/poisoned/pyproject.toml" <<'TOML'

[tool.hatch.build.targets.wheel.force-include]
"sitecustomize.py" = "sitecustomize.py"
TOML
"$PYTHON" -m pip wheel --quiet --no-deps --wheel-dir "$OUT/poisoned" "$WORK/poisoned"

echo "$STAMP" > "$OUT/poisoned/STAMP"
echo "built (poisoned build stamp: $STAMP):"
ls -1 "$OUT/clean" "$OUT/poisoned"
