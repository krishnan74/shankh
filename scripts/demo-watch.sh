#!/usr/bin/env bash
# The live watcher demo: shankhd is already running when a poisoned package gets installed, and
# catches it on its own -- no command typed after the install.
#
#   scripts/demo-watch.sh prepare   Build a fresh, uniquely stamped poisoned shankh-demo and create an
#                                   empty throwaway "victim" environment (nothing installed yet).
#   scripts/demo-watch.sh run       Start shankhd watching the victim, install the poisoned build
#                                   into it, and let shankhd notice, rebuild it, and raise the alarm.
#                                   Pauses before the install when run in a terminal; --yes skips it.
#
# Safety, as in demo-ens.sh: the victim's Python is only ever started by pip, *before* the poisoned
# files exist in it; shankhd reads its files and never starts it. The poison is inert. Secrets go only
# to the step that needs them (shankhd posts its finding to Arkiv, so it gets the Arkiv wallet key).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="${DEMO_DIR:-$ROOT/.demo-watch}"
SHANKHD="$ROOT/shankh/.venv/bin/shankhd"
ENS_REGISTRY=0xb95110b3F8d89fb8e9858fC414E21475DA4DF15c   # shankh.eth
PYPI_REGISTRY=0x8634b9f567Fa84da5BCe08150Aa323424382a3a4  # pypi.shankh.eth
REPORTER=shankh-team.reporters.shankh.eth

[ -x "$SHANKHD" ] || { echo "shankhd not found at $SHANKHD -- run: cd shankh && .venv/bin/pip install -e ." >&2; exit 1; }
# shellcheck disable=SC1091
source "$ROOT/.env"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
: "${ARKIV_RPC_URL:?set ARKIV_RPC_URL in .env}"

site_packages() {
  local sp
  sp=$(echo "$DEMO_DIR/victim"/lib/python3.*/site-packages)
  [ -d "$sp" ] || { echo "no victim environment -- run: scripts/demo-watch.sh prepare" >&2; exit 1; }
  echo "$sp"
}

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

prepare() {
  step "Building a fresh poisoned shankh-demo"
  PYTHON="$ROOT/shankh/.venv/bin/python" "$ROOT/scripts/demo-packages/build.sh" "$DEMO_DIR/dist" "watch-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
  step "Creating an empty victim environment"
  rm -rf "${DEMO_DIR:?}/victim"
  python3 -m venv "$DEMO_DIR/victim"
  echo "Ready: ./victim in $DEMO_DIR (shankh-demo not installed yet)."
}

# Globals, not locals: the EXIT trap runs after run() has returned, when its locals are gone.
SHANKHD_PID=""
TAIL_PID=""
cleanup() { kill $SHANKHD_PID $TAIL_PID 2>/dev/null || true; }
trap cleanup EXIT

run() {
  local sp log
  sp=$(site_packages)
  if ls "$sp" | grep -q '^shankh_demo-'; then
    echo "shankh-demo is already installed in the victim -- run: scripts/demo-watch.sh prepare" >&2
    exit 1
  fi
  log="$DEMO_DIR/shankhd.log"

  step "1/2  Start shankhd watching the victim"
  # Run from inside the demo folder so the watcher names the environment "./victim" on screen,
  # not its full site-packages path.
  cd "$DEMO_DIR"
  : "${ARKIV_WALLET_PRIVATE_KEY:?set ARKIV_WALLET_PRIVATE_KEY in .env (shankhd signs what it finds)}"
  env SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" ENS_REGISTRY_ADDRESS="$ENS_REGISTRY" PYPI_REGISTRY_ADDRESS="$PYPI_REGISTRY" \
    ARKIV_RPC_URL="$ARKIV_RPC_URL" ARKIV_CHAIN_ID="${ARKIV_CHAIN_ID:-}" ARKIV_ACCESS_KEY="${ARKIV_ACCESS_KEY:-}" \
    ARKIV_WALLET_PRIVATE_KEY="$ARKIV_WALLET_PRIVATE_KEY" PYTHONUNBUFFERED=1 \
    "$SHANKHD" --site-packages "$sp" --trust "$REPORTER" --find-links "$DEMO_DIR/dist/clean" >"$log" 2>&1 &
  SHANKHD_PID=$!
  tail -n +1 -f "$log" &
  TAIL_PID=$!
  # Wait for the first sweep to finish before installing, so the order on screen is clear.
  local waited=0
  until grep -q "^.*sweep:" "$log" || [ "$waited" -ge 90 ]; do
    kill -0 "$SHANKHD_PID" 2>/dev/null || { echo "shankhd exited early -- see $log" >&2; exit 1; }
    sleep 1; waited=$((waited + 1))
  done

  if [ -t 0 ] && [ "${1:-}" != "--yes" ]; then
    printf '\nPress Enter to install the poisoned package into the victim...'
    read -r _
  fi

  step "2/2  Someone runs pip install -- shankhd takes it from here"
  "$DEMO_DIR/victim/bin/pip" install --quiet --no-index "$DEMO_DIR"/dist/poisoned/*.whl
  echo "(installed -- no other command typed)"
  # Give shankhd time to notice, rebuild, and post to Arkiv.
  waited=0
  until grep -q "kill:" "$log" || [ "$waited" -ge "${WAIT_SECONDS:-120}" ]; do sleep 2; waited=$((waited + 2)); done
  sleep 2
}

case "${1:-}" in
  prepare) prepare ;;
  run) shift; run "$@" ;;
  *) echo "usage: scripts/demo-watch.sh prepare | run [--yes]" >&2; exit 1 ;;
esac
