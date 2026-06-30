import type { SerializableEntityDefinition } from "@repo/entities";
import { resolveLayoutFieldLeaf } from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import type { RelationDefinitionLookup } from "./resolve-relation-field-path";

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
  const leaf = resolveLayoutFieldLeaf(
    definition,
    fieldPath,
    getDefinition as RelationDefinitionLookup | undefined,
  );
  if (!leaf || !leaf.pathPrefix) {
    return formatFieldLabel(fieldPath.trim(), definition);
  }

  const segments = leaf.pathPrefix.split(".");
  let currentDefinition = definition;
  const labels: string[] = [];

  for (const segment of segments) {
    for (const [fieldName, meta] of Object.entries(currentDefinition.fields)) {
      if (
        meta.relation &&
        (meta.relation.type === "many-to-one" ||
          meta.relation.type === "one-to-one") &&
        (fieldName === segment || meta.relation.target === segment)
      ) {
        const target = meta.relation.target;
        const targetDefinition =
          target && getDefinition ? getDefinition(target) : undefined;
        labels.push(
          resolveRelationTargetLabel(target ?? segment, targetDefinition),
        );
        if (targetDefinition) {
          currentDefinition = targetDefinition;
        }
        break;
      }
    }
  }

  labels.push(
    formatFieldLabel(
      leaf.leafFieldName,
      leaf.leafDefinition as SerializableEntityDefinition,
    ),
  );
  return labels.join(" ");
}

export function resolveLayoutSlotDisplayMeta(
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getDefinition?: (entityName: string) => EntityCatalogEntry | undefined,
): {
  readonly fieldType?: import("@repo/ui").DisplayFieldType;
  readonly displayFormat?: import("@repo/ui").DisplayFormat;
  readonly dateDisplayFormat?: import("@repo/ui").DateDisplayFormat;
  readonly fallbackImageUrl?: string | null;
} {
  const leaf = resolveLayoutFieldLeaf(
    definition,
    fieldPath,
    getDefinition as RelationDefinitionLookup | undefined,
  );
  if (!leaf) {
    return getEntityCellDisplayMeta(fieldPath.trim(), definition);
  }

  return getEntityCellDisplayMeta(
    leaf.leafFieldName,
    leaf.leafDefinition as SerializableEntityDefinition,
  );
}
