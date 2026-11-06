#!/usr/bin/env bash
# The live Arkiv demo: one machine catches a poisoned build and posts the alarm; a second machine
# that trusts that reporter picks the alarm up, re-checks it locally, and only then calls it
# compromised. No ENS flag involved -- this is the "nobody's maintainer has noticed yet" path.
#
#   scripts/demo-arkiv.sh prepare   Build a fresh, uniquely stamped poisoned shankh-demo and install
#                                   it into two throwaway environments, "machine A" and "machine B".
#   scripts/demo-arkiv.sh run       1. machine B scans (no alarm about this build exists yet)
#                                   2. machine A rebuilds it from source, catches it, posts to Arkiv
#                                   3. machine B scans again, trusting shankh-team.reporters.shankh.eth:
#                                      reads the alarm, re-checks locally, COMPROMISED
#
# Both "machines" are on this laptop and machine A's alarm is signed by the demo operator wallet,
# which is also what shankh-team.reporters.shankh.eth's shankh.signer points at. Machine B runs
# with --no-report: a confirmation from the same wallet would not be an independent witness.
#
# Safety, as in demo-ens.sh: neither victim environment's Python is ever started (site-packages
# found by glob; the poisoned wheel is installed into a fresh venv before any poison exists there),
# the poison is inert, and secrets go only to the step that needs them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="${DEMO_DIR:-$ROOT/.demo-arkiv}"
SHANKH="$ROOT/shankh/.venv/bin/shankh"
ENS_REGISTRY=0xb95110b3F8d89fb8e9858fC414E21475DA4DF15c   # shankh.eth
PYPI_REGISTRY=0x8634b9f567Fa84da5BCe08150Aa323424382a3a4  # pypi.shankh.eth
REPORTER=shankh-team.reporters.shankh.eth

[ -x "$SHANKH" ] || { echo "shankh not found at $SHANKH -- set up shankh/.venv first" >&2; exit 1; }
# shellcheck disable=SC1091
source "$ROOT/.env"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
: "${ARKIV_RPC_URL:?set ARKIV_RPC_URL in .env}"

site_packages() {
  local sp
  sp=$(echo "$DEMO_DIR/$1"/lib/python3.*/site-packages)
  [ -d "$sp" ] || { echo "no $1 environment -- run: scripts/demo-arkiv.sh prepare" >&2; exit 1; }
  echo "$sp"
}

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# Read-only chain + Arkiv access: what machine B needs, and nothing that can sign.
readonly_env() {
  env SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" ENS_REGISTRY_ADDRESS="$ENS_REGISTRY" PYPI_REGISTRY_ADDRESS="$PYPI_REGISTRY" \
    ARKIV_RPC_URL="$ARKIV_RPC_URL" ARKIV_CHAIN_ID="${ARKIV_CHAIN_ID:-}" ARKIV_ACCESS_KEY="${ARKIV_ACCESS_KEY:-}" "$@"
}

prepare() {
  step "Building a fresh poisoned shankh-demo"
  PYTHON="$ROOT/shankh/.venv/bin/python" "$ROOT/scripts/demo-packages/build.sh" "$DEMO_DIR/dist" "arkiv-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
  for machine in machine-a machine-b; do
    step "Installing it on $machine"
    rm -rf "${DEMO_DIR:?}/$machine"
    python3 -m venv "$DEMO_DIR/$machine"
    "$DEMO_DIR/$machine/bin/pip" install --quiet --no-index "$DEMO_DIR"/dist/poisoned/*.whl
    "$SHANKH" fingerprint shankh-demo --site-packages "$(site_packages "$machine")"
  done
  echo "Ready. Nobody has reported this build yet."
}

run() {
  local sp_a sp_b
  sp_a=$(site_packages machine-a)
  sp_b=$(site_packages machine-b)

  step "1/3  Machine B scans, trusting $REPORTER"
  readonly_env "$SHANKH" scan --site-packages "$sp_b" --trust "$REPORTER" --find-links "$DEMO_DIR/dist/clean" --no-report || true

  if [ -t 0 ] && [ "${1:-}" != "--yes" ]; then
    printf '\nPress Enter to have machine A verify the build...'
    read -r _
  fi

  step "2/3  Machine A rebuilds shankh-demo from its source and posts what it finds to Arkiv"
  : "${ARKIV_WALLET_PRIVATE_KEY:?set ARKIV_WALLET_PRIVATE_KEY in .env (machine A signs its report)}"
  readonly_env ARKIV_WALLET_PRIVATE_KEY="$ARKIV_WALLET_PRIVATE_KEY" \
    "$SHANKH" verify shankh-demo==1.0.0 --site-packages "$sp_a" --find-links "$DEMO_DIR/dist/clean" || true

  step "3/3  Machine B scans again: the alarm arrives, is re-checked here, and holds up"
  readonly_env "$SHANKH" scan --site-packages "$sp_b" --trust "$REPORTER" --find-links "$DEMO_DIR/dist/clean" --no-report || true
}

case "${1:-}" in
  prepare) prepare ;;
  run) shift; run "$@" ;;
  *) echo "usage: scripts/demo-arkiv.sh prepare | run [--yes]" >&2; exit 1 ;;
esac
