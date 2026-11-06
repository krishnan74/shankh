"""Inventory: what's installed, with per-file sha256 read straight from each package's RECORD.

RECORD is the file pip writes at install time listing every shipped file and its hash --
it's the ground truth for "what actually landed on disk," independent of what the source
repo or sdist says should have landed there. The verifier in shankh.verify diffs this
against the published sdist.
"""
from __future__ import annotations

import base64
import hashlib
import re
from dataclasses import dataclass
from importlib.metadata import Distribution, PackageNotFoundError, distributions
from pathlib import Path


@dataclass(frozen=True)
class InstalledFile:
    relative_path: str
    sha256: str | None  # None when RECORD has no hash for this entry (directories, some metadata rows)


@dataclass(frozen=True)
class InstalledPackage:
    name: str
    version: str
    location: Path
    files: tuple[InstalledFile, ...]


def _record_hash_to_hex(record_hash: str) -> str | None:
    """RECORD stores hashes as 'sha256=<url-safe base64, no padding>'; convert to hex."""
    if not record_hash.startswith("sha256="):
        return None
    b64 = record_hash.removeprefix("sha256=")
    padding = "=" * (-len(b64) % 4)
    return base64.urlsafe_b64decode(b64 + padding).hex()


def parse_record(record_text: str) -> dict[str, str | None]:
    """Parse RECORD's CSV-ish body into {relative_path: hex sha256 or None}."""
    hashes: dict[str, str | None] = {}
    for line in record_text.splitlines():
        if not line.strip():
            continue
        # RECORD is CSV but paths never contain commas in practice for our use case; split is safe here.
        parts = line.split(",")
        path = parts[0]
        record_hash = parts[1] if len(parts) > 1 else ""
        hashes[path] = _record_hash_to_hex(record_hash) if record_hash else None
    return hashes


def _from_distribution(dist: Distribution) -> InstalledPackage:
    record_text = dist.read_text("RECORD") or ""
    hashes_by_path = parse_record(record_text)
    files = tuple(
        InstalledFile(relative_path=path, sha256=sha256)
        for path, sha256 in hashes_by_path.items()
    )
    location = Path(str(dist.locate_file("")))
    return InstalledPackage(name=dist.name, version=dist.version, location=location, files=files)


def installed_package(name: str, path: list[str] | None = None) -> InstalledPackage:
    """Read one installed package's RECORD. Raises importlib.metadata.PackageNotFoundError if absent.

    `path` points at a specific site-packages directory instead of the running interpreter's own.
    """
    if path is None:
        return _from_distribution(Distribution.from_name(name))
    for dist in distributions(path=path):
        if _normalize(dist.name) == _normalize(name):
            return _from_distribution(dist)
    raise PackageNotFoundError(name)


def installed_packages(path: list[str] | None = None) -> list[InstalledPackage]:
    """Every installed package in the running interpreter, or in the given site-packages directory."""
    seen: set[str] = set()
    out: list[InstalledPackage] = []
    for dist in distributions(path=path) if path is not None else distributions():
        key = _normalize(dist.name)
        if key in seen:
            continue
        seen.add(key)
        out.append(_from_distribution(dist))
    return out


def _normalize(name: str) -> str:
    """PEP 503 name normalization: case-insensitive, runs of -_. treated as one hyphen."""
    return re.sub(r"[-_.]+", "-", name).lower()


def is_package_file(relative_path: str) -> bool:
    """True for files the package itself shipped; False for what pip/the interpreter add locally.

    Excluded: packaging metadata pip writes (.dist-info/, .egg-info/), bytecode compiled on this
    machine (__pycache__/, .pyc), and console-script launchers pip generates outside site-packages
    (paths starting ../). None of these come from the package, and they differ machine to machine.
    """
    return not (
        ".dist-info/" in relative_path
        or ".egg-info/" in relative_path
        or "__pycache__" in relative_path
        or relative_path.endswith(".pyc")
        or relative_path.startswith("../")
    )


def build_fingerprint(package: InstalledPackage) -> str:
    """A build's identity, computed from what's actually installed -- `0x` + 64 hex chars.

    sha256 over the sorted `path:sha256` lines of every file the package shipped (per RECORD).
    Every machine with the same build installed computes the same value, with no download and no
    memory of which archive it came from -- which matters because a poisoned *wheel* (the real
    LiteLLM 1.107.0 case) can sit beside a perfectly clean source archive. This is the value a
    maintainer flags on ENS via KillSwitch.revoke(bytes32), and the value `shankh scan` checks.
    """
    lines = sorted(
        f"{f.relative_path}:{f.sha256}"
        for f in package.files
        if f.sha256 and is_package_file(f.relative_path)
    )
    return "0x" + hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


def hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()
