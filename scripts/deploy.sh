#!/usr/bin/env bash
# One-command deploy: KillSwitch contract to Sepolia + status page to Vercel.
# Dry run by default — prints what it would do. Pass --write to actually deploy.
set -euo pipefail

WRITE=false
for arg in "$@"; do
  [[ "$arg" == "--write" ]] && WRITE=true
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
[[ -f "$ROOT_DIR/.env" ]] && source "$ROOT_DIR/.env"

echo "== Shankh deploy =="
echo "mode: $([[ "$WRITE" == true ]] && echo WRITE || echo "dry run (pass --write to deploy)")"

echo
echo "-- Contracts (contracts/) --"
if [[ "$WRITE" == true ]]; then
  : "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
  : "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY in .env}"
  : "${MAINTAINER_ADDRESS:?set MAINTAINER_ADDRESS in .env}"
  (cd "$ROOT_DIR/contracts" && forge script script/DeployKillSwitch.s.sol \
    --rpc-url "$SEPOLIA_RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast)
else
  echo "would run: forge script script/DeployKillSwitch.s.sol --rpc-url \$SEPOLIA_RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY --broadcast"
fi

echo
echo "-- Status page (status-page/) --"
if [[ "$WRITE" == true ]]; then
  (cd "$ROOT_DIR/status-page" && vercel deploy --prod)
else
  echo "would run: vercel deploy --prod   (from status-page/)"
fi

echo
echo "Record every deployed address/URL in docs/evidence.md and CLAUDE.md's Live table."
