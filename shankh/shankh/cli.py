"""shankh CLI — entry point for `shankh demo`, `shankh verify`, `shankh report`."""

from importlib.metadata import PackageNotFoundError

import httpx
import typer

from shankh import verify as verify_mod

app = typer.Typer(name="shankh", help="Verify packages against their public source; kill reachable credentials on proof of compromise.")


@app.command()
def verify(
    spec: str,
    index_url: str = typer.Option(None, "--index-url", help="Package index to fetch the published source from (defaults to PyPI)."),
    find_links: str = typer.Option(None, "--find-links", help="Local directory of published archives to use instead of any index (the demo's local replay index, never real PyPI)."),
) -> None:
    """Verify an installed package version against its published sdist. e.g. `shankh verify litellm==1.107.0`."""
    package, _, version = spec.partition("==")
    version = version or None
    try:
        result = verify_mod.verify(package, version, index_url=index_url, find_links=find_links)
    except PackageNotFoundError:
        typer.echo(f"{package} is not installed in this environment.")
        raise typer.Exit(code=1)
    except (httpx.HTTPError, RuntimeError) as exc:
        typer.echo(f"could not fetch the published source for {package}: {exc}")
        raise typer.Exit(code=1)
    typer.echo(f"{result.package}=={result.version}: {result.tier.value.upper()}")
    for finding in result.findings:
        typer.echo(f"  [{finding.tier.value}] {finding.relative_path}")
    if result.is_malicious:
        raise typer.Exit(code=2)


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
