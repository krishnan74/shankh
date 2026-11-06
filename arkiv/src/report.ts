/**
 * Writes and reads shankh.report entities. This is the alarm the thesis depends on: the first
 * machine to verify package@version writes one of these, signed by its own wallet (not the
 * publisher's, which is exactly what a compromised publisher can't suppress); every other
 * machine running the same version can read it back instead of re-running its own rebuild.
 */
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, bool, bytes, str } from "@arkiv-network/sdk/schema";
import { and, desc, eq } from "@arkiv-network/sdk/query";
import { hexToString, stringToHex, type Hex } from "viem";

import { arkivPublicClient, arkivWalletClient } from "./client.ts";
import { ShankhReport } from "./schema.ts";

export type VerificationFinding = { relativePath: string; tier: string };

export type VerificationReport = {
  package: string;
  version: string;
  tier: string;
  malicious: boolean;
  findings: VerificationFinding[];
  artifactSha256?: string;
  ensRevoked?: boolean;
};

/** How long a report stays live on Arkiv before it needs renewing. See docs/plan.md spike 3 for the ceiling this bumps against. */
const REPORT_LIFETIME_DAYS = 90;

export async function writeReport(report: VerificationReport) {
  const client = arkivWalletClient();
  return client.createEntity(
    ShankhReport,
    {
      package: str(report.package),
      version: str(report.version),
      tier: str(report.tier),
      malicious: bool(report.malicious),
      reporter: addr(client.account.address),
      findings: bytes(stringToHex(JSON.stringify(report.findings))),
      artifactSha256: str(report.artifactSha256 ?? ""),
      ensRevoked: bool(report.ensRevoked ?? false),
    },
    { expiration: ExpirationTime.fromDays(REPORT_LIFETIME_DAYS) },
  );
}

/** Has anyone already reported on this package@version? Used by a second machine to skip its own rebuild. */
export async function findExistingReport(pkg: string, version: string) {
  const client = arkivPublicClient();
  const page = await client
    // Base columns only: selecting artifactSha256/ensRevoked would make Arkiv return only entities
    // that have them, silently missing every report written before they were added to the schema.
    .select({ $key: true, tier: true, malicious: true, reporter: true, findings: true })
    .from(ShankhReport)
    .where(and(eq("package", pkg), eq("version", version)))
    .fetch();
  const entity = page.entities[0];
  if (!entity) return null;
  return { ...entity, findings: JSON.parse(hexToString(entity.findings.value)) as VerificationFinding[] };
}

export type SignedReport = VerificationReport & {
  key: string;
  /** The wallet that actually signed the entity -- recorded by Arkiv itself, so it can't be faked. */
  creator: string;
};

/**
 * The most recent shankh.report entities signed by one wallet, newest first.
 *
 * Filters on `$creator` (via `createdBy`), never on the `reporter` attribute: anyone can write any
 * value into an attribute, but the creator is whoever signed the entity. And it never filters by
 * package -- the caller matches reports against what's installed locally, so the query reveals
 * nothing about this machine. Every report gets the same lifetime, so sorting by expiry descending
 * is newest-written first.
 *
 * Two queries, as in status-page/lib/arkiv.ts: selecting artifactSha256/ensRevoked would make
 * Arkiv return only entities that have them, silently dropping older reports.
 */
export async function recentReportsBy(creator: Hex, limit = 50): Promise<SignedReport[]> {
  const client = arkivPublicClient();
  const [page, extras] = await Promise.all([
    client
      .select({ $key: true, $creator: true, package: true, version: true, tier: true, malicious: true, findings: true })
      .from(ShankhReport)
      .createdBy(creator)
      .orderBy(desc("$expiresAt"))
      .limit(limit)
      .fetch(),
    client
      .select({ $key: true, artifactSha256: true, ensRevoked: true })
      .from(ShankhReport)
      .createdBy(creator)
      .orderBy(desc("$expiresAt"))
      .limit(limit)
      .fetch()
      .catch(() => null),
  ]);
  const extraByKey = new Map((extras?.entities ?? []).map((e) => [e.$key, e]));
  return page.entities.map((e) => {
    const extra = extraByKey.get(e.$key);
    return {
      key: e.$key,
      creator: e.$creator,
      package: e.package.value,
      version: e.version.value,
      tier: e.tier.value,
      malicious: e.malicious.value,
      findings: JSON.parse(hexToString(e.findings.value)) as VerificationFinding[],
      artifactSha256: extra?.artifactSha256.value ?? "",
      ensRevoked: extra?.ensRevoked.value ?? false,
    };
  });
}
