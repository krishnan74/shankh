import boto3
from botocore.stub import Stubber

from shankh import kill
from shankh.kill import Compromise, respond, restore, switch_off

KEY = "AKIAEXAMPLEVICTIM123"
USER = "shankh-demo-victim"
V3 = "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV3"
V2 = "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2"
HIT = Compromise("shankh-demo", "1.0.0", "0xabc", "rebuild", "[critical] sitecustomize.py")


def _iam():
    client = boto3.client("iam", region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")
    return client, Stubber(client)


def _last_used(stub):
    stub.add_response("get_access_key_last_used", {"UserName": USER, "AccessKeyLastUsed": {"ServiceName": "N/A", "Region": "N/A"}}, {"AccessKeyId": KEY})


def test_switch_off_quarantines_the_user_then_deactivates_the_key_in_that_order() -> None:
    iam, stub = _iam()
    _last_used(stub)
    stub.add_response("attach_user_policy", {}, {"UserName": USER, "PolicyArn": V3})
    stub.add_response("update_access_key", {}, {"UserName": USER, "AccessKeyId": KEY, "Status": "Inactive"})
    with stub:
        summary = switch_off(KEY, iam)
    stub.assert_no_pending_responses()
    assert "Inactive" in summary and "AWSCompromisedKeyQuarantineV3" in summary and KEY not in summary  # key id masked


def test_switch_off_falls_back_to_v2_when_v3_does_not_exist() -> None:
    iam, stub = _iam()
    _last_used(stub)
    stub.add_client_error("attach_user_policy", "NoSuchEntity", expected_params={"UserName": USER, "PolicyArn": V3})
    stub.add_response("attach_user_policy", {}, {"UserName": USER, "PolicyArn": V2})
    stub.add_response("update_access_key", {}, {"UserName": USER, "AccessKeyId": KEY, "Status": "Inactive"})
    with stub:
        assert "AWSCompromisedKeyQuarantineV2" in switch_off(KEY, iam)


def test_restore_reactivates_and_removes_the_quarantine() -> None:
    iam, stub = _iam()
    _last_used(stub)
    stub.add_response("update_access_key", {}, {"UserName": USER, "AccessKeyId": KEY, "Status": "Active"})
    stub.add_response("detach_user_policy", {}, {"UserName": USER, "PolicyArn": V3})
    stub.add_client_error("detach_user_policy", "NoSuchEntity", expected_params={"UserName": USER, "PolicyArn": V2})
    with stub:
        assert "active again" in restore(KEY, iam)


def test_with_no_registered_keys_nothing_is_touched(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("SHANKH_PROTECTED_KEYS", raising=False)
    monkeypatch.setenv("SHANKH_KILL_FILE", str(tmp_path / "none.toml"))
    called = []
    outcome = respond(HIT, iam_factory=lambda: called.append(1))
    assert not outcome.acted and called == []  # never even connected to AWS
    assert "nothing was switched off" in outcome.summary


def test_only_registered_keys_are_switched_off(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("SHANKH_PROTECTED_KEYS", KEY)
    monkeypatch.setenv("SHANKH_KILL_FILE", str(tmp_path / "none.toml"))
    iam, stub = _iam()
    _last_used(stub)
    stub.add_response("attach_user_policy", {}, {"UserName": USER, "PolicyArn": V3})
    stub.add_response("update_access_key", {}, {"UserName": USER, "AccessKeyId": KEY, "Status": "Inactive"})
    with stub:
        outcome = respond(HIT, iam_factory=lambda: iam)
    assert outcome.acted and "switched off" in outcome.summary
    assert kill.protected_keys() == [KEY]


def test_an_unreachable_aws_is_reported_never_raised(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("SHANKH_PROTECTED_KEYS", KEY)
    monkeypatch.setenv("SHANKH_KILL_FILE", str(tmp_path / "none.toml"))

    def no_profile():
        raise RuntimeError("set SHANKH_AWS_PROFILE")

    outcome = respond(HIT, iam_factory=no_profile)
    assert not outcome.acted and "could not reach AWS" in outcome.summary
