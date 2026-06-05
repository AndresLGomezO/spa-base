import { apiRequest } from "./api-request.js";
import type { ApiAuthHeaders } from "./resolve-auth.js";
import type { ApiFlags } from "./parse-api-args.js";

export async function syncEntityRelations(input: {
  readonly baseUrl: string;
  readonly auth: ApiAuthHeaders;
  readonly entity: string;
  readonly recordId: string;
  readonly relations: Record<string, readonly string[]>;
  readonly dryRun?: boolean;
}): Promise<void> {
  for (const [fieldName, targetIds] of Object.entries(input.relations)) {
    await apiRequest<{ readonly targetIds: readonly string[] }>({
      baseUrl: input.baseUrl,
      auth: input.auth,
      method: "PUT",
      path: `/api/${encodeURIComponent(input.entity)}/${encodeURIComponent(input.recordId)}/relations/${encodeURIComponent(fieldName)}`,
      body: { targetIds },
      dryRun: input.dryRun,
    });

    if (!input.dryRun) {
      console.log(
        `Synced relations for ${input.entity}/${input.recordId}.${fieldName} (${targetIds.length} target(s)).`,
      );
    }
  }
}

export function mergeRelations(
  fromFile: Record<string, readonly string[]>,
  fromRelationsFile: Record<string, readonly string[]> | undefined,
): Record<string, readonly string[]> {
  if (!fromRelationsFile) {
    return fromFile;
  }
  return { ...fromFile, ...fromRelationsFile };
}

export function buildApiContext(flags: ApiFlags, auth: ApiAuthHeaders) {
  return {
    baseUrl: flags.baseUrl,
    auth,
    dryRun: flags.dryRun,
    out: flags.out,
    pretty: flags.pretty,
  };
}
