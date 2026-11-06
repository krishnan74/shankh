/** The top bar's "LIVE" chip needs something that changes every request to prove it's not a
 * static screenshot -- the current Sepolia block number, read fresh, is that proof. */
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export type LiveBlockInfo = { blockNumber: bigint };

export async function latestBlockInfo(): Promise<LiveBlockInfo | null> {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) return null;
  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const blockNumber = await client.getBlockNumber();
  return { blockNumber };
}
