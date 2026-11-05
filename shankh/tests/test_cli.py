from typer.testing import CliRunner

from shankh.cli import app

runner = CliRunner()


def test_cli_loads() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "shankh" in result.output
