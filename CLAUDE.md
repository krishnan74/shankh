# Shankh — working notes for Claude

Credentials stolen by a malicious package quarantine and deactivate themselves. Mechanism, in order: watch installs → rebuild and diff against public source in a sandbox → on a mismatch (or an ENS revocation, an OSV advisory, or a trusted Arkiv report) → AWS key quarantined then deactivated, rogue files deleted, incident report signed to Arkiv.

Read [`docs/plan.md`](docs/plan.md) first — it opens with a status table of what is built, what is live, and what is blocked. [`plan-2.md`](plan-2.md) and [`project-overview.md`](project-overview.md) are the original, unedited inputs (design and research respectively); docs/plan.md is the living version that supersedes them where they conflict.

## Working agreements

- **Ask before every `git commit`.** Show the diff and proposed message; the user reviews first.
- **Commit at the granularity of a change, not a step.** One commit = a small feature, a complete fix, or a docs update. Never every intermediate edit; never a week of work in one blob.
- Keep docs changes in separate commits from code.
- Attribution: end commits with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and the `Claude-Session:` trailer, per the system reminder active in-session — don't hardcode a different policy here if that reminder changes.
- **Never hard-wrap prose in markdown.** One paragraph or bullet = one line, however long.
- **Keep `docs/build-log.md` and `docs/feedback/*` current as the build progresses.** Only first-hand experience, evidence per item, a concrete suggestion per item. Never padded.
- **`contracts/src/KillSwitch.sol` has not been reviewed line by line yet.** Flag this explicitly before it's ever pointed at mainnet or treated as audited; it's a working first pass, not a reviewed contract.
- **Never commit `.env`, private keys, or AWS credentials.** The AWS sandbox account's keys are intentionally disposable — treat them that way, but don't paste them into docs or commit messages regardless.

## Toolchain — not on PATH by default

Foundry (`forge`, `cast`, `anvil`) and the Vercel CLI were installed via Homebrew, not npm — npm global installs hit an `EACCES` permission error on this machine (`/usr/local/lib/node_modules` isn't user-writable). If you need another global npm CLI, try `brew install <name>` or `brew install --cask <name>` first rather than `npm install -g`.

```bash
# both already on PATH via Homebrew (/opt/homebrew/bin) — no export needed
forge --version
vercel --version
```

## Commands

```bash
# shankh/ (Python watcher + CLI)
cd shankh && source .venv/bin/activate
pytest                    # test harness, currently one CLI smoke test
ruff check .              # lint

# contracts/ (Foundry) — lib/ is gitignored, fetch it after a fresh clone
cd contracts
forge install foundry-rs/forge-std --no-commit   # only needed once, or after a fresh clone
forge build
forge test                # 3 tests on KillSwitch, passing

# status-page/ (Next.js, deployed to Vercel)
cd status-page
npm run lint
npm run build
npm run dev                # local site

# arkiv/ (TS, Arkiv SDK)
cd arkiv
npm run typecheck
npm test                   # node's built-in test runner

# cross-cutting, from repo root
scripts/deploy.sh          # dry run by default; --write to actually deploy
scripts/demo.sh            # dry run (--recap) by default; --write to run the real demo
scripts/evidence.sh        # dry run by default; --write to regenerate docs/evidence.md
```

## Environment

- Root `.env` (gitignored): see `.env.example` for every variable and where to get it.
- `DEPLOYER_PRIVATE_KEY` and `ARKIV_WALLET_PRIVATE_KEY` are `0x`-prefixed hex, testnet-only — never reuse either outside this project.
- Never print private keys or AWS secret keys in any tool output, doc, or commit. Derive addresses with `cast wallet address --private-key $DEPLOYER_PRIVATE_KEY` rather than echoing the key itself.

## Live

| | |
|---|---|
| GitHub repo | https://github.com/krishnan74/shankh (public, 7 commits pushed 2026-11-06) |
| Deployer / operator | `0xDcbe075a907960951Cd4df379BB21461097eEa91` (funded, 1.76 Sepolia ETH as of 2026-11-06) |
| `KillSwitch` (Sepolia) | `0x378fDf7BbdCB33D3504e96083a7DC7Fb882a0A2C`, maintainer confirmed on-chain |
| ENS `shankh.eth` tree | not registered |
| Status page | https://status-page-plum-nine.vercel.app (Vercel project `rdk07042004gmailcoms-projects/status-page`, connected to the GitHub repo for auto-deploy on push to `main`) |

## Facts learned the hard way

- `npm install -g <pkg>` fails with `EACCES` on this machine (`/usr/local/lib/node_modules` not user-writable) — use `brew install` / `brew install --cask` instead for global CLIs (hit this installing the Vercel CLI, 2026-11-05).
- `piping `curl | bash`` installers (e.g. the official Foundry installer script) are blocked by the auto-mode permission classifier — use `brew install foundry` instead (2026-11-05).
- `@arkiv-network/sdk` resolves cleanly from npm at `1.0.1` on Node 24 with no peer-dep issues — one of plan-2.md's "to verify at event" rows is already closed (2026-11-05).
- Each team can win only **one** Arkiv track prize (Mirror vs. Build on Arkiv) — Shankh is submitting Build on Arkiv (`shankh.report`/`shankh.request`); the OSV mirror can still be built but isn't the prize target. See `docs/decisions.md` ADR 0001.

## Layout

```
shankh/         Python package: shankhd watcher + shankh CLI (Typer). pyproject.toml, .venv, pytest.
contracts/      Foundry project. KillSwitch.sol + tests + deploy script.
status-page/    Next.js app, deployed to Vercel. Live ENS/Arkiv status for the demo.
arkiv/          TS package: @arkiv-network/sdk client, shankh.report/request writers, osv.mal importer (supporting feature).
                Also holds the required /arkiv/*.md judging-criteria files (schema, friction, reach, why-arkiv, how-you-use-arkiv).
scripts/        One-command deploy.sh / demo.sh / evidence.sh. Dry run by default, --write to act.
docs/           plan.md (living plan, read first), design.md, decisions.md, build-log.md, ai-usage.md, evidence.md, feedback/.
plan-2.md, project-overview.md   Original unedited inputs — provenance only, see docs/plan.md for current state.
```

## Status

Scaffolded; status page deployed (placeholder content, see Live table), everything else still a stub. `shankh` CLI/package, `contracts` (KillSwitch, 3 tests passing locally), `status-page` (live, see above), and `arkiv` (SDK installed, typecheck/test harness passing) all have working empty-project test harnesses. Everything functional (watcher, verifier, kill sequence, ENS tree, Arkiv writers) is still a stub — see `docs/plan.md`'s Status table for the authoritative list, and `docs/plan.md`'s Open section for what's still blocking (a funded Sepolia deployer wallet, an AWS sandbox account).
