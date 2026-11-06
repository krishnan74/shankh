<p align="center"><img src="status-page/public/logo-mark.png" width="96" alt="Shankh logo: a conch spiral cut into the Ethereum diamond"></p>

# Shankh

When a package you installed turns out to be malicious, the warning reaches every other machine running it in seconds — and the alarm lives on ENS and Arkiv, where the attacker who hijacked the publisher can't silence it.

**Live:** https://shankh-eth.vercel.app · **Demo video:** not recorded yet · **Deployed at:** ENSv2 names `shankh.eth` → `pypi.shankh.eth` on Sepolia, `shankh.report` entities on the Arkiv testnet — addresses below

## The problem

In October 2026, the LiteLLM 1.107.0 package on PyPI was compromised: for about two hours, every machine that installed it had its cloud keys copied to the attacker. AWS automatically quarantines keys leaked *publicly* within seconds. Keys stolen by malware get nothing — someone has to notice, tell everyone, and every victim has to act by hand. Meanwhile the publisher's own accounts, the natural place for a warning, are exactly what the attacker controls. Research behind this: [`project-overview.md`](project-overview.md).

## How it works

1. **Check.** `shankh verify` rebuilds an installed package's file list from its public source on PyPI and compares file by file. A file that's in nobody's source code — like the `sitecustomize.py` the LiteLLM attack used to run on every Python start — is CRITICAL.
2. **Raise the alarm on Arkiv.** The finding is written to Arkiv as a `shankh.report` entity, signed by the finder's own wallet: package, version, the exact build's fingerprint, and what was wrong.
3. **Let the maintainer flag it on ENS.** Every package gets a name under `pypi.shankh.eth`. The real maintainer flags a bad build through that package's `KillSwitch` contract, which writes it to the name's `shankh.revoked` text record. Nobody else can write that record — not someone who stole the maintainer's PyPI login, and not us: `pypi.shankh.eth` is emancipated.
4. **Every machine watches and sweeps.** `shankhd` runs in the background: it rebuilds every new install the moment it lands, and every minute it fetches the bad-builds list of *every* package under `pypi.shankh.eth`, plus recent alarms from reporters you trust (named on ENS under `reporters.shankh.eth`), and compares them with what's installed — locally, so no one learns what you run. A trusted alarm is re-checked on your machine before it counts.
5. **Act** *(not built yet)*. On a confirmed hit, the cloud keys the bad build could reach are quarantined and deactivated automatically.

The landing page's section 03 has a diagram of how ENS, Arkiv and the Ethereum Foundation's CROPS principles fit together.

## What is actually live

| Component | Where | Evidence |
|---|---|---|
| `shankh verify` — rebuild and compare, auto-reports to Arkiv | runs locally | proven against `idna==3.20` on real PyPI (clean) and a real malicious test wheel (CRITICAL): entity `0xc669ad67…4010` |
| ENSv2 tree: `shankh.eth` → `pypi.shankh.eth` (emancipated) → 3 packages | Sepolia | registries `0xb95110b3F8d89fb8e9858fC414E21475DA4DF15c` / `0x8634b9f567Fa84da5BCe08150Aa323424382a3a4`; re-granting a revoked role reverts `EACCannotGrantRoles` live |
| Per-package `KillSwitch` → `shankh.revoked` | Sepolia, `0x1126b7aBe8b0Db262cBa84b6b5a377D002351c5a` (`shankh-demo`) | a maintainer flagged a build live (tx `0xef5625a0…7379`, confirmed in 7s) and `shankh scan` caught it from ENS alone |
| `shankh scan` — registry sweep | runs locally | every package read from the registry's own `LabelRegistered` events |
| `shankhd` — the watcher: rebuilds every new install as it lands, sweeps ENS and trusted Arkiv alarms every minute | runs locally | a poisoned package installed while it ran was caught 2s later with no command typed, finding posted to Arkiv: entity `0x574edd31…cf10` |
| `shankh scan --trust` — act on trusted reporters' Arkiv alarms | runs locally, reads Sepolia + Arkiv | machine A posted entity `0xe7d2102e…7ec0`; machine B read it, re-checked it locally, COMPROMISED |
| Reporter identity `shankh-team.reporters.shankh.eth` | Sepolia, registry `0x9b833a137cf9e24200394cb9a3af5df13b1db28e` (emancipated) | `shankh.signer` → `0xDcbe075a907960951Cd4df379BB21461097eEa91`, writable only by that wallet |
| `shankh.report` entities | Arkiv testnet (chain 7794095) | written by `0xDcbe075a907960951Cd4df379BB21461097eEa91` |
| Landing page and `/registry` | Vercel, https://shankh-eth.vercel.app and https://shankh-eth.vercel.app/registry | read ENS, the `KillSwitch`, and Arkiv live on every request — no hard-coded state. `/registry` lists every package under `pypi.shankh.eth` with its maintainer's bad-builds list and the Arkiv alarms about it |

Every address, transaction and entity: [`docs/evidence.md`](docs/evidence.md). The two "machines" in the Arkiv demo are two throwaway Python environments on one laptop, both using the demo wallet.

## Try it without installing anything

Read a package's bad-builds list straight off ENS (needs only [Foundry](https://getfoundry.sh)'s `cast`):

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
NAME=shankh-demo.pypi.shankh.eth
cast abi-decode 'f()(string)' $(cast call 0xe2f5E5DcbA389D7DFcA629c5c1eaAe2aAdC60E3E \
  'resolve(bytes,bytes)(bytes)' 0x0b7368616e6b682d64656d6f0470797069067368616e6b680365746800 \
  $(cast calldata 'text(bytes32,string)' $(cast namehash $NAME) shankh.revoked) --rpc-url $RPC)
```

Read the reporter's recent alarms off Arkiv — the same query `shankh scan --trust` runs (needs a free access key from https://hub.arkiv.network/access-keys; without one the public endpoint is heavily rate limited and can hang for minutes):

```bash
cd arkiv && npm install
echo '{"creators":["0xDcbe075a907960951Cd4df379BB21461097eEa91"],"limit":10}' | \
  ARKIV_RPC_URL=https://rpc.rabdi.db-chain.testnet.arkiv.network ARKIV_CHAIN_ID=7794095 \
  ARKIV_ACCESS_KEY=<your key> npm run --silent read-reports
```

## Run it

```bash
git clone https://github.com/krishnan74/shankh && cd shankh
cp .env.example .env   # public Sepolia addresses are pre-filled; add ARKIV_ACCESS_KEY to read Arkiv

# The CLI (Python 3.11+, Node 20+, Foundry's cast on PATH)
(cd shankh && python3 -m venv .venv && .venv/bin/pip install -e . pytest ruff && .venv/bin/pytest)
(cd arkiv && npm install && npm test)    # the CLI reaches Arkiv through this package
set -a && source .env && set +a
shankh/.venv/bin/shankh scan                                              # this environment vs every ENS kill switch
shankh/.venv/bin/shankh scan --trust shankh-team.reporters.shankh.eth     # ...and that reporter's Arkiv alarms (needs ARKIV_ACCESS_KEY)
shankh/.venv/bin/shankhd --trust shankh-team.reporters.shankh.eth         # keep watching: rebuild every new install, sweep every minute

# Contracts, landing page
(cd contracts && forge install foundry-rs/forge-std --no-commit && forge test)
(cd status-page && npm install && npm run build)
```

The live demos (`scripts/demo-ens.sh`, `scripts/demo-arkiv.sh`, `scripts/demo-watch.sh`) send real transactions and need the testnet keys in `.env`; each has `prepare` and `run` steps, and the poisoned test package they build is inert. They never start Python inside the poisoned environment.

## CROPS

For the Ethereum Foundation's Best CROPS App track. Lead property: **C (censorship-resistant)**.

- **C — live.** Nobody can delete or silence the alarm: not the hijacked publisher (it lives on ENS and Arkiv, not their accounts), not other people (only the maintainer's `KillSwitch` can write `shankh.revoked`, only the finder can sign their report), and not us (`pypi.shankh.eth` and `reporters.shankh.eth` are emancipated). Shankh runs on your machine and talks directly to public networks; switch the landing page off and `shankh scan` still works.
- **O — live.** MIT licensed ([`LICENSE`](LICENSE)), public repo, runs from a clone with no Shankh account.
- **P — partly.** What's installed never leaves your machine: `shankh scan` fetches the whole bad-builds list and reads Arkiv by reporter, never by package, then matches locally. Not yet: hiding the reads themselves from the RPC provider (Anon-RPC).
- **S — partly.** Packages are rebuilt from source rather than trusted, alarms are re-checked locally before they count, and on ENS only the maintainer's switch can flag a build. Not yet: switching the stolen keys off automatically.

No analytics or third-party trackers on the landing page.

## Limitations

- **The key shut-off isn't built.** Today Shankh detects and warns; it doesn't yet quarantine or deactivate AWS keys. The AWS sandbox for it hasn't been set up.
- **The watcher's memory is per run.** `shankhd` rebuilds every new install and re-sweeps ENS and Arkiv every minute, but on restart it treats what's already installed as the baseline (`--verify-existing` rebuilds it all) and doesn't run as a system service yet.
- **Python packages only.** Docker images and other ecosystems are in the design, not the code.
- **`KillSwitch.sol` is reviewed, not audited.** The team reviewed it line by line; it has 3 Foundry tests and no external audit. Testnet only.
- **One wallet plays every role in the demo** — operator, maintainer, and reporter — so the live demos show the mechanism, not independent parties.
- **Re-checks rebuild from PyPI's source archive.** A package with no source archive, or a malicious change that's also in the published source, isn't caught by the rebuild (the ENS and Arkiv signals still apply).
- **Testnets only:** Sepolia and the Arkiv testnet. Public RPC latency is 5–8s per call on a bad network; a scan takes 10–20s.
- **`shankh.request`** (ask the network to check a package you can't) is a schema with no writer yet.

## Docs

- [`docs/plan.md`](docs/plan.md) — status of every component, track checklist
- [`docs/technical-deep-dive.md`](docs/technical-deep-dive.md) — how every part works
- [`docs/design.md`](docs/design.md) · [`docs/decisions.md`](docs/decisions.md) — design and ADRs
- [`docs/evidence.md`](docs/evidence.md) — addresses, hashes, transactions
- [`docs/build-log.md`](docs/build-log.md) · [`docs/feedback/`](docs/feedback/) — what happened, and partner feedback
- [`arkiv/`](arkiv/) — `schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`
- [`docs/ai-usage.md`](docs/ai-usage.md) — how AI was used
