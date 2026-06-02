import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  DateDisplayFormat,
  DisplayFieldType,
  DisplayFormat,
} from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import { parseRelationFieldPath } from "./resolve-relation-field-path";

export function resolveLayoutSlotLabel(
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
): string {
  const parsed = parseRelationFieldPath(definition, fieldPath);
  if (!parsed) {
    return formatFieldLabel(fieldPath.trim(), definition);
  }

  const targetEntity =
    definition.fields[parsed.relationField]?.relation?.target;
  const targetDefinition =
    targetEntity && getDefinition ? getDefinition(targetEntity) : undefined;

  if (targetDefinition) {
    return formatFieldLabel(parsed.subField, targetDefinition);
  }

  return formatFieldLabel(parsed.subField, definition);
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
  const parsed = parseRelationFieldPath(definition, fieldPath);
  if (!parsed) {
    return getEntityCellDisplayMeta(fieldPath.trim(), definition);
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
