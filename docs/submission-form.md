# Submission form copy — Shankh

Drafted here, pasted into the ETHGlobal form. The form's character limits weren't available when this was written; check each field against the form and trim. Every claim below has evidence in `docs/evidence.md`.

## Project name

Shankh

## Category

Security

## Emoji

🐚 — a conch. "Shankh" is the conch shell blown to warn a whole village at once, which is what the project does for every machine running a bad package.

## Tagline

When one machine catches a malicious package, every other machine running it finds out in seconds — from an alarm on ENS and Arkiv that the hijacked publisher can't silence.

## Short description (max 100 chars — this is 93)

Catch a malicious package once, warn every machine running it, via an alarm on ENS and Arkiv.

## Long description

In October 2026 the LiteLLM package on PyPI was compromised, and for about two hours every machine that installed it had its cloud keys copied. AWS quarantines keys leaked publicly within seconds, but keys stolen by malware get nothing, and the place you'd expect a warning, the publisher's own accounts, is exactly what the attacker controls.

Shankh moves the warning somewhere the attacker can't reach. It runs on your machine and does three things today:

1. **Check.** `shankh verify` rebuilds an installed package's file list from its public source and compares it file by file. A file that's in nobody's source, like the `sitecustomize.py` the LiteLLM attack used to run on every Python start, is critical. The result is written to Arkiv as a `shankh.report`, signed by the finder's wallet.
2. **Flag.** Every package gets an ENSv2 name under `pypi.shankh.eth`. Its real maintainer can flag a bad build through the package's `KillSwitch` contract, which writes the build's fingerprint into the name's `shankh.revoked` record. Only that contract can write it, and `pypi.shankh.eth` is emancipated, so not even we can change who controls a package's name.
3. **Sweep.** `shankh scan` reads the bad-builds list of every package under `pypi.shankh.eth` and recent alarms from reporters you trust (named on ENS under `reporters.shankh.eth`), then compares with what's installed, locally, so nobody learns what you run. An Arkiv alarm only counts after your machine re-checks it.

All three ran live: a maintainer flagged a build on Sepolia (confirmed in 7 seconds) and `shankh scan` caught it from ENS alone; a second machine picked up another machine's Arkiv alarm, re-checked it and confirmed it. The landing page reads ENS, the `KillSwitch` and Arkiv live on every request.

`shankhd`, the background watcher, ties it together: it rebuilds every new install the moment it lands and sweeps ENS and Arkiv every minute. A poisoned package installed while it ran was caught two seconds later with no command typed.

Not built yet: automatically quarantining and deactivating the stolen keys, and anything beyond Python packages. The `KillSwitch` contract was reviewed line by line by the team but not externally audited. In the demos, one wallet plays maintainer, operator and reporter.

## How it's built

- **CLI (`shankh/`, Python + Typer):** reads installed files and hashes from pip's `RECORD`, fetches the source archive from PyPI's JSON API, and diffs them. ENS reads shell out to Foundry's `cast` through the ENSIP-10 `resolve()` path. Arkiv reads and writes go through a small TypeScript bridge to `@arkiv-network/sdk`. 34 tests.
- **ENSv2 on Sepolia (`scripts/ens/`):** `shankh.eth` registered via commit-reveal; `pypi.shankh.eth` and `reporters.shankh.eth` are `PermissionedRegistry` proxies with their dangerous root roles revoked (emancipated). Each package has its own `PermissionedResolver` where the maintainer can only write `shankh.source` and only its `KillSwitch` can write `shankh.revoked` (key-scoped setter roles).
- **`KillSwitch.sol` (Foundry):** instant `revoke(build)`, 48-hour timelocked un-revoke, syncs the resolver's text record on every change.
- **Arkiv (`arkiv/`):** `shankh.report` entities with indexed package, version, tier, build fingerprint and ENS flag; reads filter by the chain-recorded creator, never by package.
- **Landing page (`status-page/`, Next.js on Vercel):** server-rendered on every request, every live read capped at 4 seconds so one slow network can't hang the page.

The hard parts:

- **Identifying a build.** We first flagged builds by the source archive's hash, then realised the LiteLLM poison was in the wheel next to a clean source archive, and an installed package doesn't remember which file it came from. We now fingerprint the installed files themselves, so a maintainer flags exactly what people installed.
- **Emancipation that actually holds.** ENSv2's `isEmancipated()` can read `true` while upgrade roles are still held. We took the real role bitmap from verified source, rehearsed on an Anvil fork (which caught a wrong bitmap before it touched Sepolia), and proved the lock by attempting a re-grant that reverts.
- **Privacy.** Looking up one package on ENS tells the RPC provider what you have installed, so `shankh scan` fetches every package's list from the registry's own events and compares locally. The same rule applies to Arkiv: reads are by reporter, never by package.

## Challenges / what we learned

- An Arkiv query that selected two newly added columns returned zero rows instead of three, with no error, and our live page showed "0 reports" for several deploys before we caught it. Selecting a column acts as an existence filter. We now query base columns and merge the new ones by key (Arkiv feedback item 4).
- Public testnet RPCs are slow and occasionally stall: Arkiv once hung for minutes, and Sepolia calls took 5–8 seconds each on event Wi-Fi. Every live read now has a timeout and a clear degraded state, and the scan's chain reads run in parallel (81s → 14s).
- Demoing malware safely: the poisoned test package is inert, and the demo scripts never start Python inside the poisoned environment, because that alone would run its startup hook.
- Making a demo repeatable when un-flagging is deliberately slow (48 hours): every demo run builds a uniquely stamped package with its own fingerprint.

## What's next

1. Automatic key shut-off: quarantine and deactivate the AWS keys a confirmed bad build could reach, with a CloudTrail audit trail.
2. Running `shankhd` as a system service with memory across restarts, and covering Docker images.
3. Private chain reads through Anon-RPC, and an external audit of `KillSwitch.sol`.

## Track: ENS — Best Use of ENSv2

ENSv2 isn't a label here; it's where the alarm lives and why it can't be silenced.

- **A name per package, a switch per name:** `<pkg>.pypi.shankh.eth`, each with its own `PermissionedResolver`. The maintainer's scoped setter role can write `shankh.source` only; `shankh.revoked` is writable only by that package's `KillSwitch`. Writing it any other way reverts with `EACUnauthorizedAccountRoles`, live.
- **Emancipation as the guarantee:** `pypi.shankh.eth` (`0x8634b9f567Fa84da5BCe08150Aa323424382a3a4`) has its dangerous root roles revoked; re-granting them reverts with `EACCannotGrantRoles`, simulated live on every landing page load. So not even Shankh can take over a package's name.
- **The registry as the directory:** `shankh scan` enumerates every package from the registry's own `LabelRegistered` events and finds each resolver with `getResolver(label)`, so any registered package is covered with no config. This came from the ENS team's feedback on our first pitch.
- **ENS as the trust list:** `reporters.shankh.eth` (also emancipated) gives each reporter a name whose `shankh.signer` record only they can change; that's how a machine decides whose Arkiv alarms to act on.
- **Live and functional, no hard-coded state:** a maintainer flagged a build (tx `0xef5625a0a690d5c400b6cedc6d7fd2b065e889224d01482c313b843245187379`) and `shankh scan` caught it from ENS alone. The landing page reads every record live.

Files: `scripts/ens/register-tree-sepolia.sh`, `scripts/ens/add-package-sepolia.sh`, `scripts/ens/add-reporter-sepolia.sh`, `contracts/src/KillSwitch.sol`, `shankh/shankh/ens/__init__.py`, `status-page/lib/registry.ts`.

## Track: Arkiv — Build on Arkiv

Arkiv carries the alarms machines send each other, and Shankh both writes and acts on what it reads.

- **Write:** every `shankh verify` writes a `shankh.report` (package, version, tier, findings, build fingerprint, ENS flag), signed by the finder's wallet. Example: entity `0xe7d2102e72c192949b5dcd99ccba16743796b6cf36413aa46a60d9c558687ec0`.
- **Read and act:** `shankh scan --trust shankh-team.reporters.shankh.eth` reads that reporter's recent reports with `.createdBy(wallet)`, the chain-recorded signer rather than a self-declared field, keeps those naming a build installed here, and re-checks them locally before flagging. Proven live with two machines (`scripts/demo-arkiv.sh`).
- **Why Arkiv, not a database:** the alarm has to survive the attacker and us. A report owned by the finder's wallet can't be edited or deleted by the publisher, by Shankh, or by anyone who takes over our infrastructure.
- **Privacy by design:** reads are by reporter, never by package, so the query reveals nothing about what's installed.
- Writer wallet: `0xDcbe075a907960951Cd4df379BB21461097eEa91`. Required docs: `arkiv/schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`. Seven pieces of first-hand feedback are in `docs/feedback/arkiv.md`.

## Track: Ethereum Foundation — Best CROPS App

Lead property: **censorship resistance.** Nobody can take the alarm down: not the hijacked publisher (it lives on ENS and Arkiv, not their accounts), not other people (only the maintainer's `KillSwitch` writes the bad-builds record, only the finder signs a report), and not us (both name spaces are emancipated). Shankh runs on your machine and talks directly to public networks; the landing page is the only thing we host, and the scan never contacts it.

- **O:** MIT licensed, public repo, runs from a clone with no account.
- **P (partly):** what's installed never leaves your machine; ENS and Arkiv are read in bulk or by reporter and matched locally. Next: Anon-RPC so the RPC provider doesn't see the reads either.
- **S (partly):** packages are rebuilt rather than trusted and alarms are re-checked locally. Next: shutting stolen keys off automatically.
- No analytics or trackers on the landing page.

## Sponsor prize fields (one block per track)

Each track asks for four things: why you qualify (min 20 chars), a link to the line of code where the tech is used, a 1–10 ease-of-use rating, and feedback for the sponsor (min 30 chars). The code links are GitHub permalinks pinned to commit `885fe08` (already pushed), so they keep pointing at the right line after later commits. The ratings are suggestions drawn from what we actually hit; they're your call.

### ENS

**Why we qualify:**
> Every package gets an ENSv2 name under the emancipated `pypi.shankh.eth`, whose `shankh.revoked` record only that package's KillSwitch can write — so the maintainer's "this build is bad" flag can't be changed by an attacker who stole their PyPI login, or by us. `shankh scan` sweeps every name in the registry live, and a maintainer's flag on Sepolia was caught from ENS alone within seconds.

**Line of code:** https://github.com/krishnan74/shankh/blob/885fe08ba7271102acdae838155ecc21f8a1f83b/contracts/src/KillSwitch.sol#L85-L86 (the KillSwitch writing `shankh.revoked` to the package's resolver)

Alternative, if you'd rather point at the reading side: https://github.com/krishnan74/shankh/blob/885fe08ba7271102acdae838155ecc21f8a1f83b/shankh/shankh/ens/__init__.py#L119 (`sweep()`, reading every package's bad-builds list)

**Suggested rating:** 5 / 10. The protocol did everything we needed, but we had to assemble ABIs from Sourcify and found the real emancipation bitmap only in the source.

**Feedback:**
> ENSv2's permission model did exactly what we needed: emancipation, a per-package PermissionedResolver, and grantSetterRoles to scope one text record to one writer all worked live on Sepolia. The friction was documentation. (1) No runnable ABI anywhere in the docs; we pulled verified ABIs from Sourcify, and the Grant struct's field order isn't documented. (2) The docs talk about "four dangerous roles", but the real UNEMANCIPATED_ROLE_BITMAP also includes the upgrade and transfer-admin roles, so isEmancipated() can read true for a test registry that never held them. We only caught it by rehearsing on an Anvil fork; please document the exact bitmap with a worked example. (3) A direct text() call on factory-deployed resolvers reverts, while resolve() with ENSIP-10 works; a note would save time. (4) grantSetterRoles is hard to discover from its name.

### Arkiv

**Why we qualify:**
> Every `shankh verify` writes a signed `shankh.report` to the Arkiv testnet, and `shankh scan --trust` reads trusted reporters' recent reports back with `createdBy` and acts on them: it re-checks the named build locally and flags it. That loop ran live across two machines, so Arkiv is the alarm machines send each other, not a write-only log.

**Line of code:** https://github.com/krishnan74/shankh/blob/885fe08ba7271102acdae838155ecc21f8a1f83b/arkiv/src/report.ts#L87 (`.createdBy(creator)`: reading only reports signed by a trusted reporter)

Alternative (the write): https://github.com/krishnan74/shankh/blob/885fe08ba7271102acdae838155ecc21f8a1f83b/arkiv/src/report.ts#L32

**Suggested rating:** 7 / 10. Install, write and read worked first time, and `createdBy` was a great primitive. Points off for silent query behaviour and hangs.

**Feedback:**
> The SDK installed cleanly and write-then-read worked on the first try; createdBy (filtering on the chain-recorded creator) is what made our trust model possible without a server. What hurt: (1) selecting a newly added column silently drops every older entity instead of returning it without that field; our live page showed "0 reports" for several deploys with no error. (2) str columns cap at 128 bytes, documented only in the thrown error. (3) $createdAt can't be sorted or filtered on, so "most recent" means sorting by $expiresAt. (4) Without an access key a read hangs for minutes instead of returning a rate-limit error, and the testnet stalled intermittently even with a key (12 of 14 identical reads hung in one five-minute window). A default timeout or AbortSignal in the SDK would help. Full details with evidence: docs/feedback/arkiv.md in our repo.

### Ethereum Foundation (Best CROPS App)

**Why we qualify:**
> Shankh's lead CROPS property is censorship resistance: the alarm that a package is malicious lives on ENS and Arkiv, where neither the hijacked publisher, nor other users, nor we can remove it, and the CLI talks directly to public networks with no Shankh server in the path. It's MIT-licensed and public, and it matches installed packages locally, so what you run never leaves your machine.

**Line of code:** https://github.com/krishnan74/shankh/blob/885fe08ba7271102acdae838155ecc21f8a1f83b/shankh/shankh/scan/__init__.py#L81 (`check_alarms`: every match happens on your own machine, and an alarm counts only after a local re-check)

**Suggested rating:** 8 / 10, for the Ethereum tooling we used (Foundry and Sepolia). CROPS itself is a set of criteria, not an API.

**Feedback:**
> The letter-by-letter CROPS criteria were genuinely useful as a design check, not just a judging rubric. Applying "P" made us change a real design: looking up one package on ENS would tell the RPC provider what's installed, so we now fetch every package's list and match locally, and read Arkiv by reporter, never by package. What we didn't get to: Anon-RPC, so the RPC provider still sees which contracts we read. A short guide on whether Anon-RPC works on Sepolia, and how to point viem or cast at it, would have made it a quick win. Public Sepolia RPCs ran 5–8 seconds per call on event Wi-Fi, which shapes how a CROPS app has to handle timeouts and degraded states.

## Tech stack

Only what the code actually uses. If an exact option isn't in the form's dropdown, pick the closest one or use "Other".

**Ethereum developer tools:**
- Foundry: `forge` (KillSwitch contract and tests), `cast` (every ENS read and write in the CLI and scripts), `anvil` (forked Sepolia to rehearse the ENS tree before deploying it for real)
- viem (the landing page's live Sepolia reads)
- ENS: ENSv2 contracts (PermissionedRegistry, PermissionedResolver, VerifiableFactory)
- Sourcify (verified ABIs for the ENSv2 contracts)
- Arkiv SDK (`@arkiv-network/sdk`)

**Blockchain networks:**
- Ethereum Sepolia (ENSv2 names and the KillSwitch contracts)
- Arkiv testnet "Rabdi" (chain ID 7794095), for the `shankh.report` alarms. If the form doesn't list it, choose "Other" and write "Arkiv testnet".

**Programming languages:**
- Python (the `shankh` CLI)
- TypeScript (the landing page and the Arkiv package)
- Solidity (`KillSwitch.sol`)
- Bash (the deploy and demo scripts)

**Web frameworks:**
- Next.js
- React
- Tailwind CSS

**Databases:**
- Arkiv, the only data store: alarms are Arkiv entities. There's no traditional database such as Postgres. If the form needs a pick, choose "Other" and write "Arkiv (onchain database)", or "None" if Arkiv isn't an option.

## Links

- Repo: https://github.com/krishnan74/shankh (public, default branch `main`, submitted at `<commit — fill in when submitting>`)
- Live: https://shankh-eth.vercel.app
- Video: `<link — not recorded yet>`
- Contracts and names (Sepolia):
  - `shankh.eth` registry: https://sepolia.etherscan.io/address/0xb95110b3F8d89fb8e9858fC414E21475DA4DF15c
  - `pypi.shankh.eth` registry: https://sepolia.etherscan.io/address/0x8634b9f567Fa84da5BCe08150Aa323424382a3a4
  - `shankh-demo` `KillSwitch`: https://sepolia.etherscan.io/address/0x1126b7aBe8b0Db262cBa84b6b5a377D002351c5a
  - Live flag tx: https://sepolia.etherscan.io/tx/0xef5625a0a690d5c400b6cedc6d7fd2b065e889224d01482c313b843245187379
