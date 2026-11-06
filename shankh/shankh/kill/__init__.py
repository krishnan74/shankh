"""What happens once a build on this machine is confirmed compromised: the AWS keys it could reach
switch themselves off.

For each AWS access key ID you've registered with Shankh (and only those -- see `protected_keys`):
  1. attach AWS's own quarantine policy (`AWSCompromisedKeyQuarantineV3`, the one AWS attaches to
     keys it finds leaked in public) to the key's IAM user -- it blocks the dangerous actions at once;
  2. set the key itself to Inactive -- switched off, never deleted, so a false alarm is undone with
     `shankh restore-key`.

Shankh acts with its own, separate AWS profile (`SHANKH_AWS_PROFILE`), never with the stolen key.

Safety rule: Shankh only ever touches key IDs listed explicitly in `SHANKH_PROTECTED_KEYS` (comma-
separated) or `~/.config/shankh/kill.toml` (`aws_keys = ["AKIA…"]`). With nothing listed, `respond()`
changes nothing and says so. That's also the honest scope today: Shankh doesn't yet discover which
credentials a package could reach on its own (plan-2.md's "exposure snapshot") -- you tell it.

Not built yet: the CloudTrail audit of what the key did, deleting the package's rogue files,
blocking exfiltration domains, and the incident report (plan-2.md "Kill and clean").
"""
from __future__ import annotations

import os
import tomllib
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

QUARANTINE_POLICIES = (
    "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV3",
    "arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV2",  # fallback if V3 isn't available
)


@dataclass(frozen=True)
class Compromise:
    package: str
    version: str
    fingerprint: str
    source: str  # "rebuild" | "ens" | "arkiv"
    detail: str


@dataclass(frozen=True)
class KillOutcome:
    acted: bool
    summary: str


def config_path() -> Path:
    return Path(os.environ.get("SHANKH_KILL_FILE", "~/.config/shankh/kill.toml")).expanduser()


def protected_keys() -> list[str]:
    """The AWS access key IDs Shankh may switch off -- and the only ones it will ever touch."""
    keys: list[str] = []
    raw = os.environ.get("SHANKH_PROTECTED_KEYS", "")
    keys.extend(k.strip() for k in raw.split(",") if k.strip())
    path = config_path()
    if path.is_file():
        with path.open("rb") as f:
            keys.extend(str(k).strip() for k in tomllib.load(f).get("aws_keys", []))
    unique: list[str] = []
    for key in keys:
        if key and key not in unique:
            unique.append(key)
    return unique


def masked(key_id: str) -> str:
    return f"{key_id[:4]}…{key_id[-4:]}" if len(key_id) > 8 else key_id


def _iam_client():
    import boto3  # imported lazily: nothing else in Shankh needs AWS

    profile = os.environ.get("SHANKH_AWS_PROFILE")
    if not profile:
        raise RuntimeError("set SHANKH_AWS_PROFILE to the AWS profile Shankh acts with (never the protected key itself)")
    return boto3.Session(profile_name=profile).client("iam")


def switch_off(key_id: str, iam) -> str:
    """Quarantine the key's user, then set the key Inactive. Returns what was done."""
    user = iam.get_access_key_last_used(AccessKeyId=key_id)["UserName"]
    attached = None
    for arn in QUARANTINE_POLICIES:
        try:
            iam.attach_user_policy(UserName=user, PolicyArn=arn)
            attached = arn.rsplit("/", 1)[1]
            break
        except iam.exceptions.NoSuchEntityException:
            continue
    iam.update_access_key(UserName=user, AccessKeyId=key_id, Status="Inactive")
    quarantine = f"quarantined user {user} ({attached})" if attached else f"no quarantine policy available for {user}"
    return f"key {masked(key_id)} switched off (Inactive); {quarantine}"


def restore(key_id: str, iam) -> str:
    """Undo `switch_off` for a false alarm: key Active again, quarantine policy detached."""
    user = iam.get_access_key_last_used(AccessKeyId=key_id)["UserName"]
    iam.update_access_key(UserName=user, AccessKeyId=key_id, Status="Active")
    for arn in QUARANTINE_POLICIES:
        try:
            iam.detach_user_policy(UserName=user, PolicyArn=arn)
        except iam.exceptions.NoSuchEntityException:
            pass
    return f"key {masked(key_id)} active again; quarantine removed from {user}"


def respond(compromise: Compromise, iam_factory: Callable[[], object] = _iam_client) -> KillOutcome:
    keys = protected_keys()
    if not keys:
        return KillOutcome(
            acted=False,
            summary="no AWS keys registered with Shankh (SHANKH_PROTECTED_KEYS) -- nothing was switched off. Rotate any keys this machine can reach by hand.",
        )
    try:
        iam = iam_factory()
    except Exception as exc:  # noqa: BLE001 -- no profile, no boto3, bad config: say so, never crash the watcher
        return KillOutcome(acted=False, summary=f"could not reach AWS to switch keys off: {exc}")
    done: list[str] = []
    failed: list[str] = []
    for key in keys:
        try:
            done.append(switch_off(key, iam))
        except Exception as exc:  # noqa: BLE001 -- one key failing must not stop the others
            failed.append(f"key {masked(key)}: {exc}")
    summary = "; ".join(done + [f"FAILED {f}" for f in failed])
    return KillOutcome(acted=bool(done), summary=summary)
