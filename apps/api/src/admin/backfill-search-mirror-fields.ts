import {
  listLegacySearchMirrorFieldNames,
  listSearchMirrorStorageFields,
  prepareRecordSearchFields,
  shouldPersistSearchMirrorFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

const BACKFILL_PAGE_SIZE = 100;

function mirrorFieldsChanged(
  entity: AnyDefinedEntity,
  existing: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const mirrorFields = listSearchMirrorStorageFields(entity);
  const legacyFields = listLegacySearchMirrorFieldNames(entity);

  return (
    mirrorFields.some((field) => next[field] !== existing[field]) ||
    legacyFields.some((field) => field in existing)
  );
}

export async function backfillSearchMirrorFieldsForEntity(
  entity: AnyDefinedEntity,
  repository: TenantScopedEntityRepository<GenericRecord, unknown>,
  tenantId: string,
): Promise<{ readonly updated: number; readonly scanned: number }> {
  if (!shouldPersistSearchMirrorFields(entity)) {
    return { updated: 0, scanned: 0 };
  }

  let updated = 0;
  let scanned = 0;
  let cursor: string | null | undefined = undefined;

  do {
    const page = await repository.findAll({
      tenantId,
      limit: BACKFILL_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });

    for (const record of page.items) {
      scanned += 1;
      const existing = record as Record<string, unknown>;
      const withMirrors = prepareRecordSearchFields(entity, existing);

      if (!mirrorFieldsChanged(entity, existing, withMirrors)) {
        continue;
      }

      const parsed = entity.schema.parse(withMirrors);
      await repository.update(record.id, tenantId, parsed as GenericRecord);
      updated += 1;
    }

    cursor = page.nextCursor;
  } while (cursor);

  return { updated, scanned };
}
