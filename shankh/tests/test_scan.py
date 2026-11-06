from pathlib import Path

from shankh.inventory import InstalledFile, InstalledPackage, build_fingerprint
from shankh.scan import check_alarms, match
from shankh.trust import TrustedReporter
from shankh.verify import FileFinding, RiskTier, VerifyResult


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


# --- Arkiv alarms from trusted reporters: a witness, re-checked here, never a verdict on its own ---


TRUSTED = TrustedReporter("alice.reporters.shankh.eth", "0x" + "aa" * 20)
STRANGER = "0x" + "bb" * 20


def _report(pkg: InstalledPackage, creator: str = TRUSTED.signer, **overrides) -> dict:
    report = {
        "key": "0xentity", "creator": creator, "package": pkg.name, "version": pkg.version,
        "tier": "critical", "malicious": True, "findings": [], "artifactSha256": build_fingerprint(pkg), "ensRevoked": False,
    }
    report.update(overrides)
    return report


def _recheck_as(tier: RiskTier, calls: list | None = None):
    def recheck(package: str, version: str) -> VerifyResult:
        if calls is not None:
            calls.append((package, version))
        findings = (FileFinding("sitecustomize.py", tier),) if tier != RiskTier.MATCH else ()
        return VerifyResult(package, version, tier, findings)
    return recheck


POISONED = _pkg("shankh-demo", {"shankh_demo/__init__.py": "aa", "sitecustomize.py": "bb"})


def test_a_trusted_alarm_that_holds_up_locally_is_confirmed() -> None:
    alarms = check_alarms([POISONED], [_report(POISONED)], [TRUSTED], _recheck_as(RiskTier.CRITICAL))
    assert [a.outcome for a in alarms] == ["confirmed"]
    assert alarms[0].reporter == TRUSTED.name
    assert "sitecustomize.py" in alarms[0].detail


def test_alarms_signed_by_an_untrusted_wallet_are_ignored_even_if_they_claim_a_trusted_reporter() -> None:
    calls: list = []
    forged = _report(POISONED, creator=STRANGER, reporter=TRUSTED.signer)  # the attribute is forgeable; the creator isn't
    assert check_alarms([POISONED], [forged], [TRUSTED], _recheck_as(RiskTier.CRITICAL, calls)) == []
    assert calls == []


def test_an_alarm_about_a_different_build_of_the_same_version_is_skipped() -> None:
    calls: list = []
    other_build = _report(POISONED, artifactSha256="0x" + "00" * 32)
    assert check_alarms([POISONED], [other_build], [TRUSTED], _recheck_as(RiskTier.CRITICAL, calls)) == []
    assert calls == []


def test_an_alarm_that_does_not_hold_up_locally_is_not_confirmed() -> None:
    alarms = check_alarms([POISONED], [_report(POISONED)], [TRUSTED], _recheck_as(RiskTier.MATCH))
    assert [a.outcome for a in alarms] == ["not-confirmed"]


def test_an_alarm_that_cannot_be_rechecked_is_a_warning_not_an_action() -> None:
    def broken(package: str, version: str) -> VerifyResult:
        raise RuntimeError("no published source")
    alarms = check_alarms([POISONED], [_report(POISONED)], [TRUSTED], broken)
    assert [a.outcome for a in alarms] == ["could-not-recheck"]


def test_non_malicious_reports_and_packages_not_installed_here_never_trigger_a_recheck() -> None:
    calls: list = []
    clean_report = _report(POISONED, malicious=False, tier="match")
    elsewhere = _report(_pkg("requests", {"requests/__init__.py": "dd"}))
    wrong_version = _report(POISONED, version="9.9.9")
    duplicate = [_report(POISONED), _report(POISONED, key="0xolder")]
    alarms = check_alarms([POISONED], [clean_report, elsewhere, wrong_version, *duplicate], [TRUSTED], _recheck_as(RiskTier.CRITICAL, calls))
    assert calls == [("shankh-demo", "1.0.0")]  # once, for the newest alarm only
    assert [a.report_key for a in alarms] == ["0xentity"]
