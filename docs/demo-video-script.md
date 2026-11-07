# Demo video script — Shankh

The final cut is the team's own edit, `video-assets/final shankh last.mp4` (3:42 as exported; videos aren't committed — `*.mp4` is gitignored). This script follows that edit's order and clip lengths. **Target about 3:27, at most 3:30** (the team's call). The Ethereum Foundation's requirement recorded in docs/plan.md says "3 minutes max": if that's enforced, anything after 3:00 may be cut off — in this cut, the end of the Arkiv demo, the close and the end card.

The voiceover is written to be spoken naturally, like explaining it to a friend — full sentences, no dramatic pauses — at about 150 words a minute (2.5 words a second). Every line is sized to its clip with a second or two to spare. **419 words, about 2:47 of speaking in a 3:27 video.**

---

## 1. Five edits to the cut (3:42 → about 3:27)

1. **Title card:** extend from 3 s to **8 s**.
2. **Section 02:** cut the recorded run (about 0:57–1:01) — it repeats the live demo that follows.
3. **AWS console:** trim from 18 s to **8 s** — keep only the key's *Inactive* status (about 1:30) and the *AWSCompromisedKeyQuarantineV3* policy (about 1:33).
4. **ENS demo:** cut its first ~6 s (the `prepare` output).
5. **End card:** extend from under a second to **4 s**.

And swap the newspaper footage: use `video-assets/newspaper-loop.mp4` (three copies, trimmed to 20 s) instead of Gemini's full image, whose body text misquotes LiteLLM's report ("compiled alware", "the attacker happed to compromise multiple dependent security controls").

---

## 2. The voiceover, clip by clip

| # | Clip | In the video | Length | Voiceover | Words |
|---|---|---|---|---|---|
| 1 | Newspaper (`newspaper-loop.mp4`) | 0:00–0:20 | 20 s | On October twenty-first, LiteLLM, a popular AI package, was hacked. The attacker took over its release pipeline and pushed a poisoned version to PyPI and Docker. Everyone who installed it had their cloud keys stolen. | 35 |
| 2 | Title card (`opening-card.png`) | 0:20–0:28 | 8 s | This is Shankh. Stolen keys that switch themselves off. | 9 |
| 3 | Landing page: hero, then section 01 | 0:28–0:49 | 21 s | If your AWS key leaks on GitHub, AWS switches it off in about ten seconds. But if malware steals it, nothing happens. An estimated 2,500 organizations were exposed in this attack, and in one case a stolen key was used four and a half hours later. | 46 |
| 4 | Section 02: the three steps | 0:49–1:01 | 12 s | Shankh does three things. It checks every package you install against its public source, raises an alarm nobody can silence, and switches the stolen keys off. | 26 |
| 5 | Live catch and key shut-off (terminal) | 1:01–1:16 | 15 s | Here it is live. An attacker has this laptop's AWS key, and it works. A poisoned package gets installed. Seconds later Shankh catches it, switches the key off, and AWS rejects the attacker. | 33 |
| 6 | AWS console | 1:16–1:24 | 8 s | And in AWS itself, the key is now inactive, with AWS's own quarantine policy attached. | 15 |
| 7 | Section 03: the diagram | 1:24–1:36 | 12 s | Shankh runs on your own machine. ENS holds what maintainers and reporters publish, and Arkiv carries the alarms. There's no Shankh server to take down. | 25 |
| 8 | Section 04: "The alarm lives on ENS" | 1:36–1:48 | 12 s | Why ENS? The attacker controls the publisher's accounts, so the warning can't live there. On ENS, only the real maintainer can flag a build, not even us. | 27 |
| 9 | ENS demo (terminal) | 1:48–2:24 | 36 s | Every package gets its own name under pypi.shankh.eth. Right now nothing's flagged, so the scan is clean. I'll play the maintainer and flag this build, a real transaction on Sepolia. When the scan runs again, it catches the package from that flag alone, no rebuild needed. Someone with my stolen PyPI password couldn't have done that, and neither could we, because we gave up control of that name space and the chain enforces it. | 74 |
| 10 | `/registry` | 2:24–2:36 | 12 s | And here's the registry, read live from the chain: every package, and the builds its maintainer has flagged, including the one I just flagged. | 24 |
| 11 | Arkiv demo (terminal) | 2:36–3:11 | 35 s | And if the maintainer hasn't noticed yet, machines warn each other. Machine A catches the problem and signs an alarm onto Arkiv. Machine B trusts that reporter through their ENS name, so it picks up the alarm, checks the package for itself, and only then flags it. Then it keeps the alarm alive. Nobody can edit an alarm once it's posted, so a stolen key can't rewrite it, and a fake alarm about a clean package is simply ignored. | 79 |
| 12 | Section 05: "One catches it. Everyone is saved." | 3:11–3:23 | 12 s | So when one machine catches it, everyone running that package is warned, and the stolen key switches itself off. Next, it'll find keys on its own. | 26 |
| 13 | End card (`end-card.png`) | 3:23–3:27 | 4 s | *(music only)* | — |

The newspaper tells only *what happened*; clip 3 says *why it's a gap* (ten seconds versus nothing, the scale, the 4.5-hour window) — so the problem isn't told twice.

---

## 3. Captions to burn in

Judges often watch muted, at 2× speed. Each number carries its source in small type.

| Clip | Captions |
|---|---|
| 1 | small, whole shot: "Restyled from LiteLLM's incident report, 21 Oct 2026" (already in `newspaper-loop.mp4`) |
| 3 | "Leaked in public: switched off in ~10 s" — *Unit 42* · "Stolen by malware: nothing" · "~2,500 organizations exposed" — *CloudSEK estimate; Hudson Rock* · "Stolen key used ~4.5 h later" — *Wiz, one observed case* |
| 5 | "Caught in seconds" · "The stolen key switches itself off" · "AWS says no" |
| 6 | "Confirmed in AWS: key Inactive, quarantined" |
| 9 | "Flagged on ENS — a live Sepolia transaction" (over the Etherscan link) · "Caught from the ENS flag alone" |
| 11 | "Re-checked locally → kept alive" · "Alarms are read-only: nobody can edit them" · small: "Two throwaway environments on this laptop, each with its own wallet" |

---

## 4. Re-recording a clip, if one needs it

Run each `prepare` right before recording — it builds a brand-new package nobody has flagged or reported yet. Start recording after `prepare`; never show it.

| Clip | Commands | Start recording at | Stop at |
|---|---|---|---|
| 5 — live catch | `scripts/demo-watch.sh prepare` (also switches the demo AWS key back on), `clear`, `scripts/demo-watch.sh run` | the "Press Enter to install…" pause, after the `ACCEPTED` line | the `REJECTED InvalidClientTokenId` line |
| 9 — ENS | `scripts/demo-ens.sh prepare`, `clear`, `scripts/demo-ens.sh run --yes` | the command | `COMPROMISED … flagged on shankh-demo.pypi.shankh.eth` |
| 11 — Arkiv | `scripts/demo-arkiv.sh prepare`, `clear`, `scripts/demo-arkiv.sh run --yes` | the command | `kept the original alarm alive for another 90 days` |

After clip 5 the demo key is off: run `scripts/demo-watch.sh restore` (or `prepare`) before any retake. Setup: 1920×1080, terminal font 18–20 pt, browser zoom ~125%, Do Not Disturb on.

---

## 5. Honesty checks before you export

- The key shut-off is real for keys registered with Shankh (`SHANKH_PROTECTED_KEYS`), and AWS only. Clip 12 says finding keys on its own is next — keep it that way.
- "Seconds later", never a fixed number: the catch took 2–9 seconds across real runs; the on-screen timestamps show the real gap.
- "An estimated 2,500 organizations" and "in one case … four and a half hours" — keep those qualifiers; they're how the sources put it.
- The newspaper opening shows only what Gemini reproduced exactly (tags, headline, date) and credits LiteLLM's incident report. Never show Gemini's reworded body text.
- Cutting out *waiting* is fine; cutting out a *failure* is not.

## 6. Export and upload

1080p; check the length (about 3:27, at most 3:30); upload unlisted (YouTube or similar); open the link in a logged-out browser to confirm it plays; then add the link to `README.md` (Demo video) and `docs/submission-form.md` (Links → Video).
