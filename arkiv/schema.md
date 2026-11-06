# Arkiv schema — Shankh (Build on Arkiv)

Built: `arkiv/src/schema.ts` (the `defineSchema` definitions below), `arkiv/src/report.ts` (write/read), `arkiv/src/client.ts` (wallet/public clients against the live testnet). This is a reduced first version of plan-2.md's original "Arkiv entities" table — see the cuts noted below — not yet proven with a live write (needs `ARKIV_ACCESS_KEY` and `ARKIV_WALLET_PRIVATE_KEY` filled in with real values; both are currently unfilled placeholders in `.env`, same situation the Sepolia deployer wallet was in until the user funded it).

| Entity | Owner | Queryable (indexed) fields | Payload | Expiry |
|---|---|---|---|---|
| `shankh.report` | reporter wallet (`reporter`, set from the writer's own account) | `package`, `version`, `tier` (`match`/`modified`/`untraceable`/`critical`), `malicious`, `reporter` | `findings` — JSON array of `{relativePath, tier}`, the specific files `shankh verify` flagged | 90 days (`ExpirationTime.fromDays(90)`) |
| `shankh.request` | requester wallet | `package`, `version`, `requester` | none | not yet wired to a writer (schema only) |

Cut from plan-2.md's original design for this first pass: `ecosystem` (multi-language support — Shankh only targets PyPI right now), `artifactSha256` (the whole-artifact hash; the per-file findings already carry this information), `verdict` as a separate field from `tier` (collapsed into one), the EIP-712 signature (the entity's own `$creator`/transaction signature already proves who wrote it — a wallet writing to Arkiv **is** the signature), and the optional Swarm reference (explicitly last-priority in plan-2.md's cut list).

Writer wallet address(es): *not yet written — blocked on real `ARKIV_ACCESS_KEY`/`ARKIV_WALLET_PRIVATE_KEY` values, see docs/plan.md Open.*
Sample query: `client.select({ $key: true, tier: true, malicious: true, findings: true }).from(ShankhReport).where(and(eq("package", "evilpkg"), eq("version", "1.0.0"))).fetch()` — see `arkiv/src/report.ts`'s `findExistingReport`.
