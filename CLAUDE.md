# Shankh — working notes for Claude

Credentials stolen by a malicious package quarantine and deactivate themselves. Mechanism, in order: watch installs → rebuild and diff against public source in a sandbox → on a mismatch (or an ENS revocation, an OSV advisory, or a trusted Arkiv report) → AWS key quarantined then deactivated, rogue files deleted, incident report signed to Arkiv.

Read [`docs/plan.md`](docs/plan.md) first — it opens with a status table of what is built, what is live, and what is blocked. [`plan-2.md`](plan-2.md) and [`project-overview.md`](project-overview.md) are the original, unedited inputs (design and research respectively); docs/plan.md is the living version that supersedes them where they conflict. [`ensv2-guide.md`](ensv2-guide.md) — read before writing or changing any ENSv2 code; it's consolidated, verified-on-chain knowledge from two of the user's prior ENSv2 projects, and section 0's warning (addresses never carry over between events) applies every time. [`docs/pitch-study-guide.md`](docs/pitch-study-guide.md) — read before pitching to any partner judge; explains the idea, the real-vs-planned line, and the track-by-track angles for a human, not for tracking build status. [`landing-page-playbook.md`](landing-page-playbook.md) — read before touching `status-page/`'s design; it's the design system the page follows (one scrolling page as the pitch, three type roles, one accent, a 12-col grid, progressive disclosure).

## Working agreements

- **Ask before every `git commit`.** Show the diff and proposed message; the user reviews first.
- **Commit at the granularity of a change, not a step.** One commit = a small feature, a complete fix, or a docs update — including the docs that describe it, in the same commit. Never every intermediate edit; never a week of work in one blob.
- Attribution: end commits with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and the `Claude-Session:` trailer, per the system reminder active in-session — don't hardcode a different policy here if that reminder changes.
- **Never hard-wrap prose in markdown.** One paragraph or bullet = one line, however long.
- **Keep `docs/build-log.md` and `docs/feedback/*` current as the build progresses.** Only first-hand experience, evidence per item, a concrete suggestion per item. Never padded.
- **`contracts/src/KillSwitch.sol` was reviewed line by line by the user on 2026-11-06, but never externally audited.** Say "reviewed", never "audited"; flag that before it's ever pointed at mainnet. Any change to it after that review is unreviewed again.
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
pytest                    # 47 tests: inventory/fingerprint/verify/ens/scan/trust/daemon/kill/report units + one live check against real PyPI
ruff check .              # lint
shankh verify <pkg>==<version>                    # real PyPI by default, auto-reports to Arkiv
shankh verify <pkg>==<version> --find-links <dir> # against a local replay index instead
shankh verify <pkg>==<version> --no-report        # skip the Arkiv write
shankh scan                                       # check every installed package against every ENS kill switch under pypi.shankh.eth
shankh scan --site-packages <dir>                 # ...a specific environment's packages instead
shankh scan --trust <name>.reporters.shankh.eth    # also act on that reporter's Arkiv alarms, each re-checked locally (or list them in ~/.config/shankh/trust.toml)
shankhd --trust <name>.reporters.shankh.eth        # the watcher: rebuild every new install as it lands, sweep ENS + Arkiv every minute (--once for one round)
shankh restore-key <AKIA…>                        # switch a key Shankh turned off back on (registered keys only; SHANKH_AWS_PROFILE)
shankh fingerprint <pkg>                          # the installed build's fingerprint -- what a maintainer flags via KillSwitch.revoke()
# ENS reads need PYPI_REGISTRY_ADDRESS and SEPOLIA_RPC_URL exported; --trust also needs ENS_REGISTRY_ADDRESS (shankh.eth's registry).

# contracts/ (Foundry) — lib/ is gitignored, fetch it after a fresh clone
cd contracts
forge install foundry-rs/forge-std --no-commit   # only needed once, or after a fresh clone
forge build
forge test                # 6 tests on KillSwitch, passing

# status-page/ (Next.js, deployed to Vercel)
cd status-page
npm run lint
npm run build
npm run dev                # local site
# production deploy: from the REPO ROOT, not from inside status-page/ (Root Directory is set on the Vercel project)
cd .. && vercel deploy --prod --yes --cwd .

# arkiv/ (TS, Arkiv SDK)
cd arkiv
npm run typecheck
npm test                   # node's built-in test runner
npm run check-alarm -- <entityKey> [--try-edit]   # read an alarm's creation flags; --try-edit proves read-only (the chain refuses)

# cross-cutting, from repo root
scripts/deploy.sh          # dry run by default; --write to actually deploy
scripts/demo.sh            # dry run (--recap) by default; --write to run the real demo
scripts/evidence.sh        # dry run by default; --write to regenerate docs/evidence.md
scripts/demo-ens.sh prepare   # fresh, unflagged poisoned demo build in .demo/ (inert; never starts its Python)
scripts/demo-ens.sh run       # live: scan (clean) -> maintainer flags it on Sepolia -> scan (COMPROMISED, alarm to Arkiv)
scripts/demo-watch.sh prepare # fresh poisoned build + an empty throwaway victim environment in .demo-watch/
scripts/demo-watch.sh run     # live: stolen AWS key works -> pip install the poisoned build -> COMPROMISED, posted to Arkiv, key switched off -> stolen key REJECTED
scripts/demo-watch.sh restore # switch the demo AWS key back on (prepare does this too)
scripts/demo-arkiv.sh prepare # fresh poisoned build installed on two throwaway "machines" in .demo-arkiv/
scripts/demo-arkiv.sh run     # live: B scans (clean) -> A rebuilds it, posts CRITICAL to Arkiv -> B reads the trusted alarm, re-checks, COMPROMISED
scripts/ens/add-package-sepolia.sh <label>   # register another package under pypi.shankh.eth with its own resolver + KillSwitch
scripts/ens/add-reporter-sepolia.sh <label> <signer>   # give a reporter an ENS identity under reporters.shankh.eth (shankh.signer, writable only by them)
```

## Environment

- AWS sandbox (set up 2026-11-07): CLI profile `shankh-sandbox` is what Shankh acts with (`SHANKH_AWS_PROFILE`); profile `shankh-victim` holds the demo's "stolen" key, the only key Shankh may switch off (`SHANKH_PROTECTED_KEYS`). The account also holds the user's personal admin user — never touch anything but the registered key. Never print or paste AWS secrets; `aws sts get-caller-identity` shows identities without them.

- Root `.env` (gitignored): see `.env.example` for every variable and where to get it.
- `DEPLOYER_PRIVATE_KEY` and `ARKIV_WALLET_PRIVATE_KEY` are `0x`-prefixed hex, testnet-only — never reuse either outside this project. They're both currently set to the same operator wallet's key (reused deliberately — a private key isn't chain-specific, and it's testnet-only either way).
- Never print private keys or AWS secret keys in any tool output, doc, or commit. Derive addresses with `cast wallet address --private-key $DEPLOYER_PRIVATE_KEY` rather than echoing the key itself.

## Live

| | |
|---|---|
| GitHub repo | https://github.com/krishnan74/shankh (public, MIT, default branch `main`; a push to `main` auto-deploys the site) |
| Deployer / operator | `0xDcbe075a907960951Cd4df379BB21461097eEa91` (funded, 1.76 Sepolia ETH as of 2026-11-06) |
| `KillSwitch` (Sepolia) | one per package: `shankh-demo`'s is `0x1126b7aBe8b0Db262cBa84b6b5a377D002351c5a` (has flagged real builds). The first, global `0x378fDf7B…` is superseded (ADR 0003). Reviewed line by line by the user 2026-11-06, not audited |
| `shankh.report` (Arkiv testnet) | written by the operator wallet and by demo machine B's own wallet `0xD7290D56042105e64FF16BE6CACC2da6E958bC5c` (`MACHINE_B_ARKIV_PRIVATE_KEY` in `.env`); every alarm since 2026-11-07 is `readonly` + `permissionlessExtension` (proven: alarm `0x6a1c8ffc…`, see docs/evidence.md) |
| `shankh.eth` → `pypi.shankh.eth` → `shankh-demo.pypi.shankh.eth` | **live on Sepolia** — `0xb95110b3...` / `0x8634b9f5...` (emancipated) / `0xe2f5e5dc...` resolver; per-package `KillSwitch` at `0x1126b7aB...` has already revoked a demo artifact for real — see docs/evidence.md |
| `reporters.shankh.eth` → `shankh-team.reporters.shankh.eth` | **live on Sepolia** — registry `0x9b833a13...` (emancipated), resolver `0xb6bc8cb1...`, `shankh.signer` = the operator wallet. `shankh scan --trust shankh-team.reporters.shankh.eth` acts on that wallet's Arkiv alarms, proven live by `scripts/demo-arkiv.sh` — see docs/evidence.md |
| Landing page + `/registry` | https://shankh-eth.vercel.app and `/registry` — a project production domain (follows every prod deploy; the old `status-page-plum-nine.vercel.app` still works; `shankh.vercel.app` was taken). Every value read live per request from Sepolia and Arkiv, each read capped at 4s. A push to `main` auto-deploys (confirmed 2026-11-07); a manual deploy is `vercel deploy --prod --yes --cwd .` from the repo root |

## Facts learned the hard way

- `npm install -g <pkg>` fails with `EACCES` on this machine (`/usr/local/lib/node_modules` not user-writable) — use `brew install` / `brew install --cask` instead for global CLIs (hit this installing the Vercel CLI, 2026-11-05).
- `piping `curl | bash`` installers (e.g. the official Foundry installer script) are blocked by the auto-mode permission classifier — use `brew install foundry` instead (2026-11-05).
- `@arkiv-network/sdk` resolves cleanly from npm at `1.0.1` on Node 24 with no peer-dep issues — one of plan-2.md's "to verify at event" rows is already closed (2026-11-05).
- ENSv2's `isEmancipated()` boolean can read `true` while a registry is still upgradeable: the real `UNEMANCIPATED_ROLE_BITMAP` (`RegistryRolesLib.sol`) includes `ROLE_UPGRADE`/`ROLE_UPGRADE_ADMIN`/`ROLE_CAN_TRANSFER_ADMIN`, which a narrow test (like our own spike 1) can miss entirely if the test registry never held those roles to begin with — the check only reads what you actually revoked, not what you should have. Always verify the real constant from source (Sourcify), never trust that `isEmancipated()==true` alone proves every dangerous role is gone, and test by attempting a real regrant (`EACCannotGrantRoles` should revert), not just by reading the boolean (2026-11-06).
- `anvil --fork-url` can fail with `failed to get account for ...: block not found` if it forks from the remote RPC's exact latest block (a race against the node's own head). Pin `--fork-block-number` to a few blocks behind latest instead (2026-11-06).
- A Vercel project's **Root Directory** must be set for a monorepo subfolder app, or GitHub-triggered auto-deploys fail (`Couldn't find any pages or app directory`) even though manual `vercel deploy --prod` run from inside that subfolder keeps working fine — the two paths aren't equivalent, and the failing one is silent unless you actually check `vercel ls`/the dashboard. Set via the Vercel MCP's `update_project` (`rootDirectory`), or the dashboard. After setting it, a manual CLI deploy has to run from the repo root (with `.vercel/project.json` linked there to the right project id), not from inside the subfolder anymore (2026-11-06).
- Each team can win only **one** Arkiv track prize (Mirror vs. Build on Arkiv) — Shankh is submitting Build on Arkiv (`shankh.report`/`shankh.request`); the OSV mirror can still be built but isn't the prize target. See `docs/decisions.md` ADR 0001.
- Arkiv reads with no `ARKIV_ACCESS_KEY` don't fail, they hang (minutes) against the rate-limited public endpoint, and even keyed reads stall intermittently — every Arkiv call from Python has a 60s timeout for that reason. `cast wallet new --json` nests the key at `data[0].private_key`; write new keys straight into `.env` and never print them (2026-11-07).
- Arkiv `readonly` means nobody can *edit* an entity — its owner can still delete or transfer it. Say "read-only", never "undeletable" or "permanent" (2026-11-07).

## Layout

```
shankh/         Python package: shankhd watcher + shankh CLI (Typer). pyproject.toml, .venv, pytest.
contracts/      Foundry project. KillSwitch.sol + tests + deploy script.
status-page/    Next.js app, deployed to Vercel. Live ENS/Arkiv status for the demo.
arkiv/          TS package: @arkiv-network/sdk client, shankh.report/request writers, osv.mal importer (supporting feature).
                Also holds the required /arkiv/*.md judging-criteria files (schema, friction, reach, why-arkiv, how-you-use-arkiv).
scripts/        One-command deploy.sh / demo.sh / evidence.sh. Dry run by default, --write to act.
video-assets/   demo-video cards (opening-card.png, end-card.png, from card.html) and the newspaper still; *.mp4 renders are gitignored.
docs/           plan.md (living plan, read first), design.md, decisions.md, build-log.md, ai-usage.md, evidence.md, feedback/.
plan-2.md, project-overview.md   Original unedited inputs — provenance only, see docs/plan.md for current state.
```

## Status

**Deadline: Saturday 2026-11-07, 09:00 IST.** Features are frozen except demo-path fixes; what's left is finishing the video (`docs/demo-video-script.md`, assets in `video-assets/`, recordings never committed — `*.mp4` is gitignored), adding its link to the README and form, and a final pre-submission check. The submission form copy is in `docs/submission-form.md`.

Live and proven end to end: the `shankhd` watcher catches a poisoned install within seconds with nobody typing a command; `shankh verify` rebuilds a package from its public source; `shankh scan` sweeps every package's ENS bad-builds list under the emancipated `pypi.shankh.eth`, and with `--trust` acts on trusted reporters' Arkiv alarms (reporters named under the emancipated `reporters.shankh.eth`), re-checking each locally; alarms are read-only and extendable by anyone; the landing page and `/registry` read all of it live. The AWS key shut-off is live too (2026-11-07): `shankh.kill.respond()` quarantines then deactivates keys listed in `SHANKH_PROTECTED_KEYS`, via the `SHANKH_AWS_PROFILE` profile (`shankh-sandbox`; the demo's stolen key is profile `shankh-victim`); `scripts/demo-watch.sh restore` / `shankh restore-key` switches it back on. Not built: key auto-discovery, CloudTrail audit, file cleanup, the OSV advisory signal, Docker, `shankh.request`. See `docs/plan.md`'s Status table for the authoritative list, and `docs/pitch-study-guide.md` before pitching.
