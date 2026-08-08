/**
 * Ensures every maintained map-core source module declares its purpose.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("maintained runtime modules declare their purpose", () => {
  const missing = fs
    .readdirSync(path.join(ROOT, "src"))
    .filter((name) => /\.(?:js|mjs|cjs)$/.test(name))
    .filter((name) => {
      const firstMeaningful = fs
        .readFileSync(path.join(ROOT, "src", name), "utf8")
        .split(/\r?\n/)
        .find((line) => line.trim());
      return !/^\s*(?:\/\/|\/\*)/.test(firstMeaningful || "");
    });
  assert.deepEqual(missing, []);
});
