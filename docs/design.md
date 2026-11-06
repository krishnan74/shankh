# Design — Shankh

How it actually works, kept precise about what is real and what is stubbed. Sections mirror the components in [`plan-2.md`](../plan-2.md)'s Design section, which is the detailed reference — this file tracks implementation state, not re-explain the design from scratch.

## Inventory (`shankh/shankh/inventory/`)
**Status: built, the RECORD-reading half.** `installed_package()` reads an installed package's actual on-disk files and their sha256 hashes straight from pip's `RECORD` — the ground truth `shankh.verify` diffs against. Discovering *other* Python interpreters/venvs and Docker images (the broader "what's on this machine" inventory plan-2.md describes) is still not started.

## Verification (`shankh/shankh/verify/`)
**Status: built and proven live**, for pure-Python packages. `shankh verify <pkg>==<version>` fetches the package's published sdist (real PyPI JSON API, or a local `--find-links` replay index for the demo) and diffs it file-by-file against what's actually installed. Untraceable files are flagged; `.pth`/`sitecustomize.py` paths specifically are CRITICAL — the real LiteLLM 1.107.0 persistence mechanism. Proven against a real clean PyPI package (`idna==3.20`, no false positives) and a real malicious wheel built for this test (correctly flagged CRITICAL). Scope note: this is a file-provenance diff, not a `--network none` compiled rebuild — for a pure-Python package the sdist already *is* the source, so no compile step is needed; a real sandboxed build is still the right next step for packages with a native build step that could itself be tampered with (not the LiteLLM case).

## Signals (`shankh/shankh/signals/`)
**Status: not started.** Matches the four automatic-kill signals (rebuild mismatch, ENS revocation, OSV/GHSA advisory, trusted Arkiv report) against local state. See plan-2.md "Signals".

## Kill and clean (`shankh/shankh/kill/`)
**Status: not started.** AWS quarantine/deactivate/audit sequence, file deletion, incident report. See plan-2.md "Kill and clean". Dependency spike 4 (AWS sandbox account) should land first.

## `KillSwitch` contract (`contracts/src/KillSwitch.sol`)
**Status: deployed to Sepolia.** `0x378fDf7BbdCB33D3504e96083a7DC7Fb882a0A2C`. `revoke` / `queueUnrevoke` / `unrevoke` with the 48h timelock, maintainer-gated. 3 Foundry tests passing (not yet reviewed line by line — see CLAUDE.md). `maintainer()` confirmed on-chain against the operator wallet. No real artifact has been revoked yet — that needs the kill sequence above to exist first.

## ENS tree (Sepolia, ENSv2)
**Status: not started.** `shankh.eth` → `pypi.shankh.eth` (emancipated) → `<package>.pypi.shankh.eth`. Spike 1 (root-role revocation/emancipation) passed against the live Sepolia beta — see docs/feedback/ens.md — but the actual tree hasn't been registered yet. See plan-2.md "ENS name hierarchy" for the full role/handover design, including its own warning to rehearse on a fork first.

## Arkiv entities (`arkiv/`)
**Status: `shankh.report` built and proven live; `shankh.request` is schema-only.** `arkiv/src/schema.ts`, `arkiv/src/client.ts`, `arkiv/src/report.ts` — real write-then-read roundtrip against the Arkiv testnet, wired to `shankh verify` so every run auto-reports (see docs/evidence.md for the real entity/tx). `shankh.request` has a schema but no writer yet. The `osv.mal` mirror (`arkiv/src/import-osv.ts`, supporting feature only — see docs/plan.md's Arkiv track decision) is still a stub.

## Status page (`status-page/`)
**Status: deployed, reading real live data.** `status-page/lib/killswitch.ts` reads `KillSwitch.maintainer()` on Sepolia; `status-page/lib/arkiv.ts` queries real `shankh.report` entities. Forced dynamic per-request (`connection()` + `export const instant = false`) so Next 16's Cache Components model can't freeze a build-time snapshot — every request is live, no hard-coded values.

## CLI (`shankh/shankh/cli.py`)
**Status: `verify` is real; `demo` and `report` are stubs.** `shankh verify` runs the real rebuild diff and auto-writes to Arkiv (`--no-report` to skip). `shankh demo` / `shankh report` still raise `NotImplementedError`, wired through Typer, smoke-tested.

## Claude Code hook
**Status: not started.** Roadmap step 4 — `PreToolUse` hook, cooldown, hallucinated-name check.
