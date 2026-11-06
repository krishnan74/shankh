"""Reads the maintainers' kill switches off ENS -- kill signal #2 in docs/plan.md's Signals.

Every package under `pypi.shankh.eth` has its own resolver holding a `shankh.revoked` text record:
a comma-separated list of build fingerprints (`inventory.build_fingerprint`) the maintainer has
flagged as bad via that package's `KillSwitch`. This module:

- finds any package's resolver through the registry itself (`getResolver(label)`), not a config
  value -- so every registered package works, not just the first demo one;
- lists every package ever registered under `pypi.shankh.eth` from the registry's own
  `LabelRegistered` events, and reads each one's bad-builds list (`sweep`). Comparing that full
  list locally means no per-package lookups -- the RPC provider never learns what's installed.

Shells out to `cast` (Foundry) rather than hand-rolling ABI encoding; every call is read-only.
Reads go through the ENSIP-10 `resolve()` path because these factory-deployed resolvers revert
on a direct `text()` call (scripts/ens/register-tree-sepolia.sh step 10 proves the call shape).
"""
from __future__ import annotations

import json
import os
import re
import subprocess

REVOKED_KEY = "shankh.revoked"
PARENT = "pypi.shankh.eth"
# Indexed fields: tokenId, labelHash, sender. Data: (string label, address owner, uint64 expiry) --
# confirmed by decoding the real shankh-demo registration on Sepolia.
LABEL_REGISTERED = "LabelRegistered(uint256,bytes32,string,address,uint64,address)"
LABEL_REGISTERED_DATA = "f()(string,address,uint64)"
# pypi.shankh.eth's registry emitted its first event at this block; no package can predate it.
DEFAULT_FROM_BLOCK = "12073919"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


class EnsCheckError(RuntimeError):
    """Raised only when the ENS check IS configured but a read failed.

    Never raised when the check is simply not configured -- `shankh.verify` treats that as "no ENS
    signal available" and proceeds on the rebuild result alone; it never blocks on this.
    """


def is_configured() -> bool:
    return bool(os.environ.get("PYPI_REGISTRY_ADDRESS") and os.environ.get("SEPOLIA_RPC_URL"))


def label_for(package: str) -> str:
    """The ENS label for a PyPI package name: PEP 503 normalized (lowercase, -_. become -)."""
    return re.sub(r"[-_.]+", "-", package).lower()


def dns_encode(name: str) -> str:
    """DNS wire format for resolve(): each label prefixed by its length, terminated by a zero byte."""
    out = b""
    for label in name.split("."):
        encoded = label.encode("utf-8")
        out += bytes([len(encoded)]) + encoded
    return "0x" + (out + b"\x00").hex()


def resolver_for(label: str) -> str | None:
    """The package's resolver address according to pypi.shankh.eth's registry, or None if unregistered."""
    registry, rpc_url = _config()
    try:
        address = _cast("call", registry, "getResolver(string)(address)", label, "--rpc-url", rpc_url)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not look up the resolver for {label}.{PARENT}: {exc}") from exc
    address = address.strip()
    return None if address.lower() == ZERO_ADDRESS else address


def revoked_for(label: str, resolver: str) -> set[str]:
    """The lowercase 0x-hex build fingerprints flagged in `label`'s shankh.revoked record."""
    _, rpc_url = _config()
    fqdn = f"{label}.{PARENT}"
    try:
        node = _cast("namehash", fqdn)
        inner = _cast("calldata", "text(bytes32,string)", node, REVOKED_KEY)
        raw = _cast("call", resolver, "resolve(bytes,bytes)(bytes)", dns_encode(fqdn), inner, "--rpc-url", rpc_url)
        decoded = _cast("abi-decode", "f()(string)", raw)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not read {REVOKED_KEY} for {fqdn}: {exc}") from exc
    value = decoded.strip().strip('"')
    return {h.strip().lower() for h in value.split(",") if h.strip()}


def revoked_builds(package: str) -> set[str]:
    """Bad-build fingerprints for one package. Empty if ENS isn't configured or the package isn't registered."""
    if not is_configured():
        return set()
    label = label_for(package)
    resolver = resolver_for(label)
    return revoked_for(label, resolver) if resolver else set()


def registry_packages() -> list[str]:
    """Every package label ever registered under pypi.shankh.eth, from the registry's own events."""
    registry, rpc_url = _config()
    from_block = os.environ.get("PYPI_REGISTRY_FROM_BLOCK", DEFAULT_FROM_BLOCK)
    try:
        raw = _cast("logs", "--address", registry, "--from-block", from_block, LABEL_REGISTERED, "--rpc-url", rpc_url, "--json")
        labels: list[str] = []
        for log in json.loads(raw or "[]"):
            decoded = _cast("abi-decode", LABEL_REGISTERED_DATA, log["data"])
            label = decoded.splitlines()[0].strip().strip('"')
            if label and label not in labels:
                labels.append(label)
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError) as exc:
        raise EnsCheckError(f"could not list the packages under {PARENT}: {exc}") from exc
    return labels


def sweep() -> dict[str, set[str]]:
    """{label: flagged build fingerprints} for every package currently registered under pypi.shankh.eth.

    Packages that were registered but no longer resolve (unregistered or expired) are skipped.
    """
    if not is_configured():
        raise EnsCheckError("ENS isn't configured: set PYPI_REGISTRY_ADDRESS and SEPOLIA_RPC_URL")
    result: dict[str, set[str]] = {}
    for label in registry_packages():
        resolver = resolver_for(label)
        if resolver:
            result[label] = revoked_for(label, resolver)
    return result


def _config() -> tuple[str, str]:
    return os.environ["PYPI_REGISTRY_ADDRESS"], os.environ["SEPOLIA_RPC_URL"]


def _cast(*args: str) -> str:
    result = subprocess.run(["cast", *args], capture_output=True, text=True, check=True)
    return result.stdout.strip()
