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


class ReportWriteError(RuntimeError):
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
