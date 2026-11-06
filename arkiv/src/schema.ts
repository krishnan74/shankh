/**
 * Arkiv entity schemas for Shankh's submitted Build on Arkiv prize (shankh.report, shankh.request).
 * See /arkiv/schema.md for the human-readable version judges are pointed at.
 */
import { addr, bool, defineSchema, str } from "@arkiv-network/sdk/schema";

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
  findings: str(),
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
