# Technical deep dive — how Shankh actually works

The pitch study guide (`docs/pitch-study-guide.md`) explains the idea. This document explains the machinery: what each component does, step by step, how the pieces talk to each other, and why each design choice was made. Every section says plainly whether it describes code that exists today or the finished design from `plan-2.md`.

---

## Part 1 — The whole system on one page

Shankh has four jobs. Think of them as a pipeline on every developer machine, plus two shared public places where alarms are posted.

```
                        ┌──────────────────── one developer's machine ────────────────────┐
  pip install foo  ───▶ │ 1. NOTICE   what got installed, which credentials can it reach?  │
                        │ 2. VERIFY   does the installed code match its public source?      │
                        │ 3. DECIDE   any of the four kill signals present?                 │
                        │ 4. ACT      quarantine + deactivate the reachable AWS key,        │
                        │             delete rogue files, write an incident report          │
                        └──────────┬──────────────────────────────────────▲───────────────┘
                                   │ publish signed finding                │ read alarms
                                   ▼                                       │
               ┌──────────── Arkiv (shared evidence) ────────────┐   ┌──── ENS (maintainer's switch) ────┐
               │ shankh.report: "foo 1.2.3 is CRITICAL,           │   │ foo.pypi.shankh.eth               │
               │  here are the rogue files" — signed by the       │   │   shankh.source  = repo URL        │
               │  machine that found it                           │   │   shankh.revoked = bad hashes      │
               └──────────────────────────────────────────────────┘   └───────────────────────────────────┘
```

The key insight that makes this different from a scanner: **the alarm lives in two places the attacker can't reach.** If someone steals a maintainer's GitHub or PyPI login, they can publish malicious code. They can't write to Arkiv under *your* machine's key, and they can't write `shankh.revoked` on ENS, because that's controlled by the maintainer's wallet through a contract — a credential the stolen login never touched.

---

## Part 2 — Verify: the rebuild diff (built)

This is the core detector. Code: `shankh/shankh/verify/__init__.py` and `shankh/shankh/inventory/__init__.py`.

### What problem it solves

A malicious release usually looks normal. The real LiteLLM 1.107.0 attack added two files that never appeared in the public source code:
- a `.pth` file, which Python runs automatically every time Python starts;
- a `sitecustomize.py`, which Python also imports automatically on every start.

So the question to ask about any installed package is: **is every file on my disk something the public source actually contains?**

### How it works today, step by step

1. **Read what's installed.** When pip installs a package, it writes a file called `RECORD` listing every file it put on disk with that file's sha256 hash. `installed_package(name)` reads that through Python's `importlib.metadata`. Result: a list like `foo/__init__.py → hash abc…`, `foo/cook.pth → hash def…`.
2. **Fetch the published source.** `download_sdist()` asks PyPI's JSON API (`pypi.org/pypi/foo/1.2.3/json`) for the *sdist* — the source archive — and downloads it. For the demo it can instead read from a local folder (`--find-links`), so nothing malicious ever touches real PyPI.
3. **Hash the source.** `sdist_hashes()` opens the `.tar.gz` or `.zip`, strips the top-level folder name, and computes a sha256 for every file inside.
4. **Compare file by file.** For each installed file:
   - skip files pip itself generates (`.dist-info/`, `__pycache__/`, `.pyc`, console-script launchers outside site-packages) — they'd never be in the source and aren't suspicious;
   - **not in the source at all** → `untraceable`, or `critical` if its name matches a startup hook (`.pth`, `sitecustomize.py`);
   - **in the source but with a different hash** → `modified`;
   - otherwise it matches.
5. **Take the worst finding** as the package's overall tier: `match < modified < untraceable < critical`.

It also computes `artifact_sha256`, the hash of the downloaded source archive itself. That's the identity a maintainer can revoke on ENS (Part 4).

**Proven on:** a real clean PyPI package (`idna==3.20`, no false positives) and a real malicious wheel built for the test (`evilpkg==1.0.0`, flagged critical on `sitecustomize.py`).

### Honest scope note

Today's check is a *provenance diff*: "is each installed file in the source, with the same hash?" For pure-Python packages (LiteLLM is one) the source archive *is* the code, so this already catches the real attack. It does **not** compile anything, so it can't yet judge packages with native build steps.

### Final design

`plan-2.md` goes further:
- **Source of truth for the repo:** read from the package's ENS `shankh.source` record. If there's none, trust what *earlier* versions said ("trust on first use"). **Never** trust the release being tested, because the attacker wrote its metadata.
- **Find the git tag** for the version by convention (`v1.2.3`, `1.2.3`, `release-1.2.3`). No tag means the result is "can't verify," never "safe."
- **Rebuild in a sandbox:** a throwaway container with a read-only copy of the source, no secrets, no host folders mounted. Fetch build dependencies, then cut the network (`--network none`) and run `python -m build --wheel`.
- **Compare** the rebuilt wheel to the installed one, file by file, ignoring harmless ordering and timestamp differences.
- **Risk tiers:** *Critical* is a `.pth` containing code, `sitecustomize`, or `usercustomize`. *High* is an added or modified `.py` file, or a native `.so`/`.pyd`. *Info* is a static asset. Known-legitimate `.pth` files (like `distutils-precedence.pth`) are allowlisted.
- **Docker:** pull the Python packages out of image layers and verify each one.

---

## Part 3 — Report: shared evidence on Arkiv (built)

Code: `shankh/shankh/report/__init__.py` (Python side), `arkiv/src/report.ts`, `arkiv/src/schema.ts`, `arkiv/src/write-report-cli.ts` (TypeScript side).

### What Arkiv is here

Arkiv is a shared, public data layer with its own blockchain (testnet chain "rabdi", chain id 7794095). You write *entities*: typed records with fields you can query, signed by the wallet that wrote them, with an expiry date.

### How a report gets written today

1. `shankh verify` finishes and calls `write_report(result)`.
2. Python doesn't talk to Arkiv directly. It runs `npm run write-report` in the `arkiv/` folder and pipes the result in as JSON. That's because Arkiv's SDK is TypeScript. One integration, reused, instead of two.
3. `write-report-cli.ts` calls `writeReport()`, which creates a `shankh.report` entity with these fields:

| Field | Meaning | Searchable? |
|---|---|---|
| `package`, `version` | what was checked | yes |
| `tier`, `malicious` | the verdict | yes |
| `reporter` | the wallet that signed it | yes |
| `findings` | which files, as JSON bytes | no (too long for a text field) |
| `artifactSha256` | hash of the source archive checked | yes |
| `ensRevoked` | did the maintainer's ENS revoke force the verdict? | yes |

4. It expires after 90 days unless renewed. ENS is the permanent record; Arkiv is the recent, detailed evidence.

**Proven:** real entities on the testnet, written and read back (see `docs/evidence.md`).

### Two lessons that shaped the code

- A text (`str`) field caps at 128 bytes, which is why `findings` is stored as bytes.
- Selecting a field that older entities don't have makes Arkiv silently return *none* of those older entities. That hid all reports from the status page for a while; the fix queries the basic fields first and merges the newer ones in. Both are recorded in `docs/feedback/arkiv.md`.

### Final design

- Machines **sync reports by time window** ("everything from the last hour"), never by searching for a specific package. Searching by package name would reveal what you have installed. This is a privacy choice.
- A report from someone else **never kills anything by itself.** Your machine only acts on reports from reporters *you* chose to trust, and even then it re-runs the verification locally first. A false or malicious report costs a re-check, not your credentials.
- **Trust is explicit:** you list trusted reporters by ENS name in `~/.config/shankh/trust.toml`, e.g. `alice.reporters.shankh.eth`. That name has a `shankh.signer` record holding the address reports must be signed by.
- `shankh.request` (schema exists, writer not built): a 24-hour "has anyone checked foo 1.2.3?" record.
- `osv.mal` (stub): a mirror of the public OSV malicious-packages list, so advisories are readable from the same place.

---

## Part 4 — ENS: the maintainer's kill switch (built, on Sepolia)

Code: `scripts/ens/register-tree-sepolia.sh` (how it was built), `contracts/src/KillSwitch.sol`, `shankh/shankh/ens/__init__.py` (reading it from Python), `status-page/lib/ens.ts` (reading it from the web page). Reference: `ensv2-guide.md`.

### Four concepts you need first

**1. A name is a tree.** `shankh-demo.pypi.shankh.eth` means: `eth`, then `shankh` under it, then `pypi`, then `shankh-demo`. In ENSv2 each level can have its own **registry** — a contract that decides who owns the names under it.

**2. A resolver holds the data.** The registry says who owns a name and which **resolver** contract holds its records. Records are key/value text, like `shankh.source = https://github.com/…`.

**3. Roles are permission bits.** ENSv2's permission system is called Enhanced Access Control. Each contract stores, for every (resource, account) pair, a 256-bit number where each bit is one permission: "can set the resolver," "can unregister," "can upgrade the contract," and so on. Each permission also has an *admin* bit (the right to grant that permission to others). Granting or revoking is flipping bits.

**4. Two ways to write a name.**
- **namehash** — a fixed 32-byte ID computed by hashing the labels from right to left. It's what resolvers use to look records up.
- **DNS-wire encoding** — each label prefixed by its length, ending in zero. `shankh-demo.pypi.shankh.eth` becomes `0x0b 7368616e6b682d64656d6f 04 70797069 06 7368616e6b68 03 657468 00`. It's what `resolve()` takes.

### The tree we built, and why each step

```
shankh.eth                     registered for real (commit, wait 60s, reveal) — Shankh's root
  └─ pypi.shankh.eth           the package registry — EMANCIPATED
       └─ shankh-demo.pypi.shankh.eth   one package
            resolver:  shankh.source   ← only the maintainer can write
                       shankh.revoked  ← only KillSwitch can write
            KillSwitch contract ← only the maintainer can call revoke()
```

**Step 1, register `shankh.eth`.** ENS registration uses *commit-reveal*: first you publish a hash of your request, wait at least 60 seconds, then reveal it. This stops someone from seeing your request and registering the name first.

**Step 2, create `pypi.shankh.eth` and emancipate it.** We deployed a registry for it, then revoked our own dangerous permissions on it: the ability to change sub-registries, change resolvers, unregister names, upgrade the contract, and transfer admin rights — plus the admin bits for all of those. Once no one holds an admin bit, **no one can grant those powers again, including us.** That's what "emancipated" means.

*Why it matters:* a security tool that could take over or redirect any package's name would itself be a juicy target. Emancipation makes that impossible on-chain.

*What we learned:* the contract's `isEmancipated()` check can return `true` while dangerous powers remain, if you only revoked some of them. Our first test missed `ROLE_UPGRADE` and `ROLE_CAN_TRANSFER_ADMIN`. So we don't trust the boolean alone; we prove it by **trying** to re-grant the powers and showing the chain refuse (`EACCannotGrantRoles`). The status page re-runs that attempt live on every load.

**Step 3, create the package's resolver and split the write permissions.** ENSv2 resolvers can grant permission to write *one specific record key* — done with `grantSetterRoles`, by showing the contract the shape of the `setText` call being allowed. We gave:
- the maintainer permission to write only `shankh.source`;
- `KillSwitch` permission to write only `shankh.revoked`.

Then we removed our own broad "write any record" permission. This is a one-way door. Proven live: the maintainer can still write `shankh.source`, but writing `shankh.revoked` directly fails with `EACUnauthorizedAccountRoles`. The page re-runs this one live too.

### The KillSwitch contract

`contracts/src/KillSwitch.sol`, one per package. It knows its maintainer, its resolver and its package's name, all set at deploy.

- `revoke(hash)` — maintainer only, instant. Adds the hash to a list and writes the whole list into `shankh.revoked` as comma-separated hex.
- `queueUnrevoke(hash)` → wait **48 hours** → `unrevoke(hash)`. **Kill fast, restore slow:** if a maintainer's wallet is ever stolen, the thief can't quickly un-flag a bad release.

On Sepolia it has performed one real revoke. Six Foundry tests pass. **It has not been reviewed line by line**, so never call it audited.

### How a machine reads it

You can't call `text()` directly on these factory-deployed resolvers; it reverts. The working path is the ENS standard `resolve(dnsName, innerCall)`:
1. compute the namehash of `shankh-demo.pypi.shankh.eth`;
2. build the inner call `text(namehash, "shankh.revoked")`;
3. call `resolve(dnsEncodedName, innerCall)` on the resolver;
4. decode the returned bytes as a string and split on commas.

Python does this by running Foundry's `cast` tool (`shankh/shankh/ens/`). The web page does the same with the viem library (`status-page/lib/ens.ts`). Both decode the same real hash.

### How the ENS signal is used today

`shankh verify` reads `shankh.revoked` for the package. If the hash of the source archive you're checking is on that list, the result is forced to **critical** even when the file diff is clean. That's kill signal #2. A rebuild alone can't catch "the maintainer says this exact build is bad," so the two signals complement each other.

**Current limit:** only `shankh-demo` is wired up, and its resolver address comes from a config value. In the finished design, a machine would find any package's resolver by asking `pypi.shankh.eth`'s registry.

---

## Part 5 — Decide: the four kill signals (partly built)

The finished design allows an **automatic kill** on any one of these:

| # | Signal | Status |
|---|---|---|
| 1 | Your own rebuild finds a critical or high mismatch | built (critical tier) |
| 2 | The maintainer revoked this exact artifact hash on ENS | built, wired into `verify` |
| 3 | An OSV/GHSA *malware* advisory exists for this version | not built (`osv.mal` mirror is a stub) |
| 4 | A trusted reporter's Arkiv report, **re-verified locally** | not built (reports are written; reading and acting on others' isn't) |

Some things only cause **suspicion** — a re-check, never a kill:
- the registry pulling a version (sometimes harmless, e.g. a whole project quarantined by mistake);
- reports from reporters you don't trust.

*Why tiered:* a false kill takes down someone's working credentials. The bar for acting automatically is evidence an attacker can't fake.

---

## Part 6 — Act: the kill sequence (not built — final design)

This is the part that actually saves someone, and it's the biggest gap today. It's blocked on getting a disposable AWS sandbox account. Planned in `plan-2.md`:

**AWS, in this order:**
1. Attach AWS's own `AWSCompromisedKeyQuarantineV3` policy to the user that owns the key. This blocks dangerous actions immediately, even before step 2 finishes.
2. Call `UpdateAccessKey` to set the key to **Inactive**. Not deleted — inactive, so a false alarm can be undone.
3. Use a *separate*, read-only profile (`shankh-audit`) to search CloudTrail for everything that key did since the package was installed.
4. Flag any keys, users or roles that key created. Attackers often make themselves new credentials.

The secret key is read from `~/.aws` or `docker inspect` only at kill time, and only held in memory.

**On the machine:** delete the rogue files (checking their hashes first), stop affected containers, and block the exfiltration domains from the report via the hosts file.

**Incident report** (Markdown and JSON): what was installed and when, which credentials were reachable, what was killed and what wasn't — with one-click links to rotate GitHub tokens, LLM API keys, npm/PyPI tokens and SSH keys by hand — plus the CloudTrail findings.

---

## Part 7 — Notice: the watcher (not built — final design)

`shankhd`, a background service. Today `shankh/shankh/daemon.py` is a stub, so `verify` only runs when you run it.

**What it inventories:**
- Python interpreters and virtual environments (PATH, `~/.venvs`, project `.venv`, pyenv, conda), and every package's files and hashes.
- Docker images and running containers, via the Docker API.
- An **exposure snapshot — identifiers only, never secret values:**
  - environment variable names;
  - AWS key IDs and the instance role name;
  - SSH key fingerprints;
  - which kinds of GitHub/npm/PyPI tokens exist;
  - LLM API key names;
  - which credential files containers have mounted.

All of it is stored locally in SQLite and never leaves the machine. When something new is installed, the watcher runs `verify` and checks the signals.

**Its own safety:** `shankhd` needs powerful access (the Docker socket, credential files), so it would itself be a target. The plan is a dedicated system user, minimal hash-pinned dependencies, signed reproducible releases, and verifying its own integrity on start.

### Prevention, before install (final design, roadmap step 4)

- `shankh pip install` and `shankh docker pull` — check before anything runs.
- A Claude Code `PreToolUse` hook so AI agents can't install unverified packages.
- A cooldown on brand-new releases.
- A check for package names an AI likely hallucinated.

---

## Part 8 — One attack, end to end (final design)

1. **11:39.** An attacker with a stolen maintainer login publishes `foo 1.2.3` with a hidden `.pth` file.
2. **Machine A** installs it. `shankhd` notices, rebuilds `foo 1.2.3` from the public source in a sandbox, and finds the `.pth` file isn't in the source → critical.
3. Machine A **kills locally:** quarantine policy, key set to inactive, rogue file deleted, exfiltration domain blocked, incident report written. The attacker's next call with that key gets *AccessDenied*.
4. Machine A **publishes a signed `shankh.report`** to Arkiv.
5. **Machine B** has the same version installed but hasn't checked it yet. Its time-window sync sees A's report. A is on B's trusted list, so B **re-runs the rebuild locally**, confirms it, and kills its own key.
6. **The real maintainer** learns of it and calls `KillSwitch.revoke(hash)` from their wallet. `shankh.revoked` updates on ENS.
7. **Machine C** reads ENS, sees its installed artifact is revoked, and kills **without needing any rebuild.** The attacker still has the maintainer's PyPI login but can't touch any of this.
8. **Servers off:** even with Shankh's website and any backend shut down, every machine still verifies and kills on its own. Nothing depends on Shankh's servers. That's the Ethereum Foundation "CROPS" argument.

**Today, steps 2 (verify, run by hand), 4 (report) and 6 (revoke) are real. Steps 3, 5, 7 and the watcher in step 2 are not built yet.**

---

## Part 9 — The status page (built)

Code: `status-page/`. Design: `status-page/DESIGN.md`.

A Next.js page that, **on every single request**, reads:
- the current Sepolia block number;
- `isEmancipated()` on `pypi.shankh.eth`;
- the resolver's `shankh.source` and `shankh.revoked`;
- `KillSwitch.maintainer()`;
- all `shankh.report` entities from Arkiv.

It also **re-simulates both attack attempts** against live Sepolia, without sending a transaction, and shows the chain's real refusal. Nothing is cached or typed in by hand. If a read fails, the page says so instead of showing a fake value.

---

## Part 10 — Why each design choice

| Choice | Why |
|---|---|
| Rebuild/diff, not an AI reading the code | Deterministic. A hash either matches or it doesn't. No guessing, and nothing for an attacker to talk its way past. |
| Never trust the release's own metadata for the source location | The attacker wrote that metadata. |
| ENS for the maintainer's switch | It's controlled by a wallet, separate from the GitHub/PyPI login that gets stolen, and anyone can read it without trusting Shankh. |
| Emancipated registry | Shankh can't seize or redirect anyone's package name, so Shankh isn't a new single point of attack. |
| Per-key resolver permissions | The maintainer and `KillSwitch` each control only their own record. |
| Arkiv for reports | Signed, shared and independently checkable. One machine's catch helps everyone. |
| Re-verify before acting on someone else's report | A false report costs a re-check, not your keys. |
| Sync by time window | Searching by package name would leak what you have installed. |
| Deactivate, never delete | Mistakes stay reversible. |
| Instant revoke, 48-hour unrevoke | Kill fast, restore slow. A stolen maintainer wallet can't quickly un-flag a bad release. |

---

## Part 11 — Built versus not built

| Component | Today |
|---|---|
| Rebuild/diff verifier (`shankh verify`) | built, proven on real packages |
| ENS revocation check inside `verify` | built, one package |
| Arkiv report writer | built, real entities on testnet |
| ENS tree + emancipation + per-key permissions | built, live on Sepolia |
| `KillSwitch` contract | deployed, one real revoke, not reviewed line by line |
| Live status page | built and deployed |
| Watcher daemon (`shankhd`) | not built |
| Reading and acting on others' Arkiv reports | not built |
| OSV/GHSA advisory signal | not built |
| AWS quarantine/deactivate/audit | not built — blocked on a sandbox AWS account |
| Sandboxed compiled rebuild | not built (today's diff covers pure-Python) |
| Install gate, Claude Code hook | not built |

---

## Part 12 — Check yourself

If you can answer these without looking, you understand the system well enough to defend it to a judge.

1. Why does the LiteLLM attack show up as "untraceable/critical" in a rebuild diff?
2. Why must the source repo location never come from the release being tested?
3. What does "emancipated" mean, and why isn't `isEmancipated() == true` enough proof?
4. Why can't a stolen GitHub or PyPI login write `shankh.revoked`?
5. What happens if someone posts a false report to Arkiv saying a clean package is malicious?
6. Why is un-revoking delayed 48 hours but revoking instant?
7. Why does a machine sync reports by time window instead of searching for its own packages?
8. Which of the four kill signals work today, and which don't?
9. What's the first AWS action in the kill sequence, and why does it come before deactivating the key?

<details>
<summary>Answers</summary>

1. The attack added files (`.pth`, `sitecustomize.py`) that don't exist in the public source, and both run automatically on every Python start.
2. The attacker controls that release's metadata and could point it at a matching fake repo.
3. Nobody holds the admin rights to re-grant the dangerous powers, including us. The boolean only checks the bits you actually revoked, so missing some would still read `true`; proving it means attempting a re-grant and seeing it fail.
4. Writing it requires the `KillSwitch` contract's permission on the resolver, and `KillSwitch` only obeys the maintainer's wallet — neither is connected to the login.
5. A machine only acts on trusted reporters, and even then re-runs the rebuild locally. A clean package re-checks as clean, so nothing is killed.
6. If a maintainer's wallet is stolen, the thief can't quickly un-flag a malicious release. Flagging, by contrast, should be as fast as possible.
7. Searching by package name would tell anyone watching what you have installed.
8. Rebuild mismatch and ENS revocation work today. The advisory and trusted-report signals don't.
9. Attaching the quarantine policy. It blocks dangerous actions immediately, closing the window while the deactivation goes through.

</details>
