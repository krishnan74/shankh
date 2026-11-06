import hashlib
import io
import tarfile
import zipfile
from pathlib import Path

import httpx
import pytest

from shankh import verify as verify_mod
from shankh.inventory import InstalledFile, InstalledPackage, build_fingerprint
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


def _installed(files: dict[str, bytes]) -> InstalledPackage:
    return InstalledPackage(
        name="evilpkg",
        version="1.0.0",
        location=Path("/site-packages"),
        files=tuple(InstalledFile(path, hashlib.sha256(data).hexdigest()) for path, data in files.items()),
    )


def test_verify_forces_critical_when_ens_flags_the_installed_build(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A maintainer's ENS flag (kill signal #2) overrides a clean rebuild diff entirely -- the case
    a rebuild alone can never catch: the published source and the installed files agree, but the
    maintainer has still flagged this exact build as compromised."""
    content = b"print('hello')\n"
    archive = _make_sdist_tar_gz(tmp_path, "evilpkg-1.0.0", {"evilpkg/__init__.py": content})
    installed = _installed({"evilpkg/__init__.py": content})
    flagged = build_fingerprint(installed)

    monkeypatch.setattr(verify_mod, "download_sdist", lambda *a, **kw: archive)
    monkeypatch.setattr(verify_mod, "installed_package", lambda package, path=None: installed)
    monkeypatch.setattr(verify_mod.ens, "revoked_builds", lambda package: {flagged})

    result = verify_mod.verify("evilpkg")
    assert result.findings == ()  # the rebuild diff alone is clean
    assert result.tier == RiskTier.CRITICAL
    assert result.ens_revoked is True
    assert result.build_fingerprint == flagged


def test_verify_ignores_flags_for_a_different_build(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    content = b"print('hello')\n"
    archive = _make_sdist_tar_gz(tmp_path, "evilpkg-1.0.0", {"evilpkg/__init__.py": content})
    monkeypatch.setattr(verify_mod, "download_sdist", lambda *a, **kw: archive)
    monkeypatch.setattr(verify_mod, "installed_package", lambda package, path=None: _installed({"evilpkg/__init__.py": content}))
    monkeypatch.setattr(verify_mod.ens, "revoked_builds", lambda package: {"0x" + "ab" * 32})

    result = verify_mod.verify("evilpkg")
    assert result.tier == RiskTier.MATCH
    assert result.ens_revoked is False


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
