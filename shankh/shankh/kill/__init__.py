"""What happens once a build on this machine is confirmed compromised.

The plan (plan-2.md "Kill and clean"): quarantine then deactivate the AWS keys the build could
reach, delete its rogue files, block its exfiltration domains, write an incident report. None of
that is built yet -- it needs the AWS sandbox account (docs/plan.md, spike 4). `respond()` is the
one place the watcher calls, so wiring the AWS kill in later changes nothing else; until then it
says plainly that nothing was switched off, rather than pretending.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Compromise:
    package: str
    version: str
    fingerprint: str
    source: str  # "rebuild" | "ens" | "arkiv"
    detail: str


@dataclass(frozen=True)
class KillOutcome:
    acted: bool
    summary: str


def respond(compromise: Compromise) -> KillOutcome:
    return KillOutcome(
        acted=False,
        summary="key shut-off not built yet -- no credentials were changed. Rotate any keys this machine can reach by hand.",
    )
