/**
 * Entity API CLI — call the backend the same way the browser does.
 *
 * Usage:
 *   pnpm entity:api record create --entity contract --file ./payload.json --token "$API_ID_TOKEN" --app-check "$API_APP_CHECK_TOKEN"
 *   pnpm entity:api ui-override put --entity contract --file ./ui.json --curl-file ./captured.curl
 *
 * See scripts/firestore-doc-manager/README.md for full docs.
 */

import { runDefinitionCreate } from "./api/commands/definition-create.js";
import { runDefinitionGet } from "./api/commands/definition-get.js";
import { runDefinitionList } from "./api/commands/definition-list.js";
import { runDefinitionPatch } from "./api/commands/definition-patch.js";
import { runRecordCreate } from "./api/commands/record-create.js";
import { runRecordDelete } from "./api/commands/record-delete.js";
import { runRecordGet } from "./api/commands/record-get.js";
import { runRecordList } from "./api/commands/record-list.js";
import { runRecordUpdate } from "./api/commands/record-update.js";
import { runUiOverrideGet } from "./api/commands/ui-override-get.js";
import { runUiOverridePut } from "./api/commands/ui-override-put.js";
import {
  ApiRequestError,
  printApiRequestError,
} from "./api/api-request.js";
import { parseApiArgs } from "./api/parse-api-args.js";
import { resolveApiAuth } from "./api/resolve-auth.js";

async function main(): Promise<void> {
  const { resource, action, flags } = parseApiArgs(process.argv.slice(2));
  const auth = resolveApiAuth({
    token: flags.token,
    appCheck: flags.appCheck,
    curlFile: flags.curlFile,
  });

  if (resource === "record") {
    switch (action) {
      case "create":
        await runRecordCreate(flags, auth);
        break;
      case "update":
        await runRecordUpdate(flags, auth);
        break;
      case "get":
        await runRecordGet(flags, auth);
        break;
      case "delete":
        await runRecordDelete(flags, auth);
        break;
      case "list":
        await runRecordList(flags, auth);
        break;
      default:
        throw new Error(`Unsupported record action: ${action satisfies never}`);
    }
    return;
  }

  if (resource === "definition") {
    switch (action) {
      case "list":
        await runDefinitionList(flags, auth);
        break;
      case "get":
        await runDefinitionGet(flags, auth);
        break;
      case "create":
        await runDefinitionCreate(flags, auth);
        break;
      case "patch":
        await runDefinitionPatch(flags, auth);
        break;
      default:
        throw new Error(
          `Unsupported definition action: ${action satisfies never}`,
        );
    }
    return;
  }

  if (resource === "ui-override") {
    switch (action) {
      case "get":
        await runUiOverrideGet(flags, auth);
        break;
      case "put":
        await runUiOverridePut(flags, auth);
        break;
      default:
        throw new Error(
          `Unsupported ui-override action: ${action satisfies never}`,
        );
    }
    return;
  }

  throw new Error(`Unsupported resource: ${resource satisfies never}`);
}

main().catch((error: unknown) => {
  if (error instanceof ApiRequestError) {
    printApiRequestError(error);
  } else if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
