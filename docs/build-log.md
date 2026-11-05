# Build log

Dated, terse. What was attempted, what happened, what it cost.

## 2026-11-05
- Ingested plan-2.md and project-overview.md into docs/plan.md; pasted in the real ENS/EF/Arkiv prize requirements and reconciled them against the existing design (Arkiv track pick, EF CROPS deliverables) → docs/plan.md now has the current status table and track checklist. (~1h)
- Scaffolded the repo: git init, Foundry (`contracts/`), Next.js status page (`status-page/`), Python package `shankh` with Typer CLI stub (`shankh/`), TS Arkiv package with `@arkiv-network/sdk@1.0.1` confirmed installable (`arkiv/`). All four have a passing empty-project test harness. Wrote `KillSwitch.sol` with revoke/timelocked-unrevoke and 3 passing Foundry tests. Installed Foundry and the Vercel CLI via Homebrew (npm global install hit an EACCES permission error, Homebrew worked around it). (~1.5h)
- Blocked: Vercel CLI needs an interactive login (`vercel login`) that only the user can complete; Sepolia contract deployment needs a funded deployer wallet the user hasn't provided yet. Neither block the rest of the scaffold. See docs/plan.md Open.
- Corrected a misread: "Saturday 22:00" is kickoff, not the submission deadline. Updated docs/plan.md's Time-box section accordingly; actual deadline still open. Re-confirmed with the user that no commit happens before kickoff (today, 2026-11-05, 22:00) regardless of readiness, per plan-2.md's Classic-track rule.
- Drafted a 7-commit split for the scaffold (chore baseline → shankh → contracts → status-page → arkiv code → scripts → one combined docs commit) and got it confirmed; recorded in docs/plan.md's new "Scaffold status" section. Nothing committed — `git log` is still empty, everything staged. (~0.3h)

## 2026-11-06
- Confirmed kickoff had passed (01:25 IST). Checked ethglobal.com/rules directly: confirmed the real rule is "repositories with single commits of large files without proper history will be default assumed to be unqualified" — no specific max commit size, just no undocumented single-dump history. Created the public GitHub repo (`krishnan74/shankh`) and pushed all 7 commits from the agreed split. (~0.3h)

