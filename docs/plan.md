# Shankh: living build plan (ingested)

> This is the working, current version of the plan, read by the user and Claude first. The original inputs are unedited for provenance: [`plan-2.md`](../plan-2.md) (architecture, demo, roadmap) and [`project-overview.md`](../project-overview.md) (research, prior art, case for judges). This file adds the time-box, the dependency spikes, and tracks what's actually done.

## Status

| Component | State | Evidence |
|---|---|---|
| LiteLLM 1.107.0 attack chain and timeline | verified (research) | Datadog, CSA, Help Net Security — see project-overview.md §2 |
| Earlier LiteLLM compromise (1.82.7/1.82.8) | verified (research) | GHSA-5mg7-485q-xm76 |
| AWS auto-quarantine covers public leaks only | verified (research) | Unit 42 / GBHackers |
| secret-blast-radius is read-only | verified (research) | its own docs |
| ENSv2 registry roles and emancipation | verified (docs) | docs.ens.domains/ensv2/permissioned-registry |
| ENSv2 beta live on Sepolia, root roles revocable there | verified — spike 1 passed | emancipation confirmed end to end on real Sepolia tx: proxy `0x6a436e...2f2fd`, revoke tx `0xc8a950c2...`, block 12072481 — see docs/feedback/ens.md |
| Anon-RPC supports Sepolia | **to verify at event** | spike 2 (ask EF booth) |
| `@arkiv-network/sdk` version | verified | resolves cleanly at `1.0.1` on npm/Node 24, no peer-dep issues — `arkiv/package.json` |
| Arkiv expiry limits, query syntax | **to verify at event** | spike 3 (version is now closed, syntax/limits aren't) |
| AWS sandbox account provisioned | **to verify at event** | spike 4 |
| Repo scaffold (4 stacks, docs, scripts) | built | `shankh/`, `contracts/`, `status-page/`, `arkiv/`, `docs/`, `scripts/` — see docs/design.md |
| `shankhd` watcher (inventory, signals, matching) | **built and proven live** — lists the watched site-packages every 2s (no network) and rebuilds each new install as it lands; every 60s sweeps ENS and trusted reporters' Arkiv alarms; remembers handled builds and reports so nothing is alerted on or rebuilt twice; on a compromise posts to Arkiv once and calls `shankh.kill.respond()` (an honest stub until the AWS kill exists). Memory is per run; not a system service yet | `scripts/demo-watch.sh`: a poisoned build installed while it ran was caught 2s later with no command typed, entity `0x574edd31…cf10` — see docs/evidence.md |
| Rebuild verifier (file-by-file provenance diff, risk tiers) | **built, proven against both a real clean PyPI package and a real planted malicious wheel** | `shankh/shankh/verify/`, `shankh/shankh/inventory/`; see docs/feedback or build-log 2026-11-06 for the evidence |
| End-to-end: verify → Arkiv report | **wired and proven** — `shankh verify` writes its result to a real `shankh.report` entity automatically (Python shells out to the TS writer via `arkiv/src/write-report-cli.ts`, `--no-report` to skip) | entity `0xc669ad67...`, tx `0x39b329ad...` — see docs/evidence.md |
| ENS revocation as a kill signal, wired into `verify()` and the status page | **built and wired** — `shankh/shankh/ens/` reads `shankh.revoked` off the real resolver and forces `verify()`'s tier to critical on a match, independent of the rebuild diff; the signal travels with the Arkiv report (`artifactSha256`/`ensRevoked`) and is re-read live on the status page via `status-page/lib/ens.ts` | see docs/evidence.md and docs/build-log.md 2026-11-06 |
| Registry sweep: check every installed package against every maintainer's ENS kill switch (`shankh scan`) | **built and proven end to end on Sepolia** — bad builds identified by an installed-build fingerprint (replaces the source-archive hash, which couldn't flag a poisoned wheel); every package under `pypi.shankh.eth` read from the registry's own events; a maintainer flagged a rehearsal build live and `shankh scan` caught it with no rebuild, alarm posted to Arkiv. Suggested by the ENS team after the first pitch. `scripts/demo-ens.sh` runs it live. | see docs/evidence.md (rehearsal flag tx `0xef5625a0…`, Arkiv entity `0xea090662…`) |
| Acting on Arkiv alarms from trusted reporters (`shankh scan --trust`) | **built and proven live** -- reporters are chosen by ENS name (`<name>.reporters.shankh.eth`, emancipated parent, `shankh.signer` writable only by the reporter) in `~/.config/shankh/trust.toml` or `--trust`; scan reads their recent `shankh.report` entities filtered by the chain-recorded signer (`$creator`), never by package, matches them against installed builds by name, version and fingerprint, and re-checks each match locally before calling it compromised. A report that doesn't hold up is ignored; one that can't be re-checked is a warning, never an action. `scripts/demo-arkiv.sh` runs it with two throwaway environments on one laptop | see docs/evidence.md (entity `0xe7d2102e…`, reporter `shankh-team.reporters.shankh.eth`) |
| AWS kill (quarantine policy, self-deactivation, CloudTrail audit) | planned | n/a |
| `KillSwitch` contract | **deployed to Sepolia** | `0x378fDf7BbdCB33D3504e96083a7DC7Fb882a0A2C`, deploy tx `0x9349e7b0e5d2e1880e6163fa1737914f25fdf125ecdb011dafff31babdb7aef2`, `maintainer()` confirmed on-chain to match the operator wallet |
| ENS tree on Sepolia | **live on real Sepolia** | `shankh.eth` → `pypi.shankh.eth` (emancipated, corrected bitmap, confirmed `isEmancipated()==true` and re-grant reverts) → `shankh-demo.pypi.shankh.eth` (split resolver grants, `KillSwitch` syncs `shankh.revoked`, confirmed via real `resolve()` reads) — see docs/evidence.md for every address and `scripts/ens/register-tree-sepolia.sh` for the script that built it |
| Arkiv entities (`shankh.report`, `shankh.request`) and OSV mirror | **`shankh.report` writer proven live on the testnet**; `shankh.request` is schema-only, no writer yet; OSV mirror still a stub | real entity `0x8110825...`, tx `0x63442b3e...` — see docs/evidence.md; `arkiv/src/schema.ts`, `arkiv/src/client.ts`, `arkiv/src/report.ts` |
| Status page (live demo link for ENS) | **deployed, reading real live data** | https://shankh-eth.vercel.app reads `KillSwitch.maintainer()` on Sepolia and queries real `shankh.report` entities from Arkiv, server-side, on every request (`export const instant = false` + `connection()` to defeat Next 16's static prerendering — otherwise it would freeze whatever it saw at build time, which is exactly the "hard-coded values" failure the ENS track rules out) |
| Claude Code hook | planned | n/a |
| Local package index and harmless LiteLLM replay | planned | n/a |
| Measurements | planned | see plan-2.md Measurements |
| Submission | **drafted, not submitted** — README rewritten for judges, form copy in `docs/submission-form.md`, 3-minute video script in `docs/demo-video-script.md`, AI-usage doc updated; still open: record the video, the team's own words in `docs/ai-usage.md` and `arkiv/reach.md`, the submitted commit hash | README cold-start check from a fresh clone: 34 tests pass, `shankh scan` works with only the pre-filled public `.env.example` |

## Thesis

Credentials leaked publicly are quarantined in seconds (AWS's own `AWSCompromisedKeyQuarantineV3`, triggered off public GitHub/npm scanning). Credentials stolen by a malicious package get nothing — that's exactly what happened to the LiteLLM 1.107.0 victims in October 2026. Shankh closes that gap: it watches what's installed and what it can reach, verifies new releases against their public source in a sandboxed rebuild, and when a release is proven malicious — by that rebuild, a maintainer's ENS kill switch, an OSV/GHSA advisory, or another user's signed Arkiv report — the exposed AWS keys quarantine and deactivate themselves automatically, without waiting for a human to notice. The alarm itself lives on ENS and Arkiv, under keys the attacker who compromised the *publisher's* GitHub/PyPI accounts never held, so one person's catch saves everyone else running the same version.

## Demo path (judge-facing, with timings)

Two terminals (Victim / Attacker) plus a public status page. Target: under 5 minutes end to end.

| # | Step | ~Time |
|---|---|---|
| 1 | Victim installs the harmless LiteLLM replay from a **local package index** (never real PyPI); attacker's terminal receives the "stolen" key; `aws sts get-caller-identity` **succeeds** | 20s |
| 2 | `shankhd` notices the new package, rebuilds it in the sandbox, finds **critical** `cook.pth` / `sitecustomize.py` mismatch | 30–45s |
| 3 | Kill sequence: quarantine policy attached → key set `Inactive` → rogue files deleted → domain blocked → incident report opens; signed `shankh.report` lands on Arkiv and shows on the status page | 15–30s |
| 4 | Attacker retries → **AccessDenied** | 5s |
| 5 | A second victim machine (same version, not yet verified) picks up the Arkiv report, re-verifies locally, kills its own key too — "one catches it, everyone is saved" | 20–30s |
| 6 | Maintainer path: `KillSwitch.revoke(sha256)` from the maintainer wallet; status page flips to **revoked**; a third machine kills on the ENS signal alone, with no rebuild | 30s |
| 7 | **Servers off** — kill the status page and backend; `shankhd` still verifies and kills locally (the CROPS moment) | 15s |
| 8 | A clean release installs normally, served by a cached `match` report | 10s |

Terminal variant (`shankh demo --step` / `--recap`) covers the same beats plus two negative tests (untrusted reporter's false mismatch → re-verifies to `match`, no kill; non-maintainer tries to write `shankh.revoked` → reverts) — useful for a judge Q&A walkthrough but the web demo above is the one to protect first.

## Time-box

**Correction (2026-11-05):** "Saturday 22:00" is kickoff, not the submission deadline — this was mis-read in the first ingest pass. **Kickoff: today, 2026-11-05, 22:00** (timezone assumed IST, not yet confirmed). The actual submission deadline is still open — needs the real number from the event page/schedule before the arithmetic below is trustworthy. Hours-remaining estimates until that's confirmed are not load-bearing.

**Classic track rule (plan-2.md, line 11): no project code before kickoff.** This repo was scaffolded *before* 22:00 today as design/prep work, but nothing has been committed to git — git log is empty by design, so no project code exists on the record before kickoff. Do not commit anything until the user says go, and not before 22:00 regardless of what else is ready.

Rough effort against the roadmap in plan-2.md (steps 0–4; step 5 is explicitly post-event) — kept for reference, re-check once the real deadline lands:

| Roadmap step | Est. hours |
|---|---|
| 0 — Watcher + AWS kill | 6–8 |
| 1 — Own-machine rebuild verification | 8–10 |
| 2 — Arkiv shared evidence | 6–8 |
| 3 — ENS tree + `KillSwitch` + status page | 8–10 |
| 4 — Install gate + Claude Code hook | 4–6 |
| Demo polish, rehearsal, submission pack | 6–8 |
| **Total** | **38–50** |

That fits inside the ~48–55 hours available, with slack for the dependency spikes below and at least one full rehearsal. It is not roughly double the budget, so the existing cut list in plan-2.md (Swarm bonus → off-host responder → non-AWS providers → npm → whole-image Docker rebuilds → hallucinated-name check → cooldown) stands as written; no new cuts needed yet. Re-check this arithmetic once the exact deadline time and timezone are confirmed and after step 0 is built (it'll calibrate the rest).

## Dependency spikes (do these first, in parallel, before product code)

Each is a throwaway proof whose only job is to burn down an "to verify at event" row above.

1. **ENSv2 Sepolia roles** — register a throwaway name on the ENSv2 Sepolia beta, revoke a root role, confirm it reads back revoked. Answers: is root-role revocation (emancipation) actually live there.
2. **Anon-RPC** — one read call against Sepolia through Anon-RPC. Ask the EF booth directly if it stalls; don't burn solo time on it.
3. **Arkiv** — create one entity on Arkiv testnet, set an expiry, query it back by the field types `shankh.report` will use. Confirms expiry limits, query syntax, and current SDK version against docs.arkiv.network.
4. **AWS sandbox account** — a disposable AWS account/profile with a throwaway access key, confirm `UpdateAccessKey → Inactive` and attaching `AWSCompromisedKeyQuarantineV3` both work from code, and that CloudTrail `LookupEvents` returns something within minutes (it has ingestion lag — measure it, don't assume).
5. **Sandboxed rebuild** — ~~one package (not LiteLLM yet), `--network none` build step, file-by-file hash diff against the installed copy.~~ **Passed, 2026-11-06, scope adjusted:** for a pure-Python package the published sdist already *is* the source — no compile step needed, no `--network none` build sandbox required, just a hash diff against the fetched archive. Proved against a real clean PyPI package (`idna`) with zero false positives, and against a real deliberately-malicious wheel built for this test (injected `.pth` + `sitecustomize.py`, matching the actual LiteLLM 1.107.0 persistence pattern) — correctly flagged CRITICAL. A real compiled-rebuild sandbox is still the right next step for packages with a native build step (not LiteLLM's case), where the build step itself could be tampered with.

## Unknowns (named as spikes, answered by the spikes above or a dedicated script)

- ~~Does ENSv2's `PermissionedResolver` actually scope roles per text-record key, or only per node?~~ — **answered, 2026-11-06: yes.** `grantSetterRoles(setterCalldata, account)` scopes a role to one key's resource (`keccak256(key)`); confirmed on an Anvil fork — after revoking the deployer's root `SET_TEXT`, a key-scoped grant for `shankh.source` still worked while an unscoped write to `shankh.revoked` correctly reverted. `KillSwitch` is the only holder of the `shankh.revoked`-scoped grant. See `scripts/ens/register-tree-fork-rehearsal.sh`.
- October advisory (GHSA/OSV) timestamp for 1.107.0 — needed for the timeline-replay measurement; not yet found.
- CloudTrail `LookupEvents` latency in practice — affects whether "signal → key inactive" demo timing claims are honest.
- Arkiv maximum expiry — affects whether 90 days for `shankh.report` is achievable or needs adjusting.

## Track checklist

Requirement text below is pasted verbatim from the Mumbai prize page (user-provided 2026-11-05). This replaces the earlier placeholder.

### ENS — Best Use of ENSv2 ($7,000)
- [ ] Built on ENSv2, on Ethereum **mainnet or Sepolia** (plan-2.md currently targets Sepolia only — fine, both qualify).
- [ ] ENSv2 features **central to the product, not cosmetic** — the `KillSwitch`/emancipated-registry design is exactly this; keep it that way under time pressure.
- [ ] **Demo must be functional, no hard-coded values.** The status page and ENS reads must hit the real deployed registry live, not a mocked state.
- [ ] Showcase submission needs a **live demo link** and a **public, open-source repo**.
- Good fit for Enhanced Access Control / Permissioned Resolver bonus: the one-PermissionedResolver-per-package design already matches the pattern Tokyo's ENS winners were rewarded for (Kura, Lortnoc Tahc). AI-agent bonus ("agents as namespaces") is not currently in scope — skip it, not worth the time against the deadline.

### Ethereum Foundation — Best CROPS App ($3,500)
- [ ] **One EF prize only** — CROPS is the fit (not anon-rpc or alt-mempool as the primary submission); Anon-RPC use is a bonus *within* CROPS per plan-2.md, which is consistent with the rules ("you can submit to anon-rpc, the alt mempool and CROPS, but you will be placed in at most one").
- [ ] **Lead CROPS property must be structural, not a setting.** Shankh's candidate: **S (secure)** and **C (censorship-resistant)** both apply — `shankhd` keeps killing locally even with the status page and backend off (step 7 of the demo), and the alarm survives the publisher's own compromise. Pick one as the *stated* lead property for judging; recommend **S**, since "credentials neutralise themselves with no server required" is the clearest structural claim.
- [ ] **New deliverable, not yet in plan-2.md:** README section titled `CROPS`, one or two lines per letter (C/O/P/S) — add to the scaffold.
- [ ] **New deliverable:** a **demo video, 3 minutes max**, showing the lead property live, including the moment it matters (servers off). This is separate from the live judging demo — budget time for it.
- [ ] **No third-party trackers/analytics in the client** — the status page must ship clean; check before submission.
- [ ] Public repo, OSS license, README that explains how to run it.

### Arkiv — pick ONE track prize (rules: "each team can win one Arkiv track prize")
Plan-2.md's design currently touches both Arkiv prizes (`shankh.report`/`shankh.request` = Build on Arkiv; `osv.mal` OSV mirror = Mirror). **Only one can be the submitted prize target** — needs a decision (see Open, below). Both can still be *built*; only the submission/scoring choice differs, and the required `/arkiv/*.md` files differ per track.

- [ ] **Built from scratch at ETHGlobal Mumbai** — true either way, Shankh is a from-scratch Classic track project.
- [ ] Writes to Arkiv's **current testnet** via `@arkiv-network/sdk` or JSON-RPC (RPC: `rpc.rabdi.db-chain.testnet.arkiv.network`, chain ID 7794095), and at least one feature **reads** it back — not just a write-only log.
- [ ] README: wallet address(es) that wrote the entities, and one runnable query.
- [ ] `/arkiv/schema.md` — entities, queryable fields, owner, expiry. `/arkiv/friction.md` — Arkiv feedback (what got in the way, what broke).
- [ ] **If targeting Build on Arkiv:** also `/arkiv/reach.md`, `/arkiv/why-arkiv.md`, `/arkiv/how-you-use-arkiv.md`.
- [ ] **If targeting Mirror:** data license must allow republishing (OpenSSF malicious-packages is Apache-2.0 — fine), can't be Sourcify data, import script must be in-repo and re-runnable, plus `/arkiv/reach.md`, `/arkiv/why-arkiv.md`, `/arkiv/data-quality.md`.
- [ ] Say how AI was used in the build, per ETHGlobal's own rules (separate from the CROPS/judging docs).
- [ ] Arkiv + Swarm bonus (stretch, already last-priority in the cut list) layers on top of whichever track prize is chosen.

## Open (carried over from plan-2.md, plus new from this ingest)

- ~~`vercel login`~~ — **done 2026-11-06**, status page deployed to https://shankh-eth.vercel.app (placeholder content, confirmed publicly reachable).
- ~~Funded Sepolia deployer wallet~~ — **done 2026-11-06.** The user provided an operator wallet (`OPERATOR_PRIVATE_KEY` in `.env`, 1.76 Sepolia ETH; a Claude-generated throwaway wallet from earlier in the session was unused and is dead weight in `.env`, safe to delete). Spike 1 (ENSv2 root-role revocation) passed — see the Status table and docs/feedback/ens.md. ~~`KillSwitch` deploy~~ — **done 2026-11-06**, see Status table.
- An AWS sandbox account/profile (`AWS_PROFILE=shankh-sandbox`, plus `shankh-audit` per plan-2.md's design) for spike 4 and all of the AWS-kill work.
- ~~Real `ARKIV_ACCESS_KEY`/`ARKIV_WALLET_PRIVATE_KEY`~~ — **done 2026-11-06.** User got a free access key from hub.arkiv.network/access-keys and funded the (reused) Sepolia operator wallet with Arkiv testnet tokens. `shankh.report` writer proven live — see Status table. Spike 3's remaining unknowns (expiry ceiling, query syntax/performance at scale) are still open, but the SDK version, write path, and query path are all now confirmed.
- **Actual submission deadline** — "Saturday 22:00" turned out to be kickoff (today, 2026-11-05), not the deadline; the real deadline still needs to come from the event page/schedule.
- ~~Which Arkiv track to submit for~~ — **decided: Build on Arkiv** (`shankh.report`/`shankh.request`). The OSV mirror can still be built as a supporting feature but is not the submitted prize target.
- Which CROPS letter (C or S) to state as Shankh's lead property for EF judging — recommend **S**, see checklist above; not yet explicitly confirmed, proceeding with S unless redirected.
- New time to budget: the EF 3-minute demo video and the `/arkiv/*.md` writeups, both outside the original roadmap/cut-list estimate — roughly +2–3h, still fits the time-box.
- Name check: GitHub org, `shankh.eth`, domain.
- Anon-RPC on Sepolia; ENSv2 per-record-key roles and root-role revocation on the Sepolia beta (spikes 1–2).
- Arkiv maximum expiry and query syntax (spike 3).
- October advisory timestamp; any public timeline for first use of stolen keys beyond Wiz's.
- Which public malicious-sample dataset to use for the detection measurement, its license and handling rules.
- Team split (one person each: watcher+AWS; rebuild verifier; contracts+status page; Arkiv+demo) — not yet assigned.
- Repository must be public at submission (ENS and EF tracks require it) — set up the GitHub org/repo as public from the start.

## Confirm before scaffolding

This plan is ready to turn into a repo structure (Phase 2) once you confirm:
1. The time-box above (38–50h of work against ~48–55h available) and that the existing cut list stands as-is.
2. The demo path order (steps 1–8) is what you want the judge to see.
3. You're okay starting the four dependency spikes in parallel before any `shankhd`/contract code is written.

## Scaffold status (2026-11-06, updated)

Repo scaffolded, committed, and pushed — public at **https://github.com/krishnan74/shankh**. 7 commits, all after kickoff (2026-11-05 22:00 IST), matching the split below exactly. Confirmed against ETHGlobal's actual rules page (ethglobal.com/rules): *"Any repositories with single commits of large files without proper history will be default assumed to be unqualified"* — the per-component split satisfies this. See docs/design.md for what's real per component (still: nothing deployed, watcher/verifier/kill/ENS-tree/Arkiv-writers are all stubs).

| # | Commit | Files |
|---|---|---|
| 1 | `chore: repo scaffold baseline` | `.gitignore`, `.env.example` |
| 2 | `feat(shankh): scaffold Python watcher/CLI package` | `shankh/**` |
| 3 | `feat(contracts): KillSwitch contract with tests` | `contracts/.gitignore`, `foundry.toml`, `src/KillSwitch.sol`, `test/KillSwitch.t.sol`, `script/DeployKillSwitch.s.sol` |
| 4 | `feat(status-page): scaffold Next.js status page` | `status-page/**` |
| 5 | `feat(arkiv): scaffold Arkiv SDK package` | `arkiv/package.json`, `package-lock.json`, `tsconfig.json`, `src/**` |
| 6 | `chore: one-command deploy/demo/evidence scripts` | `scripts/*.sh` |
| 7 | `docs: plan, design, decisions, build log, AI usage, feedback, Arkiv judging files, README, CLAUDE.md` | `plan-2.md`, `project-overview.md`, `docs/**`, `arkiv/*.md` (schema/friction/reach/why-arkiv/how-you-use-arkiv), `README.md`, `CLAUDE.md` |

`contracts/lib/forge-std` is vendored and gitignored (not a submodule) — a fresh clone needs `forge install foundry-rs/forge-std --no-commit` before `forge test` works; this is documented in README.md and CLAUDE.md.

Say go and I'll scaffold the repo.
