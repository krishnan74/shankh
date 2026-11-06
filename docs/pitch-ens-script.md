# ENS pitch script

About three minutes, conversational. It follows the landing page (https://status-page-plum-nine.vercel.app) top to bottom — each beat says where to scroll and what to point at, using the words on screen. Everything claimed here is live today; what isn't is said out loud.

**Driving the page:** press `j` to jump to the next section and `k` to go back. On a wide screen (1280px+), the small numbers on the left show where you are.

---

## 0. Open on the top of the page

*(Page loaded, top of the screen: "Stolen keys that switch themselves off.")*

> "This is Shankh. The short version is on the screen: stolen keys that switch themselves off. Let me show you why that matters, starting with something that actually happened."

*(Press `j`.)*

## 1. What happened — section 01

*(On screen: "October 2026: a popular AI package got hacked.")*

> "In October, LiteLLM — a Python package used in a lot of AI apps — got hacked. Someone published a poisoned update. For about two hours, anyone who installed it had their cloud keys quietly copied."

*(Point at the timeline — the red dot on the top track.)*

> "This is the real timeline. Published at 11:39, PyPI pulled it at 13:20 — but about four and a half hours in, one of those stolen keys was being used. Nothing stopped it."

*(Point at the quote with the red line beside it.)*

> "And here's the strange part. If you leak an AWS key in public — say, on GitHub — Amazon shuts it off in seconds. If malware steals it off your laptop? Nothing. Nobody's watching that case."

*(Press `j`.)*

## 2. What Shankh does — section 02

*(On screen: "Check it. Raise the alarm. Shut the keys off." and three numbered cards.)*

> "So Shankh does three things. One — it checks: it rebuilds the package from its public source and spots files that shouldn't be there. Two — it raises the alarm: a signed alert other machines can read. Three — it shuts the keys off.
>
> See the little tags? The first two say *Live*. The third says *Next* — that's what we're building now."

*(Point at "Steps 1 and 2, for real" — the dark terminal and the list beside it.)*

> "This is a real run against a test package we built to act like the attack. It catches `sitecustomize.py` — a file Python runs every time it starts, and it isn't in the public source. Same trick LiteLLM used. And the alarm lands on Arkiv — this list on the right is read live."

*(Press `j`.)*

## 3. Three partners — section 03

*(On screen: "Three partners, three jobs." and three cards side by side.)*

> "Shankh leans on three partners, each doing one job. Arkiv carries the evidence between machines. Open Ethereum networks mean there's no Shankh server in the middle. And ENS — the one I want to show you properly — holds the switch."

*(Point at the ENS card's chip, *Name space locked · read just now*, then press `j`.)*

## 4. Why the alarm can't be silenced — section 04

*(On screen: "The alarm lives on ENS, where the attacker — and even we — can't touch it.")*

> "Now the tricky part. Attackers usually take over a package by stealing the maintainer's PyPI or GitHub login. So any alarm tied to those accounts, they can just delete.
>
> We needed somewhere the attacker can't reach — and honestly, somewhere we can't mess with either. That's ENS."

*(Point at "The name chain".)*

> "Every package gets a name — like `shankh-demo.pypi.shankh.eth`. We set it up three ways."

*(Point at each card in turn.)*

> "**We locked the name space.** We created `pypi.shankh.eth`, then gave up our own power to change it — permanently. That badge, *Locked · checked just now*, is read from the chain on this page load.
>
> **Two keys, two locks.** ENSv2 lets you give someone permission to write just one record. So the maintainer can only set where the code lives, and our kill-switch contract can only set the list of bad builds. Neither can touch the other's.
>
> **Flag fast, unflag slow.** The real maintainer flags a bad build instantly. Unflagging waits 48 hours, so someone with a stolen wallet can't quietly undo it."

*(Point at "We tried to break it — using our own deploy key.")*

> "And we don't just claim this. Every time this page loads, it tries both attacks against the live Sepolia network, using our own deploy key. *Blocked by Sepolia* — both times. That's the chain's answer, right now."

*(Optional, if they lean in: click "Show the raw error" to show the exact error the chain returned.)*

*(Press `j`.)*

## 5. Where it stands — section 05

*(On screen, the dark panel: "One catches it. Everyone is saved.")*

> "So that's the idea: one person catches it, everyone is saved. What you just saw is real."

*(Point at the two lists.)*

> "Live today: catching the package, posting the alarm, the maintainer's kill switch on ENS, and a name space we provably can't take back. Next: switching the AWS keys off automatically, and a watcher so nobody has to type a command."

## 6. The ask

> "One thing we'd really value your take on: how should a maintainer prove they own a PyPI package before we hand them their ENS name?"

---

## If something's off on stage

- **The "Live right now" strip says "Arkiv unreachable"**, or the key card says *Couldn't reach Arkiv just now*: the Arkiv testnet is having a slow moment. Reload once. If it's still down, say so plainly — "the testnet's having a moment; the page tells you instead of faking it" — and carry on. ENS and Sepolia parts are separate and still live.
- **An attack shows "Couldn't check just now"** instead of *Blocked by Sepolia*: same thing, Sepolia was slow. Reload.

---

## If they ask...

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
