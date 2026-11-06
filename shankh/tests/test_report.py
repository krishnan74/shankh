import json
import subprocess

import pytest

from shankh.report import ReportWriteError, write_report
from shankh.verify import FileFinding, RiskTier, VerifyResult


def _sample_result() -> VerifyResult:
    return VerifyResult(
        package="evilpkg",
        version="1.0.0",
        tier=RiskTier.CRITICAL,
        findings=(FileFinding(relative_path="sitecustomize.py", tier=RiskTier.CRITICAL),),
    )


def test_write_report_sends_expected_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    def fake_run(cmd, cwd, input, capture_output, text, check):
        captured["cmd"] = cmd
        captured["payload"] = json.loads(input)
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps({"entityKey": "0xabc", "txHash": "0xdef"}), stderr="")

    monkeypatch.setattr("shankh.report.subprocess.run", fake_run)
    result = write_report(_sample_result())

    assert result == {"entityKey": "0xabc", "txHash": "0xdef"}
    assert captured["payload"]["package"] == "evilpkg"
    assert captured["payload"]["malicious"] is True
    assert captured["payload"]["findings"] == [{"relativePath": "sitecustomize.py", "tier": "critical"}]


def test_write_report_raises_on_nonzero_exit(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(args, 1, stdout="", stderr="boom")

    monkeypatch.setattr("shankh.report.subprocess.run", fake_run)
    with pytest.raises(ReportWriteError, match="boom"):
        write_report(_sample_result())
