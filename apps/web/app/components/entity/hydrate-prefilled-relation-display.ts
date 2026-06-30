import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { getEntity } from "../../lib/api-client";
import {
  applyRelationDisplayCache,
  FORM_DISPLAY_CACHE_KEY,
} from "./form-relation-display-cache";

function readPopulatedCache(
  values: Record<string, unknown>,
): Record<string, Record<string, unknown> | null> {
  const populated = values[FORM_DISPLAY_CACHE_KEY];
  if (!populated || typeof populated !== "object" || Array.isArray(populated)) {
    return {};
  }
  return populated as Record<string, Record<string, unknown> | null>;
}

function buildRelationPopulateParam(
  targetDefinition: SerializableEntityDefinition,
): string | undefined {
  const fkFields = Object.entries(targetDefinition.fields)
    .filter(
      ([, meta]) =>
        meta.relation &&
        (meta.relation.type === "many-to-one" ||
          meta.relation.type === "one-to-one"),
    )
    .map(([name]) => name);

  return fkFields.length > 0 ? fkFields.join(",") : undefined;
}

function isNonEmptyRelationId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasPendingPrefillRelationFetch(options: {
  readonly definition: SerializableEntityDefinition;
  readonly values: Record<string, unknown>;
  readonly prefilledPopulated?: Readonly<
    Record<string, Record<string, unknown> | null>
  >;
}): boolean {
  const populatedCache = readPopulatedCache(options.values);

  for (const [fieldName, meta] of Object.entries(options.definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const relationId = options.values[fieldName];
    if (!isNonEmptyRelationId(relationId)) {
      continue;
    }

    if (populatedCache[fieldName] || options.prefilledPopulated?.[fieldName]) {
      continue;
    }

    return true;
  }

  return false;
}

export async function hydratePrefilledRelationDisplay(options: {
  readonly definition: SerializableEntityDefinition;
  readonly values: Record<string, unknown>;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly prefilledPopulated?: Readonly<
    Record<string, Record<string, unknown> | null>
  >;
}): Promise<Record<string, unknown>> {
  let nextValues = options.values;
  const populatedCache = readPopulatedCache(nextValues);
  const fetchTasks: Array<
    Promise<readonly [fieldName: string, record: Record<string, unknown>]>
  > = [];

  for (const [fieldName, meta] of Object.entries(options.definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const relationId = nextValues[fieldName];
    if (!isNonEmptyRelationId(relationId)) {
      continue;
    }

    if (populatedCache[fieldName]) {
      continue;
    }

    const prefilledRecord = options.prefilledPopulated?.[fieldName];
    if (prefilledRecord) {
      nextValues = applyRelationDisplayCache(
        nextValues,
        fieldName,
        prefilledRecord,
      );
      continue;
    }

    const targetEntity = meta.relation.target;
    if (!targetEntity) {
      continue;
    }

    const targetDefinition = options.getDefinition?.(targetEntity);
    if (!targetDefinition) {
      continue;
    }

    fetchTasks.push(
      getEntity<Record<string, unknown>>(targetEntity, relationId, {
        populate: buildRelationPopulateParam(targetDefinition),
      }).then((record) => [fieldName, record] as const),
    );
  }

  if (fetchTasks.length > 0) {
    const fetchedRecords = await Promise.all(fetchTasks);
    for (const [fieldName, record] of fetchedRecords) {
      nextValues = applyRelationDisplayCache(nextValues, fieldName, record);
    }
  }

  return nextValues;
}
