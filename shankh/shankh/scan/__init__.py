"""`shankh scan`: check everything installed against every maintainer's ENS kill switch at once.

Pulls the bad-builds list of every package under pypi.shankh.eth (ens.sweep), fingerprints every
installed package (inventory.build_fingerprint), and compares the two on this machine. No rebuild
and no per-package lookups -- the full list is fetched and matched locally, so nobody watching the
RPC traffic learns which packages are installed here.
"""
from __future__ import annotations

from dataclasses import dataclass

from shankh import ens
from shankh.inventory import InstalledPackage, build_fingerprint, installed_packages


@dataclass(frozen=True)
class ScanHit:
    package: str
    version: str
    fingerprint: str
    ens_name: str


@dataclass(frozen=True)
class ScanResult:
    registry_packages: tuple[str, ...]  # every package under pypi.shankh.eth that currently resolves
    flagged_builds: int  # total fingerprints flagged across the whole registry
    installed_count: int
    covered: tuple[str, ...]  # installed packages that have an ENS kill switch
    hits: tuple[ScanHit, ...]  # installed builds a maintainer has flagged


def match(installed: list[InstalledPackage], swept: dict[str, set[str]]) -> ScanResult:
    """Pure comparison step, separated from the network reads so it can be tested directly."""
    covered: list[str] = []
    hits: list[ScanHit] = []
    for package in installed:
        label = ens.label_for(package.name)
        if label not in swept:
            continue
        covered.append(package.name)
        fingerprint = build_fingerprint(package)
        if fingerprint in swept[label]:
            hits.append(ScanHit(package.name, package.version, fingerprint, f"{label}.{ens.PARENT}"))
    return ScanResult(
        registry_packages=tuple(swept),
        flagged_builds=sum(len(v) for v in swept.values()),
        installed_count=len(installed),
        covered=tuple(covered),
        hits=tuple(hits),
    )


def scan(site_packages: list[str] | None = None) -> ScanResult:
    """Sweep the registry and check every installed package. Raises ens.EnsCheckError if the chain can't be read."""
    return match(installed_packages(site_packages), ens.sweep())
