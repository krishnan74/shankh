# Feedback — Arkiv

First-hand only. Evidence per item. What worked as well as what didn't.

## 1. SDK installs cleanly
**What happened:** `npm install @arkiv-network/sdk` resolved `1.0.1` with no peer-dependency issues on Node 24.
**Evidence:** `arkiv/package.json`, `arkiv/package-lock.json`.
**Suggestion:** n/a — this one just worked.

## 2. A `str` column caps out at 128 UTF-8 bytes — hits real payloads fast
**What happened:** `writeReport` first stored `shankh.report`'s `findings` (a JSON array of `{relativePath, tier}`) as a `str` column. It reverted on the very first real write — three flagged files already exceeded the limit: `InvalidValueError: ... 163 UTF-8 bytes exceeds the 128-byte limit on a str`. Fixed by switching the column to `bytes` and encoding/decoding with viem's `stringToHex`/`hexToString`. `bytes` columns aren't queryable (can't filter on them), which is the right tradeoff here since `tier` is already indexed for the queries that matter — but it means the error only told me what to change, not that it would also cost queryability.
**Evidence:** real entity `0x8110825324441ccf57ece02ced20ac72ff1de16e8eb56630e3c0b47fc3732ebf`, tx `0x63442b3e069937b38284504655cf6d78d1c55fd10c8e4eaa5246ec6a3e87b1a1` on the Arkiv testnet — written and read back correctly after the fix, via `arkiv/src/report.ts`.
**Suggestion:** The 128-byte limit on `str` is reasonable, but it's not mentioned anywhere in the `defineSchema`/column docs I found before hitting it live — a note on the `str()` column type's own reference page (not just in the thrown error) would save the round trip of writing, reverting, and re-deriving the right column type from the error message alone.

## 3. Writing and reading back a real entity, end to end, worked exactly as documented
**What happened:** Once the column type was fixed, `createEntity` → `select().from(schema).where(and(eq(...), eq(...))).fetch()` worked on the first real attempt against the live testnet — no further surprises. The returned row's typed values (`str`, `bool`, `addr`, `bytes`) matched what was written exactly.
**Evidence:** same entity/tx as above.
**Suggestion:** n/a — this half worked cleanly.

## 4. Selecting a newly added schema column silently drops every older entity
**What happened:** We added two indexed columns (`artifactSha256`, `ensRevoked`) to `shankh.report`. Older entities were written before they existed. Selecting the new columns didn't return them as empty or undefined on the old rows — it returned *no rows at all* for entities lacking the attribute. Our status page's live report feed showed "0 reports" on production for several deploys before we noticed, with no error anywhere.
**Evidence:** same live testnet, same schema name: `.select({ $key, package })` returns 3 entities; adding `artifactSha256: true, ensRevoked: true` to the select returns 0. Fixed in `status-page/lib/arkiv.ts` by querying base columns for everything and merging the new columns from a second query by `$key`.
**Suggestion:** Either return missing attributes as absent/undefined on the rows that lack them (the behavior a `select` reads as), or document prominently that selecting an attribute acts as an existence filter — and ideally say so in the schema-evolution docs, since adding a column to a live schema is exactly when this bites.

## 5. `createdBy` made a trust model possible without any extra infrastructure
**What happened:** We needed "only act on reports from reporters I trust." The `reporter` attribute we write is just data -- anyone can put anyone's address in it. Filtering on the chain-recorded creator (`.createdBy(addr)`, `$creator`) gave us a signer we can rely on, and pairing it with an ENS name that publishes the reporter's wallet gave a full trust list with no server of our own.
**Evidence:** `arkiv/src/report.ts` `recentReportsBy`; `shankh/tests/test_scan.py` proves a report whose `reporter` attribute claims a trusted wallet but was created by another is ignored; live run in docs/evidence.md (entity `0xe7d2102e…`).
**Suggestion:** Say plainly in the docs that `$creator` is the field to trust and attributes are not -- it's the first question anyone building on shared data will have, and the answer is good.

## 6. "Most recent" needs a workaround, and a read can stall for minutes
**What happened:** We wanted each trusted reporter's newest reports. `$createdAt` can be selected but not used to filter or sort, so we sort by `$expiresAt` descending, which only means "newest" because every report we write gets the same lifetime. Separately, one `read-reports` call against the testnet hung with no response until we killed it after several minutes; the same query answered in 2s moments later. The SDK call has no timeout of its own, so the caller hangs too.
**Evidence:** `arkiv/src/report.ts` (`orderBy(desc("$expiresAt"))` with the comment explaining why); `shankh/shankh/report/__init__.py` now wraps the read in a 60s timeout after the hang during the live demo run (docs/build-log.md, 2026-11-06). Seen again during the README cold-start check the same day: 14 identical keyed reads of the same creator's reports in about 5 minutes, 12 hung past a 20s cutoff and 2 answered in under 2s — independent of anything in the environment (the bare minimum env hung too).
**Suggestion:** Allow ordering and range filters on `$createdAt` (or a block number), and give query calls a default timeout or an `AbortSignal` option so one stalled RPC can't hang a client.

## 7. Without an access key, a read doesn't fail — it hangs
**What happened:** Checking the README's judge-runnable query from a clean shell with no `ARKIV_ACCESS_KEY`, the SDK printed its warning ("no access key, so requests go to the public endpoint, which is heavily rate limited") and then the query sat for over two minutes with no result or error until we killed it. The same query with a key returned 5 reports in about 1 second.
**Evidence:** `arkiv/src/read-reports-cli.ts` run from `arkiv/`, 2026-11-06, with and without the key; the README now tells judges to get a free key first.
**Suggestion:** When the public endpoint rate-limits a request, return an error (HTTP 429 or a clear SDK exception) instead of holding the connection open — the warning is good, but a hang is what a first-time user actually experiences.

Still open: expiry ceiling, query performance/syntax at scale (docs/plan.md spike 3's remaining unknowns).
