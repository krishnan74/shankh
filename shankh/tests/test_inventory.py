import base64
import hashlib

from shankh.inventory import parse_record


def test_parse_record_decodes_sha256_to_hex() -> None:
    raw = hashlib.sha256(b"hello").digest()
    b64 = base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    record_text = f"pkg/__init__.py,sha256={b64},5\n"
    hashes = parse_record(record_text)
    assert hashes["pkg/__init__.py"] == raw.hex()


def test_parse_record_handles_missing_hash() -> None:
    record_text = "pkg/__init__.py,,\n"
    hashes = parse_record(record_text)
    assert hashes["pkg/__init__.py"] is None


def test_parse_record_skips_blank_lines() -> None:
    hashes = parse_record("\n\n")
    assert hashes == {}


def _pkg(files: list[tuple[str, str | None]]):
    from pathlib import Path

    from shankh.inventory import InstalledFile, InstalledPackage

    return InstalledPackage("demo", "1.0.0", Path("/sp"), tuple(InstalledFile(p, h) for p, h in files))


def test_fingerprint_ignores_order_and_locally_generated_files() -> None:
    from shankh.inventory import build_fingerprint

    shipped = [("demo/__init__.py", "aa"), ("sitecustomize.py", "bb")]
    local_noise = [
        ("demo-1.0.0.dist-info/RECORD", None),
        ("demo-1.0.0.dist-info/INSTALLER", "cc"),
        ("demo/__pycache__/__init__.cpython-312.pyc", "dd"),
        ("../../../bin/demo", "ee"),
    ]
    a = build_fingerprint(_pkg(shipped + local_noise))
    b = build_fingerprint(_pkg(list(reversed(shipped))))  # another machine: no noise, different order
    assert a == b
    assert a.startswith("0x") and len(a) == 66


def test_fingerprint_changes_when_a_file_is_added() -> None:
    from shankh.inventory import build_fingerprint

    clean = build_fingerprint(_pkg([("demo/__init__.py", "aa")]))
    poisoned = build_fingerprint(_pkg([("demo/__init__.py", "aa"), ("sitecustomize.py", "bb")]))
    assert clean != poisoned
