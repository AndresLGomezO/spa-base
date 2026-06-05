import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import { readJsonFile } from "../read-json-file.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runUiOverridePut(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const body = readJsonFile(flags.file!);
  const context = buildApiContext(flags, auth);

  const updated = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "PUT",
    path: `/api/entities/${encodeURIComponent(entity)}/ui-override`,
    body,
  });

  if (flags.dryRun) {
    return;
  }

  console.log(`Updated UI override for ${entity}.`);
  writeApiOutput(updated, flags);
}
