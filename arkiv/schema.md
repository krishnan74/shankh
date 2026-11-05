# Arkiv schema — Shankh (Build on Arkiv)

Not wired up yet — see docs/plan.md Status table. Design below is from plan-2.md's "Arkiv entities" table; this file tracks what's actually deployed and queryable once the SDK integration lands.

| Entity | Owner | Queryable fields | Payload | Expiry |
|---|---|---|---|---|
| `shankh.report` | reporter wallet | `ecosystem`, `package`, `version`, `artifactSha256`, `verdict` (mismatch / match / unverifiable), `tier`, `reporter`, `createdAt` | rogue files with hashes, exfiltration domains, source repo and commit, EIP-712 signature, optional Swarm reference | ~90 days, renewed while relevant |
| `shankh.request` | requester (CLI, CI or agent) | `ecosystem`, `package`, `version`, `requestedAt` | none | 24 h |

Writer wallet address(es): *not deployed yet*.
Sample query: *not available yet*.
