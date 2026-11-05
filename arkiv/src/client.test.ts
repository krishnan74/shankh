import assert from "node:assert/strict";
import { test } from "node:test";

import { getArkivConfig } from "./client.ts";

test("getArkivConfig throws without env vars set", () => {
  assert.throws(() => getArkivConfig());
});
