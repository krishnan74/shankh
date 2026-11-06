/**
 * Reads a package's resolver text records live off Sepolia, through the real ENSIP-10 resolve()
 * path -- a direct text() call reverts on these factory-deployed resolvers (see ensv2-guide.md
 * section 6), exactly as scripts/ens/register-tree-sepolia.sh step 10 proved out with `cast`.
 * This reimplements that same two-call shape (namehash + inner text() calldata, wrapped in an
 * outer resolve() call) with viem directly, since a Vercel function has no `cast` binary.
 *
 * Wired for the one real package this ENS tree covers so far (shankh-demo.pypi.shankh.eth, see
 * docs/evidence.md) via PACKAGE_RESOLVER_ADDRESS / PACKAGE_DNS_ENCODED_NAME env vars.
 */
import { createPublicClient, decodeAbiParameters, encodeFunctionData, http, keccak256, toHex, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

const RESOLVER_ABI = [
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [{ type: "bytes" }, { type: "bytes" }],
    outputs: [{ type: "bytes" }],
  },
] as const;

const TEXT_ABI = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "string" }],
    outputs: [{ type: "string" }],
  },
] as const;

/** The standard ENS namehash algorithm -- recursive keccak256 over dot-separated labels. */
function namehash(name: string): Hex {
  let node: Hex = `0x${"00".repeat(32)}`;
  for (const label of name.split(".").reverse()) {
    node = keccak256(`${node}${keccak256(toHex(label)).slice(2)}`);
  }
  return node;
}

export type PackageEnsInfo = {
  resolver: Address;
  source: string | null;
  revokedArtifacts: string[];
};

async function textRecord(fqdn: string, key: string): Promise<string | null> {
  const resolver = process.env.PACKAGE_RESOLVER_ADDRESS as Address | undefined;
  const dnsName = process.env.PACKAGE_DNS_ENCODED_NAME as Hex | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!resolver || !dnsName || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const inner = encodeFunctionData({ abi: TEXT_ABI, functionName: "text", args: [namehash(fqdn), key] });
  const raw = await client.readContract({ address: resolver, abi: RESOLVER_ABI, functionName: "resolve", args: [dnsName, inner] });
  const [value] = decodeAbiParameters([{ type: "string" }], raw);
  return value;
}

/** shankh-demo.pypi.shankh.eth's live shankh.source / shankh.revoked text records, read fresh. */
export async function packageEnsInfo(fqdn = "shankh-demo.pypi.shankh.eth"): Promise<PackageEnsInfo | null> {
  const resolver = process.env.PACKAGE_RESOLVER_ADDRESS as Address | undefined;
  if (!resolver) return null;

  const [source, revoked] = await Promise.all([
    textRecord(fqdn, "shankh.source"),
    textRecord(fqdn, "shankh.revoked"),
  ]);

  return {
    resolver,
    source,
    revokedArtifacts: revoked ? revoked.split(",").map((h) => h.trim()).filter(Boolean) : [],
  };
}
