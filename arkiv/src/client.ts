/**
 * Shared Arkiv client setup for Shankh. Not wired up yet — see docs/plan.md Status table.
 * RPC and chain ID come from .env; see .env.example at the repo root.
 */

export function getArkivConfig() {
  const rpcUrl = process.env.ARKIV_RPC_URL;
  const chainId = process.env.ARKIV_CHAIN_ID;
  if (!rpcUrl || !chainId) {
    throw new Error("ARKIV_RPC_URL and ARKIV_CHAIN_ID must be set — see .env.example");
  }
  return { rpcUrl, chainId: Number(chainId) };
}
