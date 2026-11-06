# Decisions

ADRs for real forks in the road. See also plan-2.md's "Decisions taken" section for the pre-scaffold product decisions (remediation-first, partner picks, tiered kill triggers, deactivate-never-delete, emancipated registry, time-window sync, no biology metaphors) — those aren't repeated here as ADRs since they predate this repo.

## ADR 0001 — Arkiv track: Build on Arkiv, not Mirror
**Date:** 2026-11-05
**Context:** ETHGlobal Mumbai rules state each team can win only one Arkiv track prize. Shankh's design touches both "Mirror something Ethereum depends on" (the `osv.mal` OSV malicious-packages mirror) and "Build on Arkiv" (`shankh.report` / `shankh.request`, which are the product's actual evidence mechanism).
**Decision:** Submit for Build on Arkiv. Build the OSV mirror too if time allows, as a supporting feature, but it is not the submitted prize target and doesn't need its own `/arkiv/data-quality.md` etc.
**Rejected:** Mirror track as the primary target — it would require treating the OSV import as the headline Arkiv feature, which undersells the report/request mechanism that's actually central to the demo.
**Consequences:** Required deliverables are `/arkiv/schema.md`, `/arkiv/friction.md`, `/arkiv/reach.md`, `/arkiv/why-arkiv.md`, `/arkiv/how-you-use-arkiv.md` (see docs/plan.md track checklist). If the mirror is cut for time, nothing about the Arkiv submission needs to change.

## ADR 0002 — Monorepo layout: four stacks, one repo
**Date:** 2026-11-05
**Context:** The product spans a Python watcher/CLI (`shankhd`/`shankh`), Solidity contracts, a Next.js status page, and TypeScript Arkiv scripts. A hackathon judge needs to clone one repo and find everything.
**Decision:** Single repo, top-level dirs per stack: `shankh/` (Python package, both daemon and CLI), `contracts/` (Foundry), `status-page/` (Next.js, deployed to Vercel), `arkiv/` (TS, Node's built-in test runner), `scripts/` (bash, one command per cross-cutting operation), `docs/`.
**Rejected:** Separate repos per component — adds coordination overhead with no benefit for a team this size on this timeline.
**Consequences:** No shared type definitions between the Python and TS sides; any schema shared between `shankh.report`'s writer (TS) and reader (Python, for local re-verification) has to be kept in sync by hand — worth a shared JSON Schema file if time allows, otherwise a known source of drift to watch.

## ADR 0003 — `KillSwitch` is deployed one per package, and actually writes to its resolver
**Date:** 2026-11-06
**Context:** The first `KillSwitch.sol` (deployed to Sepolia, see docs/evidence.md) was a single global contract with an internal `revoked[bytes32]` mapping and no awareness of ENS at all — it couldn't fulfill its own documented job, "holds the resolver role for `shankh.revoked`" (plan-2.md), because it never called any resolver. This was discovered while building the real ENS tree, not before, because `revoke()` had never actually been exercised against a real package.
**Decision:** `KillSwitch` now takes its package's resolver address and DNS-encoded name at construction (immutable), and `revoke()`/`unrevoke()` sync the resolver's `shankh.revoked` text record for real — one instance per package, matching plan-2.md's original design exactly, rather than one generic global instance.
**Rejected:** Keeping one global `KillSwitch` and adding a separate `resolver`/`dnsName` argument to each call instead of per-instance state — rejected because it would let one call target an arbitrary resolver, defeating the point of a role grant scoped to one specific key on one specific resolver (the whole security property the per-key `grantSetterRoles` scoping depends on).
**Consequences:** The original deployed instance (`0x378fDf7BbdCB33D3504e96083a7DC7Fb882a0A2C`) is superseded — it never had `revoke()` called on it, so nothing is lost. A fresh instance gets deployed per package as part of the real ENS tree build (rehearsed on a fork first — see docs/plan.md, docs/feedback/ens.md item 2–3).

## ADR 0004 — Alarms are created read-only and extendable by anyone
**Date:** 2026-11-07
**Context:** A `shankh.report` was owned and freely editable by the wallet that wrote it. If a reporter's key is stolen, the thief could quietly flip an alarm to "clean" or point it at a different build — and every machine trusting that reporter would act on the edited version. Separately, every alarm expired after 90 days whether or not the bad build was still installed in the wild. The Arkiv SDK (1.0.1) offers two creation flags, fixed for an entity's whole life: `readonly` and `permissionlessExtension`; the Arkiv litepaper v2 describes the pattern as reference material "immutable and extendable by anyone, so readers who value it keep it alive".
**Decision:** Every new alarm is created with both flags. A machine that confirms someone else's alarm posts its own confirmation and extends the original (`arkiv/src/report.ts` `ALARM_FLAGS`, `extendReport`; `shankh scan --trust` and `shankhd` call it).
**Rejected:** Keeping alarms mutable so a reporter could correct a mistake — a correction is better made as a new, separate signed report than as a silent edit. Claiming alarms are permanent — `readonly` does not prevent the owner from deleting or transferring the entity, and the chain's own error message says so; an append-only flag would close that, and it's in our Arkiv feedback (item 8).
**Consequences:** Proven live: an edit attempt by an alarm's own owner was refused, and a second wallet extended it (docs/evidence.md). Reports written before 2026-11-07 keep neither flag. Demo machine B got its own wallet so its confirmation and extension come from an independent signer.
