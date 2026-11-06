from pathlib import Path

from shankh import ens
from shankh.daemon import Watcher
from shankh.inventory import InstalledFile, InstalledPackage, build_fingerprint
from shankh.kill import KillOutcome
from shankh.report import ReportReadError
from shankh.trust import TrustedReporter
from shankh.verify import FileFinding, RiskTier, VerifyResult

TRUSTED = TrustedReporter("alice.reporters.shankh.eth", "0x" + "aa" * 20)


def _pkg(name: str, files: dict[str, str]) -> InstalledPackage:
    return InstalledPackage(name, "1.0.0", Path("/sp"), tuple(InstalledFile(p, h) for p, h in files.items()))


CLEAN = _pkg("requests", {"requests/__init__.py": "aa"})
POISONED = _pkg("shankh-demo", {"shankh_demo/__init__.py": "bb", "sitecustomize.py": "cc"})


class FakeWatcher(Watcher):
    """A Watcher whose 'installed packages' are whatever the test says."""

    def __init__(self, **kwargs):
        self.packages: list[InstalledPackage] = []
        self.verified: list[tuple[str, str]] = []
        self.written: list[VerifyResult] = []
        self.responded: list = []
        self.swept: dict[str, set[str]] = {}
        self.reports: list[dict] = []
        defaults = {
            "site_packages": None,
            "reporters": [TRUSTED],
            "verify": self._verify,
            "sweep": lambda: self.swept,
            "read_reports": lambda signers: self.reports,
            "write_report": self._write,
            "respond": self._respond,
        }
        defaults.update(kwargs)
        super().__init__(**defaults)

    def installed(self):
        return list(self.packages)

    def _verify(self, name, version):
        self.verified.append((name, version))
        pkg = next(p for p in self.packages if p.name == name)
        bad = "sitecustomize.py" in {f.relative_path for f in pkg.files}
        findings = (FileFinding("sitecustomize.py", RiskTier.CRITICAL),) if bad else ()
        return VerifyResult(name, version, RiskTier.CRITICAL if bad else RiskTier.MATCH, findings, build_fingerprint(pkg))

    def _write(self, result):
        self.written.append(result)
        return {"entityKey": "0xnew", "txHash": "0xtx"}

    def _respond(self, compromise):
        self.responded.append(compromise)
        return KillOutcome(False, "not built")


def test_existing_installs_are_baselined_not_rebuilt_and_new_ones_are() -> None:
    w = FakeWatcher()
    w.packages = [CLEAN]
    w.baseline()
    w.check_installs()
    assert w.verified == []

    w.packages = [CLEAN, POISONED]
    w.check_installs()
    assert w.verified == [("shankh-demo", "1.0.0")]
    assert [(c.package, c.source) for c in w.compromises] == [("shankh-demo", "rebuild")]
    assert len(w.written) == 1 and len(w.responded) == 1

    w.check_installs()  # nothing new: no second rebuild, no second alert
    assert w.verified == [("shankh-demo", "1.0.0")]
    assert len(w.compromises) == 1


def test_a_clean_new_install_is_verified_but_not_acted_on() -> None:
    w = FakeWatcher()
    w.baseline()
    w.packages = [CLEAN]
    w.check_installs()
    assert w.verified == [("requests", "1.0.0")]
    assert w.compromises == [] and w.written == []


def test_an_ens_flag_is_acted_on_once_across_rounds() -> None:
    w = FakeWatcher(reporters=[])
    w.packages = [POISONED]
    w.baseline()
    w.swept = {"shankh-demo": {build_fingerprint(POISONED)}}
    w.check_alarms()
    w.check_alarms()
    assert [(c.package, c.source) for c in w.compromises] == [("shankh-demo", "ens")]
    assert len(w.written) == 1 and w.written[0].ens_revoked


def test_an_arkiv_alarm_is_rechecked_once_and_not_reposted() -> None:
    w = FakeWatcher()
    w.packages = [POISONED]
    w.baseline()
    w.reports = [{
        "key": "0xalarm", "creator": TRUSTED.signer, "package": "shankh-demo", "version": "1.0.0",
        "malicious": True, "artifactSha256": build_fingerprint(POISONED),
    }]
    w.check_alarms()
    w.check_alarms()
    assert w.verified == [("shankh-demo", "1.0.0")]  # one rebuild, not one per round
    assert [(c.package, c.source) for c in w.compromises] == [("shankh-demo", "arkiv")]
    assert w.written == []  # the reporter already posted it


def test_an_unreachable_chain_or_arkiv_is_logged_and_retried_never_fatal() -> None:
    def broken_sweep():
        raise ens.EnsCheckError("rpc down")

    def broken_reports(signers):
        raise ReportReadError("arkiv down")

    w = FakeWatcher(sweep=broken_sweep, read_reports=broken_reports)
    w.packages = [POISONED]
    w.baseline()
    w.check_alarms()  # must not raise
    assert w.compromises == []
