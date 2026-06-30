import type { SerializableEntityDefinition } from "@repo/entities";
import { MAX_LAYOUT_RELATION_HOPS } from "@repo/ui-builder-core";

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

function recordNeedsRelationHydration(
  record: Record<string, unknown>,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
  depth = 0,
): boolean {
  if (depth >= MAX_LAYOUT_RELATION_HOPS) {
    return false;
  }

  const populatedCache = readPopulatedCache(record);

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const relationId = record[fieldName];
    if (!isNonEmptyRelationId(relationId)) {
      continue;
    }

    const nestedRecord = populatedCache[fieldName];
    if (!nestedRecord) {
      return true;
    }

    const targetEntity = meta.relation.target;
    const targetDefinition =
      targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;
    if (
      targetDefinition &&
      recordNeedsRelationHydration(
        nestedRecord,
        targetDefinition,
        getDefinition,
        depth + 1,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function hasPendingPrefillRelationFetch(options: {
  readonly definition: SerializableEntityDefinition;
  readonly values: Record<string, unknown>;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
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

    const targetEntity = meta.relation.target;
    const targetDefinition =
      targetEntity && options.getDefinition
        ? options.getDefinition(targetEntity)
        : undefined;

    const cachedRecord =
      populatedCache[fieldName] ?? options.prefilledPopulated?.[fieldName];
    if (!cachedRecord) {
      return true;
    }

    if (
      targetDefinition &&
      recordNeedsRelationHydration(
        cachedRecord,
        targetDefinition,
        options.getDefinition,
        1,
      )
    ) {
      return true;
    }
  }

  return false;
}

async function hydrateRecordRelations(
  record: Record<string, unknown>,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
  depth = 0,
): Promise<Record<string, unknown>> {
  if (depth >= MAX_LAYOUT_RELATION_HOPS) {
    return record;
  }

  let nextRecord = record;
  const populatedCache = readPopulatedCache(nextRecord);
  const fetchTasks: Array<
    Promise<
      readonly [fieldName: string, hydratedRecord: Record<string, unknown>]
    >
  > = [];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const relationId = nextRecord[fieldName];
    if (!isNonEmptyRelationId(relationId)) {
      continue;
    }

    const targetEntity = meta.relation.target;
    if (!targetEntity) {
      continue;
    }

    const targetDefinition = getDefinition?.(targetEntity);
    if (!targetDefinition) {
      continue;
    }

    const cachedRecord = populatedCache[fieldName];
    if (cachedRecord) {
      const hydratedNested = await hydrateRecordRelations(
        cachedRecord,
        targetDefinition,
        getDefinition,
        depth + 1,
      );
      if (hydratedNested !== cachedRecord) {
        nextRecord = applyRelationDisplayCache(
          nextRecord,
          fieldName,
          hydratedNested,
        );
      }
      continue;
    }

    fetchTasks.push(
      getEntity<Record<string, unknown>>(targetEntity, relationId, {
        populate: buildRelationPopulateParam(targetDefinition),
      }).then(async (fetchedRecord) => {
        const hydratedNested = await hydrateRecordRelations(
          fetchedRecord,
          targetDefinition,
          getDefinition,
          depth + 1,
        );
        return [fieldName, hydratedNested] as const;
      }),
    );
  }

  if (fetchTasks.length > 0) {
    const fetchedRecords = await Promise.all(fetchTasks);
    for (const [fieldName, hydratedRecord] of fetchedRecords) {
      nextRecord = applyRelationDisplayCache(
        nextRecord,
        fieldName,
        hydratedRecord,
      );
    }
  }

  return nextRecord;
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

    const targetEntity = meta.relation.target;
    const targetDefinition =
      targetEntity && options.getDefinition
        ? options.getDefinition(targetEntity)
        : undefined;

    const prefilledRecord = options.prefilledPopulated?.[fieldName];
    if (prefilledRecord) {
      let recordToCache = prefilledRecord;
      if (targetDefinition && options.getDefinition) {
        recordToCache = await hydrateRecordRelations(
          prefilledRecord,
          targetDefinition,
          options.getDefinition,
          1,
        );
      }
      nextValues = applyRelationDisplayCache(
        nextValues,
        fieldName,
        recordToCache,
      );
      continue;
    }

    if (!targetEntity || !targetDefinition) {
      continue;
    }

    fetchTasks.push(
      getEntity<Record<string, unknown>>(targetEntity, relationId, {
        populate: buildRelationPopulateParam(targetDefinition),
      }).then(async (record) => {
        const hydratedRecord = await hydrateRecordRelations(
          record,
          targetDefinition,
          options.getDefinition,
          1,
        );
        return [fieldName, hydratedRecord] as const;
      }),
    );
  }

  if (fetchTasks.length > 0) {
    const fetchedRecords = await Promise.all(fetchTasks);
    for (const [fieldName, record] of fetchedRecords) {
      nextValues = applyRelationDisplayCache(nextValues, fieldName, record);
    }
  }

  for (const [fieldName, meta] of Object.entries(options.definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const cachedRecord = readPopulatedCache(nextValues)[fieldName];
    if (!cachedRecord) {
      continue;
    }

    const targetEntity = meta.relation.target;
    const targetDefinition =
      targetEntity && options.getDefinition
        ? options.getDefinition(targetEntity)
        : undefined;
    if (!targetDefinition) {
      continue;
    }

    const hydratedRecord = await hydrateRecordRelations(
      cachedRecord,
      targetDefinition,
      options.getDefinition,
      1,
    );
    if (hydratedRecord !== cachedRecord) {
      nextValues = applyRelationDisplayCache(
        nextValues,
        fieldName,
        hydratedRecord,
      );
    }
  }

  return nextValues;
}
