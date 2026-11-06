/**
 * Arkiv entity schemas for Shankh's submitted Build on Arkiv prize (shankh.report, shankh.request).
 * See /arkiv/schema.md for the human-readable version judges are pointed at.
 */
import { addr, bool, bytes, defineSchema, str } from "@arkiv-network/sdk/schema";

/**
 * One package's verification result, signed by whoever ran it. This is the alarm the thesis
 * depends on: the first machine to catch a compromise writes one of these, and every other
 * machine running the same version can act on it without re-running the rebuild itself.
 */
export const ShankhReport = defineSchema("shankh.report", {
  package: str().indexed(),
  version: str().indexed(),
  tier: str().indexed(), // "match" | "modified" | "untraceable" | "critical"
  malicious: bool().indexed(),
  reporter: addr().indexed(),
  // JSON-encoded array of { relativePath, tier } -- the specific files that triggered the finding.
  // A `str` column caps out at 128 UTF-8 bytes (the SDK's MAX_STRING_BYTES); a real finding list
  // routinely exceeds that, so this has to be `bytes` -- not queryable itself, but `tier` already is.
  findings: bytes(),
  // sha256 of the exact sdist archive this report is about -- what a maintainer's KillSwitch.revoke()
  // targets on ENS (see shankh/shankh/ens/). "" when the reporter didn't compute one.
  artifactSha256: str().indexed(),
  // whether this report's tier was forced to `critical` by the maintainer's own ENS revocation
  // (kill signal #2, docs/plan.md Signals) rather than by the local rebuild diff alone.
  ensRevoked: bool().indexed(),
});

/**
 * A request from a second machine asking whether a package@version has already been checked,
 * so it can skip re-running its own rebuild if a trusted report already exists. Supporting
 * entity for the "one catches it, everyone is saved" demo beat -- the report itself is the
 * artifact that actually answers the question; this just makes the lookup queryable on its own.
 */
export const ShankhRequest = defineSchema("shankh.request", {
  package: str().indexed(),
  version: str().indexed(),
  requester: addr().indexed(),
});
