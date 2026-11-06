from pathlib import Path

from shankh.inventory import InstalledFile, InstalledPackage, build_fingerprint
from shankh.scan import match


def _pkg(name: str, files: dict[str, str]) -> InstalledPackage:
    return InstalledPackage(name, "1.0.0", Path("/sp"), tuple(InstalledFile(p, h) for p, h in files.items()))


def test_match_flags_only_installed_builds_their_maintainer_flagged() -> None:
    poisoned = _pkg("shankh_demo", {"shankh_demo/__init__.py": "aa", "sitecustomize.py": "bb"})
    clean = _pkg("shankh-demo-clean", {"shankh_demo_clean/__init__.py": "cc"})
    unrelated = _pkg("requests", {"requests/__init__.py": "dd"})
    swept = {
        "shankh-demo": {build_fingerprint(poisoned)},
        "shankh-demo-clean": {"0x" + "00" * 32},  # some other build of it was flagged, not this one
        "never-installed-here": {"0x" + "11" * 32},
    }

    result = match([poisoned, clean, unrelated], swept)

    assert [h.package for h in result.hits] == ["shankh_demo"]
    assert result.hits[0].ens_name == "shankh-demo.pypi.shankh.eth"
    assert set(result.covered) == {"shankh_demo", "shankh-demo-clean"}
    assert result.installed_count == 3
    assert result.flagged_builds == 3
    assert len(result.registry_packages) == 3


def test_match_with_nothing_flagged_reports_no_hits() -> None:
    result = match([_pkg("shankh-demo", {"shankh_demo/__init__.py": "aa"})], {"shankh-demo": set()})
    assert result.hits == ()
    assert result.covered == ("shankh-demo",)


def test_cli_rejects_an_empty_or_missing_site_packages_dir(tmp_path) -> None:
    from typer.testing import CliRunner

    from shankh.cli import app

    runner = CliRunner()
    for bad in ["", str(tmp_path / "does-not-exist")]:
        result = runner.invoke(app, ["fingerprint", "shankh-demo", "--site-packages", bad])
        assert result.exit_code == 1
        assert "must be an existing directory" in result.output
