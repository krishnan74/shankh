/**
 * Reads pypi.shankh.eth's registry live -- specifically isEmancipated(), the one boolean that
 * backs the "we gave up the power to seize this" claim. The address itself is a fixed deployment
 * reference (like KILLSWITCH_ADDRESS) -- what has to be live is the fact being asserted about it,
 * not the address. See scripts/ens/register-tree-sepolia.sh step 4 for how this was set, and
 * docs/evidence.md for the one-time confirmation this reproduces on every request.
 */
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { sepolia } from "viem/chains";
import { readText } from "./ens";

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

const RESOLVER_LOOKUP_ABI = [
  { type: "function", name: "getResolver", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "address" }] },
] as const;

// Indexed: tokenId, labelHash, sender. Data: (label, owner, expiry) -- confirmed by decoding the
// real shankh-demo registration on Sepolia (see shankh/shankh/ens/__init__.py).
const LABEL_REGISTERED = parseAbiItem(
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
);
// pypi.shankh.eth's registry emitted its first event here; no package can predate it.
const REGISTRY_FROM_BLOCK = BigInt(12073919);
const ZERO = "0x0000000000000000000000000000000000000000";

export type RegistryPackage = {
  name: string; // e.g. shankh-demo.pypi.shankh.eth
  resolver: Address;
  flagged: string[]; // build fingerprints in shankh.revoked
};

/**
 * Every package under pypi.shankh.eth, each with its live bad-builds list -- the same sweep
 * `shankh scan` does. Package names come from the registry's own LabelRegistered events and each
 * resolver from getResolver(label), so nothing here is a hard-coded list: a package registered
 * a minute ago shows up on the next request.
 */
export async function registryPackages(): Promise<RegistryPackage[] | null> {
  const address = process.env.PYPI_REGISTRY_ADDRESS as Address | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!address || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const logs = await client.getLogs({ address, event: LABEL_REGISTERED, fromBlock: REGISTRY_FROM_BLOCK, toBlock: "latest" });
  const labels = [...new Set(logs.map((log) => log.args.label).filter((l): l is string => Boolean(l)))];

  const packages = await Promise.all(
    labels.map(async (label) => {
      const resolver = await client.readContract({ address, abi: RESOLVER_LOOKUP_ABI, functionName: "getResolver", args: [label] });
      if (resolver === ZERO) return null; // registered once, no longer resolves
      const name = `${label}.pypi.shankh.eth`;
      const revoked = await readText(resolver, name, "shankh.revoked");
      return { name, resolver, flagged: revoked.split(",").map((h) => h.trim()).filter(Boolean) };
    }),
  );
  return packages.filter((p): p is RegistryPackage => p !== null);
}
