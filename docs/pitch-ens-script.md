# ENS pitch script

About three minutes, conversational. It follows the landing page top to bottom, so scroll as you talk. Everything claimed here is live today; the parts that aren't are said out loud.

## 1. What happened (scroll to "01 · What happened")

> "Let me start with something that actually happened.
>
> In October, LiteLLM — a Python package used in a lot of AI apps — got hacked. Someone published a poisoned update. For about two hours, anyone who installed it had their cloud keys quietly copied. About four and a half hours later, one of those stolen keys was being used.
>
> And here's the strange part. If you accidentally leak an AWS key on GitHub, Amazon shuts it off in about ten seconds. But if malware steals it from your laptop? Nothing happens. Nobody's watching that case."

## 2. What Shankh does (scroll to "02 · What Shankh does")

> "So that's what we built Shankh for. It does three things.
>
> One — it checks. It rebuilds the package from its public source code and looks for files that shouldn't be there. That's how it would have caught LiteLLM: the attackers added a file that runs every time Python starts, and it wasn't in the source.
>
> Two — it raises the alarm. It posts a signed alert that every other machine can read.
>
> Three — it shuts the keys off. That last part is what we're building next. The first two are running today."
>
> *(point at the terminal)* "This is a real run against a test package we built to behave like the attack. It catches the file, and the alert lands on Arkiv — you can see it here, live."

## 3. Why ENS (scroll to "03 · Why the alarm can't be silenced")

> "Now, the tricky part. When attackers take over a package, they usually do it by stealing the maintainer's PyPI or GitHub login. So any alarm tied to those accounts, they can just delete.
>
> We needed a place for the alarm that the attacker can't reach — and honestly, that we can't mess with either. That's ENS.
>
> Every package gets a name, like `shankh-demo.pypi.shankh.eth`. We set it up in three ways:
>
> First, **we locked it.** We built `pypi.shankh.eth` and then gave up our own power to change it or take names back. Permanently. That little 'locked' badge is checked live, right now.
>
> Second, **two keys, two locks.** ENSv2 lets you give someone permission to write just one record. So the maintainer can only set where the code lives. Our kill-switch contract can only set the list of bad builds. Neither one can touch the other.
>
> Third, **flag fast, unflag slow.** The real maintainer can flag a bad build instantly, from their own wallet. Unflagging waits 48 hours, so if someone steals that wallet, they can't quietly undo it.
>
> *(point at 'We tried to break it')* And we don't just say this. Every time this page loads, we try to break it using our own deploy key — and the chain says no. Both times. Live."

## 4. Where it stands (scroll to "04 · Where it stands")

> "So — what's real today: catching the package, posting the alarm, the maintainer's switch on ENS, and a name space we provably can't take back.
>
> What's next: actually switching the AWS key off, and a watcher that runs this automatically.
>
> One catches it, everyone is saved — that's the idea."

## 5. The ask

> "We'd love your take on one thing: how should a maintainer prove they own a PyPI package before we hand them their ENS name?"

---

## If they ask...

**"Couldn't you just use a normal smart contract for the list?"**
> "For the list itself, yes. What ENS gives us is the name around it. You find any package's switch by its name, and because we locked the name space, we can't secretly point a package at a fake switch. If we ran a normal lookup contract, we'd be the weak point."

**"How is this different from Batas?" (2nd place at ETHOnline, an ENS kill switch for trading agents)**
> "Batas is a leash — the person who grants the name keeps the power to pull it. Ours points the other way: we, the operators, gave up our power, because in a supply-chain attack you can't fully trust whoever runs the infrastructure either."

**"Why is it checked off-chain, not inside a contract?"**
> "Because the thing we're protecting is off-chain — an AWS key on someone's laptop. The chain is the record nobody can fake. Each machine reads it directly, with no server of ours in between."

**"Who decides who gets a package name?"**
> "Right now, we do — we kept the right to add new names so we can onboard packages. Once a name is assigned, nobody can take it over. But proving the right person gets it is the open question — that's why we asked you."

**"What if the maintainer's wallet is stolen?"**
> "The thief can't quickly un-flag a bad build — that waits 48 hours. They could flag a good build and cause a false alarm, but Shankh only switches keys off, never deletes them, so that's reversible."

**"Isn't the maintainer the same address as your deploy key?"**
> "In this demo, yes — we're playing both roles because we don't have a real maintainer on testnet. In real use they're different people, and that's the whole point: our deploy key is exactly what the 'we tried to break it' section proves can't touch the bad-builds list."

**"Is it live? Audited?"**
> "Live on Sepolia testnet — everything on this page is real. Only one package is wired up so far. The contract hasn't had a line-by-line review yet, so it's not audited."
