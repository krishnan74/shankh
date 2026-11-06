"""shankh CLI — `shankh verify`, `shankh scan`, `shankh fingerprint` (and stubs for `demo`, `report`)."""

from concurrent.futures import ThreadPoolExecutor
from importlib.metadata import PackageNotFoundError
from pathlib import Path

import httpx
import typer

from shankh import ens
from shankh import scan as scan_mod
from shankh import trust as trust_mod
from shankh import verify as verify_mod
from shankh.inventory import build_fingerprint, installed_package
from shankh.report import ReportReadError, ReportWriteError, read_reports, write_report
from shankh.verify import RiskTier, VerifyResult

app = typer.Typer(name="shankh", help="Verify packages against their public source; kill reachable credentials on proof of compromise.")

SITE_PACKAGES_HELP = "Check a specific site-packages directory instead of this interpreter's own (e.g. another venv's)."


def _site_packages(value: str | None) -> list[str] | None:
    """None means "this interpreter's own packages". Anything passed must be a real directory --
    an empty or mistyped path must fail loudly, never silently fall back to checking shankh's own
    environment and reporting a misleading all-clear."""
    if value is None:
        return None
    path = Path(value)
    if not value.strip() or not path.is_dir():
        typer.echo(f"--site-packages must be an existing directory, got {value!r}.")
        raise typer.Exit(code=1)
    return [str(path)]


@app.command()
def verify(
    spec: str,
    index_url: str = typer.Option(None, "--index-url", help="Package index to fetch the published source from (defaults to PyPI)."),
    find_links: str = typer.Option(None, "--find-links", help="Local directory of published archives to use instead of any index (the demo's local replay index, never real PyPI)."),
    site_packages: str = typer.Option(None, "--site-packages", help=SITE_PACKAGES_HELP),
    report: bool = typer.Option(True, "--report/--no-report", help="Write the result to Arkiv as a shankh.report entity so other machines can skip re-verifying this package@version."),
) -> None:
    """Verify an installed package version against its published sdist. e.g. `shankh verify litellm==1.107.0`."""
    package, _, version = spec.partition("==")
    version = version or None
    try:
        result = verify_mod.verify(
            package, version, index_url=index_url, find_links=find_links, site_packages=_site_packages(site_packages)
        )
    except PackageNotFoundError:
        typer.echo(f"{package} is not installed in this environment.")
        raise typer.Exit(code=1)
    except (httpx.HTTPError, RuntimeError) as exc:
        typer.echo(f"could not fetch the published source for {package}: {exc}")
        raise typer.Exit(code=1)
    typer.echo(f"{result.package}=={result.version}: {result.tier.value.upper()}")
    for finding in result.findings:
        typer.echo(f"  [{finding.tier.value}] {finding.relative_path}")
    if result.ens_revoked:
        typer.echo(f"  [ens] maintainer flagged this exact build on-chain ({result.build_fingerprint})")
    if report:
        try:
            written = write_report(result)
            typer.echo(f"  reported to Arkiv: {written['entityKey']} (tx {written['txHash']})")
        except ReportWriteError as exc:
            typer.echo(f"  could not write to Arkiv (continuing): {exc}")
    if result.is_malicious:
        raise typer.Exit(code=2)


@app.command()
def scan(
    site_packages: str = typer.Option(None, "--site-packages", help=SITE_PACKAGES_HELP),
    report: bool = typer.Option(True, "--report/--no-report", help="Write each compromised build to Arkiv as a shankh.report entity."),
    trust: list[str] = typer.Option(  # noqa: B008 -- typer reads its options from defaults
        None, "--trust",
        help="Also act on Arkiv alarms signed by this reporter (<name>.reporters.shankh.eth). Repeatable; adds to ~/.config/shankh/trust.toml.",
    ),
    index_url: str = typer.Option(None, "--index-url", help="Where to fetch published source when re-checking an Arkiv alarm (defaults to PyPI)."),
    find_links: str = typer.Option(None, "--find-links", help="Local directory of published archives for re-checks instead of any index."),
) -> None:
    """Check every installed package against every maintainer's ENS kill switch under pypi.shankh.eth,
    and against recent Arkiv alarms from reporters you trust -- each re-checked here before it counts."""
    if not ens.is_configured():
        typer.echo("ENS isn't configured: set PYPI_REGISTRY_ADDRESS and SEPOLIA_RPC_URL.")
        raise typer.Exit(code=1)
    packages_path = _site_packages(site_packages)
    names = trust_mod.trusted_names(trust)
    # The ENS sweep and the trusted-reporter lookup are independent chain reads -- run them together.
    with ThreadPoolExecutor(max_workers=2) as pool:
        sweeping = pool.submit(ens.sweep)
        resolving = pool.submit(trust_mod.resolve, names)
        try:
            swept = sweeping.result()
            reporters, missing = resolving.result()
        except ens.EnsCheckError as exc:
            typer.echo(f"could not read ENS: {exc}")
            raise typer.Exit(code=1)
    for name in missing:
        typer.echo(f"warning: {name} isn't registered on ENS -- ignoring it.")

    def recheck(package: str, version: str) -> VerifyResult:
        return verify_mod.verify(package, version, index_url=index_url, find_links=find_links, site_packages=packages_path)

    try:
        result = scan_mod.scan(packages_path, reporters=reporters, read_reports=read_reports, recheck=recheck, swept=swept)
    except ReportReadError as exc:
        typer.echo(f"could not read Arkiv: {exc}")
        raise typer.Exit(code=1)

    typer.echo(f"pypi.shankh.eth: {len(result.registry_packages)} packages, {result.flagged_builds} flagged build(s)")
    typer.echo(f"this machine:    {result.installed_count} installed, {len(result.covered)} with an ENS kill switch")
    if not result.hits:
        typer.echo("ens:             no installed build has been flagged by its maintainer.")
    for hit in result.hits:
        typer.echo(f"  COMPROMISED  {hit.package}=={hit.version}  flagged on {hit.ens_name}")
        typer.echo(f"               build {hit.fingerprint}")
        if report:
            flagged = VerifyResult(
                package=hit.package, version=hit.version, tier=RiskTier.CRITICAL, findings=(),
                build_fingerprint=hit.fingerprint, ens_revoked=True,
            )
            try:
                written = write_report(flagged)
                typer.echo(f"               reported to Arkiv: {written['entityKey']} (tx {written['txHash']})")
            except ReportWriteError as exc:
                typer.echo(f"               could not write to Arkiv (continuing): {exc}")
    if reporters:
        trusted = ", ".join(r.name for r in reporters)
        typer.echo(f"arkiv:           {result.arkiv_reports_read} recent report(s) from {trusted}; {len(result.arkiv_alarms)} about a build installed here")
    for alarm in result.arkiv_alarms:
        label = {"confirmed": "COMPROMISED", "not-confirmed": "not confirmed", "could-not-recheck": "UNVERIFIED"}[alarm.outcome]
        typer.echo(f"  {label:<12} {alarm.package}=={alarm.version}  alarm from {alarm.reporter}, re-checked here")
        typer.echo(f"               {alarm.detail}")
        typer.echo(f"               alarm entity {alarm.report_key}")
        if alarm.outcome == "confirmed" and report and alarm.recheck is not None:
            # This machine's own, independent confirmation -- a second witness for everyone else.
            try:
                written = write_report(alarm.recheck)
                typer.echo(f"               confirmation reported to Arkiv: {written['entityKey']} (tx {written['txHash']})")
            except ReportWriteError as exc:
                typer.echo(f"               could not write to Arkiv (continuing): {exc}")
    if result.compromised:
        raise typer.Exit(code=2)


@app.command()
def fingerprint(
    package: str,
    site_packages: str = typer.Option(None, "--site-packages", help=SITE_PACKAGES_HELP),
) -> None:
    """Print an installed build's fingerprint -- the value a maintainer passes to KillSwitch.revoke()."""
    try:
        installed = installed_package(package, path=_site_packages(site_packages))
    except PackageNotFoundError:
        typer.echo(f"{package} is not installed there.")
        raise typer.Exit(code=1)
    typer.echo(f"{installed.name}=={installed.version}  {build_fingerprint(installed)}")


@app.command()
def demo(step: bool = typer.Option(False, "--step", help="Pause between each demo beat for presenting."),
          recap: bool = typer.Option(False, "--recap", help="Replay the last demo run's state without sending transactions.")) -> None:
    """Run the terminal demo path described in docs/plan.md."""
    raise NotImplementedError("demo runner not wired up yet — see docs/plan.md Status table")


@app.command()
def report(last: bool = typer.Option(False, "--last", help="Show the most recent incident report.")) -> None:
    """Show an incident report."""
    raise NotImplementedError("incident report not wired up yet — see docs/plan.md Status table")


if __name__ == "__main__":
    app()
