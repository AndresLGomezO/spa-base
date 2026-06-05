import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runUiOverrideGet(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const context = buildApiContext(flags, auth);

  const result = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "GET",
    path: `/api/entities/${encodeURIComponent(entity)}/ui-override`,
  });

  if (flags.dryRun) {
    return;
  }

  writeApiOutput(result, flags);
}
