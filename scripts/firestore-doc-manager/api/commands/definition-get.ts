import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runDefinitionGet(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const definitionId = flags.id!;
  const context = buildApiContext(flags, auth);

  const result = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "GET",
    path: `/api/entity-definitions/${encodeURIComponent(definitionId)}`,
  });

  if (flags.dryRun) {
    return;
  }

  writeApiOutput(result, flags);
}
