import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runDefinitionList(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const context = buildApiContext(flags, auth);

  const result = await apiRequest<{
    readonly items: readonly unknown[];
  }>({
    ...context,
    method: "GET",
    path: "/api/entity-definitions",
  });

  if (flags.dryRun) {
    return;
  }

  writeApiOutput(result, flags);
}
