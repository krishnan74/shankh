# Demo video script — Shankh

**Hard limit: 3:00** (Ethereum Foundation, Best CROPS App). The voiceover below is written to be spoken naturally, like explaining it to a friend — full sentences, no dramatic pauses. It's 460 words, about 2:50 at a natural talking pace — tight against 3:00. If a take runs long, drop in this order: beat 2's last sentence (xz, Shai-Hulud…), then beat 6's middle sentence. The Ethereum Foundation's stated limit is 3 minutes; going over risks the video being cut off or disqualified, so trim rather than overrun.

**How it's made:** not one take. Record six short clips (the shot list), record the voiceover separately from the script, then assemble them in an editor. A stalled testnet then costs you one clip, not the whole video. Cutting out *waiting* is fine (caption it "a few seconds later"); cutting out a *failure* is not.

**Judges often watch muted, at 2× speed.** Every beat has a burned-in caption that carries its point without sound. Each number on screen carries its source in small type underneath — a cited number is trusted, a bare one is questioned.

---

## Shot list — record these six clips

Six clips, recorded separately, then cut together to **exactly the "In the video" length** below (total 3:00). Raw lengths are from tonight's real runs — record a little extra at both ends of every clip so you have room to trim. Each clip is broken into shots: what's on screen, for how long, and what to do with it in the edit.

### Clip A — caught, and the stolen key switches itself off · in the video **0:00–0:20 (20 s)** · raw ~35–45 s

Before recording: `scripts/demo-watch.sh prepare` (this also switches the demo AWS key back on), then `clear`, then `scripts/demo-watch.sh run`. Wait for the `sweep:` line, the attacker's **ACCEPTED** line, and the prompt "Press Enter to install the poisoned package…". **Start recording here.**

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| A1 | 0:00–0:04 | The paused terminal: `shankhd watching ./victim …`, the `sweep:` line, and `attacker> aws sts get-caller-identity -> ACCEPTED arn:aws:iam::<account>:user/shankh-demo-victim` | Zoom on **ACCEPTED**. Caption: **"An attacker has this laptop's AWS key. It works."** |
| A2 | 0:04–0:06 | Press Enter. `(installed -- no other command typed)` | Caption: **"Someone installs a package. Nobody types anything else."** |
| A3 | 0:06–0:10 | `new install: shankh-demo==1.0.0 …`, then `COMPROMISED  shankh-demo==1.0.0  (rebuild) [critical] sitecustomize.py` | Keep the real gap (2–9 s across runs). Zoom on `COMPROMISED`. Caption: **"Caught in seconds."** |
| A4 | 0:10–0:15 | `posted to Arkiv: 0x…`, then `kill: key AKIA…XXXX switched off (Inactive); quarantined user shankh-demo-victim (AWSCompromisedKeyQuarantineV3)` | Cut the ~7 s Arkiv wait. Zoom on **switched off (Inactive)**. Caption: **"The stolen key switches itself off."** |
| A5 | 0:15–0:20 | `attacker> aws sts get-caller-identity -> REJECTED InvalidClientTokenId -- The security token included in the request is invalid.` | Zoom on **REJECTED**, hold 2 s. Caption: **"The attacker tries again. AWS says no."** |

After recording, the key is off. Run `scripts/demo-watch.sh restore` (or `prepare`) before any retake.

### Clip B — how big the problem is · in the video **0:20–1:00 (40 s)** · raw ~60 s

The landing page, light theme, browser zoom ~125%, scrolled to the very top. Scroll slowly with the trackpad, or press `j` to jump a section.

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| B1 | 0:20–0:23 | The hero: "Stolen keys that switch themselves off." | No caption; the headline says it — and you just saw it happen. |
| B2 | 0:23–0:33 | Press `j` → section 01, "October 2026: a popular AI package got hacked.", with the two-track timeline. Hold. | Over the timeline, captions one at a time (~3 s each): **"Leaked in public: switched off in ~10 seconds"** (source: Unit 42) · **"Stolen by malware: nothing."** |
| B3 | 0:33–0:45 | Still section 01, slowly scroll so the timeline's labels are readable (11:39 poisoned update goes live · 13:20 PyPI pulls it · ~4.5 h a stolen key is used) | Captions: **"LiteLLM, Oct 2026 · ~2,500 organizations exposed"** (source: CloudSEK estimate; Hudson Rock) · **"Stolen key used ~4.5 hours later"** (source: Wiz, one observed case) · **"xz 2024 · Shai-Hulud 2025 · LiteLLM twice in 2026"** |
| B4 | 0:45–1:00 | Scroll to the bottom of section 01 and hold on: "Keys that leak in public get shut off in seconds. Keys stolen by malware get nothing." | Hold still for the whole 15 s — this is the "real gap" voiceover. Caption: **"The attacker controls the publisher. So the alarm can't live there."** |

### Clip C — ENS: the maintainer flags the build · in the video **1:00–1:40 (40 s)** · raw ~60–90 s

Before recording: `scripts/demo-ens.sh prepare`, then `clear`. Record the terminal, then switch to the browser in the same recording (or record the browser as a second take).

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| C1 | 1:00–1:10 | Run `scripts/demo-ens.sh run --yes`. Step 1/3: `pypi.shankh.eth: 3 packages, … flagged build(s)` and `ens: no installed build has been flagged by its maintainer.` | The scan takes ~7–15 s: trim to the moment the result appears. Caption: **"Every package has an ENS name. Nothing flagged yet."** |
| C2 | 1:10–1:20 | Step 2/3: the maintainer flags the build — `flagged in Ns -- https://sepolia.etherscan.io/tx/0x…` | Cut the transaction wait ("a few seconds later"). Zoom on the Etherscan link and hold ~2 s. Caption: **"Flagged on ENS — a live Sepolia transaction"** |
| C3 | 1:20–1:30 | Step 3/3: `COMPROMISED  shankh-demo==1.0.0  flagged on shankh-demo.pypi.shankh.eth`, then `reported to Arkiv` | Zoom on the `COMPROMISED` line. Caption: **"Caught from the ENS flag alone"** |
| C4 | 1:30–1:40 | Browser: click **Registry** in the top bar, scroll to `shankh-demo.pypi.shankh.eth`; the build you just flagged is in its `shankh.revoked` list (the third fingerprint, unlabelled) | Highlight the new fingerprint. Caption: **"We can't take the name space back. The chain enforces it."** |

### Clip D — Arkiv: one machine warns another · in the video **1:40–2:20 (40 s)** · raw ~60–90 s

Before recording: `scripts/demo-arkiv.sh prepare`, then `clear`. Needs `MACHINE_B_ARKIV_PRIVATE_KEY` in `.env` (already set) so machine B signs with its own wallet.

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| D1 | 1:40–1:45 | Run `scripts/demo-arkiv.sh run --yes`. Step 1/3: machine B, `arkiv: N recent report(s) … 0 about a build installed here` | Optional — if it's slow, cut straight to D2. Caption: **"Machine B: no alarm about this build yet"** |
| D2 | 1:45–1:58 | Step 2/3: machine A, `shankh-demo==1.0.0: CRITICAL`, `[critical] sitecustomize.py`, `reported to Arkiv: 0x…` | Cut the write wait. Caption: **"Machine A: caught — alarm signed onto Arkiv"** |
| D3 | 1:58–2:12 | Step 3/3: machine B, `COMPROMISED  shankh-demo==1.0.0  alarm from shankh-team.reporters.shankh.eth, re-checked here` | Zoom on "re-checked here". Caption: **"Machine B: trusted alarm → re-checked locally → compromised"** |
| D4 | 2:12–2:20 | machine B's last two lines: `confirmation reported to Arkiv` and `kept the original alarm alive for another 90 days` | Zoom on "kept … alive". Captions: **"Alarms are read-only: nobody can edit them"** · small: **"Two throwaway environments on this laptop, each with its own wallet"** |

### Clip E — why it's built this way · in the video **2:20–2:45 (25 s)** · raw ~35 s

The landing page.

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| E1 | 2:20–2:25 | Section 02's "Alarms on Arkiv · live" list and the "Trusted reporters · on ENS, live" panel — every alarm "signed by shankh-team.reporters.shankh.eth" | Caption: **"Every alarm, signed by a reporter named on ENS — read live."** |
| E2 | 2:25–2:45 | Press `j` to section 03 and hold on "How the three fit together": your machine in the middle, ENS on the left, Arkiv on the right, and the Ethereum Foundation line along the bottom | Slow push-in on the diagram over 20 s. Caption: **"No server in the middle. Nobody can take the alarm down — including us."** |

### Clip F — the close · in the video **2:45–3:00 (15 s)** · raw ~20 s

| Shot | In the video | On screen | Edit |
|---|---|---|---|
| F1 | 2:45–2:55 | Section 05, "One catches it. Everyone is saved.", with the "Live today" and "Next" lists | Zoom on "Switches the stolen AWS key off in seconds" under Live today. Caption: **"Live: caught, warned, key switched off."** |
| F2 | 2:55–3:00 | End card on a plain background: the logo, **shankh-eth.vercel.app**, github.com/krishnan74/shankh, "Live on Sepolia and the Arkiv testnet" | Hold 5 s, still. |

**Recording setup:** 1920×1080; browser zoom ~125%; terminal font 18–20pt; Do Not Disturb on; bookmarks bar hidden; only the site's tab open. Before each terminal clip run `clear` and `PS1='$ '`. Run all three `prepare` steps right before recording — each builds a brand-new package nobody has flagged or reported yet.

---

## The script

### 1 · Cold open — 0:00–0:20 · Clip A

> Shankh is running on this laptop, and an attacker already has a copy of its AWS key, which still works. Now someone installs a Python package, and nobody types anything else. Within seconds Shankh has caught it, because the package hides a file that isn't in its source code anywhere, and it switches that AWS key off. When the attacker tries the key again, AWS rejects it.

**Caption:** "Caught in seconds. Nobody typed a command."
**Edit:** keep talking naturally — let a zoom on the `COMPROMISED … sitecustomize.py` line, then on `posted to Arkiv`, do the emphasis instead of a pause in your voice.

### 2 · How big the problem is — 0:20–0:45 · Clip B

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

> So today Shankh catches the attack, warns everyone running that package, and switches the stolen key off, the same way a publicly leaked key already gets switched off in ten seconds. Next, it'll find every key a package could reach on its own. And when one machine catches it, everyone is protected.

**Caption:** "Caught. Warned. Key switched off."
**End card (3 seconds):** the logo · **shankh-eth.vercel.app** · github.com/krishnan74/shankh · "Live on Sepolia and the Arkiv testnet".

---

## Honesty checks before you export

- The key shut-off is real, for keys registered with Shankh (`SHANKH_PROTECTED_KEYS`). Don't claim Shankh finds every key on its own yet — beat 7 says that's next. The account number is hidden on screen; keep it that way.
- "Seconds later", not a fixed number: the catch took 2–4 seconds across real runs; the timestamps in clip A show whatever yours took.
- "An estimated 2,500 organizations" and "in one case … four and a half hours" — keep those qualifiers; they're how the sources put it.
- Every number has its source on screen.

## Tools

- **Recording:** Screen Studio (paid; automatic zoom-and-follow makes terminal demos look polished) or macOS's built-in Cmd+Shift+5.
- **Editing:** CapCut (free; automatic captions you can then correct) or iMovie. Quiet background music, well under the voice.
- **Upload** unlisted (YouTube or similar), check it plays in a logged-out browser, then send the link to add to README.md and the submission form.
