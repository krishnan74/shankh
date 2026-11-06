# Arkiv friction — Shankh

What should we improve today to make Arkiv better, and what broke. Full write-ups with evidence for each: [`../docs/feedback/arkiv.md`](../docs/feedback/arkiv.md).

1. **SDK install — worked.** `@arkiv-network/sdk@1.0.1` installed cleanly on Node 24, no peer-dependency issues.
2. **`str` columns cap at 128 bytes, documented only in the thrown error.** Our first real write reverted (a findings list of three files was 163 bytes); we moved the column to `bytes`, which also made it unqueryable — something the error didn't mention.
3. **Write, then read back — worked first time** once the column type was right (entity `0x8110825324441ccf57ece02ced20ac72ff1de16e8eb56630e3c0b47fc3732ebf`).
4. **Selecting a newly added column silently drops every older entity.** After adding `artifactSha256`/`ensRevoked`, selecting them returned 0 rows instead of 3 with no error, and our live page showed "0 reports" for several deploys. Worked around with two queries merged by `$key`.
5. **`createdBy` made a trust model possible — worked.** Filtering on the chain-recorded creator, not a self-declared attribute, is what lets `shankh scan` act only on reports from reporters it trusts.
6. **"Most recent" needs a workaround, and a read can stall.** `$createdAt` can't be sorted or filtered on, so we sort by `$expiresAt`; and one read hung for minutes with no timeout in the SDK, so we added our own.
7. **No access key means a hang, not an error.** Without a key, a read waited over two minutes against the rate-limited public endpoint; with a key it took 1 second.
