"""shankh CLI — entry point for `shankh demo`, `shankh verify`, `shankh report`."""

import typer

app = typer.Typer(name="shankh", help="Verify packages against their public source; kill reachable credentials on proof of compromise.")


@app.command()
def verify(spec: str) -> None:
    """Verify an installed package version against a sandboxed rebuild of its public source. e.g. `shankh verify litellm==1.107.0`."""
    raise NotImplementedError("rebuild verifier not wired up yet — see docs/plan.md Status table")


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
