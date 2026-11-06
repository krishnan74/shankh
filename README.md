# Shankh

Credentials stolen by a malicious package quarantine and deactivate themselves — triggered by evidence a compromised publisher can't suppress.

**Live:** https://status-page-plum-nine.vercel.app · **Demo video:** not recorded yet · **Deployed at:** `KillSwitch` on Sepolia, `shankh.report` on the Arkiv testnet — see below

## The problem

In October 2026, the LiteLLM 1.107.0 supply-chain compromise stole AWS, GCP, Azure and other credentials from every machine that installed it. AWS's own automatic key quarantine protects credentials leaked *publicly* — in about 10 seconds. Credentials stolen by malware and sent straight to an attacker's server get nothing: every step of recovery, from noticing the install to rotating keys, is manual. See [`project-overview.md`](project-overview.md) for the full research behind this.

## How it works

1. `shankhd` watches what's installed (Python packages, Docker images) and which credentials each thing could reach — never leaving the device.
2. When a new release lands, it rebuilds the package from its public source in a network-isolated sandbox and diffs it file by file.
3. A match, a maintainer's ENS revocation, an OSV/GHSA advisory, or another user's signed Arkiv report can all trigger an automatic kill on a mismatch.
4. On a kill: the AWS key is quarantined then set `Inactive`, rogue files are deleted, exfiltration domains are blocked, and a signed incident report lands on Arkiv.
5. The alarm itself — the ENS `KillSwitch` and the Arkiv reports — lives under keys the publisher's own attacker never held, so one person's catch can save every other machine running the same compromised version.

See [`plan-2.md`](plan-2.md) for the full design (ENS tree, Arkiv entities, demo path, roadmap) and [`docs/plan.md`](docs/plan.md) for current build status.

## What is actually live

| Component | Where | Evidence |
|---|---|---|
| Status page | https://status-page-plum-nine.vercel.app | reads real live data on every request — `KillSwitch.maintainer()` on Sepolia, real `shankh.report` entities on Arkiv testnet — see docs/evidence.md |
| `KillSwitch` contract | Sepolia, `0x378fDf7BbdCB33D3504e96083a7DC7Fb882a0A2C` | deploy tx in docs/evidence.md |
| `shankh verify` | run it yourself, see Run it below | real rebuild-vs-published-source diff, auto-reports to Arkiv |
| `shankhd` watcher, AWS kill, ENS tree | — | not built yet — see docs/plan.md's Status table |

## Run it

```bash
git clone <repo> && cd <repo>
cp .env.example .env    # see the comments for what each variable is and where to get it

# Python watcher/CLI
cd shankh && python3 -m venv .venv && source .venv/bin/activate && pip install -e . pytest
pytest

# Contracts (lib/ is gitignored — forge install fetches forge-std)
cd ../contracts && forge install foundry-rs/forge-std --no-commit && forge test

# Status page
cd ../status-page && npm install && npm run build

# Arkiv scripts
cd ../arkiv && npm install && npm test
```

## CROPS

Required by the Ethereum Foundation Best CROPS App track. Lead property: **S (secure)** — see [`docs/plan.md`](docs/plan.md) track checklist for why.

- **C:** Shankh depends on no backend of its own to kill a credential — `shankhd` runs on the user's own machine and acts on ENS/Arkiv reads, not a Shankh-controlled server. *Not yet demonstrated end to end.*
- **O:** MIT licensed ([`LICENSE`](LICENSE)), public on GitHub · clone and run from the repo alone, no Shankh account needed.
- **P:** The status page and backend, if any, never see what's installed on a user's machine or which credentials it holds — that inventory never leaves the device. Arkiv reads are synced by time window, never by package name.
- **S:** Credentials quarantine and deactivate automatically on proof of compromise, with no human and no live Shankh server required in the loop. *Not yet demonstrated end to end.*

## Limitations

`shankh verify` (the rebuild-vs-published-source diff) and the Arkiv write it triggers are real and proven against a real malicious wheel. `KillSwitch` is deployed to Sepolia and the status page reads both live. The watcher daemon loop, the AWS kill sequence, the ENS tree (`shankh.eth`), and the `shankh.request` writer are all still stubs that raise `NotImplementedError` — see [`docs/design.md`](docs/design.md) for exactly what's real versus planned, component by component.

## Docs

- [`docs/plan.md`](docs/plan.md) — current status, time-box, track checklist
- [`docs/design.md`](docs/design.md) — how it works, in detail, and what's actually built
- [`docs/decisions.md`](docs/decisions.md) — ADRs
- [`docs/evidence.md`](docs/evidence.md) — addresses, hashes, output
- [`docs/ai-usage.md`](docs/ai-usage.md) — how AI was used
