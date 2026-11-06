/**
 * Reads pypi.shankh.eth's registry live -- specifically isEmancipated(), the one boolean that
 * backs the "we gave up the power to seize this" claim. The address itself is a fixed deployment
 * reference (like KILLSWITCH_ADDRESS) -- what has to be live is the fact being asserted about it,
 * not the address. See scripts/ens/register-tree-sepolia.sh step 4 for how this was set, and
 * docs/evidence.md for the one-time confirmation this reproduces on every request.
 */
import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";

const REGISTRY_ABI = [
  { type: "function", name: "isEmancipated", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export type RegistryInfo = { address: Address; emancipated: boolean };

export async function pypiRegistryInfo(): Promise<RegistryInfo | null> {
  const address = process.env.PYPI_REGISTRY_ADDRESS as Address | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!address || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const emancipated = await client.readContract({ address, abi: REGISTRY_ABI, functionName: "isEmancipated" });
  return { address, emancipated };
}

/** shankh.eth's own registry address -- a fixed reference, displayed but not re-queried (it has
 * no boolean claim attached the way pypi.shankh.eth's emancipation does). */
export function shankhRegistryAddress(): Address | null {
  return (process.env.ENS_REGISTRY_ADDRESS as Address | undefined) ?? null;
}
