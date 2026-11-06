# Demo video script — Shankh

**Hard limit: 3:00** (Ethereum Foundation, Best CROPS App). Aim for 2:50 so a slow transaction doesn't push it over. Rehearse once against a clock before recording.

Real screen recording, your own voice, one continuous path. Cuts to skip waiting for a scan or a transaction are fine (say "a few seconds later"); cuts that hide a failure are not.

## Before recording

- Run all three `prepare` steps, in this order, right before each take — each builds a brand-new package that nobody has flagged or reported yet:
  - `scripts/demo-watch.sh prepare`
  - `scripts/demo-ens.sh prepare`
  - `scripts/demo-arkiv.sh prepare`
- `.env` has `OPERATOR_PRIVATE_KEY`, `ARKIV_WALLET_PRIVATE_KEY`, `ARKIV_ACCESS_KEY`. The operator wallet has Sepolia ETH.
- Two windows: the landing page (https://shankh-eth.vercel.app, light theme) and a terminal at the repo root, font large enough to read at 1080p.
- **Start `scripts/demo-watch.sh run` before you hit record.** It starts the watcher, waits for its first sweep line (`sweep: 3 packages on ENS, …`), then pauses at "Press Enter to install the poisoned package". Start recording on that pause.
- Do one full dry run first; the Sepolia RPC can take 5–8s a call on bad Wi-Fi, and the Arkiv testnet occasionally stalls — if it does, wait and retake rather than cut around it.

## Script

| # | Time | On screen | Said |
|---|---|---|---|
| 1 | 0:00–0:20 | Terminal, paused in `demo-watch.sh run` with the watcher's `shankhd watching …` and `sweep: …` lines visible. Press Enter. The install happens; within a couple of seconds the watcher prints `new install`, then `COMPROMISED shankh-demo==1.0.0 (rebuild) [critical] sitecustomize.py`, then `posted to Arkiv` | "Shankh is watching this machine. Someone installs a Python package — and nobody types anything else. Two seconds later Shankh has rebuilt it from its public source, found a file that's in nobody's code, and posted the alarm for every other machine." |
| 2 | 0:20–0:40 | Landing page, section 01 (the LiteLLM timeline) | "That's the attack that hit LiteLLM in October: for two hours, every machine that installed it had its cloud keys copied. The publisher's own accounts — where you'd expect a warning — belonged to the attacker. Shankh puts the warning somewhere they can't reach: ENS and Arkiv." |
| 3 | 0:40–1:20 | Terminal: `scripts/demo-ens.sh run --yes`. Scan (nothing flagged) → the flag transaction with its Etherscan link → scan again, `COMPROMISED … flagged on shankh-demo.pypi.shankh.eth` | "First, ENS. Every package gets a name under pypi.shankh.eth, and only its real maintainer can flag a bad build there. Nothing's flagged yet. Now, as the maintainer, I flag this build — a live Sepolia transaction. Scan again: compromised, from that flag alone. Someone who stole my PyPI login couldn't do this, and neither could we: the name space is locked." |
| 4 | 1:20–2:05 | Terminal: `scripts/demo-arkiv.sh run --yes`. Skip ahead past step 1 if it's slow; show step 2 (machine A, CRITICAL, entity key) and step 3 (machine B, `COMPROMISED … alarm from shankh-team.reporters.shankh.eth, re-checked here`) | "Second, Arkiv. Machine A catches a bad build and signs the alarm onto Arkiv. Machine B trusts that reporter by their ENS name — it picks up the alarm, re-checks the package itself, and only then says compromised. A fake alarm about a clean package just gets ignored. Both machines here are throwaway environments on this laptop." |
| 5 | 2:05–2:35 | Landing page, section 02's trusted-reporters panel, then section 03's "How the three fit together" diagram | "Here it is live: every alarm, signed by a named reporter. And how it fits: Shankh runs on your machine; ENS holds what maintainers and reporters say about themselves; Arkiv carries the alarms. Every call goes straight to a public network. This page is only a window — the one thing we host — and none of what you just saw talked to it. Nobody can take the alarm down, including us." |
| 6 | 2:35–2:50 | Landing page, section 05 (where it stands) | "Live today: the watcher, the rebuild check, and the alarm on ENS and Arkiv. Next: switching the stolen keys off automatically. It's open source, on Sepolia and the Arkiv testnet." |

## Notes

- Beat 1 is the hook: don't talk over the moment the `COMPROMISED` line appears — let it land for a beat.
- The watcher's `kill:` line says "key shut-off not built yet". Leave it on screen; it's honest, and beat 6 says the same.
- If beat 1's install isn't caught within ~10 seconds, stop and retake — don't cut.
- Beat 3's step 2 prints a real Etherscan link; leave it on screen for a second, it's the evidence.
- Upload unlisted (YouTube or similar), check it plays logged out, then put the link in README.md and the submission form.
