import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  DateDisplayFormat,
  DisplayFieldType,
  DisplayFormat,
} from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import {
  parseRelationFieldPath,
  type RelationDefinitionLookup,
} from "./resolve-relation-field-path";

function resolveRelationTargetLabel(
  targetEntityName: string,
  targetDefinition?: EntityCatalogEntry,
): string {
  if (targetDefinition?.ui.nav?.label) {
    return targetDefinition.ui.nav.label;
  }

  return formatFieldLabel(targetEntityName, targetDefinition);
}

export function resolveLayoutSlotLabel(
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
): string {
  const trimmedPath = fieldPath.trim();
  const parsed = parseRelationFieldPath(
    definition,
    trimmedPath,
    getDefinition as RelationDefinitionLookup | undefined,
  );
  if (!parsed) {
    return formatFieldLabel(trimmedPath, definition);
  }

  if (parsed.relationKind === "one-to-many") {
    const childEntity =
      definition.fields[parsed.relationField]?.relation?.target ??
      parsed.relationField;
    const childDefinition =
      childEntity && getDefinition ? getDefinition(childEntity) : undefined;
    const subLabel = childDefinition
      ? formatFieldLabel(parsed.subField, childDefinition)
      : formatFieldLabel(parsed.subField, definition);

    return `${resolveRelationTargetLabel(childEntity, childDefinition)} ${subLabel}`;
  }

  const targetEntity =
    definition.fields[parsed.relationField]?.relation?.target;
  const targetDefinition =
    targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;

  const subLabel = targetDefinition
    ? formatFieldLabel(parsed.subField, targetDefinition)
    : formatFieldLabel(parsed.subField, definition);

  if (targetEntity) {
    return `${resolveRelationTargetLabel(targetEntity, targetDefinition)} ${subLabel}`;
  }

  return subLabel;
}

export function resolveLayoutSlotDisplayMeta(
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
): {
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly fallbackImageUrl?: string | null;
} {
  const parsed = parseRelationFieldPath(
    definition,
    fieldPath,
    getDefinition as RelationDefinitionLookup | undefined,
  );
  if (!parsed) {
    return getEntityCellDisplayMeta(fieldPath.trim(), definition);
  }

  if (parsed.relationKind === "one-to-many") {
    const childEntity =
      definition.fields[parsed.relationField]?.relation?.target ??
      parsed.relationField;
    const childDefinition =
      childEntity && getDefinition ? getDefinition(childEntity) : undefined;

    if (childDefinition) {
      return getEntityCellDisplayMeta(parsed.subField, childDefinition);
    }

    return getEntityCellDisplayMeta(parsed.relationField, definition);
  }

  const targetEntity =
    definition.fields[parsed.relationField]?.relation?.target;
  const targetDefinition =
    targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;

  if (targetDefinition) {
    return getEntityCellDisplayMeta(parsed.subField, targetDefinition);
  }

  return getEntityCellDisplayMeta(parsed.relationField, definition);
}
