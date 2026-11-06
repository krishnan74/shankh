/**
 * Reads shankh.report entities from the live Arkiv testnet. Mirrors arkiv/src/schema.ts's
 * ShankhReport definition -- duplicated here rather than shared across packages to keep the
 * status page a standalone deployable app for this hackathon's timeframe. Keep the two in sync
 * by hand if the schema changes.
 */
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { desc } from "@arkiv-network/sdk/query";
import { addr, bool, bytes, defineSchema, str } from "@arkiv-network/sdk/schema";
import { http, hexToString } from "viem";

const ShankhReport = defineSchema("shankh.report", {
  package: str().indexed(),
  version: str().indexed(),
  tier: str().indexed(),
  malicious: bool().indexed(),
  reporter: addr().indexed(),
  findings: bytes(),
  artifactSha256: str().indexed(),
  ensRevoked: bool().indexed(),
});

export type Report = {
  key: string;
  package: string;
  version: string;
  tier: string;
  malicious: boolean;
  /** The self-declared `reporter` attribute -- anyone can write any address here. Display only. */
  reporter: string;
  /** The wallet that actually signed the entity, recorded by Arkiv itself. This is the one to trust. */
  creator: string;
  findings: { relativePath: string; tier: string }[];
  artifactSha256: string;
  ensRevoked: boolean;
};

export async function recentReports(limit = 20): Promise<Report[]> {
  const rpcUrl = process.env.ARKIV_RPC_URL;
  if (!rpcUrl) return [];

  const client = createPublicClient({
    chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }),
    transport: http(rpcUrl),
  });

  // Newest first. $createdAt can't be sorted on, but every report is written with the same 90-day
  // lifetime, so sorting by $expiresAt descending is newest-written first -- the same ordering
  // `shankh scan` uses (arkiv/src/report.ts). Without it the hero's "latest alarm" was just
  // whichever entity Arkiv happened to return first.
  // Two queries, not one: selecting artifactSha256/ensRevoked makes Arkiv return only entities
  // that HAVE those attributes, which silently drops every report written before they were added
  // to the schema (verified: 3 entities with the base select, 0 when the new columns are selected).
  // So: fetch everything on the base columns, then merge the newer columns in where they exist.
  const [page, extras] = await Promise.all([
    client
      .select({ $key: true, $creator: true, package: true, version: true, tier: true, malicious: true, reporter: true, findings: true })
      .from(ShankhReport)
      .orderBy(desc("$expiresAt"))
      .limit(limit)
      .fetch(),
    client
      .select({ $key: true, artifactSha256: true, ensRevoked: true })
      .from(ShankhReport)
      .orderBy(desc("$expiresAt"))
      .limit(limit)
      .fetch()
      .catch(() => null),
  ]);
  const extraByKey = new Map((extras?.entities ?? []).map((e) => [e.$key, e]));

  return page.entities.map((entity) => {
    const extra = extraByKey.get(entity.$key);
    return {
      key: entity.$key,
      package: entity.package.value,
      version: entity.version.value,
      tier: entity.tier.value,
      malicious: entity.malicious.value,
      reporter: entity.reporter.value,
      creator: entity.$creator ?? "",
      findings: JSON.parse(hexToString(entity.findings.value)) as { relativePath: string; tier: string }[],
      artifactSha256: extra?.artifactSha256.value ?? "",
      ensRevoked: extra?.ensRevoked.value ?? false,
    };
  });
}
