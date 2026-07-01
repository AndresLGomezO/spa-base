import { useMemo } from "react";
import {
  createEntityRecordsExportEnvelope,
  toPortableEntityRecord,
  type EntityRecordsExportEnvelope,
  type SerializableEntityDefinition,
} from "@repo/entities";

import { defineEntityFromCatalogDefinition } from "./define-entity-from-catalog.js";

function buildEntityRecordExportEnvelope(
  entityName: string,
  definition: SerializableEntityDefinition,
  record: Record<string, unknown>,
  relations: Record<string, readonly string[]> = {},
): EntityRecordsExportEnvelope {
  const entity = defineEntityFromCatalogDefinition(definition);
  return createEntityRecordsExportEnvelope(entityName, [
    toPortableEntityRecord(
      entity,
      record,
      Object.keys(relations).length > 0 ? relations : undefined,
    ),
  ]);
}

export function listManyToManyFieldNames(
  definition: SerializableEntityDefinition,
): readonly string[] {
  return Object.entries(definition.fields)
    .filter(([, meta]) => meta.relation?.type === "many-to-many")
    .map(([fieldName]) => fieldName);
}

export function useEntityRecordExportEnvelope(
  entityName: string,
  definition: SerializableEntityDefinition,
  record: Record<string, unknown> | undefined,
  relations: Record<string, readonly string[]>,
): EntityRecordsExportEnvelope | undefined {
  return useMemo(() => {
    if (!record) {
      return undefined;
    }

    return buildEntityRecordExportEnvelope(
      entityName,
      definition,
      record,
      relations,
    );
  }, [definition, entityName, record, relations]);
}
