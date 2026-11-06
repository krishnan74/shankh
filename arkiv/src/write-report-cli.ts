/**
 * CLI bridge so shankh verify (Python) can write its result to Arkiv without reimplementing the
 * Arkiv SDK integration in Python. Reads one JSON object from stdin matching VerificationReport,
 * writes it, and prints the entity key + tx hash as JSON to stdout.
 *
 * Usage: echo '{"package":"...","version":"...","tier":"critical","malicious":true,"findings":[...]}' | tsx write-report-cli.ts
 */
import { writeReport, type VerificationReport } from "./report.ts";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as VerificationReport;

  const result = await writeReport(input);
  process.stdout.write(JSON.stringify({ entityKey: result.entityKey, txHash: result.txHash }) + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
