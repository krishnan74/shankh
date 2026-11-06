import json
import subprocess

import pytest

from shankh import ens

REGISTRY = "0x8634b9f567Fa84da5BCe08150Aa323424382a3a4"
RESOLVER = "0xe2f5E5DcbA389D7DFcA629c5c1eaAe2aAdC60E3E"


def _configure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPI_REGISTRY_ADDRESS", REGISTRY)
    monkeypatch.setenv("SEPOLIA_RPC_URL", "https://example.invalid")


def _fake_cast(monkeypatch: pytest.MonkeyPatch, answer) -> list[list[str]]:
    """Route every `cast` call through `answer(args) -> stdout`; returns the calls made."""
    calls: list[list[str]] = []

    def fake_run(cmd, capture_output, text, check):
        calls.append(cmd[1:])
        return subprocess.CompletedProcess(cmd, 0, stdout=answer(cmd[1:]), stderr="")

    monkeypatch.setattr("shankh.ens.subprocess.run", fake_run)
    return calls


def test_label_for_normalizes_like_pypi() -> None:
    assert ens.label_for("Shankh_Demo.Utils") == "shankh-demo-utils"


def test_dns_encode_matches_the_real_shankh_demo_name() -> None:
    # The exact bytes used on Sepolia (scripts/ens/register-tree-sepolia.sh, DNS_NAME).
    assert ens.dns_encode("shankh-demo.pypi.shankh.eth") == "0x0b7368616e6b682d64656d6f0470797069067368616e6b680365746800"


def test_not_configured_returns_empty_without_calling_cast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PYPI_REGISTRY_ADDRESS", raising=False)
    monkeypatch.delenv("SEPOLIA_RPC_URL", raising=False)

    def fail(*args, **kwargs):
        raise AssertionError("cast must not run when ENS isn't configured")

    monkeypatch.setattr("shankh.ens.subprocess.run", fail)
    assert ens.revoked_builds("shankh-demo") == set()


def test_revoked_builds_finds_the_resolver_through_the_registry(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)

    def answer(args):
        if args[0] == "call" and "getResolver(string)(address)" in args:
            return RESOLVER
        if args[0] == "abi-decode":
            return '"0xAAA,0xBBB"'
        return "0xstub"

    calls = _fake_cast(monkeypatch, answer)
    assert ens.revoked_builds("Shankh_Demo") == {"0xaaa", "0xbbb"}
    assert ["call", REGISTRY, "getResolver(string)(address)", "shankh-demo", "--rpc-url", "https://example.invalid"] in calls


def test_unregistered_package_has_no_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)
    _fake_cast(monkeypatch, lambda args: ens.ZERO_ADDRESS if args[0] == "call" else "")
    assert ens.revoked_builds("not-a-package") == set()


def test_sweep_lists_every_registered_package(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)
    logs = [{"data": "0xdemo"}, {"data": "0xclean"}, {"data": "0xgone"}]
    labels = {"0xdemo": "shankh-demo", "0xclean": "shankh-demo-clean", "0xgone": "unregistered-later"}

    def answer(args):
        if args[0] == "logs":
            return json.dumps(logs)
        if args[0] == "abi-decode" and args[1] == ens.LABEL_REGISTERED_DATA:
            return f'"{labels[args[2]]}"\n0xowner\n2109291591'
        if args[0] == "call" and "getResolver(string)(address)" in args:
            return ens.ZERO_ADDRESS if args[3] == "unregistered-later" else RESOLVER
        if args[0] == "abi-decode":
            return '"0xbad"'
        return "0xstub"

    _fake_cast(monkeypatch, answer)
    assert ens.sweep() == {"shankh-demo": {"0xbad"}, "shankh-demo-clean": {"0xbad"}}


def test_cast_failure_raises_ens_check_error(monkeypatch: pytest.MonkeyPatch) -> None:
    _configure(monkeypatch)

    def fake_run(cmd, capture_output, text, check):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr("shankh.ens.subprocess.run", fake_run)
    with pytest.raises(ens.EnsCheckError):
        ens.revoked_builds("shankh-demo")
