/**
 * CLI bridge so `shankh scan` (Python) can read trusted reporters' alarms from Arkiv without
 * reimplementing the SDK. Reads {"creators": ["0x…"], "limit": 50} from stdin and prints a JSON
 * array of their most recent shankh.report entities (each tagged with the wallet that signed it).
 *
 * Usage: echo '{"creators":["0x…"]}' | tsx read-reports-cli.ts
 */
import type { Hex } from "viem";

import { recentReportsBy } from "./report.ts";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as { creators: Hex[]; limit?: number };

  const perCreator = await Promise.all(input.creators.map((c) => recentReportsBy(c, input.limit ?? 50)));
  process.stdout.write(JSON.stringify(perCreator.flat()) + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
