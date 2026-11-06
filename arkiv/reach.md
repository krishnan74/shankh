# Arkiv reach — Shankh

**Who is it for, and would they use it?** Anyone running Python workloads that depend on third-party packages — the October 2026 LiteLLM compromise, which copied cloud keys from every machine that installed it during a two-hour window, is the motivating case (see `project-overview.md` §1-2). The first person to catch a bad release usually has no fast way to warn everyone else; a `shankh.report` on Arkiv is that warning, signed by whoever found it and readable by every other machine. Maintainers benefit too: they can flag a bad build of their own package on ENS, and every Shankh user sweeping `pypi.shankh.eth` picks it up.

**Can they try it today?** Yes, on testnets. Clone the repo, and `shankh verify` rebuilds a package and writes its result to Arkiv; `shankh scan --trust shankh-team.reporters.shankh.eth` reads that reporter's recent alarms and re-checks any that name a build installed locally. Both ran live (`scripts/demo-arkiv.sh`; entity `0xe7d2102e72c192949b5dcd99ccba16743796b6cf36413aa46a60d9c558687ec0`). The landing page (https://shankh-eth.vercel.app) reads the reports live. What's missing for real users: the background watcher that runs this on every install, the automatic key shut-off, and mainnet.

**Will you keep building it after Mumbai?** <the team's own answer — left blank on purpose; not for Claude to fill in>
