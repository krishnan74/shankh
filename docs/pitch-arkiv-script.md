# Arkiv pitch script

About three minutes, conversational. Pitches **Shankh as it will be in its final state**, with one live demo of what already works: one machine catches a bad package and posts the alarm to Arkiv, and a second machine that trusts that reporter picks it up, double-checks it, and flags it. Prize target: **Build on Arkiv** (each team can win only one Arkiv prize; see docs/decisions.md ADR 0001).

**Before you go on stage:** run `scripts/demo-arkiv.sh prepare`. It builds a fresh poisoned test package (inert, it does nothing) and installs it into two throwaway environments, "machine A" and "machine B". Nobody has reported that exact build yet, so the demo always starts clean. Then open a terminal at the repo root, with the landing page (https://shankh-eth.vercel.app) in a second window.

**Running it:** `scripts/demo-arkiv.sh run` pauses before step 2 (press Enter when you're ready). Each scan takes about 10–20 seconds on a slow network, so talk over it.

---

## 0. The hook

> "Last month a popular AI package, LiteLLM, was hacked. For two hours, everyone who installed it had their cloud keys copied. The first person to notice can't warn anyone fast enough. They open a GitHub issue, or post on X, and thousands of other machines keep running the bad version."

> "Shankh fixes the warning part. When one machine proves a package is bad, every other machine running it finds out in seconds, and acts. Arkiv is where that warning lives."

## 1. Why the alarm needs Arkiv

> "The warning can't live on the package's own site, because in the hack the attacker controlled the publisher's accounts. It can't live on our server either. Then we're one more company that can be hacked, taken down, or pressured to delete it."

> "So each machine signs its finding with its own wallet and writes it to Arkiv as a `shankh.report`: the package, the version, the exact build, and what was wrong. It's public, it can't be quietly edited, and nobody needs our permission to read it."

*(Optional, if the landing page is up: scroll to section 03's diagram, "How the three fit together", and point at the right-hand Arkiv box: "This is the part I'm about to run live.")*

## 2. Live: machine B checks, nothing yet

*(Run `scripts/demo-arkiv.sh run`. Step 1 prints.)*

> "This is machine B. It's running a package that, unknown to it, has been poisoned. It scans what's installed against the alarms from reporters it trusts, and right now nobody has reported this build."

*(Point at the line "N recent report(s) ... 0 about a build installed here".)*

> "Notice it read the reporter's recent alarms and compared them on this machine. It never asked Arkiv about the package it has. So the query gives away nothing about what you're running."

## 3. Live: machine A catches it and posts the alarm

*(Press Enter. Step 2 prints CRITICAL and an entity key.)*

> "Machine A has the same package. It rebuilds it from its public source and compares file by file. There's a file in there, `sitecustomize.py`, that's in nobody's source code. Python runs that file on every start, which is exactly how the real LiteLLM attack kept itself running. Critical. And that line is the alarm, written to Arkiv, signed by machine A's wallet."

## 4. Live: machine B acts on it

*(Step 3 prints COMPROMISED.)*

> "Machine B scans again. The alarm is there. It's from a reporter machine B trusts, and it names the exact build machine B has installed. But machine B doesn't just take its word for it. It re-checks on its own, gets the same answer, and only then says compromised."

> "In the final version, that's the moment its cloud keys get locked down. That part isn't built yet; what you just saw is the detection and the warning, live."

## 5. Why you can't fake an alarm

> "Two things stop someone from spamming fake alarms. First, trust is by name: you pick reporters like `shankh-team.reporters.shankh.eth`, and that ENS name says which wallet they sign with. Only they can change it. We filter on the wallet Arkiv itself records as the creator, not on anything the writer typed in. Second, every alarm gets re-checked locally. A fake alarm about a clean package just gets ignored."

## 6. Where it stands, and the ask

> "Live today: the verifier, alarms written to Arkiv, machines reading and acting on them, trust by ENS name, and a public page reading Arkiv live. A background watcher that rebuilds every new install as it lands. Not yet: the automatic key lockdown, and a second entity type, `shankh.request`, for asking the network to check a package you can't check yourself."

> "Two questions for you: what's the right way to say 'most recent' on Arkiv? We sort by expiry date today because created-at can't be sorted on. And how long should alarms live? We use 90 days."

## If something's off on stage

- **A scan hangs:** the Arkiv read gives up after 60 seconds with "could not read Arkiv". Say "the testnet is slow, here's the run from earlier" and show docs/evidence.md (entity `0xe7d2102e…`).
- **Step 1 already shows an alarm about this build:** `prepare` wasn't re-run. Run `scripts/demo-arkiv.sh prepare` again; every build is new.

## If they ask...

- **"Both machines are on your laptop?"** Yes, two separate throwaway environments. And both use the demo wallet, which is why machine B doesn't post a second report: a confirmation from the same wallet isn't an independent witness.
- **"Why not just a database?"** A database has an owner who can be hacked, pressured, or shut down, and every reader has to trust them. An Arkiv entity is signed by whoever found the problem, and anyone can read it.
- **"Why ENS too?"** Different jobs. Arkiv holds what anyone finds. ENS holds the maintainer's own bad-builds list and the names of reporters you trust. Both are needed so no single party can silence the alarm.
- **"What's in a report?"** Package, version, risk tier, malicious yes/no, which files were wrong, the build fingerprint, and whether the maintainer has flagged it. See `arkiv/schema.md`.
- **"Privacy?"** Reads are by reporter, never by package, and matched locally. Nobody learns what you have installed.
