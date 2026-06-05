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

export async function runRecordCreate(
  flags: ApiFlags,
  auth: ApiAuthHeaders,
): Promise<void> {
  const entity = flags.entity!;
  const parsed = readJsonFile(flags.file!);
  const split = splitEntityPayloadFromFile(parsed);
  const relations = mergeRelations(
    split.relations,
    flags.relationsFile
      ? parseRelationsFile(readJsonFile(flags.relationsFile))
      : undefined,
  );
  const context = buildApiContext(flags, auth);

  const created = await apiRequest<Record<string, unknown>>({
    ...context,
    method: "POST",
    path: `/api/${encodeURIComponent(entity)}`,
    body: split.documentPayload,
  });

  if (flags.dryRun) {
    if (Object.keys(relations).length > 0) {
      await syncEntityRelations({
        baseUrl: flags.baseUrl,
        auth,
        entity,
        recordId: "<new-record-id>",
        relations,
        dryRun: true,
      });
    }
    return;
  }

  const recordId =
    typeof created.id === "string" && created.id.length > 0
      ? created.id
      : undefined;

  if (!recordId) {
    throw new Error("Create response did not include a record id.");
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

  console.log(`Created ${entity}/${recordId}.`);
  writeApiOutput(created, flags);
}
