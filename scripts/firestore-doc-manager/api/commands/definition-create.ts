import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import { readJsonFile } from "../read-json-file.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runDefinitionCreate(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const body = readJsonFile(flags.file!);
  const context = buildApiContext(flags, auth);

  const created = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "POST",
    path: "/api/entity-definitions",
    body,
  });

  if (flags.dryRun) {
    return;
  }

  console.log(`Created entity definition ${created.id ?? "(unknown id)"}.`);
  writeApiOutput(created, flags);
}
