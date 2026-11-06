"""Bridge to the Arkiv shankh.report writer (arkiv/src/write-report-cli.ts).

The Arkiv SDK integration lives in TS (arkiv/), so this shells out to it rather than
reimplementing the same client in Python. This is the step that turns a local `shankh verify`
result into the alarm the thesis depends on: signed by this machine's own wallet, readable by
every other machine running the same package@version without re-running its own rebuild.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from shankh.verify import VerifyResult

ARKIV_DIR = Path(__file__).resolve().parents[3] / "arkiv"
READ_TIMEOUT_SECONDS = 60


class ReportWriteError(RuntimeError):
    pass


class ReportReadError(RuntimeError):
    pass


def write_report(result: VerifyResult) -> dict:
    """Write a VerifyResult to Arkiv as a shankh.report entity. Returns {entityKey, txHash}."""
    payload = {
        "package": result.package,
        "version": result.version,
        "tier": result.tier.value,
        "malicious": result.is_malicious,
        "findings": [{"relativePath": f.relative_path, "tier": f.tier.value} for f in result.findings],
        # Arkiv column kept as `artifactSha256` so older entities still line up; it now carries the
        # build fingerprint (inventory.build_fingerprint), the same value maintainers flag on ENS.
        "artifactSha256": result.build_fingerprint,
        "ensRevoked": result.ens_revoked,
    }
    proc = subprocess.run(
        ["npm", "run", "--silent", "write-report"],
        cwd=ARKIV_DIR,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise ReportWriteError(proc.stderr.strip() or "arkiv write-report failed")
    return json.loads(proc.stdout.strip())


def read_reports(creators: list[str], limit: int = 50) -> list[dict]:
    """The most recent shankh.report entities signed by each of `creators` (arkiv/src/read-reports-cli.ts).

    Filtered by the wallet that actually signed each entity -- never by package, so the query says
    nothing about what's installed here. Each dict carries `creator`, `key`, `package`, `version`,
    `tier`, `malicious`, `findings`, `artifactSha256` (the build fingerprint) and `ensRevoked`.
    """
    if not creators:
        return []
    try:
        proc = subprocess.run(
            ["npm", "run", "--silent", "read-reports"],
            cwd=ARKIV_DIR,
            input=json.dumps({"creators": creators, "limit": limit}),
            capture_output=True,
            text=True,
            check=False,
            # The Arkiv testnet RPC has been seen to stall for minutes (docs/build-log.md); fail
            # loudly instead of hanging the whole scan.
            timeout=READ_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise ReportReadError(f"Arkiv didn't answer within {READ_TIMEOUT_SECONDS}s") from exc
    if proc.returncode != 0:
        raise ReportReadError(proc.stderr.strip() or "arkiv read-reports failed")
    return json.loads(proc.stdout.strip() or "[]")
