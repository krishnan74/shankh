# Shankh: research background

> This document holds the research behind Shankh: the attack it responds to, the defences that already exist, the projects that came before it, and the case for it. The architecture, ENS and Arkiv design, demo, roadmap and measurements are in [`plan-2.md`](plan-2.md) and are not repeated here.
>
> **Research cut-off: 2026-11-05.** Facts are attributed to their sources. Where sources disagree, both versions are given. Anything not independently confirmed is marked as such.

---

## 1. Why this project exists

In October 2026 I was running LiteLLM, the open-source LLM gateway, in Docker alongside Open WebUI for a FinOps agent project. LiteLLM's release pipeline was hijacked, and a credential-stealing build shipped through its normal PyPI and Docker channels. My development AWS credentials were compromised.

Cleaning up was entirely manual. I had to work out what the malware could have reached, find and remove what it left behind, rotate everything, and check whether the keys had already been used. That manual stretch after an install is the problem Shankh addresses.

---

## 2. The LiteLLM 1.107.0 compromise (21 October 2026)

### 2.1 Attack chain

| Stage | What happened | Source |
|---|---|---|
| **1. Initial access** | LiteLLM found an unexpected, innocuously named user account on an internal deployment exposed to the internet. It suspects, **but has not confirmed**, that the attacker got in through a recently patched vulnerability. | CSA; Help Net Security |
| **2. Token harvesting** | LiteLLM believes Claude Code sometimes embedded a developer's GitHub CLI OAuth token in response bodies. The internal deployment logged those bodies, so the tokens ended up in **gateway logs**. | CSA; Help Net Security |
| **3. Release-pipeline takeover** | The attacker used stolen tokens from **three engineers**. The organization-owner token disabled branch protections and pointed the release workflow at the lookalike repo **`Berri-AI/litellm`** (one hyphen away from the real `BerriAI/litellm`). A second token approved the production gate. A third **deleted workflow records**, limiting what investigators could see. | Datadog; CSA; Help Net Security |
| **4. Valid-looking delivery** | LiteLLM's legitimate pipeline built the artifacts and published them through its normal channels. The **build provenance correctly recorded the malicious fork as the source**, and nothing checked it. | Datadog |
| **5. Distribution** | PyPI: `litellm` **1.107.0** (CSA says seven malicious wheels). Docker Hub and GHCR: tags **`v1.107.0`, `latest`, `main-latest`, `main-stable`**. Enterprise customers on LiteLLM's private registry were not affected. Last safe version: **1.106.2**. | Datadog; Help Net Security |
| **6. Persistence** | The release dropped `cook.pth`, `cook.py` and `sitecustomize.py` into `site-packages`. Python runs `.pth` files and `sitecustomize.py` at **every interpreter start**, so the payload ran in any Python process in that environment, even if LiteLLM was never imported. **Uninstalling the package does not remove these files.** | Datadog |
| **7. Credential theft** | The stealer (which CSA calls "privcollect") collected AWS, GCP and Azure credentials, including those from instance metadata; Kubernetes, Docker, Vault and Terraform secrets; SSH, GPG and TLS keys; Git, npm and PyPI tokens; `.env` files; shell history; LLM provider keys and AI-tool sessions (Claude, Codex, Gemini, Cursor, Copilot); and browser passwords and cookies. If `DATABASE_URL` was set, it also queried the proxy's tables of upstream provider keys. | Datadog; CSA; Help Net Security |
| **8. Exfiltration** | Data was encrypted with AES-256 and RSA-4096 and sent to `www.litellm[.]dev/healthcheck`, a lookalike domain **registered 13 October**, with a hard-coded `X-Token` header. Run-once marker and lock files were left in `/tmp`. | Datadog; CSA |
| **9. Backdoor** | `sitecustomize.py` checked hourly for a domain listed in a file in a GitHub repository, then downloaded and ran code from it. Only test values were observed, and no second stage was seen. The file has since been removed. | Datadog |
| **10. Use of stolen credentials** | Wiz saw stolen AWS role credentials **validated and used about 4.5 hours after exfiltration** to enumerate **Amazon Bedrock** models (consistent with "LLMjacking", running AI models on someone else's account), and in some environments to list IAM roles, users and access keys. These credentials came from hosts that installed the package, not from the logs. | Help Net Security; CSA |

### 2.2 Timeline (UTC, 21 October 2026)

| Time | Event | Notes |
|---|---|---|
| 11:39 | Malicious 1.107.0 published to PyPI | Datadog |
| 11:46 | Malicious Docker images start being served | Help Net Security |
| 13:20 | PyPI quarantines 1.107.0 | Datadog (Help Net Security gives 13:23 as the end of availability) |
| 13:53 **or** 14:20 | Affected Docker images removed | **Sources disagree:** Datadog says 13:53; Help Net Security says the images served the malicious build until 14:20 |
| About 4.5 h after each theft | Stolen AWS credentials validated; Bedrock enumerated | A single Wiz observation |

**What the timeline shows:**
- The poisoned artifacts were available for about two to two and a half hours.
- In the case Wiz observed, the attacker waited hours before using what was stolen. In that gap a defender who knows exactly what was exposed can still act first.

### 2.3 Official guidance to victims, and the work it implies

Datadog's recommended response:
1. Manually delete `cook.pth`, `cook.py` and `sitecustomize.py` from `site-packages`. Removing the package isn't enough.
2. Remove 1.107.0 and pin to 1.106.2.
3. Rotate every potentially exposed credential from a clean machine.
4. Audit logs for use of those credentials during the exposure window.
5. Search for the indicators of compromise: the domain, dropped files, `/tmp` markers, wheel and image hashes.
6. Harden release pipelines.

The CSA note adds:
- Remove the dropped files **before running any Python, including pip**.
- Review CloudTrail for identity checks and Bedrock enumeration.
- Search any stored coding-agent traffic for token patterns (`gho_`, `ghp_`, `github_pat_`, `ghu_`, `ghs_`, and cloud keys).

**Every step is manual, and every step is a race.** Each victim first has to find out they were affected, then work out what was reachable, then rotate. The attacker is already holding the credentials the whole time.

### 2.4 The precedent: the March 2026 LiteLLM compromise

| | Detail | Source |
|---|---|---|
| Versions | `litellm` **1.82.7** and **1.82.8** | GHSA-5mg7-485q-xm76 (OSV) |
| Techniques | 1.82.7: malicious code **inside an existing file** (`proxy/proxy_server.py`, line 130). 1.82.8: **`litellm_init.pth`** in the source distribution | OSV |
| Advisory | Published **2026-03-25 14:25Z**, modified 2026-03-27; CWE-506; critical severity | OSV |
| Attribution | Datadog linked it to TeamPCP activity. **No connection to the October incident has been established.** | Datadog |
| Scale | Hudson Rock tied a 153 GB stolen archive to **2,488 corporate domains**; CloudSEK estimated **close to 2,500** exposed organizations | Help Net Security |

**Takeaways:**
- The same project was hit twice in seven months, by two different techniques: a `.pth` startup hook, and code hidden inside a legitimate source file.
- Any defence that only looks for one technique misses the other.

### 2.5 The secondary lesson: AI gateways become credential stores

The CSA note points out that AI gateways are usually threat-modelled around the provider keys they hold on purpose, but **their traffic logs are a second, unplanned credential store**:
- Coding-agent traffic carries tokens inside tool output, file contents and environment details.
- Logging message content is optional, but the admin interface can turn it on at runtime.
- Logs spread copies to backups, analytics exports and observability callbacks.

This is how the October attacker is believed to have obtained the publishing tokens. It also matters for my own setup: an LLM gateway in Docker that holds AWS credentials for Bedrock is exactly the kind of high-value target this attack reached.

---

## 3. The wider pattern

These cases are background: the general shape of recent supply-chain attacks, with the main mechanism of each.

- **Malicious code that isn't in the public source:**
  - the xz backdoor (2024), in release tarballs only;
  - stolen-credential publishing to npm: Ledger Connect Kit (2023), the chalk/debug hijack and the Shai-Hulud worm (2025);
  - both LiteLLM incidents (2026).
- **Speed varies a lot by attacker.**
  - Worms such as Shai-Hulud reuse stolen tokens within minutes to spread.
  - Clutch Security found AWS keys exposed on GitHub or Docker Hub were exploited **within minutes**, on PyPI **within hours**, and on some platforms **days** later.
  - The October LiteLLM attacker took about **4.5 hours**.
  - **Implication:** responding after an install can win against many attackers, but not against all of them.
- **The registries are responding,** for example PyPI's response to Shai-Hulud and npm's 2026 defaults for approving install scripts. Attackers are adapting too: BleepingComputer reported npm packages that hide loaders in normal runtime code to avoid the new install-script defences.

---

## 4. Why existing defences don't close the gap

### 4.1 AWS automatic key quarantine: fast, but only for public leaks

| Property | Detail |
|---|---|
| Trigger | GitHub secret scanning finds an AWS key in a **public** GitHub repository (and, per the reporting, public npm packages) and notifies AWS |
| Speed | In Unit 42's test, the quarantine policy was attached **10 seconds** after exposure, with GitHub's notification about 1 second after |
| Action | Attaches **`AWSCompromisedKeyQuarantineV3`**: explicit denies on high-risk actions (creating users or keys, attaching policies, creating roles, launching EC2 or Lambda). It **doesn't disable the user or revoke all permissions**, and doesn't replace rotation or investigation. |
| **Gap** | **Credentials stolen by malware and never posted publicly never trigger it.** The LiteLLM stealer encrypted its haul and sent it to an attacker-controlled domain, so nothing public ever appeared. |

This shows the response model works: providers, platforms and detection can cooperate to neutralise a credential in seconds. It just has never been connected to the signal that a package is malicious.

### 4.2 secret-blast-radius: the closest tool, but read-only

`secret-blast-radius` (`npx secret-blast-radius`) is the nearest existing tool:
- It inventories the credentials a malicious npm install could reach, ranks them, and writes an ordered rotation runbook.
- It reports locations and hashes, never secret values.
- It checks lockfiles and `node_modules` against bundled, dated lists of indicators of compromise.

Where it stops, according to its own documentation:
- **It never revokes or rotates anything;** it only writes the files you ask for.
- **It doesn't react to advisories automatically.** It ships offline indicator lists, and its OSV lookup is opt-in.
- **It doesn't record installs over time.** `--history` rebuilds the past from git history of lockfiles that still exist.
- It checks well-known locations only, and can't see keychains or browser profiles.
- It's focused on npm.

It answers *"what could have been stolen?"* well. It doesn't act, and it only runs when someone remembers to run it.

### 4.3 Malicious-package scanners and advisories

- **Commercial scanners** (Socket, Aikido and others) and ETHGlobal's **npmguard** detect malicious packages before or soon after they're published, and research teams publish analyses and indicators (Wiz, Aikido and Socket all did for LiteLLM).
- **Advisories** (GHSA, OSV, OpenSSF malicious-packages) give a machine-readable record. In March, the GHSA advisory for LiteLLM was published on 25 March at 14:25 UTC.

**Gap:** these tell you *that* a package is bad. They don't know what that package could reach on *your* machine, and they don't act on it. The response still falls to each victim, by hand.

### 4.4 Provenance and attestations

Sigstore, SLSA, npm provenance and PyPI attestations (PEP 740) prove **which pipeline built** an artifact.

In October, LiteLLM's legitimate pipeline was taken over and pointed at a fork. **The provenance was accurate: it recorded the fork as the source.** A hijacked pipeline produces valid provenance, so provenance only helps if something compares it against what the source *should* be.

### 4.5 Rebuild and dynamic analysis services

- **Google OSS Rebuild** rebuilds popular PyPI, npm and crates packages and publishes signed attestations.
  - It's **run by a single operator**, covers only popular packages, and **nothing enforces it at install time**.
  - Its attestations sit in a public bucket; the code is Apache-2.0, but no license for the data is stated.
- **OpenSSF package-analysis** runs packages in sandboxes at registry scale and records their behaviour.

Both are valuable sources of evidence. Neither connects that evidence to remediating a victim's machine.

### 4.6 What none of them do

| Capability | AWS quarantine | secret-blast-radius | Scanners and advisories | Provenance | OSS Rebuild |
|---|---|---|---|---|---|
| Detects a malicious *package* | No | Partly (bundled indicators) | **Yes** | No (it proves the pipeline) | Indirectly (a rebuild mismatch) |
| Knows *your* exposure | n/a | **Yes, on demand** | No | No | No |
| Acts automatically on a credential | **Yes, public leaks only** | No | No | No | No |
| Covers credentials stolen by malware | **No** | Manual | Manual | No | No |
| Works if the publisher is compromised | n/a | n/a | Yes | **No** (the pipeline was the attacker) | Yes |

**The gap:** nothing turns *"this package version is malicious"* into *"the credentials it could reach on this machine are now neutralised"* automatically, at the speed AWS already achieves for public leaks.

---

## 5. Prior art at ETHGlobal

Based on a scrape of **18,693 ETHGlobal showcase projects across 69 events (2020 to ETHOnline 2026)**, plus manual review of ETHGlobal Tokyo 2026 (late October), whose prize winners came from the user's screenshots.

### 5.1 Projects in the same area

| Project | Event | What it did | Result | How Shankh differs |
|---|---|---|---|---|
| **npmguard** | Cannes 2026 | AI audits of new npm releases; verdicts published as ENS subnames and on IPFS; Chainlink CRE monitoring | **Finalist**, ENS Most Creative (3rd) | It detects; Shankh remediates the victim's exposure. npm vs Python and Docker. |
| **NpmGuard** | Lisbon 2026 (same team) | `npmguard install` CLI that gates installs on verdicts, with paid audits | 0G Keep Building; World Identity Check (2nd) | The same difference |
| **Aegis (Safe Skills)** | NY 2026 | ENS records pin the hash of a reviewed agent skill; a gate blocks on mismatch | **ENS AI agents, 1st** | Pins a reviewed file, not "built from source"; agent skills, not packages; no remediation |
| **Sigil** | ETHOnline 2026 | Trust layer for agent skills: staked claims, sandbox with canary secrets, Hedera x402 and HCS, World, Arc | No prize recorded | Covers skills, with economic disputes; no credential response |
| **SureX** | Lisbon 2026 | Claude Code plugin that fingerprints MCP servers (motivated by `postmark-mcp`) | No prize | Covers MCP servers |
| **Clembot Doorman** | ETHOnline 2026 | Vets MCP servers before agents adopt them | No prize | Covers MCP servers |
| **Klaxon** | ETHOnline 2026 | Splits CI/CD secrets between Ledger and a witness released on a Hedera payment | No prize | Prevents secret reuse in CI; no package signal or kill |
| **GhostKey** | ETHOnline 2026 | Short-lived, Ledger-backed authority for AI agents instead of long-lived secrets | Ledger AI Agents (2nd) | Reduces what's exposed; doesn't respond to a compromise |
| **VaultBreaker** | ETHOnline 2026 | Narrow, expiring, spend-limited capabilities for agents | No prize | Same as GhostKey |
| **Defensive Security**, **Verifiable Web**, **EnclaveGuard** | Taipei / HackMoney 2026 / Bangkok | Checking the integrity of dApp frontends after the Bybit hack | No prizes | Frontends, not packages |
| **cartenix** | Lisbon 2023 | Reproducible Nix builds inside the Cartesi VM | Cartesi Best Use | A rebuild proof of concept; no enforcement or response |
| **LegeNPM**, **Decentralized Package Manager** | Lisbon 2023 / ETHOnline 2022 | Package registries that can't be altered | Polygon pool / none | Permanent storage, not verification or response |

### 5.2 ETHGlobal Tokyo 2026 (late October)

- **About 250 projects across 8 showcase pages.** About 15 of the 99 on the first three pages were guards for AI-agent payments, the most crowded theme.
- **No project addressed package supply-chain compromise or post-install credential response.**
- **Closest:**
  - **End Credits:** a Claude Code hook that records the packages an agent used, to tip their maintainers. It checks the repo publishes the package. No prize recorded.
  - **Plain Safe:** a Safe interface with no backend, a network guard and a reproducible IPFS release. A benchmark for the CROPS track. No prize recorded.
  - **MD Transfer Protocol:** documents signed under ENSv2 subnames, with roles. No prize recorded.
  - **Secueji:** AI code review plus onchain monitoring. No prize recorded.
- **Name collision:** **"Airlock"**, a human-consent gateway that stops sensitive data leaking to frontier AI models (ENS policy records, per-record permissions, World ID for Agents), **won World's "Best Use of World ID for Agents"**. Different problem, same name, which is why Shankh isn't called Airlock.

**ENS winners at Tokyo, and the ENSv2 patterns they rewarded:**

| Winner | Prize | Pattern |
|---|---|---|
| **Relay** | ENSv2, 1st | Hierarchical delegation via Enhanced Access Control. Its page says no ENS contracts were integrated: the naming model was represented in the app. |
| **Kura** | ENSv2, 3rd (and Uniswap 1st) | Its own registry and resolver; non-transferable names revoked on release; **per-record permissions** (the vendor edits condition, an appraiser agent writes appraisals) |
| **Radius** | Existing-project ENSv2, 1st | A subname as the credential for network and API access |
| **Lortnoc Tahc** | Existing-project ENSv2, 2nd (and World IDKit, Continuity) | **One PermissionedResolver per space**; the registrar grants roles to the owner and **revokes its own**; lookups **fail closed**. Its releases come from public CI with a SHA-256 hash and build provenance. |
| **Surety** | World ID for Agents | **One PermissionedResolver per policy**, because Enhanced Access Control scopes permissions by resolver and key |

**World winners at Tokyo:**
- **Lifeline, Airlock and Surety** (World ID for Agents) were all gates where a human approves the agent's action.
- **Pupille and Placed** won Best Use of IDKit.

**Conclusion:**
- Supply-chain security is a recurring ETHGlobal theme, but prior projects **detect** (npmguard), **pin** (Aegis), **limit exposure** (GhostKey, VaultBreaker, Klaxon) or **vet agent tools** (Sigil, SureX, Clembot).
- **None turns evidence of a malicious package into automatic neutralisation of the credentials it could reach.**

### 5.3 Finalist patterns

Based on the 10 most recent events (98 finalists):

| Event | Projects | Finalists |
|---|---|---|
| ETHOnline 2026 | 812 | 8 |
| HackMoney 2026 | 620 | 10 |
| New Delhi 2025 | 614 | 10 |
| Cannes 2026 | 265 | 10 |
| NY 2026 | 232 | 10 |
| Lisbon 2026 | 173 | 10 |

- **Base rate for a large event like Mumbai:** about 1.5%.
- **Security and verification projects reached the finals at almost every recent event:**

  | Event | Finalists |
  |---|---|
  | Cannes 2026 | npmguard, VEIL VPN |
  | NY 2026 | Immunity, Proof of Scan |
  | Lisbon 2026 | ethui, Lortnoc Tahc |
  | ETHOnline 2026 | TARE, LeekWallet |

- **What those finalists shared:**
  - **A measured, real-world finding.** TARE: "1,559 hooks… nine emit". The Wallet Shift: 34,556 registrations indexed.
  - **A visible wow moment.**
  - **A live, usable product.**
  - **Deep technology explained simply.**
- **Partner prizes aren't a prerequisite;** many finalists won zero or one.

---

## 6. The case for Shankh (for judges)

### 6.1 A real, unfilled gap with a proven model
Public leaks are neutralised in about 10 seconds. Malware theft gets nothing. The model exists and works. Shankh connects it to the missing trigger: proof that a package is malicious.

### 6.2 The timing works for defenders more often than people assume
In the October LiteLLM case:
- the poisoned artifacts were live for about two to two and a half hours;
- the observed use of stolen AWS credentials came about 4.5 hours after theft.

That gap is wide enough for automatic remediation to win. **Honest limit:** attackers who use credentials within minutes (worm-style, or GitHub/Docker Hub exposures) can beat any response after the fact. That's why prevention stays part of Shankh, and why the incident report still matters when remediation loses the race.

### 6.3 Why the alarm has to live outside the publisher, and therefore onchain
The defining fact of October 2026:
- **The compromised party was the publisher's own infrastructure.** An organization-owner token changed the pipeline, approval was forged, and the workflow records were deleted.
- **Any alarm controlled through the publisher's accounts was compromised too.** That includes its GitHub, its registry account, its CI, and any server it runs.

For an alarm to survive that, it needs:
- **Keys the attacker never held:** ENS records whose write permissions belong to separate keys and roles. With an *emancipated* ENSv2 registry, not even the registry operator can seize or redirect them.
- **Evidence nobody can delete or edit:** reports owned by each reporter's wallet on Arkiv. The October attacker deleted logs; this evidence can't be deleted by anyone but its owner.
- **No single server to take down.**
- **Privacy:** what a machine has installed and what it could reach never needs to leave that machine.

This is the case for web3 here: **trust that survives the publisher's own compromise.**

### 6.4 It matches what each sponsor rewards
- **ENS:** Tokyo's winners rewarded per-record permissions (Kura), one resolver per entity (Surety, Lortnoc Tahc), handover and failing closed (Lortnoc Tahc), and delegation by name (Relay). A kill switch the compromised publisher can't touch is a security-critical use of exactly those features: central to the product, not cosmetic.
- **Ethereum Foundation, CROPS:** the track's own idea list includes *"a tool that proves the shipped frontend or extension matches the public repo,"* and it scores guarantees that work without you above cosmetic settings. An alarm that keeps working when both the publisher and the tool's own servers are gone, with the user's data never leaving the device, is that property.
- **Arkiv:** the Mirror track's example is Sourcify, which proves deployed contracts match their source. Shankh's evidence is the same idea for packages, and the OpenSSF malicious-packages data (Apache-2.0) is a republishable dataset Ethereum developers depend on.

### 6.5 It isn't "just another…"

| Objection | Answer |
|---|---|
| "Just reproducible builds or OSS Rebuild?" | Rebuilding is one source of evidence. The novelty is what happens next: evidence that can't be suppressed triggers automatic neutralisation of *your* exposed credentials. |
| "Just a scanner?" | Scanners say a package is bad. Shankh acts on what that package could reach on your machine. |
| "Just secret-blast-radius?" | That tool inventories on demand and hands you a runbook. Shankh records continuously, matches signals automatically, and acts. |
| "Just AWS auto-quarantine?" | That covers public leaks only. Shankh covers credentials stolen by malware. |
| "Just npmguard or Aegis?" | They detect or pin before install. Shankh also handles the victim *after* install, where every LiteLLM victim was. |

### 6.6 What judges will probe, and the honest answers
- **Instant-use attackers** beat remediation; prevention and the incident report cover them.
- **A compromised maintainer committing to the real repo** passes source verification. Advisories and the maintainer's kill switch cover it once it's known.
- **Coverage** is strongest for AWS long-term keys. Other credentials get alerts. Keychains and browser stores aren't covered.
- **False alarms** are bounded: credentials are deactivated, never deleted, and restoring a revoked version is deliberately slow.
- **Adoption:** maintainers have to claim their kill switch. Unclaimed packages still benefit from advisories and from evidence other users publish.

---

## 7. Sources

**The LiteLLM incidents**
- Datadog Security Labs, "LiteLLM compromised on PyPI and Docker": https://securitylabs.datadoghq.com/articles/litellm-compromised-pypi-docker/
- Cloud Security Alliance, "LiteLLM 1.107.0: When Model-Gateway Logs Become the Credential Store": https://labs.cloudsecurityalliance.org/research/csa-research-note-litellm-1107-gateway-log-token-compromise/
- Help Net Security, "LiteLLM hit by second supply chain attack this year": https://www.helpnetsecurity.com/2026/10/22/litellm-compromised-supply-chain-attack-pypi-docker/
- OSV, GHSA-5mg7-485q-xm76 (March 2026): https://osv.dev/vulnerability/GHSA-5mg7-485q-xm76
- SOCRadar, LiteLLM supply chain attack: https://socradar.io/blog/litellm-supply-chain-attack-pypi-docker/
- Astra, LiteLLM v1.107.0 IOCs and response steps: https://www.getastra.com/blog/?p=49602

**Credential exposure and response**
- Unit 42, "Detecting exposed AWS IAM credentials": https://unit42.paloaltonetworks.com/detecting-exposed-aws-iam-credentials.md
- GBHackers, "AWS detects and quarantines exposed IAM credentials": https://gbhackers.com/aws-detects-and-quarantines-exposed-iam-credentials/
- Help Net Security, "The shocking speed of AWS key exploitation" (Clutch Security): https://www.helpnetsecurity.com/2024/12/02/revoke-exposed-aws-keys/
- secret-blast-radius: https://github.com/Krrishkumar125/secret-blast-radius
- DEV, "How npm worms steal your credentials, and the order to rotate them in": https://dev.to/quietkernel/how-npm-worms-steal-your-credentials-and-the-order-to-rotate-them-in-5fd1

**Ecosystem defences and evidence sources**
- PyPI blog, "PyPI and Shai-Hulud": https://blog.pypi.org/posts/2025-11-26-pypi-and-shai-hulud/
- BleepingComputer, malicious npm packages evading install-script defences: https://www.bleepingcomputer.com/news/security/malicious-npm-packages-evade-install-script-defenses-at-runtime/
- OpenSSF malicious-packages: https://github.com/ossf/malicious-packages
- OSV schema: https://github.com/ossf/osv-schema
- OpenSSF package-analysis: https://pkg.go.dev/github.com/ossf/package-analysis
- Google OSS Rebuild: https://pkg.go.dev/github.com/google/oss-rebuild
- OSS Rebuild storage documentation: https://scriptagc.wasmer.app/https_docs_oss-rebuild_dev/storage_html
- ENSv2 Permissioned Registry (roles and emancipation): https://docs.ens.domains/ensv2/permissioned-registry
- EF Mandate (CROPS): https://blog.ethereum.org/2026/03/13/ef-mandate

**ETHGlobal prior art**
- Showcase dataset (18,693 projects, 69 events): https://github.com/Marcussy34/ethglobal
- ETHGlobal Mumbai prizes: https://ethglobal.com/events/mumbai/prizes
- npmguard: https://ethglobal.com/showcase/npmguard-aeihd · NpmGuard: https://ethglobal.com/showcase/npmguard-wt7wh
- Aegis (Safe Skills): https://ethglobal.com/showcase/aegis-p4gj2
- Sigil: https://ethglobal.com/showcase/sigil-91xdp · SureX: https://ethglobal.com/showcase/surex-9gct3 · Klaxon: https://ethglobal.com/showcase/klaxon-s492r · GhostKey: https://ethglobal.com/showcase/ghostkey-zotub
- Tokyo 2026: Airlock https://ethglobal.com/showcase/airlock-ph6bx · End Credits https://ethglobal.com/showcase/end-credits-1done · Plain Safe https://ethglobal.com/showcase/plain-safe-wrxop · Relay https://ethglobal.com/showcase/relay-abxnx · Kura https://ethglobal.com/showcase/kura-so3wx · Radius https://ethglobal.com/showcase/radius-7i7d0 · Lortnoc Tahc https://ethglobal.com/showcase/lortnoc-tahc-49c6e · Surety https://ethglobal.com/showcase/surety-ms4gx · Lifeline https://ethglobal.com/showcase/lifeline-mygz6 · Pupille https://ethglobal.com/showcase/pupille-2o0q0
- Finalists cited: TARE https://ethglobal.com/showcase/tare-ozced · The Wallet Shift https://ethglobal.com/showcase/the-wallet-shift-pqdxy · VEIL VPN https://ethglobal.com/showcase/veil-vpn-c643n · Proof of Scan https://ethglobal.com/showcase/proof-of-scan-trx38 · Immunity https://ethglobal.com/showcase/immunity-eg56a
