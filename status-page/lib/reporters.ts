/**
 * Every reporter under reporters.shankh.eth, read live -- the same names `shankh scan --trust`
 * resolves. Found the way the CLI finds them: shankh.eth's registry -> getSubregistry("reporters")
 * -> the reporters registry's own LabelRegistered events -> each label's resolver ->
 * its `shankh.signer` text record (writable only by that reporter). Nothing is hard-coded: a
 * reporter registered a minute ago shows up on the next request.
 */
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { sepolia } from "viem/chains";
import { readText } from "./ens";

const ABI = [
  { type: "function", name: "getSubregistry", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getResolver", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "address" }] },
] as const;

const LABEL_REGISTERED = parseAbiItem(
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
);
// No reporter can predate pypi.shankh.eth's first event; reporters.shankh.eth came later.
const FROM_BLOCK = BigInt(12073919);
const ZERO = "0x0000000000000000000000000000000000000000";

export type Reporter = { name: string; signer: Address };

export async function trustedReporters(): Promise<Reporter[] | null> {
  const shankhRegistry = process.env.ENS_REGISTRY_ADDRESS as Address | undefined;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!shankhRegistry || !rpcUrl) return null;

  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const registry = await client.readContract({ address: shankhRegistry, abi: ABI, functionName: "getSubregistry", args: ["reporters"] });
  if (registry === ZERO) return [];

  const logs = await client.getLogs({ address: registry, event: LABEL_REGISTERED, fromBlock: FROM_BLOCK, toBlock: "latest" });
  const labels = [...new Set(logs.map((log) => log.args.label).filter((l): l is string => Boolean(l)))];
  const reporters = await Promise.all(
    labels.map(async (label) => {
      const resolver = await client.readContract({ address: registry, abi: ABI, functionName: "getResolver", args: [label] });
      if (resolver === ZERO) return null;
      const name = `${label}.reporters.shankh.eth`;
      const signer = (await readText(resolver, name, "shankh.signer")).trim();
      return /^0x[0-9a-fA-F]{40}$/.test(signer) ? { name, signer: signer as Address } : null;
    }),
  );
  return reporters.filter((r): r is Reporter => r !== null);
}
