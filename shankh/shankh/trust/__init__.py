"""Whose Arkiv alarms this machine listens to.

Anyone can post a report to Arkiv, so Shankh never acts on a report just because it exists. You
choose reporters by ENS name (`<name>.reporters.shankh.eth`), in `~/.config/shankh/trust.toml`:

    reporters = ["shankh-team.reporters.shankh.eth"]

or with `shankh scan --trust <name>`. Each name resolves on ENS to the wallet that reporter signs
with (`shankh.signer`, writable only by them), and only reports that wallet actually signed count.
Even then, `shankh scan` re-checks the package on this machine before calling it compromised.
"""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path

from shankh import ens


@dataclass(frozen=True)
class TrustedReporter:
    name: str  # e.g. shankh-team.reporters.shankh.eth
    signer: str  # the wallet their reports are signed by, read from ENS


def config_path() -> Path:
    return Path(os.environ.get("SHANKH_TRUST_FILE", "~/.config/shankh/trust.toml")).expanduser()


def trusted_names(extra: list[str] | None = None) -> list[str]:
    """Reporter names from the trust file plus any given on the command line, deduplicated, in order."""
    names: list[str] = []
    path = config_path()
    if path.is_file():
        with path.open("rb") as f:
            names.extend(str(n) for n in tomllib.load(f).get("reporters", []))
    names.extend(extra or [])
    unique: list[str] = []
    for name in (n.strip().lower() for n in names):
        if name and name not in unique:
            unique.append(name)
    return unique


def resolve(names: list[str]) -> tuple[list[TrustedReporter], list[str]]:
    """Look each name's signer up on ENS. Returns (resolved, names that didn't resolve)."""
    resolved: list[TrustedReporter] = []
    missing: list[str] = []
    for name in names:
        signer = ens.signer_for(name)
        if signer:
            resolved.append(TrustedReporter(name, signer))
        else:
            missing.append(name)
    return resolved, missing
