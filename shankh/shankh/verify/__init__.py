"""Rebuild verifier: fetch a package's published sdist, diff it against what's actually installed.

This is the mechanism that would have caught the real October 2026 LiteLLM 1.107.0 compromise:
the published sdist / public GitHub source was clean, but the wheel PyPI actually served carried
two extra files -- a `.pth` loader and a `sitecustomize.py` -- that auto-executed on every Python
startup and never appeared anywhere in the public source. Any file installed on disk that can't be
traced back to the published sdist is exactly that pattern.

Scope note (docs/plan.md, spike 5): this diffs file *provenance and hashes*, not a from-source
compile inside a network-isolated sandbox. A compiled rebuild is the next step up for packages with
build steps that can themselves be tampered with; for a pure-Python package (true of the LiteLLM
case) the sdist IS the source, so this already closes the real gap.
"""
from __future__ import annotations

import hashlib
import tarfile
import tempfile
import zipfile
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

import httpx

from shankh import ens
from shankh.inventory import installed_package

# How the real LiteLLM 1.107.0 persistence worked: a `.pth` file is auto-executed by Python's site
# module on every interpreter startup; sitecustomize.py is auto-imported the same way. Neither has
# any legitimate reason to exist in most packages' installed file sets.
DANGEROUS_PATTERNS = ("sitecustomize.py", ".pth")


class RiskTier(str, Enum):
    MATCH = "match"              # every installed file traces back to the published sdist, hashes agree
    MODIFIED = "modified"        # a file both sides have differs in content
    UNTRACEABLE = "untraceable"  # a file is installed but doesn't exist anywhere in the sdist
    CRITICAL = "critical"        # an untraceable file matches a known persistence pattern

    @property
    def severity(self) -> int:
        return {"match": 0, "modified": 1, "untraceable": 2, "critical": 3}[self.value]


@dataclass(frozen=True)
class FileFinding:
    relative_path: str
    tier: RiskTier


@dataclass(frozen=True)
class VerifyResult:
    package: str
    version: str
    tier: RiskTier  # worst finding overall, after the ENS signal below is folded in
    findings: tuple[FileFinding, ...]
    artifact_sha256: str = ""  # sha256 of the downloaded sdist archive -- what a maintainer's ENS revoke() targets
    ens_revoked: bool = False  # kill signal #2 (docs/plan.md Signals): the maintainer revoked this exact artifact

    @property
    def is_malicious(self) -> bool:
        return self.tier == RiskTier.CRITICAL


def tier_for_untraceable(relative_path: str) -> RiskTier:
    lowered = relative_path.lower()
    if any(pattern in lowered for pattern in DANGEROUS_PATTERNS):
        return RiskTier.CRITICAL
    return RiskTier.UNTRACEABLE


def sdist_hashes(archive: Path) -> dict[str, str]:
    """Walk a source archive (.tar.gz or .zip), return {path-under-top-dir: sha256}.

    sdists have exactly one top-level directory (the package name + version); it's stripped so
    paths line up with how pip lays files out relative to the package root.
    """
    hashes: dict[str, str] = {}
    name = archive.name
    if name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(archive, "r:gz") as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue
                parts = member.name.split("/", 1)
                rel = parts[1] if len(parts) > 1 else parts[0]
                extracted = tar.extractfile(member)
                if extracted is None:
                    continue
                hashes[rel] = hashlib.sha256(extracted.read()).hexdigest()
    elif name.endswith(".zip"):
        with zipfile.ZipFile(archive) as zf:
            for zip_name in zf.namelist():
                if zip_name.endswith("/"):
                    continue
                parts = zip_name.split("/", 1)
                rel = parts[1] if len(parts) > 1 else parts[0]
                hashes[rel] = hashlib.sha256(zf.read(zip_name)).hexdigest()
    else:
        raise RuntimeError(f"unrecognized sdist archive type: {archive.name}")
    return hashes


def _find_in_local_index(package: str, version: str, directory: Path) -> Path:
    """Locate a package's sdist in a flat local directory (the demo's replay index, never real PyPI)."""
    normalized = package.replace("_", "-").replace(".", "-").lower()
    for candidate in sorted(directory.iterdir()):
        name = candidate.name.replace("_", "-").lower()
        if name.startswith(f"{normalized}-{version}") and name.endswith((".tar.gz", ".tgz", ".zip")):
            return candidate
    raise RuntimeError(f"no sdist for {package}=={version} found in {directory}")


def download_sdist(
    package: str, version: str, dest: Path, index_url: str | None = None, find_links: str | None = None
) -> Path:
    """Fetch the published sdist (source archive) for package==version. Returns its path.

    We only ever need the raw archive bytes to hash -- never a built wheel -- so this talks
    directly to a package index's JSON API (PyPI's own, or a local replay index serving the same
    shape) rather than going through pip, which would otherwise insist on invoking the package's
    build backend just to resolve metadata.
    """
    if find_links:
        return _find_in_local_index(package, version, Path(find_links))

    base = (index_url or "https://pypi.org/pypi").rstrip("/")
    response = httpx.get(f"{base}/{package}/{version}/json", timeout=30.0, follow_redirects=True)
    response.raise_for_status()
    sdist_files = [f for f in response.json()["urls"] if f["packagetype"] == "sdist"]
    if not sdist_files:
        raise RuntimeError(f"no sdist published for {package}=={version}")
    file_info = sdist_files[0]

    archive_path = dest / file_info["filename"]
    with httpx.stream("GET", file_info["url"], timeout=60.0, follow_redirects=True) as stream:
        stream.raise_for_status()
        with archive_path.open("wb") as f:
            for chunk in stream.iter_bytes():
                f.write(chunk)
    return archive_path


def verify(
    package: str, version: str | None = None, *, index_url: str | None = None, find_links: str | None = None
) -> VerifyResult:
    """Rebuild `package`'s published source and diff it against what's actually installed on disk."""
    installed = installed_package(package)
    target_version = version or installed.version

    with tempfile.TemporaryDirectory(prefix="shankh-verify-") as tmp:
        archive = download_sdist(package, target_version, Path(tmp), index_url=index_url, find_links=find_links)
        published = sdist_hashes(archive)
        artifact_sha256 = hashlib.sha256(archive.read_bytes()).hexdigest()

    try:
        revoked = ens.revoked_artifacts(package)
    except ens.EnsCheckError:
        revoked = set()  # ENS check configured but failed -- fall back to the rebuild result alone
    ens_revoked = f"0x{artifact_sha256}" in revoked

    findings: list[FileFinding] = []
    for installed_file in installed.files:
        rel = installed_file.relative_path
        if ".dist-info/" in rel or ".egg-info/" in rel:
            continue  # packaging metadata pip itself writes, never part of the published source
        if "__pycache__" in rel or rel.endswith(".pyc"):
            continue  # compiled locally by the interpreter, never shipped in the sdist
        if rel.startswith("../"):
            continue  # console-script entry points pip generates outside site-packages (e.g. ../../../bin/<name>)
        published_hash = published.get(rel)
        if published_hash is None:
            findings.append(FileFinding(relative_path=rel, tier=tier_for_untraceable(rel)))
        elif installed_file.sha256 and installed_file.sha256 != published_hash:
            findings.append(FileFinding(relative_path=rel, tier=RiskTier.MODIFIED))

    worst = max((f.tier for f in findings), key=lambda t: t.severity, default=RiskTier.MATCH)
    if ens_revoked:
        worst = RiskTier.CRITICAL  # the maintainer's own revocation overrides a clean rebuild
    return VerifyResult(
        package=package,
        version=target_version,
        tier=worst,
        findings=tuple(findings),
        artifact_sha256=artifact_sha256,
        ens_revoked=ens_revoked,
    )
