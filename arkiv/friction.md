# Arkiv friction — Shankh

What should we improve today to make Arkiv better, and what broke.

See [`../docs/feedback/arkiv.md`](../docs/feedback/arkiv.md) — this file mirrors that one's content, formatted for the judging criterion.

The SDK (`@arkiv-network/sdk@1.0.1`) installed cleanly on Node 24, no peer-dependency issues. The one real surprise: a `str` column caps out at 128 UTF-8 bytes, undocumented outside the thrown error — hit it on the very first live write (a findings list of three flagged files was already over the limit), fixed by switching to a `bytes` column instead. After that fix, write-then-read against the live testnet worked exactly as documented on the first attempt — real entity `0x8110825324441ccf57ece02ced20ac72ff1de16e8eb56630e3c0b47fc3732ebf`. Still open: expiry ceiling, query syntax/performance at scale.
