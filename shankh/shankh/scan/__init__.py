"""`shankh scan`: check everything installed against every maintainer's ENS kill switch, and against
recent alarms from reporters you trust on Arkiv.

ENS: pulls the bad-builds list of every package under pypi.shankh.eth (ens.sweep), fingerprints
every installed package (inventory.build_fingerprint), and compares locally. A maintainer's flag
is authoritative on its own -- no rebuild needed.

Arkiv: reads the most recent reports signed by each trusted reporter's wallet (never searching by
package), keeps those about a build installed here, and RE-CHECKS each one locally before calling
it compromised. A report is a witness, not a verdict: one that doesn't hold up on this machine is
ignored, and one that can't be re-checked is a warning, never an action.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from shankh import ens
from shankh.inventory import InstalledPackage, build_fingerprint, installed_packages
from shankh.trust import TrustedReporter
from shankh.verify import VerifyResult


@dataclass(frozen=True)
class ScanHit:
    package: str
    version: str
    fingerprint: str
    ens_name: str


@dataclass(frozen=True)
class ArkivAlarm:
    """One trusted reporter's alarm about a build installed here, and what re-checking it found."""

    package: str
    version: str
    reporter: str  # the reporter's ENS name
    report_key: str  # the Arkiv entity
    outcome: str  # "confirmed" | "not-confirmed" | "could-not-recheck"
    detail: str
    recheck: VerifyResult | None = None


@dataclass(frozen=True)
class ScanResult:
    registry_packages: tuple[str, ...]  # every package under pypi.shankh.eth that currently resolves
    flagged_builds: int  # total fingerprints flagged across the whole registry
    installed_count: int
    covered: tuple[str, ...]  # installed packages that have an ENS kill switch
    hits: tuple[ScanHit, ...]  # installed builds a maintainer has flagged on ENS
    arkiv_reports_read: int = 0  # recent reports from trusted reporters
    arkiv_alarms: tuple[ArkivAlarm, ...] = ()  # those about a build installed here, re-checked

    @property
    def compromised(self) -> bool:
        return bool(self.hits) or any(a.outcome == "confirmed" for a in self.arkiv_alarms)


def match(installed: list[InstalledPackage], swept: dict[str, set[str]]) -> ScanResult:
    """ENS comparison, separated from the network reads so it can be tested directly."""
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


def check_alarms(
    installed: list[InstalledPackage],
    reports: list[dict],
    reporters: list[TrustedReporter],
    recheck: Callable[[str, str], VerifyResult],
) -> list[ArkivAlarm]:
    """Keep trusted reporters' alarms about builds installed here, and re-check each one locally.

    A report counts only if (1) the wallet that signed it belongs to a trusted reporter -- the
    Arkiv-recorded creator, never the self-declared `reporter` attribute; (2) it says malicious;
    (3) it's about a package and version installed here; and (4) if it names a build fingerprint,
    that's the build installed here. Each package@version is re-checked once, for its newest alarm.
    """
    by_signer = {r.signer.lower(): r for r in reporters}
    installed_by_key = {(ens.label_for(p.name), p.version): p for p in installed}
    alarms: list[ArkivAlarm] = []
    rechecked: set[tuple[str, str]] = set()
    for report in reports:
        reporter = by_signer.get(str(report.get("creator", "")).lower())
        if reporter is None or not report.get("malicious"):
            continue
        key = (ens.label_for(str(report.get("package", ""))), str(report.get("version", "")))
        package = installed_by_key.get(key)
        if package is None or key in rechecked:
            continue
        named_build = str(report.get("artifactSha256") or "").lower()
        if named_build and named_build != build_fingerprint(package):
            continue  # an alarm about a different build of this version -- not what's installed here
        rechecked.add(key)
        try:
            result = recheck(package.name, package.version)
        # Any failure (no published source, network down, a bad archive...) is a warning, never an action.
        except Exception as exc:  # noqa: BLE001
            alarms.append(
                ArkivAlarm(package.name, package.version, reporter.name, str(report.get("key", "")), "could-not-recheck", str(exc))
            )
            continue
        if result.is_malicious:
            why = ", ".join(f"[{f.tier.value}] {f.relative_path}" for f in result.findings) or "flagged by its maintainer on ENS"
            outcome = "confirmed"
        else:
            why = f"re-checked here as {result.tier.value} -- alarm ignored"
            outcome = "not-confirmed"
        alarms.append(ArkivAlarm(package.name, package.version, reporter.name, str(report.get("key", "")), outcome, why, result))
    return alarms


def scan(
    site_packages: list[str] | None = None,
    reporters: list[TrustedReporter] | None = None,
    read_reports: Callable[[list[str]], list[dict]] | None = None,
    recheck: Callable[[str, str], VerifyResult] | None = None,
    swept: dict[str, set[str]] | None = None,
) -> ScanResult:
    """Sweep ENS (unless `swept` is passed in, already read), then (if trusted reporters are given)
    their recent Arkiv alarms.

    Raises ens.EnsCheckError if the chain can't be read, or whatever `read_reports` raises.
    """
    installed = installed_packages(site_packages)
    result = match(installed, ens.sweep() if swept is None else swept)
    if not reporters or read_reports is None or recheck is None:
        return result
    reports = read_reports([r.signer for r in reporters])
    # A build its maintainer already flagged on ENS is settled -- no need to rebuild it again.
    flagged = {(h.package, h.version) for h in result.hits}
    unsettled = [p for p in installed if (p.name, p.version) not in flagged]
    alarms = check_alarms(unsettled, reports, reporters, recheck)
    return ScanResult(
        registry_packages=result.registry_packages,
        flagged_builds=result.flagged_builds,
        installed_count=result.installed_count,
        covered=result.covered,
        hits=result.hits,
        arkiv_reports_read=len(reports),
        arkiv_alarms=tuple(alarms),
    )
