#!/usr/bin/env node
/**
 * Runs madge circular dependency checks.
 *
 * Madge prints "(N warnings)" when it skips imports it cannot trace
 * (workspace @repo/* packages, CSS, etc.). That is expected in this monorepo
 * and does not mean circular dependencies were found.
 *
 * Usage:
 *   node scripts/lint-circular.mjs --circular --extensions ts src/
 *   node scripts/lint-circular.mjs --strict ...   # also fail on skipped imports
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const madgeCli = require.resolve("madge/bin/cli.js");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const madgeArgs = args.filter((arg) => arg !== "--strict");

const result = spawnSync(process.execPath, [madgeCli, ...madgeArgs], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const warningMatch = output.match(/\((\d+) warnings\)/);
const warningCount = warningMatch ? Number(warningMatch[1]) : 0;

if (warningCount > 0) {
  console.log(
    "\nNote: madge skipped workspace/external imports (@repo/*, CSS, etc.). " +
      "This is expected here. Re-run with `--warning` on the madge command to list them.",
  );

  if (strict) {
    console.error(
      "\nlint:circular --strict failed: madge reported skipped imports.",
    );
    process.exit(1);
  }
}
