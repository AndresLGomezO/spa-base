/**
 * Firestore document manager — query and mutate Firestore docs via ADC (gcloud user).
 *
 * Usage:
 *   pnpm firestore:doc get --project entitysystem-development --tenant rates_dev --collection entity_definitions --id contract
 *   pnpm firestore:doc set --project entitysystem-development --path tenants/rates_dev/hooks/hook1 --file ./hook.json
 *
 * See scripts/firestore-doc-manager/README.md for full docs.
 */

import { runDelete } from "./commands/delete.js";
import { runGet } from "./commands/get.js";
import { runList } from "./commands/list.js";
import { runPatch } from "./commands/patch.js";
import { runSet } from "./commands/set.js";
import { parseArgs } from "./parse-args.js";

async function main(): Promise<void> {
  const { subcommand, flags } = parseArgs(process.argv.slice(2));

  switch (subcommand) {
    case "get":
      await runGet(flags);
      break;
    case "set":
      await runSet(flags);
      break;
    case "patch":
      await runPatch(flags);
      break;
    case "delete":
      await runDelete(flags);
      break;
    case "list":
      await runList(flags);
      break;
    default:
      throw new Error(`Unsupported subcommand: ${subcommand satisfies never}`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
