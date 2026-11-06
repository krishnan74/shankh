#!/usr/bin/env bash
# Rehearsal for docs/plan.md's ENS name hierarchy, against a LOCAL ANVIL FORK of Sepolia --
# never the real chain. Per plan-2.md's own warning ("mistakes can't be fixed, so rehearse the
# setup on a fork first") and ensv2-guide.md's irreversibility notes (emancipation, the resolver
# one-way door).
#
# Builds: shankh.eth (commit-reveal) -> pypi.shankh.eth (emancipated) ->
# shankh-demo.pypi.shankh.eth (one resolver, shankh.source writable by the maintainer only via a
# scoped grant, shankh.revoked writable only by a freshly-deployed per-package KillSwitch).
#
# Addresses and role-bit values below were pulled from docs.ens.domains/learn/deployments and
# verified against the live Sepolia beta's own source via Sourcify (2026-11-06) -- see
# docs/feedback/ens.md. They are NOT guessed from the ensv2-guide.md prose.
#
# Usage: start `anvil --fork-url $SEPOLIA_RPC_URL --port 8551` in another terminal first, then:
#   scripts/ens/register-tree-fork-rehearsal.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"

: "${OPERATOR_PRIVATE_KEY:?set OPERATOR_PRIVATE_KEY in .env}"
RPC_URL="${1:-http://127.0.0.1:8551}"

VERIFIABLE_FACTORY=0xda70306c98e97ece36f997a21368e53298572991
USER_REGISTRY_IMPL=0x9bd8a88719068d09ecee662f36c0e3856708366a
PERMISSIONED_RESOLVER_IMPL=0x115eb53f0c60696633855f90b138178fb40b2b2c
ETH_REGISTRAR=0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3
ETH_REGISTRY=0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4
MOCK_USDC=0x240b0316df57887dbbe58b586508b19e633a14aa

# Registry roles+admins, from RegistryRolesLib.sol (verified source, not prose):
# ALL_ROLES = every registry role + its admin, for a registry WE deploy and bootstrap.
ALL_ROLES=7689318425915528602346510746714641020664294856475511023661983783428849471761
# DANGEROUS_BITMAP = the real UNEMANCIPATED_ROLE_BITMAP's components (SET_SUBREGISTRY,
# SET_RESOLVER, UNREGISTER, UPGRADE, CAN_TRANSFER_ADMIN + their admins) PLUS SET_PARENT+ADMIN for
# defense in depth (plan-2.md's original list) -- spike 1 revoked only SET_PARENT/UNREGISTER/
# SET_SUBREGISTRY/SET_RESOLVER and missed UPGRADE/CAN_TRANSFER_ADMIN entirely; this is corrected.
DANGEROUS_BITMAP=7237005577332262213973186563140405376786684291341514916453779499572452659456
# Resolver roles, from PermissionedResolverLib.sol: SET_TEXT (1<<4) | SET_TEXT_ADMIN.
RESOLVER_SET_TEXT_BITMAP=5444517870735015415413993718908291383312

OPERATOR=$(cast wallet address --private-key "$OPERATOR_PRIVATE_KEY")
EXPIRY=$(($(date +%s) + 315360000)) # ~10 years out
DNS_NAME=0x0b7368616e6b682d64656d6f0470797069067368616e6b680365746800 # shankh-demo.pypi.shankh.eth

send() { cast send "$@" --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" --json; }
call() { cast call "$@" --rpc-url "$RPC_URL"; }
proxy_address() {
  # $1 = the tx receipt JSON from a deployProxy send; extracts ProxyDeployed's proxyAddress topic.
  echo "$1" | python3 -c "
import json, sys
r = json.load(sys.stdin)
for log in r['logs']:
    if log['address'].lower() == '$VERIFIABLE_FACTORY'.lower():
        print('0x' + log['topics'][2][-40:])
        break
"
}

echo "== Operator: $OPERATOR =="

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
echo "-- 2. Commit-reveal register shankh.eth --"
SECRET=$(cast keccak "$(date +%s%N)-$RANDOM")
COMMITMENT=$(call "$ETH_REGISTRAR" "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)(bytes32)" \
  "shankh" "$OPERATOR" "$SECRET" "$SHANKH_REGISTRY" 0x0000000000000000000000000000000000000000 31536000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 2>&1 | tail -1)
send "$ETH_REGISTRAR" "commit(bytes32)" "$COMMITMENT" >/dev/null
cast rpc evm_increaseTime 65 --rpc-url "$RPC_URL" >/dev/null
cast rpc evm_mine --rpc-url "$RPC_URL" >/dev/null
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
echo "-- 4. Emancipate pypi.shankh.eth (corrected bitmap incl. UPGRADE/CAN_TRANSFER_ADMIN) --"
echo "isEmancipated before: $(call "$PYPI_REGISTRY" "isEmancipated()(bool)")"
send "$PYPI_REGISTRY" "revokeRootRoles(uint256,address)" "$DANGEROUS_BITMAP" "$OPERATOR" >/dev/null
echo "isEmancipated after:  $(call "$PYPI_REGISTRY" "isEmancipated()(bool)")"

echo
echo "-- 5. Confirm no admin role survives to undo the emancipation --"
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
echo "-- 8. One-way door: revoke the operator's own broad SET_TEXT on the resolver --"
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
echo "-- 10. KillSwitch.revoke() syncs shankh.revoked for real --"
FAKE_SHA=$(cast keccak "rogue-wheel-rehearsal")
send "$KILLSWITCH" "revoke(bytes32)" "$FAKE_SHA" >/dev/null
# Direct text() reverts on a factory-deployed resolver (ensv2-guide.md section 6) -- read via the
# real ENSIP-10 path instead: resolve(dnsName, abi.encode(text(node, key))).
NODE=$(cast namehash "shankh-demo.pypi.shankh.eth")
INNER=$(cast calldata "text(bytes32,string)" "$NODE" "shankh.revoked")
RAW=$(call "$PACKAGE_RESOLVER" "resolve(bytes,bytes)(bytes)" "$DNS_NAME" "$INNER")
echo "shankh.revoked (via resolve()): $RAW"

echo
echo "Rehearsal complete. Record SHANKH_REGISTRY/PYPI_REGISTRY/PACKAGE_RESOLVER/KILLSWITCH addresses and this script's steps in docs/plan.md before replaying against real Sepolia."
