"""Reads the real per-package `KillSwitch`'s `shankh.revoked` text record off Sepolia -- kill
signal #2 from docs/plan.md's Signals section (the maintainer's own ENS revocation), independent
of and able to override the rebuild diff in `shankh.verify`.

Shells out to `cast` (Foundry) for the ENSIP-10 `resolve()` call rather than hand-rolling ABI
encoding in Python -- `cast` is already a required toolchain dependency for `contracts/`, and
every call here is read-only. See `scripts/ens/register-tree-sepolia.sh` step 10 for the exact
call shape this replays.

Wired for the one real package this ENS tree covers so far (`shankh-demo.pypi.shankh.eth`, see
docs/evidence.md); a real multi-package deployment would resolve a package's resolver from
`pypi.shankh.eth`'s registry instead of a fixed env var per package.
"""
from __future__ import annotations

import os
import subprocess


class EnsCheckError(RuntimeError):
    """Raised only when the ENS check IS configured but the read itself failed.

    Never raised when the check is simply not configured -- `shankh.verify` treats that as "no
    ENS signal available" and proceeds on the rebuild result alone, it never blocks on this.
    """


def is_configured() -> bool:
    return bool(
        os.environ.get("PACKAGE_RESOLVER_ADDRESS")
        and os.environ.get("PACKAGE_DNS_ENCODED_NAME")
        and os.environ.get("SEPOLIA_RPC_URL")
    )


def revoked_artifacts(package: str) -> set[str]:
    """Return the lowercase `0x`-hex sha256 hashes `package`'s maintainer has revoked via `KillSwitch`.

    An empty set means either "nothing revoked" or "ENS check not configured" -- callers that need
    to tell those apart should check `is_configured()` first.
    """
    if not is_configured():
        return set()

    resolver = os.environ["PACKAGE_RESOLVER_ADDRESS"]
    dns_name = os.environ["PACKAGE_DNS_ENCODED_NAME"]
    rpc_url = os.environ["SEPOLIA_RPC_URL"]
    fqdn = f"{package}.pypi.shankh.eth"

    try:
        node = _cast("namehash", fqdn)
        inner = _cast("calldata", "text(bytes32,string)", node, "shankh.revoked")
        raw = _cast("call", resolver, "resolve(bytes,bytes)(bytes)", dns_name, inner, "--rpc-url", rpc_url)
        decoded = _cast("abi-decode", "f()(string)", raw)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise EnsCheckError(f"could not read shankh.revoked for {fqdn}: {exc}") from exc

    text_value = decoded.strip().strip('"')
    if not text_value:
        return set()
    return {h.strip().lower() for h in text_value.split(",") if h.strip()}


def _cast(*args: str) -> str:
    result = subprocess.run(["cast", *args], capture_output=True, text=True, check=True)
    return result.stdout.strip()
