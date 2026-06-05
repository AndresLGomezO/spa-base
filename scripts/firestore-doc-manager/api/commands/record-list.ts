import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runRecordList(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const context = buildApiContext(flags, auth);

  const result = await apiRequest<{
    readonly items: readonly unknown[];
    readonly nextCursor: string | null;
    readonly totalCount: number;
  }>({
    ...context,
    method: "GET",
    path: `/api/${encodeURIComponent(entity)}`,
    query: flags.limit ? { limit: flags.limit } : undefined,
  });

  if (flags.dryRun) {
    return;
  }

  writeApiOutput(result, flags);
}
