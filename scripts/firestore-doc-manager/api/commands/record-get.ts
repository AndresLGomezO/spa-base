import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runRecordGet(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const recordId = flags.id!;
  const context = buildApiContext(flags, auth);

  const record = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "GET",
    path: `/api/${encodeURIComponent(entity)}/${encodeURIComponent(recordId)}`,
  });

  if (flags.dryRun) {
    return;
  }

  writeApiOutput(record, flags);
}
