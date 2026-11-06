"""Inventory: what's installed, with per-file sha256 read straight from each package's RECORD.

RECORD is the file pip writes at install time listing every shipped file and its hash --
it's the ground truth for "what actually landed on disk," independent of what the source
repo or sdist says should have landed there. The verifier in shankh.verify diffs this
against the published sdist.
"""
from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass
from importlib.metadata import Distribution
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


def installed_package(name: str) -> InstalledPackage:
    """Read one installed package's RECORD. Raises importlib.metadata.PackageNotFoundError if absent."""
    dist = Distribution.from_name(name)
    record_text = dist.read_text("RECORD") or ""
    hashes_by_path = parse_record(record_text)
    files = tuple(
        InstalledFile(relative_path=path, sha256=sha256)
        for path, sha256 in hashes_by_path.items()
    )
    location = Path(str(dist.locate_file("")))
    return InstalledPackage(name=dist.name, version=dist.version, location=location, files=files)


def hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()
