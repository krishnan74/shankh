/**
 * CLI bridge so `shankh scan` / `shankhd` (Python) can keep a confirmed alarm alive. Reads
 * {"entityKey": "0x…", "days": 90} from stdin, extends that alarm's expiry with this machine's
 * wallet (allowed for any alarm created with `permissionlessExtension`), and prints
 * {entityKey, txHash, expiresAt} as JSON.
 */
import type { Hex } from "viem";

import { extendReport, REPORT_LIFETIME_DAYS } from "./report.ts";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as { entityKey: Hex; days?: number };

  const result = await extendReport(input.entityKey, input.days ?? REPORT_LIFETIME_DAYS);
  process.stdout.write(
    JSON.stringify({ entityKey: result.entityKey, txHash: result.txHash, expiresAt: result.expiresAt.toString() }) + "\n",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
