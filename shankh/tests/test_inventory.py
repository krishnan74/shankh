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
