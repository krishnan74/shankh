#!/usr/bin/env bash
# Gives a reporter an ENS identity: <label>.reporters.shankh.eth, whose `shankh.signer` text record
# holds the wallet that signs their Arkiv reports. `shankh scan --trust <name>` resolves that
# record and then only acts on Arkiv reports that wallet actually signed.
#
# The first run also creates reporters.shankh.eth itself, EMANCIPATED exactly like
# pypi.shankh.eth (register-tree-sepolia.sh step 4): if we could later point a reporter's name at
# a resolver with a different signer, everyone trusting that name would silently trust us instead.
# Each reporter then gets:
#   - their own PermissionedResolver, registered with role bitmap 0 (the holder can't swap it)
#   - shankh.signer set, then writable ONLY by the signer themselves (key-scoped setter grant)
#   - the operator's broad SET_TEXT revoked afterwards -- a ONE-WAY DOOR
#
# Usage: scripts/ens/add-reporter-sepolia.sh <label> <signer-address>
set -euo pipefail

LABEL="${1:?usage: add-reporter-sepolia.sh <label> <signer-address>}"
SIGNER="${2:?usage: add-reporter-sepolia.sh <label> <signer-address>}"
[[ "$LABEL" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] || { echo "label must be lowercase a-z, 0-9, hyphens: $LABEL" >&2; exit 1; }
[[ "$SIGNER" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "signer must be a 0x address: $SIGNER" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
: "${OPERATOR_PRIVATE_KEY:?set OPERATOR_PRIVATE_KEY in .env}"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
RPC_URL="$SEPOLIA_RPC_URL"

VERIFIABLE_FACTORY=0xda70306c98e97ece36f997a21368e53298572991
USER_REGISTRY_IMPL=0x9bd8a88719068d09ecee662f36c0e3856708366a
PERMISSIONED_RESOLVER_IMPL=0x115eb53f0c60696633855f90b138178fb40b2b2c
SHANKH_REGISTRY=0xb95110b3F8d89fb8e9858fC414E21475DA4DF15c
ALL_ROLES=7689318425915528602346510746714641020664294856475511023661983783428849471761
DANGEROUS_BITMAP=7237005577332262213973186563140405376786684291341514916453779499572452659456
RESOLVER_SET_TEXT_BITMAP=5444517870735015415413993718908291383312
ZERO=0x0000000000000000000000000000000000000000

OPERATOR=$(cast wallet address --private-key "$OPERATOR_PRIVATE_KEY")
EXPIRY=$(($(date +%s) + 315360000))
FQDN="$LABEL.reporters.shankh.eth"
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
# With --json, cast puts its error into the captured output -- surface it on failure instead of
# letting a failed transaction exit the script silently.
_send() {
  local out
  if out=$(cast send "$@" --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --json 2>&1); then
    echo "$out"
  else
    echo "  cast send failed: ${out:0:300}" >&2
    return 1
  fi
}
send() { retry _send "$@"; }
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

echo "== $FQDN -> signer $SIGNER (operator $OPERATOR) =="

REPORTERS_REGISTRY=$(call "$SHANKH_REGISTRY" "getSubregistry(string)(address)" "reporters")
if [ "$REPORTERS_REGISTRY" = "$ZERO" ]; then
  echo "-- A. Create reporters.shankh.eth (first run only) --"
  INIT=$(cast calldata "initialize((address,uint256)[])" "[($OPERATOR,$ALL_ROLES)]")
  RECEIPT=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$USER_REGISTRY_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT")
  REPORTERS_REGISTRY=$(proxy_address "$RECEIPT")
  send "$SHANKH_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
    "reporters" "$OPERATOR" "$REPORTERS_REGISTRY" "$ZERO" "$ALL_ROLES" "$EXPIRY" >/dev/null
  send "$REPORTERS_REGISTRY" "setParent(address,string)" "$SHANKH_REGISTRY" "reporters" >/dev/null
  echo "-- B. Emancipate reporters.shankh.eth -- IRREVERSIBLE --"
  send "$REPORTERS_REGISTRY" "revokeRootRoles(uint256,address)" "$DANGEROUS_BITMAP" "$OPERATOR" >/dev/null
  sleep 3 # public RPC read-after-write lag (see docs/build-log.md) -- don't trust an immediate re-read
fi
echo "reporters.shankh.eth registry: $REPORTERS_REGISTRY (isEmancipated: $(call "$REPORTERS_REGISTRY" "isEmancipated()(bool)"))"

if [ "$(call "$REPORTERS_REGISTRY" "getResolver(string)(address)" "$LABEL")" != "$ZERO" ]; then
  echo "$FQDN is already registered -- nothing to do." >&2
  exit 1
fi

echo "-- 1. The reporter's own resolver --"
INIT=$(cast calldata "initialize((address,uint256)[],bytes[])" "[($OPERATOR,$RESOLVER_SET_TEXT_BITMAP)]" "[]")
RECEIPT=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$PERMISSIONED_RESOLVER_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT")
RESOLVER=$(proxy_address "$RECEIPT")
echo "resolver: $RESOLVER"

echo "-- 2. Register $LABEL (role bitmap 0) --"
send "$REPORTERS_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
  "$LABEL" "$SIGNER" "$ZERO" "$RESOLVER" 0 "$EXPIRY" >/dev/null

echo "-- 3. Set shankh.signer, then make it writable only by the signer --"
send "$RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.signer" "$SIGNER" >/dev/null
SETTER=$(cast calldata "setText(bytes,string,string)" 0x00 "shankh.signer" "")
send "$RESOLVER" "grantSetterRoles(bytes,address)" "$SETTER" "$SIGNER" >/dev/null

echo "-- 4. One-way door: revoke the operator's broad SET_TEXT -- IRREVERSIBLE --"
send "$RESOLVER" "revokeRootRoles(uint256,address)" "$RESOLVER_SET_TEXT_BITMAP" "$OPERATOR" >/dev/null

echo "-- 5. Read it back --"
NODE=$(cast namehash "$FQDN")
INNER=$(cast calldata "text(bytes32,string)" "$NODE" "shankh.signer")
echo "shankh.signer via resolve(): $(cast abi-decode 'f()(string)' "$(call "$RESOLVER" "resolve(bytes,bytes)(bytes)" "$DNS_NAME" "$INNER")")"

echo
echo "== DONE: $FQDN =="
echo "reporters registry: $REPORTERS_REGISTRY"
echo "resolver:           $RESOLVER"
