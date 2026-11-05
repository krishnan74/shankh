# AI usage

## What AI wrote
- The repo scaffold: directory layout, `pyproject.toml`, Next.js app scaffold, Foundry project init, Arkiv TS package setup, all `.gitignore`/`.env.example` files, the one-command scripts in `scripts/`.
- `contracts/src/KillSwitch.sol` and its 3 Foundry tests — a first pass implementing the revoke/timelocked-unrevoke design from plan-2.md, not yet reviewed line by line by the user.
- The ingest of plan-2.md and project-overview.md into docs/plan.md, including the time-box arithmetic and the ENS/EF/Arkiv track checklist (requirement text was pasted by the user from the Mumbai prize page; the reconciliation against the existing design — e.g. the Arkiv track pick — was AI-drafted and user-confirmed).
- docs/design.md, docs/decisions.md (ADR 0001 and 0002), this file's initial structure, docs/build-log.md's first entry.

## What a human wrote
- plan-2.md and project-overview.md (the original research and design, written before this repo existed).
- The actual track requirement text pasted into docs/plan.md.
- <to be filled in as the build progresses — any hand-written code, contract changes, or demo decisions go here>

## What was reviewed line by line
- <none yet — KillSwitch.sol in particular should get a real review before any mainnet-adjacent use, and is flagged as such in docs/design.md>

## Limitations of that process
<the human's own words — leave empty until they write it; do not backfill>
