#!/usr/bin/env bash
# Adds one package under pypi.shankh.eth on real Sepolia, with exactly the guarantees
# shankh-demo.pypi.shankh.eth has (see register-tree-sepolia.sh steps 6-9):
#   - its own PermissionedResolver, registered with role bitmap 0 (the name's holder can't swap it)
#   - shankh.source writable only by the maintainer (key-scoped setter grant)
#   - shankh.revoked writable only by a fresh KillSwitch for this package
#   - the operator's broad SET_TEXT on the resolver revoked afterwards -- a ONE-WAY DOOR
# Then proves the split live: the maintainer can rewrite shankh.source, the operator can't write
# shankh.revoked.
#
# Usage: scripts/ens/add-package-sepolia.sh <label> [source-url]
#   label: the PyPI-normalized package name, e.g. shankh-demo-clean
# The maintainer defaults to the operator wallet (a demo stand-in -- no real outside maintainer
# exists on testnet); set MAINTAINER_ADDRESS to hand a package to someone else.
set -euo pipefail

LABEL="${1:?usage: add-package-sepolia.sh <label> [source-url]}"
SOURCE_URL="${2:-https://github.com/krishnan74/shankh}"
if ! [[ "$LABEL" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo "label must be a lowercase PyPI-normalized name (a-z, 0-9, hyphens): $LABEL" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
: "${OPERATOR_PRIVATE_KEY:?set OPERATOR_PRIVATE_KEY in .env}"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
RPC_URL="$SEPOLIA_RPC_URL"

VERIFIABLE_FACTORY=0xda70306c98e97ece36f997a21368e53298572991
PERMISSIONED_RESOLVER_IMPL=0x115eb53f0c60696633855f90b138178fb40b2b2c
PYPI_REGISTRY=0x8634b9f567Fa84da5BCe08150Aa323424382a3a4
RESOLVER_SET_TEXT_BITMAP=5444517870735015415413993718908291383312 # SET_TEXT | SET_TEXT_ADMIN
ZERO=0x0000000000000000000000000000000000000000

OPERATOR=$(cast wallet address --private-key "$OPERATOR_PRIVATE_KEY")
MAINTAINER="${MAINTAINER_ADDRESS:-$OPERATOR}"
EXPIRY=$(($(date +%s) + 315360000)) # 10 years
FQDN="$LABEL.pypi.shankh.eth"
DNS_NAME=$(python3 -c "import sys; n=sys.argv[1]; print('0x'+(b''.join(bytes([len(l)])+l.encode() for l in n.split('.'))+b'\0').hex())" "$FQDN")

retry() {
  local attempt=1
  until "$@"; do
    if [ "$attempt" -ge 3 ]; then return 1; fi
    echo "  (attempt $attempt failed, retrying in 5s...)" >&2
    sleep 5
    attempt=$((attempt + 1))
  done
}
send() { retry cast send "$@" --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --json; }
call() { retry cast call "$@" --rpc-url "$RPC_URL"; }
proxy_address() {
  echo "$1" | python3 -c "
import json, sys
r = json.load(sys.stdin)
for log in r['logs']:
    if log['address'].lower() == '$VERIFIABLE_FACTORY'.lower():
        print('0x' + log['topics'][2][-40:])
        break
"
}

echo "== Adding $FQDN on Sepolia -- operator $OPERATOR, maintainer $MAINTAINER =="

EXISTING=$(call "$PYPI_REGISTRY" "getResolver(string)(address)" "$LABEL")
if [ "$EXISTING" != "$ZERO" ]; then
  echo "$FQDN is already registered (resolver $EXISTING) -- nothing to do." >&2
  exit 1
fi

echo "-- 1. Deploy the package's own resolver --"
INIT=$(cast calldata "initialize((address,uint256)[],bytes[])" "[($OPERATOR,$RESOLVER_SET_TEXT_BITMAP)]" "[]")
RECEIPT=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$PERMISSIONED_RESOLVER_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT")
RESOLVER=$(proxy_address "$RECEIPT")
echo "resolver: $RESOLVER"

echo "-- 2. Register $LABEL under pypi.shankh.eth (role bitmap 0: the holder can't swap the resolver) --"
send "$PYPI_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
  "$LABEL" "$MAINTAINER" "$ZERO" "$RESOLVER" 0 "$EXPIRY" >/dev/null
echo "registry now says: $(call "$PYPI_REGISTRY" "getResolver(string)(address)" "$LABEL")"

echo "-- 3. shankh.source: maintainer-only, then set it --"
SETTER_SOURCE=$(cast calldata "setText(bytes,string,string)" 0x00 "shankh.source" "")
send "$RESOLVER" "grantSetterRoles(bytes,address)" "$SETTER_SOURCE" "$MAINTAINER" >/dev/null
send "$RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.source" "$SOURCE_URL" >/dev/null

echo "-- 4. A fresh KillSwitch, the only writer of shankh.revoked --"
cd "$ROOT_DIR/contracts"
KILLSWITCH_OUT=$(forge create --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --broadcast \
  src/KillSwitch.sol:KillSwitch --constructor-args "$MAINTAINER" "$RESOLVER" "$DNS_NAME")
KILLSWITCH=$(echo "$KILLSWITCH_OUT" | grep "Deployed to" | awk '{print $3}')
cd "$ROOT_DIR"
echo "KillSwitch: $KILLSWITCH"
SETTER_REVOKED=$(cast calldata "setText(bytes,string,string)" 0x00 "shankh.revoked" "")
send "$RESOLVER" "grantSetterRoles(bytes,address)" "$SETTER_REVOKED" "$KILLSWITCH" >/dev/null

echo "-- 5. One-way door: revoke the operator's broad SET_TEXT -- IRREVERSIBLE --"
send "$RESOLVER" "revokeRootRoles(uint256,address)" "$RESOLVER_SET_TEXT_BITMAP" "$OPERATOR" >/dev/null

echo "-- 6. Prove the split --"
NODE=$(cast namehash "$FQDN")
INNER=$(cast calldata "text(bytes32,string)" "$NODE" "shankh.source")
echo "shankh.source via resolve(): $(cast abi-decode 'f()(string)' "$(call "$RESOLVER" "resolve(bytes,bytes)(bytes)" "$DNS_NAME" "$INNER")")"
echo "operator writing shankh.revoked directly (must revert):"
set +e
cast call "$RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.revoked" "forged" --from "$OPERATOR" --rpc-url "$RPC_URL" 2>&1 | tail -1
set -e

echo
echo "== DONE: $FQDN =="
echo "resolver:   $RESOLVER"
echo "KillSwitch: $KILLSWITCH"
