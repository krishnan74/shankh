/**
 * Reads the live KillSwitch contract on Sepolia. See contracts/src/KillSwitch.sol -- the ABI
 * below is only the three read functions this page needs, not the full contract.
 */
import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";

const KILLSWITCH_ABI = [
  { type: "function", name: "maintainer", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "revoked",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export type KillSwitchInfo = {
  address: Address;
  maintainer: Address;
};

export async function killSwitchInfo(): Promise<KillSwitchInfo | null> {
  const address = process.env.KILLSWITCH_ADDRESS as Address | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!address || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const maintainer = await client.readContract({
    address,
    abi: KILLSWITCH_ABI,
    functionName: "maintainer",
  });
  return { address, maintainer };
}

/** sha256, as a 0x-prefixed bytes32 hex string, of the artifact to check -- e.g. a package tarball's hash. */
export async function isRevoked(artifactSha256: `0x${string}`): Promise<boolean | null> {
  const address = process.env.KILLSWITCH_ADDRESS as Address | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!address || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  return client.readContract({
    address,
    abi: KILLSWITCH_ABI,
    functionName: "revoked",
    args: [artifactSha256],
  });
}
