# AI usage

Shankh was built with Claude Code (Anthropic's coding agent) working in this repo, directed by the team throughout. Commits carry a `Co-Authored-By: Claude` trailer. This file says plainly which parts came from where.

## What AI wrote

Most of the code and most of the docs:

- **The CLI (`shankh/`):** the `shankhd` watcher, the rebuild verifier, the build fingerprint, the ENS reader, the registry sweep, the trusted-reporter loop, the Arkiv bridge, and all 39 tests.
- **Contracts and chain scripts:** `contracts/src/KillSwitch.sol` and its 3 Foundry tests, and every script under `scripts/` (ENS tree registration, adding packages and reporters, the demo scripts, the inert poisoned test package).
- **Arkiv package (`arkiv/`):** schema, writer, readers, and the `arkiv/*.md` judging docs.
- **Landing page (`status-page/`):** all components and live reads, built to design documents the team provided (below).
- **Docs:** `docs/plan.md` (ingested from the team's own plan), design, decisions, build log, feedback, evidence, technical deep dive, both pitch scripts, the demo video script, the submission form draft, and the README.

Every on-chain transaction and Arkiv write in `docs/evidence.md` was sent by commands the AI ran, using the team's testnet wallet, with the team's go-ahead.

## What the team contributed

- **The idea, research and design:** `plan-2.md` and `project-overview.md`, written before this repo existed.
- **Design direction:** `landing-page-playbook.md` (a design system from one of the team's earlier projects) and the "The Alarm" redesign brief for the landing page.
- **Decisions:** which prizes to target (Build on Arkiv over Mirror, CROPS for the EF), making the repo public under MIT, what to build next at each step, and approving every commit before it was made.
- **Partner feedback, relayed from pitching in person:** the ENS team's suggestion to sweep every package under `pypi.shankh.eth`, which became `shankh scan`.
- **A security review:** the team reviewed a demo command the AI proposed and caught that starting Python inside the poisoned test environment would run its startup hook. Both that and a related CLI bug it exposed were fixed, and the demo scripts follow that rule.
- The track requirement text in `docs/plan.md`, pasted from the prize pages.

## What was reviewed line by line

- `contracts/src/KillSwitch.sol`: reviewed line by line by the team (2026-11-06). Not externally audited; testnet only.
- Nothing else has been confirmed as reviewed line by line.
- What *was* checked, by running it rather than reading it: every claim in `docs/evidence.md` comes from a real run, and the landing page was checked in a real browser at desktop and phone widths before each deploy.