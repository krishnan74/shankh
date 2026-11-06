# Demo video script — Shankh

**Hard limit: 3:00** (Ethereum Foundation, Best CROPS App). The voiceover below is written to be spoken naturally, like explaining it to a friend — full sentences, no dramatic pauses. It's 431 words, about 2:35 at a natural talking pace; the leftover ~25 seconds absorb transactions and the edit, not more words. If a take runs long, beat 2's last sentence (xz, Shai-Hulud…) is the safest to drop.

**How it's made:** not one take. Record six short clips (the shot list), record the voiceover separately from the script, then assemble them in an editor. A stalled testnet then costs you one clip, not the whole video. Cutting out *waiting* is fine (caption it "a few seconds later"); cutting out a *failure* is not.

**Judges often watch muted, at 2× speed.** Every beat has a burned-in caption that carries its point without sound. Each number on screen carries its source in small type underneath — a cited number is trusted, a bare one is questioned.

---

## Shot list — record these six clips

| Clip | What to record | How |
|---|---|---|
| **A** | The watcher catching a live install | `scripts/demo-watch.sh prepare`, then `scripts/demo-watch.sh run`. Start recording at the "Press Enter" pause, press Enter, stop after the `kill:` line. |
| **B** | The problem, on the landing page | https://shankh-eth.vercel.app, light theme. Start at the hero, press `j` once to section 01, hold on the timeline, then slowly scroll to the closing lines "Keys that leak in public get shut off in seconds. Keys stolen by malware get nothing." |
| **C** | ENS: the maintainer flags the build | `scripts/demo-ens.sh prepare`, then `scripts/demo-ens.sh run --yes` (whole run). Then, in the browser, click **Registry** in the top bar and scroll to `shankh-demo.pypi.shankh.eth`: the build you just flagged is in its `shankh.revoked` list. |
| **D** | Arkiv: one machine warns another | `scripts/demo-arkiv.sh prepare`, then `scripts/demo-arkiv.sh run --yes` (whole run, ending on machine B's `kept the original alarm alive` line). Needs `MACHINE_B_ARKIV_PRIVATE_KEY` in `.env` (already set) so machine B signs with its own wallet. |
| **E** | The design | Landing page: press `j` to section 03 and hold on "How the three fit together"; then section 02's "Trusted reporters · on ENS, live" panel. |
| **F** | The close | Landing page section 05, "One catches it. Everyone is saved." Then an end card (see below). |

**Recording setup:** 1920×1080; browser zoom ~125%; terminal font 18–20pt; Do Not Disturb on; bookmarks bar hidden; only the site's tab open. Before each terminal clip run `clear` and `PS1='$ '`. Run all three `prepare` steps right before recording — each builds a brand-new package nobody has flagged or reported yet.

---

## The script

### 1 · Cold open — 0:00–0:15 · Clip A

> Shankh is running on this laptop, and someone's about to install a Python package. Nobody types anything else, but within a few seconds Shankh has caught it, because the package hides a file that isn't in its source code anywhere. And the alarm's already gone out to every other machine.

**Caption:** "Caught in seconds. Nobody typed a command."
**Edit:** keep talking naturally — let a zoom on the `COMPROMISED … sitecustomize.py` line, then on `posted to Arkiv`, do the emphasis instead of a pause in your voice.

### 2 · How big the problem is — 0:15–0:45 · Clip B

> If your cloud key leaks on GitHub, AWS switches it off in about ten seconds. But if malware quietly steals that same key from your laptop, nothing happens at all. That's what happened with LiteLLM, a popular AI package, in October. A poisoned update was up for about two hours, and an estimated 2,500 organizations were exposed. In one case a stolen key was used four and a half hours later. And it keeps happening, with xz, the Shai-Hulud worm, and LiteLLM twice this year.

**Captions, one per sentence:**
- "Leaked in public: switched off in ~10 seconds" — *source: Unit 42*
- "Stolen by malware: nothing."
- "LiteLLM, Oct 2026 · ~2,500 organizations exposed" — *source: CloudSEK estimate; Hudson Rock*
- "Stolen key used ~4.5 hours later" — *source: Wiz (one observed case)*
- "xz (2024) · Shai-Hulud (2025) · LiteLLM ×2 (2026)"

### 3 · The real gap — 0:45–1:00 · Clip B, held on the closing lines

> You'd expect the warning to come from the publisher, but in these attacks the attacker controls the publisher's accounts. So Shankh puts the alarm somewhere they can't reach, on ENS and Arkiv.

**Caption:** "The attacker controls the publisher. So the alarm can't live there."

### 4 · ENS: the alarm nobody can silence — 1:00–1:40 · Clip C

> Every package gets its own ENS name under pypi.shankh.eth, and only its real maintainer can flag a bad build there. Right now nothing's flagged, so the scan comes back clean. I'll play the maintainer and flag this build with a real transaction on Sepolia. When the scan runs again, it catches the package from that flag alone, and the build shows up in the registry too. Someone with my stolen PyPI password couldn't have done that, and neither could we, because we gave up control of that name space and the chain enforces it.

**Captions:** "Flagged on ENS — a live Sepolia transaction" (over the Etherscan link; hold it a second) · "Caught from the ENS flag alone" · "We can't take the name space back. The chain enforces it."
**Edit:** cut the wait for the transaction to confirm; caption "a few seconds later".

### 5 · Arkiv: one catch protects everyone — 1:40–2:20 · Clip D

> And if the maintainer hasn't noticed yet, machines warn each other. Machine A catches the problem and signs an alarm onto Arkiv. Machine B trusts that reporter through their ENS name, so it picks up the alarm, checks the package for itself, and once it's confirmed, keeps the alarm alive with its own wallet. Nobody can edit an alarm once it's posted, not even whoever wrote it, so a stolen key can't quietly rewrite it. And a fake alarm about a clean package would just be ignored.

**Captions:** "Machine A: caught — alarm signed onto Arkiv" · "Machine B: trusted alarm → re-checked locally → compromised → kept alive" · "Alarms are read-only: nobody can edit them, the chain refuses" · "Two throwaway environments on this laptop, each with its own wallet" (small, honest)
**Edit:** if step 1's scan is slow, cut to step 2.

### 6 · Why it's built this way — 2:20–2:45 · Clip E

> So that's how it fits together. Shankh runs on your own machine, ENS holds what maintainers and reporters say about themselves, and Arkiv carries the alarms between machines. There's no Shankh server in the middle for anyone to hack, pressure, or shut down.

**Caption:** "No server in the middle. Nobody can take the alarm down — including us."

### 7 · The close — 2:45–3:00 · Clip F

> Today, Shankh catches the attack and warns everyone running that package. Next, we're making the stolen key switch itself off, the way a publicly leaked key already does in ten seconds. So when one machine catches it, everyone is protected.

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
