/**
 * Proves, against the live testnet, what an alarm's flags actually guarantee:
 *   tsx src/check-alarm-cli.ts <entityKey>            read back its flags, owner and expiry
 *   tsx src/check-alarm-cli.ts <entityKey> --try-edit  also try to change it (flip `malicious` to
 *                                                      false) with this machine's wallet, and
 *                                                      report whether the chain refused
 * The edit attempt is the evidence for "read-only": for an alarm created with `readonly` it must
 * fail, even when sent by the alarm's own owner.
 */
import type { Hex } from "viem";
import { bool } from "@arkiv-network/sdk/schema";

import { arkivWalletClient } from "./client.ts";
import { alarmFlags } from "./report.ts";
import { ShankhReport } from "./schema.ts";

async function main() {
  const [entityKey, flag] = process.argv.slice(2) as [Hex, string | undefined];
  if (!entityKey) throw new Error("usage: check-alarm-cli.ts <entityKey> [--try-edit]");

  const before = await alarmFlags(entityKey);
  const out: Record<string, unknown> = { entityKey, ...before, expiresAt: before.expiresAt?.toString() };

  if (flag === "--try-edit") {
    try {
      const { txHash } = await arkivWalletClient().patchEntity(ShankhReport, entityKey, { set: { malicious: bool(false) } });
      out.editAttempt = { refused: false, txHash };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      out.editAttempt = { refused: true, error: message.split("\n")[0].slice(0, 300) };
    }
  }
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
