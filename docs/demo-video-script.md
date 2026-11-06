# Demo video script — Shankh

**Hard limit: 3:00** (Ethereum Foundation, Best CROPS App). Aim for 2:45 so a slow transaction doesn't push it over. Rehearse once against a clock before recording.

Real screen recording, your own voice, one continuous path. Cuts to skip waiting for a scan or a transaction are fine (say "a few seconds later"); cuts that hide a failure are not.

## Before recording

- `scripts/demo-ens.sh prepare` and `scripts/demo-arkiv.sh prepare` — fresh, unflagged, unreported builds. Re-run both before every take; each build is new.
- `.env` has `OPERATOR_PRIVATE_KEY`, `ARKIV_WALLET_PRIVATE_KEY`, `ARKIV_ACCESS_KEY`. The operator wallet has Sepolia ETH.
- Two windows: the landing page (https://shankh-eth.vercel.app, light theme, scrolled to the top) and a terminal at the repo root, font large enough to read at 1080p.
- Do one dry run of each script first; the Sepolia RPC can take 5–8s a call on bad Wi-Fi.

## Script

| # | Time | On screen | Said |
|---|---|---|---|
| 1 | 0:00–0:15 | Terminal: the last lines of a `scripts/demo-ens.sh run` from a dry run, showing `COMPROMISED shankh-demo==1.0.0 flagged on shankh-demo.pypi.shankh.eth` | "This is Shankh catching a poisoned Python package — from a warning its real maintainer posted on ENS seconds earlier. Here's why that matters, and how it works." |
| 2 | 0:15–0:40 | Landing page, section 01 (the LiteLLM timeline) | "In October, the LiteLLM package was hacked. For two hours, every machine that installed it had its cloud keys copied. The publisher's accounts — where you'd expect a warning — were the attacker's. Shankh puts the warning somewhere the attacker can't reach." |
| 3 | 0:40–1:25 | Terminal: `scripts/demo-ens.sh run`. Step 1 scan (nothing flagged) → press Enter → step 2 flag tx with Etherscan link → step 3 scan, COMPROMISED | "Every package gets an ENS name under pypi.shankh.eth. This machine sweeps every one of them and compares locally, so nobody learns what's installed. Nothing's flagged yet. Now I'm the maintainer: I flag this build from my own wallet — a live Sepolia transaction. Scan again: compromised, from the ENS flag alone, and the alarm goes to Arkiv. Someone who stole my PyPI login couldn't do this, and neither could we: the name space is locked." |
| 4 | 1:25–2:15 | Terminal: `scripts/demo-arkiv.sh run`. Step 1 (0 about this build) → Enter → step 2 machine A CRITICAL + entity key → step 3 machine B COMPROMISED, "re-checked here" | "Now the case where no maintainer has noticed. Machine A rebuilds the package from its public source and finds a file that's in nobody's code — sitecustomize.py, which Python runs on every start, the same trick LiteLLM used. It signs that finding onto Arkiv. Machine B trusts that reporter by their ENS name, picks up the alarm, re-checks it itself, and only then says compromised. Both machines here are throwaway environments on this laptop." |
| 5 | 2:15–2:40 | Landing page, section 03: the "How the three fit together" diagram, then the CROPS strip | "That's the whole design: Shankh runs on your machine; ENS holds what maintainers and reporters say about themselves; Arkiv carries the alarms. Every call goes straight to a public network. This page is only a window — it's the one thing we host, and the scan you just saw never talked to it. That's the censorship resistance: nobody can take the alarm down, including us." |
| 6 | 2:40–2:55 | Landing page, section 05 (where it stands) | "What's live: checking, the alarm on ENS and Arkiv, and acting on it. Next: shutting the stolen keys off automatically. Everything's open source, on Sepolia and the Arkiv testnet." |

## Notes

- If a scan stalls, stop and retake rather than cutting around it.
- Beat 3's step 2 prints a real Etherscan link — leave it on screen for a second; it's the evidence.
- Don't claim the key shut-off works. Beat 6 says it's next, and the page says so too.
- Upload unlisted (YouTube or similar), check it plays logged out, then put the link in README.md and the submission form.
