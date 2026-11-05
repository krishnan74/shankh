#!/usr/bin/env bash
# Dependency spike 1 (docs/plan.md): is ENSv2 root-role revocation ("emancipation")
# actually live on the Sepolia beta? This deploys a throwaway UserRegistry proxy via
# the live VerifiableFactory on Sepolia, grants the deployer the four "dangerous"
# roles (+ their admins), revokes them, and confirms isEmancipated() flips to true
# and that re-granting a role afterwards reverts (no admin role left to do it with).
#
# Does NOT register a real ENS name -- that needs the ETHRegistrar's commit/reveal
# flow and a priced registration, which is separate work (see docs/plan.md). This
# proves the emancipation mechanic itself works against the real deployed contracts.
#
# Requires: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, MAINTAINER_ADDRESS in .env.
# ABIs confirmed against the verified Sepolia source via Sourcify (sourcify.dev),
# 2026-11-06 -- see docs/feedback/ens.md for how that was fetched.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"

: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL in .env}"
: "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY in .env}"
: "${MAINTAINER_ADDRESS:?set MAINTAINER_ADDRESS in .env}"

# Sepolia ENSv2 deployment addresses (docs.ens.domains/learn/deployments#sepolia-ensv2)
VERIFIABLE_FACTORY=0xda70306c98e97ece36f997a21368e53298572991
USER_REGISTRY_IMPL=0x9bd8a88719068d09ecee662f36c0e3856708366a

# Dangerous roles + their admins: ROLE_SET_PARENT (1<<8), ROLE_UNREGISTER (1<<12),
# ROLE_SET_SUBREGISTRY (1<<20), ROLE_SET_RESOLVER (1<<24), each OR'd with role<<128.
DANGEROUS_BITMAP=6067283602861169418690707976451897384900759808

SALT=$RANDOM$RANDOM$RANDOM

echo "== ENSv2 Sepolia emancipation spike =="
echo "deployer: $MAINTAINER_ADDRESS"

echo
echo "-- 1. Encode initialize(Grant[]) granting the deployer the dangerous roles --"
INIT_DATA=$(cast calldata "initialize((address,uint256)[])" "[($MAINTAINER_ADDRESS,$DANGEROUS_BITMAP)]")
echo "calldata: $INIT_DATA"

echo
echo "-- 2. Deploy a UserRegistry proxy via the live VerifiableFactory --"
RECEIPT=$(cast send "$VERIFIABLE_FACTORY" "deployProxy(address,uint256,bytes)" \
  "$USER_REGISTRY_IMPL" "$SALT" "$INIT_DATA" \
  --rpc-url "$SEPOLIA_RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" --json)
TX_HASH=$(echo "$RECEIPT" | python3 -c "import json,sys; print(json.load(sys.stdin)['transactionHash'])")
echo "tx: $TX_HASH"

# ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)
# proxyAddress is the second indexed topic (topics[2]), left-padded to 32 bytes.
PROXY=$(echo "$RECEIPT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
for log in r['logs']:
    if log['address'].lower() == '$VERIFIABLE_FACTORY'.lower():
        topic = log['topics'][2]
        print('0x' + topic[-40:])
        break
")
echo "proxy deployed at: $PROXY"

echo
echo "-- 3. Confirm it starts NOT emancipated (dangerous roles are held) --"
cast call "$PROXY" "isEmancipated()(bool)" --rpc-url "$SEPOLIA_RPC_URL"

echo
echo "-- 4. Revoke the dangerous roles + their admins --"
cast send "$PROXY" "revokeRootRoles(uint256,address)" \
  "$DANGEROUS_BITMAP" "$MAINTAINER_ADDRESS" \
  --rpc-url "$SEPOLIA_RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY"

echo
echo "-- 5. Confirm isEmancipated() now reads true --"
cast call "$PROXY" "isEmancipated()(bool)" --rpc-url "$SEPOLIA_RPC_URL"

echo
echo "-- 6. Confirm re-granting now reverts (no admin role left to do it with) --"
set +e
cast send "$PROXY" "grantRootRoles(uint256,address)" "256" "$MAINTAINER_ADDRESS" \
  --rpc-url "$SEPOLIA_RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" 2>&1 | tail -5
set -e

echo
echo "Record the proxy address and tx hashes above in docs/feedback/ens.md and docs/plan.md."
