# ENS pitch script

About three minutes, conversational. It pitches **Shankh as it will be in its final state**, while following the landing page (https://status-page-plum-nine.vercel.app) top to bottom — each beat says where to scroll and what to point at. The page itself shows what's live today, so the pitch closes with one honest line saying which parts are running now and which are next. Keep that line: judges will open the page, and it's better they hear it from you.

**Driving the page:** press `j` to jump to the next section and `k` to go back. On a wide screen (1280px+), the small numbers on the left show where you are.

**Before you go on stage:** run `scripts/demo-ens.sh prepare` once. It builds a fresh, unflagged poisoned test package (inert — it does nothing) into a throwaway environment, so the live flag in section 04 always works. Run it again before every demo; each build is new, so you never need to un-flag anything. Keep a terminal open at the repo root next to the browser.

---

## 0. Open on the top of the page

*(Page loaded, top of the screen: "Stolen keys that switch themselves off.")*

> "This is Shankh. The short version is on the screen: stolen keys that switch themselves off. Let me show you why that matters, starting with something that actually happened."

*(Press `j`.)*

## 1. What happened — section 01

*(On screen: "October 2026: a popular AI package got hacked.")*

> "In October, a popular AI package called LiteLLM got hacked. For two hours, anyone who installed it had their cloud keys silently copied."

*(Point at the timeline — the red dot on the top track.)*

> "This is the real timeline. Published at 11:39, PyPI pulled it at 13:20 — but hours later, those stolen keys were being used, and nothing stopped them."

*(Point at the quote with the red line beside it.)*

> "Here's the gap. If you leak an AWS key on GitHub, Amazon shuts it off in seconds. If malware steals it from your laptop, nothing happens. Nobody's watching that case."

*(Press `j`.)*

## 2. What Shankh does — section 02

*(On screen: "Check it. Raise the alarm. Shut the keys off." and three numbered cards.)*

> "**Shankh watches it.**
>
> It runs quietly on your machine. Every time a new package or Docker image lands, Shankh rebuilds it from its public source and checks every file. When something doesn't belong — like the hidden startup file LiteLLM used — it acts within seconds. The AWS keys that package could reach are switched off. The malicious files are deleted. You get a report of exactly what happened and what that key touched. And because keys are switched off, never deleted, a false alarm is one click to undo."

*(Point at "Steps 1 and 2, for real" — the dark terminal and the list beside it.)*

> "Here's the check catching a test package we built to behave like the attack. It finds `sitecustomize.py` — a file Python runs on every start, and it isn't in the public source. Same trick as LiteLLM. And the alarm lands on Arkiv — that list on the right is read live."

*(Press `j`.)*

## 3. Three partners — section 03

*(On screen: "Three partners, three jobs." and three cards side by side.)*

> "Shankh doesn't warn just you — it warns everyone, and it does that on three partners, each with one job.
>
> **Arkiv** carries the evidence: your machine posts signed proof, so every other Shankh user running that version can re-check it and protect themselves — often before they've noticed anything. **Open Ethereum networks** mean there's no Shankh server in the middle — nothing for anyone to hack or shut down. And **ENS** holds the switch — that's the one I want to show you properly."

*(Point at the ENS card's chip, *Name space locked · read just now*, then press `j`.)*

## 4. Why the alarm can't be silenced — section 04

*(On screen: "The alarm lives on ENS, where the attacker — and even we — can't touch it.")*

> "Every package has an ENS name, like `litellm.pypi.shankh.eth`. And the package's real maintainer has their own kill switch there."

*(Point at "The name chain".)*

> "When the maintainer flags a release, every machine running it switches off its keys — no rebuild needed. That matters, because the people who hack a package usually steal the maintainer's PyPI password. But this switch is tied to the maintainer's *wallet*, not their login. The attacker never had it."

*(Point at each card in turn.)*

> "Three things make that trustworthy. **We locked the name space** — we gave up our own power to take over or redirect any package's name, permanently. **Two keys, two locks** — the maintainer can only set where the code lives, and their kill-switch contract can only set the list of bad builds; neither can touch the other's. **Flag fast, unflag slow** — flagging is instant; undoing it waits 48 hours, so a stolen wallet can't quietly undo it."

*(Point at "We tried to break it — using our own deploy key.")*

> "And you don't have to take our word for it. Every time this page loads, it attacks the setup with our own deploy key, on the live Sepolia network. *Blocked by Sepolia* — both times."

*(Optional, if they lean in: click "Show the raw error" to show the exact error the chain returned.)*

### Live: the maintainer flags a build

*(Switch to the terminal. Run `scripts/demo-ens.sh run`.)*

> "Now let me show you the whole thing working. This machine has a poisoned build of `shankh-demo` installed — a harmless test package with the same hidden startup file LiteLLM used."

*(Step 1/3 prints: `pypi.shankh.eth: 3 packages` … `no installed build has been flagged`.)*

> "Shankh checks every package registered under `pypi.shankh.eth` — all of them at once, compared on this machine, so nobody learns what I have installed. Right now, nothing's flagged."

*(Press Enter. Step 2/3 sends the flag and prints how long it took, plus an Etherscan link.)*

> "I'm the maintainer now. I flag this exact build from my wallet — that's a real transaction on Sepolia, and it's confirmed."

*(Step 3/3 prints `COMPROMISED  shankh-demo==1.0.0  flagged on shankh-demo.pypi.shankh.eth` and the Arkiv entity.)*

> "And there it is: compromised — caught from the maintainer's ENS flag alone, no rebuild needed. The alarm's on Arkiv for every other machine."

*(Back to the browser, refresh, scroll to "Every package in the registry, checked live" — the new build is listed under `shankh-demo`.)*

*(Press `j`.)*

## 5. Where it stands — section 05

*(On screen, the dark panel: "One catches it. Everyone is saved.")*

> "That's Shankh. **One catches it. Everyone is saved.**"

*(Point at the two lists.)*

> "What you're seeing live today: the rebuild check, the Arkiv evidence, and the ENS switch — with the chain proving it can't be tampered with. Switching the keys off automatically and the always-on watcher are what we're building next."

## 6. The ask

> "One thing we'd really value your take on: how should a maintainer prove they own a PyPI package before we hand them their ENS name?"

---

## If something's off on stage

- **The "Live right now" strip says "Arkiv unreachable"**, or the key card says *Couldn't reach Arkiv just now*: the Arkiv testnet is having a slow moment. Reload once. If it's still down, say so plainly — "the testnet's having a moment; the page tells you instead of faking it" — and carry on. ENS and Sepolia parts are separate and still live.
- **An attack shows "Couldn't check just now"** instead of *Blocked by Sepolia*: same thing, Sepolia was slow. Reload.
- **`demo-ens.sh run` says the build is already flagged:** you ran it without a fresh build. Run `scripts/demo-ens.sh prepare` (about a minute), then `run` again.
- **The flag transaction is slow:** Sepolia usually confirms in under 30 seconds. Keep talking — "this is a real transaction on a public network" — it'll land.

---

## If they ask...

**"Arkiv already has the alarm — why put it on ENS too?"**
> "They answer different questions. Arkiv is the witnesses; ENS is the manufacturer's recall notice. Anyone can post a report to Arkiv, so Shankh only listens to reporters you trust, and still re-checks the package itself before acting. Only the real maintainer can write the ENS flag, so machines can act on it immediately. It also catches what a rebuild can't: if attackers poison the public source code itself, the rebuild matches and looks clean — only the maintainer knows that release is bad. And Arkiv reports expire after a while; the ENS flag is the permanent, official record you look up by the package's name."

**"Couldn't you just use a normal smart contract for the list?"**
> "For the list itself, yes. What ENS gives us is the name around it. You find any package's switch by its name, and because we locked the name space, we can't secretly point a package at a fake switch. If we ran a normal lookup contract, we'd be the weak point."

**"How is this different from Batas?"** (2nd place at ETHOnline — an ENS kill switch for trading agents)
> "Batas is a leash — whoever grants the name keeps the power to pull it. Ours points the other way: we, the operators, gave up our power, because in a supply-chain attack you can't fully trust whoever runs the infrastructure either."

**"Why is it checked off-chain, not inside a contract?"**
> "Because the thing we're protecting is off-chain — an AWS key on someone's laptop. The chain is the record nobody can fake. Each machine reads it directly, with no server of ours in between."

**"Who decides who gets a package name?"**
> "Right now, we do — we kept the right to add new names so we can onboard packages. Once a name is assigned, nobody can take it over. But proving the right person gets it is the open question — that's why we asked you."

**"What if the maintainer's wallet is stolen?"**
> "The thief can't quickly un-flag a bad build — that waits 48 hours. They could flag a good build and cause a false alarm, but Shankh only switches keys off, never deletes them, so that's reversible."

**"Isn't the maintainer the same address as your deploy key?"**
> "In this demo, yes — we're playing both roles because we don't have a real maintainer on testnet. In real use they're different people, and that's the point: our deploy key is exactly what 'we tried to break it' proves can't touch the bad-builds list."

**"Is it live? Audited?"**
> "Live on Sepolia testnet — everything on this page is real. Only one package is wired up so far. The contract hasn't had a line-by-line review yet, so it's not audited."
