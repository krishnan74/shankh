import subprocess

import pytest

from shankh import ens


def test_not_configured_returns_empty_set_without_calling_cast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PACKAGE_RESOLVER_ADDRESS", raising=False)
    monkeypatch.delenv("PACKAGE_DNS_ENCODED_NAME", raising=False)
    monkeypatch.delenv("SEPOLIA_RPC_URL", raising=False)

    def fail_if_called(*args, **kwargs):
        raise AssertionError("cast should never be invoked when ENS check isn't configured")

    monkeypatch.setattr("shankh.ens.subprocess.run", fail_if_called)
    assert ens.revoked_artifacts("shankh-demo") == set()


def _configure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PACKAGE_RESOLVER_ADDRESS", "0xe2f5E5DcbA389D7DFcA629c5c1eaAe2aAdC60E3E")
    monkeypatch.setenv("PACKAGE_DNS_ENCODED_NAME", "0x0b7368616e6b682d64656d6f0470797069067368616e6b680365746800")
    monkeypatch.setenv("SEPOLIA_RPC_URL", "https://example.invalid")


def test_parses_comma_separated_revoked_list(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)
    outputs = iter([
        "0xnode",  # namehash
        "0xinner",  # calldata
        "0xraw",  # call
        '"0xAAA,0xBBB"',  # abi-decode, quoted exactly like `cast abi-decode` prints a string
    ])

    def fake_run(cmd, capture_output, text, check):
        return subprocess.CompletedProcess(cmd, 0, stdout=next(outputs), stderr="")

    monkeypatch.setattr("shankh.ens.subprocess.run", fake_run)
    assert ens.revoked_artifacts("shankh-demo") == {"0xaaa", "0xbbb"}


def test_empty_revoked_list_is_empty_set(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)
    outputs = iter(["0xnode", "0xinner", "0xraw", '""'])

    def fake_run(cmd, capture_output, text, check):
        return subprocess.CompletedProcess(cmd, 0, stdout=next(outputs), stderr="")

    monkeypatch.setattr("shankh.ens.subprocess.run", fake_run)
    assert ens.revoked_artifacts("shankh-demo") == set()


def test_cast_failure_raises_ens_check_error(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)

    def fake_run(cmd, capture_output, text, check):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr("shankh.ens.subprocess.run", fake_run)
    with pytest.raises(ens.EnsCheckError):
        ens.revoked_artifacts("shankh-demo")
