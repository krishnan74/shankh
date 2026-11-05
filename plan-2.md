# Shankh: living build plan

> **Naming:** *Shankh* (the conch blown to warn a whole village) is the product. Its parts keep plain names: `shankh` (CLI), `shankhd` (watcher daemon), `KillSwitch` (ENS revocation contract), `shankh.report` (Arkiv evidence entity). "Airlock" (Tokyo 2026 World winner) and "Kavach" (Indian Railways' train-protection system; taken on PyPI and npm) were rejected. Shankh was free on PyPI and npm on 2026-11-03; GitHub, ENS and domain are still to check.

Source of truth for the idea: [`project-overview.md`](project-overview.md). This file is the working version and the handoff between sessions.

**Audience:** ETHGlobal Mumbai 2026 judges (finalist round) and three partner tracks: **ENS** (Best Use of ENSv2), **Ethereum Foundation** (Best CROPS App, with Anon-RPC as a bonus), **Arkiv** (Build on Arkiv and Mirror, plus the Swarm bonus).

**Goal:** the fastest honest demo of a stolen credential going from *working* to *access denied* on its own, triggered by evidence that a compromised publisher can't suppress.

**Rule:** Classic from-scratch track. **No project code before kickoff.** Everything below is design until the Status table says otherwise.

## Status

| Component | State | Evidence |
|---|---|---|
| LiteLLM 1.107.0 attack chain and timeline | verified (research) | Datadog, CSA, Help Net Security write-ups: published 11:39 UTC, PyPI quarantine 13:20, Docker removed about 14:20, stolen AWS keys used about 4.5 h after theft (one Wiz observation) |
| Earlier LiteLLM compromise (1.82.7 / 1.82.8) | verified (research) | GHSA-5mg7-485q-xm76, published 2026-03-25 14:25Z: code inside `proxy/proxy_server.py` (1.82.7), `litellm_init.pth` (1.82.8) |
| AWS auto-quarantine covers only *public* leaks | verified (research) | Unit 42 / GBHackers: about 10 s after a public GitHub or npm exposure; nothing for keys stolen by malware |
| Closest prior tool is read-only | verified (research) | `secret-blast-radius`: inventory and manual runbook only, no automatic kill |
| ENSv2 registry roles and emancipation | verified (docs) | `ROLE_UNREGISTER`, `ROLE_SET_RESOLVER`, `ROLE_SET_SUBREGISTRY`, `ROLE_SET_PARENT` can be revoked from root; with none held, the registry is emancipated |
| ENSv2 beta live on Sepolia, root roles revocable there | **to verify at event** | read-only checks against the deployed registry |
| Anon-RPC supports Sepolia | **to verify at event** | ask the EF booth |
| Arkiv expiry limits, query syntax, SDK version | **to verify at event** | docs.arkiv.network |
| October advisory (GHSA/OSV) timestamp for 1.107.0 | **to find** | needed for the timeline replay |
| OpenSSF malicious-packages license | verified | Apache-2.0, OSV format |
| `shankhd` watcher (inventory, signals, matching) | planned | n/a |
| Rebuild verifier (sandbox, file-by-file comparison, risk tiers) | planned | n/a |
| AWS kill (quarantine policy, self-deactivation, CloudTrail audit) | planned | n/a |
| `KillSwitch` and ENS tree on Sepolia | planned | n/a |
| Arkiv entities (`shankh.report`, `shankh.request`) and OSV mirror | planned | n/a |
| Status page (live demo link for ENS) | planned | n/a |
| Claude Code hook | planned | n/a |
| Local package index and harmless LiteLLM replay | planned | n/a |
| Measurements | planned | see [Measurements](#measurements) |
| Submission | not started | n/a |

## Thesis

Credentials leaked publicly are quarantined in seconds; credentials stolen by a malicious package get nothing. Shankh closes that gap:
- **Notice:** your machine notices every new package and image, verifies it against its public source, and knows which credentials that code could reach.
- **Kill:** when a release is proven malicious, by your own rebuild, a maintainer's ENS kill switch, an advisory or another user's evidence, the exposed AWS keys **quarantine and deactivate themselves**, the rogue files are deleted, and an incident report is written.
- **Survive a compromised publisher:** the alarm sits on ENS and Arkiv, controlled by keys and wallets the attacker of the publisher's GitHub or PyPI accounts never held. **One person catches it; everyone is saved.**

## Design

### Inventory (what is installed, and what it could reach)
- **Python:** discover interpreters and virtual environments (PATH, `~/.venvs`, project `.venv`, pyenv, conda). For each, read every package's name, version and file hashes via `importlib.metadata` and the dist-info `RECORD` file.
- **Docker:** poll the Docker API for image digests and running containers.
- **Exposure snapshot (identifiers only, never values), stored locally in SQLite:**
  - environment-variable names (from `/proc/<pid>/environ` where readable);
  - AWS key IDs from `~/.aws/credentials` and env;
  - the instance-role name from the metadata service;
  - SSH key fingerprints;
  - GitHub, npm and PyPI token *types*;
  - LLM key *names*;
  - for containers, the env keys and mounted credential paths (`docker inspect`).

### Verification (is it what the public source builds?)
- **Source repo:** from the package's ENS record `shankh.source`, else trust-on-first-use from *earlier* versions' metadata. **Never** from the release under test, whose metadata the attacker controls.
- **Tag:** map the version to a tag by convention (`v1.2.3`, `1.2.3`, `release-1.2.3`). If no tag is found, the result is **can't verify**.
- **Rebuild in a sandbox:**
  1. Throwaway container: read-only source tree, no secrets, no host mounts.
  2. Fetch build dependencies.
  3. Cut the network (`--network none` for the build step).
  4. Run `python -m build --wheel`.
- **Compare file by file:** per-file sha256, ignoring `RECORD` / `WHEEL` metadata ordering and timestamps.
- **Risk tiers:**

  | Tier | Files |
  |---|---|
  | **Critical** | `.pth` files containing code; `sitecustomize` / `usercustomize` |
  | **High** | added or modified `.py` files; native `.so` / `.pyd` files |
  | **Info** | static assets |

  Known-legit `.pth` files (for example `distutils-precedence.pth`) are allowlisted.
- **Docker:** extract the Python packages from image layers and verify each one. Whole-image rebuild is not in scope.

### Signals (when to act)
**Automatic kill** fires on any of:
1. a local **critical or high** mismatch;
2. the maintainer's ENS revocation of this exact artifact sha256;
3. an OSV/GHSA *malware* advisory for the installed version;
4. a `shankh.report` from a reporter the user trusts, **re-verified locally**.

**Suspicion only** (triggers re-verification, never a direct kill): the registry pulling the version, a whole-project quarantine, or reports from untrusted reporters.

### Kill and clean (what happens on a match)
1. **AWS, in this order:**
   1. attach `AWSCompromisedKeyQuarantineV3` to the key's own user;
   2. `UpdateAccessKey → Inactive` on the key itself;
   3. CloudTrail `LookupEvents` for that key ID since the install time, using the separate read-only profile `shankh-audit`;
   4. flag any keys, users or roles that key created.

   The secret is read from `~/.aws` or `docker inspect` only at kill time, and held in memory only.
2. **Persistence:** delete the files listed as rogue (hash-checked first), stop affected containers, and block the exfiltration domains from the report (hosts file).
3. **Incident report** (Markdown and JSON): what was installed and when; which credentials were exposed; what was killed, and what wasn't (with one-click links for GitHub, LLM providers, npm/PyPI and SSH); the CloudTrail findings.
4. **Never delete, only deactivate.** A false alarm is reversible.

### Trust and safety of Shankh itself
- `shankhd` runs as a dedicated system user. It needs the Docker socket (root-equivalent) and read access to credential files, which makes it a high-value target.
- So: minimal dependencies, hash-pinned install, signed and reproducible releases, and Shankh verifies itself on start.
- **Reporter trust is explicit:** the user pins reporter ENS names in `~/.config/shankh/trust.toml`. Shankh's own registry adding a reporter confers nothing.

### Privacy
- The inventory and exposure snapshot never leave the device.
- Arkiv reports are synced **by time window**, never queried by package name.
- ENS reads go through **Anon-RPC** where supported.
- No analytics or trackers anywhere.

## ENS name hierarchy (Sepolia, ENSv2)

- **`shankh.eth`:** registered via commit and reveal. Its subregistry is a stock `PermissionedRegistry`.
- **`pypi.shankh.eth`:** the package registry.
  - After setup, **revoke every dangerous root role** (`ROLE_UNREGISTER`, `ROLE_SET_RESOLVER`, `ROLE_SET_SUBREGISTRY`, `ROLE_SET_PARENT` and their admin roles), so the registry is **emancipated**. Shankh cannot seize, unregister or redirect a maintainer's package name.
  - Trade-off: mistakes can't be fixed, so rehearse the setup on a fork first.
- **`<package>.pypi.shankh.eth`**, for example `shankh-demo.pypi.shankh.eth`:
  - one **PermissionedResolver per package**, so permissions can't leak between packages;
  - the maintainer receives the name; the registrar grants roles, then **revokes its own** (handover);
  - **only leaf names get a resolver**, and lookups **fail closed** (missing or wildcard counts as untrusted).
  - Text records:
    - `shankh.source`: repo URL, writable only by the maintainer role (held on a hardware wallet in the real world).
    - `shankh.revoked`: compact list of revoked artifact sha256 values, writable **only by the `KillSwitch` contract**.
- **`KillSwitch`** (one per package): holds the resolver role for `shankh.revoked`.
  - `revoke(sha256)` takes effect **instantly** (maintainer only).
  - `unrevoke(sha256)` is **queued for 48 h** and emits `UnrevokeQueued`. **Kill fast, restore slow.**
- **`reporters.shankh.eth`:** reporter subnames (e.g. `alice.reporters.shankh.eth`) with text record `shankh.signer` (EIP-712 signing address).

> Before deploying, confirm per-record-key roles on PermissionedResolver against `ensdomains/contracts-v2` source. If roles can't be scoped per key, `KillSwitch` becomes the resolver writer for the whole package node and the maintainer role writes `shankh.source` through it.

## Arkiv entities (testnet)

| Entity | Owner | Queryable fields | Payload | Expiry |
|---|---|---|---|---|
| `shankh.report` | reporter wallet | `ecosystem`, `package`, `version`, `artifactSha256`, `verdict` (mismatch / match / unverifiable), `tier`, `reporter`, `createdAt` | rogue files with hashes, exfiltration domains, source repo and commit, EIP-712 signature, optional Swarm reference | about 90 days, renewed while relevant (ENS stays the permanent record) |
| `shankh.request` | requester (CLI, CI or agent) | `ecosystem`, `package`, `version`, `requestedAt` | none | 24 h |
| `osv.mal` (Mirror) | Shankh importer wallet | `id`, `ecosystem`, `package`, `versions`, `published`, `modified` | OSV summary | renewed on each import |

- **Mirror source:** `ossf/malicious-packages` (Apache-2.0). `scripts/import-osv.ts` can be re-run, and it is incremental using `modified`.
- **Swarm bonus (stretch):** the full build log and comparison go on Swarm, and the reference goes in `shankh.report`. Never store an *encrypted* Swarm reference as-is (it contains its key).

## Demo path: web (the pitch)

Two terminals (left **Victim**, right **Attacker**) plus the status page at a public URL.

1. The victim pulls the harmless LiteLLM replay from the **local package index** (never real PyPI). The attacker's terminal receives the fake "stolen" AWS key; `aws sts get-caller-identity` with it **succeeds**.
2. The victim's `shankhd` notices the new package, rebuilds it, and finds **critical** `cook.pth` and `sitecustomize.py`.
3. Kill: quarantine policy, then **key deactivated**, then rogue files deleted, then domain blocked, then the incident report opens. A signed `shankh.report` lands on Arkiv and appears on the status page.
4. The attacker retries: **AccessDenied**.
5. A second victim machine that installed the same version but hasn't verified it yet picks up the Arkiv report, re-verifies, and kills its key too. **One catches it; everyone is saved.**
6. Maintainer path: `KillSwitch.revoke(sha256)` from the maintainer wallet; the status page flips to **revoked**; a third machine kills on the ENS signal alone. The attacker's "stolen GitHub token" can't touch the record.
7. **Servers off:** stop the status page and our backend; `shankhd` still verifies and kills (CROPS moment).
8. A clean release installs normally from a cached `match` report.

## Demo path: terminal (`shankh demo`, `--step` for presenting, `--recap` to replay without transactions)

1. Setup check: ENS tree and roles, Arkiv reachable, AWS sandbox key active, local index up.
2. Install the replay without Shankh's gate → the stolen key **works**.
3. `shankh verify litellm==1.107.0` → **mismatch (critical)**, files listed.
4. Kill → `UpdateAccessKey` **Inactive**; attacker call → **AccessDenied**.
5. `shankh report --last` → incident report.
6. Untrusted reporter posts a fake mismatch for a clean package → re-verification finds a **match**, so **no kill**.
7. `KillSwitch.unrevoke` → **queued 48 h**, not effective now.
8. A non-maintainer tries to write `shankh.revoked` → **reverts**.
9. Restore: reactivate the sandbox key and reset the demo state.

## Roadmap

Every step keeps the same invariants: never delete credentials, never trust release metadata for the source, automatic kills only on the four signals above, no data leaves the device.

| # | Step | Model | Status |
|---|---|---|---|
| 0 | Watcher plus AWS kill | Inventory, then an OSV malware advisory or a manual signal, then AWS quarantine, deactivation and report | planned (**demo works with this alone**) |
| 1 | Own-machine verification | Background rebuild of new packages and Docker Python layers, with risk tiers | planned |
| 2 | Shared evidence | Signed `shankh.report` on Arkiv; time-window sync; local re-verification before acting | planned |
| 3 | Maintainer kill switch | ENS tree, emancipated registry, `KillSwitch` with timelocked un-revoke, status page | planned |
| 4 | Install gate and agents | `shankh pip install`, `shankh docker pull`, the Claude Code `PreToolUse` hook, cooldown, hallucinated-name check | planned |
| 5 | Wider coverage | GitHub token revocation API, an off-host responder for instance roles, npm ecosystem, OS keychains | after the event |

## Measurements

| Metric | How | Target or status |
|---|---|---|
| Timeline replay | Real LiteLLM timestamps against Shankh's signals (own rebuild, advisory, maintainer) | "Key dead X h before first observed use" |
| Signal → key inactive | Wall clock in the demo, 10 runs | seconds (to measure) |
| Rebuild time | `litellm` and 20 common packages | seconds per package |
| Coverage | LiteLLM's dependency tree plus the top N PyPI packages | % match / unverifiable / false alarm (info vs high vs critical) |
| Detection | Real malicious samples from a public research dataset, file comparison only, in the sandbox, never installed | % flagged critical or high |
| Gas | `revoke`, `unrevoke` queue, read via UniversalResolver | measured on Sepolia |
| Dogfooding | My FinOps agent's dependencies and Docker setup | report |

## Cut list

Cut in this order if time runs short:
1. Swarm bonus.
2. Off-host responder for instance roles.
3. Providers other than AWS (alert only).
4. npm ecosystem.
5. Whole-image Docker rebuilds (Python layers only).
6. Hallucinated-name check.
7. Cooldown.

Never cut: the AWS kill, the critical-tier rebuild check, the Arkiv report, the ENS `KillSwitch`, the status page, the demo replay.

## Decisions taken

- **Remediation first, prevention second.** The rebuild gate alone reads as "just reproducible builds" and only protects existing users. The kill fills a confirmed gap.
- **Partner picks:** ENS, EF, Arkiv. World and Hedera were dropped (crowded agent-approval and agent-payment fields at Tokyo); Chainlink is one small prize and NpmGuard already used it.
- **Kill triggers tiered.** A registry pull is suspicion only, because whole-project quarantines and harmless deletions exist.
- **Deactivate, never delete;** unrevoke timelocked. Mistakes and abuse stay reversible.
- **Source repo from ENS or earlier versions,** never from the release under test.
- **Emancipated package registry,** so Shankh can't seize maintainer names.
- **Time-window sync** for Arkiv; Anon-RPC for ENS reads. Privacy by construction.
- **Local package index and AWS sandbox account** for the demo; nothing malicious-looking is ever published.
- **No biology metaphors** ("Immunity" was a 2026 finalist). The metaphor is the conch.

## Open

- Name check: GitHub org, `shankh.eth`, domain.
- Anon-RPC on Sepolia; ENSv2 per-record-key roles and root-role revocation on the Sepolia beta.
- Arkiv maximum expiry and the query syntax.
- October advisory timestamp; any public timeline for the first use of stolen keys beyond Wiz's.
- Which public malicious-sample dataset to use, its license and handling rules.
- Team split (one person each: watcher and AWS; rebuild verifier; contracts and status page; Arkiv and demo).
- The repository must be **public** at submission (ENS and EF tracks require it).
