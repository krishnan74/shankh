import hashlib
import io
import tarfile
import zipfile
from pathlib import Path

import httpx
import pytest

from shankh import verify as verify_mod
from shankh.verify import RiskTier, tier_for_untraceable


def test_tier_for_untraceable_flags_pth_as_critical() -> None:
    assert tier_for_untraceable("evilpkg/cook.pth") == RiskTier.CRITICAL


def test_tier_for_untraceable_flags_sitecustomize_as_critical() -> None:
    assert tier_for_untraceable("evilpkg/sitecustomize.py") == RiskTier.CRITICAL


def test_tier_for_untraceable_flags_unknown_extra_file_as_untraceable() -> None:
    assert tier_for_untraceable("evilpkg/payload.bin") == RiskTier.UNTRACEABLE


def test_risk_tier_severity_ordering() -> None:
    assert RiskTier.MATCH.severity < RiskTier.MODIFIED.severity
    assert RiskTier.MODIFIED.severity < RiskTier.UNTRACEABLE.severity
    assert RiskTier.UNTRACEABLE.severity < RiskTier.CRITICAL.severity


def _make_sdist_tar_gz(tmp_path: Path, top_dir: str, files: dict[str, bytes]) -> Path:
    archive = tmp_path / f"{top_dir}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        for rel_path, content in files.items():
            info = tarfile.TarInfo(name=f"{top_dir}/{rel_path}")
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    return archive


def test_sdist_hashes_strips_top_level_dir_from_tar_gz(tmp_path: Path) -> None:
    content = b"print('hello')\n"
    archive = _make_sdist_tar_gz(tmp_path, "pkg-1.0.0", {"pkg/__init__.py": content})
    hashes = verify_mod.sdist_hashes(archive)
    assert hashes["pkg/__init__.py"] == hashlib.sha256(content).hexdigest()


def test_sdist_hashes_strips_top_level_dir_from_zip(tmp_path: Path) -> None:
    content = b"print('hello')\n"
    archive = tmp_path / "pkg-1.0.0.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("pkg-1.0.0/pkg/__init__.py", content)
    hashes = verify_mod.sdist_hashes(archive)
    assert hashes["pkg/__init__.py"] == hashlib.sha256(content).hexdigest()


def test_sdist_hashes_rejects_unknown_extension(tmp_path: Path) -> None:
    archive = tmp_path / "pkg-1.0.0.rar"
    archive.write_bytes(b"not a real archive")
    with pytest.raises(RuntimeError):
        verify_mod.sdist_hashes(archive)


def test_verify_forces_critical_when_ens_revokes_the_downloaded_artifact(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A maintainer's ENS revocation (kill signal #2) overrides a clean rebuild diff entirely --
    this is the case a rebuild alone could never catch: the published source and the installed
    files agree, but the maintainer has still flagged this exact artifact as compromised."""
    content = b"print('hello')\n"
    archive = _make_sdist_tar_gz(tmp_path, "evilpkg-1.0.0", {"evilpkg/__init__.py": content})
    artifact_sha256 = hashlib.sha256(archive.read_bytes()).hexdigest()

    monkeypatch.setattr(verify_mod, "download_sdist", lambda *a, **kw: archive)
    monkeypatch.setattr(verify_mod.ens, "revoked_artifacts", lambda package: {f"0x{artifact_sha256}"})

    class _FakeInstalled:
        version = "1.0.0"
        files = ()

    monkeypatch.setattr(verify_mod, "installed_package", lambda package: _FakeInstalled())

    result = verify_mod.verify("evilpkg")
    assert result.tier == RiskTier.CRITICAL
    assert result.ens_revoked is True
    assert result.artifact_sha256 == artifact_sha256


@pytest.mark.network
def test_verify_against_real_pypi_clean_package_matches() -> None:
    """idna is small, pure-Python, and already installed in this venv -- a real end-to-end check
    against real PyPI that a clean, unmodified install reports MATCH, not a false positive."""
    try:
        result = verify_mod.verify("idna")
    except httpx.HTTPError as exc:
        pytest.skip(f"no network access to PyPI: {exc}")
    assert result.tier == RiskTier.MATCH
    assert not result.is_malicious
