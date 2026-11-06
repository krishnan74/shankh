#!/usr/bin/env bash
# The real build, on real Sepolia. Replays scripts/ens/register-tree-fork-rehearsal.sh's exact
# sequence, which passed cleanly on an Anvil fork first (see docs/build-log.md, docs/feedback/ens.md
# items 2-3). Only two differences from the fork script: this waits a real 70s for the commitment
# to mature (no evm_increaseTime on a real node), and it never defaults to localhost.
#
# shankh.eth (real commit-reveal, costs ~8 MockUSDC + gas) -> pypi.shankh.eth (emancipated,
# IRREVERSIBLE) -> shankh-demo.pypi.shankh.eth (shankh.source scoped to the maintainer,
# shankh.revoked scoped to a fresh KillSwitch -- the SET_TEXT revoke in step 8 is a ONE-WAY DOOR).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"

: "${OPERATOR_PRIVATE_KEY:?set OPERATOR_PRIVATE_KEY in .env}"
: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
RPC_URL="$SEPOLIA_RPC_URL"

VERIFIABLE_FACTORY=0xda70306c98e97ece36f997a21368e53298572991
USER_REGISTRY_IMPL=0x9bd8a88719068d09ecee662f36c0e3856708366a
PERMISSIONED_RESOLVER_IMPL=0x115eb53f0c60696633855f90b138178fb40b2b2c
ETH_REGISTRAR=0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3
ETH_REGISTRY=0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4
MOCK_USDC=0x240b0316df57887dbbe58b586508b19e633a14aa

ALL_ROLES=7689318425915528602346510746714641020664294856475511023661983783428849471761
DANGEROUS_BITMAP=7237005577332262213973186563140405376786684291341514916453779499572452659456
RESOLVER_SET_TEXT_BITMAP=5444517870735015415413993718908291383312

OPERATOR=$(cast wallet address --private-key "$OPERATOR_PRIVATE_KEY")
EXPIRY=$(($(date +%s) + 315360000))
DNS_NAME=0x0b7368616e6b682d64656d6f0470797069067368616e6b680365746800 # shankh-demo.pypi.shankh.eth

retry() {
  # The public Sepolia RPC is occasionally flaky; retry a transient failure before giving up.
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

echo "== REAL SEPOLIA -- Operator: $OPERATOR =="
echo "== This registers shankh.eth for real and performs two irreversible steps (emancipation, resolver one-way door). =="

echo
echo "-- 0. Fund the operator with MockUSDC, approve ETHRegistrar --"
send "$MOCK_USDC" "mint(address,uint256)" "$OPERATOR" 10000000 >/dev/null
send "$MOCK_USDC" "approve(address,uint256)" "$ETH_REGISTRAR" 10000000 >/dev/null

echo
echo "-- 1. Deploy shankh.eth's own registry (a stock PermissionedRegistry) --"
INIT1=$(cast calldata "initialize((address,uint256)[])" "[($OPERATOR,$ALL_ROLES)]")
RECEIPT1=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$USER_REGISTRY_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT1")
SHANKH_REGISTRY=$(proxy_address "$RECEIPT1")
echo "shankh.eth registry: $SHANKH_REGISTRY"

echo
echo "-- 2. Commit-reveal register shankh.eth (real 70s wait, no time-travel on a real node) --"
SECRET=$(cast keccak "$(date +%s%N)-$RANDOM")
COMMITMENT=$(call "$ETH_REGISTRAR" "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)(bytes32)" \
  "shankh" "$OPERATOR" "$SECRET" "$SHANKH_REGISTRY" 0x0000000000000000000000000000000000000000 31536000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 2>&1 | tail -1)
send "$ETH_REGISTRAR" "commit(bytes32)" "$COMMITMENT" >/dev/null
echo "committed. waiting 70s for MIN_COMMITMENT_AGE (60s) to pass..."
sleep 70
send "$ETH_REGISTRAR" "register(string,address,bytes32,address,address,uint64,address,bytes32)" \
  "shankh" "$OPERATOR" "$SECRET" "$SHANKH_REGISTRY" 0x0000000000000000000000000000000000000000 31536000 \
  "$MOCK_USDC" 0x0000000000000000000000000000000000000000000000000000000000000000 >/dev/null
echo "registered. ETHRegistry.getSubregistry('shankh') = $(call "$ETH_REGISTRY" "getSubregistry(string)(address)" "shankh")"

echo
echo "-- 3. Deploy pypi.shankh.eth's registry, register it under shankh.eth --"
INIT2=$(cast calldata "initialize((address,uint256)[])" "[($OPERATOR,$ALL_ROLES)]")
RECEIPT2=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$USER_REGISTRY_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT2")
PYPI_REGISTRY=$(proxy_address "$RECEIPT2")
echo "pypi.shankh.eth registry: $PYPI_REGISTRY"
send "$SHANKH_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
  "pypi" "$OPERATOR" "$PYPI_REGISTRY" 0x0000000000000000000000000000000000000000 "$ALL_ROLES" "$EXPIRY" >/dev/null
send "$PYPI_REGISTRY" "setParent(address,string)" "$SHANKH_REGISTRY" "pypi" >/dev/null

echo
echo "-- 4. Emancipate pypi.shankh.eth -- IRREVERSIBLE --"
echo "isEmancipated before: $(call "$PYPI_REGISTRY" "isEmancipated()(bool)")"
send "$PYPI_REGISTRY" "revokeRootRoles(uint256,address)" "$DANGEROUS_BITMAP" "$OPERATOR" >/dev/null
echo "isEmancipated after:  $(call "$PYPI_REGISTRY" "isEmancipated()(bool)")"

echo
echo "-- 5. Confirm no admin role survives to undo the emancipation (expected revert) --"
set +e
cast send "$PYPI_REGISTRY" "grantRootRoles(uint256,address)" "$DANGEROUS_BITMAP" "$OPERATOR" --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" 2>&1 | tail -3
set -e

echo
echo "-- 6. Deploy shankh-demo's resolver, register shankh-demo.pypi.shankh.eth --"
INIT3=$(cast calldata "initialize((address,uint256)[],bytes[])" "[($OPERATOR,$RESOLVER_SET_TEXT_BITMAP)]" "[]")
RECEIPT3=$(send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" "$PERMISSIONED_RESOLVER_IMPL" "$RANDOM$RANDOM$RANDOM" "$INIT3")
PACKAGE_RESOLVER=$(proxy_address "$RECEIPT3")
echo "shankh-demo resolver: $PACKAGE_RESOLVER"
send "$PYPI_REGISTRY" "register(string,address,address,address,uint256,uint64)" \
  "shankh-demo" "$OPERATOR" 0x0000000000000000000000000000000000000000 "$PACKAGE_RESOLVER" 0 "$EXPIRY" >/dev/null

echo
echo "-- 7. Scope shankh.source to the maintainer, write it, scope shankh.revoked to a fresh KillSwitch --"
SETTER_SOURCE=$(cast calldata "setText(bytes,string,string)" 0x00 "shankh.source" "")
send "$PACKAGE_RESOLVER" "grantSetterRoles(bytes,address)" "$SETTER_SOURCE" "$OPERATOR" >/dev/null
send "$PACKAGE_RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.source" "https://github.com/krishnan74/shankh" >/dev/null

cd "$ROOT_DIR/contracts"
KILLSWITCH_OUT=$(forge create --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --broadcast \
  src/KillSwitch.sol:KillSwitch --constructor-args "$OPERATOR" "$PACKAGE_RESOLVER" "$DNS_NAME")
KILLSWITCH=$(echo "$KILLSWITCH_OUT" | grep "Deployed to" | awk '{print $3}')
cd "$ROOT_DIR"
echo "KillSwitch (shankh-demo): $KILLSWITCH"

SETTER_REVOKED=$(cast calldata "setText(bytes,string,string)" 0x00 "shankh.revoked" "")
send "$PACKAGE_RESOLVER" "grantSetterRoles(bytes,address)" "$SETTER_REVOKED" "$KILLSWITCH" >/dev/null

echo
echo "-- 8. One-way door: revoke the operator's own broad SET_TEXT on the resolver -- IRREVERSIBLE --"
send "$PACKAGE_RESOLVER" "revokeRootRoles(uint256,address)" "$RESOLVER_SET_TEXT_BITMAP" "$OPERATOR" >/dev/null

echo
echo "-- 9. Confirm the split: operator keeps shankh.source, loses shankh.revoked --"
echo "operator rewriting shankh.source (should succeed, scoped grant survives the root revoke):"
send "$PACKAGE_RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.source" "https://github.com/krishnan74/shankh" >/dev/null && echo "  ok"
echo "operator writing shankh.revoked directly (should revert):"
set +e
cast send "$PACKAGE_RESOLVER" "setText(bytes,string,string)" "$DNS_NAME" "shankh.revoked" "fake" --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" 2>&1 | tail -3
set -e

echo
echo "-- 10. KillSwitch.revoke() syncs shankh.revoked for real (demo artifact hash, clearly labeled) --"
DEMO_SHA=$(cast keccak "shankh-demo-placeholder-incident")
send "$KILLSWITCH" "revoke(bytes32)" "$DEMO_SHA" >/dev/null
NODE=$(cast namehash "shankh-demo.pypi.shankh.eth")
INNER=$(cast calldata "text(bytes32,string)" "$NODE" "shankh.revoked")
RAW=$(call "$PACKAGE_RESOLVER" "resolve(bytes,bytes)(bytes)" "$DNS_NAME" "$INNER")
echo "shankh.revoked (via resolve()): $RAW"

echo
echo "== DONE. Record these in docs/evidence.md and CLAUDE.md's Live table: =="
echo "shankh.eth registry:    $SHANKH_REGISTRY"
echo "pypi.shankh.eth registry: $PYPI_REGISTRY"
echo "shankh-demo resolver:    $PACKAGE_RESOLVER"
echo "KillSwitch (shankh-demo): $KILLSWITCH"
