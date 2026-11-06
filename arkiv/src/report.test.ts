import assert from "node:assert/strict";
import { test } from "node:test";

import { writeReport } from "./report.ts";

test("writeReport fails fast without Arkiv config/credentials set", async () => {
  // Whichever is missing first (ARKIV_RPC_URL/ARKIV_CHAIN_ID or ARKIV_WALLET_PRIVATE_KEY)
  // should raise a clear error pointing at .env.example, not an SDK/network failure.
  await assert.rejects(
    () =>
      writeReport({
        package: "evilpkg",
        version: "1.0.0",
        tier: "critical",
        malicious: true,
        findings: [],
      }),
    /\.env\.example/,
  );
});
