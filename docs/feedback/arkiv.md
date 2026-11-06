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

Still open: expiry ceiling, query performance/syntax at scale (docs/plan.md spike 3's remaining unknowns).
