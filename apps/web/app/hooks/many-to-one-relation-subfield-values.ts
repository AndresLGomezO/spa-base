import type { SerializableEntityDefinition } from "@repo/entities";
import { MAX_LAYOUT_RELATION_HOPS } from "@repo/ui-builder-core";

export type LoadedRelationRecordsByField = ReadonlyMap<
  string,
  ReadonlyMap<string, Record<string, unknown>>
>;

export function mergeRelationRecordMaps(
  existing: ReadonlyMap<string, Record<string, unknown>> | undefined,
  incoming: ReadonlyMap<string, Record<string, unknown>> | undefined,
): ReadonlyMap<string, Record<string, unknown>> {
  if (!incoming || incoming.size === 0) {
    return existing ?? new Map();
  }
  if (!existing || existing.size === 0) {
    return incoming;
  }
  return new Map([...existing, ...incoming]);
}

import {
  parseRelationFieldPath,
  resolveRelationFieldName,
  type RelationDefinitionLookup,
} from "../components/entity/resolve-relation-field-path";
import { buildManyToOnePopulateParam } from "../entities/build-many-to-one-populate-param";
import {
  fetchAllEntityItems,
  ENTITY_LIST_MAX_LIMIT,
} from "../lib/fetch-all-entity-items";

interface ManyToOneRelationConfig {
  readonly relationField: string;
  readonly targetEntity: string;
}

interface RelationLoadPlan extends ManyToOneRelationConfig {
  readonly parentRelationField: string | null;
}

function getManyToOneRelations(
  definition: SerializableEntityDefinition,
): readonly ManyToOneRelationConfig[] {
  const relations: ManyToOneRelationConfig[] = [];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation?.type !== "many-to-one" &&
      meta.relation?.type !== "one-to-one"
    ) {
      continue;
    }

    const targetEntity = meta.relation.target;
    if (!targetEntity) {
      continue;
    }

    relations.push({
      relationField: fieldName,
      targetEntity,
    });
  }

  return relations;
}

export function buildManyToOneRelationLoadPlans(
  rootDefinition: SerializableEntityDefinition,
  getDefinition: RelationDefinitionLookup,
  maxDepth: number = MAX_LAYOUT_RELATION_HOPS,
): readonly RelationLoadPlan[] {
  const plans: RelationLoadPlan[] = [];
  const seen = new Set<string>();

  function walk(
    definition: SerializableEntityDefinition,
    parentRelationField: string | null,
    depth: number,
  ): void {
    if (depth > maxDepth) {
      return;
    }

    for (const relation of getManyToOneRelations(definition)) {
      const planKey = `${parentRelationField ?? "root"}:${relation.relationField}`;
      if (seen.has(planKey)) {
        continue;
      }
      seen.add(planKey);

      plans.push({
        ...relation,
        parentRelationField,
      });

      const targetDefinition = getDefinition(relation.targetEntity);
      if (targetDefinition) {
        walk(targetDefinition, relation.relationField, depth + 1);
      }
    }
  }

  walk(rootDefinition, null, 1);
  return plans;
}

export function readForeignKeyValues(
  items: readonly Record<string, unknown>[],
  relationField: string,
): readonly string[] {
  const values = new Set<string>();
  for (const item of items) {
    const foreignKey = item[relationField];
    if (typeof foreignKey === "string" && foreignKey.length > 0) {
      values.add(foreignKey);
    }
  }
  return [...values].sort();
}

export function readForeignKeyValuesFromLoadedRecords(
  loadedRecords: ReadonlyMap<string, Record<string, unknown>> | undefined,
  relationField: string,
): readonly string[] {
  if (!loadedRecords || loadedRecords.size === 0) {
    return [];
  }

  return readForeignKeyValues([...loadedRecords.values()], relationField);
}

function getPopulatedRecord(
  item: Record<string, unknown>,
  relationField: string,
): Record<string, unknown> | null {
  const populated = item._populated as
    | Record<string, Record<string, unknown> | null>
    | undefined;
  if (!populated) {
    return null;
  }
  return populated[relationField] ?? null;
}

export async function loadManyToOneTargetRecords(
  targetEntity: string,
  foreignKeys: readonly string[],
  getDefinition: RelationDefinitionLookup,
): Promise<ReadonlyMap<string, Record<string, unknown>>> {
  const recordsById = new Map<string, Record<string, unknown>>();
  if (foreignKeys.length === 0) {
    return recordsById;
  }

  const populate = buildManyToOnePopulateParam(getDefinition(targetEntity));
  const items = await fetchAllEntityItems<Record<string, unknown>>(
    targetEntity,
    {
      maxItems: Math.max(foreignKeys.length, ENTITY_LIST_MAX_LIMIT),
      populate,
      query: {
        filter: [
          {
            field: "id",
            operator: "in",
            value: [...foreignKeys],
          },
        ],
      },
    },
  );

  for (const record of items) {
    const recordId = record.id;
    if (recordId === null || recordId === undefined) {
      continue;
    }
    const key = String(recordId).trim();
    if (key.length > 0) {
      recordsById.set(key, record);
    }
  }

  return recordsById;
}

export function resolveManyToOneSubfieldValue(
  item: Record<string, unknown>,
  fieldPath: string,
  definition: SerializableEntityDefinition,
  targetRecordsByRelation: ReadonlyMap<
    string,
    ReadonlyMap<string, Record<string, unknown>>
  >,
  getDefinition: RelationDefinitionLookup,
): unknown {
  const trimmedPath = fieldPath.trim();
  const pathSegments = trimmedPath.split(".");
  if (pathSegments.length >= 3) {
    const firstSegment = pathSegments[0];
    if (!firstSegment) {
      return null;
    }

    const relationField = resolveRelationFieldName(definition, firstSegment);
    if (!relationField) {
      return null;
    }

    const foreignKey = item[relationField];
    if (typeof foreignKey !== "string" || foreignKey.length === 0) {
      return null;
    }

    const targetRecord =
      targetRecordsByRelation.get(relationField)?.get(foreignKey) ??
      getPopulatedRecord(item, relationField);
    if (!targetRecord) {
      return null;
    }

    const targetEntity =
      definition.fields[relationField]?.relation?.target ?? firstSegment;
    const targetDefinition = getDefinition(targetEntity);
    if (!targetDefinition) {
      return null;
    }

    return resolveManyToOneSubfieldValue(
      targetRecord,
      pathSegments.slice(1).join("."),
      targetDefinition,
      targetRecordsByRelation,
      getDefinition,
    );
  }

  const parsed = parseRelationFieldPath(definition, trimmedPath, getDefinition);
  if (
    !parsed ||
    (parsed.relationKind !== "many-to-one" &&
      parsed.relationKind !== "one-to-one")
  ) {
    return null;
  }

  const foreignKey = item[parsed.relationField];
  if (typeof foreignKey !== "string" || foreignKey.length === 0) {
    return null;
  }

  const targetRecord =
    targetRecordsByRelation.get(parsed.relationField)?.get(foreignKey) ??
    getPopulatedRecord(item, parsed.relationField);
  return targetRecord?.[parsed.subField] ?? null;
}

function readExistingPopulated(
  item: Record<string, unknown>,
): Record<string, Record<string, unknown> | null> {
  const populated = item._populated;
  if (!populated || typeof populated !== "object" || Array.isArray(populated)) {
    return {};
  }

  return populated as Record<string, Record<string, unknown> | null>;
}

export function mergeLoadedRelationsIntoPopulated(
  item: Record<string, unknown>,
  definition: SerializableEntityDefinition,
  targetRecordsByRelation: LoadedRelationRecordsByField,
  getDefinition: RelationDefinitionLookup,
  depth = 0,
): Record<string, unknown> {
  if (depth >= MAX_LAYOUT_RELATION_HOPS) {
    return item;
  }

  const existingPopulated = readExistingPopulated(item);
  const mergedPopulated: Record<string, Record<string, unknown> | null> = {
    ...existingPopulated,
  };
  let changed = false;

  for (const [relationField, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation?.type !== "many-to-one" &&
      meta.relation?.type !== "one-to-one"
    ) {
      continue;
    }

    const foreignKey = item[relationField];
    if (typeof foreignKey !== "string" || foreignKey.length === 0) {
      continue;
    }

    const loadedRecord = targetRecordsByRelation
      .get(relationField)
      ?.get(foreignKey);
    const existingRecord = existingPopulated[relationField];
    const baseRecord = loadedRecord ?? existingRecord;
    if (!baseRecord) {
      continue;
    }

    const targetEntity = meta.relation?.target;
    const targetDefinition =
      targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;
    const enrichedRecord = targetDefinition
      ? mergeLoadedRelationsIntoPopulated(
          baseRecord,
          targetDefinition,
          targetRecordsByRelation,
          getDefinition,
          depth + 1,
        )
      : baseRecord;

    if (enrichedRecord !== existingRecord || loadedRecord) {
      mergedPopulated[relationField] = enrichedRecord as Record<
        string,
        unknown
      >;
      changed = true;
    }
  }

  if (!changed) {
    return item;
  }

  return {
    ...item,
    _populated: mergedPopulated,
  };
}
