#!/usr/bin/env bash
# The live ENS demo: the maintainer flags a poisoned build on stage, and `shankh scan` catches it
# from the ENS flag alone -- no rebuild.
#
#   scripts/demo-ens.sh prepare   Build a fresh, uniquely stamped poisoned shankh-demo and install it
#                                 into a throwaway "victim" environment. Never flagged, so it's
#                                 always ready -- re-run before every demo (un-flagging takes 48h by
#                                 design; a fresh build means you never need to).
#   scripts/demo-ens.sh run       1. scan (nothing flagged)  2. flag it on ENS (live Sepolia tx)
#                                 3. scan again (COMPROMISED, alarm posted to Arkiv)
#                                 Pauses before the flag when run in a terminal; --yes skips it.
#
# Safety: the victim environment's Python is never started -- its site-packages path is found by
# glob, and installing into a fresh venv happens before any poisoned file exists in it. The poison
# itself is inert (scripts/demo-packages/build.sh). Secrets go only to the step that needs them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="${DEMO_DIR:-$ROOT/.demo}"
SHANKH="$ROOT/shankh/.venv/bin/shankh"
REGISTRY=0x8634b9f567Fa84da5BCe08150Aa323424382a3a4
KILLSWITCH=0x1126b7aBe8b0Db262cBa84b6b5a377D002351c5a # shankh-demo.pypi.shankh.eth's switch

[ -x "$SHANKH" ] || { echo "shankh not found at $SHANKH -- set up shankh/.venv first" >&2; exit 1; }
# shellcheck disable=SC1091
source "$ROOT/.env"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"

site_packages() {
  local sp
  sp=$(echo "$DEMO_DIR/victim"/lib/python3.*/site-packages)
  [ -d "$sp" ] || { echo "no victim environment -- run: scripts/demo-ens.sh prepare" >&2; exit 1; }
  echo "$sp"
}

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

prepare() {
  step "Building a fresh poisoned shankh-demo"
  PYTHON="$ROOT/shankh/.venv/bin/python" "$ROOT/scripts/demo-packages/build.sh" "$DEMO_DIR/dist" "stage-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
  step "Installing it into a throwaway victim environment"
  rm -rf "${DEMO_DIR:?}/victim"
  python3 -m venv "$DEMO_DIR/victim"
  "$DEMO_DIR/victim/bin/pip" install --quiet --no-index "$DEMO_DIR"/dist/poisoned/*.whl
  "$SHANKH" fingerprint shankh-demo --site-packages "$(site_packages)"
  echo "Ready. This build is not flagged yet."
}

run() {
  local sp fp start tx
  sp=$(site_packages)
  fp=$("$SHANKH" fingerprint shankh-demo --site-packages "$sp" | awk '{print $2}')
  if [ "$(cast call "$KILLSWITCH" 'revoked(bytes32)(bool)' "$fp" --rpc-url "$SEPOLIA_RPC_URL")" = "true" ]; then
    echo "This build ($fp) is already flagged -- run: scripts/demo-ens.sh prepare" >&2
    exit 1
  fi

  step "1/3  Scan this machine against every kill switch under pypi.shankh.eth"
  env SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PYPI_REGISTRY_ADDRESS="$REGISTRY" \
    "$SHANKH" scan --site-packages "$sp" --no-report || true

  if [ -t 0 ] && [ "${1:-}" != "--yes" ]; then
    printf '\nPress Enter to flag build %s as the maintainer...' "$fp"
    read -r _
  fi

  step "2/3  The maintainer flags this build on shankh-demo.pypi.shankh.eth"
  : "${OPERATOR_PRIVATE_KEY:?set OPERATOR_PRIVATE_KEY in .env (the demo maintainer wallet)}"
  start=$(date +%s)
  tx=$(cast send "$KILLSWITCH" "revoke(bytes32)" "$fp" --rpc-url "$SEPOLIA_RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --json \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['transactionHash'])")
  echo "flagged in $(( $(date +%s) - start ))s -- https://sepolia.etherscan.io/tx/$tx"

  step "3/3  Scan again -- caught from the ENS flag alone, alarm posted to Arkiv"
  env SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PYPI_REGISTRY_ADDRESS="$REGISTRY" \
    ARKIV_RPC_URL="$ARKIV_RPC_URL" ARKIV_CHAIN_ID="$ARKIV_CHAIN_ID" ARKIV_ACCESS_KEY="${ARKIV_ACCESS_KEY:-}" \
    ARKIV_WALLET_PRIVATE_KEY="$ARKIV_WALLET_PRIVATE_KEY" \
    "$SHANKH" scan --site-packages "$sp" || true
  echo
  echo "Refresh the website: the registry table now lists this build under shankh-demo."
}

case "${1:-}" in
  prepare) prepare ;;
  run) shift; run "$@" ;;
  *) echo "usage: scripts/demo-ens.sh prepare | run [--yes]" >&2; exit 1 ;;
esac
