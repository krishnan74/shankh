# Design — Shankh

How it actually works, kept precise about what is real and what is stubbed. Sections mirror the components in [`plan-2.md`](../plan-2.md)'s Design section, which is the detailed reference — this file tracks implementation state, not re-explain the design from scratch.

## Inventory (`shankh/shankh/inventory/`)
**Status: not started.** Will discover Python interpreters/venvs and Docker images, read package metadata, and build the local exposure snapshot (identifier names only, SQLite). See plan-2.md "Inventory".

## Verification (`shankh/shankh/verify/`)
**Status: not started.** Sandboxed rebuild (`--network none`), file-by-file hash comparison, risk tiers. See plan-2.md "Verification". Dependency spike 5 in docs/plan.md should land first — a single-package rebuild proof before the risk-tier logic is built on top.

## Signals (`shankh/shankh/signals/`)
**Status: not started.** Matches the four automatic-kill signals against local state. See plan-2.md "Signals".

## Kill and clean (`shankh/shankh/kill/`)
**Status: not started.** AWS quarantine/deactivate/audit sequence, file deletion, incident report. See plan-2.md "Kill and clean". Dependency spike 4 (AWS sandbox account) should land first.

## `KillSwitch` contract (`contracts/src/KillSwitch.sol`)
**Status: built locally, not deployed.** `revoke` / `queueUnrevoke` / `unrevoke` with the 48h timelock, maintainer-gated. 3 Foundry tests passing. Not yet deployed to Sepolia — needs a funded deployer wallet (see docs/plan.md Open).

## ENS tree (Sepolia, ENSv2)
**Status: not started.** `shankh.eth` → `pypi.shankh.eth` (emancipated) → `<package>.pypi.shankh.eth`. See plan-2.md "ENS name hierarchy" for the full role/handover design, including its own warning to rehearse on a fork first.

## Arkiv entities (`arkiv/`)
**Status: not started.** `@arkiv-network/sdk@1.0.1` installed and confirmed resolvable (closes one of plan-2.md's "to verify" rows). `shankh.report` / `shankh.request` writers, and the `osv.mal` mirror (`arkiv/src/import-osv.ts`, supporting feature only — see docs/plan.md's Arkiv track decision), are stubs.

## Status page (`status-page/`)
**Status: scaffolded, not deployed.** Next.js app, builds and lints clean. Placeholder homepage. Vercel deploy blocked on login — see docs/plan.md Open.

## CLI (`shankh/shankh/cli.py`)
**Status: scaffolded.** `shankh verify` / `shankh demo` / `shankh report` commands exist as stubs (raise `NotImplementedError`), wired through Typer, smoke-tested.

## Claude Code hook
**Status: not started.** Roadmap step 4 — `PreToolUse` hook, cooldown, hallucinated-name check.
