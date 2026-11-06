/**
 * Shared Arkiv client setup for Shankh. RPC, chain ID, and keys come from .env — see
 * .env.example at the repo root. `ARKIV_ACCESS_KEY` is not a secret (it ships client-side on
 * the status page too); `ARKIV_WALLET_PRIVATE_KEY` is testnet-only and must never be committed.
 */
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export function getArkivConfig() {
  const rpcUrl = process.env.ARKIV_RPC_URL;
  const chainId = process.env.ARKIV_CHAIN_ID;
  if (!rpcUrl || !chainId) {
    throw new Error("ARKIV_RPC_URL and ARKIV_CHAIN_ID must be set — see .env.example");
  }
  return { rpcUrl, chainId: Number(chainId), accessKey: process.env.ARKIV_ACCESS_KEY ?? "" };
}

/** A read-only client — no private key needed. Used by the status page and by readers. */
export function arkivPublicClient() {
  const { rpcUrl, accessKey } = getArkivConfig();
  return createPublicClient({
    chain: rabdi({ accessKey }),
    transport: http(rpcUrl),
  });
}

/** A client that can write entities. Requires ARKIV_WALLET_PRIVATE_KEY. */
export function arkivWalletClient() {
  const { rpcUrl, accessKey } = getArkivConfig();
  const privateKey = process.env.ARKIV_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ARKIV_WALLET_PRIVATE_KEY must be set to write entities — see .env.example");
  }
  return createWalletClient({
    account: privateKeyToAccount(privateKey as `0x${string}`),
    chain: rabdi({ accessKey }),
    transport: http(rpcUrl),
  });
}
