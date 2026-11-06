# Demo video script — Shankh

**Hard limit: 3:00** (Ethereum Foundation, Best CROPS App). The voiceover below is 347 words, about 2:20 spoken at a calm pace (150 words a minute). The remaining ~40 seconds are for the pauses that let the key moments land, and for transactions — don't fill them with more words.

**How it's made:** not one take. Record six short clips (the shot list), record the voiceover separately from the script, then assemble them in an editor. A stalled testnet then costs you one clip, not the whole video. Cutting out *waiting* is fine (caption it "a few seconds later"); cutting out a *failure* is not.

**Judges often watch muted, at 2× speed.** Every beat has a burned-in caption that carries its point without sound. Each number on screen carries its source in small type underneath — a cited number is trusted, a bare one is questioned.

---

## Shot list — record these six clips

| Clip | What to record | How |
|---|---|---|
| **A** | The watcher catching a live install | `scripts/demo-watch.sh prepare`, then `scripts/demo-watch.sh run`. Start recording at the "Press Enter" pause, press Enter, stop after the `kill:` line. |
| **B** | The problem, on the landing page | https://shankh-eth.vercel.app, light theme. Start at the hero, press `j` once to section 01, hold on the timeline, then slowly scroll to the closing lines "Keys that leak in public get shut off in seconds. Keys stolen by malware get nothing." |
| **C** | ENS: the maintainer flags the build | `scripts/demo-ens.sh prepare`, then `scripts/demo-ens.sh run --yes` (whole run). Then, in the browser, click **Registry** in the top bar and scroll to `shankh-demo.pypi.shankh.eth`: the build you just flagged is in its `shankh.revoked` list. |
| **D** | Arkiv: one machine warns another | `scripts/demo-arkiv.sh prepare`, then `scripts/demo-arkiv.sh run --yes` (whole run). |
| **E** | The design | Landing page: press `j` to section 03 and hold on "How the three fit together"; then section 02's "Trusted reporters · on ENS, live" panel. |
| **F** | The close | Landing page section 05, "One catches it. Everyone is saved." Then an end card (see below). |

**Recording setup:** 1920×1080; browser zoom ~125%; terminal font 18–20pt; Do Not Disturb on; bookmarks bar hidden; only the site's tab open. Before each terminal clip run `clear` and `PS1='$ '`. Run all three `prepare` steps right before recording — each builds a brand-new package nobody has flagged or reported yet.

---

## The script

### 1 · Cold open — 0:00–0:15 · Clip A

> Shankh is watching this laptop. Someone installs a Python package — and nobody types anything else. Seconds later, it's caught: a hidden file that's in nobody's source code. And the alarm is already on its way to every other machine.

**Caption:** "Caught in seconds. Nobody typed a command."
**Edit:** zoom in on the `COMPROMISED … sitecustomize.py` line and hold it a beat; then on `posted to Arkiv`. Don't talk over the moment the `COMPROMISED` line appears.

### 2 · How big the problem is — 0:15–0:45 · Clip B

> If your cloud key leaks on GitHub, AWS switches it off in about ten seconds. If malware steals it from your laptop — nothing happens. That's exactly what hit LiteLLM, a popular AI package, in October: a poisoned update, live for two hours, and an estimated 2,500 organizations exposed. In one case, a stolen key was used four and a half hours later. And it keeps happening: xz, the Shai-Hulud worm, LiteLLM twice this year.

**Captions, one per sentence:**
- "Leaked in public: switched off in ~10 seconds" — *source: Unit 42*
- "Stolen by malware: nothing."
- "LiteLLM, Oct 2026 · ~2,500 organizations exposed" — *source: CloudSEK estimate; Hudson Rock*
- "Stolen key used ~4.5 hours later" — *source: Wiz (one observed case)*
- "xz (2024) · Shai-Hulud (2025) · LiteLLM ×2 (2026)"

### 3 · The real gap — 0:45–1:00 · Clip B, held on the closing lines

> The warning should come from the publisher. But in these attacks, the attacker controls the publisher's accounts. So Shankh puts the alarm somewhere they can't reach: on ENS and Arkiv.

**Caption:** "The attacker controls the publisher. So the alarm can't live there."

### 4 · ENS: the alarm nobody can silence — 1:00–1:40 · Clip C

> Every package gets an ENS name under pypi.shankh.eth, and only its real maintainer can flag a bad build there. Nothing's flagged yet. Now I'm the maintainer: one live transaction on Sepolia. Scan again — compromised, from that flag alone. And there it is in the registry, read live. Someone with my stolen PyPI password couldn't do this. Neither could we: we gave up control of the name space, and the chain enforces it.

**Captions:** "Flagged on ENS — a live Sepolia transaction" (over the Etherscan link; hold it a second) · "Caught from the ENS flag alone" · "We can't take the name space back. The chain enforces it."
**Edit:** cut the wait for the transaction to confirm; caption "a few seconds later".

### 5 · Arkiv: one catch protects everyone — 1:40–2:20 · Clip D

> When no maintainer has noticed yet, machines warn each other. Machine A rebuilds the package, catches it, and signs the alarm onto Arkiv. Machine B trusts that reporter by their ENS name. It picks up the alarm, re-checks the package itself, and only then calls it compromised. A fake alarm about a clean package just gets ignored.

**Captions:** "Machine A: caught — alarm signed onto Arkiv" · "Machine B: trusted alarm → re-checked locally → compromised" · "Both machines: throwaway environments on this laptop" (small, honest)
**Edit:** if step 1's scan is slow, cut to step 2.

### 6 · Why it's built this way — 2:20–2:45 · Clip E

> That's the whole design. Shankh runs on your machine. ENS holds what maintainers and reporters say about themselves; Arkiv carries the alarms. Every call goes straight to a public network — there's no Shankh server to hack, pressure, or switch off.

**Caption:** "No server in the middle. Nobody can take the alarm down — including us."

### 7 · The close — 2:45–3:00 · Clip F

> Today, Shankh catches it and warns everyone. Next, the stolen key switches itself off — the way a public leak already does in ten seconds. One catches it. Everyone is saved.

**Caption:** "Next: the stolen key switches itself off."
**End card (3 seconds):** the logo · **shankh-eth.vercel.app** · github.com/krishnan74/shankh · "Live on Sepolia and the Arkiv testnet".

---

## Honesty checks before you export

- Never say the key gets switched off today — beat 7 says it's next, and the watcher's own `kill:` line says so on screen. Leave that line visible.
- "Seconds later", not a fixed number: the catch took 2–4 seconds across real runs; the timestamps in clip A show whatever yours took.
- "An estimated 2,500 organizations" and "in one case … four and a half hours" — keep those qualifiers; they're how the sources put it.
- Every number has its source on screen.

## Tools

- **Recording:** Screen Studio (paid; automatic zoom-and-follow makes terminal demos look polished) or macOS's built-in Cmd+Shift+5.
- **Editing:** CapCut (free; automatic captions you can then correct) or iMovie. Quiet background music, well under the voice.
- **Upload** unlisted (YouTube or similar), check it plays in a logged-out browser, then send the link to add to README.md and the submission form.
