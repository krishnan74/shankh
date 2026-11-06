/**
 * Re-runs the two "attack attempts" against live Sepolia state on every request, as eth_call
 * simulations from the deploying operator's address, and returns whatever actually happens.
 *
 * Why simulate instead of quoting the deploy log: the original attempts in
 * scripts/ens/register-tree-sepolia.sh reverted at gas estimation, so no transaction was ever
 * mined and there is no tx hash to link. A simulation is the honest equivalent -- it executes the
 * exact call against current chain state and reports the real outcome, fresh each page load. If
 * either call ever STOPS reverting, this returns outcome "succeeded" and the page says so loudly
 * instead of showing a stale revert string.
 */
import { BaseError, ContractFunctionRevertedError, createPublicClient, http, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

// The exact bitmap revoked during emancipation (scripts/ens/register-tree-sepolia.sh, DANGEROUS_BITMAP).
const DANGEROUS_BITMAP = BigInt("7237005577332262213973186563140405376786684291341514916453779499572452659456");

const EAC_ERRORS = [
  {
    type: "error",
    name: "EACCannotGrantRoles",
    inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
  },
  {
    type: "error",
    name: "EACUnauthorizedAccountRoles",
    inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
  },
] as const;

const REGISTRY_ABI = [
  ...EAC_ERRORS,
  {
    type: "function",
    name: "grantRootRoles",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const RESOLVER_ABI = [
  ...EAC_ERRORS,
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [{ type: "bytes" }, { type: "string" }, { type: "string" }],
    outputs: [],
  },
] as const;

export type ProofOutcome =
  | { outcome: "reverted"; error: string }
  | { outcome: "succeeded" }
  | { outcome: "unavailable" };

function describeRevert(err: unknown): ProofOutcome {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      const args = (revert.data.args ?? []).map((a) => String(a)).join(", ");
      return { outcome: "reverted", error: `${revert.data.errorName}(${args})` };
    }
  }
  return { outcome: "unavailable" };
}

export async function attackProofs(operator: Address): Promise<{ regrant: ProofOutcome; writeRevoked: ProofOutcome }> {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const registry = process.env.PYPI_REGISTRY_ADDRESS as Address | undefined;
  const resolver = process.env.PACKAGE_RESOLVER_ADDRESS as Address | undefined;
  const dnsName = process.env.PACKAGE_DNS_ENCODED_NAME as Hex | undefined;
  if (!rpcUrl || !registry || !resolver || !dnsName) {
    return { regrant: { outcome: "unavailable" }, writeRevoked: { outcome: "unavailable" } };
  }
  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

  const run = async (fn: () => Promise<unknown>): Promise<ProofOutcome> => {
    try {
      await fn();
      return { outcome: "succeeded" };
    } catch (err) {
      return describeRevert(err);
    }
  };

  const [regrant, writeRevoked] = await Promise.all([
    run(() =>
      client.simulateContract({
        account: operator,
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "grantRootRoles",
        args: [DANGEROUS_BITMAP, operator],
      }),
    ),
    run(() =>
      client.simulateContract({
        account: operator,
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: "setText",
        args: [dnsName, "shankh.revoked", "attacker-was-here"],
      }),
    ),
  ]);

  return { regrant, writeRevoked };
}
