import type { SerializableEntityDefinition } from "@repo/entities";
import {
  resolveLayoutFieldLeaf,
  type ResolvedLayoutFieldLeaf,
} from "@repo/ui-builder-core";

import {
  resolveRelationFieldName,
  type RelationDefinitionLookup,
} from "./resolve-relation-field-path";

export function resolveLayoutFieldLeafForEntity(
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): ResolvedLayoutFieldLeaf | null {
  return resolveLayoutFieldLeaf(definition, fieldPath, getDefinition);
}

function readPopulatedRecord(
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

export function resolveLayoutFieldRecord(
  item: Record<string, unknown>,
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): {
  readonly record: Record<string, unknown>;
  readonly leaf: ResolvedLayoutFieldLeaf;
} | null {
  const leaf = resolveLayoutFieldLeaf(definition, fieldPath, getDefinition);
  if (!leaf) {
    return null;
  }

  if (!leaf.pathPrefix) {
    return { record: item, leaf };
  }

  const segments = leaf.pathPrefix.split(".");
  let currentItem = item;
  let currentDefinition = definition;

  for (const segment of segments) {
    const relationField = resolveRelationFieldName(currentDefinition, segment);
    if (!relationField) {
      return null;
    }

    const populatedRecord = readPopulatedRecord(currentItem, relationField);
    if (!populatedRecord) {
      return null;
    }

    const targetEntity =
      currentDefinition.fields[relationField]?.relation?.target;
    const targetDefinition =
      targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;

    currentItem = populatedRecord;
    if (targetDefinition) {
      currentDefinition = targetDefinition;
    } else if (segment !== segments[segments.length - 1]) {
      return null;
    }
  }

  return { record: currentItem, leaf };
}
