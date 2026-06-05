import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import { readJsonFile } from "../read-json-file.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runDefinitionPatch(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const definitionId = flags.id!;
  const body = readJsonFile(flags.file!);
  const context = buildApiContext(flags, auth);

  const updated = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "PATCH",
    path: `/api/entity-definitions/${encodeURIComponent(definitionId)}`,
    body,
  });

  if (flags.dryRun) {
    return;
  }

  console.log(`Patched entity definition ${definitionId}.`);
  writeApiOutput(updated, flags);
}
