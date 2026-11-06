# Arkiv schema — Shankh (Build on Arkiv)

Built and proven live: `arkiv/src/schema.ts` (the `defineSchema` definitions below), `arkiv/src/report.ts` (write/read), `arkiv/src/client.ts` (wallet/public clients against the live testnet). This is a reduced first version of plan-2.md's original "Arkiv entities" table — see the cuts noted below.

| Entity | Owner | Queryable (indexed) fields | Payload | Expiry |
|---|---|---|---|---|
| `shankh.report` | reporter wallet (`reporter`, set from the writer's own account) | `package`, `version`, `tier` (`match`/`modified`/`untraceable`/`critical`), `malicious`, `reporter` | `findings` — a `bytes` column holding JSON `{relativePath, tier}[]` hex-encoded (a `str` column caps at 128 UTF-8 bytes, too small for a real findings list — see friction.md) | 90 days (`ExpirationTime.fromDays(90)`) |
| `shankh.request` | requester wallet | `package`, `version`, `requester` | none | not yet wired to a writer (schema only) |

Cut from plan-2.md's original design for this first pass: `ecosystem` (multi-language support — Shankh only targets PyPI right now), `artifactSha256` (the whole-artifact hash; the per-file findings already carry this information), `verdict` as a separate field from `tier` (collapsed into one), the EIP-712 signature (the entity's own `$creator`/transaction signature already proves who wrote it — a wallet writing to Arkiv **is** the signature), and the optional Swarm reference (explicitly last-priority in plan-2.md's cut list).

Writer wallet address: `0xDcbe075a907960951Cd4df379BB21461097eEa91` (same operator wallet used for the Sepolia contract work — private keys aren't chain-specific, so it was reused rather than generating a second one).
Sample query, real and run: `client.select({ $key: true, tier: true, malicious: true, findings: true }).from(ShankhReport).where(and(eq("package", "evilpkg"), eq("version", "1.0.0"))).fetch()` (see `arkiv/src/report.ts`'s `findExistingReport`) — returns entity `0x8110825324441ccf57ece02ced20ac72ff1de16e8eb56630e3c0b47fc3732ebf`, written by tx `0x63442b3e069937b38284504655cf6d78d1c55fd10c8e4eaa5246ec6a3e87b1a1`.

The query `shankh scan --trust` actually runs, real and run: `client.select({ $key: true, $creator: true, package: true, version: true, tier: true, malicious: true, findings: true }).from(ShankhReport).createdBy(reporterWallet).orderBy(desc("$expiresAt")).limit(50).fetch()`, plus a second query for `artifactSha256`/`ensRevoked` merged by `$key` (see `arkiv/src/report.ts` `recentReportsBy`). It filters by who signed, never by package, so it reveals nothing about what's installed; matching against installed builds happens locally.
