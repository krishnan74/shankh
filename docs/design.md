# Design — Shankh

How it actually works, kept precise about what is real and what is not built. Sections mirror the components in [`plan-2.md`](../plan-2.md)'s Design section, which is the detailed reference — this file tracks implementation state. For a step-by-step walkthrough, see [`technical-deep-dive.md`](technical-deep-dive.md).

## Inventory (`shankh/shankh/inventory/`)
**Status: built for installed Python packages.** `installed_package()` / `installed_packages()` read every installed package's on-disk files and sha256 hashes straight from pip's `RECORD`, for this interpreter or any `--site-packages` directory, without ever starting that environment's Python. `build_fingerprint()` turns a package's `RECORD` into the identity of the exact installed build: sha256 over the sorted `path:hash` lines of the files it shipped. Discovering other interpreters, virtual environments and Docker images, and the credential "exposure snapshot", are not started.

## Verification (`shankh/shankh/verify/`)
**Status: built and proven live**, for pure-Python packages. `shankh verify <pkg>==<version>` fetches the package's published sdist (real PyPI JSON API, or a local `--find-links` replay index for the demo) and diffs it file by file against what's installed. Untraceable files are flagged; `.pth`/`sitecustomize.py` are CRITICAL — the real LiteLLM 1.107.0 persistence mechanism. Proven against a real clean PyPI package (`idna==3.20`, no false positives) and a real malicious wheel. It also checks the maintainer's ENS flag for this exact build and forces CRITICAL on a match. Scope note: a file-provenance diff, not a `--network none` compiled rebuild — enough for pure-Python packages like LiteLLM; a sandboxed build is the next step for packages with native build steps.

## ENS revocation check and registry sweep (`shankh/shankh/ens/`, `shankh/shankh/scan/`)
**Status: built and proven end to end on Sepolia.** `shankh scan` lists every package ever registered under `pypi.shankh.eth` from the registry's own `LabelRegistered` events, reads each one's bad-builds list (`shankh.revoked`) through ENSIP-10 `resolve()`, and compares them with every installed build's fingerprint locally — no rebuild, and no per-package lookups, so the RPC provider never learns what's installed. Per-package reads run in parallel. `shankh fingerprint` prints the value a maintainer passes to `KillSwitch.revoke()`. Proven live: a poisoned demo build flagged on Sepolia (confirmed in 7s) was reported COMPROMISED from the ENS flag alone.

## Trusted reporters and Arkiv alarms (`shankh/shankh/trust/`, `shankh/shankh/scan/`)
**Status: built and proven live with two machines on separate wallets.** Reporters are chosen by ENS name (`<name>.reporters.shankh.eth`, under an emancipated `reporters.shankh.eth`), in `~/.config/shankh/trust.toml` or with `--trust`; each name's `shankh.signer` record, writable only by that reporter, holds the wallet their alarms must be signed by. `shankh scan --trust` reads each trusted reporter's recent `shankh.report` entities by that wallet (the signer Arkiv records, never the self-declared `reporter` field, and never by package), keeps those naming a build installed here, and re-checks each one locally — only a local CRITICAL counts. A confirmed alarm gets this machine's own confirmation and an extension of the original alarm's lifetime.

## Watcher (`shankh/shankh/daemon.py`)
**Status: built and proven live; not yet a system service.** `shankhd` lists the watched environment's installed packages every 2 seconds (no network) and rebuilds each new install as it lands; every 60 seconds it runs the ENS sweep and the trusted-reporter check. It remembers handled builds and alarms, so nothing is rebuilt or alerted on twice. On a compromise it posts to Arkiv once (or extends the alarm it confirmed) and calls `shankh.kill.respond()`. Proven with `scripts/demo-watch.sh`: a poisoned install was caught 2–4 seconds later with nobody typing a command. Not yet: system-service install, memory across restarts, Docker.

## Signals (`shankh/shankh/signals/`)
**Status: three of four live, matched inside `verify`, `scan` and the watcher rather than a separate module** (the `signals/` package is empty). Built: rebuild mismatch, the maintainer's ENS revocation, a trusted reporter's Arkiv alarm re-checked locally. Not built: the OSV/GHSA advisory signal (the `osv.mal` mirror is a stub).

## Kill and clean (`shankh/shankh/kill/`)
**Status: not built — only its hook exists.** `shankh.kill.respond()` is the single function the watcher calls on a confirmed compromise; today it says plainly that no credentials were changed. The AWS quarantine/deactivate/audit sequence, file deletion and incident report (plan-2.md "Kill and clean") slot in there, blocked on an AWS sandbox account (spike 4).

## `KillSwitch` contract (`contracts/src/KillSwitch.sol`)
**Status: live on Sepolia, one instance per package.** `shankh-demo`'s is `0x1126b7aBe8b0Db262cBa84b6b5a377D002351c5a`; `shankh-demo-clean` and `shankh-demo-tools` have their own (docs/evidence.md). It takes its resolver and DNS-encoded name at construction, and `revoke()` / `unrevoke()` (48-hour timelock) write the resolver's `shankh.revoked` record. The original global instance (`0x378fDf7B…`) never did and is superseded (ADR 0003). 6 Foundry tests pass. Reviewed line by line by the team on 2026-11-06; not externally audited.

## ENS tree (Sepolia, ENSv2)
**Status: live on Sepolia.** `shankh.eth` (`0xb95110b3…`, real commit-reveal) → `pypi.shankh.eth` (`0x8634b9f5…`, emancipated; `isEmancipated()` true and a re-grant reverts) → three packages, each with its own resolver: `shankh.source` writable only by the maintainer, `shankh.revoked` only by its `KillSwitch`. And `shankh.eth` → `reporters.shankh.eth` (`0x9b833a13…`, emancipated) → `shankh-team.reporters.shankh.eth`, whose `shankh.signer` only its signer can change. Rehearsed on an Anvil fork first (`scripts/ens/register-tree-fork-rehearsal.sh`), which caught a role-bitmap bug before it reached Sepolia; built with `scripts/ens/register-tree-sepolia.sh`, `add-package-sepolia.sh`, `add-reporter-sepolia.sh`. `ensv2-guide.md` was the reference throughout.

## Arkiv entities (`arkiv/`)
**Status: `shankh.report` built and proven live; `shankh.request` is schema-only.** Every alarm carries package, version, tier, findings, the build fingerprint (`artifactSha256`) and whether the maintainer had flagged it (`ensRevoked`), and is created with the `readonly` and `permissionlessExtension` creation flags: nobody can edit it once posted (an edit by its own owner was refused live), and anyone can extend its lifetime. Reads: `recentReportsBy(wallet)` for the CLI, and the landing page's newest-first query; both use two queries merged by `$key`, because selecting a newly added column silently drops older entities (feedback item 4). `extendReport()` keeps a confirmed alarm alive. The `osv.mal` mirror (`arkiv/src/import-osv.ts`) is a stub.

## Landing page and registry (`status-page/`)
**Status: deployed at https://shankh-eth.vercel.app, every value read live per request.** One scrolling page in pitch order — hero, 01 what happened, 02 what Shankh does (with the recorded watcher run, the live Arkiv feed labelled by ENS reporter names, and the trusted-reporters panel), 03 the three partners (architecture diagram, partner cards, CROPS letters), 04 why the alarm can't be silenced (ENS up close, attacks re-tried live), 05 where it stands. A second page, `/registry`, lists every package under `pypi.shankh.eth` with its registered-to wallet, resolver, `shankh.source`, bad-builds list and the Arkiv alarms about it, plus the trusted reporters and the full ENS setup and ledger. Forced dynamic per request (`connection()` + `instant = false`); every read capped at 4 seconds with an honest degraded state. Design details: `status-page/DESIGN.md`.

## CLI (`shankh/shankh/cli.py`, `shankhd`)
**Status: `verify`, `scan` (with `--trust`) and `fingerprint` are real; `shankhd` is the watcher above; `demo` and `report` are stubs** that raise `NotImplementedError`. The live demos are the shell scripts instead: `scripts/demo-watch.sh`, `scripts/demo-ens.sh`, `scripts/demo-arkiv.sh`.

## Claude Code hook
**Status: not started.** Roadmap step 4 — `PreToolUse` hook, cooldown, hallucinated-name check.
