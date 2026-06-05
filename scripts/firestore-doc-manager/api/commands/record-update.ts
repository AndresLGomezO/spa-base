import { apiRequest, writeApiOutput } from "../api-request.js";
import type { ApiFlags } from "../parse-api-args.js";
import { readJsonFile } from "../read-json-file.js";
import type { ApiAuthHeaders } from "../resolve-auth.js";
import {
  parseRelationsFile,
  splitEntityPayloadFromFile,
} from "../split-entity-payload.js";
import {
  buildApiContext,
  mergeRelations,
  syncEntityRelations,
} from "../sync-relations.js";

export async function runRecordUpdate(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const recordId = flags.id!;
  const parsed = readJsonFile(flags.file!);
  const split = splitEntityPayloadFromFile(parsed);
  const relations = mergeRelations(
    split.relations,
    flags.relationsFile
      ? parseRelationsFile(readJsonFile(flags.relationsFile))
      : undefined,
  );
  const context = buildApiContext(flags, auth);

  const updated = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "PUT",
    path: `/api/${encodeURIComponent(entity)}/${encodeURIComponent(recordId)}`,
    body: split.documentPayload,
  });

  if (flags.dryRun) {
    if (Object.keys(relations).length > 0) {
      await syncEntityRelations({
        baseUrl: flags.baseUrl,
        auth,
        entity,
        recordId,
        relations,
        dryRun: true,
      });
    }
    return;
  }

  if (Object.keys(relations).length > 0) {
    await syncEntityRelations({
      baseUrl: flags.baseUrl,
      auth,
      entity,
      recordId,
      relations,
    });
  }

  console.log(`Updated ${entity}/${recordId}.`);
  writeApiOutput(updated, flags);
}
