# Pitch study guide

Everything to know cold before pitching Shankh to the ENS / EF / Arkiv partner judges. See [`docs/plan.md`](plan.md) for the authoritative Status table — this file explains the *idea* for a human about to pitch it, that file tracks what's actually built.

## 1. The problem, in plain terms

When a software package gets hacked (the maintainer's account gets taken over, a malicious version gets published), it steals credentials — AWS keys, SSH keys, API tokens — sitting on the machines of everyone who installs it. Today: if a key leaks **publicly** (accidentally pushed to GitHub, exposed in an npm package), AWS automatically deactivates it in about 10 seconds (`AWSCompromisedKeyQuarantineV3`) — this already works. If a key is **stolen by malware** running quietly on your machine, nothing automatic happens. A human has to notice, which can take hours. This really happened in October 2026: a malicious version of a popular Python package (LiteLLM 1.107.0) was live for about two hours before PyPI removed it, and stolen AWS keys were seen in use about 4.5 hours after theft.

**Shankh closes that second gap.** It's the automatic-deactivation system for credentials stolen by malware — not public leaks (already solved), but malware theft (not solved by anyone).

## 2. The mechanism — four moving parts

**Notice** → your machine watches what gets installed and knows which credentials each package could reach (never reads the credential values themselves, just "this package can see an AWS key").

**Verify** → when a new version of a package arrives, Shankh rebuilds it from its public source code in an isolated sandbox (no network, no secrets) and compares file-by-file against what actually got installed. If they don't match — especially in files that run code automatically on startup (`.pth` files, `sitecustomize.py` — the exact mechanism the real LiteLLM attack used) — that's a critical red flag.

**Kill** → on any of four signals (your own rebuild mismatch, the maintainer's own revocation, a public security advisory, or a trusted report from another user), the exposed AWS key gets **deactivated** (not deleted — reversible if it's a false alarm), the malicious files get removed, and an incident report is written.

**Survive a compromised publisher** → if an attacker has taken over the maintainer's GitHub/PyPI account, they can publish bad code — but they can't touch the alarm system, because the alarm lives in two places the attacker never has keys to: **ENS** (the real package maintainer, ideally on a hardware-wallet-held key, can push a "this exact version is bad" flag nobody else can write) and **Arkiv** (any user who catches the problem can sign and publish evidence that other users can check and act on themselves, without trusting a central server).

So: one person's rebuild catches the problem, it propagates via ENS/Arkiv, and everyone else's key gets killed too — even though the attacker still controls the package's publishing account.

## 3. Vocabulary to have cold

| Term | What it means here |
|---|---|
| ENSv2 | The new version of Ethereum Name Service, with much more granular permission control per name than the original ENS. |
| Emancipated registry | A sub-name registry where the parent has permanently given up every power to seize, redirect, or unregister names under it. Shankh emancipates `pypi.shankh.eth` so Shankh itself can never rug a package maintainer's name — a trust guarantee, not a feature. |
| Resolver | The contract that actually stores a name's data (text records like a repo URL). Shankh gives each package its own resolver so permissions on one package's name can't leak into another's. |
| Role scoping (`grantSetterRoles`) | ENSv2 lets you grant permission to write one specific key on a resolver, not "everything." The maintainer can only ever write `shankh.source`; only the `KillSwitch` contract can write `shankh.revoked`. |
| `KillSwitch` contract | One per package. The maintainer calls `revoke(hash)` on it; it's the only thing allowed to update that package's "revoked" flag on ENS. Revocation is instant; undoing it is delayed 48 hours — "kill fast, restore slow." |
| Arkiv | A decentralized data layer where `shankh.report` entities live — one victim's finding becomes evidence other machines can independently verify and act on. |
| CROPS | Ethereum Foundation's category for apps that stay credibly neutral / resilient — work correctly even if central infrastructure is adversarial or offline. Shankh's "turn the status page off, the kill still happens locally" demo beat is a direct CROPS argument. |
| Rebuild verification | Taking a package's claimed public source code, rebuilding it in a sandbox with no network access, and diffing it byte-for-byte against what's actually installed. |

## 4. What's actually real right now — be precise, judges will ask

- **The watcher (`shankhd`):** real. It notices a new install within seconds and rebuilds it from its public source, with nobody typing a command (caught live 2–4 seconds after install).
- **Rebuild verifier:** real, tested against a real clean package and a real planted malicious package.
- **ENS:** real, live on Sepolia — `shankh.eth → pypi.shankh.eth` (emancipated, confirmed by trying to undo it and watching it fail) → three packages, each with its own `KillSwitch`. A maintainer's flag was caught by `shankh scan` from ENS alone. Reporters have ENS names too (`shankh-team.reporters.shankh.eth`).
- **Arkiv:** real both ways. Alarms are written signed, read-only (an edit by the alarm's own owner was refused by the chain) and extendable by anyone. Other machines read trusted reporters' alarms, re-check them locally, and keep confirmed ones alive — shown live with two machines on separate wallets.
- **Landing page and `/registry`:** deployed, every value read live per request — no hard-coded demo values.
- **The stolen key switches itself off:** real, for AWS keys you register with Shankh. Live against an AWS sandbox: the key was quarantined and deactivated 13 seconds after the poisoned install, and AWS then rejected it.
- **Not yet built:** finding on its own which keys a package could reach (today you register them), keys other than AWS, the CloudTrail audit and file cleanup, the public-advisory (OSV) signal, Docker images, and running the watcher as a system service.

Say this plainly if asked — the key shut-off works for keys you register; it doesn't discover them yet.

## 5. Why each partner track, and what each judge will probe

**ENS — Best Use of ENSv2 ($7,000).** Pitch angle: "we use ENS as a permission system for security, not a lookup table." Expect: "why not just use a database?" — a database can be seized or edited by whoever controls the server; the emancipated registry plus scoped resolver means nobody, including Shankh's own team, can rewrite the trust record.

**Ethereum Foundation — Best CROPS App ($3,500).** Pitch angle: the system works even if Shankh's own servers are attacked or shut off, because the client reads ENS state directly. Expect: "do you use Anon-RPC?" — still unverified; say so honestly and ask the EF booth directly.

**Arkiv — Build on Arkiv.** Pitch angle: `shankh.report` is how "one person's catch saves everyone else" actually works across machines that don't trust each other, with explicit per-reporter trust and local re-verification. Expect: "why not just a shared database?" — because reports are signed, independently verifiable, and nobody (including Shankh) can tamper with them unnoticed.

## 6. The honest comparison point — NpmGuard (a prior ETHGlobal finalist)

NpmGuard (ETHGlobal Cannes) warns you **before** you install a bad package — LLM-audited, stores verdicts on ENS, automated by a Chainlink CRE cron job, published as a real npm CLI. It won partly because it was fully wired together and genuinely automated — ENS as the live storage layer, Chainlink as the automation layer, a complete deployed artifact a judge could run themselves.

Shankh's idea differs in kind, not degree: NpmGuard never touches what happens **after** a credential is already stolen — that's Shankh's whole premise, and it has no NpmGuard analogue. But NpmGuard's win shows judges reward automation and completeness, which is exactly where Shankh still has visible gaps: no running watcher yet, and the AWS kill sequence unbuilt. Don't shy from naming this difference if asked "how is this different from X" — pre-install gate vs. post-compromise kill is a real, defensible distinction.

## 7. Two pitch scripts to have ready

**30 seconds:** "When a package gets hacked, if it leaks a credential publicly, AWS kills it in seconds. If malware steals that same credential quietly, nothing happens automatically — that's what hit LiteLLM users in October. Shankh is the missing half: it rebuilds every new package against its public source, and the moment it's proven malicious — by that rebuild, the real maintainer's on-chain kill switch, a security advisory, or another victim's signed report — the stolen key deactivates itself. The alarm lives on ENS and a decentralized evidence layer, so even an attacker who's taken over the maintainer's GitHub account can't suppress it."

**For the Q&A, the weakest point to pre-empt:** "The AWS kill sequence and the always-on watcher are the two pieces not finished yet — we're blocked on provisioning a sandbox account for the former. Everything we show you as live — the ENS tree, the rebuild diff, the Arkiv report — is real on-chain state, not a mock, which we can show you addresses for right now."
