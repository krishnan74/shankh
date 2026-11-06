"""shankhd -- the watcher. Runs `shankh verify` and `shankh scan` for you, continuously.

    shankhd --trust shankh-team.reporters.shankh.eth

Two loops in one:
- **Installs**, every `--poll` seconds (default 2): lists the watched site-packages' `.dist-info`
  directories -- a cheap directory listing, no network. When it changes, every newly installed
  build is rebuilt from its public source (`verify`). A CRITICAL result is a compromise.
- **Alarms**, every `--interval` seconds (default 60): the ENS sweep of every package under
  pypi.shankh.eth, and recent Arkiv alarms from trusted reporters, each re-checked locally
  (exactly what `shankh scan` does).

It remembers what it has handled, so a build is alerted on once and an Arkiv report is re-checked
once, not every minute. Memory is per run: on start, what's already installed is the baseline and
isn't rebuilt (pass --verify-existing to rebuild everything once); the ENS and Arkiv sweeps still
cover it from the first tick.

On a compromise: print an alert, post this machine's finding to Arkiv once, and call
`shankh.kill.respond()` -- which today says plainly that the key shut-off isn't built yet.

Like `shankh scan`, it only ever *reads* the watched environment's files; it never imports from
it or starts its Python, so a poisoned package's startup hook never runs.
"""
from __future__ import annotations

import os
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import typer

from shankh import ens
from shankh import kill as kill_mod
from shankh import trust as trust_mod
from shankh import verify as verify_mod
from shankh.inventory import InstalledPackage, build_fingerprint, installed_packages
from shankh.report import ReportReadError, ReportWriteError, read_reports, write_report
from shankh.scan import check_alarms, match
from shankh.trust import TrustedReporter
from shankh.verify import RiskTier, VerifyResult


def log(message: str) -> None:
    print(f"{datetime.now().strftime('%H:%M:%S')}  {message}", flush=True)


@dataclass
class Watcher:
    """One watched environment. Every dependency that touches the network is injected, so a tick
    can be tested without a chain, Arkiv or PyPI."""

    site_packages: list[str] | None
    reporters: list[TrustedReporter]
    verify: Callable[[str, str], VerifyResult]
    sweep: Callable[[], dict[str, set[str]]]
    read_reports: Callable[[list[str]], list[dict]]
    write_report: Callable[[VerifyResult], dict] | None  # None: don't post to Arkiv
    respond: Callable[[kill_mod.Compromise], kill_mod.KillOutcome] = kill_mod.respond
    seen_builds: set[tuple[str, str, str]] = field(default_factory=set)  # (name, version, fingerprint) already rebuilt or baselined
    handled_reports: set[str] = field(default_factory=set)  # Arkiv entity keys already re-checked
    alerted: set[tuple[str, str, str]] = field(default_factory=set)  # builds already acted on
    compromises: list[kill_mod.Compromise] = field(default_factory=list)

    def installed(self) -> list[InstalledPackage]:
        return installed_packages(self.site_packages)

    def baseline(self, verify_existing: bool = False) -> int:
        """Record what's already installed. Returns how many builds were baselined."""
        installed = self.installed()
        if not verify_existing:
            self.seen_builds |= {(p.name, p.version, build_fingerprint(p)) for p in installed}
        return len(installed)

    def check_installs(self) -> None:
        """Rebuild every build installed since the last look."""
        for package in self.installed():
            key = (package.name, package.version, build_fingerprint(package))
            if key in self.seen_builds:
                continue
            self.seen_builds.add(key)
            log(f"new install: {package.name}=={package.version} -- rebuilding it from its public source")
            try:
                result = self.verify(package.name, package.version)
            except Exception as exc:  # noqa: BLE001 -- no published source, network down...: a warning, never an action
                log(f"  could not verify {package.name}=={package.version}: {exc}")
                continue
            if result.is_malicious:
                detail = ", ".join(f"[{f.tier.value}] {f.relative_path}" for f in result.findings) or "flagged on ENS"
                self._act(result, "rebuild", detail)
            else:
                log(f"  {package.name}=={package.version}: {result.tier.value.upper()}")

    def check_alarms(self) -> None:
        """The ENS sweep, then trusted reporters' Arkiv alarms -- what `shankh scan` does."""
        installed = self.installed()
        try:
            swept = self.sweep()
        except ens.EnsCheckError as exc:
            log(f"could not read ENS this round (will retry): {exc}")
            swept = None
        if swept is not None:
            for hit in match(installed, swept).hits:
                flagged = VerifyResult(
                    package=hit.package, version=hit.version, tier=RiskTier.CRITICAL, findings=(),
                    build_fingerprint=hit.fingerprint, ens_revoked=True,
                )
                self._act(flagged, "ens", f"flagged by its maintainer on {hit.ens_name}")

        summary = "ENS unreachable" if swept is None else f"{len(swept)} packages on ENS"
        if not self.reporters:
            log(f"sweep: {summary}")
            return
        try:
            reports = self.read_reports([r.signer for r in self.reporters])
        except ReportReadError as exc:
            log(f"sweep: {summary}; could not read Arkiv this round (will retry): {exc}")
            return
        log(f"sweep: {summary}, {len(reports)} recent alarms from trusted reporters")
        fresh = [r for r in reports if str(r.get("key", "")) not in self.handled_reports]
        settled = {(name, version) for name, version, _ in self.alerted}
        unsettled = [p for p in installed if (p.name, p.version) not in settled]
        retry: set[str] = set()
        for alarm in check_alarms(unsettled, fresh, self.reporters, self.verify):
            if alarm.outcome == "confirmed" and alarm.recheck is not None:
                self._act(alarm.recheck, "arkiv", f"alarm from {alarm.reporter}, re-checked here: {alarm.detail}")
            elif alarm.outcome == "not-confirmed":
                log(f"alarm from {alarm.reporter} about {alarm.package}=={alarm.version} didn't hold up here -- ignored")
            else:
                log(f"alarm from {alarm.reporter} about {alarm.package}=={alarm.version} couldn't be re-checked: {alarm.detail}")
                retry.add(alarm.report_key)
        # Everything else in this batch -- confirmed, ignored, or about builds not installed here --
        # is done with, so it isn't re-filtered or re-rebuilt every round.
        self.handled_reports |= {str(r.get("key", "")) for r in fresh} - retry

    def _act(self, result: VerifyResult, source: str, detail: str) -> None:
        key = (result.package, result.version, result.build_fingerprint)
        if key in self.alerted:
            return
        self.alerted.add(key)
        compromise = kill_mod.Compromise(result.package, result.version, result.build_fingerprint, source, detail)
        self.compromises.append(compromise)
        log(f"COMPROMISED  {result.package}=={result.version}  ({source}) {detail}")
        if self.write_report is not None and source != "arkiv":
            # An Arkiv-sourced hit was already posted by the reporter; this machine adds its own
            # finding only for what it found itself (a rebuild) or read from ENS.
            try:
                written = self.write_report(result)
                log(f"  posted to Arkiv: {written['entityKey']}")
            except ReportWriteError as exc:
                log(f"  could not post to Arkiv: {exc}")
        outcome = self.respond(compromise)
        log(f"  kill: {outcome.summary}")


def describe_environment(site_packages: str | None) -> str:
    """How to name the watched environment in the log: `<env>/lib/python3.X/site-packages` is shown
    as the environment itself (`./victim`), relative to the current directory when it's under it --
    the long site-packages path is noise to a reader. Anything else is shown as given."""
    if not site_packages:
        return "this environment"
    path = Path(site_packages).resolve()
    if path.name == "site-packages" and path.parent.parent.name == "lib":
        path = path.parent.parent.parent
    try:
        return f"./{path.relative_to(Path.cwd().resolve())}"
    except ValueError:
        return str(path)


def _dist_info_snapshot(paths: list[str]) -> frozenset[str]:
    names: set[str] = set()
    for path in paths:
        try:
            names |= {n for n in os.listdir(path) if n.endswith(".dist-info")}
        except OSError:
            pass
    return frozenset(names)


app = typer.Typer(add_completion=False)


@app.command()
def run(
    site_packages: str = typer.Option(None, "--site-packages", help="Watch this site-packages directory instead of shankhd's own environment."),
    trust: list[str] = typer.Option(None, "--trust", help="Also act on this reporter's Arkiv alarms (<name>.reporters.shankh.eth). Repeatable."),  # noqa: B008
    interval: float = typer.Option(60.0, "--interval", help="Seconds between ENS + Arkiv sweeps."),
    poll: float = typer.Option(2.0, "--poll", help="Seconds between checks for new installs (a directory listing, no network)."),
    index_url: str = typer.Option(None, "--index-url", help="Where to fetch published source for rebuilds (defaults to PyPI)."),
    find_links: str = typer.Option(None, "--find-links", help="Local directory of published archives for rebuilds instead of any index."),
    report: bool = typer.Option(True, "--report/--no-report", help="Post this machine's findings to Arkiv."),
    verify_existing: bool = typer.Option(False, "--verify-existing", help="Rebuild everything already installed once at start, not just new installs."),
    once: bool = typer.Option(False, "--once", help="Run one full round and exit (exit code 2 if anything is compromised)."),
) -> None:
    """Watch an environment: rebuild every new install, and sweep ENS and trusted Arkiv alarms."""
    if site_packages is not None and (not site_packages.strip() or not Path(site_packages).is_dir()):
        typer.echo(f"--site-packages must be an existing directory, got {site_packages!r}.")
        raise typer.Exit(code=1)
    if not ens.is_configured():
        typer.echo("ENS isn't configured: set PYPI_REGISTRY_ADDRESS and SEPOLIA_RPC_URL.")
        raise typer.Exit(code=1)
    watched = [site_packages] if site_packages else None
    try:
        reporters, missing = trust_mod.resolve(trust_mod.trusted_names(trust))
    except ens.EnsCheckError as exc:
        typer.echo(f"could not look up trusted reporters on ENS: {exc}")
        raise typer.Exit(code=1)
    for name in missing:
        log(f"warning: {name} isn't registered on ENS -- ignoring it.")

    watcher = Watcher(
        site_packages=watched,
        reporters=reporters,
        verify=lambda name, version: verify_mod.verify(name, version, index_url=index_url, find_links=find_links, site_packages=watched),
        sweep=ens.sweep,
        read_reports=read_reports,
        write_report=write_report if report else None,
    )
    count = watcher.baseline(verify_existing)
    where = describe_environment(site_packages)
    trusted = ", ".join(r.name for r in reporters) or "no Arkiv reporters"
    log(f"shankhd watching {where}: {count} package{'' if count == 1 else 's'} installed; trusting {trusted}")

    if once:
        watcher.check_installs()
        watcher.check_alarms()
        raise typer.Exit(code=2 if watcher.compromises else 0)

    paths = watched or [p for p in sys.path if p.endswith("site-packages")]
    snapshot = _dist_info_snapshot(paths)
    next_sweep = 0.0
    try:
        while True:
            current = _dist_info_snapshot(paths)
            if current != snapshot:
                snapshot = current
                watcher.check_installs()
            if time.monotonic() >= next_sweep:
                watcher.check_alarms()
                next_sweep = time.monotonic() + interval
            time.sleep(poll)
    except KeyboardInterrupt:
        log(f"shankhd stopped. {len(watcher.compromises)} compromise(s) this run.")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
