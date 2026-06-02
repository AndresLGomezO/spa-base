import {
  getForeignKeyRelationFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { enrichFileFieldsForRead } from "../entity-files/entity-file-field-utils.js";
import { checkRecordAccess } from "./record-access.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

export interface ReferencePopulatorDeps {
  readonly getEntityDefinition: (
    name: string,
    tenantId: string,
  ) => AnyDefinedEntity | undefined;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
  readonly firebaseAdminConfig?: FirebaseAdminConfig;
}

const MAX_DISTINCT_KEYS = 100;

function validatePopulateFields(
  entity: AnyDefinedEntity,
  requestedFields: readonly string[],
): readonly { fieldName: string; targetEntity: string }[] {
  const fkFields = getForeignKeyRelationFields(entity.metadata);
  const fkMap = new Map(
    fkFields.map(({ fieldName, relation }) => [fieldName, relation.target]),
  );

  const result: { fieldName: string; targetEntity: string }[] = [];
  for (const field of requestedFields) {
    const target = fkMap.get(field);
    if (target) {
      result.push({ fieldName: field, targetEntity: target });
    }
  }
  return result;
}

export function createReferencePopulator(deps: ReferencePopulatorDeps) {
  async function populateRecords(
    entity: AnyDefinedEntity,
    records: readonly Record<string, unknown>[],
    populateFields: readonly string[],
    tenantId: string,
    userId: string,
  ): Promise<readonly Record<string, unknown>[]> {
    if (records.length === 0 || populateFields.length === 0) {
      return records as Record<string, unknown>[];
    }

    const validFields = validatePopulateFields(entity, populateFields);
    if (validFields.length === 0) {
      return records as Record<string, unknown>[];
    }

    const populatedByField = new Map<
      string,
      Map<string, Record<string, unknown> | null>
    >();

    for (const { fieldName, targetEntity } of validFields) {
      const distinctIds = new Set<string>();
      for (const record of records) {
        const value = record[fieldName];
        if (typeof value === "string" && value.length > 0) {
          distinctIds.add(value);
        }
      }

      if (distinctIds.size === 0 || distinctIds.size > MAX_DISTINCT_KEYS) {
        continue;
      }

      const targetDef = deps.getEntityDefinition(targetEntity, tenantId);
      const isTenantWideRead = targetDef?.metadata.tenantWideRead === true;

      const repository = deps.getRepository(tenantId, targetEntity);
      if (!repository) {
        continue;
      }

      const resolvedMap = new Map<string, Record<string, unknown> | null>();

      for (const id of distinctIds) {
        const targetRecord = await repository.findById(id, tenantId);
        if (!targetRecord) {
          resolvedMap.set(id, null);
          continue;
        }

        const fullRecord = targetRecord as unknown as Record<string, unknown>;

        if (isTenantWideRead) {
          resolvedMap.set(id, fullRecord);
          continue;
        }

        const access = checkRecordAccess(fullRecord, userId);
        if (!access.canRead) {
          resolvedMap.set(id, null);
          continue;
        }

        let readableRecord = fullRecord;
        if (deps.firebaseAdminConfig && targetDef) {
          readableRecord = await enrichFileFieldsForRead(
            deps.firebaseAdminConfig,
            targetDef,
            fullRecord,
          );
        }

        resolvedMap.set(id, readableRecord);
      }

      populatedByField.set(fieldName, resolvedMap);
    }

    return records.map((record) => {
      const populated: Record<string, unknown> = {};
      for (const [fieldName, resolvedMap] of populatedByField) {
        const fkValue = record[fieldName];
        if (typeof fkValue === "string" && fkValue.length > 0) {
          populated[fieldName] = resolvedMap.get(fkValue) ?? null;
        }
      }
      if (Object.keys(populated).length === 0) {
        return record;
      }
      return { ...record, _populated: populated };
    });
  }

  return { populateRecords };
}

export function parsePopulateParam(
  query: Record<string, unknown>,
): readonly string[] {
  const raw = query.populate;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
