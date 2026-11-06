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
from concurrent.futures import ThreadPoolExecutor

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


def resolver_for(label: str, registry: str | None = None) -> str | None:
    """`label`'s resolver according to a registry (pypi.shankh.eth's by default), or None if unregistered."""
    rpc_url = os.environ["SEPOLIA_RPC_URL"]
    registry = registry or os.environ["PYPI_REGISTRY_ADDRESS"]
    try:
        address = _cast("call", registry, "getResolver(string)(address)", label, "--rpc-url", rpc_url)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not look up the resolver for {label}: {exc}") from exc
    address = address.strip()
    return None if address.lower() == ZERO_ADDRESS else address


def read_text(resolver: str, fqdn: str, key: str) -> str:
    """One text record, read through ENSIP-10 resolve() (a direct text() call reverts on these resolvers)."""
    rpc_url = os.environ["SEPOLIA_RPC_URL"]
    try:
        node = _cast("namehash", fqdn)
        inner = _cast("calldata", "text(bytes32,string)", node, key)
        raw = _cast("call", resolver, "resolve(bytes,bytes)(bytes)", dns_encode(fqdn), inner, "--rpc-url", rpc_url)
        decoded = _cast("abi-decode", "f()(string)", raw)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not read {key} for {fqdn}: {exc}") from exc
    return decoded.strip().strip('"')


def revoked_for(label: str, resolver: str) -> set[str]:
    """The lowercase 0x-hex build fingerprints flagged in `label`'s shankh.revoked record."""
    value = read_text(resolver, f"{label}.{PARENT}", REVOKED_KEY)
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

    def read(label: str) -> tuple[str, set[str] | None]:
        resolver = resolver_for(label)
        return label, revoked_for(label, resolver) if resolver else None

    # Each package is two RPC round trips; on a slow public endpoint (5-8s a call has been measured)
    # reading them one by one makes the sweep grow linearly with the registry, so read in parallel.
    with ThreadPoolExecutor(max_workers=8) as pool:
        reads = list(pool.map(read, registry_packages()))
    return {label: flagged for label, flagged in reads if flagged is not None}


REPORTERS_PARENT = "reporters.shankh.eth"
SIGNER_KEY = "shankh.signer"


def signer_for(reporter_name: str) -> str | None:
    """The wallet a reporter signs Arkiv reports with, from `<label>.reporters.shankh.eth`'s
    `shankh.signer` record -- writable only by that reporter. None if the name isn't registered.

    reporters.shankh.eth's registry is found through shankh.eth's own registry
    (`getSubregistry("reporters")`), so no extra address has to be configured.
    """
    suffix = "." + REPORTERS_PARENT
    if not reporter_name.endswith(suffix) or reporter_name.count(".") != REPORTERS_PARENT.count(".") + 1:
        raise EnsCheckError(f"reporter names look like <name>.{REPORTERS_PARENT}, got {reporter_name!r}")
    label = reporter_name.removesuffix(suffix)
    shankh_registry = os.environ.get("ENS_REGISTRY_ADDRESS")
    if not shankh_registry or not os.environ.get("SEPOLIA_RPC_URL"):
        raise EnsCheckError("set ENS_REGISTRY_ADDRESS (shankh.eth's registry) and SEPOLIA_RPC_URL to look up reporters")
    try:
        reporters_registry = _cast(
            "call", shankh_registry, "getSubregistry(string)(address)", "reporters", "--rpc-url", os.environ["SEPOLIA_RPC_URL"]
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not find {REPORTERS_PARENT}: {exc}") from exc
    if reporters_registry.lower() == ZERO_ADDRESS:
        return None
    resolver = resolver_for(label, registry=reporters_registry)
    if resolver is None:
        return None
    signer = read_text(resolver, reporter_name, SIGNER_KEY)
    return signer if re.fullmatch(r"0x[0-9a-fA-F]{40}", signer) else None


def _config() -> tuple[str, str]:
    return os.environ["PYPI_REGISTRY_ADDRESS"], os.environ["SEPOLIA_RPC_URL"]


def _cast(*args: str) -> str:
    result = subprocess.run(["cast", *args], capture_output=True, text=True, check=True)
    return result.stdout.strip()
