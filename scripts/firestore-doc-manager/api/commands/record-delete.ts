import { apiRequest } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import { buildApiContext } from "../sync-relations.js";

export async function runRecordDelete(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const recordId = flags.id!;
  const context = buildApiContext(flags, auth);

  await apiRequest<{ readonly deleted: boolean }>({
    ...context,
    method: "DELETE",
    path: `/api/${encodeURIComponent(entity)}/${encodeURIComponent(recordId)}`,
  });

  if (!flags.dryRun) {
    console.log(`Deleted ${entity}/${recordId}.`);
  }
}
